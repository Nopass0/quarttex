import { Elysia, t } from "elysia";
import { db } from "@/db";

export const callbackProxyRoutes = new Elysia({ prefix: "/callback-proxy" })
  .post(
    "/send",
    async ({ body, set, error }) => {
      const { url, data, headers, transactionId } = body;
      
      console.log(`[Callback Proxy] Sending callback to: ${url}`);
      console.log(`[Callback Proxy] Data:`, JSON.stringify(data, null, 2));
      console.log(`[Callback Proxy] Transaction ID:`, transactionId);
      
      let callbackHistory: any = null;
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify(data)
        });
        
        const responseText = await response.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = responseText;
        }
        
        console.log(`[Callback Proxy] Response status: ${response.status}`);
        console.log(`[Callback Proxy] Response:`, responseData);
        
        // Save to callback history if transactionId is provided
        if (transactionId) {
          try {
            callbackHistory = await db.callbackHistory.create({
              data: {
                transactionId,
                url,
                payload: data,
                response: responseText,
                statusCode: response.status
              }
            });
            console.log(`[Callback Proxy] Saved callback history:`, callbackHistory.id);
          } catch (dbError: any) {
            console.error(`[Callback Proxy] Failed to save callback history:`, dbError.message);
          }
        }
        
        return {
          success: response.ok,
          status: response.status,
          data: responseData,
          headers: Object.fromEntries(response.headers.entries()),
          historyId: callbackHistory?.id
        };
      } catch (e: any) {
        console.error(`[Callback Proxy] Error:`, e.message);
        
        // Save error to callback history if transactionId is provided
        if (transactionId) {
          try {
            callbackHistory = await db.callbackHistory.create({
              data: {
                transactionId,
                url,
                payload: data,
                error: e.message || 'Request failed',
                statusCode: null
              }
            });
            console.log(`[Callback Proxy] Saved error callback history:`, callbackHistory.id);
          } catch (dbError: any) {
            console.error(`[Callback Proxy] Failed to save error callback history:`, dbError.message);
          }
        }
        
        return error(500, {
          success: false,
          error: e.message || 'Request failed',
          historyId: callbackHistory?.id
        });
      }
    },
    {
      body: t.Object({
        url: t.String({ description: "Target callback URL" }),
        data: t.Any({ description: "Data to send in request body" }),
        headers: t.Optional(t.Record(t.String(), t.String()), { description: "Additional headers" }),
        transactionId: t.Optional(t.String(), { description: "Transaction ID for callback history" })
      }),
      detail: {
        summary: "Proxy callback requests through backend to avoid CORS",
        description: "This endpoint allows frontend to send callback requests through the backend server, bypassing CORS restrictions"
      }
    }
  )
  .get(
    "/test",
    async ({ set }) => {
      return {
        message: "Callback proxy is working",
        timestamp: new Date().toISOString()
      };
    },
    {
      detail: {
        summary: "Test callback proxy endpoint",
        description: "Simple test endpoint to verify the callback proxy is working"
      }
    }
  );