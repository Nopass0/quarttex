// src/middleware/merchantGuard.ts
import { Elysia, t } from 'elysia';
import { db } from '@/db';

/**
 * merchantGuard — защита «продавец-эндпоинтов».
 *
 * Ошибки:
 *  • 401 Invalid merchant key — нет/неверный `x-merchant-api-key`.
 *
 * Использование:
 *   app.use(merchantGuard())                 // глобально
 *   app.use('/merchant', merchantGuard())    // для группы /merchant
 */
export const merchantGuard =
  () => (app: Elysia) =>
    app
      /* 1. Схема заголовка + базовая проверка */
      .guard({
        headers: t.Object({
          'x-merchant-api-key': t.Optional(t.String({
            description: 'API-ключ мерчанта',
          })),
          authorization: t.Optional(t.String()),
        }),
        async beforeHandle({ headers, error, request }) {
          const authHeader = headers.authorization;

          if (authHeader && authHeader.startsWith('Bearer ')) {
            const sessionToken = authHeader.substring(7);

            const sessionConfig = await db.systemConfig.findUnique({
              where: { key: `merchant_session_${sessionToken}` },
            });

            if (!sessionConfig) {
              return error(401, { error: 'Недействительная сессия' });
            }

            const session = JSON.parse(sessionConfig.value);

            if (new Date(session.expiresAt) < new Date()) {
              await db.systemConfig.delete({
                where: { key: `merchant_session_${sessionToken}` },
              });
              return error(401, { error: 'Сессия истекла' });
            }

            return;
          }

          const token = headers['x-merchant-api-key'];

          if (!token) {
            console.log('[merchantGuard] Missing x-merchant-api-key header for:', request.url);
            return error(401, { error: 'Missing x-merchant-api-key header' });
          }

          const exists = await db.merchant.findFirst({
            where: {
              OR: [
                { token },
                { apiKeyPublic: token }
              ]
            },
            select: { id: true },
          });
          if (!exists)
            return error(401, { error: 'Invalid merchant key' });

          /* ничего не возвращаем → основной handler выполняется */
        },
      })

      /* 2. Добавляем мерчанта в контекст */
      .derive(async ({ headers, error, request }) => {
        const authHeader = headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
          const sessionToken = authHeader.substring(7);

          const sessionConfig = await db.systemConfig.findUnique({
            where: { key: `merchant_session_${sessionToken}` },
          });

          if (!sessionConfig) {
            return error(401, { error: 'Недействительная сессия' });
          }

          const session = JSON.parse(sessionConfig.value);

          const merchant = await db.merchant.findUnique({
            where: { id: session.merchantId },
          });

          if (!merchant) {
            return error(401, { error: 'Мерчант не найден' });
          }

          if (merchant.disabled || merchant.banned) {
            return error(403, { error: 'Доступ запрещен' });
          }

          return {
            merchant,
            staffRole: session.role ?? 'owner',
            staffId: session.staffId ?? null,
            rights: session.rights ?? {},
          };
        }

        const token = headers['x-merchant-api-key'];
        console.log('[merchantGuard] Request to:', request.url, 'with token:', token ? 'provided' : 'missing');

        if (!token) {
          return error(401, { error: 'Missing x-merchant-api-key header' });
        }

        const merchant = await db.merchant.findFirst({
          where: {
            OR: [
              { token },
              { apiKeyPublic: token }
            ]
          },
        });
        if (!merchant)
          return error(401, { error: 'Invalid merchant key' });

        return { merchant };
      });
