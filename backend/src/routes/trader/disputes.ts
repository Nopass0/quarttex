import { Elysia, t } from "elysia";
import { db } from "@/db";
import { traderGuard } from "@/middleware/traderGuard";
import { DisputeSenderType } from "@prisma/client";
import crypto from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { disputeEvents } from "../websocket/disputes";

const UPLOAD_DIR = join(process.cwd(), "uploads", "disputes");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 10;

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export default new Elysia({ prefix: "/disputes" })
  .use(traderGuard())
  
  // Get disputes for trader
  .get("/", async ({ trader, query }) => {
    try {
      const { page = 1, limit = 20, status, type = "payouts" } = query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // For now, only handle payout disputes
      if (type !== "payouts") {
        return {
          success: true,
          data: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0
          }
        };
      }

      const where = {
        traderId: trader.id,
        ...(status && { status })
      };

      const [disputes, total] = await Promise.all([
        db.withdrawalDispute.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            payout: true,
            merchant: {
              select: {
                id: true,
                name: true
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
        db.withdrawalDispute.count({ where })
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
      console.error("Failed to get disputes:", error);
      throw new Error("Failed to get disputes");
    }
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      status: t.Optional(t.String()),
      type: t.Optional(t.String())
    })
  })
  
  // Get single dispute with messages
  .get("/:disputeId", async ({ trader, params }) => {
    try {
      const dispute = await db.withdrawalDispute.findFirst({
        where: {
          id: params.disputeId,
          traderId: trader.id
        },
        include: {
          payout: true,
          merchant: {
            select: {
              id: true,
              name: true
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
      console.error("Failed to get dispute:", error);
      throw new Error("Failed to get dispute");
    }
  })
  
  // Send message in dispute
  .post("/:disputeId/messages", async ({ trader, params, body, set }) => {
    try {
      const { message, files } = body;
      
      // Check if dispute exists and trader can send messages
      const dispute = await db.withdrawalDispute.findFirst({
        where: {
          id: params.disputeId,
          traderId: trader.id,
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
      if (files && files.length > 0) {
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
            url: `/api/uploads/disputes/${filename}`,
            size: file.size,
            mimeType: file.type
          });
        }
      }

      // Create message
      const newMessage = await db.withdrawalDisputeMessage.create({
        data: {
          disputeId: dispute.id,
          senderId: trader.id,
          senderType: DisputeSenderType.TRADER,
          message,
          attachments: {
            create: uploadedFiles
          }
        },
        include: {
          attachments: true
        }
      });

      // Update dispute timestamp and status
      await db.withdrawalDispute.update({
        where: { id: dispute.id },
        data: { 
          updatedAt: new Date(),
          status: dispute.status === "OPEN" ? "IN_PROGRESS" : dispute.status
        }
      });

      // Send WebSocket event dispute:reply
      disputeEvents.notifyReply(dispute.id, newMessage, DisputeSenderType.TRADER);
      
      // TODO: Send push notification to merchant

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
  })
  
  // Resolve dispute
  .post("/:disputeId/resolve", async ({ trader, params, body }) => {
    try {
      const { resolution, status } = body;
      
      // Check if dispute exists and can be resolved
      const dispute = await db.withdrawalDispute.findFirst({
        where: {
          id: params.disputeId,
          traderId: trader.id,
          status: {
            in: ["OPEN", "IN_PROGRESS"]
          }
        },
        include: {
          payout: true
        }
      });

      if (!dispute) {
        throw new Error("Dispute not found or already resolved");
      }

      // Update dispute
      await db.withdrawalDispute.update({
        where: { id: dispute.id },
        data: {
          status,
          resolution,
          resolvedAt: new Date()
        }
      });

      // Update payout status based on resolution and handle frozen funds
      await db.$transaction(async (tx) => {
        const frozenAmountRub = dispute.payout.amount || 0;

        if (status === "RESOLVED_SUCCESS") {
          // In favor of merchant - payout is confirmed, remove frozen funds
          await tx.payout.update({
            where: { id: dispute.payoutId },
            data: { status: "CONFIRMED" }
          });

          // Remove frozen funds without returning to balance (payout goes through)
          if (frozenAmountRub > 0 && dispute.payout.traderId) {
            await tx.user.update({
              where: { id: dispute.payout.traderId },
              data: {
                frozenRub: { decrement: frozenAmountRub },
                frozenPayoutBalance: { decrement: frozenAmountRub }
              }
            });
            console.log(`[WithdrawalDisputeResolution] Merchant won: completed payout of ${frozenAmountRub} RUB for trader ${dispute.payout.traderId}`);
          }
        } else if (status === "RESOLVED_FAIL") {
          // In favor of trader - payout is cancelled, return frozen funds
          await tx.payout.update({
            where: { id: dispute.payoutId },
            data: { 
              status: "CANCELLED",
              cancelReason: resolution
            }
          });

          // Return frozen funds to trader's balances
          if (frozenAmountRub > 0 && dispute.payout.traderId) {
            await tx.user.update({
              where: { id: dispute.payout.traderId },
              data: {
                frozenRub: { decrement: frozenAmountRub },
                balanceRub: { increment: frozenAmountRub },
                frozenPayoutBalance: { decrement: frozenAmountRub },
                payoutBalance: { increment: frozenAmountRub }
              }
            });
            console.log(`[WithdrawalDisputeResolution] Trader won: returned ${frozenAmountRub} RUB to trader ${dispute.payout.traderId}`);
          }
        }
      });

      // Send WebSocket event dispute:resolved
      disputeEvents.notifyResolution(dispute.id, {
        status,
        resolution,
        resolvedAt: new Date()
      });
      
      // TODO: Send push notification to merchant

      return {
        success: true,
        message: "Dispute resolved successfully"
      };
    } catch (error) {
      console.error("Failed to resolve dispute:", error);
      throw new Error("Failed to resolve dispute");
    }
  }, {
    body: t.Object({
      status: t.Union([
        t.Literal("RESOLVED_SUCCESS"),
        t.Literal("RESOLVED_FAIL")
      ]),
      resolution: t.String({ minLength: 1 })
    })
  });