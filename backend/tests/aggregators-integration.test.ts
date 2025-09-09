import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { randomBytes } from 'node:crypto'
import { db } from '@/db'
import merchantRoutes from '@/routes/merchant'
import aggregatorRoutesV3 from '@/routes/aggregator/callback-v3'

const SUITE = `test-aggregators-${Date.now()}-${randomBytes(3).toString('hex')}`

let appMerchant: any
let appAggregator: any
let mockServer: any
let mockPort = 0
let mockBase = ''
let mockMode: 'accept' | 'reject' | 'error' = 'accept'

let merchantId = ''
let merchantToken = ''
let methodId = ''
let aggregatorId = ''
let aggregatorToken = ''

const merchantHeaders = () => ({ 'x-merchant-api-key': merchantToken, 'Content-Type': 'application/json' })

beforeAll(async () => {
  // Приложения
  appMerchant = new Elysia().use(merchantRoutes)
  appAggregator = new Elysia({ prefix: '/api/aggregators' }).use(aggregatorRoutesV3)

  // Мок-сервер агрегатора
  mockServer = Bun.serve({
    port: 0,
    fetch: async (req: Request) => {
      const url = new URL(req.url)
      // Проверка ключа
      const apiKey = req.headers.get('x-api-key') || req.headers.get('X-Api-Key')
      if (!apiKey || apiKey !== aggregatorToken) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
      }
      if (url.pathname.endsWith('/deals') && req.method === 'POST') {
        if (mockMode === 'error') {
          return new Response(JSON.stringify({ error: 'internal' }), { status: 500 })
        }
        const body = await req.json()
        if (mockMode === 'reject') {
          return new Response(JSON.stringify({ accepted: false, message: 'rejected-by-agg' }), { status: 200 })
        }
        // accept
        const partnerDealId = `agg-${Math.floor(Math.random() * 1e6)}`
        const requisites = body.paymentMethod === 'SBP'
          ? { bankName: 'AggBank', phoneNumber: '+79990000000' }
          : { bankName: 'AggBank', cardNumber: '411111******1111' }
        return new Response(JSON.stringify({ accepted: true, partnerDealId, requisites }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response('not found', { status: 404 })
    }
  })
  mockPort = mockServer.port
  mockBase = `http://127.0.0.1:${mockPort}`

  // Фикстуры: мерчант, метод, агрегатор
  const merchant = await db.merchant.create({ data: { name: `${SUITE}-merchant`, token: randomBytes(16).toString('hex'), disabled: false, banned: false } })
  merchantId = merchant.id
  merchantToken = merchant.token

  const method = await db.method.create({ data: { code: `${SUITE}-sbp`, name: `${SUITE}-SBP`, type: 'sbp' as any, commissionPayin: 0, commissionPayout: 0, maxPayin: 1_000_000, minPayin: 100, maxPayout: 1_000_000, minPayout: 100, chancePayin: 100, chancePayout: 100, isEnabled: true } })
  methodId = method.id
  await db.merchantMethod.create({ data: { merchantId, methodId, isEnabled: true } })

  aggregatorToken = randomBytes(24).toString('hex')
  const aggregator = await db.aggregator.create({
    data: {
      name: `${SUITE}-AGG-A`,
      password: 'hash',
      email: `${SUITE}-agg@example.com`,
      apiToken: aggregatorToken,
      callbackToken: randomBytes(16).toString('hex'),
      apiBaseUrl: `${mockBase}`,
      priority: 0,
      balanceUsdt: 10_000,
      minBalance: 0,
      maxDailyVolume: 0,
      currentDailyVolume: 0,
      maxSlaMs: 1500,
      isActive: true,
    }
  })
  aggregatorId = aggregator.id
})

beforeEach(async () => {
  mockMode = 'accept'
  await db.transactionAttempt.deleteMany({ where: { merchantId } })
  await db.transaction.deleteMany({ where: { merchantId } })
  await db.aggregatorIntegrationLog.deleteMany({ where: { aggregatorId } })
})

afterAll(async () => {
  if (mockServer) mockServer.stop(true)
  await db.transactionAttempt.deleteMany({ where: { merchantId } })
  await db.transaction.deleteMany({ where: { merchantId } })
  await db.merchantMethod.deleteMany({ where: { merchantId } })
  await db.method.deleteMany({ where: { id: methodId } })
  await db.aggregatorIntegrationLog.deleteMany({ where: { aggregatorId } })
  await db.aggregator.deleteMany({ where: { id: aggregatorId } })
  await db.merchant.deleteMany({ where: { id: merchantId } })
})

describe('Агрегаторы: фолбэк-роутинг, запросы и колбэки', () => {
  // Ожидаемо: трейдер не найден → фолбэк к агрегатору, /deals вернёт accepted=true и реквизиты
  it('Фолбэк к агрегатору: создаёт сделку через агрегатор и возвращает реквизиты', async () => {
    const orderId = `${SUITE}-agg-ok`
    const res = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST',
      headers: merchantHeaders(),
      body: JSON.stringify({ amount: 9000, orderId, methodId, rate: 100, expired_at: new Date(Date.now() + 60_000).toISOString(), clientIdentifier: 'cli-AGG-1' })
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBeTruthy()
    expect(body.aggregator).toContain(`${SUITE}-AGG-A`)
    expect(body.requisites).toBeTruthy()

    const tx = await db.transaction.findUnique({ where: { id: body.id } })
    expect(tx?.aggregatorId).toBe(aggregatorId)
    expect(tx?.externalId).toBeTruthy()

    // Проверяем лог интеграции
    const logs = await db.aggregatorIntegrationLog.findMany({ where: { aggregatorId, eventType: 'deal_create', direction: 'OUT' } })
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0].statusCode).toBe(200)
    expect(logs[0].ourDealId).toBe(tx?.id)
  })

  // Ожидаемо: агрегатор отвергает или 500 → фолбэк завершается 409 NO_REQUISITE, лог ошибки записан
  it('Фолбэк: все агрегаторы недоступны/отвергли — возвращает 409 и пишет ошибку', async () => {
    mockMode = 'reject'
    const res = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST', headers: merchantHeaders(), body: JSON.stringify({ amount: 7000, orderId: `${SUITE}-agg-rej`, methodId, rate: 100, expired_at: new Date(Date.now() + 60_000).toISOString(), clientIdentifier: 'cli-AGG-2' })
    }))
    expect(res.status).toBe(409)
    const logs = await db.aggregatorIntegrationLog.findMany({ where: { aggregatorId, eventType: 'deal_create' } })
    expect(logs.length).toBeGreaterThan(0)
    // хотя 200, accepted=false
    expect([200, 500]).toContain(logs[0].statusCode || 200)
  })

  // Ожидаемо: READY колбэк от агрегатора переводит сделку в READY и двигает балансы
  it('Колбэк READY: обновляет статус и корректно двигает балансы', async () => {
    // Создаём через агрегатор
    const res = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST', headers: merchantHeaders(), body: JSON.stringify({ amount: 8000, orderId: `${SUITE}-agg-ready`, methodId, rate: 100, expired_at: new Date(Date.now() + 60_000).toISOString() })
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    const txId = body.id as string

    // Балансы до
    const aggBefore = await db.aggregator.findUnique({ where: { id: aggregatorId } })
    const merchBefore = await db.merchant.findUnique({ where: { id: merchantId } })

    // Шлём колбэк READY
    const cb = await appAggregator.handle(new Request('http://localhost/api/aggregators/callback', {
      method: 'POST',
      headers: { 'x-aggregator-api-token': aggregatorToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ourDealId: txId, status: 'READY', partnerDealId: 'agg-xyz' })
    }))
    expect(cb.status).toBe(200)

    const tx = await db.transaction.findUnique({ where: { id: txId } })
    expect(tx?.status).toBe('READY')
    expect(tx?.acceptedAt).toBeTruthy()

    const aggAfter = await db.aggregator.findUnique({ where: { id: aggregatorId } })
    const merchAfter = await db.merchant.findUnique({ where: { id: merchantId } })
    // amount/rate = 80 USDT
    expect((merchAfter?.balanceUsdt || 0) - (merchBefore?.balanceUsdt || 0)).toBeCloseTo(80, 2)
    expect((aggBefore?.balanceUsdt || 0) - (aggAfter?.balanceUsdt || 0)).toBeCloseTo(80, 2)
  })

  // Ожидаемо: batch колбэк обрабатывает несколько обновлений
  it('Batch callback: обрабатывает массив событий и логирует', async () => {
    // Создадим одну транзакцию через агрегатор
    const res = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST', headers: merchantHeaders(), body: JSON.stringify({ amount: 6000, orderId: `${SUITE}-agg-batch`, methodId, rate: 100, expired_at: new Date(Date.now() + 60_000).toISOString() })
    }))
    expect(res.status).toBe(201)
    const body = await res.json()

    // Отправим batch из 2 событий: статус и изменение суммы
    const batch = await appAggregator.handle(new Request('http://localhost/api/aggregators/callback/batch', {
      method: 'POST',
      headers: { 'x-aggregator-api-token': aggregatorToken, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { ourDealId: body.id, status: 'IN_PROGRESS' },
        { ourDealId: body.id, amount: 6100 }
      ])
    }))
    expect(batch.status).toBe(200)
    const tx = await db.transaction.findUnique({ where: { id: body.id } })
    expect(tx?.amount).toBe(6100)
  })

  // Ожидаемо: агрегатор недоступен из-за лимитов → fallback даже не делает запросов
  it('Доступность агрегатора: minBalance/maxDailyVolume не позволяют — возвращает 409', async () => {
    // Обновим агрегатор: баланс очень мал и дневной лимит нулевой
    await db.aggregator.update({ where: { id: aggregatorId }, data: { balanceUsdt: 0.1, maxDailyVolume: 100, currentDailyVolume: 100 } })
    mockMode = 'accept'
    const res = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST', headers: merchantHeaders(), body: JSON.stringify({ amount: 9000, orderId: `${SUITE}-agg-limits`, methodId, rate: 100, expired_at: new Date(Date.now() + 60_000).toISOString() })
    }))
    expect(res.status).toBe(409)
    const logs = await db.aggregatorIntegrationLog.count({ where: { aggregatorId, eventType: 'deal_create' } })
    // Запросов к агрегатору не было
    expect(logs).toBe(0)
    // Вернём доступность обратно
    await db.aggregator.update({ where: { id: aggregatorId }, data: { balanceUsdt: 10_000, maxDailyVolume: 0, currentDailyVolume: 0 } })
  })
})


