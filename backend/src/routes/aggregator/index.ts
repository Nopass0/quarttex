import { Elysia } from "elysia";
import { aggregatorSessionGuard } from "@/middleware/aggregatorGuard";
import authRoutes from "@/routes/aggregator/auth";
import dashboardRoutes from "@/routes/aggregator/dashboard";
import apiDocsRoutes from "@/routes/aggregator/api-docs";
import disputesRoutes from "@/routes/aggregator/disputes";
import settingsRoutes from "@/routes/aggregator/settings";
import depositsRoutes from "@/routes/aggregator/deposits";
import callbackRoutes from "@/routes/aggregator/callback";

export default (app: Elysia) =>
  app
    // Публичные маршруты аутентификации (без aggregatorSessionGuard)
    .group("/auth", (app) => app.use(authRoutes))

    // Защищенные маршруты дашборда (с aggregatorSessionGuard)
    .group("/dashboard", (app) =>
      app.use(aggregatorSessionGuard()).use(dashboardRoutes)
    )

    // Защищенные маршруты API документации (с aggregatorSessionGuard)
    .group("/api-docs", (app) =>
      app.use(aggregatorSessionGuard()).use(apiDocsRoutes)
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

    // API маршруты для колбэков (с aggregatorApiGuard) - ОТДЕЛЬНАЯ группа чтобы не влиять на другие routes
    .use(callbackRoutes);
