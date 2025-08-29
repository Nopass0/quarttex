import { Elysia, t } from "elysia";
import { db } from "@/db";
import { merchantGuard } from "@/middleware/merchantGuard";
import { DisputeSenderType, Status } from "@prisma/client";
import crypto from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { dealDisputeEvents } from "../websocket/deal-disputes";

const UPLOAD_DIR = join(process.cwd(), "uploads", "deal-disputes");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 10;

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export const dealDisputesApiRoutes = new Elysia()
  .use(merchantGuard())
  
  // Create a new dispute for a deal with API key authentication
  .post("/deal/:dealId", async ({ merchant, params, body, set, request }) => {
    try {
      await ensureUploadDir();
      
      console.log('[DealDisputesAPI] Creating dispute for deal:', params.dealId);
      console.log('[DealDisputesAPI] Request headers:', request.headers);
      console.log('[DealDisputesAPI] Body:', body);

      const { message, files: rawFiles } = body;
      const files = rawFiles
        ? Array.isArray(rawFiles)
          ? rawFiles
          : [rawFiles]
        : [];
      
      // Check if deal exists and belongs to merchant
      const deal = await db.transaction.findFirst({
        where: {
          id: params.dealId,
          merchantId: merchant.id,
          status: {
            in: [Status.IN_PROGRESS, Status.READY]
          }
        }
      });

      if (!deal) {
        console.log('[DealDisputesAPI] Deal not found or not eligible');
        set.status = 404;
        return { error: "Deal not found or not eligible for dispute" };
      }

      if (!deal.traderId) {
        console.log('[DealDisputesAPI] Deal has no trader');
        set.status = 400;
        return { error: "Deal has no assigned trader" };
      }

      // Check if dispute already exists
      const existingDispute = await db.dealDispute.findFirst({
        where: {
          dealId: deal.id,
          status: {
            in: ["OPEN", "IN_PROGRESS"]
          }
        }
      });

      if (existingDispute) {
        console.log('[DealDisputesAPI] Dispute already exists');
        set.status = 400;
        return { error: "Dispute already exists for this deal" };
      }

      // Process uploaded files if provided
      const uploadedFiles = [];
      if (files.length > 0) {
        console.log('[DealDisputesAPI] Processing', files.length, 'files');

        if (files.length > MAX_FILES) {
          set.status = 400;
          return { error: `Maximum ${MAX_FILES} files allowed` };
        }

        for (const file of files) {
          // Check if file is a Blob/File object
          if (file && typeof file === 'object' && 'size' in file) {
            if (file.size > MAX_FILE_SIZE) {
              set.status = 400;
              return { error: `File exceeds maximum size of 20MB` };
            }

            // Generate unique filename
            const name = file.name || 'file';
            const ext = name.split('.').pop() || 'bin';
            const filename = `${crypto.randomUUID()}.${ext}`;
            const filepath = join(UPLOAD_DIR, filename);

            // Save file
            const buffer = Buffer.from(await file.arrayBuffer());
            await writeFile(filepath, buffer);

            uploadedFiles.push({
              filename: name,
              url: `/api/uploads/deal-disputes/${filename}`,
              size: file.size,
              mimeType: file.type || 'application/octet-stream'
            });
          }
        }
        
        console.log('[DealDisputesAPI] Uploaded', uploadedFiles.length, 'files');
      }

      // Create dispute with initial message
      const dispute = await db.dealDispute.create({
        data: {
          dealId: deal.id,
          merchantId: merchant.id,
          traderId: deal.traderId,
          messages: {
            create: {
              senderId: merchant.id,
              senderType: DisputeSenderType.MERCHANT,
              message,
              attachments: uploadedFiles.length > 0 ? {
                create: uploadedFiles
              } : undefined
            }
          }
        },
        include: {
          messages: {
            include: {
              attachments: true
            }
          },
          deal: {
            include: {
              method: true
            }
          }
        }
      });

      // Update transaction status
      await db.transaction.update({
        where: { id: deal.id },
        data: { status: Status.DISPUTE }
      });

      // Send WebSocket event
      try {
        dealDisputeEvents.notifyNewDispute(deal.traderId, dispute);
      } catch (wsError) {
        console.log('[DealDisputesAPI] WebSocket notification failed:', wsError);
      }

      console.log('[DealDisputesAPI] Dispute created successfully:', dispute.id);
      
      return {
        success: true,
        dispute: {
          id: dispute.id,
          dealId: dispute.dealId,
          merchantId: dispute.merchantId,
          traderId: dispute.traderId,
          status: dispute.status,
          createdAt: dispute.createdAt,
          messages: dispute.messages
        }
      };
    } catch (error) {
      console.error("[DealDisputesAPI] Failed to create deal dispute:", error);
      set.status = 500;
      return { error: "Failed to create deal dispute", details: error instanceof Error ? error.message : String(error) };
    }
  }, {
    body: t.Object({
      message: t.String({ minLength: 1, description: "Dispute message" }),
      files: t.Optional(
        t.Files({ description: "Attached files (max 10 files, 20MB each)" })
      )
    }),
    detail: {
      summary: "Create deal dispute",
      description: "Create a new dispute for a deal/transaction",
      tags: ["Deal Disputes"]
    }
  })
  
  // Get disputes for merchant
  .get("/", async ({ merchant, query }) => {
    try {
      const page = parseInt(query.page || "1");
      const limit = parseInt(query.limit || "20");
      const skip = (page - 1) * limit;

      const where = {
        merchantId: merchant.id,
        ...(query.status && { status: query.status })
      };

      const [disputes, total] = await Promise.all([
        db.dealDispute.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            deal: {
              include: {
                method: true
              }
            },
            trader: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                attachments: true
              }
            }
          }
        }),
        db.dealDispute.count({ where })
      ]);

      return {
        success: true,
        data: disputes,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error("[DealDisputesAPI] Failed to get deal disputes:", error);
      throw new Error("Failed to get deal disputes");
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String({ description: "Page number" })),
      limit: t.Optional(t.String({ description: "Items per page" })),
      status: t.Optional(t.String({ description: "Filter by status" }))
    }),
    detail: {
      summary: "Get deal disputes",
      description: "Get list of deal disputes for the merchant",
      tags: ["Deal Disputes"]
    }
  })
  
  // Get single dispute with messages
  .get("/:disputeId", async ({ merchant, params, set }) => {
    try {
      const dispute = await db.dealDispute.findFirst({
        where: {
          id: params.disputeId,
          merchantId: merchant.id
        },
        include: {
          deal: {
            include: {
              method: true,
              requisites: true,
              receipts: true
            }
          },
          trader: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              attachments: true
            }
          }
        }
      });

      if (!dispute) {
        set.status = 404;
        return { error: "Dispute not found" };
      }

      return {
        success: true,
        data: dispute
      };
    } catch (error) {
      console.error("[DealDisputesAPI] Failed to get deal dispute:", error);
      set.status = 500;
      return { error: "Failed to get deal dispute" };
    }
  }, {
    params: t.Object({
      disputeId: t.String({ description: "Dispute ID" })
    }),
    detail: {
      summary: "Get dispute details",
      description: "Get detailed information about a specific dispute",
      tags: ["Deal Disputes"]
    }
  })
  
  // Send message in dispute
  .post("/:disputeId/messages", async ({ merchant, params, body, set }) => {
    try {
      await ensureUploadDir();

      const { message, files: rawFiles } = body;
      const files = rawFiles
        ? Array.isArray(rawFiles)
          ? rawFiles
          : [rawFiles]
        : [];
      
      // Check if dispute exists and merchant can send messages
      const dispute = await db.dealDispute.findFirst({
        where: {
          id: params.disputeId,
          merchantId: merchant.id,
          status: {
            in: ["OPEN", "IN_PROGRESS"]
          }
        }
      });

      if (!dispute) {
        set.status = 404;
        return { error: "Dispute not found or closed" };
      }

      // Process uploaded files
      const uploadedFiles = [];
      if (files.length > 0) {
        if (files.length > MAX_FILES) {
          set.status = 400;
          return { error: `Maximum ${MAX_FILES} files allowed` };
        }

        for (const file of files) {
          if (file && typeof file === 'object' && 'size' in file) {
            if (file.size > MAX_FILE_SIZE) {
              set.status = 400;
              return { error: `File exceeds maximum size of 20MB` };
            }

            // Generate unique filename
            const name = file.name || 'file';
            const ext = name.split('.').pop() || 'bin';
            const filename = `${crypto.randomUUID()}.${ext}`;
            const filepath = join(UPLOAD_DIR, filename);

            // Save file
            const buffer = Buffer.from(await file.arrayBuffer());
            await writeFile(filepath, buffer);

            uploadedFiles.push({
              filename: name,

              url: `/api/uploads/deal-disputes/${filename}`,

              size: file.size,
              mimeType: file.type || 'application/octet-stream'
            });
          }
        }
      }

      // Create message
      const newMessage = await db.dealDisputeMessage.create({
        data: {
          disputeId: dispute.id,
          senderId: merchant.id,
          senderType: DisputeSenderType.MERCHANT,
          message,
          attachments: uploadedFiles.length > 0 ? {
            create: uploadedFiles
          } : undefined
        },
        include: {
          attachments: true
        }
      });

      // Update dispute timestamp
      await db.dealDispute.update({
        where: { id: dispute.id },
        data: { updatedAt: new Date() }
      });

      // Send WebSocket event
      try {
        dealDisputeEvents.notifyReply(dispute.id, newMessage, DisputeSenderType.MERCHANT);
      } catch (wsError) {
        console.log('[DealDisputesAPI] WebSocket notification failed:', wsError);
      }

      return {
        success: true,
        message: newMessage
      };
    } catch (error) {
      console.error("[DealDisputesAPI] Failed to send message:", error);
      set.status = 500;
      return { error: "Failed to send message" };
    }
  }, {
    params: t.Object({
      disputeId: t.String({ description: "Dispute ID" })
    }),
    body: t.Object({
      message: t.String({ minLength: 1, description: "Message text" }),
      files: t.Optional(
        t.Files({ description: "Attached files (max 10 files, 20MB each)" })
      )
    }),
    detail: {
      summary: "Send dispute message",
      description: "Send a new message in an existing dispute",
      tags: ["Deal Disputes"]
    }
  });