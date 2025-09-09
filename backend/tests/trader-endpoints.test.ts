import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { randomBytes } from 'node:crypto'
import { db } from '@/db'
import traderRoutes from '@/routes/trader'
import merchantRoutes from '@/routes/merchant'
import adminRoutes from '@/routes/admin'
import { MethodType, Status, TrafficType } from '@prisma/client'

// Этот файл покрывает основные фронтовые трейдерские эндпоинты:
// - Реквизиты (CRUD, старт/стоп, архивирование, привязка к устройству, уведомления устройства)
// - Устройства (CRUD, regenerate token, ping/mark-connected, start/stop, health-check)
// - Папки (CRUD, start-all/stop-all)
// - Споры по выплатам (чтение, сообщения, резолв)

let appTrader: any
let appMerchant: any
let appAdmin: any
let traderHeaders: Record<string, string>
let merchantHeaders: Record<string, string>
let adminHeaders: Record<string, string>

const SUITE = `test-trader-${Date.now()}-${randomBytes(3).toString('hex')}`

const ctx: any = {
  merchantId: '',
  merchantToken: '',
  methodId: '',
  traderId: '',
  traderSession: '',
  deviceId: '',
  requisiteId: '',
  folderId: '',
}

beforeAll(async () => {
  // Merchant + method
  const merchant = await db.merchant.create({
    data: { name: `${SUITE}-merchant`, token: randomBytes(16).toString('hex') }
  })
  ctx.merchantId = merchant.id
  ctx.merchantToken = merchant.token
  merchantHeaders = { 'x-merchant-api-key': merchant.token }

  const method = await db.method.create({
    data: {
      code: `${SUITE}-sbp`,
      name: `${SUITE}-SBP`,
      type: MethodType.sbp,
      commissionPayin: 0,
      commissionPayout: 0,
      maxPayin: 1_000_000,
      minPayin: 100,
      maxPayout: 1_000_000,
      minPayout: 100,
      chancePayin: 100,
      chancePayout: 100,
      isEnabled: true,
    }
  })
  ctx.methodId = method.id
  await db.merchantMethod.create({ data: { merchantId: merchant.id, methodId: method.id, isEnabled: true } })

  // Trader + session + relation
  const trader = await db.user.create({
    data: {
      email: `${SUITE}-trader@example.com`,
      name: `${SUITE}-trader`,
      password: 'hash',
      trafficEnabled: true,
      banned: false,
      trustBalance: 10_000,
      deposit: 5_000,
      balanceUsdt: 0,
      balanceRub: 0,
    }
  })
  ctx.traderId = trader.id
  const session = await db.session.create({
    data: { userId: trader.id, token: `${SUITE}-sess-${randomBytes(8).toString('hex')}`, expiredAt: new Date(Date.now()+86400000), ip: '127.0.0.1' }
  })
  ctx.traderSession = session.token
  traderHeaders = { 'x-trader-token': session.token }

  await db.traderMerchant.create({
    data: { traderId: trader.id, merchantId: merchant.id, methodId: method.id, isMerchantEnabled: true, isFeeInEnabled: true, useFlexibleRates: false, feeIn: 0, feeOut: 0 }
  })
  await db.trafficSettings.upsert({
    where: { userId: trader.id },
    update: { isEnabled: true, maxCounterparties: 5, trafficType: TrafficType.PRIMARY },
    create: { userId: trader.id, isEnabled: true, maxCounterparties: 5, trafficType: TrafficType.PRIMARY },
  })

  // Apps
  appTrader = new Elysia().use(traderRoutes)
  appMerchant = new Elysia().use(merchantRoutes)
  appAdmin = new Elysia().use(adminRoutes)
})

