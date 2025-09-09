import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { randomBytes } from 'node:crypto'
import { db } from '@/db'
import { truncate2 } from '@/utils/rounding'
import traderRoutes from '@/routes/trader'
import deviceApi from '@/routes/trader/device'
import { deviceLongPollRoutes } from '@/routes/device-long-poll'
import merchantRoutes from '@/routes/merchant'
import { NotificationMatcherService } from '@/services/NotificationMatcherService'
import { MethodType, Status } from '@prisma/client'

const SUITE = `test-devices-${Date.now()}-${randomBytes(3).toString('hex')}`

let appTrader: any
let appDevice: any
let appLongPoll: any
let appMerchant: any

let traderHeaders: Record<string, string>
let deviceAuth: { token: string, id: string }
let ctx = { merchantId: '', methodId: '', traderId: '', requisiteId: '', transactionId: '' }

describe('Устройства и сопоставление уведомлений', () => {
  beforeAll(async () => {
    // Приложения
    appTrader = new Elysia().use(traderRoutes)
    appDevice = new Elysia().use(deviceApi)
    appLongPoll = new Elysia().use(deviceLongPollRoutes)
    appMerchant = new Elysia().use(merchantRoutes)

    // Фикстуры: мерчант, метод, трейдер, сессия
    const merchant = await db.merchant.create({ data: { name: `${SUITE}-merchant`, token: randomBytes(16).toString('hex'), disabled: false, banned: false } })
    ctx.merchantId = merchant.id
    const method = await db.method.create({ data: { code: `${SUITE}-sbp`, name: `${SUITE}-SBP`, type: MethodType.sbp, commissionPayin: 0, commissionPayout: 0, maxPayin: 1_000_000, minPayin: 100, maxPayout: 1_000_000, minPayout: 100, chancePayin: 100, chancePayout: 100, isEnabled: true } })
    ctx.methodId = method.id
    await db.merchantMethod.create({ data: { merchantId: merchant.id, methodId: method.id, isEnabled: true } })

    const trader = await db.user.create({ data: { email: `${SUITE}-tr@example.com`, name: `${SUITE}-trader`, password: 'hash', banned: false, trafficEnabled: true, trustBalance: 10_000, deposit: 5_000, balanceUsdt: 0, balanceRub: 0 } })
    ctx.traderId = trader.id
    await db.trafficSettings.upsert({ where: { userId: trader.id }, update: { isEnabled: true, maxCounterparties: 10 }, create: { userId: trader.id, isEnabled: true, maxCounterparties: 10 } })

    // Связь TM для фикс. ставки 2% (чтобы матчер рассчитал прибыль)
    await db.traderMerchant.create({ data: { traderId: trader.id, merchantId: merchant.id, methodId: method.id, isMerchantEnabled: true, isFeeInEnabled: true, feeIn: 2, useFlexibleRates: false } })

    const sess = await db.session.create({ data: { userId: trader.id, token: `${SUITE}-sess`, expiredAt: new Date(Date.now() + 864e5), ip: '127.0.0.1' } })
    traderHeaders = { 'x-trader-token': sess.token }
  })

  beforeEach(async () => {
    // Удаление с повтором из-за возможного дедлока в CI
    for (let i = 0; i < 3; i++) {
      try {
        await db.notification.deleteMany({})
        break
      } catch (e) {
        await new Promise(r => setTimeout(r, 50 * (i + 1)))
      }
    }
    await db.transaction.deleteMany({ where: { merchantId: ctx.merchantId } })
    await db.transactionAttempt.deleteMany({ where: { merchantId: ctx.merchantId } })
    // Важно: сначала удаляем устройства, затем банковские реквизиты,
    // чтобы избежать FK `Device_userId_fkey`
    await db.device.deleteMany({ where: { userId: ctx.traderId } })
    await db.bankDetail.deleteMany({ where: { userId: ctx.traderId } })
  })

  afterAll(async () => {
    // Удаление с повтором из-за возможного дедлока в CI
    for (let i = 0; i < 3; i++) {
      try {
        await db.notification.deleteMany({})
        break
      } catch (e) {
        await new Promise(r => setTimeout(r, 50 * (i + 1)))
      }
    }
    await db.transaction.deleteMany({ where: { merchantId: ctx.merchantId } })
    await db.transactionAttempt.deleteMany({ where: { merchantId: ctx.merchantId } })
    // Сначала устройства, затем реквизиты — корректный порядок удаления связанных сущностей
    await db.device.deleteMany({ where: { userId: ctx.traderId } })
    await db.bankDetail.deleteMany({ where: { userId: ctx.traderId } })
    await db.traderMerchant.deleteMany({ where: { traderId: ctx.traderId, merchantId: ctx.merchantId } })
    await db.merchantMethod.deleteMany({ where: { merchantId: ctx.merchantId } })
    await db.method.deleteMany({ where: { id: ctx.methodId } })
    await db.session.deleteMany({ where: { userId: ctx.traderId } })
    await db.trafficSettings.deleteMany({ where: { userId: ctx.traderId } })
    await db.user.deleteMany({ where: { id: ctx.traderId } })
    await db.merchant.deleteMany({ where: { id: ctx.merchantId } })
  })

  // Ожидаемо: устройство подключается, отправляет health-check и notification
  it('Подключение устройства и отправка уведомления', async () => {
    // Создаём устройство вручную и «подключаем»
    const token = randomBytes(24).toString('hex')
    const device = await db.device.create({ data: { userId: ctx.traderId, name: `${SUITE}-Device`, token, emulated: true, isOnline: false } })
    deviceAuth = { token, id: device.id }

    // Health-check через device API
    const hc = await appDevice.handle(new Request('http://localhost/health-check', { method: 'POST', headers: { 'x-device-token': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ batteryLevel: 77 }) }))
    expect(hc.status).toBe(200)
    const updated = await db.device.findUnique({ where: { id: device.id } })
    expect(updated?.isOnline).toBe(true)

    // Long-poll подключение и отправка команды
    const lpPromise = appLongPoll.handle(new Request('http://localhost/api/device/long-poll', { method: 'POST', headers: { 'x-device-token': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ batteryLevel: 77 }) }))
    await new Promise(r => setTimeout(r, 30))
    const cmd = await appLongPoll.handle(new Request('http://localhost/api/device/send-command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: device.id, command: 'PING', data: { v: 1 } }) }))
    expect(cmd.status).toBe(200)
    const lpRes = await lpPromise
    expect(lpRes.status).toBe(200)
  })

  // Ожидаемо: сделка назначается на реквизит с deviceId; notification с суммой → матчер переводит в READY и считает прибыль по 2%
  it('Сопоставление уведомления со сделкой на устройстве и расчёт прибыли', async () => {
    // Устройство + реквизит
    const token = randomBytes(24).toString('hex')
    const device = await db.device.create({ data: { userId: ctx.traderId, name: `${SUITE}-MatchDev`, token, emulated: true, isOnline: true, isWorking: true } })
    const requisite = await db.bankDetail.create({ data: { userId: ctx.traderId, methodType: MethodType.sbp, bankType: 'TBANK', cardNumber: '79000000001', recipientName: `${SUITE}-REC`, minAmount: 100, maxAmount: 1_000_000, isActive: true, deviceId: device.id } })
    ctx.requisiteId = requisite.id

    // Создаём сделку IN на 9000 RUB
    const rate = 81.78
    const orderId = `${SUITE}-match-1`
    const res = await appMerchant.handle(new Request('http://localhost/transactions/in', { method: 'POST', headers: { 'x-merchant-api-key': (await db.merchant.findUnique({ where: { id: ctx.merchantId } })).token, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: 9000, orderId, methodId: ctx.methodId, rate, expired_at: new Date(Date.now() + 60_000).toISOString(), clientIdentifier: 'cli-DEV' }) }))
    expect(res.status).toBe(201)
    const body = await res.json()
    ctx.transactionId = body.id
    const txBefore = await db.transaction.findUnique({ where: { id: body.id } })
    expect(txBefore?.bankDetailId).toBe(requisite.id)
    expect(txBefore?.status).toBe(Status.IN_PROGRESS)

    // Отправляем notification с суммой 9000 через device API
    const notif = await appDevice.handle(new Request('http://localhost/notification', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ packageName: 'com.bank.app', appName: 'Bank App', title: 'Зачисление', content: 'Поступление 9000 ₽', timestamp: Date.now(), priority: 1, category: 'msg' }) }))
    expect(notif.status).toBe(200)

    // Запускаем матчер
    const matcher = new NotificationMatcherService()
    await matcher.tick()

    const txAfter = await db.transaction.findUnique({ where: { id: body.id } })
    expect(txAfter?.status).toBe(Status.READY)
    // Проверяем прибыль по 2% (используем фактический rate из транзакции и truncate2)
    const actualRate = txAfter?.rate || rate
    const spentUsdt = 9000 / actualRate
    const expectedProfit = truncate2(spentUsdt * 0.02)
    expect(truncate2(txAfter?.traderProfit || 0)).toBe(expectedProfit)
  })
})


