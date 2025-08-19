import { Elysia, t } from "elysia";
import { db } from "@/db";
import { traderGuard } from "@/middleware/traderGuard";
import { DisputeSenderType, Status } from "@prisma/client";
import crypto from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { dealDisputeEvents } from "../websocket/deal-disputes";
import { truncate2 } from "@/utils/rounding";

const UPLOAD_DIR = join(process.cwd(), "uploads", "deal-disputes");
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 10;

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

export default new Elysia({ prefix: "/deal-disputes" })
  .use(traderGuard())

  // Get deal disputes for trader
  .get(
    "/",
    async ({ trader, query }) => {
      try {
        const { page = 1, limit = 20, status } = query;
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        const where = {
          traderId: trader.id,
          ...(status && { status }),
        };

        const [disputes, total] = await Promise.all([
          db.dealDispute.findMany({
            where,
            skip,
            take: limitNum,
            orderBy: { createdAt: "desc" },
            include: {
              deal: {
                include: {
                  method: true,
                  requisites: {
                    include: {
                      device: true,
                    },
                  },
                },
              },
              merchant: {
                select: {
                  id: true,
                  name: true,
                },
              },
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: {
                  attachments: true,
                },
              },
            },
          }),
          db.dealDispute.count({ where }),
        ]);

        return {
          success: true,
          data: disputes,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        };
      } catch (error) {
        console.error("Failed to get deal disputes:", error);
        throw new Error("Failed to get deal disputes");
      }
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  )

  // Get single dispute with messages
  .get("/:disputeId", async ({ trader, params }) => {
    try {
      const dispute = await db.dealDispute.findFirst({
        where: {
          id: params.disputeId,
          traderId: trader.id,
        },
        include: {
          deal: {
            include: {
              method: true,
              requisites: true,
              receipts: true,
            },
          },
          merchant: {
            select: {
              id: true,
              name: true,
            },
          },
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              attachments: true,
            },
          },
        },
      });

      if (!dispute) {
        throw new Error("Dispute not found");
      }

      return {
        success: true,
        data: dispute,
      };
    } catch (error) {
      console.error("Failed to get deal dispute:", error);
      throw new Error("Failed to get deal dispute");
    }
  })

  // Send message in dispute
  .post(
    "/:disputeId/messages",
    async ({ trader, params, body, set }) => {
      try {
        const { message, files } = body;

        // Check if dispute exists and trader can send messages
        const dispute = await db.dealDispute.findFirst({
          where: {
            id: params.disputeId,
            traderId: trader.id,
            status: {
              in: ["OPEN", "IN_PROGRESS"],
            },
          },
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
              return {
                error: `File ${file.name} exceeds maximum size of 20MB`,
              };
            }

            // Generate unique filename
            const ext = file.name.split(".").pop();
            const filename = `${crypto.randomUUID()}.${ext}`;
            const filepath = join(UPLOAD_DIR, filename);

            // Save file
            await writeFile(filepath, Buffer.from(await file.arrayBuffer()));

            uploadedFiles.push({
              filename: file.name,
              url: `/api/uploads/deal-disputes/${filename}`,
              size: file.size,
              mimeType: file.type,
            });
          }
        }

        // Create message
        const newMessage = await db.dealDisputeMessage.create({
          data: {
            disputeId: dispute.id,
            senderId: trader.id,
            senderType: DisputeSenderType.TRADER,
            message,
            attachments: {
              create: uploadedFiles,
            },
          },
          include: {
            attachments: true,
          },
        });

        // Update dispute timestamp and status
        await db.dealDispute.update({
          where: { id: dispute.id },
          data: {
            updatedAt: new Date(),
            status: dispute.status === "OPEN" ? "IN_PROGRESS" : dispute.status,
          },
        });

        // Send WebSocket event
        dealDisputeEvents.notifyReply(
          dispute.id,
          newMessage,
          DisputeSenderType.TRADER
        );

        // TODO: Send push notification to merchant

        return {
          success: true,
          message: newMessage,
        };
      } catch (error) {
        console.error("Failed to send message:", error);
        set.status = 500;
        return { error: "Failed to send message" };
      }
    },
    {
      body: t.Object({
        message: t.String({ minLength: 1 }),
        files: t.Optional(t.Files()),
      }),
    }
  )

  // Resolve dispute
  .post(
    "/:disputeId/resolve",
    async ({ trader, params, body }) => {
      try {
        const { resolution, status } = body;

        // Check if dispute exists and can be resolved
        const dispute = await db.dealDispute.findFirst({
          where: {
            id: params.disputeId,
            traderId: trader.id,
            status: {
              in: ["OPEN", "IN_PROGRESS"],
            },
          },
          include: {
            deal: true,
          },
        });

        if (!dispute) {
          throw new Error("Dispute not found or already resolved");
        }

        // Update dispute
        await db.dealDispute.update({
          where: { id: dispute.id },
          data: {
            status,
            resolution,
            resolvedAt: new Date(),
          },
        });

        // Update transaction status based on resolution and handle frozen funds
        // RESOLVED_SUCCESS means resolved in favor of merchant (transaction completed)
        // RESOLVED_FAIL means resolved in favor of trader (transaction canceled)
        await db.$transaction(async (tx) => {
          const frozenAmount = dispute.deal.frozenUsdtAmount || 0;

          if (status === "RESOLVED_SUCCESS") {
            // In favor of merchant - mark as READY
            await tx.transaction.update({
              where: { id: dispute.dealId },
              data: {
                status: Status.READY,
                acceptedAt: new Date(),
              },
            });

            // Unfreeze funds without returning to trustBalance (merchant wins)
            if (frozenAmount > 0 && dispute.deal.traderId) {
              await tx.user.update({
                where: { id: dispute.deal.traderId },
                data: {
                  frozenUsdt: { decrement: truncate2(frozenAmount) },
                },
              });
              console.log(
                `[DisputeResolution] Merchant won: unfrozen ${truncate2(
                  frozenAmount
                )} USDT from trader ${
                  dispute.deal.traderId
                } without returning to trust balance`
              );
            }
          } else if (status === "RESOLVED_FAIL") {
            // In favor of trader - mark as EXPIRED
            await tx.transaction.update({
              where: { id: dispute.dealId },
              data: { status: Status.EXPIRED },
            });

            // Unfreeze funds and return to trustBalance (trader wins)
            if (frozenAmount > 0 && dispute.deal.traderId) {
              await tx.user.update({
                where: { id: dispute.deal.traderId },
                data: {
                  frozenUsdt: { decrement: truncate2(frozenAmount) },
                  trustBalance: { increment: truncate2(frozenAmount) },
                },
              });
              console.log(
                `[DisputeResolution] Trader won: unfrozen ${truncate2(
                  frozenAmount
                )} USDT and returned to trust balance for trader ${
                  dispute.deal.traderId
                }`
              );
            }
          }
        });

        // Send WebSocket event
        dealDisputeEvents.notifyResolution(dispute.id, {
          status,
          resolution,
          resolvedAt: new Date(),
        });

        // TODO: Send push notification to merchant

        return {
          success: true,
          message: "Dispute resolved successfully",
        };
      } catch (error) {
        console.error("Failed to resolve dispute:", error);
        throw new Error("Failed to resolve dispute");
      }
    },
    {
      body: t.Object({
        status: t.Union([
          t.Literal("RESOLVED_SUCCESS"),
          t.Literal("RESOLVED_FAIL"),
        ]),
        resolution: t.String({ minLength: 1 }),
      }),
    }
  );
