import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { db } from "@/db";
import { AdminRole, Status, TransactionType, PayoutStatus } from "@prisma/client";
import adminRoutes from "@/routes/admin";

// Эмуляция авторизованного супер-админа
const mockAdminGuard = (app: Elysia) =>
  app.derive(({ request }) => ({
    admin: {
      id: "test-admin-id",
      token: request.headers.get("x-admin-key"),
      role: AdminRole.SUPER_ADMIN,
    },
  }));

const app = new Elysia().use(mockAdminGuard).group("/admin", (a) => adminRoutes(a));

describe("Адм. эндпоинты: Мерчанты и сеттлы", () => {
  const adminKey = "test-admin-key";

  let createdMerchantIds: string[] = [];
  let createdMethodIds: string[] = [];
  let createdTransactionIds: string[] = [];

  beforeAll(async () => {
    await db.admin.upsert({ where: { token: adminKey }, update: {}, create: { token: adminKey, role: AdminRole.SUPER_ADMIN } });
  });

  afterAll(async () => {
    if (createdTransactionIds.length) await db.transaction.deleteMany({ where: { id: { in: createdTransactionIds } } });
    if (createdMethodIds.length) await db.method.deleteMany({ where: { id: { in: createdMethodIds } } });
    if (createdMerchantIds.length) await db.merchant.deleteMany({ where: { id: { in: createdMerchantIds } } });
  });

  test("Создать мерчанта, получить список и детальную информацию", async () => {
    const rCreate = await app.handle(
      new Request("http://localhost/admin/merchant/create", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ name: `Merchant-${Date.now()}` }),
      })
    );
    expect(rCreate.status).toBe(201);
    const merchant = await rCreate.json();
    createdMerchantIds.push(merchant.id);

    const rList = await app.handle(new Request("http://localhost/admin/merchant/list", { headers: { "x-admin-key": adminKey } }));
    expect(rList.status).toBe(200);
    const list = await rList.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.find((m: any) => m.id === merchant.id)).toBeTruthy();

    const rGet = await app.handle(new Request(`http://localhost/admin/merchant/${merchant.id}`, { headers: { "x-admin-key": adminKey } }));
    expect(rGet.status).toBe(200);
    const got = await rGet.json();
    expect(got).toHaveProperty("id", merchant.id);
    expect(got).toHaveProperty("merchantMethods");
  });

  test("Обновить мерчанта и сбросить 2FA", async () => {
    const m = await db.merchant.create({ data: { name: `M-upd-${Date.now()}`, token: `tok-${Date.now()}` } });
    createdMerchantIds.push(m.id);

    const rUpd = await app.handle(
      new Request("http://localhost/admin/merchant/update", {
        method: "PUT",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id: m.id, name: `${m.name}-UPD`, disabled: true, banned: false, countInRubEquivalent: true }),
      })
    );
    expect(rUpd.status).toBe(200);

    const r2fa = await app.handle(
      new Request("http://localhost/admin/merchant/reset-2fa", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id: m.id }),
      })
    );
    expect(r2fa.status).toBe(200);
  });

  test("Привязать метод к мерчанту, обновить и удалить связь", async () => {
    const m = await db.merchant.create({ data: { name: `M-methods-${Date.now()}`, token: `tok-${Date.now()}` } });
    createdMerchantIds.push(m.id);
    const method = await db.method.create({ data: { code: `CODE${Date.now()}`, name: "Bank Card", type: "CARD" as any, currency: "RUB" as any } });
    createdMethodIds.push(method.id);

    const add = await app.handle(
      new Request(`http://localhost/admin/merchant/${m.id}/methods`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ methodId: method.id, isEnabled: true }),
      })
    );
    expect(add.status).toBe(200);
    const mm = await add.json();
    expect(mm).toHaveProperty("isEnabled", true);

    const upd = await app.handle(
      new Request(`http://localhost/admin/merchant/${m.id}/methods/${method.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ isEnabled: false }),
      })
    );
    expect(upd.status).toBe(200);
    const mm2 = await upd.json();
    expect(mm2).toHaveProperty("isEnabled", false);

    const del = await app.handle(
      new Request(`http://localhost/admin/merchant/${m.id}/methods/${method.id}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      })
    );
    expect(del.status).toBe(200);
  });

  test("Расчёт pendingAmount и история сеттлов мерчанта", async () => {
    // Готовим мерчанта + метод
    const m = await db.merchant.create({ data: { name: `M-settle-${Date.now()}`, token: `tok-${Date.now()}` } });
    createdMerchantIds.push(m.id);
    const method = await db.method.create({ data: { code: `S${Date.now()}`, name: "Card", type: "CARD" as any, currency: "RUB" as any, commissionPayin: 2 } });
    createdMethodIds.push(method.id);

    // Успешные IN транзакции для pendingAmount
    const tx1 = await db.transaction.create({
      data: {
        merchantId: m.id,
        methodId: method.id,
        traderId: (await db.user.create({ data: { email: `u-${Date.now()}@ex.com`, name: "T", password: "x" } })).id,
        amount: 10_000,
        type: TransactionType.IN,
        status: Status.READY,
        rate: 100,
        merchantRate: null,
        assetOrBank: "CARD",
        orderId: "o1",
        callbackUri: "c",
        successUri: "s",
        failUri: "f",
        userId: "u",
        expired_at: new Date(Date.now() + 3600_000),
      },
    });
    createdTransactionIds.push(tx1.id);

    const tx2 = await db.transaction.create({
      data: {
        merchantId: m.id,
        methodId: method.id,
        traderId: tx1.traderId,
        amount: 7_000,
        type: TransactionType.IN,
        status: Status.READY,
        rate: 105,
        merchantRate: null,
        assetOrBank: "CARD",
        orderId: "o2",
        callbackUri: "c",
        successUri: "s",
        failUri: "f",
        userId: "u",
        expired_at: new Date(Date.now() + 3600_000),
      },
    });
    createdTransactionIds.push(tx2.id);

    const r = await app.handle(new Request(`http://localhost/admin/merchant/${m.id}/settlements`, { headers: { "x-admin-key": adminKey } }));
    expect(r.status).toBe(200);
    const payload = await r.json();
    expect(payload).toHaveProperty("settlements");
    expect(payload).toHaveProperty("pendingAmount");
    // Формула pendingAmount: sum((amount - amount*commission)/rate)
    // tx1: (10000 - 200)/100 = 98; tx2: (7000 - 140)/105 ≈ 65.5238
    expect(Number(payload.pendingAmount)).toBeGreaterThan(160);
  });

  test("Создать сетл мерчанту и проверить историю /merchant/settlements", async () => {
    const m = await db.merchant.create({ data: { name: `M-do-settle-${Date.now()}`, token: `tok-${Date.now()}` } });
    createdMerchantIds.push(m.id);
    const method = await db.method.create({ data: { code: `SC${Date.now()}`, name: "Card", type: "CARD" as any, currency: "RUB" as any, commissionPayin: 1 } });
    createdMethodIds.push(method.id);

    // Пара READY IN сделок
    const trader = await db.user.create({ data: { email: `u2-${Date.now()}@ex.com`, name: "T2", password: "x" } });
    const t1 = await db.transaction.create({ data: { merchantId: m.id, methodId: method.id, traderId: trader.id, amount: 20_000, type: TransactionType.IN, status: Status.READY, rate: 100, assetOrBank: "CARD", orderId: "o1", callbackUri: "c", successUri: "s", failUri: "f", userId: "u", expired_at: new Date(Date.now() + 3600_000) } });
    const t2 = await db.transaction.create({ data: { merchantId: m.id, methodId: method.id, traderId: trader.id, amount: 5_000, type: TransactionType.IN, status: Status.READY, rate: 100, assetOrBank: "CARD", orderId: "o2", callbackUri: "c", successUri: "s", failUri: "f", userId: "u", expired_at: new Date(Date.now() + 3600_000) } });
    createdTransactionIds.push(t1.id, t2.id);

    const doSettle = await app.handle(
      new Request("http://localhost/admin/merchant/settle", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ id: m.id }),
      })
    );
    expect(doSettle.status).toBe(200);
    const { amount } = await doSettle.json();
    expect(amount).toBeGreaterThan(0);

    const r = await app.handle(new Request("http://localhost/admin/merchant/settlements", { headers: { "x-admin-key": adminKey } }));
    expect(r.status).toBe(200);
    const items = await r.json();
    expect(Array.isArray(items)).toBe(true);
    expect(items.find((s: any) => s.merchant.id === m.id)).toBeTruthy();
  });

  test("История транзакций мерчанта /merchant/:id/transactions и формула баланса", async () => {
    const m = await db.merchant.create({ data: { name: `M-trx-${Date.now()}`, token: `tok-${Date.now()}` } });
    createdMerchantIds.push(m.id);
    const method = await db.method.create({ data: { code: `TRX${Date.now()}`, name: "Card", type: "CARD" as any, currency: "RUB" as any, commissionPayin: 1, commissionPayout: 2 } });
    createdMethodIds.push(method.id);
    const trader = await db.user.create({ data: { email: `tm-${Date.now()}@ex.com`, name: "TraderM", password: "x" } });

    // IN READY
    const tIn = await db.transaction.create({ data: { merchantId: m.id, methodId: method.id, traderId: trader.id, amount: 30_000, type: TransactionType.IN, status: Status.READY, rate: 100, assetOrBank: "CARD", orderId: "o1", callbackUri: "c", successUri: "s", failUri: "f", userId: "u", expired_at: new Date(Date.now() + 3600_000) } });
    createdTransactionIds.push(tIn.id);

    // Выплата COMPLETED
    await db.payout.create({ data: { merchantId: m.id, traderId: trader.id, amount: 5_000, status: PayoutStatus.COMPLETED, feePercent: 2 } });

    const r = await app.handle(new Request(`http://localhost/admin/merchant/${m.id}/transactions?page=1&pageSize=20`, { headers: { "x-admin-key": adminKey } }));
    expect(r.status).toBe(200);
    const payload = await r.json();
    expect(payload).toHaveProperty("transactions");
    expect(Array.isArray(payload.transactions)).toBe(true);
    expect(payload).toHaveProperty("balanceFormula");
  });
});



