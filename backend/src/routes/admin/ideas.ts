import { Elysia, t } from "elysia";
import { db } from "@/db";

export default (app: Elysia) =>
  app
  .get("/", async () => {
    const ideas = await db.idea.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return ideas;
  })
  .get("/:id", async ({ params }) => {
    const idea = await db.idea.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!idea) {
      throw new Error("Idea not found");
    }

    return idea;
  })
  .patch(
    "/:id",
    async ({ params, body, set }) => {
      if (body.status === undefined && body.adminNotes === undefined) {
        set.status = 400;
        return { error: "Nothing to update" };
      }

      const existing = await db.idea.findUnique({ where: { id: params.id } });
      if (!existing) {
        set.status = 404;
        return { error: "Idea not found" };
      }

      // Нормализуем статус из UI в статус БД (Prisma)
      const normalizedStatus =
        body.status === "APPROVED"
          ? "ACCEPTED"
          : body.status;

      try {
        const idea = await db.idea.update({
          where: { id: params.id },
          data: {
            ...(normalizedStatus !== undefined ? { status: normalizedStatus as any } : {}),
            ...(body.adminNotes !== undefined ? { adminNotes: body.adminNotes } : {}),
          },
        });

        return idea;
      } catch (e) {
        set.status = 400;
        return { error: "Invalid payload", details: e instanceof Error ? e.message : String(e) };
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        // Разрешаем значения из UI, маппим APPROVED -> ACCEPTED
        status: t.Optional(
          t.Union([
            t.Literal("PENDING"),
            t.Literal("REVIEWING"),
            t.Literal("APPROVED"),
            t.Literal("REJECTED"),
            t.Literal("IMPLEMENTED"),
            t.Literal("ACCEPTED"),
          ])
        ),
        adminNotes: t.Optional(t.String()),
      }),
    }
  );