import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Elysia } from "elysia";
import { db } from "@/db";
import { RateSource, AdminRole } from "@prisma/client";
import adminRoutes from "@/routes/admin";

// Мок для adminGuard middleware
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

// Создаём тестовое приложение
const app = new Elysia()
  .use(mockAdminGuard)
  .group("/admin", (a) => adminRoutes(a));

describe("Административные эндпоинты для трейдеров", () => {
  const testAdminToken = "test-admin-key";
  let testAdmin: any;
  let createdTraders: string[] = [];

  beforeAll(async () => {
    // Создаём тестового админа
    testAdmin = await db.admin.create({
      data: {
        token: testAdminToken,
        role: AdminRole.SUPER_ADMIN,
      },
    });
  });

  afterAll(async () => {
    // Очищаем созданные данные
    if (createdTraders.length > 0) {
      await db.user.deleteMany({
        where: { id: { in: createdTraders } },
      });
    }
    
    if (testAdmin) {
      await db.admin.delete({ where: { id: testAdmin.id } });
    }
  });

  beforeEach(() => {
    // Сброс массива созданных трейдеров перед каждым тестом
    createdTraders = [];
  });

  describe("GET /admin/users - получение списка трейдеров", () => {
    test("должен вернуть список всех трейдеров с корректными полями", async () => {
      // Ожидаемо: возвращается список трейдеров с полями id, email, name, balances, turnover, agent, team
      const response = await app
        .handle(new Request("http://localhost/admin/users", {
          headers: { "x-admin-key": testAdminToken },
        }))
        .then((res) => res.json());

      expect(Array.isArray(response)).toBe(true);
      
      if (response.length > 0) {
        const trader = response[0];
        expect(trader).toHaveProperty("id");
        expect(trader).toHaveProperty("numericId");
        expect(trader).toHaveProperty("email");
        expect(trader).toHaveProperty("name");
        expect(trader).toHaveProperty("balanceUsdt");
        expect(trader).toHaveProperty("balanceRub");
        expect(trader).toHaveProperty("trustBalance");
        expect(trader).toHaveProperty("profitFromDeals");
        expect(trader).toHaveProperty("profitFromPayouts");
        expect(trader).toHaveProperty("turnover");
        expect(trader).toHaveProperty("banned");
        expect(trader).toHaveProperty("trafficEnabled");
        expect(trader).toHaveProperty("createdAt");
        expect(trader).toHaveProperty("lastTransactionAt");
        expect(trader).toHaveProperty("agent");
        expect(trader).toHaveProperty("team");
        expect(trader).toHaveProperty("activeRequisitesCount");
      }
    });

    test("должен требовать авторизацию", async () => {
      // Ожидаемо: без заголовка x-admin-key возвращается ошибка 401
      const response = await app.handle(
        new Request("http://localhost/admin/users")
      );

      expect(response.status).toBe(401);
    });
  });

  describe("GET /admin/traders - получение списка трейдеров (альтернативный эндпоинт)", () => {
    test("должен вернуть список трейдеров", async () => {
      // Ожидаемо: возвращается успешный ответ с полем traders
      const response = await app
        .handle(new Request("http://localhost/admin/traders", {
          headers: { "x-admin-key": testAdminToken },
        }))
        .then((res) => res.json());

      expect(response).toHaveProperty("success", true);
      expect(response).toHaveProperty("traders");
      expect(Array.isArray(response.traders)).toBe(true);
    });
  });

  describe("POST /admin/create-user - создание трейдера", () => {
    test("должен создать нового трейдера с базовыми параметрами", async () => {
      // Ожидаемо: создаётся трейдер, возвращается 201, генерируется plainPassword, устанавливаются дефолтные балансы
      const traderData = {
        email: `test-trader-${Date.now()}@example.com`,
        name: "Тестовый Трейдер",
        balanceUsdt: 1000,
        balanceRub: 50000,
        trustBalance: 500,
      };

      const response = await app.handle(
        new Request("http://localhost/admin/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(traderData),
        })
      );

      expect(response.status).toBe(201);
      
      const result = await response.json();
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("email", traderData.email);
      expect(result).toHaveProperty("name", traderData.name);
      expect(result).toHaveProperty("balanceUsdt", traderData.balanceUsdt);
      expect(result).toHaveProperty("balanceRub", traderData.balanceRub);
      expect(result).toHaveProperty("trustBalance", traderData.trustBalance);
      expect(result).toHaveProperty("plainPassword");
      expect(result).toHaveProperty("profitFromDeals", 0);
      expect(result).toHaveProperty("profitFromPayouts", 0);
      expect(result).toHaveProperty("createdAt");

      // Добавляем в список для очистки
      createdTraders.push(result.id);
    });

    test("должен создать трейдера с продвинутыми настройками", async () => {
      // Ожидаемо: создаётся трейдер с кастомными rateConst, useConstRate, profitPercent, stakePercent
      const traderData = {
        email: `advanced-trader-${Date.now()}@example.com`,
        name: "Продвинутый Трейдер",
        balanceUsdt: 2000,
        trustBalance: 1000,
        rateConst: 95.5,
        useConstRate: true,
        profitPercent: 2.5,
        stakePercent: 1.0,
      };

      const response = await app.handle(
        new Request("http://localhost/admin/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(traderData),
        })
      );

      expect(response.status).toBe(201);
      
      const result = await response.json();
      expect(result).toHaveProperty("rateConst", traderData.rateConst);
      expect(result).toHaveProperty("useConstRate", traderData.useConstRate);
      expect(result).toHaveProperty("profitPercent", traderData.profitPercent);
      expect(result).toHaveProperty("stakePercent", traderData.stakePercent);

      createdTraders.push(result.id);
    });

    test("должен вернуть ошибку при дублировании email", async () => {
      // Ожидаемо: при создании трейдера с существующим email возвращается 409 CONFLICT
      const traderData = {
        email: `duplicate-trader-${Date.now()}@example.com`,
        name: "Первый Трейдер",
      };

      // Создаём первого трейдера
      const firstResponse = await app.handle(
        new Request("http://localhost/admin/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(traderData),
        })
      );

      const firstResult = await firstResponse.json();
      createdTraders.push(firstResult.id);

      // Пытаемся создать второго с тем же email
      const secondResponse = await app.handle(
        new Request("http://localhost/admin/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify({
            ...traderData,
            name: "Второй Трейдер",
          }),
        })
      );

      expect(secondResponse.status).toBe(409);
      
      const errorResult = await secondResponse.json();
      expect(errorResult).toHaveProperty("error");
      expect(errorResult.error).toContain("email");
    });

    test("должен валидировать email формат", async () => {
      // Ожидаемо: при некорректном email возвращается ошибка валидации
      const traderData = {
        email: "invalid-email-format",
        name: "Трейдер с некорректным email",
      };

      const response = await app.handle(
        new Request("http://localhost/admin/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(traderData),
        })
      );

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /admin/update-user - обновление трейдера", () => {
    let testTraderId: string;

    beforeEach(async () => {
      // Создаём тестового трейдера для обновления
      const trader = await db.user.create({
        data: {
          email: `update-test-trader-${Date.now()}@example.com`,
          name: "Трейдер для обновления",
          password: "test-hash",
          balanceUsdt: 1000,
          trustBalance: 500,
        },
      });
      testTraderId = trader.id;
      createdTraders.push(testTraderId);
    });

    test("должен обновить базовые поля трейдера", async () => {
      // Ожидаемо: обновляются email, name, balances, возвращается обновлённый объект
      const updateData = {
        id: testTraderId,
        email: `updated-trader-${Date.now()}@example.com`,
        name: "Обновлённый Трейдер",
        balanceUsdt: 2000,
        balanceRub: 100000,
        trustBalance: 1500,
      };

      const response = await app.handle(
        new Request("http://localhost/admin/update-user", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(updateData),
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("id", testTraderId);
      expect(result).toHaveProperty("email", updateData.email);
      expect(result).toHaveProperty("name", updateData.name);
      expect(result).toHaveProperty("balanceUsdt", updateData.balanceUsdt);
      expect(result).toHaveProperty("balanceRub", updateData.balanceRub);
      expect(result).toHaveProperty("trustBalance", updateData.trustBalance);
    });

    test("должен обновить продвинутые настройки", async () => {
      // Ожидаемо: обновляются rateConst, useConstRate, profitPercent, stakePercent, banned, rateSource
      const updateData = {
        id: testTraderId,
        email: `advanced-update-${Date.now()}@example.com`,
        name: "Продвинутое обновление",
        rateConst: 98.0,
        useConstRate: true,
        profitPercent: 3.0,
        stakePercent: 1.5,
        banned: true,
        rateSource: RateSource.RAPIRA,
      };

      const response = await app.handle(
        new Request("http://localhost/admin/update-user", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(updateData),
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("rateConst", updateData.rateConst);
      expect(result).toHaveProperty("useConstRate", updateData.useConstRate);
      expect(result).toHaveProperty("profitPercent", updateData.profitPercent);
      expect(result).toHaveProperty("stakePercent", updateData.stakePercent);
      expect(result).toHaveProperty("banned", updateData.banned);
      expect(result).toHaveProperty("rateSource", updateData.rateSource);
    });

    test("должен вернуть ошибку при обновлении несуществующего трейдера", async () => {
      // Ожидаемо: при обновлении трейдера с несуществующим ID возвращается 404
      const updateData = {
        id: "non-existent-trader-id",
        email: "test@example.com",
        name: "Несуществующий трейдер",
      };

      const response = await app.handle(
        new Request("http://localhost/admin/update-user", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(updateData),
        })
      );

      expect(response.status).toBe(404);
    });
  });

  describe("POST /admin/traders/:id/balance - изменение баланса трейдера", () => {
    let testTraderId: string;

    beforeEach(async () => {
      // Создаём трейдера с известными балансами
      const trader = await db.user.create({
        data: {
          email: `balance-test-trader-${Date.now()}@example.com`,
          name: "Трейдер для тестов баланса",
          password: "test-hash",
          balanceUsdt: 1000,
          balanceRub: 50000,
          trustBalance: 500,
          deposit: 100,
          frozenUsdt: 200,
          frozenRub: 10000,
          profitFromDeals: 50,
          profitFromPayouts: 25,
        },
      });
      testTraderId = trader.id;
      createdTraders.push(testTraderId);
    });

    test("должен увеличить USDT баланс", async () => {
      // Ожидаемо: баланс USDT увеличивается на указанную сумму, возвращается новый баланс
      const changeData = {
        amount: 500,
        currency: "USDT",
      };

      const response = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(changeData),
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("id", testTraderId);
      expect(result).toHaveProperty("balanceUsdt", 1500); // 1000 + 500
      expect(result).toHaveProperty("previousBalance", 1000);
      expect(result).toHaveProperty("newBalance", 1500);
      expect(result).toHaveProperty("currency", "USDT");
      expect(result).toHaveProperty("amount", 500);
    });

    test("должен уменьшить RUB баланс", async () => {
      // Ожидаемо: баланс RUB уменьшается на указанную сумму
      const changeData = {
        amount: -20000,
        currency: "RUB",
      };

      const response = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(changeData),
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("balanceRub", 30000); // 50000 - 20000
      expect(result).toHaveProperty("previousBalance", 50000);
      expect(result).toHaveProperty("newBalance", 30000);
    });

    test("должен изменить trustBalance (BALANCE)", async () => {
      // Ожидаемо: trustBalance изменяется корректно
      const changeData = {
        amount: 300,
        currency: "BALANCE",
      };

      const response = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(changeData),
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("trustBalance", 800); // 500 + 300
    });

    test("должен изменить замороженные средства", async () => {
      // Ожидаемо: frozenUsdt и frozenRub изменяются корректно
      const frozenUsdtData = {
        amount: 100,
        currency: "FROZEN_USDT",
      };

      const response1 = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(frozenUsdtData),
        })
      );

      expect(response1.status).toBe(200);
      const result1 = await response1.json();
      expect(result1).toHaveProperty("frozenUsdt", 300); // 200 + 100

      const frozenRubData = {
        amount: -5000,
        currency: "FROZEN_RUB",
      };

      const response2 = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(frozenRubData),
        })
      );

      expect(response2.status).toBe(200);
      const result2 = await response2.json();
      expect(result2).toHaveProperty("frozenRub", 5000); // 10000 - 5000
    });

    test("должен изменить профиты", async () => {
      // Ожидаемо: profitFromDeals и profitFromPayouts изменяются корректно
      const profitDealsData = {
        amount: 25,
        currency: "PROFIT_DEALS",
      };

      const response1 = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(profitDealsData),
        })
      );

      expect(response1.status).toBe(200);
      const result1 = await response1.json();
      expect(result1).toHaveProperty("profitFromDeals", 75); // 50 + 25

      const profitPayoutsData = {
        amount: 10,
        currency: "PROFIT_PAYOUTS",
      };

      const response2 = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(profitPayoutsData),
        })
      );

      expect(response2.status).toBe(200);
      const result2 = await response2.json();
      expect(result2).toHaveProperty("profitFromPayouts", 35); // 25 + 10
    });

    test("должен предотвратить отрицательный баланс", async () => {
      // Ожидаемо: при попытке сделать баланс отрицательным возвращается ошибка 400
      const changeData = {
        amount: -2000, // Больше чем текущий баланс USDT (1000)
        currency: "USDT",
      };

      const response = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(changeData),
        })
      );

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result).toHaveProperty("error");
      expect(result.error).toContain("Недостаточно средств");
    });

    test("должен вернуть ошибку для неверного типа валюты", async () => {
      // Ожидаемо: при неверном типе currency возвращается ошибка 400
      const changeData = {
        amount: 100,
        currency: "INVALID_CURRENCY",
      };

      const response = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/balance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(changeData),
        })
      );

      expect(response.status).toBe(400);
      
      const result = await response.json();
      expect(result).toHaveProperty("error");
      expect(result.error).toContain("Неверный тип валюты");
    });

    test("должен вернуть ошибку для несуществующего трейдера", async () => {
      // Ожидаемо: при изменении баланса несуществующего трейдера возвращается 404
      const changeData = {
        amount: 100,
        currency: "USDT",
      };

      const response = await app.handle(
        new Request("http://localhost/admin/traders/non-existent-id/balance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(changeData),
        })
      );

      expect(response.status).toBe(404);
    });
  });

  describe("GET /admin/user/:id - получение трейдера по ID", () => {
    let testTraderId: string;

    beforeEach(async () => {
      // Создаём трейдера с сессиями
      const trader = await db.user.create({
        data: {
          email: `get-test-trader-${Date.now()}@example.com`,
          name: "Трейдер для получения",
          password: "test-hash",
          balanceUsdt: 1000,
          trustBalance: 500,
          rateConst: 96.5,
          useConstRate: true,
          rateSource: RateSource.RAPIRA,
        },
      });
      testTraderId = trader.id;
      createdTraders.push(testTraderId);

      // Создаём несколько сессий
      await db.session.createMany({
        data: [
          {
            userId: testTraderId,
            ip: "192.168.1.1",
            expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24 часа
          },
          {
            userId: testTraderId,
            ip: "192.168.1.2",
            expiredAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // +12 часов
          },
        ],
      });
    });

    test("должен вернуть полную информацию о трейдере", async () => {
      // Ожидаемо: возвращается трейдер со всеми полями и сессиями
      const response = await app.handle(
        new Request(`http://localhost/admin/user/${testTraderId}`, {
          headers: { "x-admin-key": testAdminToken },
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("id", testTraderId);
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("name", "Трейдер для получения");
      expect(result).toHaveProperty("balanceUsdt", 1000);
      expect(result).toHaveProperty("balanceRub");
      expect(result).toHaveProperty("rateConst", 96.5);
      expect(result).toHaveProperty("useConstRate", true);
      expect(result).toHaveProperty("rateSource", RateSource.RAPIRA);
      expect(result).toHaveProperty("banned");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("sessions");
      expect(Array.isArray(result.sessions)).toBe(true);
      expect(result.sessions.length).toBe(2);

      // Проверяем структуру сессий
      const session = result.sessions[0];
      expect(session).toHaveProperty("id");
      expect(session).toHaveProperty("ip");
      expect(session).toHaveProperty("createdAt");
      expect(session).toHaveProperty("expiredAt");
    });

    test("должен вернуть ошибку для несуществующего трейдера", async () => {
      // Ожидаемо: при запросе несуществующего трейдера возвращается 404
      const response = await app.handle(
        new Request("http://localhost/admin/user/non-existent-id", {
          headers: { "x-admin-key": testAdminToken },
        })
      );

      expect(response.status).toBe(404);
      
      const result = await response.json();
      expect(result).toHaveProperty("error");
      expect(result.error).toContain("не найден");
    });
  });

  describe("DELETE /admin/delete-user - удаление трейдера", () => {
    let testTraderId: string;

    beforeEach(async () => {
      // Создаём трейдера для удаления
      const trader = await db.user.create({
        data: {
          email: `delete-test-trader-${Date.now()}@example.com`,
          name: "Трейдер для удаления",
          password: "test-hash",
          balanceUsdt: 1000,
        },
      });
      testTraderId = trader.id;
      // НЕ добавляем в createdTraders, так как будем удалять в тесте
    });

    test("должен успешно удалить трейдера", async () => {
      // Ожидаемо: трейдер удаляется, возвращается ok: true
      const deleteData = { id: testTraderId };

      const response = await app.handle(
        new Request("http://localhost/admin/delete-user", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(deleteData),
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("ok", true);

      // Проверяем, что трейдер действительно удалён
      const deletedTrader = await db.user.findUnique({
        where: { id: testTraderId },
      });
      expect(deletedTrader).toBeNull();
    });

    test("должен вернуть ошибку при удалении несуществующего трейдера", async () => {
      // Ожидаемо: при удалении несуществующего трейдера возвращается 404
      const deleteData = { id: "non-existent-trader-id" };

      const response = await app.handle(
        new Request("http://localhost/admin/delete-user", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(deleteData),
        })
      );

      expect(response.status).toBe(404);
      
      const result = await response.json();
      expect(result).toHaveProperty("error");
      expect(result.error).toContain("не найден");
    });
  });

  describe("POST /admin/ban-user - блокировка трейдера", () => {
    let testTraderId: string;

    beforeEach(async () => {
      // Создаём трейдера для блокировки
      const trader = await db.user.create({
        data: {
          email: `ban-test-trader-${Date.now()}@example.com`,
          name: "Трейдер для блокировки",
          password: "test-hash",
          banned: false,
        },
      });
      testTraderId = trader.id;
      createdTraders.push(testTraderId);
    });

    test("должен успешно заблокировать трейдера", async () => {
      // Ожидаемо: трейдер блокируется, banned устанавливается в true
      const banData = { id: testTraderId };

      const response = await app.handle(
        new Request("http://localhost/admin/ban-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(banData),
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("ok", true);

      // Проверяем, что трейдер действительно заблокирован
      const bannedTrader = await db.user.findUnique({
        where: { id: testTraderId },
        select: { banned: true },
      });
      expect(bannedTrader?.banned).toBe(true);
    });

    test("должен вернуть ошибку при блокировке несуществующего трейдера", async () => {
      // Ожидаемо: при блокировке несуществующего трейдера возвращается 404
      const banData = { id: "non-existent-trader-id" };

      const response = await app.handle(
        new Request("http://localhost/admin/ban-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(banData),
        })
      );

      expect(response.status).toBe(404);
      
      const result = await response.json();
      expect(result).toHaveProperty("error");
      expect(result.error).toContain("not found");
    });
  });

  describe("POST /admin/regenerate-password - сброс пароля", () => {
    let testTraderId: string;

    beforeEach(async () => {
      // Создаём трейдера для сброса пароля
      const trader = await db.user.create({
        data: {
          email: `password-test-trader-${Date.now()}@example.com`,
          name: "Трейдер для сброса пароля",
          password: "old-password-hash",
        },
      });
      testTraderId = trader.id;
      createdTraders.push(testTraderId);
    });

    test("должен сгенерировать новый пароль", async () => {
      // Ожидаемо: генерируется новый пароль, возвращается plaintext версия
      const passwordData = { id: testTraderId };

      const response = await app.handle(
        new Request("http://localhost/admin/regenerate-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(passwordData),
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("ok", true);
      expect(result).toHaveProperty("newPassword");
      expect(typeof result.newPassword).toBe("string");
      expect(result.newPassword.length).toBeGreaterThan(0);

      // Проверяем, что пароль действительно изменился в БД
      const updatedTrader = await db.user.findUnique({
        where: { id: testTraderId },
        select: { password: true },
      });
      expect(updatedTrader?.password).not.toBe("old-password-hash");
    });

    test("должен вернуть ошибку для несуществующего трейдера", async () => {
      // Ожидаемо: при сбросе пароля несуществующего трейдера возвращается 404
      const passwordData = { id: "non-existent-trader-id" };

      const response = await app.handle(
        new Request("http://localhost/admin/regenerate-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(passwordData),
        })
      );

      expect(response.status).toBe(404);
      
      const result = await response.json();
      expect(result).toHaveProperty("error");
      expect(result.error).toContain("не найден");
    });
  });

  describe("PATCH /admin/traders/:id/insurance-deposit - обновление страховых депозитов", () => {
    let testTraderId: string;

    beforeEach(async () => {
      // Создаём трейдера для обновления депозитов
      const trader = await db.user.create({
        data: {
          email: `insurance-test-trader-${Date.now()}@example.com`,
          name: "Трейдер для страховых депозитов",
          password: "test-hash",
          minInsuranceDeposit: 1000,
          maxInsuranceDeposit: 10000,
        },
      });
      testTraderId = trader.id;
      createdTraders.push(testTraderId);
    });

    test("должен обновить лимиты страховых депозитов", async () => {
      // Ожидаемо: обновляются minInsuranceDeposit и maxInsuranceDeposit
      const updateData = {
        minInsuranceDeposit: 2000,
        maxInsuranceDeposit: 20000,
      };

      const response = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/insurance-deposit`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(updateData),
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("trader");
      expect(result.trader).toHaveProperty("id", testTraderId);
      expect(result.trader).toHaveProperty("minInsuranceDeposit", 2000);
      expect(result.trader).toHaveProperty("maxInsuranceDeposit", 20000);
    });

    test("должен вернуть ошибку для несуществующего трейдера", async () => {
      // Ожидаемо: при обновлении депозитов несуществующего трейдера возвращается 404
      const updateData = {
        minInsuranceDeposit: 2000,
        maxInsuranceDeposit: 20000,
      };

      const response = await app.handle(
        new Request("http://localhost/admin/traders/non-existent-id/insurance-deposit", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(updateData),
        })
      );

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /admin/traders/:id/settings - обновление настроек трейдера", () => {
    let testTraderId: string;
    let testTeamId: string;
    let testAgentId: string;

    beforeEach(async () => {
      // Создаём агента и команду
      const agent = await db.agent.create({
        data: {
          email: `test-agent-${Date.now()}@example.com`,
          name: "Тестовый агент",
          password: "test-hash",
          commissionRate: 10,
        },
      });
      testAgentId = agent.id;

      const team = await db.team.create({
        data: {
          name: "Тестовая команда",
          agentId: testAgentId,
        },
      });
      testTeamId = team.id;

      // Создаём трейдера
      const trader = await db.user.create({
        data: {
          email: `settings-test-trader-${Date.now()}@example.com`,
          name: "Трейдер для настроек",
          password: "test-hash",
          minInsuranceDeposit: 1000,
          maxInsuranceDeposit: 10000,
          minAmountPerRequisite: 5000,
          maxAmountPerRequisite: 100000,
          disputeLimit: 3,
        },
      });
      testTraderId = trader.id;
      createdTraders.push(testTraderId);

      // Создаём связь агент-трейдер
      await db.agentTrader.create({
        data: {
          agentId: testAgentId,
          traderId: testTraderId,
        },
      });
    });

    afterEach(async () => {
      // Очищаем созданные данные
      await db.agentTrader.deleteMany({
        where: { traderId: testTraderId },
      });
      if (testTeamId) {
        await db.team.delete({ where: { id: testTeamId } });
      }
      if (testAgentId) {
        await db.agent.delete({ where: { id: testAgentId } });
      }
    });

    test("должен обновить все настройки трейдера", async () => {
      // Ожидаемо: обновляются все поля настроек, включая привязку к команде
      const updateData = {
        email: `updated-settings-trader-${Date.now()}@example.com`,
        name: "Обновлённые настройки трейдера",
        minInsuranceDeposit: 2000,
        maxInsuranceDeposit: 20000,
        minAmountPerRequisite: 10000,
        maxAmountPerRequisite: 200000,
        disputeLimit: 5,
        teamId: testTeamId,
      };

      const response = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/settings`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(updateData),
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("id", testTraderId);
      expect(result).toHaveProperty("email", updateData.email);
      expect(result).toHaveProperty("name", updateData.name);
      expect(result).toHaveProperty("minInsuranceDeposit", updateData.minInsuranceDeposit);
      expect(result).toHaveProperty("maxInsuranceDeposit", updateData.maxInsuranceDeposit);
      expect(result).toHaveProperty("minAmountPerRequisite", updateData.minAmountPerRequisite);
      expect(result).toHaveProperty("maxAmountPerRequisite", updateData.maxAmountPerRequisite);
      expect(result).toHaveProperty("disputeLimit", updateData.disputeLimit);
      expect(result).toHaveProperty("teamId", testTeamId);
      expect(result).toHaveProperty("team");
      expect(result.team).toHaveProperty("id", testTeamId);
      expect(result).toHaveProperty("agent");
      expect(result.agent).toHaveProperty("id", testAgentId);
    });

    test("должен вернуть ошибку при указании несуществующей команды", async () => {
      // Ожидаемо: при указании несуществующего teamId возвращается 404
      const updateData = {
        email: `test-trader-${Date.now()}@example.com`,
        name: "Тест с несуществующей командой",
        minInsuranceDeposit: 1000,
        maxInsuranceDeposit: 10000,
        minAmountPerRequisite: 5000,
        maxAmountPerRequisite: 100000,
        disputeLimit: 3,
        teamId: "non-existent-team-id",
      };

      const response = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/settings`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(updateData),
        })
      );

      expect(response.status).toBe(404);
      
      const result = await response.json();
      expect(result).toHaveProperty("error");
      expect(result.error).toContain("Команда не найдена");
    });

    test("должен обновить настройки без команды", async () => {
      // Ожидаемо: можно обновить настройки без указания teamId
      const updateData = {
        email: `no-team-trader-${Date.now()}@example.com`,
        name: "Трейдер без команды",
        minInsuranceDeposit: 1500,
        maxInsuranceDeposit: 15000,
        minAmountPerRequisite: 7500,
        maxAmountPerRequisite: 150000,
        disputeLimit: 4,
      };

      const response = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/settings`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": testAdminToken,
          },
          body: JSON.stringify(updateData),
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("email", updateData.email);
      expect(result).toHaveProperty("name", updateData.name);
      expect(result).toHaveProperty("minInsuranceDeposit", updateData.minInsuranceDeposit);
      expect(result).toHaveProperty("disputeLimit", updateData.disputeLimit);
    });
  });

  describe("GET /admin/traders/:id/profits - получение прибылей трейдера", () => {
    let testTraderId: string;

    beforeEach(async () => {
      // Создаём трейдера
      const trader = await db.user.create({
        data: {
          email: `profits-test-trader-${Date.now()}@example.com`,
          name: "Трейдер для прибылей",
          password: "test-hash",
        },
      });
      testTraderId = trader.id;
      createdTraders.push(testTraderId);

      // Создаём тестовые сделки и выплаты для расчёта прибыли
      await db.deal.createMany({
        data: [
          { traderId: testTraderId, profit: 100 },
          { traderId: testTraderId, profit: 150 },
          { traderId: testTraderId, profit: 75 },
        ],
      });

      await db.payout.createMany({
        data: [
          { traderId: testTraderId, amount: 50, status: "COMPLETED" },
          { traderId: testTraderId, amount: 80, status: "COMPLETED" },
          { traderId: testTraderId, amount: 30, status: "PENDING" }, // Не должен учитываться
        ],
      });
    });

    afterEach(async () => {
      // Очищаем созданные сделки и выплаты
      await db.deal.deleteMany({ where: { traderId: testTraderId } });
      await db.payout.deleteMany({ where: { traderId: testTraderId } });
    });

    test("должен вернуть корректные суммы прибылей", async () => {
      // Ожидаемо: возвращаются суммы profitFromDeals и profitFromPayouts на основе агрегации
      const response = await app.handle(
        new Request(`http://localhost/admin/traders/${testTraderId}/profits`, {
          headers: { "x-admin-key": testAdminToken },
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("profitFromDeals", 325); // 100 + 150 + 75
      expect(result).toHaveProperty("profitFromPayouts", 130); // 50 + 80 (30 не учитывается - статус PENDING)
    });

    test("должен вернуть нули для трейдера без сделок", async () => {
      // Создаём трейдера без сделок
      const emptyTrader = await db.user.create({
        data: {
          email: `empty-profits-trader-${Date.now()}@example.com`,
          name: "Трейдер без прибылей",
          password: "test-hash",
        },
      });
      createdTraders.push(emptyTrader.id);

      // Ожидаемо: для трейдера без сделок возвращаются нули
      const response = await app.handle(
        new Request(`http://localhost/admin/traders/${emptyTrader.id}/profits`, {
          headers: { "x-admin-key": testAdminToken },
        })
      );

      expect(response.status).toBe(200);
      
      const result = await response.json();
      expect(result).toHaveProperty("profitFromDeals", 0);
      expect(result).toHaveProperty("profitFromPayouts", 0);
    });
  });
});

