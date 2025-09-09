import { Elysia } from "elysia";
import { db } from "@/db";

/**
 * Middleware для проверки токенов от внешних систем,
 * работающих через агрегаторский интерфейс
 */
export const externalAggregatorGuard = () => (app: Elysia) =>
  app.derive(async ({ headers, error }) => {
      console.log('[ExternalAggregatorGuard] Starting authentication check');
      
      // Извлекаем токен из заголовков
      const authHeader = headers["authorization"];
      const aggregatorToken = headers["x-aggregator-token"];
      const apiToken = headers["x-api-token"];
      
      let token: string | null = null;
      
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      } else if (aggregatorToken) {
        token = aggregatorToken;
      } else if (apiToken) {
        token = apiToken;
      }
      
      if (!token) {
        return error(401, { 
          error: "Missing authentication token",
          details: "Provide token via Authorization: Bearer <token> or x-aggregator-token header"
        });
      }
      
      // Сначала ищем мерчанта с таким внешним токеном и включенным агрегаторским режимом
      const merchant = await db.merchant.findFirst({
        where: {
          externalApiToken: token,
          isAggregatorMode: true,
          disabled: false,
          banned: false
        },
        include: {
          merchantMethods: {
            include: {
              method: true
            }
          }
        }
      });
      
      // Если мерчант не найден, проверяем агрегаторов
      let aggregator = null;
      if (!merchant) {
        aggregator = await db.aggregator.findFirst({
          where: {
            isActive: true,
            OR: [
              { apiToken: token },
              { customApiToken: token }
            ]
          }
        });
        
        // Если найден агрегатор, найдем любого мерчанта в режиме агрегатора для обработки
        if (aggregator) {
          const aggregatorMerchant = await db.merchant.findFirst({
            where: {
              isAggregatorMode: true,
              disabled: false,
              banned: false
            },
            include: {
              merchantMethods: {
                include: {
                  method: true
                }
              }
            }
          });
          
          if (aggregatorMerchant) {
            console.log(`[ExternalAggregatorGuard] Aggregator ${aggregator.name} authenticated, using merchant ${aggregatorMerchant.name} for processing`);
            // Добавляем информацию об агрегаторе в объект мерчанта для отслеживания
            (aggregatorMerchant as any).sourceAggregator = aggregator;
            console.log(`[ExternalAggregatorGuard] Returning merchant:`, aggregatorMerchant.id);
            return {
              externalMerchant: aggregatorMerchant
            };
          } else {
            console.log(`[ExternalAggregatorGuard] No merchant in aggregator mode found`);
            return error(503, {
              error: "No merchant available for aggregator processing",
              details: "No active merchant with aggregator mode enabled"
            });
          }
        }
      }
      
      if (!merchant && !aggregator) {
        return error(401, { 
          error: "Invalid token or aggregator mode not enabled",
          details: "Check if merchant has aggregator mode enabled and token is correct"
        });
      }
      
      // Логируем входящий запрос
      if (merchant) {
        console.log(`[ExternalAggregator] Request from merchant ${merchant.name} (ID: ${merchant.id})`);
        return {
          externalMerchant: merchant
        };
      }
      
      // Этот код не должен быть достигнут из-за проверок выше
      return error(500, { 
        error: "Internal server error",
        details: "Unexpected state in authentication"
      });
    });