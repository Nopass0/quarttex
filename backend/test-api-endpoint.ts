import { Elysia } from "elysia";
import { db } from "./src/db";

const app = new Elysia()
  .get("/test-kkk", async () => {
    const rateSources = await db.rateSourceConfig.findMany({
      include: {
        traders: {
          select: {
            id: true,
            name: true,
            email: true,
            traderKkkPercent: true,
            traderKkkOperation: true,
          },
        },
        merchants: {
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      data: rateSources,
    };
  })
  .listen(3001);

console.log("Test server running on http://localhost:3001/test-kkk");
