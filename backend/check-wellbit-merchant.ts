import { db } from './src/db';

async function checkWellbitMerchant() {
  const merchant = await db.merchant.findFirst({
    where: {
      apiKeyPublic: "dc42391c8e504354b818622cee1d7069"
    }
  });

  if (merchant) {
    console.log("Found Wellbit merchant:");
    console.log("  ID:", merchant.id);
    console.log("  Name:", merchant.name);
    console.log("  Public Key:", merchant.apiKeyPublic);
    console.log("  Private Key:", merchant.apiKeyPrivate);
    console.log("  Callback URL:", merchant.wellbitCallbackUrl);
  } else {
    console.log("Merchant with public key 'dc42391c8e504354b818622cee1d7069' not found");
    
    // List all merchants with wellbit keys
    const wellbitMerchants = await db.merchant.findMany({
      where: {
        OR: [
          { apiKeyPublic: { not: null } },
          { apiKeyPrivate: { not: null } }
        ]
      }
    });
    
    console.log("\nAll merchants with API keys:");
    for (const m of wellbitMerchants) {
      console.log(`  ${m.name}:`);
      console.log(`    Public: ${m.apiKeyPublic}`);
      console.log(`    Private: ${m.apiKeyPrivate}`);
    }
  }
  
  process.exit(0);
}

checkWellbitMerchant();