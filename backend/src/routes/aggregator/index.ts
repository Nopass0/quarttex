import { Elysia } from "elysia";
import { aggregatorSessionGuard } from "@/middleware/aggregatorGuard";
import authRoutes from "@/routes/aggregator/auth";
import dashboardRoutes from "@/routes/aggregator/dashboard";
import dashboardRoutesV2 from "@/routes/aggregator/dashboard-v2";
import apiDocsRoutesV3 from "@/routes/aggregator/api-docs-v3";
import disputesRoutes from "@/routes/aggregator/disputes";
import settingsRoutes from "@/routes/aggregator/settings";
import depositsRoutes from "@/routes/aggregator/deposits";
import callbackRoutes from "@/routes/aggregator/callback-v2";
import callbackRoutesV3 from "@/routes/aggregator/callback-v3";
import chaseCallbackRoutes from "@/routes/aggregator/chase-callback";

export default (app: Elysia) =>
  app
    // Публичные маршруты аутентификации (без aggregatorSessionGuard)
    .group("/auth", (app) => app.use(authRoutes))

    // Защищенные маршруты дашборда v2 (с aggregatorSessionGuard)
    .group("/dashboard", (app) =>
      app.use(aggregatorSessionGuard()).use(dashboardRoutesV2)
    )

    // Защищенные маршруты API документации (с aggregatorSessionGuard)
    .group("/api-docs", (app) =>
      app.use(aggregatorSessionGuard()).use(apiDocsRoutesV3)
    )

    // Защищенные маршруты споров (с aggregatorSessionGuard)
    .group("/disputes", (app) =>
      app.use(aggregatorSessionGuard()).use(disputesRoutes)
    )

    // Защищенные маршруты настроек (с aggregatorSessionGuard)
    .group("/settings", (app) =>
      app.use(aggregatorSessionGuard()).use(settingsRoutes)
    )

    // Защищенные маршруты пополнений (с aggregatorSessionGuard)
    .group("/deposits", (app) =>
      app.use(aggregatorSessionGuard()).use(depositsRoutes)
    )

    // API маршруты для колбэков v3 - новая версия
    .use(callbackRoutesV3)
    
    // API маршруты для колбэков от Chase-агрегаторов
    .use(chaseCallbackRoutes)
    
    // Старые маршруты для обратной совместимости (deprecated)
    .use(callbackRoutes);
