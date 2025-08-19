import { db } from './src/db';
import { createHmac } from 'node:crypto';
import { canonicalJson } from './src/utils/canonicalJson';

async function checkAllWellbitMerchants() {
  const publicKey = "dc42391c8e504354b818622cee1d7069";
  
  // Найдем ВСЕ мерчанты с этим публичным ключом
  const merchants = await db.merchant.findMany({
    where: { apiKeyPublic: publicKey }
  });
  
  console.log(`Found ${merchants.length} merchant(s) with public key: ${publicKey}\n`);
  
  const responseBody = { "error": "Method not available for merchant" };
  const canonical = canonicalJson(responseBody);
  const wrongSignature = "67cb7790bd28caac94388405b4525cba86877e212ad9a5c64fc88cc6cc11afbe";
  const correctSignature = "7aa4a5926b7d565b5f07912571c857c386e8716c1887491ad10720e96237b007";
  
  for (const merchant of merchants) {
    console.log(`Merchant: ${merchant.name} (ID: ${merchant.id})`);
    console.log(`  Public Key: ${merchant.apiKeyPublic}`);
    console.log(`  Private Key: ${merchant.apiKeyPrivate}`);
    
    if (merchant.apiKeyPrivate) {
      const signature = createHmac('sha256', merchant.apiKeyPrivate)
        .update(canonical)
        .digest('hex');
      
      console.log(`  Generated signature: ${signature}`);
      
      if (signature === wrongSignature) {
        console.log(`  ⚠️ THIS MERCHANT PRODUCES THE WRONG SIGNATURE!`);
      } else if (signature === correctSignature) {
        console.log(`  ✅ This merchant produces the correct signature`);
      } else {
        console.log(`  ❓ This merchant produces a different signature`);
      }
    } else {
      console.log(`  ⚠️ No private key set`);
    }
    console.log();
  }
  
  // Также проверим ВСЕ мерчанты с любыми API ключами
  console.log("=== Checking ALL merchants with API keys ===");
  const allMerchantsWithKeys = await db.merchant.findMany({
    where: {
      apiKeyPrivate: { not: null }
    }
  });
  
  for (const merchant of allMerchantsWithKeys) {
    if (merchant.apiKeyPrivate) {
      const signature = createHmac('sha256', merchant.apiKeyPrivate)
        .update(canonical)
        .digest('hex');
      
      if (signature === wrongSignature) {
        console.log(`\n🔴 FOUND! Merchant "${merchant.name}" (ID: ${merchant.id})`);
        console.log(`   Public Key: ${merchant.apiKeyPublic}`);
        console.log(`   Private Key: ${merchant.apiKeyPrivate}`);
        console.log(`   This merchant's private key produces the wrong signature!`);
      }
    }
  }
  
  process.exit(0);
}

checkAllWellbitMerchants();