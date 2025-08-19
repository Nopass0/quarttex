import { describe, it, beforeAll, afterAll, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { db } from '@/db'
import transactionsRoutes from '@/routes/admin/transactions'
import { TransactionType, Status } from '@prisma/client'
import { ADMIN_KEY } from '@/utils/constants'

let app: Elysia
let merchantId: string
let methodId: string
let traderId: string
let transactionId: string
let bankDetailId: string

describe('Admin transaction recalculation', () => {
  beforeAll(async () => {
    const merchant = await db.merchant.create({
      data: { name: 'Test Merchant', token: `token-admin-recalc-${Date.now()}` }
    })
    merchantId = merchant.id

    const method = await db.method.create({
      data: {
        code: `test-method-recalc-${Date.now()}`,
        name: 'Test Method',
        type: 'c2c',
        commissionPayin: 0,
        commissionPayout: 0,
        maxPayin: 10000,
        minPayin: 1,
        maxPayout: 10000,
        minPayout: 1,
        chancePayin: 1,
        chancePayout: 1,
        isEnabled: true
      }
    })
    methodId = method.id

    const trader = await db.user.create({
      data: {
        email: `recalc-${Date.now()}@example.com`,
        password: 'pass',
        name: 'Trader',
        balanceUsdt: 1000,
        balanceRub: 0,
        trustBalance: 0,
        frozenUsdt: 0,
        frozenRub: 0
      }
    })
    traderId = trader.id

    const bankDetail = await db.bankDetail.create({
      data: {
        userId: traderId,
        methodType: 'c2c',
        bankType: 'SBERBANK',
        cardNumber: '1234567890123456',
        recipientName: 'Test User',
        phoneNumber: '1234567890',
        minAmount: 0,
        maxAmount: 100000,
        dailyLimit: 100000,
        monthlyLimit: 100000,
        intervalMinutes: 0
      }
    })
    bankDetailId = bankDetail.id

    const trx = await db.transaction.create({
      data: {
        merchantId,
        amount: 1000,
        assetOrBank: 'card',
        orderId: 'order-recalc',
        methodId,
        userId: traderId,
        callbackUri: '',
        successUri: '',
        failUri: '',
        type: TransactionType.IN,
        expired_at: new Date(),
        commission: 0,
        clientName: 'Client',
        status: Status.READY,
        rate: 100,
        currency: 'RUB',
        userIp: '127.0.0.1',
        kkkPercent: 0,
        feeInPercent: 0,
        frozenUsdtAmount: 10,
        calculatedCommission: 0,
        traderProfit: 0,
        traderId,
        bankDetailId: bankDetail.id
      }
    })
    transactionId = trx.id

    // simulate balances after READY transaction
    await db.merchant.update({ where: { id: merchantId }, data: { balanceUsdt: { increment: 10 } } })
    await db.user.update({ where: { id: traderId }, data: { balanceUsdt: { decrement: 10 } } })

    app = new Elysia().use(transactionsRoutes)
  })

  afterAll(async () => {
    await db.transaction.deleteMany({ where: { id: transactionId } })
    await db.method.deleteMany({ where: { id: methodId } })
    await db.bankDetail.deleteMany({ where: { id: bankDetailId } })
    await db.user.deleteMany({ where: { id: traderId } })
    await db.merchant.deleteMany({ where: { id: merchantId } })
  })

  it('recalculates transaction and updates balances', async () => {
    const res = await app.handle(new Request(`http://localhost/${transactionId}/recalc`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-admin-key': ADMIN_KEY
      },
      body: JSON.stringify({ amount: 2000 })
    }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.amount).toBe(2000)
    const updatedTx = await db.transaction.findUnique({ where: { id: transactionId } })
    expect(updatedTx?.frozenUsdtAmount).toBe(20)
    expect(updatedTx?.rate).toBe(100)

    const merchant = await db.merchant.findUnique({ where: { id: merchantId } })
    expect(merchant?.balanceUsdt).toBe(20)

    const trader = await db.user.findUnique({ where: { id: traderId } })
    expect(trader?.balanceUsdt).toBe(980)
  })
})

