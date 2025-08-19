import { Elysia, t } from "elysia";
import { db } from "@/db";
import { merchantSessionGuard } from "@/middleware/merchantSessionGuard";
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
if (!existsSync(UPLOAD_DIR)) {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export const dealDisputesRoutes = new Elysia()
  .use(merchantSessionGuard())
  
  // Test route
  .get("/test", async () => {
    return { message: "Deal disputes routes are working!" };
  })
  
  // Create a new dispute for a deal
  .post("/deal/:dealId", async ({ merchant, params, body, set }) => {
    try {
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
          merchantId: merchant.id
        }
      });

      if (!deal) {
        set.status = 404;
        return { error: "Deal not found" };
      }

      if (!deal.traderId) {
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
        set.status = 400;
        return { error: "Dispute already exists for this deal" };
      }

      // Process uploaded files
      const uploadedFiles = [];
      if (files.length > 0) {
        if (files.length > MAX_FILES) {
          set.status = 400;
          return { error: `Maximum ${MAX_FILES} files allowed` };
        }

        for (const file of files) {
          if (file.size > MAX_FILE_SIZE) {
            set.status = 400;
            return { error: `File ${file.name} exceeds maximum size of 20MB` };
          }

          // Generate unique filename
          const ext = file.name.split('.').pop();
          const filename = `${crypto.randomUUID()}.${ext}`;
          const filepath = join(UPLOAD_DIR, filename);

          // Save file
          await writeFile(filepath, Buffer.from(await file.arrayBuffer()));

          uploadedFiles.push({
            filename: file.name,
            url: `/api/uploads/deal-disputes/${filename}`,
            size: file.size,
            mimeType: file.type
          });
        }
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
              attachments: {
                create: uploadedFiles
              }
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

      // Update transaction status only if it's in progress
      if (deal.status === Status.IN_PROGRESS) {
        await db.transaction.update({
          where: { id: deal.id },
          data: { status: Status.DISPUTE }
        });
      }

      // Send WebSocket event
      dealDisputeEvents.notifyNewDispute(deal.traderId, dispute);
      
      // TODO: Send push notification to trader

      return {
        success: true,
        dispute
      };
    } catch (error) {
      console.error("Failed to create deal dispute:", error);
      set.status = 500;
      return { error: "Failed to create deal dispute" };
    }
  }, {
    body: t.Object({
      message: t.String({ minLength: 1 }),
      files: t.Optional(t.Files())
    })
  })
  
  // Get disputes for merchant
  .get("/", async ({ merchant, query }) => {
    try {
      const { page = 1, limit = 20, status } = query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where = {
        merchantId: merchant.id,
        ...(status && { status })
      };

      const [disputes, total] = await Promise.all([
        db.dealDispute.findMany({
          where,
          skip,
          take: limitNum,
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
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      console.error("Failed to get deal disputes:", error);
      throw new Error("Failed to get deal disputes");
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      status: t.Optional(t.String())
    })
  })
  
  // Get single dispute with messages
  .get("/:disputeId", async ({ merchant, params }) => {
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
        throw new Error("Dispute not found");
      }

      return {
        success: true,
        data: dispute
      };
    } catch (error) {
      console.error("Failed to get deal dispute:", error);
      throw new Error("Failed to get deal dispute");
    }
  })
  
  // Send message in dispute
  .post("/:disputeId/messages", async ({ merchant, params, body, set }) => {
    try {
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
          if (file.size > MAX_FILE_SIZE) {
            set.status = 400;
            return { error: `File ${file.name} exceeds maximum size of 20MB` };
          }

          // Generate unique filename
          const ext = file.name.split('.').pop();
          const filename = `${crypto.randomUUID()}.${ext}`;
          const filepath = join(UPLOAD_DIR, filename);

          // Save file
          await writeFile(filepath, Buffer.from(await file.arrayBuffer()));

          uploadedFiles.push({
            filename: file.name,
            url: `/api/uploads/deal-disputes/${filename}`,
            size: file.size,
            mimeType: file.type
          });
        }
      }

      // Create message
      const newMessage = await db.dealDisputeMessage.create({
        data: {
          disputeId: dispute.id,
          senderId: merchant.id,
          senderType: DisputeSenderType.MERCHANT,
          message,
          attachments: {
            create: uploadedFiles
          }
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
      dealDisputeEvents.notifyReply(dispute.id, newMessage, DisputeSenderType.MERCHANT);
      
      // TODO: Send push notification to trader

      return {
        success: true,
        message: newMessage
      };
    } catch (error) {
      console.error("Failed to send message:", error);
      set.status = 500;
      return { error: "Failed to send message" };
    }
  }, {
    body: t.Object({
      message: t.String({ minLength: 1 }),
      files: t.Optional(t.Files())
    })
  });