import { Elysia, t } from "elysia";
import { db } from "@/db";
import ErrorSchema from "@/types/error";
import { MASTER_KEY } from "@/utils/constants";

export default new Elysia({ prefix: "/system-config" })
  // Derive adminId and clientIp from request context
  .derive(async ({ request, ip }) => {
    const adminToken = request.headers.get("x-admin-key");
    let adminId = "system";
    
    // If it's not the master key, find the admin
    if (adminToken && adminToken !== MASTER_KEY) {
      const admin = await db.admin.findUnique({
        where: { token: adminToken },
        select: { id: true }
      });
      if (admin) {
        adminId = admin.id;
      }
    }
    
    return {
      adminId,
      clientIp: ip
    };
  })
  
  // Get all system configs
  .get("/", async () => {
    try {
      const configs = await db.systemConfig.findMany({
        orderBy: { key: 'asc' }
      });

      return configs;
    } catch (error) {
      console.error("Failed to get system configs:", error);
      throw new Error("Failed to get system configs");
    }
  }, {
    tags: ["admin"],
    detail: { summary: "Get all system configurations" },
    response: {
      200: t.Array(t.Object({
        key: t.String(),
        value: t.String()
      })),
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema
    }
  })
  
  // Get single config
  .get("/:key", async ({ params }) => {
    try {
      const config = await db.systemConfig.findUnique({
        where: { key: params.key }
      });

      if (!config) {
        throw new Error("Config not found");
      }

      return config;
    } catch (error) {
      console.error("Failed to get system config:", error);
      throw new Error("Failed to get system config");
    }
  }, {
    tags: ["admin"],
    detail: { summary: "Get single system configuration" },
    response: {
      200: t.Object({
        key: t.String(),
        value: t.String()
      }),
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema
    }
  })
  
  // Update or create config
  .post("/", async ({ body, adminId, clientIp, set }) => {
    try {
      const { key, value } = body;

      // Validate key format
      if (!/^[a-zA-Z_]+$/.test(key)) {
        set.status = 400;
        return { error: "Invalid key format. Use letters and underscores only." };
      }

      // List of allowed config keys
      const allowedKeys = [
        'deposit_wallet_address',
        'min_deposit_amount',
        'deposit_confirmations_required',
        'deposit_expiry_minutes',
        'min_withdrawal_amount',
        'kkk_percent',
        'rate_margin',
        'default_rate',
        'maintenance_mode',
        'registration_enabled',
        'disputeDayShiftStartHour',
        'disputeDayShiftEndHour',
        'disputeDayShiftTimeoutMinutes',
        'disputeNightShiftTimeoutMinutes',
        'site_base_url'
      ];

      if (!allowedKeys.includes(key)) {
        set.status = 400;
        return { error: "Invalid config key" };
      }

      // Upsert config
      const config = await db.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });

      // Log admin action
      await db.adminLog.create({
        data: {
          adminId,
          action: "SYSTEM_CONFIG_UPDATED",
          details: `Updated config ${key} to value: ${value}`,
          ip: clientIp
        }
      });

      return {
        success: true,
        config
      };
    } catch (error) {
      console.error("Failed to update system config:", error);
      set.status = 500;
      return { error: "Failed to update system config" };
    }
  }, {
    tags: ["admin"],
    detail: { summary: "Update or create system configuration" },
    body: t.Object({
      key: t.String(),
      value: t.String()
    }),
    response: {
      200: t.Object({
        success: t.Boolean(),
        config: t.Object({
          key: t.String(),
          value: t.String()
        })
      }),
      400: ErrorSchema,
      401: ErrorSchema,
      403: ErrorSchema,
      500: ErrorSchema
    }
  })
  
  // Delete config
  .delete("/:key", async ({ params, adminId, clientIp, set }) => {
    try {
      // Check if config exists
      const config = await db.systemConfig.findUnique({
        where: { key: params.key }
      });

      if (!config) {
        set.status = 404;
        return { error: "Config not found" };
      }

      // Delete config
      await db.systemConfig.delete({
        where: { key: params.key }
      });

      // Log admin action
      await db.adminLog.create({
        data: {
          adminId,
          action: "SYSTEM_CONFIG_DELETED",
          details: `Deleted config ${params.key}`,
          ip: clientIp
        }
      });

      return {
        success: true,
        message: "Config deleted successfully"
      };
    } catch (error) {
      console.error("Failed to delete system config:", error);
      set.status = 500;
      return { error: "Failed to delete system config" };
    }
  }, {
    tags: ["admin"],
    detail: { summary: "Delete system configuration" },
    response: {
      200: t.Object({
        success: t.Boolean(),
        message: t.String()
      }),
      401: ErrorSchema,
      403: ErrorSchema,
      404: ErrorSchema,
      500: ErrorSchema
    }
  });