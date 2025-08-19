import { Elysia, t } from "elysia";
import { db } from "@/db";
import { Prisma, MethodType, Currency, RateSource } from "@prisma/client";
import ErrorSchema from "@/types/error";

/**
 * Маршруты для управления методами платежей и их связями с мерчантами
 * Доступны только для администраторов
 */
export default (app: Elysia) =>
  app
    /* ───────── POST /admin/merchant/methods/create ───────── */
    .post(
      "/create",
      async ({ body, error }) => {
        try {
          // Создание нового метода платежа
          const method = await db.method.create({
            data: {
              code: body.code,
              name: body.name,
              type: body.type,
              currency: "usdt", // Always USDT
              commissionPayin: body.commissionPayin,
              commissionPayout: body.commissionPayout,
              maxPayin: body.maxPayin,
              minPayin: body.minPayin,
              maxPayout: body.maxPayout,
              minPayout: body.minPayout,
              chancePayin: body.chancePayin,
              chancePayout: body.chancePayout,
              isEnabled: body.isEnabled ?? true,
              rateSource: body.rateSource ?? "bybit",
            },
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
              currency: true,
              commissionPayin: true,
              commissionPayout: true,
              maxPayin: true,
              minPayin: true,
              maxPayout: true,
              minPayout: true,
              chancePayin: true,
              chancePayout: true,
              isEnabled: true,
              rateSource: true,
            },
          });

          // Возвращаем созданный метод с кодом 201 (Created)
          return new Response(JSON.stringify(method), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          // Обработка ошибки дублирования кода метода
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            return error(409, { error: "Метод с таким кодом уже существует" });
          }
          throw e;
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Создание нового метода платежа" },
        headers: t.Object({ "x-admin-key": t.String() }),
        body: t.Object({
          code: t.String({ description: "Уникальный код метода" }),
          name: t.String({ description: "Название метода" }),
          type: t.Enum(MethodType, { description: "Тип метода" }),
          commissionPayin: t.Number({ description: "Комиссия для входящих платежей" }),
          commissionPayout: t.Number({ description: "Комиссия для исходящих платежей" }),
          maxPayin: t.Number({ description: "Максимальная сумма для входящего платежа" }),
          minPayin: t.Number({ description: "Минимальная сумма для входящего платежа" }),
          maxPayout: t.Number({ description: "Максимальная сумма для исходящего платежа" }),
          minPayout: t.Number({ description: "Минимальная сумма для исходящего платежа" }),
          chancePayin: t.Number({ description: "Вероятность успеха для входящего платежа" }),
          chancePayout: t.Number({ description: "Вероятность успеха для исходящего платежа" }),
          isEnabled: t.Optional(t.Boolean({ description: "Активен ли метод, по умолчанию true" })),
          rateSource: t.Optional(t.Enum(RateSource), { description: "Источник курса валют, по умолчанию bybit (также доступен rapira)" }),
        }),
        response: {
          201: t.Object({
            id: t.String(),
            code: t.String(),
            name: t.String(),
            type: t.Enum(MethodType),
            currency: t.Enum(Currency),
            commissionPayin: t.Number(),
            commissionPayout: t.Number(),
            maxPayin: t.Number(),
            minPayin: t.Number(),
            maxPayout: t.Number(),
            minPayout: t.Number(),
            chancePayin: t.Number(),
            chancePayout: t.Number(),
            isEnabled: t.Boolean(),
            rateSource: t.Enum(RateSource),
          }),
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────── GET /admin/merchant/methods/list ───────── */
    .get(
      "/list",
      async () => {
        // Получение всех методов платежа
        const methods = await db.method.findMany();
        return methods;
      },
      {
        tags: ["admin"],
        detail: { summary: "Получение списка всех методов платежа" },
        headers: t.Object({ "x-admin-key": t.String() }),
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
              commissionPayin: t.Number(),
              commissionPayout: t.Number(),
              maxPayin: t.Number(),
              minPayin: t.Number(),
              maxPayout: t.Number(),
              minPayout: t.Number(),
              chancePayin: t.Number(),
              chancePayout: t.Number(),
              isEnabled: t.Boolean(),
              rateSource: t.Enum(RateSource),
            }),
          ),
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────── GET /admin/merchant/methods/:id ───────── */
    .get(
      "/:id",
      async ({ params, error }) => {
        try {
          // Получение метода платежа по ID
          const method = await db.method.findUniqueOrThrow({
            where: { id: params.id },
          });
          return method;
        } catch (e) {
          // Обработка ошибки, если метод не найден
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          ) {
            return error(404, { error: "Метод не найден" });
          }
          throw e;
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Получение метода платежа по ID" },
        headers: t.Object({ "x-admin-key": t.String() }),
        params: t.Object({
          id: t.String({ description: "ID метода платежа" }),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            code: t.String(),
            name: t.String(),
            type: t.Enum(MethodType),
            currency: t.Enum(Currency),
            commissionPayin: t.Number(),
            commissionPayout: t.Number(),
            maxPayin: t.Number(),
            minPayin: t.Number(),
            maxPayout: t.Number(),
            minPayout: t.Number(),
            chancePayin: t.Number(),
            chancePayout: t.Number(),
            isEnabled: t.Boolean(),
            rateSource: t.Enum(RateSource),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────── PUT /admin/merchant/methods/update ───────── */
    .put(
      "/update",
      async ({ body, error }) => {
        try {
          // Обновление метода платежа
          const method = await db.method.update({
            where: { id: body.id },
            data: {
              code: body.code,
              name: body.name,
              type: body.type,
              currency: "usdt", // Always USDT
              commissionPayin: body.commissionPayin,
              commissionPayout: body.commissionPayout,
              maxPayin: body.maxPayin,
              minPayin: body.minPayin,
              maxPayout: body.maxPayout,
              minPayout: body.minPayout,
              chancePayin: body.chancePayin,
              chancePayout: body.chancePayout,
              isEnabled: body.isEnabled,
              rateSource: body.rateSource,
            },
          });
          return method;
        } catch (e) {
          // Обработка ошибки, если метод не найден
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          ) {
            return error(404, { error: "Метод не найден" });
          }
          // Обработка ошибки дублирования кода метода
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            return error(409, { error: "Метод с таким кодом уже существует" });
          }
          throw e;
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Обновление метода платежа" },
        headers: t.Object({ "x-admin-key": t.String() }),
        body: t.Object({
          id: t.String({ description: "ID метода платежа" }),
          code: t.String({ description: "Уникальный код метода" }),
          name: t.String({ description: "Название метода" }),
          type: t.Enum(MethodType, { description: "Тип метода" }),
          commissionPayin: t.Number({ description: "Комиссия для входящих платежей" }),
          commissionPayout: t.Number({ description: "Комиссия для исходящих платежей" }),
          maxPayin: t.Number({ description: "Максимальная сумма для входящего платежа" }),
          minPayin: t.Number({ description: "Минимальная сумма для входящего платежа" }),
          maxPayout: t.Number({ description: "Максимальная сумма для исходящего платежа" }),
          minPayout: t.Number({ description: "Минимальная сумма для исходящего платежа" }),
          chancePayin: t.Number({ description: "Вероятность успеха для входящего платежа" }),
          chancePayout: t.Number({ description: "Вероятность успеха для исходящего платежа" }),
          isEnabled: t.Boolean({ description: "Активен ли метод" }),
          rateSource: t.Enum(RateSource, { description: "Источник курса валют" }),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            code: t.String(),
            name: t.String(),
            type: t.Enum(MethodType),
            currency: t.Enum(Currency),
            commissionPayin: t.Number(),
            commissionPayout: t.Number(),
            maxPayin: t.Number(),
            minPayin: t.Number(),
            maxPayout: t.Number(),
            minPayout: t.Number(),
            chancePayin: t.Number(),
            chancePayout: t.Number(),
            isEnabled: t.Boolean(),
            rateSource: t.Enum(RateSource),
          }),
          404: ErrorSchema,
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────── DELETE /admin/merchant/methods/delete ───────── */
    .delete(
      "/delete",
      async ({ body, error }) => {
        try {
          // Удаление метода платежа
          await db.method.delete({ where: { id: body.id } });
          return { ok: true };
        } catch (e) {
          // Обработка ошибки, если метод не найден
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          ) {
            return error(404, { error: "Метод не найден" });
          }
          // Обработка ошибки, если метод используется в транзакциях
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2003"
          ) {
            return error(400, { error: "Невозможно удалить метод, так как он используется в транзакциях" });
          }
          throw e;
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Удаление метода платежа" },
        headers: t.Object({ "x-admin-key": t.String() }),
        body: t.Object({ id: t.String({ description: "ID метода платежа" }) }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema,
          400: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────── POST /admin/merchant/methods/assign ───────── */
    .post(
      "/assign",
      async ({ body, error }) => {
        try {
          // Проверка существования мерчанта
          const merchant = await db.merchant.findUnique({
            where: { id: body.merchantId },
          });
          if (!merchant) {
            return error(404, { error: "Мерчант не найден" });
          }

          // Проверка существования метода
          const method = await db.method.findUnique({
            where: { id: body.methodId },
          });
          if (!method) {
            return error(404, { error: "Метод не найден" });
          }

          // Создание связи между мерчантом и методом
          const merchantMethod = await db.merchantMethod.create({
            data: {
              merchantId: body.merchantId,
              methodId: body.methodId,
              isEnabled: body.isEnabled ?? true,
            },
            include: {
              merchant: true,
              method: true,
            },
          });

          // Преобразуем поле createdAt в строку для соответствия схеме ответа
          const response = {
            ...merchantMethod,
            merchant: {
              ...merchantMethod.merchant,
              createdAt: merchantMethod.merchant.createdAt.toISOString(),
            },
          };

          return response;
        } catch (e) {
          // Обработка ошибки дублирования связи
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            return error(409, { error: "Данный метод уже назначен этому мерчанту" });
          }
          throw e;
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Назначение метода платежа мерчанту" },
        headers: t.Object({ "x-admin-key": t.String() }),
        body: t.Object({
          merchantId: t.String({ description: "ID мерчанта" }),
          methodId: t.String({ description: "ID метода платежа" }),
          isEnabled: t.Optional(t.Boolean({ description: "Активен ли метод для данного мерчанта, по умолчанию true" })),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            merchantId: t.String(),
            methodId: t.String(),
            isEnabled: t.Boolean(),
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
              token: t.String(),
              createdAt: t.String(),
            }),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
              commissionPayin: t.Number(),
              commissionPayout: t.Number(),
              maxPayin: t.Number(),
              minPayin: t.Number(),
              maxPayout: t.Number(),
              minPayout: t.Number(),
              chancePayin: t.Number(),
              chancePayout: t.Number(),
              isEnabled: t.Boolean(),
              rateSource: t.Enum(RateSource),
            }),
          }),
          404: ErrorSchema,
          409: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────── PUT /admin/merchant/methods/toggle ───────── */
    .put(
      "/toggle",
      async ({ body, error }) => {
        try {
          // Обновление статуса активности метода для мерчанта
          const merchantMethod = await db.merchantMethod.update({
            where: {
              id: body.id,
            },
            data: {
              isEnabled: body.isEnabled,
            },
            include: {
              merchant: true,
              method: true,
            },
          });

          // Преобразуем поле createdAt в строку для соответствия схеме ответа
          const response = {
            ...merchantMethod,
            merchant: {
              ...merchantMethod.merchant,
              createdAt: merchantMethod.merchant.createdAt.toISOString(),
            },
          };

          return response;
        } catch (e) {
          // Обработка ошибки, если связь не найдена
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          ) {
            return error(404, { error: "Связь мерчанта с методом не найдена" });
          }
          throw e;
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Включение/выключение метода платежа для мерчанта" },
        headers: t.Object({ "x-admin-key": t.String() }),
        body: t.Object({
          id: t.String({ description: "ID связи мерчанта с методом" }),
          isEnabled: t.Boolean({ description: "Активен ли метод для данного мерчанта" }),
        }),
        response: {
          200: t.Object({
            id: t.String(),
            merchantId: t.String(),
            methodId: t.String(),
            isEnabled: t.Boolean(),
            merchant: t.Object({
              id: t.String(),
              name: t.String(),
              token: t.String(),
              createdAt: t.String(),
            }),
            method: t.Object({
              id: t.String(),
              code: t.String(),
              name: t.String(),
              type: t.Enum(MethodType),
              currency: t.Enum(Currency),
              commissionPayin: t.Number(),
              commissionPayout: t.Number(),
              maxPayin: t.Number(),
              minPayin: t.Number(),
              maxPayout: t.Number(),
              minPayout: t.Number(),
              chancePayin: t.Number(),
              chancePayout: t.Number(),
              isEnabled: t.Boolean(),
              rateSource: t.Enum(RateSource),
            }),
          }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────── DELETE /admin/merchant/methods/unassign ───────── */
    .delete(
      "/unassign",
      async ({ body, error }) => {
        try {
          // Удаление связи между мерчантом и методом
          await db.merchantMethod.delete({
            where: {
              id: body.id,
            },
          });

          return { ok: true };
        } catch (e) {
          // Обработка ошибки, если связь не найдена
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2025"
          ) {
            return error(404, { error: "Связь мерчанта с методом не найдена" });
          }
          throw e;
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Удаление метода платежа у мерчанта" },
        headers: t.Object({ "x-admin-key": t.String() }),
        body: t.Object({
          id: t.String({ description: "ID связи мерчанта с методом" }),
        }),
        response: {
          200: t.Object({ ok: t.Boolean() }),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    )

    /* ───────── GET /admin/merchant/methods/merchant/:id ───────── */
    .get(
      "/merchant/:id",
      async ({ params, error }) => {
        try {
          // Проверка существования мерчанта
          const merchant = await db.merchant.findUnique({
            where: { id: params.id },
          });
          if (!merchant) {
            return error(404, { error: "Мерчант не найден" });
          }

          // Получение всех методов платежа для мерчанта
          const merchantMethods = await db.merchantMethod.findMany({
            where: {
              merchantId: params.id,
            },
            include: {
              method: true,
            },
          });

          return merchantMethods;
        } catch (e) {
          throw e;
        }
      },
      {
        tags: ["admin"],
        detail: { summary: "Получение всех методов платежа для мерчанта" },
        headers: t.Object({ "x-admin-key": t.String() }),
        params: t.Object({
          id: t.String({ description: "ID мерчанта" }),
        }),
        response: {
          200: t.Array(
            t.Object({
              id: t.String(),
              merchantId: t.String(),
              methodId: t.String(),
              isEnabled: t.Boolean(),
              method: t.Object({
                id: t.String(),
                code: t.String(),
                name: t.String(),
                type: t.Enum(MethodType),
                currency: t.Enum(Currency),
                commissionPayin: t.Number(),
                commissionPayout: t.Number(),
                maxPayin: t.Number(),
                minPayin: t.Number(),
                maxPayout: t.Number(),
                minPayout: t.Number(),
                chancePayin: t.Number(),
                chancePayout: t.Number(),
                isEnabled: t.Boolean(),
                rateSource: t.Enum(RateSource),
              }),
            }),
          ),
          404: ErrorSchema,
          401: ErrorSchema,
          403: ErrorSchema,
        },
      },
    );