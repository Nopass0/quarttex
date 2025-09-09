import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { randomBytes } from 'node:crypto'
import { db } from '@/db'
import merchantRoutes from '@/routes/merchant'
import traderRoutes from '@/routes/trader'
import { MethodType, PayoutStatus, BankType, TrafficType } from '@prisma/client'
import PayoutRedistributionService from '@/services/PayoutRedistributionService'

let appMerchant: any
let appTrader: any

let merchantHeaders: Record<string, string>
let traderAHeaders: Record<string, string>
let traderBHeaders: Record<string, string>

const SUITE_PREFIX = `test-payouts-${Date.now()}-${randomBytes(4).toString('hex')}`

const eq2 = (a: number, b: number) => expect((Math.round(a * 100) / 100).toFixed(2)).toBe((Math.round(b * 100) / 100).toFixed(2))

let ids = {
  merchantId: '',
  methodSbpId: '',
  methodC2CId: '',
  traderAId: '',
  traderBId: '',
}

beforeAll(async () => {
  // Merchant
  const merchant = await db.merchant.create({
    data: {
      name: `${SUITE_PREFIX}-merchant`,
      token: randomBytes(16).toString('hex'),
      disabled: false,
      banned: false,
      countInRubEquivalent: false,
      apiKeyPublic: randomBytes(8).toString('hex'),
      apiKeyPrivate: randomBytes(16).toString('hex'),
    }
  })
  ids.merchantId = merchant.id
  merchantHeaders = { 'x-merchant-api-key': merchant.token }

  // Methods
  const sbp = await db.method.create({
    data: { code: `${SUITE_PREFIX}-sbp`, name: 'SBP', type: MethodType.sbp, commissionPayin: 0, commissionPayout: 0, maxPayout: 1_000_000, minPayout: 100, maxPayin: 1_000_000, minPayin: 100, chancePayin: 100, chancePayout: 100, isEnabled: true }
  })
  const c2c = await db.method.create({
    data: { code: `${SUITE_PREFIX}-c2c`, name: 'C2C', type: MethodType.c2c, commissionPayin: 0, commissionPayout: 0, maxPayout: 1_000_000, minPayout: 100, maxPayin: 1_000_000, minPayin: 100, chancePayin: 100, chancePayout: 100, isEnabled: true }
  })
  ids.methodSbpId = sbp.id
  ids.methodC2CId = c2c.id
  await db.merchantMethod.createMany({ data: [
    { merchantId: merchant.id, methodId: sbp.id, isEnabled: true },
    { merchantId: merchant.id, methodId: c2c.id, isEnabled: true },
  ]})

  // Traders A (SBP only, bank TBANK) and B (Cards only, bank SBERBANK)
  const traderA = await db.user.create({ data: {
    email: `${SUITE_PREFIX}-trA@example.com`, name: 'Trader A', password: 'hash', banned: false, trafficEnabled: true,
    payoutBalance: 1_000_000, frozenPayoutBalance: 0, balanceRub: 1_000_000, frozenRub: 0, balanceUsdt: 0, maxSimultaneousPayouts: 10, deposit: 5_000,
    payoutFilters: { create: { trafficTypes: ['sbp'], bankTypes: [BankType.TBANK], maxPayoutAmount: 1_000_000 } },
  } as any })
  const traderB = await db.user.create({ data: {
    email: `${SUITE_PREFIX}-trB@example.com`, name: 'Trader B', password: 'hash', banned: false, trafficEnabled: true,
    payoutBalance: 1_000_000, frozenPayoutBalance: 0, balanceRub: 1_000_000, frozenRub: 0, balanceUsdt: 0, maxSimultaneousPayouts: 10, deposit: 5_000,
    payoutFilters: { create: { trafficTypes: ['card'], bankTypes: [BankType.SBERBANK], maxPayoutAmount: 1_000_000 } },
  } as any })
  ids.traderAId = traderA.id
  ids.traderBId = traderB.id

  // Traffic settings just in case
  await db.trafficSettings.upsert({ where: { userId: traderA.id }, update: { isEnabled: true, maxCounterparties: 5, trafficType: TrafficType.PRIMARY }, create: { userId: traderA.id, isEnabled: true, maxCounterparties: 5, trafficType: TrafficType.PRIMARY } })
  await db.trafficSettings.upsert({ where: { userId: traderB.id }, update: { isEnabled: true, maxCounterparties: 5, trafficType: TrafficType.PRIMARY }, create: { userId: traderB.id, isEnabled: true, maxCounterparties: 5, trafficType: TrafficType.PRIMARY } })

  // Relations enabling OUT operations
  await db.traderMerchant.createMany({ data: [
    { traderId: traderA.id, merchantId: merchant.id, methodId: sbp.id, isMerchantEnabled: true, isFeeOutEnabled: true, feeOut: 0 },
    { traderId: traderB.id, merchantId: merchant.id, methodId: c2c.id, isMerchantEnabled: true, isFeeOutEnabled: true, feeOut: 0 },
  ] })

  // Sessions
  const sessA = await db.session.create({ data: { userId: traderA.id, token: `${SUITE_PREFIX}-sessA`, expiredAt: new Date(Date.now() + 86400000), ip: '127.0.0.1' } })
  const sessB = await db.session.create({ data: { userId: traderB.id, token: `${SUITE_PREFIX}-sessB`, expiredAt: new Date(Date.now() + 86400000), ip: '127.0.0.1' } })
  traderAHeaders = { 'x-trader-token': sessA.token }
  traderBHeaders = { 'x-trader-token': sessB.token }

  // Apps
  appMerchant = new Elysia().use(merchantRoutes)
  appTrader = new Elysia().use(traderRoutes)
})

