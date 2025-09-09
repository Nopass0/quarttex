import { Elysia, t } from 'elysia';
import { pspwareAdapterService } from '@/services/pspware-adapter.service';
import { db } from '@/db';

export default new Elysia()
  .post(
    '/callback/:aggregatorId',
    async ({ params, body, headers, error }) => {
      try {
        console.log(`[PSPWare Callback] Received callback for aggregator ${params.aggregatorId}:`, body);
        
        // Validate aggregator exists
        const aggregator = await db.aggregator.findUnique({
          where: { id: params.aggregatorId }
        });
        
        if (!aggregator) {
          console.error(`[PSPWare Callback] Aggregator ${params.aggregatorId} not found`);
          return error(404, { error: 'Aggregator not found' });
        }
        
        // Validate X-API-KEY header
        const apiKey = headers['x-api-key'];
        const expectedKey = aggregator.customApiToken || aggregator.pspwareApiKey;
        
        if (!apiKey || apiKey !== expectedKey) {
          console.error(`[PSPWare Callback] Invalid API key`);
          return error(401, { error: 'Unauthorized' });
        }
        
        // Log incoming callback to API logs
        const startTime = Date.now();
        
        // Process callback
        const result = await pspwareAdapterService.handleCallback(body, params.aggregatorId);
        
        const responseTime = Date.now() - startTime;
        
        // Log callback to AggregatorIntegrationLog
        await db.aggregatorIntegrationLog.create({
          data: {
            aggregatorId: params.aggregatorId,
            direction: 'IN' as any,
            eventType: 'pspware_callback',
            method: 'POST',
            url: `/api/pspware/callback/${params.aggregatorId}`,
            headers: {
              'x-api-key': apiKey ? '[PRESENT]' : '[MISSING]',
              'content-type': headers['content-type'] || 'application/json'
            },
            requestBody: body as any,
            responseBody: result as any,
            statusCode: result.success ? 200 : 400,
            responseTimeMs: responseTime,
            ourDealId: body.id,
            error: result.success ? null : result.message
          }
        });
        
        if (result.success) {
          console.log(`[PSPWare Callback] Successfully processed callback for order ${body.id}`);
          return { status: 'OK', message: result.message };
        } else {
          console.error(`[PSPWare Callback] Failed to process callback: ${result.message}`);
          return error(400, { error: result.message });
        }
      } catch (err) {
        console.error('[PSPWare Callback] Error processing callback:', err);
        return error(500, { error: 'Internal server error' });
      }
    },
    {
      params: t.Object({
        aggregatorId: t.String()
      }),
      body: t.Object({
        id: t.String(),
        sum: t.Number(),
        currency: t.String(),
        merch_profit: t.Number(),
        status: t.String(),
        card: t.String(),
        bank: t.String(),
        bank_name: t.String(),
        is_sbp: t.Optional(t.Boolean()),
        merch_profit_currency: t.String(),
        currency_rate: t.Number(),
        order_type: t.String(),
        merchant_id: t.String(),
        created_at: t.String(),
        updated_at: t.String()
      }),
      detail: {
        tags: ['pspware'],
        summary: 'PSPWare callback endpoint'
      }
    }
  )
  .get(
    '/success',
    async ({ query }) => {
      console.log('[PSPWare] Success redirect:', query);
      // В реальном приложении здесь должен быть редирект на страницу успеха
      return {
        status: 'success',
        message: 'Payment successful',
        orderId: query.order_id
      };
    },
    {
      query: t.Object({
        order_id: t.Optional(t.String())
      }),
      detail: {
        tags: ['pspware'],
        summary: 'PSPWare success redirect'
      }
    }
  )
  .get(
    '/failure',
    async ({ query }) => {
      console.log('[PSPWare] Failure redirect:', query);
      // В реальном приложении здесь должен быть редирект на страницу ошибки
      return {
        status: 'failure',
        message: 'Payment failed',
        orderId: query.order_id
      };
    },
    {
      query: t.Object({
        order_id: t.Optional(t.String())
      }),
      detail: {
        tags: ['pspware'],
        summary: 'PSPWare failure redirect'
      }
    }
  );