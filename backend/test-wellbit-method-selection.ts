import { createHmac } from 'crypto';

// Test the Wellbit payment method selection with different amounts
async function testMethodSelection() {
  const baseUrl = 'http://localhost:3000/api/wellbit';
  
  // Get merchant credentials
  const apiKeyPublic = process.env.WELLBIT_API_KEY_PUBLIC || 'c31d17c6037bc8bb';
  const apiKeyPrivate = process.env.WELLBIT_API_KEY_PRIVATE || '40f8b6e98f5b5e96de529e5cc13b688f6f7bc60e4e825b6b87bde37b86c00c56';

  const testCases = [
    { amount: 7000, type: 'sbp', expected: 'sbp_wellbit' },
    { amount: 15000, type: 'sbp', expected: 'sbp_wellbit_10k' },
    { amount: 8000, type: 'card', expected: 'c2c_wellbit' },
    { amount: 50000, type: 'card', expected: 'c2c_wellbit_10k' },
  ];

  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.type} with amount ${testCase.amount} RUB`);
    console.log(`Expected method: ${testCase.expected}`);
    
    const paymentData = {
      payment_id: Math.floor(Math.random() * 1000000),
      payment_amount: testCase.amount,
      payment_amount_usdt: testCase.amount / 79.16,
      payment_amount_profit: testCase.amount * 0.935,
      payment_amount_profit_usdt: (testCase.amount * 0.935) / 79.16,
      payment_fee_percent_profit: 6.5,
      payment_type: testCase.type,
      payment_bank: null,
      payment_course: 79.16,
      payment_lifetime: 720,
      payment_status: "new"
    };

    // Create signature
    const canonicalJson = JSON.stringify(paymentData);
    const signature = createHmac('sha256', apiKeyPrivate)
      .update(canonicalJson)
      .digest('hex');

    try {
      const response = await fetch(`${baseUrl}/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeyPublic,
          'x-api-token': signature
        },
        body: canonicalJson
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Success! Payment created');
        console.log('Payment ID:', result.payment_id);
        console.log('Payment credentials:', result.payment_credential);
      } else {
        const error = await response.text();
        console.log('❌ Failed:', response.status, error);
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
}

// Run the test
testMethodSelection().catch(console.error);