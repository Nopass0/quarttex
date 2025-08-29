import { db } from '../src/db';

async function updateProductionWellbitKeys() {
  const publicKey = "dc42391c8e504354b818622cee1d7069";
  const correctPrivateKey = "40ad418bc9534184a11bcd75f9582131";
  
  console.log("=== Updating Wellbit Merchant Keys ===\n");
  
  // Найдем всех мерчантов с этим публичным ключом
  const merchants = await db.merchant.findMany({
    where: { apiKeyPublic: publicKey }
  });
  
  console.log(`Found ${merchants.length} merchant(s) with public key: ${publicKey}\n`);
  
  for (const merchant of merchants) {
    console.log(`Merchant: ${merchant.name} (ID: ${merchant.id})`);
    console.log(`  Current private key: ${merchant.apiKeyPrivate}`);
    
    if (merchant.apiKeyPrivate !== correctPrivateKey) {
      // Обновляем приватный ключ
      const updated = await db.merchant.update({
        where: { id: merchant.id },
        data: {
          apiKeyPrivate: correctPrivateKey,
        }
      });
      console.log(`  ✅ Updated to: ${correctPrivateKey}`);
    } else {
      console.log(`  ✅ Already has correct key`);
    }
  }
  
  // Если мерчанта нет, создадим его
  if (merchants.length === 0) {
    console.log("No merchant found with this public key. Creating new one...");
    
    const newMerchant = await db.merchant.create({
      data: {
        name: "Wellbit API",
        token: "wellbit-api-" + Date.now(),
        apiKeyPublic: publicKey,
        apiKeyPrivate: correctPrivateKey,
        wellbitCallbackUrl:
          "https://wellbit.pro/cascade/cb/79af32c6-37e2-4dd1-bf7f-fbef29bf2a24",
      }
    });
    
    console.log(`✅ Created new merchant: ${newMerchant.name}`);
    console.log(`   ID: ${newMerchant.id}`);
    console.log(`   Public Key: ${newMerchant.apiKeyPublic}`);
    console.log(`   Private Key: ${newMerchant.apiKeyPrivate}`);
  }
  
  console.log("\n✅ Done! Wellbit merchant keys are now correct.");
  console.log("Make sure to restart the backend service if running in production.");
  
  process.exit(0);
}

updateProductionWellbitKeys().catch(console.error);