import { Elysia, t } from 'elysia';
import { db } from '@/db';

/**
 * merchantSessionGuard — защита эндпоинтов мерчанта с использованием сессий.
 *
 * Ошибки:
 *  • 401 Unauthorized — нет/неверный Bearer токен или истекшая сессия.
 *
 * Использование:
 *   app.use(merchantSessionGuard())                 // глобально
 *   app.use('/merchant/dashboard', merchantSessionGuard())    // для группы /merchant/dashboard
 */
export const merchantSessionGuard =
  () => (app: Elysia) =>
    app
      /* 1. Схема заголовка + базовая проверка */
      .guard({
        headers: t.Object({
          authorization: t.String({
            description: 'Bearer токен сессии',
          }),
        }),
        async beforeHandle({ headers, error }) {
          const authHeader = headers.authorization;
          if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return error(401, { error: 'Отсутствует токен авторизации' });
          }

          const sessionToken = authHeader.substring(7);
          
          // Проверяем существование сессии
          const sessionConfig = await db.systemConfig.findUnique({
            where: { key: `merchant_session_${sessionToken}` },
          });

          if (!sessionConfig) {
            return error(401, { error: 'Недействительная сессия' });
          }

          const session = JSON.parse(sessionConfig.value);
          
          // Проверяем срок действия сессии
          if (new Date(session.expiresAt) < new Date()) {
            // Удаляем истекшую сессию
            await db.systemConfig.delete({
              where: { key: `merchant_session_${sessionToken}` },
            });
            return error(401, { error: 'Сессия истекла' });
          }

          /* ничего не возвращаем → основной handler выполняется */
        },
      })

      /* 2. Добавляем мерчанта в контекст */
      .derive(async ({ headers, error }) => {
        const authHeader = headers.authorization;
        const sessionToken = authHeader!.substring(7);
        
        // Получаем сессию
        const sessionConfig = await db.systemConfig.findUnique({
          where: { key: `merchant_session_${sessionToken}` },
        });

        const session = JSON.parse(sessionConfig!.value);

        // Получаем мерчанта
        const merchant = await db.merchant.findUnique({
          where: { id: session.merchantId },
        });

        if (!merchant) {
          return error(401, { error: 'Мерчант не найден' });
        }

        if (merchant.disabled || merchant.banned) {
          return error(403, { error: 'Доступ запрещен' });
        }

        /* теперь в handlers доступно { merchant, staffRole, staffId, rights } */
        return {
          merchant,
          staffRole: session.role ?? 'owner',
          staffId: session.staffId ?? null,
          rights: session.rights ?? {},
        };
      });