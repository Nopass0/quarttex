import { Elysia, t } from 'elysia';

export default new Elysia({ prefix: '/api/mock-aggregator' })
  .post('/merchant/transactions/in', async ({ body, headers }) => {
    console.log('[MockAggregator] Received request:', { body, headers });
    
    // Проверяем авторизацию
    const apiKey = headers['x-merchant-api-key'];
    if (!apiKey) {
      return {
        error: 'Missing API key',
        code: 401
      };
    }
    
    // Имитируем небольшую задержку
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Возвращаем успешный ответ с реквизитами
    const response = {
      id: `mock-tx-${Date.now()}`,
      success: true,
      paymentUrl: `https://mock-payment.example.com/pay/${Date.now()}`,
      requisites: {
        phoneNumber: '+79001234567',
        recipientName: 'Иван Иванов',
        bankCode: '044525225',
        bankName: 'Сбербанк',
        amount: body.amount,
        currency: 'RUB'
      },
      expiresAt: body.expired_at,
      status: 'PENDING'
    };
    
    console.log('[MockAggregator] Sending response:', response);
    
    return response;
  })
  .post('/merchant/create-transaction', async ({ body, headers }) => {
    console.log('[MockAggregator] Received old format request:', { body, headers });
    
    // Проверяем авторизацию
    const apiKey = headers['x-merchant-api-key'];
    if (!apiKey) {
      return {
        error: 'Missing API key',
        code: 401
      };
    }
    
    // Имитируем небольшую задержку
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Возвращаем успешный ответ в старом формате
    const response = {
      success: true,
      transactionId: `mock-tx-${Date.now()}`,
      paymentUrl: `https://mock-payment.example.com/pay/${Date.now()}`,
      requisites: {
        phoneNumber: '+79001234567',
        recipientName: 'Иван Иванов',
        bankCode: '044525225',
        bankName: 'Сбербанк'
      }
    };
    
    console.log('[MockAggregator] Sending old format response:', response);
    
    return response;
  })
  .get('/health', () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString()
    };
  });
