import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Elysia } from "elysia";
import { db } from "@/db";
import { AdminRole } from "@prisma/client";
import adminRoutes from "@/routes/admin";

// Мок guard-а (эмулируем валидного супер-админа)
const mockAdminGuard = (app: Elysia) =>
  app.derive(({ request }) => {
    const adminToken = request.headers.get("x-admin-key");
    return {
      admin: {
        id: "test-admin-id",
        token: adminToken,
        role: AdminRole.SUPER_ADMIN,
      },
    };
  });

const app = new Elysia().use(mockAdminGuard).group("/admin", (a) => adminRoutes(a));

describe("Адм. эндпоинты: Агенты и команды", () => {
  const adminKey = "test-admin-key";
  let createdAgentIds: string[] = [];
  let createdTraderIds: string[] = [];
  let createdMerchantIds: string[] = [];
  let createdMethodIds: string[] = [];
  let createdTraderMerchantIds: string[] = [];

  beforeAll(async () => {
    await db.admin.upsert({
      where: { token: adminKey },
      update: {},
      create: { token: adminKey, role: AdminRole.SUPER_ADMIN },
    });
  });

  afterAll(async () => {
    if (createdTraderMerchantIds.length)
      await db.traderMerchant.deleteMany({ where: { id: { in: createdTraderMerchantIds } } });
    if (createdMethodIds.length)
      await db.method.deleteMany({ where: { id: { in: createdMethodIds } } });
    if (createdMerchantIds.length)
      await db.merchant.deleteMany({ where: { id: { in: createdMerchantIds } } });
    if (createdTraderIds.length)
      await db.user.deleteMany({ where: { id: { in: createdTraderIds } } });
    if (createdAgentIds.length)
      await db.agent.deleteMany({ where: { id: { in: createdAgentIds } } });
  });

  beforeEach(async () => {
    // не очищаем БД полностью — только локальные коллекции
  });

  describe("CRUD агента", () => {
    test("создание агента", async () => {
      const body = {
        email: `agent-${Date.now()}@ex.com`,
        name: "Агент#1",
        commissionRate: 10,
      };
      const res = await app.handle(
        new Request("http://localhost/admin/agents", {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify(body),
        })
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("plainPassword");
      createdAgentIds.push(data.id);
    });

    test("дубликат email → 409", async () => {
      const email = `agent-dup-${Date.now()}@ex.com`;
      const mk = async () =>
        app.handle(
          new Request("http://localhost/admin/agents", {
            method: "POST",
            headers: { "content-type": "application/json", "x-admin-key": adminKey },
            body: JSON.stringify({ email, name: "A1", commissionRate: 5 }),
          })
        );
      const r1 = await mk();
      expect(r1.status).toBe(200);
      const a1 = await r1.json();
      createdAgentIds.push(a1.id);

      const r2 = await mk();
      expect(r2.status).toBe(409);
    });

    test("обновление и удаление агента", async () => {
      // create
      const cr = await app.handle(
        new Request("http://localhost/admin/agents", {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ email: `agent-upd-${Date.now()}@ex.com", name: "A2", commissionRate: 7 }),
        })
      );
      expect(cr.status).toBe(200);
      const agent = await cr.json();
      createdAgentIds.push(agent.id);

      // update
      const ur = await app.handle(
        new Request(`http://localhost/admin/agents/${agent.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ email: `agent-upd2-${Date.now()}@ex.com`, name: "A2-upd", commissionRate: 15 }),
        })
      );
      expect(ur.status).toBe(200);

      // delete
      const dr = await app.handle(
        new Request(`http://localhost/admin/agents/${agent.id}`, {
          method: "DELETE",
          headers: { "x-admin-key": adminKey },
        })
      );
      expect(dr.status).toBe(200);
    });
  });

  describe("Привязка трейдеров к агенту", () => {
    test("добавление трейдера к агенту и повторная привязка → 409", async () => {
      // prepare agent
      const aRes = await app.handle(
        new Request("http://localhost/admin/agents", {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ email: `agent-bind-${Date.now()}@ex.com`, name: "Binder", commissionRate: 9 }),
        })
      );
      const agent = await aRes.json();
      createdAgentIds.push(agent.id);

      // prepare trader
      const trader = await db.user.create({
        data: { email: `tr-${Date.now()}@ex.com", name: "Trader", password: "x" },
      });
      createdTraderIds.push(trader.id);

      // bind
      const bind1 = await app.handle(
        new Request(`http://localhost/admin/agents/${agent.id}/traders`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ traderId: trader.id }),
        })
      );
      expect(bind1.status).toBe(200);

      const bind2 = await app.handle(
        new Request(`http://localhost/admin/agents/${agent.id}/traders`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ traderId: trader.id }),
        })
      );
      expect(bind2.status).toBe(409);

      // remove link
      const del = await app.handle(
        new Request(`http://localhost/admin/agents/${agent.id}/traders/${trader.id}`, {
          method: "DELETE",
          headers: { "x-admin-key": adminKey },
        })
      );
      expect(del.status).toBe(200);
    });
  });

  describe("Мерчанты агента", () => {
    test("/agents/:id/merchants возвращает привязанные мерчанты трейдеров агента", async () => {
      // agent
      const aRes = await app.handle(
        new Request("http://localhost/admin/agents", {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ email: `agent-m-${Date.now()}@ex.com`, name: "AgentM", commissionRate: 5 }),
        })
      );
      const agent = await aRes.json();
      createdAgentIds.push(agent.id);

      // trader
      const trader = await db.user.create({ data: { email: `t-${Date.now()}@ex.com", name: "T", password: "x" } });
      createdTraderIds.push(trader.id);

      await db.agentTrader.create({ data: { agentId: agent.id, traderId: trader.id } });

      // merchant + method + link
      const merchant = await db.merchant.create({ data: { name: `M-${Date.now()}`, token: "tok" + Date.now() } });
      createdMerchantIds.push(merchant.id);
      const method = await db.method.create({ data: { code: "TEST", name: "Test", type: "CARD", currency: "RUB" } as any });
      createdMethodIds.push(method.id);

      const tm = await db.traderMerchant.create({
        data: {
          traderId: trader.id,
          merchantId: merchant.id,
          methodId: method.id,
          feeIn: 1,
          feeOut: 1,
          isFeeInEnabled: true,
          isFeeOutEnabled: true,
          isMerchantEnabled: true,
        },
      });
      createdTraderMerchantIds.push(tm.id);

      const res = await app.handle(
        new Request(`http://localhost/admin/agents/${agent.id}/merchants`, {
          headers: { "x-admin-key": adminKey },
        })
      );
      expect(res.status).toBe(200);
      const payload = await res.json();
      expect(payload).toHaveProperty("merchants");
      expect(Array.isArray(payload.merchants)).toBe(true);
      expect(payload.merchants.length).toBeGreaterThan(0);
    });
  });

  describe("Массовое добавление мерчанта всем трейдерам агента", () => {
    test("успешное добавление, 400 когда нет трейдеров", async () => {
      // agent без трейдеров
      const ar = await app.handle(
        new Request("http://localhost/admin/agents", {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ email: `agent-ntr-${Date.now()}@ex.com`, name: "NoTraders", commissionRate: 8 }),
        })
      );
      const a = await ar.json();
      createdAgentIds.push(a.id);

      // merchant + method
      const merchant = await db.merchant.create({ data: { name: `M2-${Date.now()}`, token: "tok" + Date.now() } });
      createdMerchantIds.push(merchant.id);
      const method = await db.method.create({ data: { code: "TEST2", name: "Test2", type: "CARD", currency: "RUB" } as any });
      createdMethodIds.push(method.id);

      // 400 — нет трейдеров у агента
      const r400 = await app.handle(
        new Request(`http://localhost/admin/agents/${a.id}/merchants`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ merchantId: merchant.id, methodId: method.id }),
        })
      );
      expect(r400.status).toBe(400);

      // создаём трейдера и привязываем
      const tr = await db.user.create({ data: { email: `t2-${Date.now()}@ex.com", name: "T2", password: "x" } });
      createdTraderIds.push(tr.id);
      await db.agentTrader.create({ data: { agentId: a.id, traderId: tr.id } });

      // успех
      const ok = await app.handle(
        new Request(`http://localhost/admin/agents/${a.id}/merchants`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-admin-key": adminKey },
          body: JSON.stringify({ merchantId: merchant.id, methodId: method.id, feeIn: 1.5, feeOut: 0.5 }),
        })
      );
      expect(ok.status).toBe(200);
    });
  });
});



