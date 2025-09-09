import { Elysia, t } from 'elysia'
import { traderGuard } from '@/middleware/traderGuard'
import { getTraderRate } from '@/utils/trader-rate'

export default (app: Elysia) =>
  app
    // Временный endpoint для тестирования (без авторизации)
    .get('/rate-test', async () => {
      try {
        // Используем тестового трейдера
        const rateData = await getTraderRate('cmf4330t50034ikdgly4d7p3w')
        
        return {
          success: true,
          data: rateData
        }
      } catch (error) {
        console.error('Failed to get trader rate:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Не удалось получить курс'
        }
      }
    })
    
    .use(traderGuard())
    // Получить курс для трейдера с учетом индивидуальных настроек
    .get('/rate', async ({ trader }) => {
      try {
        const rateData = await getTraderRate(trader.id)
        
        return {
          success: true,
          data: rateData
        }
      } catch (error) {
        console.error('Failed to get trader rate:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Не удалось получить курс'
        }
      }
    })
