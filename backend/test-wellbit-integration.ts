import { db } from "./src/db";
import crypto from 'crypto';

async function testWellbitIntegration() {
  console.log("=== Testing Wellbit Integration ===\n");

  try {
    // 1. Проверяем, есть ли мерчант Wellbit
    let wellbitMerchant = await db.merchant.findFirst({
      where: { name: { contains: 'wellbit', mode: 'insensitive' } }
    });

    if (!wellbitMerchant) {
      console.log("Creating Wellbit merchant...");
      
      // Генерируем API ключи
      const apiKeyPublic = `wellbit_${crypto.randomBytes(16).toString('hex')}`;
      const apiKeyPrivate = `wellbit_private_${crypto.randomBytes(32).toString('hex')}`;
      
      wellbitMerchant = await db.merchant.create({
        data: {
          name: "Wellbit",
          token: `wellbit_token_${crypto.randomBytes(16).toString('hex')}`,
          countInRubEquivalent: false, // Wellbit передает свой курс
          apiKeyPublic,
          apiKeyPrivate,
          disabled: false,
          wellbitCallbackUrl:
            "https://wellbit.pro/cascade/cb/79af32c6-37e2-4dd1-bf7f-fbef29bf2a24"
        }
      });
      
      console.log(`✅ Created Wellbit merchant with ID: ${wellbitMerchant.id}`);
      console.log(`   API Key: ${apiKeyPublic}`);
      console.log(`   Private Key: ${apiKeyPrivate}`);
    } else {
      console.log(`✅ Found existing Wellbit merchant with ID: ${wellbitMerchant.id}`);
      console.log(`   API Key: ${wellbitMerchant.apiKeyPublic}`);
    }

    // 2. Проверяем методы оплаты
    const methods = await db.method.findMany({
      where: { isEnabled: true }
    });

    if (methods.length === 0) {
      console.log("\n❌ No active payment methods found. Please create some methods first.");
      return;
    }

    console.log(`\n✅ Found ${methods.length} active payment methods`);
    
    // Привязываем методы к Wellbit, если еще не привязаны
    for (const method of methods) {
      const existing = await db.merchantMethod.findUnique({
        where: {
          merchantId_methodId: {
            merchantId: wellbitMerchant.id,
            methodId: method.id
          }
        }
      });

      if (!existing) {
        await db.merchantMethod.create({
          data: {
            merchantId: wellbitMerchant.id,
            methodId: method.id,
            isEnabled: true
          }
        });
        console.log(`   - Added method ${method.name} to Wellbit`);
      }
    }

    // 3. Создаем тестовый запрос на платеж (как от Wellbit)
    console.log("\n=== Simulating Wellbit Payment Request ===");
    
    const testPaymentData = {
      payment_id: Date.now(),
      payment_amount: 5000,
      payment_amount_usdt: 52.63,
      payment_amount_profit: 4675,
      payment_amount_profit_usdt: 49.21,
      payment_fee_percent_profit: 6.5,
      payment_type: "sbp",
      payment_bank: null,
      payment_course: 95,
      payment_lifetime: 720,
      payment_status: "new"
    };

    console.log("\nRequest from Wellbit:", JSON.stringify(testPaymentData, null, 2));

    // 4. Генерируем HMAC подпись для запроса
    if (wellbitMerchant.apiKeyPrivate) {
      const sortedPayload = Object.keys(testPaymentData)
        .sort()
        .reduce((obj: any, key) => {
          obj[key] = (testPaymentData as any)[key];
          return obj;
        }, {});
      
      const jsonString = JSON.stringify(sortedPayload);
      const signature = crypto.createHmac('sha256', wellbitMerchant.apiKeyPrivate)
        .update(jsonString)
        .digest('hex');
      
      console.log(`\nGenerated HMAC signature: ${signature}`);
    }

    // 5. Создаем транзакцию через API эндпоинт
    console.log("\n=== Creating Transaction via API ===");
    
    const apiUrl = `http://localhost:3000/api/merchant/transactions/in`;
    const requestBody = {
      amount: testPaymentData.payment_amount,
      orderId: `wellbit_${testPaymentData.payment_id}`,
      methodId: methods[0].id,
      rate: testPaymentData.payment_course,
      expired_at: new Date(Date.now() + testPaymentData.payment_lifetime * 1000).toISOString(),
      callbackUri:
        "https://wellbit.pro/cascade/cb/79af32c6-37e2-4dd1-bf7f-fbef29bf2a24"
    };

    console.log("\nRequest to Chase API:");
    console.log(`URL: ${apiUrl}`);
    console.log(`Headers: { "x-merchant-api-key": "${wellbitMerchant.apiKeyPublic}" }`);
    console.log(`Body: ${JSON.stringify(requestBody, null, 2)}`);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-api-key': wellbitMerchant.apiKeyPublic || ''
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const responseData = await response.json();
        const responseHeaders = response.headers;
        
        console.log("\n✅ Transaction created successfully!");
        console.log("Response:", JSON.stringify(responseData, null, 2));
        
        if (responseHeaders.get('x-api-token')) {
          console.log(`HMAC signature in response: ${responseHeaders.get('x-api-token')}`);
        }

        // 6. Проверяем формат ответа для Wellbit
        if ('payment_id' in responseData) {
          console.log("\n✅ Response is in Wellbit format!");
          console.log("   - payment_id:", responseData.payment_id);
          console.log("   - payment_credential:", responseData.payment_credential);
          console.log("   - payment_status:", responseData.payment_status);
        } else {
          console.log("\n⚠️ Response is NOT in Wellbit format. Got standard format instead.");
        }

        // 7. Тестируем отправку колбэка
        if (responseData.payment_id || responseData.id) {
          const transactionId = responseData.payment_id || responseData.id;
          console.log("\n=== Testing Callback ===");
          
          const transaction = await db.transaction.findUnique({
            where: { id: transactionId }
          });

          if (transaction) {
            // Импортируем CallbackService
            const { CallbackService } = await import('./src/services/CallbackService');
            
            // Отправляем колбэк
            await CallbackService.sendCallback(transaction, 'READY');
            
            console.log("✅ Callback sent (check logs above for details)");
            
            // Проверяем историю колбэков
            const callbackHistory = await db.callbackHistory.findFirst({
              where: { transactionId },
              orderBy: { createdAt: 'desc' }
            });

            if (callbackHistory) {
              console.log("\n✅ Callback saved to history:");
              console.log("   - URL:", callbackHistory.url);
              console.log("   - Payload:", callbackHistory.payload);
              console.log("   - Status Code:", callbackHistory.statusCode);
              
              // Проверяем формат колбэка
              const payload = callbackHistory.payload as any;
              if (payload.callback === 'payment' && payload.payment_id) {
                console.log("\n✅ Callback is in Wellbit format!");
              } else {
                console.log("\n⚠️ Callback is NOT in Wellbit format.");
              }
            }
          }
        }
      } else {
        const errorText = await response.text();
        console.log(`\n❌ Failed to create transaction: ${response.status}`);
        console.log(`Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`\n❌ Error calling API: ${error}`);
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await db.$disconnect();
  }
}

// Запускаем тест
testWellbitIntegration();