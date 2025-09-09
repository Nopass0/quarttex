import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Elysia } from "elysia";
import { db } from "@/db";
import { AdminRole, TransactionType, Status } from "@prisma/client";
import adminRoutes from "@/routes/admin";

// Эмуляция супер-админа
const mockAdminGuard = (app: Elysia) =>
  app.derive(({ request }) => ({
    admin: { id: "adm", token: request.headers.get("x-admin-key"), role: AdminRole.SUPER_ADMIN },
  }));

const app = new Elysia().use(mockAdminGuard).group("/admin", (a) => adminRoutes(a));

describe("Адм. эндпоинты: Сделки", () => {
  const adminKey = "test-admin-key";

  let merchantId: string;
  let methodId: string;
  let traderId: string;
  let trxId: string;

  beforeAll(async () => {
    await db.admin.upsert({ where: { token: adminKey }, update: {}, create: { token: adminKey, role: AdminRole.SUPER_ADMIN } });

    const merchant = await db.merchant.create({ data: { name: `TRX-M-${Date.now()}`, token: `tok-${Date.now()}` } });
    merchantId = merchant.id;

    const method = await db.method.create({ data: { code: `TRX${Date.now()}`, name: "Card", type: "CARD" as any, currency: "RUB" as any, commissionPayin: 1 } });
    methodId = method.id;

    const trader = await db.user.create({ data: { email: `trx-user-${Date.now()}@ex.com`, name: "Trader", password: "x" } });
    traderId = trader.id;
  });

  afterAll(async () => {
    if (trxId) await db.transaction.delete({ where: { id: trxId } }).catch(() => {});
    if (traderId) await db.user.delete({ where: { id: traderId } }).catch(() => {});
    if (methodId) await db.method.delete({ where: { id: methodId } }).catch(() => {});
    if (merchantId) await db.merchant.delete({ where: { id: merchantId } }).catch(() => {});
  });

  test("Создание сделки через /admin/transactions/create и получение по ID", async () => {
    const createRes = await app.handle(
      new Request("http://localhost/admin/transactions/create", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({
          amount: 10000,
          assetOrBank: "CARD",
          orderId: `ord-${Date.now()}`,
          merchantId,
          methodId,
          userId: traderId,
          type: TransactionType.IN,
          callbackUri: "https://cb",
          successUri: "https://ok",
          failUri: "https://fail",
          userIp: "127.0.0.1",
        }),
      })
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created).toHaveProperty("id");
    trxId = created.id;

    const getRes = await app.handle(new Request(`http://localhost/admin/transactions/${trxId}`, { headers: { "x-admin-key": adminKey } }));
    expect(getRes.status).toBe(200);
    const got = await getRes.json();
    expect(got).toHaveProperty("id", trxId);
    expect(got).toHaveProperty("amount", 10000);
  });

  test("Список попыток /admin/transactions/attempts с пагинацией", async () => {
    const attemptsRes = await app.handle(
      new Request("http://localhost/admin/transactions/attempts?page=1&limit=10", { headers: { "x-admin-key": adminKey } })
    );
    expect(attemptsRes.status).toBe(200);
    const data = await attemptsRes.json();
    expect(data).toHaveProperty("data");
    expect(data).toHaveProperty("pagination");
  });

  test("Частичное обновление сделки /admin/transactions/:id (смена статуса)", async () => {
    // Переведём статус в READY
    const patchRes = await app.handle(
      new Request(`http://localhost/admin/transactions/${trxId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ status: Status.READY }),
      })
    );
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(patched).toHaveProperty("transaction");
    expect(patched.transaction).toHaveProperty("status", Status.READY);

    // Переведём в EXPIRED
    const patch2 = await app.handle(
      new Request(`http://localhost/admin/transactions/${trxId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ status: Status.EXPIRED }),
      })
    );
    expect(patch2.status).toBe(200);
    const patched2 = await patch2.json();
    expect(patched2.transaction).toHaveProperty("status", Status.EXPIRED);
  });

  test("Фильтрация списка сделок /admin/transactions", async () => {
    const listRes = await app.handle(
      new Request("http://localhost/admin/transactions?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc", {
        headers: { "x-admin-key": adminKey },
      })
    );
    expect(listRes.status).toBe(200);
  });
});



