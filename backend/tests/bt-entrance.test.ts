import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '@/db';
import traderRoutes from '@/routes/trader';
import { randomBytes } from 'node:crypto';
import { Status, TransactionType, BankType, MethodType } from '@prisma/client';

let app: Elysia;
let headers: Record<string, string>;
let traderId: string;
let dealWithoutDeviceId: string;
let dealWithDeviceId: string;

beforeAll(async () => {
  const trader = await db.user.create({
    data: {
      id: `trader-${Date.now()}-${randomBytes(4).toString('hex')}`,
      email: `trader-${Date.now()}-${randomBytes(4).toString('hex')}@example.com`,
      name: 'BT Trader',
      password: 'hash',
      balanceUsdt: 0,
      balanceRub: 0,
      trafficEnabled: true,
      banned: false,
    },
  });
  traderId = trader.id;

  const session = await db.session.create({
    data: {
      userId: trader.id,
      token: `session-${Date.now()}-${randomBytes(8).toString('hex')}`,
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ip: '127.0.0.1',
    },
  });
  headers = { 'x-trader-token': session.token };

  const merchant = await db.merchant.create({
    data: {
      name: 'BT Merchant',
      token: randomBytes(16).toString('hex'),
      disabled: false,
      banned: false,
    },
  });

  const method = await db.method.create({
    data: {
      code: `method-${Date.now()}-${randomBytes(4).toString('hex')}`,
      name: 'Method',
      type: 'c2c',
      commissionPayin: 0,
      commissionPayout: 0,
      maxPayin: 10000,
      minPayin: 10,
      maxPayout: 10000,
      minPayout: 10,
      chancePayin: 1,
      chancePayout: 1,
      isEnabled: true,
    },
  });

  const device = await db.device.create({
    data: {
      name: 'Test device',
      userId: trader.id,
    },
  });

  const requisiteWithDevice = await db.bankDetail.create({
    data: {
      userId: trader.id,
      methodType: MethodType.c2c,
      bankType: BankType.SBERBANK,
      cardNumber: '1234567890123456',
      recipientName: 'With Device',
      minAmount: 100,
      maxAmount: 1000,
      dailyLimit: 10000,
      monthlyLimit: 100000,
      intervalMinutes: 0,
      deviceId: device.id,
    },
  });

  const requisiteWithoutDevice = await db.bankDetail.create({
    data: {
      userId: trader.id,
      methodType: MethodType.c2c,
      bankType: BankType.SBERBANK,
      cardNumber: '6543210987654321',
      recipientName: 'No Device',
      minAmount: 100,
      maxAmount: 1000,
      dailyLimit: 10000,
      monthlyLimit: 100000,
      intervalMinutes: 0,
    },
  });

  const createTx = async (bankDetailId: string) => {
    const tx = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 100,
        assetOrBank: 'USDT',
        orderId: `order-${randomBytes(4).toString('hex')}`,
        methodId: method.id,
        userId: 'client',
        callbackUri: 'https://example.com/cb',
        successUri: 'https://example.com/s',
        failUri: 'https://example.com/f',
        type: TransactionType.IN,
        expired_at: new Date(Date.now() + 60 * 60 * 1000),
        commission: 1,
        clientName: 'Client',
        status: Status.IN_PROGRESS,
        traderId: trader.id,
        bankDetailId,
      },
    });
    return tx.id;
  };

  dealWithDeviceId = await createTx(requisiteWithDevice.id);
  dealWithoutDeviceId = await createTx(requisiteWithoutDevice.id);

  app = new Elysia().use(traderRoutes);
});

afterAll(async () => {
  await db.transaction.deleteMany({ where: { id: { in: [dealWithDeviceId, dealWithoutDeviceId] } } });
  await db.bankDetail.deleteMany({ where: { userId: traderId } });
  await db.device.deleteMany({ where: { userId: traderId } });
  await db.session.deleteMany({ where: { userId: traderId } });
  await db.method.deleteMany({});
  await db.merchant.deleteMany({});
  await db.user.deleteMany({ where: { id: traderId } });
});

describe('BT Entrance deals', () => {
  it('returns only deals without device', async () => {
    const res = await app.handle(
      new Request('http://localhost/bt-entrance/deals', { headers }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.data.map((d: any) => d.id);
    expect(ids).toContain(dealWithoutDeviceId);
    expect(ids).not.toContain(dealWithDeviceId);
  });
});