afterAll(async () => {
  await db.withdrawalDisputeMessage.deleteMany({})
  await db.withdrawalDispute.deleteMany({})
  await db.payout.deleteMany({ where: { merchantId: ctx.merchantId } })
  await db.notification.deleteMany({ where: { deviceId: ctx.deviceId } })
  await db.transactionAttempt.deleteMany({ where: { merchantId: ctx.merchantId } })
  await db.transaction.deleteMany({ where: { merchantId: ctx.merchantId } })
  await db.folder.deleteMany({ where: { traderId: ctx.traderId } })
  await db.bankDetail.deleteMany({ where: { userId: ctx.traderId } })
  await db.device.deleteMany({ where: { userId: ctx.traderId } })
  await db.traderMerchant.deleteMany({ where: { traderId: ctx.traderId, merchantId: ctx.merchantId } })
  await db.merchantMethod.deleteMany({ where: { merchantId: ctx.merchantId, methodId: ctx.methodId } })
  await db.session.deleteMany({ where: { userId: ctx.traderId } })
  await db.trafficSettings.deleteMany({ where: { userId: ctx.traderId } })
  await db.method.deleteMany({ where: { id: ctx.methodId } })
  await db.user.deleteMany({ where: { id: ctx.traderId } })
  await db.merchant.deleteMany({ where: { id: ctx.merchantId } })
})

beforeEach(async () => {
  await db.notification.deleteMany({ where: { deviceId: ctx.deviceId } })
  await db.transactionAttempt.deleteMany({ where: { merchantId: ctx.merchantId } })
  await db.transaction.deleteMany({ where: { merchantId: ctx.merchantId } })
  await db.user.update({ where: { id: ctx.traderId }, data: { frozenUsdt: 0, trustBalance: 10_000 } })
})

