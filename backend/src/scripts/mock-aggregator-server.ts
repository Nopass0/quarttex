#!/usr/bin/env bun

import { Elysia, t } from "elysia";

// Интерфейсы для мокового агрегатора
interface DealRequest {
  ourDealId: string;
  status: string;
  amount: number;
  merchantRate: number;
  paymentMethod: "SBP" | "C2C";
  bankType?: string;
  callbackUrl: string;
  clientIdentifier?: string;
  metadata?: any;
}

interface DealResponse {
  accepted: boolean;
  partnerDealId?: string;
  message?: string;
  requisites?: {
    bankName?: string;
    cardNumber?: string;
    phoneNumber?: string;
    recipientName?: string;
    bankCode?: string;
    additionalInfo?: string;
  };
  dealDetails?: {
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    expiresAt: string;
    paymentMethod: string;
    metadata?: any;
  };
}

// Хранилище сделок в памяти
const deals = new Map<string, any>();
let dealCounter = 1;

// Валидный API ключ для тестирования
const VALID_API_KEY = "test-aggregator-api-key-123";

// Моковый агрегатор сервер
const mockAggregator = new Elysia()
  .onRequest(({ request }) => {
    console.log(`📥 [MockAggregator] ${request.method} ${new URL(request.url).pathname}`);
  })

  // Middleware для проверки API ключа
  .derive(({ headers, set }) => {
    const apiKey = headers['x-api-key'];
    if (!apiKey || apiKey !== VALID_API_KEY) {
      set.status = 401;
      return { error: 'Unauthorized: Invalid or missing X-Api-Key header' };
    }
    return { authorized: true };
  })

  // Создание сделки
  .post(
    "/deals",
    async ({ body, set }) => {
      try {
        console.log('🎯 [MockAggregator] Получена сделка:', {
          ourDealId: body.ourDealId,
          amount: body.amount,
          paymentMethod: body.paymentMethod,
          clientIdentifier: body.clientIdentifier,
          bankType: body.bankType
        });

        // Генерируем уникальный ID сделки агрегатора
        const partnerDealId = `AGG-MOCK-${dealCounter++}-${Date.now()}`;

        // Генерируем реквизиты в зависимости от метода платежа
        let requisites: any = {
          bankName: 'Сбербанк',
          recipientName: 'ООО Моковый Агрегатор',
          bankCode: 'SBERBANK'
        };

        if (body.paymentMethod === 'SBP') {
          requisites.phoneNumber = '+79991234567';
          requisites.additionalInfo = 'Перевод по СБП';
        } else if (body.paymentMethod === 'C2C') {
          requisites.cardNumber = '5555666677778888';
          requisites.additionalInfo = 'Перевод на карту';
        }

        // Сохраняем сделку
        const deal = {
          ourDealId: body.ourDealId,
          partnerDealId,
          amount: body.amount,
          status: 'CREATED',
          paymentMethod: body.paymentMethod,
          clientIdentifier: body.clientIdentifier,
          requisites,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 час
          metadata: body.metadata
        };

        deals.set(partnerDealId, deal);

        console.log('✅ [MockAggregator] Сделка принята:', {
          partnerDealId,
          clientIdentifier: body.clientIdentifier,
          requisites: requisites.cardNumber || requisites.phoneNumber
        });

        const response: DealResponse = {
          accepted: true,
          partnerDealId,
          message: 'Deal created successfully',
          requisites,
          dealDetails: {
            id: partnerDealId,
            amount: body.amount,
            status: 'CREATED',
            createdAt: deal.createdAt,
            expiresAt: deal.expiresAt,
            paymentMethod: body.paymentMethod,
            metadata: {
              ...body.metadata,
              clientIdentifier: body.clientIdentifier
            }
          }
        };

        set.status = 200;
        return response;

      } catch (error) {
        console.error('❌ [MockAggregator] Ошибка создания сделки:', error);
        set.status = 400;
        return { 
          accepted: false, 
          message: 'Failed to create deal',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    },
    {
      body: t.Object({
        ourDealId: t.String(),
        status: t.String(),
        amount: t.Number(),
        merchantRate: t.Number(),
        paymentMethod: t.Union([t.Literal("SBP"), t.Literal("C2C")]),
        bankType: t.Optional(t.String()),
        callbackUrl: t.String(),
        clientIdentifier: t.Optional(t.String()),
        metadata: t.Optional(t.Any())
      })
    }
  )

  // Получение информации о сделке
  .get(
    "/deals/:partnerDealId",
    async ({ params, set }) => {
      const deal = deals.get(params.partnerDealId);
      
      if (!deal) {
        set.status = 404;
        return { error: 'Deal not found' };
      }

      console.log('📋 [MockAggregator] Запрос информации о сделке:', params.partnerDealId);
      
      return {
        success: true,
        deal: {
          id: deal.partnerDealId,
          ourDealId: deal.ourDealId,
          amount: deal.amount,
          status: deal.status,
          paymentMethod: deal.paymentMethod,
          clientIdentifier: deal.clientIdentifier,
          requisites: deal.requisites,
          createdAt: deal.createdAt,
          expiresAt: deal.expiresAt,
          metadata: deal.metadata
        }
      };
    }
  )

  // Обновление статуса сделки (для тестирования)
  .post(
    "/deals/:partnerDealId/status",
    async ({ params, body, set }) => {
      const deal = deals.get(params.partnerDealId);
      
      if (!deal) {
        set.status = 404;
        return { error: 'Deal not found' };
      }

      deal.status = body.status;
      console.log(`🔄 [MockAggregator] Статус сделки ${params.partnerDealId} изменен на ${body.status}`);
      
      return { success: true, status: deal.status };
    },
    {
      body: t.Object({
        status: t.String()
      })
    }
  )

  // Получение всех сделок (для отладки)
  .get("/deals", async () => {
    const allDeals = Array.from(deals.values());
    console.log(`📊 [MockAggregator] Запрос всех сделок: ${allDeals.length} шт.`);
    
    return {
      success: true,
      deals: allDeals,
      count: allDeals.length
    };
  })

  // Статистика по клиентам
  .get("/stats/clients", async () => {
    const allDeals = Array.from(deals.values());
    const clientStats = new Map<string, number>();

    allDeals.forEach(deal => {
      if (deal.clientIdentifier) {
        clientStats.set(deal.clientIdentifier, (clientStats.get(deal.clientIdentifier) || 0) + 1);
      }
    });

    const stats = Array.from(clientStats.entries()).map(([clientId, count]) => ({
      clientIdentifier: clientId,
      transactionCount: count,
      trafficType: count === 0 ? 'PRIMARY' : count >= 10 ? 'VIP' : 'SECONDARY'
    }));

    console.log('📈 [MockAggregator] Статистика по клиентам запрошена');

    return {
      success: true,
      clientStats: stats,
      totalClients: stats.length,
      totalDeals: allDeals.length
    };
  })

  // Health check
  .get("/health", () => {
    return { 
      status: 'healthy', 
      service: 'Mock Aggregator',
      timestamp: new Date().toISOString(),
      dealsCount: deals.size
    };
  });

// Запуск сервера
console.log('🚀 Запуск мокового агрегатора...');
console.log('📋 Конфигурация:');
console.log(`   API ключ: ${VALID_API_KEY}`);
console.log('   Порт: 4000');
console.log('   Эндпоинты:');
console.log('     POST /deals - Создание сделки');
console.log('     GET  /deals/:id - Информация о сделке');
console.log('     POST /deals/:id/status - Обновление статуса');
console.log('     GET  /deals - Все сделки');
console.log('     GET  /stats/clients - Статистика клиентов');
console.log('     GET  /health - Проверка здоровья');

mockAggregator.listen(4000, () => {
  console.log('\n✅ Моковый агрегатор запущен на порту 4000');
  console.log('🔗 Base URL: http://localhost:4000');
  console.log('\n📝 Для тестирования используйте:');
  console.log('   API ключ: test-aggregator-api-key-123');
  console.log('   Заголовок: X-Api-Key: test-aggregator-api-key-123');
  console.log('\n🧪 Пример запроса:');
  console.log('curl -X POST http://localhost:4000/deals \\');
  console.log('  -H "X-Api-Key: test-aggregator-api-key-123" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"ourDealId":"test-123","status":"NEW","amount":5000,"merchantRate":95.5,"paymentMethod":"C2C","callbackUrl":"http://localhost:3000/api/aggregators/callback","clientIdentifier":"client_test_001"}\'');
});
