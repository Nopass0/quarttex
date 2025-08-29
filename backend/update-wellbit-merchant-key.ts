import { db } from './src/db';

async function updateWellbitMerchantKey() {
  const publicKey = "dc42391c8e504354b818622cee1d7069";
  const correctPrivateKey = "40ad418bc9534184a11bcd75f9582131"; // ПРАВИЛЬНЫЙ приватный ключ
  
  // Найдем мерчанта
  const merchant = await db.merchant.findFirst({
    where: { apiKeyPublic: publicKey }
  });
  
  if (merchant) {
    // Обновляем приватный ключ
    const updated = await db.merchant.update({
      where: { id: merchant.id },
      data: {
        apiKeyPrivate: correctPrivateKey,
      }
    });
    console.log("✅ Updated merchant:", updated.name);
    console.log("   Public Key:", updated.apiKeyPublic);
    console.log("   Private Key:", updated.apiKeyPrivate);
  } else {
    // Создаем нового мерчанта
    const newMerchant = await db.merchant.create({
      data: {
        name: "Wellbit API",
        token: "wellbit-" + Date.now(),
        apiKeyPublic: publicKey,
        apiKeyPrivate: correctPrivateKey,
        wellbitCallbackUrl:
          "https://wellbit.pro/cascade/cb/79af32c6-37e2-4dd1-bf7f-fbef29bf2a24",
      }
    });
    console.log("✅ Created new merchant:", newMerchant.name);
    console.log("   Public Key:", newMerchant.apiKeyPublic);
    console.log("   Private Key:", newMerchant.apiKeyPrivate);
  }
  
  process.exit(0);
}

updateWellbitMerchantKey();