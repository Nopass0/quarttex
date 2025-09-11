import { db } from './src/db';

const merchant = await db.merchant.findFirst({
  where: { name: 'Test Merchant PSPWare' }
});

console.log('API Key:', merchant?.apiKey || 'Not found');
process.exit(0);