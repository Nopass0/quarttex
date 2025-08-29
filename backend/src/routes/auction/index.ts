/**
 * Основные роуты для аукционной системы
 */

import { Elysia } from "elysia";
import callbackRoutes from "./callback";
import externalApiRoutes from "./external-api";

/**
 * Группа роутов для аукционной системы
 */
export default (app: Elysia) =>
  app
    .group("/auction", (app) =>
      app
        // Callback роуты (без аутентификации, проверка через RSA подпись)
        .use(callbackRoutes)
        // External API роуты (endpoints для внешних аукционных систем)
        .use(externalApiRoutes)
    );
