import { db } from './backend/src/db.js';

async function checkMethods() {
  try {
    console.log('Checking methods...');
    
    const methods = await db.method.findMany({ 
      select: { id: true, name: true, type: true } 
    });
    console.log('Methods found:', methods);
    
    const merchants = await db.merchant.findMany({ 
      select: { id: true, name: true, token: true } 
    });
    console.log('Merchants found:', merchants);
    
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

checkMethods();