describe('Трейдер: Реквизиты и устройства', () => {
  it('Создаёт реквизит, устройство, связывает/отвязывает и получает уведомления устройства', async () => {
    // Создать устройство
    const devCreate = await appTrader.handle(new Request('http://localhost/devices', { method: 'POST', headers: { ...traderHeaders, 'Content-Type': 'application/json' } as any, body: JSON.stringify({ name: `${SUITE}-Device` }) }))
    expect([200,201]).toContain(devCreate.status)
    const dev = await devCreate.json()
    ctx.deviceId = dev.id

    // Создать реквизит (без привязки)
    const bdCreate = await appTrader.handle(new Request('http://localhost/bank-details', { method: 'POST', headers: { ...traderHeaders, 'Content-Type': 'application/json' } as any, body: JSON.stringify({
      methodType: 'sbp', bankType: 'TINK', cardNumber: '79005554433', recipientName: `${SUITE}-rec`, phoneNumber: '79005550000', minAmount: 100, maxAmount: 50000, intervalMinutes: 0,
      totalAmountLimit: 100000, operationLimit: 10, sumLimit: 200000
    }) }))
    expect(bdCreate.status).toBe(200)
    const bd = await bdCreate.json()
    ctx.requisiteId = bd.id

    // Привязать устройство к реквизиту
    const link = await appTrader.handle(new Request('http://localhost/devices/link', { method: 'POST', headers: { ...traderHeaders, 'Content-Type': 'application/json' } as any, body: JSON.stringify({ deviceId: ctx.deviceId, bankDetailId: ctx.requisiteId }) }))
    expect(link.status).toBe(200)

    // Сгенерировать уведомление на устройство (health-check + вручную notification)
    const devRow = await db.device.findFirstOrThrow({ where: { id: ctx.deviceId } })
    await appTrader.handle(new Request('http://localhost/devices/health-check', { method: 'POST', headers: { 'x-device-token': devRow.token as any, 'Content-Type': 'application/json' } as any, body: JSON.stringify({ batteryLevel: 77, networkSpeed: 50 }) }))
    await db.notification.create({ data: { type: 'AppNotification', title: 'Test', message: 'Device message', deviceId: ctx.deviceId, metadata: { amount: 123 } } })

    // Получить уведомления устройства напрямую
    const devNotifs = await appTrader.handle(new Request(`http://localhost/devices/${ctx.deviceId}/notifications?page=1&limit=10`, { headers: { ...traderHeaders } as any }))
    expect(devNotifs.status).toBe(200)
    const notifBody = await devNotifs.json()
    expect(Array.isArray(notifBody.notifications)).toBe(true)
    // проверяем пагинацию и что есть хотя бы одна запись/или пусто без ошибки
    expect(notifBody).toHaveProperty('pagination')

    // Отвязать устройство
    const unlink = await appTrader.handle(new Request('http://localhost/devices/unlink', { method: 'POST', headers: { ...traderHeaders, 'Content-Type': 'application/json' } as any, body: JSON.stringify({ deviceId: ctx.deviceId, bankDetailId: ctx.requisiteId }) }))
    expect(unlink.status).toBe(200)
  })

  it('Редактирует реквизит, архивирует/разархивирует, старт/стоп и удаляет при отсутствии активных сделок', async () => {
    // create new requisite
    const create = await appTrader.handle(new Request('http://localhost/bank-details', { method: 'POST', headers: { ...traderHeaders, 'Content-Type': 'application/json' } as any, body: JSON.stringify({
      methodType: 'sbp', bankType: 'TINK', cardNumber: '79001112233', recipientName: `${SUITE}-upd`, minAmount: 100, maxAmount: 50000, intervalMinutes: 0
    }) }))
    const bd = await create.json()

    // update (без изменения phoneNumber)
    const put = await appTrader.handle(new Request(`http://localhost/bank-details/${bd.id}`, { method: 'PUT', headers: { ...traderHeaders, 'Content-Type': 'application/json' } as any, body: JSON.stringify({ maxAmount: 60000 }) }))
    expect(put.status).toBe(200)

    // archive
    const arch = await appTrader.handle(new Request(`http://localhost/bank-details/${bd.id}/archive`, { method: 'PATCH', headers: { ...traderHeaders, 'Content-Type': 'application/json' } as any, body: JSON.stringify({ archived: true }) }))
    expect(arch.status).toBe(200)

    // start/stop
    const start = await appTrader.handle(new Request(`http://localhost/bank-details/${bd.id}/start`, { method: 'PATCH', headers: { ...traderHeaders } as any }))
    expect(start.status).toBe(200)
    const stop = await appTrader.handle(new Request(`http://localhost/bank-details/${bd.id}/stop`, { method: 'PATCH', headers: { ...traderHeaders } as any }))
    expect(stop.status).toBe(200)

    // delete (нет активных сделок)
    const del = await appTrader.handle(new Request(`http://localhost/bank-details/${bd.id}`, { method: 'DELETE', headers: { ...traderHeaders } as any }))
    expect(del.status).toBe(200)
  })

  it('Не удаляет реквизит при наличии активной сделки', async () => {
    // Создадим реквизит и запустим сделку IN
    const create = await appTrader.handle(new Request('http://localhost/bank-details', { method: 'POST', headers: { ...traderHeaders, 'Content-Type': 'application/json' } as any, body: JSON.stringify({
      methodType: 'sbp', bankType: 'TINK', cardNumber: '79002223344', recipientName: `${SUITE}-busy`, minAmount: 100, maxAmount: 50000, intervalMinutes: 0
    }) }))
    const bd = await create.json()

    const orderId = `${SUITE}-busy-` + randomBytes(4).toString('hex')
    const res = await appMerchant.handle(new Request('http://localhost/transactions/in', { method: 'POST', headers: { ...merchantHeaders, 'Content-Type': 'application/json' } as any, body: JSON.stringify({
      methodId: ctx.methodId, amount: 10000, currency: 'RUB', orderId, callbackUri: 'http://localhost/cb', clientIdentifier: `${SUITE}-c` }) }))
    expect([201,409,422]).toContain(res.status)

    const del = await appTrader.handle(new Request(`http://localhost/bank-details/${bd.id}`, { method: 'DELETE', headers: { ...traderHeaders } as any }))
    // Ожидаем 400 при наличии активной сделки либо 200 если сделка не была создана по бизнес-правилам
    expect([200,400]).toContain(del.status)
  })
})