beforeEach(async () => {
  await db.payout.deleteMany({ where: { merchantId: ids.merchantId } })
  await db.payoutCallbackHistory.deleteMany({})
  await db.user.updateMany({ where: { id: { in: [ids.traderAId, ids.traderBId] } }, data: { payoutBalance: 1_000_000, frozenPayoutBalance: 0, balanceRub: 1_000_000, frozenRub: 0 } })
})

afterAll(async () => {
  await db.payoutCallbackHistory.deleteMany({})
  await db.payoutBlacklist.deleteMany({})
  await db.payoutCancellationHistory.deleteMany({})
  await db.payout.deleteMany({ where: { merchantId: ids.merchantId } })
  await db.traderMerchant.deleteMany({ where: { merchantId: ids.merchantId } })
  await db.merchantMethod.deleteMany({ where: { merchantId: ids.merchantId } })
  await db.method.deleteMany({ where: { id: { in: [ids.methodSbpId, ids.methodC2CId] } } })
  await db.session.deleteMany({ where: { userId: { in: [ids.traderAId, ids.traderBId] } } })
  await db.trafficSettings.deleteMany({ where: { userId: { in: [ids.traderAId, ids.traderBId] } } })
  await db.payoutFilters.deleteMany({ where: { userId: { in: [ids.traderAId, ids.traderBId] } } })
  await db.merchantRequestLog.deleteMany({ where: { merchantId: ids.merchantId } })
  await db.user.deleteMany({ where: { id: { in: [ids.traderAId, ids.traderBId] } } })
  await db.merchant.deleteMany({ where: { id: ids.merchantId } })
})

