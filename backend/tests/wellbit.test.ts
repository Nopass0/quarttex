import { Elysia } from 'elysia';
import { expect, it, beforeAll, afterAll, describe } from 'bun:test';
import { db } from '@/db';
import wellbitRoutes from '@/routes/wellbit';
import { createHmac } from 'node:crypto';
import { canonicalJson } from '@/utils/canonicalJson';

let publicKey: string;
let privateKey: string;
let payoutId: number;
let app: Elysia;

const sign = (body: any) =>
  createHmac('sha256', privateKey).update(canonicalJson(body)).digest('hex');

const signResponse = (body: any) =>
  createHmac('sha256', privateKey)
    .update(canonicalJson(JSON.stringify(body)))
    .digest('hex');

describe('Wellbit routes', () => {
  beforeAll(async () => {
    publicKey = 'pub-' + Date.now();
    privateKey = 'priv-' + Date.now();
    await db.merchant.create({
      data: {
        name: 'Wellbit Test',
        token: 'tok-' + Date.now(),
        apiKeyPublic: publicKey,
        apiKeyPrivate: privateKey,
      },
    });

    app = new Elysia().use(wellbitRoutes);
  });

  afterAll(async () => {
    await db.payout.deleteMany({ where: { merchant: { apiKeyPublic: publicKey } } });
    await db.merchant.deleteMany({ where: { apiKeyPublic: publicKey } });
  });

  it('creates payment with valid signature', async () => {
    const body = {
      payment_id: Date.now(),
      payment_amount: 100,
      payment_amount_usdt: 100,
      payment_amount_profit: 0,
      payment_amount_profit_usdt: 0,
      payment_fee_percent_profit: 0,
      payment_type: 'card',
      payment_bank: 'SBERBANK',
      payment_course: 1,
      payment_lifetime: 3600,
      payment_status: 'new',
    };
    const res = await app.handle(
      new Request('http://localhost/payment/create', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': publicKey,
          'x-api-token': sign(body),
        },
        body: JSON.stringify(body),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('payment_id');
    const expectedSignature = signResponse(data);
    expect(res.headers.get('x-api-token')).toBe(expectedSignature);
    payoutId = data.payment_id;
  });

  it('rejects invalid signature', async () => {
    const body = {
      payment_id: Date.now(),
      payment_amount: 100,
      payment_amount_usdt: 100,
      payment_amount_profit: 0,
      payment_amount_profit_usdt: 0,
      payment_fee_percent_profit: 0,
      payment_type: 'card',
      payment_bank: 'SBERBANK',
      payment_course: 1,
      payment_lifetime: 3600,
      payment_status: 'new',
    };
    const res = await app.handle(
      new Request('http://localhost/payment/create', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': publicKey,
          'x-api-token': 'bad',
        },
        body: JSON.stringify(body),
      })
    );
    expect(res.status).toBe(401);
  });

  it('gets payment', async () => {
    const body = { payment_id: payoutId };
    const res = await app.handle(
      new Request('http://localhost/payment/get', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': publicKey,
          'x-api-token': sign(body),
        },
        body: JSON.stringify(body),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    const expectedSignature = signResponse(data);
    expect(res.headers.get('x-api-token')).toBe(expectedSignature);
  });

  it('checks payment status', async () => {
    const body = { payment_id: payoutId, payment_status: 'complete' };
    const res = await app.handle(
      new Request('http://localhost/payment/status', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': publicKey,
          'x-api-token': sign(body),
        },
        body: JSON.stringify(body),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    const expectedSignature = signResponse(data);
    expect(res.headers.get('x-api-token')).toBe(expectedSignature);
  });
});