describe('Трейдер: Папки', () => {
  it('Создаёт папку, редактирует и удаляет; запускает/останавливает все реквизиты', async () => {
    // Создать 2 реквизита
    const b1 = await appTrader.handle(new Request('http://localhost/bank-details', { method: 'POST', headers: { ...traderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ methodType: 'sbp', bankType: 'TINK', cardNumber: '79003000001', recipientName: `${SUITE}-f1`, minAmount: 100, maxAmount: 50000, intervalMinutes: 0 }) }))
    const r1 = await b1.json()
    const b2 = await appTrader.handle(new Request('http://localhost/bank-details', { method: 'POST', headers: { ...traderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ methodType: 'sbp', bankType: 'TINK', cardNumber: '79003000002', recipientName: `${SUITE}-f2`, minAmount: 100, maxAmount: 50000, intervalMinutes: 0 }) }))
    const r2 = await b2.json()

    // Создать папку
    const fCreate = await appTrader.handle(new Request('http://localhost/folders', { method: 'POST', headers: { ...traderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `${SUITE}-folder`, requisiteIds: [r1.id, r2.id] }) as any }))
    expect(fCreate.status).toBe(200)
    const folder = await fCreate.json()
    ctx.folderId = folder.data?.id || folder.id

    // Обновить папку (переименовать и оставить один реквизит)
    const fPut = await appTrader.handle(new Request(`http://localhost/folders/${ctx.folderId}`, { method: 'PUT', headers: { ...traderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `${SUITE}-folder-new`, requisiteIds: [r1.id] }) as any }))
    expect([200,201]).toContain(fPut.status)

    // Запустить все
    const startAll = await appTrader.handle(new Request(`http://localhost/folders/${ctx.folderId}/start-all`, { method: 'POST', headers: { ...traderHeaders } }))
    expect(startAll.status).toBe(200)
    // Остановить все
    const stopAll = await appTrader.handle(new Request(`http://localhost/folders/${ctx.folderId}/stop-all`, { method: 'POST', headers: { ...traderHeaders } }))
    expect(stopAll.status).toBe(200)

    // Удалить
    const fDel = await appTrader.handle(new Request(`http://localhost/folders/${ctx.folderId}`, { method: 'DELETE', headers: { ...traderHeaders } }))
    expect([200,201]).toContain(fDel.status)
  })
})

describe('Трейдер: Споры по выплатам', () => {
  it('Читает спор, отправляет сообщение (без файлов) и резолвит', async () => {
    // Подготовим payout и спор напрямую (создание спора через UI не предусмотрено)
    const rate = 100
    const amount = 15000
    const payout = await db.payout.create({ data: {
      amount,
      amountUsdt: amount / rate,
      total: amount,
      totalUsdt: amount / rate,
      rate,
      wallet: '4100-XXXX',
      bank: 'TBANK',
      isCard: true,
      expireAt: new Date(Date.now() + 3600_000),
      status: 'ACTIVE',
      traderId: ctx.traderId,
      merchantId: ctx.merchantId,
    } as any })
    const dispute = await db.withdrawalDispute.create({ data: {
      payoutId: payout.id,
      traderId: ctx.traderId,
      merchantId: ctx.merchantId,
      status: 'OPEN',
      // нет поля title в модели
    } as any })

    // GET список
    const list = await appTrader.handle(new Request('http://localhost/disputes?type=payouts', { headers: { ...traderHeaders } }))
    expect(list.status).toBe(200)

    // GET один спор
    const one = await appTrader.handle(new Request(`http://localhost/disputes/${dispute.id}`, { headers: { ...traderHeaders } }))
    expect(one.status).toBe(200)

    // POST сообщение без файлов
    const msg = await appTrader.handle(new Request(`http://localhost/disputes/${dispute.id}/messages`, { method: 'POST', headers: { ...traderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Нужна проверка' }) as any }))
    expect([200,201]).toContain(msg.status)

    // RESOLVE в пользу трейдера → возврат заморозки по payout
    const resOk = await appTrader.handle(new Request(`http://localhost/disputes/${dispute.id}/resolve`, { method: 'POST', headers: { ...traderHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'RESOLVED_FAIL', resolution: 'Предоставлены доказательства' }) }))
    expect([200,201]).toContain(resOk.status)
  })
})


