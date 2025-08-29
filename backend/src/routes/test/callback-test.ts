import { Elysia, t } from "elysia";

export const callbackTestRoute = new Elysia({ prefix: "/callback-test" })
  .post(
    "/",
    async ({ body, set }) => {
      console.log("[Callback Test] Received callback:", JSON.stringify(body, null, 2));
      
      // Log each field separately for clarity
      console.log("[Callback Test] Transaction ID:", body.id);
      console.log("[Callback Test] Amount:", body.amount);
      console.log("[Callback Test] Status:", body.status);
      
      // Return success response
      set.status = 200;
      return {
        success: true,
        message: "Callback received successfully",
        received: {
          id: body.id,
          amount: body.amount,
          status: body.status,
          timestamp: new Date().toISOString()
        }
      };
    },
    {
      body: t.Object({
        id: t.String(),
        amount: t.Number(),
        status: t.String()
      }),
      detail: {
        summary: "Test endpoint for receiving transaction callbacks",
        description: "This endpoint logs callback data and returns a success response"
      }
    }
  );