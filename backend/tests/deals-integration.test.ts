import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { randomBytes } from 'node:crypto'
import { db } from '@/db'
import merchantRoutes from '@/routes/merchant'
import adminRoutes from '@/routes/admin'
import traderRoutes from '@/routes/trader'
import { MethodType, Status, TrafficType } from '@prisma/client'
import { roundDown2, truncate2 } from '@/utils/rounding'

// Округление вверх до 2 знаков для пользовательских списаний/возвратов заморозки
const ceilUp2 = (v: number) => Math.ceil(v * 100) / 100
// Строгое сравнение значений с точностью до 2 знаков (устранение двоичной погрешности)
const toFixed2 = (v: number) => (Math.round(v * 100) / 100).toFixed(2)
const eq2 = (a: number, b: number) => expect(toFixed2(a)).toBe(toFixed2(b))

let appMerchant: any
let appAdmin: any
let appTrader: any

let merchantHeaders: Record<string, string>
let adminHeaders: Record<string, string>
let traderHeaders: Record<string, string>

let entities: {
  merchantId: string
  merchantToken: string
  methodId: string
  traderId: string
  traderSessionToken: string
  requisiteId: string
  deviceId?: string
  deviceRequisiteId?: string
} = {
  merchantId: '',
  merchantToken: '',
  methodId: '',
  traderId: '',
  traderSessionToken: '',
  requisiteId: ''
}

// Вспомогательное создание уникального префикса для избирательной очистки данных
const SUITE_PREFIX = `test-deals-${Date.now()}-${randomBytes(4).toString('hex')}`

beforeAll(async () => {
  // Создаем мерчанта
  const merchant = await db.merchant.create({
    data: {
      name: `${SUITE_PREFIX}-merchant`,
      token: randomBytes(16).toString('hex'),
      disabled: false,
      banned: false,
      countInRubEquivalent: false
    }
  })
  entities.merchantId = merchant.id
  entities.merchantToken = merchant.token
  merchantHeaders = { 'x-merchant-api-key': merchant.token }

  // Создаем метод и привязку к мерчанту
  const method = await db.method.create({
    data: {
      code: `${SUITE_PREFIX}-c2c`,
      name: `${SUITE_PREFIX}-C2C`,
      type: MethodType.sbp,
      commissionPayin: 0,
      commissionPayout: 0,
      maxPayin: 1_000_000,
      minPayin: 100,
      maxPayout: 1_000_000,
      minPayout: 100,
      chancePayin: 100,
      chancePayout: 100,
      isEnabled: true
    }
  })
  entities.methodId = method.id

  await db.merchantMethod.create({
    data: { merchantId: merchant.id, methodId: method.id, isEnabled: true }
  })

  // Создаем трейдера, связь и реквизит
  const trader = await db.user.create({
    data: {
      email: `${SUITE_PREFIX}-trader@example.com`,
      name: `${SUITE_PREFIX}-trader`,
      password: 'hash',
      trafficEnabled: true,
      banned: false,
      trustBalance: 10_000, // достаточно для заморозок
      deposit: 5_000, // важно: для подбора реквизита требуется deposit >= 1000
      balanceUsdt: 0,
      balanceRub: 0
    }
  })
  entities.traderId = trader.id

  await db.traderMerchant.create({
    data: {
      traderId: trader.id,
      merchantId: merchant.id,
      methodId: method.id,
      isMerchantEnabled: true,
      isFeeInEnabled: true,
      useFlexibleRates: false,
      feeIn: 0,
      feeOut: 0
    }
  })

  // Разрешаем любой трафик для простоты (или оставляем выключенным — canTraderTakeTransaction вернет true)
  await db.trafficSettings.upsert({
    where: { userId: trader.id },
    update: { isEnabled: true, maxCounterparties: 5, trafficType: TrafficType.PRIMARY },
    create: { userId: trader.id, isEnabled: true, maxCounterparties: 5, trafficType: TrafficType.PRIMARY }
  })

  const requisite = await db.bankDetail.create({
    data: {
      userId: trader.id,
      methodType: method.type,
      bankType: 'TBANK',
      cardNumber: '79001234567',
      recipientName: `${SUITE_PREFIX}-recipient`,
      minAmount: 100,
      maxAmount: 50_000,
      intervalMinutes: 0,
      isActive: true,
      isArchived: false,
      operationLimit: 10,   // для сценариев лимитов количества
      sumLimit: 200_000     // для сценариев лимита суммы
    }
  })
  entities.requisiteId = requisite.id

  // Создадим рабочее устройство и реквизит с устройством для сравнения расчётов
  const device = await db.device.create({
    data: {
      name: `${SUITE_PREFIX}-Device`,
      userId: trader.id,
      isWorking: true,
      isOnline: true,
      emulated: true
    } as any
  })
  entities.deviceId = device.id

  const devReq = await db.bankDetail.create({
    data: {
      userId: trader.id,
      deviceId: device.id,
      methodType: method.type,
      bankType: 'TBANK',
      cardNumber: '79001230000',
      recipientName: `${SUITE_PREFIX}-recipient-device`,
      minAmount: 7000,
      maxAmount: 100_000,
      intervalMinutes: 0,
      isActive: true,
      isArchived: false,
      operationLimit: 50,
      sumLimit: 1_000_000
    }
  })
  entities.deviceRequisiteId = devReq.id

  // Сессия трейдера для эндпоинтов трейдера
  const session = await db.session.create({
    data: {
      userId: trader.id,
      token: `${SUITE_PREFIX}-session-${randomBytes(8).toString('hex')}`,
      expiredAt: new Date(Date.now() + 24*60*60*1000),
      ip: '127.0.0.1'
    }
  })
  entities.traderSessionToken = session.token
  traderHeaders = { 'x-trader-token': session.token }

  // Создаем мок-админа
  const admin = await db.admin.create({ data: { token: randomBytes(16).toString('hex') } })
  adminHeaders = { 'x-admin-key': admin.token }

  // Приложения
  appMerchant = new Elysia().use(merchantRoutes)
  appAdmin = new Elysia().use(adminRoutes)
  appTrader = new Elysia().use(traderRoutes)
})

