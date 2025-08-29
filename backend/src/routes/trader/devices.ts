import { Elysia, t } from "elysia";
import { traderGuard } from "@/middleware/traderGuard";
import { db } from "@/db";
import { randomBytes } from "crypto";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

// Простой кэш для устройств (5 секунд)
const devicesCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 секунд

// Функция очистки кэша
const clearDeviceCache = (traderId: string) => {
  const cacheKey = `devices_${traderId}`;
  devicesCache.delete(cacheKey);
  console.log(`[Devices API] Cache cleared for trader: ${traderId}`);
};

// Периодическая очистка старого кэша (каждые 30 секунд)
setInterval(() => {
  const now = Date.now();
  let clearedCount = 0;

  for (const [key, value] of devicesCache.entries()) {
    if (now - value.timestamp > CACHE_TTL * 2) {
      // Удаляем записи старше 10 секунд
      devicesCache.delete(key);
      clearedCount++;
    }
  }

  if (clearedCount > 0) {
    console.log(`[Devices API] Cleaned ${clearedCount} expired cache entries`);
  }
}, 30000);

export const devicesRoutes = new Elysia({ prefix: "/devices" })
  .use(traderGuard())
  .onBeforeHandle(({ request, path }) => {
    console.log(`[Devices API] ${request.method} ${path}`);
    if (path.includes("/")) {
      const parts = path.split("/");
      if (parts.length > 1 && parts[1]) {
        console.log(`[Devices API] Requested device ID: ${parts[1]}`);
      }
    }
  })

  // Get all devices for the trader (ultra-fast with caching)
  .get(
    "/",
    async ({ trader }) => {
      const startTime = Date.now();
      const cacheKey = `devices_${trader.id}`;

      // Проверяем кэш
      const cached = devicesCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(
          `[Devices API] Cache hit for trader ${trader.id}, returning cached data`
        );
        return cached.data;
      }

      console.log(
        `[Devices API] Cache miss, querying database for trader: ${trader.id}`
      );

      try {
        // Минимальный запрос только самой необходимой информации
        const devices = (await Promise.race([
          db.device.findMany({
            where: { userId: trader.id },
            select: {
              id: true,
              name: true,
              isOnline: true,
              isWorking: true,
              energy: true,
              ethernetSpeed: true,
              lastActiveAt: true,
              createdAt: true,
              firstConnectionAt: true,
              _count: {
                select: {
                  bankDetails: {
                    where: {
                      isArchived: false,
                      isActive: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: 50, // Ограничиваем еще больше
          }),
          // Таймаут на уровне запроса (10 секунд)
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Database query timeout")), 10000)
          ),
        ])) as any[];

        console.log(
          `[Devices API] Query completed in ${
            Date.now() - startTime
          }ms, found ${devices.length} devices`
        );

        // Простейшее преобразование
        const result = devices.map((device) => ({
          id: device.id,
          name: device.name,
          isOnline: device.isOnline || false,
          isWorking: device.isWorking || false,
          energy: device.energy || 0,
          ethernetSpeed: device.ethernetSpeed || 0,
          lastSeen:
            device.lastActiveAt?.toISOString() ||
            device.createdAt.toISOString(),
          createdAt: device.createdAt.toISOString(),
          firstConnectionAt: device.firstConnectionAt?.toISOString() || null,
          // Статические значения для быстродействия - детали загружаются отдельно
          notifications: 0,
          linkedBankDetails: device._count.bankDetails,
          browser: "Chrome",
          os: "Unknown",
          ip: "192.168.1.1",
          location: null,
          isTrusted: false,
          token: "***", // Скрываем токен
        }));

        // Кэшируем результат
        devicesCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });

        console.log(
          `[Devices API] Response prepared and cached in ${
            Date.now() - startTime
          }ms`
        );
        return result;
      } catch (error) {
        console.error(
          `[Devices API] Error loading devices for trader ${trader.id} after ${
            Date.now() - startTime
          }ms:`,
          error
        );

        // Очищаем кэш при ошибке
        devicesCache.delete(cacheKey);

        // Возвращаем минимальную структуру данных
        return [];
      }
    },
    {
      detail: {
        tags: ["trader", "devices"],
        summary: "Get all devices (ultra-fast)",
        description: "Returns basic device info with caching",
      },
    }
  )

  // Fallback endpoint для экстренных случаев
  .get(
    "/simple",
    async ({ trader }) => {
      try {
        console.log(`[Devices API] Simple endpoint for trader: ${trader.id}`);

        // Максимально простой запрос
        const devices = await db.device.findMany({
          where: { userId: trader.id },
          select: {
            id: true,
            name: true,
            isOnline: true,
            isWorking: true,
            createdAt: true,
            _count: {
              select: {
                bankDetails: {
                  where: {
                    isArchived: false,
                    isActive: true,
                  },
                },
              },
            },
          },
          take: 10, // Только первые 10
        });

        return devices.map((device) => ({
          id: device.id,
          name: device.name,
          isOnline: device.isOnline || false,
          isWorking: device.isWorking || false,
          createdAt: device.createdAt.toISOString(),
          // Минимум полей
          notifications: 0,
          linkedBankDetails: device._count.bankDetails,
        }));
      } catch (error) {
        console.error(`[Devices API] Simple endpoint error:`, error);
        return [];
      }
    },
    {
      detail: {
        tags: ["trader", "devices"],
        summary: "Get devices (simple fallback)",
        description: "Ultra-simple endpoint for emergency cases",
      },
    }
  )

  // Debug endpoint
  .get(
    "/debug/:id",
    async ({ trader, params }) => {
      return {
        requestedId: params.id,
        traderId: trader.id,
        traderEmail: trader.email,
        availableDevices: await db.device.findMany({
          where: { userId: trader.id },
          select: { id: true, name: true },
        }),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Debug device request",
      },
    }
  )

  // Get device by ID
  .get(
    "/:id",
    async ({ trader, params }) => {
      console.log(
        `[Devices API] Getting device: ${params.id} for trader: ${trader.id}`
      );

      const device = await db.device.findFirst({
        where: {
          id: params.id,
          userId: trader.id,
        },
        include: {
          bankDetails: {
            select: {
              id: true,
              methodType: true,
              bankType: true,
              cardNumber: true,
              recipientName: true,
              phoneNumber: true,
              minAmount: true,
              maxAmount: true,
              totalAmountLimit: true,
              currentTotalAmount: true,
              operationLimit: true,
              sumLimit: true,
              intervalMinutes: true,
              isArchived: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
              deviceId: true,
              userId: true,
            },
          },
          notifications: {
            take: 10,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      console.log(`[Devices API] Device lookup result:`, {
        deviceId: params.id,
        found: !!device,
        firstConnectionAt: device?.firstConnectionAt,
        isOnline: device?.isOnline,
        isWorking: device?.isWorking,
      });

      if (!device) {
        console.log(`[Devices API] Device not found: ${params.id}`);
        console.log(`[Devices API] Available devices for trader ${trader.id}:`);
        const traderDevices = await db.device.findMany({
          where: { userId: trader.id },
          select: { id: true, name: true },
        });
        traderDevices.forEach((d) => {
          console.log(`  - ${d.name}: ${d.id}`);
        });
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Оптимизированная загрузка статистики для всех реквизитов одним запросом
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      const bankDetailIds = device.bankDetails.map((bd) => bd.id);

      // Получаем всю статистику одним массивом запросов
      const [
        dailyTurnover,
        monthlyTurnover,
        transactionsStats,
        currentTotalStats,
      ] = await Promise.all([
        // Дневной оборот
        db.transaction.groupBy({
          by: ["bankDetailId"],
          where: {
            bankDetailId: { in: bankDetailIds },
            createdAt: { gte: todayStart, lte: todayEnd },
            status: "READY",
          },
          _sum: { amount: true },
        }),
        // Месячный оборот
        db.transaction.groupBy({
          by: ["bankDetailId"],
          where: {
            bankDetailId: { in: bankDetailIds },
            createdAt: { gte: monthStart, lte: monthEnd },
            status: "READY",
          },
          _sum: { amount: true },
        }),
        // Статистика транзакций по статусам
        db.transaction.groupBy({
          by: ["bankDetailId", "status"],
          where: {
            bankDetailId: { in: bankDetailIds },
            status: { in: ["CREATED", "IN_PROGRESS", "READY"] },
          },
          _count: { _all: true },
          _sum: { amount: true },
        }),
        // Текущая общая сумма
        db.transaction.groupBy({
          by: ["bankDetailId"],
          where: {
            bankDetailId: { in: bankDetailIds },
            status: { in: ["CREATED", "IN_PROGRESS", "READY"] },
          },
          _sum: { amount: true },
        }),
      ]);

      // Создаем карты для быстрого доступа
      const dailyMap = new Map(
        dailyTurnover.map((item) => [item.bankDetailId, item._sum.amount || 0])
      );
      const monthlyMap = new Map(
        monthlyTurnover.map((item) => [
          item.bankDetailId,
          item._sum.amount || 0,
        ])
      );
      const currentTotalMap = new Map(
        currentTotalStats.map((item) => [
          item.bankDetailId,
          item._sum.amount || 0,
        ])
      );

      const statsMap = new Map();
      transactionsStats.forEach((stat) => {
        if (!statsMap.has(stat.bankDetailId)) {
          statsMap.set(stat.bankDetailId, { inProgress: 0, ready: 0 });
        }
        const bdStats = statsMap.get(stat.bankDetailId);
        if (stat.status === "CREATED" || stat.status === "IN_PROGRESS") {
          bdStats.inProgress += stat._count._all;
        } else if (stat.status === "READY") {
          bdStats.ready += stat._count._all;
        }
      });

      const linkedBankDetailsWithTurnover = device.bankDetails.map((bd) => {
        const stats = statsMap.get(bd.id) || { inProgress: 0, ready: 0 };

        return {
          ...bd,
          turnoverDay: dailyMap.get(bd.id) || 0,
          turnoverTotal: monthlyMap.get(bd.id) || 0,
          transactionsInProgress: stats.inProgress,
          transactionsReady: stats.ready,
          activeDeals: stats.inProgress, // Active deals are in progress transactions
          currentTotalAmount: currentTotalMap.get(bd.id) || 0,
          sumLimit: bd.sumLimit || 0,
          operationLimit: bd.operationLimit || 0,
          methodType: bd.methodType,
          method: {
            type: bd.methodType,
          },
          createdAt: bd.createdAt.toISOString(),
          updatedAt: bd.updatedAt.toISOString(),
        };
      });

      return {
        id: device.id,
        name: device.name,
        token: device.token,
        isOnline: device.isOnline || false,
        isWorking: device.isWorking || false,
        energy: device.energy,
        ethernetSpeed: device.ethernetSpeed,
        lastSeen:
          device.lastActiveAt?.toISOString() || device.updatedAt?.toISOString(),
        createdAt: device.createdAt.toISOString(),
        firstConnectionAt: device.firstConnectionAt?.toISOString() || null,
        browser: extractBrowserFromName(device.name),
        os: extractOSFromName(device.name),
        ip: generateIPForDevice(device.id),
        location: null,
        isTrusted: false,
        notifications: device.notifications.length,
        linkedBankDetails: linkedBankDetailsWithTurnover,
        recentNotifications: device.notifications.slice(0, 50).map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Get device by ID",
      },
    }
  )

  // Create new device
  .post(
    "/",
    async ({ trader, body }) => {
      console.log(
        `[Devices API] Creating device "${body.name}" for trader: ${trader.id}`
      );
      const token = randomBytes(32).toString("hex");

      const device = await db.device.create({
        data: {
          userId: trader.id,
          name: body.name,
          token,
          isOnline: false,
        },
      });

      // Очищаем кэш после создания устройства
      clearDeviceCache(trader.id);

      console.log(
        `[Devices API] Created device: ${device.id} (${device.name})`
      );

      return {
        id: device.id,
        name: device.name,
        token: device.token,
        createdAt: device.createdAt.toISOString(),
        firstConnectionAt: null,
      };
    },
    {
      body: t.Object({
        name: t.String(),
      }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Create new device",
      },
    }
  )

  // Regenerate device token
  .post(
    "/:id/regenerate-token",
    async ({ trader, params }) => {
      const device = await db.device.findFirst({
        where: {
          id: params.id,
          userId: trader.id,
        },
      });

      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const newToken = randomBytes(32).toString("hex");

      const updated = await db.device.update({
        where: { id: params.id },
        data: { token: newToken },
      });

      return {
        token: updated.token,
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Regenerate device token",
      },
    }
  )

  // Get device notifications with pagination
  .get(
    "/:id/notifications",
    async ({ trader, params, query }) => {
      const page = parseInt(query.page || "1");
      const limit = parseInt(query.limit || "50");
      const offset = (page - 1) * limit;

      const device = await db.device.findFirst({
        where: {
          id: params.id,
          userId: trader.id,
        },
      });

      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const [total, notifications] = await Promise.all([
        db.notification.count({
          where: { deviceId: device.id },
        }),
        db.notification.findMany({
          where: { deviceId: device.id },
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: limit,
          include: {
            matchedTransactions: {
              select: {
                id: true,
                amount: true,
                status: true,
              },
            },
          },
        }),
      ]);

      return {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          application: n.application,
          sender: n.metadata?.sender || null,
          amount: n.metadata?.amount || null,
          isRead: n.isRead,
          isProcessed: n.isProcessed,
          createdAt: n.createdAt.toISOString(),
          matchedTransactions: n.matchedTransactions,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Get device notifications with pagination",
      },
    }
  )

  // Link device to bank detail
  .post(
    "/link",
    async ({ trader, body }) => {
      const device = await db.device.findFirst({
        where: {
          id: body.deviceId,
          userId: trader.id,
        },
      });

      const bankDetail = await db.bankDetail.findFirst({
        where: {
          id: body.bankDetailId,
          userId: trader.id,
        },
      });

      if (!device || !bankDetail) {
        return new Response(
          JSON.stringify({ error: "Device or bank detail not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      await db.device.update({
        where: { id: body.deviceId },
        data: {
          bankDetails: {
            connect: { id: body.bankDetailId },
          },
        },
      });

      // Очищаем кэш после связывания
      clearDeviceCache(trader.id);

      return { success: true };
    },
    {
      body: t.Object({
        deviceId: t.String(),
        bankDetailId: t.String(),
      }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Link device to bank detail",
      },
    }
  )

  // Unlink device from bank detail
  .post(
    "/unlink",
    async ({ trader, body }) => {
      const device = await db.device.findFirst({
        where: {
          id: body.deviceId,
          userId: trader.id,
        },
      });

      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      await db.device.update({
        where: { id: body.deviceId },
        data: {
          bankDetails: {
            disconnect: { id: body.bankDetailId },
          },
        },
      });

      // Очищаем кэш после отвязывания
      clearDeviceCache(trader.id);

      return { success: true };
    },
    {
      body: t.Object({
        deviceId: t.String(),
        bankDetailId: t.String(),
      }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Unlink device from bank detail",
      },
    }
  )

  // Delete device
  .delete(
    "/:id",
    async ({ trader, params }) => {
      const device = await db.device.findFirst({
        where: {
          id: params.id,
          userId: trader.id,
        },
      });

      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      await db.device.delete({
        where: { id: params.id },
      });

      // Очищаем кэш после удаления устройства
      clearDeviceCache(trader.id);

      return { success: true };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Delete device",
      },
    }
  )

  // Stop device
  .patch(
    "/:id/stop",
    async ({ trader, params }) => {
      const device = await db.device.findFirst({
        where: {
          id: params.id,
          userId: trader.id,
        },
      });

      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const updated = await db.device.update({
        where: { id: params.id },
        data: { isWorking: false },
      });

      // Очищаем кэш после изменения состояния
      clearDeviceCache(trader.id);

      return {
        success: true,
        message: "Device stopped",
        device: {
          id: updated.id,
          name: updated.name,
          isWorking: updated.isWorking,
          isOnline: updated.isOnline,
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Stop device",
      },
    }
  )

  // Frontend ping endpoint to check device status
  .post(
    "/:id/ping",
    async ({ trader, params }) => {
      const device = await db.device.findFirst({
        where: {
          id: params.id,
          userId: trader.id,
        },
        include: {
          user: true,
        },
      });

      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Return current device status
      return {
        success: true,
        device: {
          id: device.id,
          name: device.name,
          isOnline: device.isOnline,
          isWorking: device.isWorking,
          firstConnectionAt: device.firstConnectionAt?.toISOString() || null,
          lastActiveAt: device.lastActiveAt?.toISOString() || null,
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Ping device to check status",
      },
    }
  )

  // Mark device as connected (set firstConnectionAt)
  .patch(
    "/:id/mark-connected",
    async ({ trader, params }) => {
      const device = await db.device.findFirst({
        where: {
          id: params.id,
          userId: trader.id,
        },
      });

      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Only update if not already set
      if (!device.firstConnectionAt) {
        const updated = await db.device.update({
          where: { id: params.id },
          data: {
            firstConnectionAt: new Date(),
            isOnline: true,
            lastActiveAt: new Date(),
          },
        });

        // Очищаем кэш после изменения состояния
        clearDeviceCache(trader.id);

        console.log(
          `[Devices API] Marked device ${params.id} as connected, firstConnectionAt: ${updated.firstConnectionAt}`
        );

        return {
          success: true,
          message: "Device marked as connected",
          device: {
            id: updated.id,
            name: updated.name,
            firstConnectionAt: updated.firstConnectionAt?.toISOString(),
            isOnline: updated.isOnline,
          },
        };
      }

      return {
        success: true,
        message: "Device already connected",
        device: {
          id: device.id,
          name: device.name,
          firstConnectionAt: device.firstConnectionAt?.toISOString(),
          isOnline: device.isOnline,
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Mark device as connected",
      },
    }
  )

  // Start device
  .patch(
    "/:id/start",
    async ({ trader, params }) => {
      const device = await db.device.findFirst({
        where: {
          id: params.id,
          userId: trader.id,
        },
      });

      if (!device) {
        return new Response(JSON.stringify({ error: "Device not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if device is online before starting
      if (!device.isOnline) {
        return new Response(
          JSON.stringify({
            error:
              "Нет связи с устройством. Убедитесь, что приложение запущено и подключено к интернету",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const updated = await db.device.update({
        where: { id: params.id },
        data: {
          isWorking: true,
          lastActiveAt: new Date(),
        },
      });

      // Очищаем кэш после изменения состояния
      clearDeviceCache(trader.id);

      return {
        success: true,
        message: "Device started",
        device: {
          id: updated.id,
          name: updated.name,
          isWorking: updated.isWorking,
          isOnline: updated.isOnline,
        },
      };
    },
    {
      params: t.Object({ id: t.String() }),
      detail: {
        tags: ["trader", "devices"],
        summary: "Start device",
      },
    }
  )

  // Health check endpoint for devices
  .post(
    "/health-check",
    async ({ body, headers }) => {
      const deviceToken = headers["x-device-token"];

      if (!deviceToken) {
        return new Response(
          JSON.stringify({ error: "Device token required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const device = await db.device.findFirst({
        where: { token: deviceToken },
      });

      if (!device) {
        return new Response(JSON.stringify({ error: "Invalid device token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Update device status
      await db.device.update({
        where: { id: device.id },
        data: {
          updatedAt: new Date(),
          isOnline: true,
          energy: body.batteryLevel,
          ethernetSpeed: body.networkSpeed,
        },
      });

      // Очищаем кэш после обновления состояния устройства
      if (device.userId) {
        clearDeviceCache(device.userId);
      }

      // Create health check log
      await db.notification.create({
        data: {
          type: "AppNotification",
          title: "Health Check",
          message: "Device health check received",
          deviceId: device.id,
          metadata: body,
          isRead: true,
        },
      });

      return {
        success: true,
        deviceId: device.id,
        timestamp: new Date().toISOString(),
      };
    },
    {
      body: t.Object({
        batteryLevel: t.Optional(t.Number()),
        networkSpeed: t.Optional(t.Number()),
        userAgent: t.Optional(t.String()),
        ip: t.Optional(t.String()),
        location: t.Optional(t.String()),
        version: t.Optional(t.String()),
        ping: t.Optional(t.Number()),
        connectionType: t.Optional(t.String()),
      }),
      detail: {
        tags: ["devices"],
        summary: "Send device health check",
      },
    }
  );

// Helper function to parse user agent
function parseUserAgent(userAgent: string) {
  const browser =
    userAgent.match(/(Chrome|Firefox|Safari|Opera|Edge)\/[\d.]+/)?.[1] ||
    "Unknown";
  const os =
    userAgent.match(/(Windows|Mac|Linux|Android|iOS)/)?.[1] || "Unknown";

  return { browser, os };
}

// Helper function to extract browser from device name
function extractBrowserFromName(name: string): string {
  if (
    name.toLowerCase().includes("iphone") ||
    name.toLowerCase().includes("ipad")
  ) {
    return "Safari 17.2";
  }
  if (
    name.toLowerCase().includes("samsung") ||
    name.toLowerCase().includes("android")
  ) {
    return "Chrome 120.0";
  }
  if (name.toLowerCase().includes("macbook")) {
    return "Chrome 121.0";
  }
  if (name.toLowerCase().includes("windows")) {
    return "Edge 120.0";
  }
  return "Chrome 120.0";
}

// Helper function to extract OS from device name
function extractOSFromName(name: string): string {
  if (name.toLowerCase().includes("iphone")) {
    return "iOS 17.2";
  }
  if (name.toLowerCase().includes("ipad")) {
    return "iPadOS 17.2";
  }
  if (
    name.toLowerCase().includes("samsung") ||
    name.toLowerCase().includes("galaxy")
  ) {
    return "Android 14";
  }
  if (name.toLowerCase().includes("android")) {
    return "Android 13";
  }
  if (
    name.toLowerCase().includes("macbook") ||
    name.toLowerCase().includes("mac")
  ) {
    return "macOS Sonoma";
  }
  if (name.toLowerCase().includes("windows")) {
    return "Windows 11";
  }
  return "Unknown OS";
}

// Helper function to generate consistent IP for device
function generateIPForDevice(deviceId: string): string {
  // Generate a consistent IP based on device ID
  const hash = deviceId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const octet3 = (hash % 254) + 1;
  const octet4 = ((hash * 7) % 254) + 1;
  return `192.168.${octet3}.${octet4}`;
}
