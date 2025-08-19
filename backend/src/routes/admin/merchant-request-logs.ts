import { Elysia, t } from "elysia";
import { db } from "@/db";
import { MerchantRequestType } from "@prisma/client";

export const merchantRequestLogsRoutes = new Elysia({ prefix: "/merchant-request-logs" })
  .get("/", async ({ query }) => {
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "50");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.merchantId) where.merchantId = query.merchantId;
    if (query.type) where.type = query.type as MerchantRequestType;

    const [logs, total] = await db.$transaction([
      db.merchantRequestLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { merchant: { select: { id: true, name: true } } },
      }),
      db.merchantRequestLog.count({ where }),
    ]);

    return {
      data: logs.map((l) => ({
        id: l.id,
        merchantId: l.merchantId,
        merchantName: l.merchant.name,
        type: l.type,
        data: l.data,
        createdAt: l.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }, {
    query: t.Object({
      page: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      merchantId: t.Optional(t.String()),
      type: t.Optional(t.Enum(MerchantRequestType)),
    }),
  });