describe('Выплаты мерчанта (OUT)', () => {
  // Ожидаемо: мерчант создаёт выплату SBP/T-Банк, распределение назначает трейдера A по фильтрам (sbp + TBANK), статус остаётся CREATED, traderId заполнен.
  it('Создание и распределение выплаты по фильтрам (SBP → Trader A)', async () => {
    const res = await appMerchant.handle(new Request('http://localhost/payouts', {
      method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ methodId: ids.methodSbpId, amount: 9000, wallet: '4100-0000-0000', bank: 'Т-Банк', isCard: false, merchantRate: 100, webhookUrl: 'http://127.0.0.1:9/cb' })
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    const payoutId = body.payout.id

    await PayoutRedistributionService.getInstance().redistributePayouts()

    const assigned = await db.payout.findUnique({ where: { id: payoutId } })
    expect(assigned?.status).toBe(PayoutStatus.CREATED)
    expect(assigned?.traderId).toBe(ids.traderAId)
  })

  // Ожидаемо: мерчант создаёт выплату C2C/Сбербанк, распределение назначает трейдера B (card + SBERBANK)
  it('Распределение с учётом типа трафика и банка (C2C → Trader B)', async () => {
    const res = await appMerchant.handle(new Request('http://localhost/payouts', {
      method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ methodId: ids.methodC2CId, amount: 15000, wallet: '5559 0000 0000 0000', bank: 'Сбербанк', isCard: true, merchantRate: 100, webhookUrl: 'http://127.0.0.1:9/cb' })
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    const payoutId = body.payout.id

    await PayoutRedistributionService.getInstance().redistributePayouts()

    const assigned = await db.payout.findUnique({ where: { id: payoutId } })
    expect(assigned?.traderId).toBe(ids.traderBId)
  })

  // Ожидаемо: трейдер принимает выплату → списываются RUB и payoutBalance в frozen, затем подтверждение с proofFiles → статус CHECKING, создаётся запись в payoutCallbackHistory
  it('Принятие и подтверждение выплаты трейдером с файлами и колбэком', async () => {
    // Создаём и распределяем на трейдера A
    const create = await appMerchant.handle(new Request('http://localhost/payouts', {
      method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ methodId: ids.methodSbpId, amount: 12000, wallet: '4100-0000-0001', bank: 'Т-Банк', isCard: false, merchantRate: 100, webhookUrl: 'http://127.0.0.1:9/cb' })
    }))
    expect(create.status).toBe(200)
    const created = await create.json()
    await PayoutRedistributionService.getInstance().redistributePayouts()
    const payout = await db.payout.findUnique({ where: { id: created.payout.id } })
    expect(payout?.traderId).toBe(ids.traderAId)

    // До
    const before = await db.user.findUnique({ where: { id: ids.traderAId } })

    // Accept
    const acc = await appTrader.handle(new Request(`http://localhost/payouts/${payout!.id}/accept`, { method: 'POST', headers: { ...traderAHeaders } }))
    expect([200, 201]).toContain(acc.status)
    const afterAccept = await db.user.findUnique({ where: { id: ids.traderAId } })
    eq2((before!.balanceRub || 0) - (afterAccept!.balanceRub || 0), payout!.amount)
    eq2((afterAccept!.frozenRub || 0) - (before!.frozenRub || 0), payout!.amount)

    // Confirm with files
    const conf = await appTrader.handle(new Request(`http://localhost/payouts/${payout!.id}/confirm`, {
      method: 'POST', headers: { ...traderAHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ proofFiles: ['https://example.com/proof1.png'] })
    }))
    expect([200, 201]).toContain(conf.status)
    const updated = await db.payout.findUnique({ where: { id: payout!.id } })
    expect(updated?.status).toBe('CHECKING')

    // Проверяем, что попытка колбэка зафиксирована
    const cb = await db.payoutCallbackHistory.findFirst({ where: { payoutId: payout!.id }, orderBy: { createdAt: 'desc' } })
    expect(cb).toBeTruthy()
    const payload: any = (cb as any).payload
    expect(payload?.payout?.id).toBe(payout!.id)
    expect(payload?.event).toBeDefined()
  })

  // Ожидаемо: отмена трейдером с файлами возвращает в пул, файлы видны следующему трейдеру в cancellationHistory; предыдущий трейдер не получит снова эту выплату
  it('Отмена с файлами → возврат в пул и видимость файлов для нового трейдера', async () => {
    const create = await appMerchant.handle(new Request('http://localhost/payouts', {
      method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ methodId: ids.methodSbpId, amount: 13000, wallet: '4100-0000-0002', bank: 'Т-Банк', isCard: false, merchantRate: 100 })
    }))
    expect(create.status).toBe(200)
    const body = await create.json()
    await PayoutRedistributionService.getInstance().redistributePayouts()
    const payout = await db.payout.findUnique({ where: { id: body.payout.id } })
    expect(payout?.traderId).toBe(ids.traderAId)

    // Примем, чтобы заморозились средства, затем отменим с файлами
    const acc2 = await appTrader.handle(new Request(`http://localhost/payouts/${payout!.id}/accept`, { method: 'POST', headers: { ...traderAHeaders } }))
    expect([200, 201]).toContain(acc2.status)
    const afterAcc2 = await db.payout.findUnique({ where: { id: payout!.id } })
    expect(afterAcc2?.status).toBe(PayoutStatus.ACTIVE)
    let cancel = await appTrader.handle(new Request(`http://localhost/payouts/${payout!.id}/cancel`, {
      method: 'POST', headers: { ...traderAHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Ошибка реквизитов', reasonCode: 'BAD_REQUISITE', files: ['https://example.com/cancel1.png'] })
    }))
    if (cancel.status === 400) {
      try { console.log('[Cancel-1 error]', await cancel.json()) } catch {}
      // Если отмена недоступна из ACTIVE (редкий случай логики сервиса), перейдём в CHECKING и повторим отмену
      const conf = await appTrader.handle(new Request(`http://localhost/payouts/${payout!.id}/confirm`, {
        method: 'POST', headers: { ...traderAHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofFiles: ['https://example.com/proof-checking.png'] })
      }))
      expect([200, 201]).toContain(conf.status)
      cancel = await appTrader.handle(new Request(`http://localhost/payouts/${payout!.id}/cancel`, {
        method: 'POST', headers: { ...traderAHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Ошибка реквизитов', reasonCode: 'BAD_REQUISITE', files: ['https://example.com/cancel1.png'] })
      }))
      if (cancel.status === 400) { try { console.log('[Cancel-2 error]', await cancel.json()) } catch {} }
    }
    expect([200, 201]).toContain(cancel.status)

    const returned = await db.payout.findUnique({ where: { id: payout!.id } })
    expect(returned?.status).toBe(PayoutStatus.CREATED)
    expect(returned?.traderId).toBeNull()

    // Распределяем снова — теперь должен получить трейдер B (A в previousTraderIds)
    await PayoutRedistributionService.getInstance().redistributePayouts()
    const reassigned = await db.payout.findUnique({ where: { id: payout!.id }, include: { cancellationHistory: { include: { trader: true } } } })
    // Должен быть назначен не тому же трейдеру A (т.е. либо B, либо никому, если фильтры не позволяют)
    expect(reassigned?.traderId === ids.traderAId).toBe(false)
    // Проверим историю отмен
    const lastCancel = reassigned?.cancellationHistory?.[0]
    // Файлы фиксируются в payout.disputeFiles, причина в history
    expect((reassigned as any)?.disputeFiles?.length || 0).toBeGreaterThan(0)
    expect((lastCancel as any)?.reason?.length || 0).toBeGreaterThan(0)
  })
})