afterAll(async () => {
  // Удаляем созданные в сьюте сущности
  await db.transactionAttempt.deleteMany({ where: { merchantId: entities.merchantId } })
  await db.transaction.deleteMany({ where: { merchantId: entities.merchantId } })
  await db.bankDetail.deleteMany({ where: { userId: entities.traderId } })
  await db.notification.deleteMany({})
  if (entities.deviceId) await db.device.deleteMany({ where: { id: entities.deviceId } })
  await db.traderMerchant.deleteMany({ where: { traderId: entities.traderId, merchantId: entities.merchantId } })
  await db.trafficSettings.deleteMany({ where: { userId: entities.traderId } })
  await db.merchantMethod.deleteMany({ where: { merchantId: entities.merchantId, methodId: entities.methodId } })
  await db.session.deleteMany({ where: { userId: entities.traderId } })
  await db.method.deleteMany({ where: { id: entities.methodId } })
  await db.user.deleteMany({ where: { id: entities.traderId } })
  await db.admin.deleteMany({})
  await db.merchant.deleteMany({ where: { id: entities.merchantId } })
})

// Полная изоляция между тестами: чистим «летучие» сущности и возвращаем базовые балансы/комиссии
beforeEach(async () => {
  if (!entities.merchantId || !entities.traderId) return
  await db.transactionAttempt.deleteMany({ where: { merchantId: entities.merchantId } })
  await db.transaction.deleteMany({ where: { merchantId: entities.merchantId } })
  await db.notification.deleteMany({})
  await db.user.update({ where: { id: entities.traderId }, data: { frozenUsdt: 0, trustBalance: 10_000 } })
  await db.traderMerchant.updateMany({
    where: { traderId: entities.traderId, merchantId: entities.merchantId, methodId: entities.methodId },
    data: { feeIn: 0, useFlexibleRates: false }
  })
})

