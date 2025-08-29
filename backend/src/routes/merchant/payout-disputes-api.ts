import { Elysia, t } from "elysia";
import { db } from "@/db";
import { merchantGuard } from "@/middleware/merchantGuard";
import { DisputeSenderType, PayoutStatus } from "@prisma/client";
import crypto from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const UPLOAD_DIR = join(process.cwd(), "uploads", "payout-disputes");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 10;

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

export const payoutDisputesApiRoutes = new Elysia()
  .use(merchantGuard())
  
  // Create a new dispute for a payout with API key authentication
  .post("/payout/:payoutId", async ({ merchant, params, body, set, request }) => {
    try {
      await ensureUploadDir();
      
      console.log('[PayoutDisputesAPI] Creating dispute for payout:', params.payoutId);
      console.log('[PayoutDisputesAPI] Request headers:', request.headers);
      console.log('[PayoutDisputesAPI] Body:', body);

      const { message, files: rawFiles } = body;
      const files = rawFiles
        ? Array.isArray(rawFiles)
          ? rawFiles
          : [rawFiles]
        : [];
      
      // Check if payout exists and belongs to merchant
      const payout = await db.payout.findFirst({
        where: {
          id: params.payoutId,
          merchantId: merchant.id,
          status: {
            in: [PayoutStatus.IN_PROGRESS, PayoutStatus.READY]
          }
        }
      });

      if (!payout) {
        console.log('[PayoutDisputesAPI] Payout not found or not eligible');
        set.status = 404;
        return { error: "Payout not found or not eligible for dispute" };
      }

      if (!payout.traderId) {
        console.log('[PayoutDisputesAPI] Payout has no trader');
        set.status = 400;
        return { error: "Payout has no assigned trader" };
      }

      // Check if dispute already exists
      const existingDispute = await db.payoutDispute.findFirst({
        where: {
          payoutId: payout.id,
          status: {
            in: ["OPEN", "IN_PROGRESS"]
          }
        }
      });

      if (existingDispute) {
        console.log('[PayoutDisputesAPI] Dispute already exists');
        set.status = 400;
        return { error: "Dispute already exists for this payout" };
      }

      // Process uploaded files if provided
      const uploadedFiles = [];
      if (files.length > 0) {
        console.log('[PayoutDisputesAPI] Processing', files.length, 'files');

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

              url: `/api/uploads/payout-disputes/${filename}`,

              size: file.size,
              mimeType: file.type || 'application/octet-stream'
            });
          }
        }
        
        console.log('[PayoutDisputesAPI] Uploaded', uploadedFiles.length, 'files');
      }

      // Create dispute with initial message
      const dispute = await db.payoutDispute.create({
        data: {
          payoutId: payout.id,
          merchantId: merchant.id,
          traderId: payout.traderId,
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
          payout: {
            include: {
              method: true
            }
          }
        }
      });

      // Update payout status
      await db.payout.update({
        where: { id: payout.id },
        data: { status: PayoutStatus.DISPUTE }
      });

      console.log('[PayoutDisputesAPI] Dispute created successfully:', dispute.id);
      
      return {
        success: true,
        dispute: {
          id: dispute.id,
          payoutId: dispute.payoutId,
          merchantId: dispute.merchantId,
          traderId: dispute.traderId,
          status: dispute.status,
          createdAt: dispute.createdAt,
          messages: dispute.messages
        }
      };
    } catch (error) {
      console.error("[PayoutDisputesAPI] Failed to create payout dispute:", error);
      set.status = 500;
      return { error: "Failed to create payout dispute", details: error instanceof Error ? error.message : String(error) };
    }
  }, {
    body: t.Object({
      message: t.String({ minLength: 1, description: "Dispute message" }),
      files: t.Optional(
        t.Files({ description: "Attached files (max 10 files, 20MB each)" })
      )
    }),
    detail: {
      summary: "Create payout dispute",
      description: "Create a new dispute for a payout",
      tags: ["Payout Disputes"]
    }
  })
  
  // Get payout disputes for merchant
  .get("/payouts", async ({ merchant, query }) => {
    try {
      const page = parseInt(query.page || "1");
      const limit = parseInt(query.limit || "20");
      const skip = (page - 1) * limit;

      const where = {
        merchantId: merchant.id,
        ...(query.status && { status: query.status })
      };

      const [disputes, total] = await Promise.all([
        db.payoutDispute.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            payout: {
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
        db.payoutDispute.count({ where })
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
      console.error("[PayoutDisputesAPI] Failed to get payout disputes:", error);
      throw new Error("Failed to get payout disputes");
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String({ description: "Page number" })),
      limit: t.Optional(t.String({ description: "Items per page" })),
      status: t.Optional(t.String({ description: "Filter by status" }))
    }),
    detail: {
      summary: "Get payout disputes",
      description: "Get list of payout disputes for the merchant",
      tags: ["Payout Disputes"]
    }
  })
  
  // Get single payout dispute with messages
  .get("/dispute/:disputeId", async ({ merchant, params, set }) => {
    try {
      const dispute = await db.payoutDispute.findFirst({
        where: {
          id: params.disputeId,
          merchantId: merchant.id
        },
        include: {
          payout: {
            include: {
              method: true,
              requisites: true
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
      console.error("[PayoutDisputesAPI] Failed to get payout dispute:", error);
      set.status = 500;
      return { error: "Failed to get payout dispute" };
    }
  }, {
    params: t.Object({
      disputeId: t.String({ description: "Dispute ID" })
    }),
    detail: {
      summary: "Get payout dispute details",
      description: "Get detailed information about a specific payout dispute",
      tags: ["Payout Disputes"]
    }
  })
  
  // Send message in payout dispute
  .post("/dispute/:disputeId/messages", async ({ merchant, params, body, set }) => {
    try {
      await ensureUploadDir();

      const { message, files: rawFiles } = body;
      const files = rawFiles
        ? Array.isArray(rawFiles)
          ? rawFiles
          : [rawFiles]
        : [];
      
      // Check if dispute exists and merchant can send messages
      const dispute = await db.payoutDispute.findFirst({
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

              url: `/api/uploads/payout-disputes/${filename}`,

              size: file.size,
              mimeType: file.type || 'application/octet-stream'
            });
          }
        }
      }

      // Create message
      const newMessage = await db.payoutDisputeMessage.create({
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
      await db.payoutDispute.update({
        where: { id: dispute.id },
        data: { updatedAt: new Date() }
      });

      return {
        success: true,
        message: newMessage
      };
    } catch (error) {
      console.error("[PayoutDisputesAPI] Failed to send message:", error);
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
      summary: "Send payout dispute message",
      description: "Send a new message in an existing payout dispute",
      tags: ["Payout Disputes"]
    }
  });