import { Elysia, t } from 'elysia';
import { db } from '@/db';
import { createHmac } from 'node:crypto';
import { canonicalJson } from '@/utils/canonicalJson';
import type { Merchant as MerchantModel } from '@prisma/client';

// Extend Elysia context
declare module 'elysia' {
  interface Context {
    wellbitMerchant: MerchantModel;
  }
}

export const wellbitGuard = () => (app: Elysia) =>
  app
    .derive(async ({ headers, body, error }) => {
      const apiKey = headers['x-api-key'];
      const token = headers['x-api-token'];
      
      if (!apiKey || !token) {
        return error(401, { error: 'Missing API credentials' });
      }
      
      const merchant = await db.merchant.findFirst({ where: { apiKeyPublic: apiKey } });
      if (!merchant) return error(401, { error: 'Invalid API key' });

      let canonical: string;
      try {
        canonical = canonicalJson(body);
      } catch (err) {
        console.error('Failed to parse JSON:', err);
        console.error('Body:', body);
        return error(400, { error: 'Invalid JSON' });
      }
      
      const expected = createHmac('sha256', merchant.apiKeyPrivate || '')
        .update(canonical)
        .digest('hex');
      
      if (expected !== token) return error(401, { error: 'Invalid signature' });
      
      // Return the merchant for use in route handlers
      return { wellbitMerchant: merchant };
    });