afterEach(async () => {
  if (!entities.merchantId || !entities.traderId) return
  await db.transactionAttempt.deleteMany({ where: { merchantId: entities.merchantId } })
  await db.transaction.deleteMany({ where: { merchantId: entities.merchantId } })
  await db.notification.deleteMany({})
  await db.user.update({ where: { id: entities.traderId }, data: { frozenUsdt: 0, trustBalance: 10_000 } })
  await db.traderMerchant.updateMany({
    where: { traderId: entities.traderId, merchantId: entities.merchantId, methodId: entities.methodId },
    data: { feeIn: 0, useFlexibleRates: false }
  })
})

describe('Создание сделок (IN) мерчантом', () => {
  // Ожидаемо: создаётся сделка на 10_000₽, выбирается реквизит, 
  // заморозка = floor(10000 / rate, 2) списывается с trustBalance и попадает в frozenUsdt,
  // ответ 201 с полями id, status IN_PROGRESS, requisites, method, expired_at.
  it('Создаёт сделку в пределах лимитов, корректно замораживает средства и возвращает данные', async () => {
    const orderId = `${SUITE_PREFIX}-ok-` + randomBytes(4).toString('hex')
    const amount = 10_000
    const nowPlus = new Date(Date.now() + 60_000).toISOString()

    // Берём актуальный rate для ожиданий из логики trader-rate (как в коде эндпоинта)
    const { getTraderRate } = await import('@/utils/trader-rate')
    const { rate: expectedRate } = await getTraderRate(entities.traderId)

    const res = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST',
      headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        orderId,
        methodId: entities.methodId,
        rate: expectedRate, // мерчант передаёт курс (countInRubEquivalent=false)
        expired_at: nowPlus,
        clientIdentifier: 'client-1'
      })
    }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body.status).toBe(Status.IN_PROGRESS)
    expect(body.requisites).toBeTruthy()
    expect(body.method).toBeTruthy()

    const created = await db.transaction.findUnique({ where: { id: body.id } })
    expect(created).toBeTruthy()
    expect(created!.status).toBe(Status.IN_PROGRESS)
    expect(created!.bankDetailId).toBe(entities.requisiteId)
    // Проверяем расчёт заморозки и списание траста
    const trader = await db.user.findUnique({ where: { id: entities.traderId } })
    const expectedFrozenTx = roundDown2(amount / expectedRate) // в сделке округление вниз до 2 знаков
    expect(created!.frozenUsdtAmount).toBeCloseTo(expectedFrozenTx, 2)
    // у пользователя списание с траста на округление вверх (ceil) от суммы заморозки
    const ceilUp2 = (v: number) => Math.ceil(v * 100) / 100
    const expectedFrozenUser = ceilUp2(expectedFrozenTx)
    expect(trader!.frozenUsdt).toBeCloseTo(expectedFrozenUser, 2)
    expect(trader!.trustBalance).toBeCloseTo(10000 - expectedFrozenUser, 2)
  })

  // Ожидаемо: не создаёт сделку вне лимитов суммы реквизита, возвращает 409 NO_REQUISITE.
  it('Отклоняет сделку вне лимитов суммы реквизита', async () => {
    const orderId = `${SUITE_PREFIX}-out-of-range-` + randomBytes(4).toString('hex')
    const amount = 1 // меньше minAmount 100

    const res = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST',
      headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount,
        orderId,
        methodId: entities.methodId,
        rate: 100,
        expired_at: new Date(Date.now() + 60_000).toISOString(),
        clientIdentifier: 'client-2'
      })
    }))

    expect([404, 409]).toContain(res.status)
    if (res.status !== 201) {
      const body = await res.json()
      expect(body.error).toBeDefined()
    }
  })

  // Ожидаемо: дубликат по orderId — 409 конфликт.
  it('Отклоняет дублирование по orderId', async () => {
    const orderId = `${SUITE_PREFIX}-dup-` + randomBytes(4).toString('hex')

    const create = async () => appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST',
      headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 5000,
        orderId,
        methodId: entities.methodId,
        rate: 100,
        expired_at: new Date(Date.now() + 60_000).toISOString(),
        clientIdentifier: 'client-3'
      })
    }))

    const r1 = await create()
    expect(r1.status).toBe(201)
    const r2 = await create()
    expect(r2.status).toBe(409)
  })

  // Ожидаемо: при достижении operationLimit=10 для реквизита — активных сделок в БД не больше 10, остальные запросы получают 409.
  it('Соблюдает лимит по количеству операций (operationLimit)', async () => {
    let createdCount = 0
    let rejectedCount = 0
    // Делаем запросы последовательно для детерминизма
    for (let i = 0; i < 30; i++) {
      const res = await appMerchant.handle(new Request('http://localhost/transactions/in', {
        method: 'POST',
        headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 1000,
          orderId: `${SUITE_PREFIX}-oplimit-${i}`,
          methodId: entities.methodId,
          rate: 100,
          expired_at: new Date(Date.now() + 60_000).toISOString(),
          clientIdentifier: `client-op-${i}`
        })
      }))
      if (res.status === 201) createdCount++
      else if (res.status === 409) rejectedCount++
    }

    // В БД не должно быть больше 10 активных операций по этому реквизиту
    const activeCount = await db.transaction.count({
      where: { bankDetailId: entities.requisiteId, status: { in: [Status.IN_PROGRESS, Status.READY] } }
    })
    expect(activeCount).toBeLessThanOrEqual(10)
    expect(rejectedCount).toBeGreaterThan(0)

    // Перенесено в afterEach: очистка транзакций и сброс балансов для изоляции тестов
  })

  // Ожидаемо: истечение сделки — статус EXPIRED через админ-эндпоинт,
  // frozenUsdt уменьшается, trustBalance увеличивается на ту же сумму.
  it('Размораживает средства при истечении сделки (через админ-эндпоинт)', async () => {
    const orderId = `${SUITE_PREFIX}-expire-` + randomBytes(4).toString('hex')
    const createRes = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST',
      headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 8000,
        orderId,
        methodId: entities.methodId,
        rate: 100,
        expired_at: new Date(Date.now() + 5000).toISOString(), // 5 секунд жизни
        clientIdentifier: 'client-expire'
      })
    }))
    expect(createRes.status).toBe(201)
    const created = await createRes.json()

    const before = await db.user.findUnique({ where: { id: entities.traderId } })

    // Имитируем истечение через админ-эндпоинт статусов (как в системе)
    const expireRes = await appAdmin.handle(new Request(`http://localhost/transactions/${created.id}/status`, {
      method: 'PATCH',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'EXPIRED' })
    }))
    expect([200, 204, 422]).toContain(expireRes.status)

    const after = await db.user.findUnique({ where: { id: entities.traderId } })
    const tx = await db.transaction.findUnique({ where: { id: created.id } })
    // Проверяем точные дельты по правилам округления: заморозка в транзакции = floor2, у пользователя = ceil2
    const expectedTxFrozen = roundDown2((tx!.amount || 0) / (tx!.rate || 1))
    const expectedUserDelta = ceilUp2(expectedTxFrozen)
    const trustDelta = (after!.trustBalance || 0) - (before!.trustBalance || 0)
    const frozenDelta = (before!.frozenUsdt || 0) - (after!.frozenUsdt || 0)
    expect(trustDelta).toBeCloseTo(expectedUserDelta, 2)
    expect(frozenDelta).toBeCloseTo(expectedUserDelta, 2)
  })

  // Ожидаемо: подтверждение READY от трейдера и от админа даёт одинаковые расчёты списаний/начислений.
  it('Подтверждение READY трейдером и админом сходится по расчётам', async () => {
    // Создаем новую сделку
    const orderId = `${SUITE_PREFIX}-ready-` + randomBytes(4).toString('hex')
    const createRes = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST',
      headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 6000,
        orderId,
        methodId: entities.methodId,
        rate: 100,
        expired_at: new Date(Date.now() + 60_000).toISOString(),
        clientIdentifier: 'client-ready'
      })
    }))
    expect(createRes.status).toBe(201)
    const { id } = await createRes.json()

    // Вариант 1: трейдер подтверждает READY
    const traderReadyRes = await appTrader.handle(new Request(`http://localhost/transactions/${id}/status`, {
      method: 'PATCH',
      headers: { ...traderHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READY' })
    }))
    expect([200, 204]).toContain(traderReadyRes.status)
    const txAfterTrader = await db.transaction.findUnique({ where: { id } })

    // Откатываем статус для сравнения (через админа вернём в IN_PROGRESS, затем снова READY)
    await db.transaction.update({ where: { id }, data: { status: Status.IN_PROGRESS } })

    // Вариант 2: админ подтверждает READY
    const adminReadyRes = await appAdmin.handle(new Request(`http://localhost/transactions/${id}/status`, {
      method: 'PATCH',
      headers: { ...adminHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'READY' })
    }))
    expect([200, 204, 422]).toContain(adminReadyRes.status)
    const txAfterAdmin = await db.transaction.findUnique({ where: { id } })

    // Ожидаем совпадения ключевых финансовых полей
    expect(txAfterTrader?.traderProfit ?? 0).toBeCloseTo(txAfterAdmin?.traderProfit ?? 0, 2)
  })

  // Ожидаемо: точные проверки округлений при заморозке/разморозке/прибылей
  // - A: сделка истекает → разморозка = floor(amount/rate, 2), возврат в trustBalance
  // - B: сделка подтверждается (READY) → прибыль = truncate2(spentUSDT * feeIn%), прибыль обрезана до 2 знаков
  // - C: сделка сначала истекает, затем подтверждается трейдером из EXPIRED → списание из trustBalance на величину заморозки
  it('Корректно считает заморозку/разморозку и прибыль с округлениями', async () => {
    // Установим комиссию входа для расчёта прибыли в B/C
    await db.traderMerchant.updateMany({
      where: { traderId: entities.traderId, merchantId: entities.merchantId, methodId: entities.methodId },
      data: { feeIn: 2, useFlexibleRates: false }
    })

    // A) Создаём сделку, затем истекаем
    const amountA = 7000
    const orderA = `${SUITE_PREFIX}-round-A`
    const { rate: rateA } = await (await import('@/utils/trader-rate')).getTraderRate(entities.traderId)
    const resA = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST',
      headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountA, orderId: orderA, methodId: entities.methodId, rate: rateA, expired_at: new Date(Date.now() + 5000).toISOString(), clientIdentifier: 'cli-A' })
    }))
    expect(resA.status).toBe(201)
    const bodyA = await resA.json()
    const txA = await db.transaction.findUnique({ where: { id: bodyA.id } })
    const expectedFrozenA = roundDown2(amountA / rateA)
    expect(txA!.frozenUsdtAmount).toBeCloseTo(expectedFrozenA, 2)
    // Снимем состояние пользователя после заморозки (перед EXPIRED)
    const midA = await db.user.findUnique({ where: { id: entities.traderId } })
    const expA = await appAdmin.handle(new Request(`http://localhost/transactions/${txA!.id}/status`, {
      method: 'PATCH', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'EXPIRED' })
    }))
    expect([200, 204, 422]).toContain(expA.status)
    const afterA = await db.user.findUnique({ where: { id: entities.traderId } })
    // После истечения: дельты по пользователю должны совпасть с truncate2(frozenUsdtAmount)
    const userDeltaTrustA = (afterA!.trustBalance || 0) - (midA!.trustBalance || 0)
    const userDeltaFrozenA = (midA!.frozenUsdt || 0) - (afterA!.frozenUsdt || 0)
    const expectedUserFrozenA = txA!.frozenUsdtAmount || 0
    eq2(userDeltaTrustA, truncate2(expectedUserFrozenA))
    eq2(userDeltaFrozenA, truncate2(expectedUserFrozenA))

    // B) Создаём и подтверждаем, проверяем прибыль (feeIn=2%) и округление
    const amountB = 6500
    const orderB = `${SUITE_PREFIX}-round-B`
    const { rate: rateB } = await (await import('@/utils/trader-rate')).getTraderRate(entities.traderId)
    const resB = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountB, orderId: orderB, methodId: entities.methodId, rate: rateB, expired_at: new Date(Date.now() + 60_000).toISOString(), clientIdentifier: 'cli-B' })
    }))
    expect(resB.status).toBe(201)
    const bodyB = await resB.json()
    const spentUsdtB = amountB / rateB
    const expectedProfitB = truncate2(spentUsdtB * (2 / 100))
    const readyB = await appTrader.handle(new Request(`http://localhost/transactions/${bodyB.id}/status`, {
      method: 'PATCH', headers: { ...traderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'READY' })
    }))
    expect([200, 204, 422]).toContain(readyB.status)
    const txB = await db.transaction.findUnique({ where: { id: bodyB.id } })
    expect(txB!.traderProfit || 0).toBeCloseTo(expectedProfitB, 2)

    // C) Истекает, затем подтверждается трейдером из EXPIRED
    const amountC = 6200
    const orderC = `${SUITE_PREFIX}-round-C`
    const { rate: rateC } = await (await import('@/utils/trader-rate')).getTraderRate(entities.traderId)
    const beforeC = await db.user.findUnique({ where: { id: entities.traderId } })
    const resC = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amountC, orderId: orderC, methodId: entities.methodId, rate: rateC, expired_at: new Date(Date.now() + 5000).toISOString(), clientIdentifier: 'cli-C' })
    }))
    expect(resC.status).toBe(201)
    const bodyC = await resC.json()
    // EXPIRE
    const exC = await appAdmin.handle(new Request(`http://localhost/transactions/${bodyC.id}/status`, {
      method: 'PATCH', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'EXPIRED' })
    }))
    expect([200, 204, 422]).toContain(exC.status)
    const midC = await db.user.findUnique({ where: { id: entities.traderId } })
    // После EXPIRED trustBalance должен вернуться к значению до заморозки (truncate2)
    eq2(truncate2(midC!.trustBalance || 0), truncate2(beforeC!.trustBalance || 0))
    // READY by trader → должно списать с trustBalance величину заморозки (возвращённую ранее)
    const readyC = await appTrader.handle(new Request(`http://localhost/transactions/${bodyC.id}/status`, {
      method: 'PATCH', headers: { ...traderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'READY' })
    }))
    expect([200, 204, 422]).toContain(readyC.status)
    const afterC = await db.user.findUnique({ where: { id: entities.traderId } })
    const txC = await db.transaction.findUnique({ where: { id: bodyC.id } })
    const expectedUserFrozenC = txC!.frozenUsdtAmount || 0
    // trustBalance после READY из EXPIRED должен уменьшиться на truncate2 величину заморозки
    eq2(truncate2(afterC!.trustBalance || 0), truncate2((midC!.trustBalance || 0) - truncate2(expectedUserFrozenC)))
  })

  // Ожидаемо: одинаковые расчёты при подтверждении одним и тем же сценарием через:
  // 1) BT-вход (PATCH /bt-entrance/deals/:id/status)
  // 2) Трейдерский эндпоинт (/trader/transactions/:id/status)
  // 3) Сервис сопоставления уведомлений (создаём notification → сервис завершит сделку)
  it('Согласованность расчётов: BT-вход vs трейдер vs авто-подтверждение уведомлением', async () => {
    // Гарантируем комиссию на вход, чтобы был ненулевой profit
    await db.traderMerchant.updateMany({
      where: { traderId: entities.traderId, merchantId: entities.merchantId, methodId: entities.methodId },
      data: { feeIn: 2, useFlexibleRates: false }
    })

    // Создадим сделку с устройством (чтобы работал NotificationMatcherService) и обычную BT-сделку
    const { rate } = await (await import('@/utils/trader-rate')).getTraderRate(entities.traderId)

    // A) Сделка с устройством (для автоподтверждения уведомлением)
    const orderDev = `${SUITE_PREFIX}-match-dev`
    const txDevRes = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 9000, orderId: orderDev, methodId: entities.methodId, rate, expired_at: new Date(Date.now() + 60_000).toISOString(), clientIdentifier: 'cli-MATCH' })
    }))
    expect(txDevRes.status).toBe(201)
    const txDevBody = await txDevRes.json()
    const txDev = await db.transaction.findUnique({ where: { id: txDevBody.id } })
    expect(txDev!.bankDetailId).toBeTruthy()

    // Подменим реквизит у транзакции на девайсный, чтобы сопоставление было возможно
    await db.transaction.update({ where: { id: txDev!.id }, data: { bankDetailId: entities.deviceRequisiteId! } })

    // Создаём уведомление на то же устройство
    const notif = await db.notification.create({
      data: {
        type: 'AppNotification',
        title: 'Поступление',
        message: 'Зачисление 9000.00 RUB',
        isProcessed: false,
        deviceId: entities.deviceId!
      } as any
    })

    // Импортируем и запускаем один тик матчера
    const { NotificationMatcherService } = await import('@/services/NotificationMatcherService')
    const matcher = new NotificationMatcherService()
    await matcher.tick()

    const txDevAfter = await db.transaction.findUnique({ where: { id: txDev!.id } })
    expect(txDevAfter!.status).toBe(Status.READY)

    // B) Та же сумма через BT-вход
    const orderBt = `${SUITE_PREFIX}-match-bt`
    const txBtRes = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 9000, orderId: orderBt, methodId: entities.methodId, rate, expired_at: new Date(Date.now() + 60_000).toISOString(), clientIdentifier: 'cli-BT', callbackUri: 'http://127.0.0.1:9/callback' })
    }))
    expect(txBtRes.status).toBe(201)
    const txBtBody = await txBtRes.json()

    // Превращаем в BT-сделку (удаляем device привязку)
    await db.transaction.update({ where: { id: txBtBody.id }, data: { bankDetailId: entities.requisiteId } })

    // Подтверждаем через BT-вход
    const btReadyRes = await appTrader.handle(new Request(`http://localhost/bt-entrance/deals/${txBtBody.id}/status`, {
      method: 'PATCH', headers: { ...traderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'READY' })
    }))
    expect([200, 204, 422]).toContain(btReadyRes.status)
    const txBtAfter = await db.transaction.findUnique({ where: { id: txBtBody.id } })

    // Проверяем, что колбэк зафиксирован в истории с корректным payload
    // Ожидаемо: payload: { id: orderId, amount, status }
    const cb = await db.callbackHistory.findFirst({ where: { transactionId: txBtBody.id }, orderBy: { createdAt: 'desc' } })
    expect(cb).toBeTruthy()
    const cbPayload: any = (cb as any).payload as any
    expect((cbPayload || {}).id).toBeDefined()
    expect((cbPayload || {}).amount).toBeDefined()
    expect((cbPayload || {}).status).toBeDefined()

    // C) Та же сумма через обычный трейдерский эндпоинт
    const orderTr = `${SUITE_PREFIX}-match-tr`
    const txTrRes = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      // Используем уже встречавшийся clientIdentifier, чтобы пройти лимит контрагентов
      body: JSON.stringify({ amount: 9000, orderId: orderTr, methodId: entities.methodId, rate, expired_at: new Date(Date.now() + 60_000).toISOString(), clientIdentifier: 'cli-BT', callbackUri: 'http://127.0.0.1:9/callback' })
    }))
    expect(txTrRes.status).toBe(201)
    const txTrBody = await txTrRes.json()
    const trReadyRes = await appTrader.handle(new Request(`http://localhost/transactions/${txTrBody.id}/status`, {
      method: 'PATCH', headers: { ...traderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'READY' })
    }))
    expect([200, 204, 422]).toContain(trReadyRes.status)
    const txTrAfter = await db.transaction.findUnique({ where: { id: txTrBody.id } })

    // Сравнение расчётов profit и изменений frozen/trust: должны совпадать по формулам
    const profitDev = txDevAfter!.traderProfit || 0
    const profitBt = txBtAfter!.traderProfit || 0
    const profitTr = txTrAfter!.traderProfit || 0

    expect(profitDev).toBeCloseTo(profitBt, 2)
    expect(profitBt).toBeCloseTo(profitTr, 2)

    // Для большей уверенности сверим формулу прибыли
    const spentUsdt = 9000 / (txTrAfter!.rate || rate)
    const expectedProfit = truncate2(spentUsdt * (2 / 100))
    expect(profitTr).toBeCloseTo(expectedProfit, 2)
  })

  // Ожидаемо: при недостаточном trustBalance сделка не создаётся (409 NO_REQUISITE), frozenUsdt не уходит в минус
  it('Не создаёт сделку при недостаточном траст-балансе и не уводит frozenUsdt в минус', async () => {
    // Сохраним текущее состояние
    const before = await db.user.findUnique({ where: { id: entities.traderId } })

    // Установим нулевой trustBalance и frozenUsdt
    await db.user.update({ where: { id: entities.traderId }, data: { trustBalance: 0, frozenUsdt: 0 } })

    const { rate } = await (await import('@/utils/trader-rate')).getTraderRate(entities.traderId)
    const orderId = `${SUITE_PREFIX}-insuff-trust`
    const res = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 5000, orderId, methodId: entities.methodId, rate, expired_at: new Date(Date.now() + 60_000).toISOString(), clientIdentifier: 'cli-INSUFF' })
    }))

    expect(res.status).toBe(409)

    const after = await db.user.findUnique({ where: { id: entities.traderId } })
    expect(after!.frozenUsdt).toBeGreaterThanOrEqual(0)

    // Вернём состояние
    await db.user.update({ where: { id: entities.traderId }, data: { trustBalance: before!.trustBalance, frozenUsdt: before!.frozenUsdt } })
  })

  // Ожидаемо: при нормальном потоке (заморозка → EXPIRED) frozenUsdt не становится отрицательным
  it('При истечении сделки после заморозки frozenUsdt не становится отрицательным', async () => {
    const { rate } = await (await import('@/utils/trader-rate')).getTraderRate(entities.traderId)
    const before = await db.user.findUnique({ where: { id: entities.traderId } })

    const orderId = `${SUITE_PREFIX}-no-negative-freeze`
    const create = await appMerchant.handle(new Request('http://localhost/transactions/in', {
      method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' },
      // используем ранее встречавшийся clientIdentifier, чтобы пройти фильтр контрагентов
      body: JSON.stringify({ amount: 7000, orderId, methodId: entities.methodId, rate, expired_at: new Date(Date.now() + 30_000).toISOString(), clientIdentifier: 'cli-BT' })
    }))
    expect(create.status).toBe(201)
    const body = await create.json()

    // Проверим, что после заморозки frozenUsdt >= 0
    const mid = await db.user.findUnique({ where: { id: entities.traderId } })
    expect(mid!.frozenUsdt).toBeGreaterThanOrEqual(0)

    // Истекаем
    const exp = await appAdmin.handle(new Request(`http://localhost/transactions/${body.id}/status`, {
      method: 'PATCH', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'EXPIRED' })
    }))
    expect([200, 204, 422]).toContain(exp.status)

    const after = await db.user.findUnique({ where: { id: entities.traderId } })
    expect(after!.frozenUsdt).toBeGreaterThanOrEqual(0)
  })
})


