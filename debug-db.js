import { db } from './backend/src/db.js';

async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    
    // Check methods
    const methods = await db.method.findMany({ 
      select: { id: true, name: true, type: true } 
    });
    console.log('Methods found:', methods);
    
    // Check merchants
    const merchants = await db.merchant.findMany({ 
      select: { id: true, name: true, token: true } 
    });
    console.log('Merchants found:', merchants);
    
    // Check merchant methods
    const merchantMethods = await db.merchantMethod.findMany({ 
      select: { 
        merchantId: true, 
        methodId: true, 
        isEnabled: true 
      } 
    });
    console.log('Merchant methods found:', merchantMethods);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkDatabase();
