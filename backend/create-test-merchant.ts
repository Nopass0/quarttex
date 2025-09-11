import { db } from './src/db';

async function main() {
  // Создаем тестового мерчанта
  const apiKey = 'test-api-key-' + Date.now();
  
  const merchant = await db.merchant.create({
    data: {
      name: 'Test Rotation Merchant ' + Date.now(),
      apiKeyPublic: apiKey,
      apiKeyPrivate: 'private-' + apiKey,
      token: 'token-' + Date.now(),
      disabled: false,
      countInRubEquivalent: true
    }
  });

  // Находим метод SBP
  const method = await db.method.findFirst({
    where: { code: 'sbp' }
  });

  if (method) {
    // Добавляем доступ к методу
    await db.merchantMethod.create({
      data: {
        merchantId: merchant.id,
        methodId: method.id,
        isEnabled: true
      }
    });
  }

  console.log('✅ Merchant created!');
  console.log('Name:', merchant.name);
  console.log('API Key:', merchant.apiKey);
  console.log('Method ID:', method?.id);
  
  console.log('\n🚀 Test command:');
  console.log(`curl -X POST http://localhost:3000/api/merchant/transactions/in \\
  -H "x-merchant-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderId": "test-${Date.now()}",
    "amount": 1000,
    "methodId": "${method?.id}",
    "userIp": "192.168.1.1",
    "callbackUri": "https://example.com/callback"
  }'`);
}

main().catch(console.error).finally(() => process.exit(0));