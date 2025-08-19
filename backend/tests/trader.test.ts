import { expect, it, describe, beforeAll, afterAll } from 'bun:test';
import { Elysia } from 'elysia';
import { db } from '@/db';
import { Status, TransactionType } from '@prisma/client';
import traderRoutes from '@/routes/trader';
import { randomBytes } from 'node:crypto';

// Мок для заголовков запроса
let mockHeaders: Record<string, string> = {
  'x-trader-token': 'test-token'
};

// Тестовый экземпляр приложения
let app: Elysia;

describe('Маршруты трейдера', () => {
  let testTransactionId: string;
  let expiredTransactionId: string;
  let testTraderId: string;
  let testMethodId: string;
  let testMerchantId: string;
  let testSessionToken: string;
  
  // Создаем тестовые данные перед запуском тестов
  beforeAll(async () => {
    // Создаем тестового трейдера в базе данных
    const uniqueEmail = `test-trader-${Date.now()}-${randomBytes(4).toString('hex')}@example.com`;
    const uniqueTraderId = `test-trader-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const trader = await db.user.create({
      data: {
        id: uniqueTraderId,
        email: uniqueEmail,
        name: 'Test Trader',
        password: 'hash',
        balanceUsdt: 1000,
        balanceRub: 50000,
        banned: false,
        trafficEnabled: true
      }
    });
    testTraderId = trader.id;
    
    // Create a session for the trader
    const session = await db.session.create({
      data: {
        userId: trader.id,
        token: `test-session-${Date.now()}-${randomBytes(16).toString('hex')}`,
        expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        ip: '127.0.0.1' // Test IP address
      }
    });
    testSessionToken = session.token;
    
    // Update headers with actual session token
    mockHeaders = {
      'x-trader-token': testSessionToken
    };
    
    // Initialize app with actual routes (no need for mock guard)
    app = new Elysia()
      .use(traderRoutes);
    
    // Создаем тестового мерчанта
    const merchant = await db.merchant.create({
      data: {
        name: 'Test Merchant',
        token: randomBytes(16).toString('hex'),
        disabled: false,
        banned: false
      }
    });
    testMerchantId = merchant.id;
    
    // Создаем тестовый метод
    const methodCode = `test-method-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const method = await db.method.create({
      data: {
        code: methodCode,
        name: 'Test Method',
        type: 'c2c',
        commissionPayin: 0.01,
        commissionPayout: 0.02,
        maxPayin: 10000,
        minPayin: 100,
        maxPayout: 10000,
        minPayout: 100,
        chancePayin: 0.95,
        chancePayout: 0.95,
        isEnabled: true
      }
    });
    testMethodId = method.id;
    
    // Создаем тестовую активную транзакцию
    const transaction = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 1000,
        assetOrBank: 'USDT',
        orderId: 'test-order-' + randomBytes(4).toString('hex'),
        methodId: method.id,
        userId: 'test-user-id',
        callbackUri: 'https://example.com/callback',
        successUri: 'https://example.com/success',
        failUri: 'https://example.com/fail',
        type: TransactionType.IN,
        expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        commission: 10,
        clientName: 'Test Client',
        status: Status.IN_PROGRESS,
        traderId: testTraderId
      }
    });
    
    testTransactionId = transaction.id;

    // Создаем истекшую транзакцию
    const expiredTx = await db.transaction.create({
      data: {
        merchantId: merchant.id,
        amount: 500,
        assetOrBank: 'USDT',
        orderId: 'expired-order-' + randomBytes(4).toString('hex'),
        methodId: method.id,
        userId: 'test-user-id',
        callbackUri: 'https://example.com/callback',
        successUri: 'https://example.com/success',
        failUri: 'https://example.com/fail',
        type: TransactionType.IN,
        expired_at: new Date(Date.now() - 60 * 1000),
        commission: 5,
        clientName: 'Expired Client',
        status: Status.EXPIRED,
        traderId: testTraderId,
        rate: 100,
      }
    });

    expiredTransactionId = expiredTx.id;
  });
  
  // Удаляем тестовые данные после завершения тестов
  afterAll(async () => {
    await db.transaction.deleteMany({
      where: { id: { in: [testTransactionId, expiredTransactionId] } }
    });
    await db.session.deleteMany({
      where: { userId: testTraderId }
    });
    await db.method.deleteMany({
      where: { id: testMethodId }
    });
    await db.merchant.deleteMany({
      where: { id: testMerchantId }
    });
    await db.user.deleteMany({
      where: { id: testTraderId }
    });
  });
  
  it('GET /transactions должен возвращать список транзакций трейдера', async () => {
    const response = await app.handle(
      new Request('http://localhost/transactions', {
        headers: mockHeaders
      })
    );
    
    if (response.status !== 200) {
      const errorBody = await response.text();
      console.error('Response error:', errorBody);
    }
    
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('data');
    expect(body).toHaveProperty('pagination');
    expect(Array.isArray(body.data)).toBe(true);
  });
  
  it('GET /transactions/:id должен возвращать детали транзакции', async () => {
    const response = await app.handle(
      new Request(`http://localhost/transactions/${testTransactionId}`, {
        headers: mockHeaders
      })
    );
    
    if (response.status !== 200) {
      const errorBody = await response.text();
      console.error('Response error:', errorBody);
    }
    
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('id', testTransactionId);
    expect(body).toHaveProperty('traderId', testTraderId);
  });
  
  it('PATCH /transactions/:id/status должен обновлять статус транзакции', async () => {
    const response = await app.handle(
      new Request(`http://localhost/transactions/${testTransactionId}/status`, {
        method: 'PATCH',
        headers: {
          ...mockHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: Status.READY
        })
      })
    );
    
    if (response.status !== 200) {
      const errorBody = await response.text();
      console.error('Response error:', errorBody);
    }
    
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('transaction');
    expect(body.transaction).toHaveProperty('status', Status.READY);
  });

  it('PATCH /transactions/:id/status должен обновлять истекшую транзакцию', async () => {
    const response = await app.handle(
      new Request(`http://localhost/transactions/${expiredTransactionId}/status`, {
        method: 'PATCH',
        headers: {
          ...mockHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: Status.READY
        })
      })
    );

    if (response.status !== 200) {
      const errorBody = await response.text();
      console.error('Response error:', errorBody);
    }

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('success', true);
    expect(body.transaction).toHaveProperty('status', Status.READY);
  });
});
