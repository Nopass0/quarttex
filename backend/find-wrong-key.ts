import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';
import { db } from './src/db';

async function findWrongKey() {
  const responseBody = { "error": "Method not available for merchant" };
  const canonical = canonicalJson(responseBody);
  const wrongSignature = "67cb7790bd28caac94388405b4525cba86877e212ad9a5c64fc88cc6cc11afbe";
  
  console.log("Looking for key that produces:", wrongSignature);
  console.log("For canonical JSON:", canonical);
  
  // Check all merchants
  const merchants = await db.merchant.findMany();
  
  for (const merchant of merchants) {
    // Test with apiKeyPrivate
    if (merchant.apiKeyPrivate) {
      const sig = createHmac('sha256', merchant.apiKeyPrivate)
        .update(canonical)
        .digest('hex');
      
      if (sig === wrongSignature) {
        console.log(`\n✅ FOUND! Merchant: ${merchant.name}`);
        console.log(`   ID: ${merchant.id}`);
        console.log(`   Private Key: ${merchant.apiKeyPrivate}`);
        console.log(`   Public Key: ${merchant.apiKeyPublic}`);
        return;
      }
    }
    
    // Test with apiKeyPublic (maybe there's a bug)
    if (merchant.apiKeyPublic) {
      const sig = createHmac('sha256', merchant.apiKeyPublic)
        .update(canonical)
        .digest('hex');
      
      if (sig === wrongSignature) {
        console.log(`\n✅ FOUND (using public key as private)! Merchant: ${merchant.name}`);
        console.log(`   ID: ${merchant.id}`);
        console.log(`   Public Key used as private: ${merchant.apiKeyPublic}`);
        return;
      }
    }
    
    // Test with token
    if (merchant.token) {
      const sig = createHmac('sha256', merchant.token)
        .update(canonical)
        .digest('hex');
      
      if (sig === wrongSignature) {
        console.log(`\n✅ FOUND (using token)! Merchant: ${merchant.name}`);
        console.log(`   ID: ${merchant.id}`);
        console.log(`   Token: ${merchant.token}`);
        return;
      }
    }
  }
  
  // Try some hardcoded values
  const testKeys = [
    'wellbit_private_65af8ca0a32aa50a6bf38503f45a1c3cdad4339acc0709966a7c3d675b497d1d',
    '2e1cdc8dcbb31aeb750b2e29972ca2a8548d9f5ba92caa28ff877e7ffd6b8981',
    'wellbit_d19e47261a849a16e8e2815fc42d3c9c',
    '69783dfe58e2b002858add29e51fa78e',
  ];
  
  for (const key of testKeys) {
    const sig = createHmac('sha256', key)
      .update(canonical)
      .digest('hex');
    
    if (sig === wrongSignature) {
      console.log(`\n✅ FOUND! Hardcoded key: ${key}`);
      return;
    }
  }
  
  console.log("\n❌ Could not find the key that produces this signature");
  
  process.exit(0);
}

findWrongKey();