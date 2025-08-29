import { db } from './src/db';

async function setupWellbitTestMerchant() {
  const publicKey = "dc42391c8e504354b818622cee1d7069";
  const privateKey = "00a1c8cf699578e1043552503d79347771f481feda5689845b77d495593da67c";
  
  // Check if merchant exists
  const existing = await db.merchant.findFirst({
    where: { apiKeyPublic: publicKey }
  });
  
  if (existing) {
    // Update existing merchant
    const updated = await db.merchant.update({
      where: { id: existing.id },
      data: {
        apiKeyPrivate: privateKey,
      }
    });
    console.log("Updated existing merchant:", updated.name);
  } else {
    // Create new merchant
    const merchant = await db.merchant.create({
      data: {
        name: "Wellbit Test Merchant",
        token: "wellbit-test-" + Date.now(),
        apiKeyPublic: publicKey,
        apiKeyPrivate: privateKey,
        wellbitCallbackUrl:
          "https://wellbit.pro/cascade/cb/79af32c6-37e2-4dd1-bf7f-fbef29bf2a24",
      }
    });
    console.log("Created new merchant:", merchant.name);
  }
  
  console.log("Merchant configured with:");
  console.log("  Public Key:", publicKey);
  console.log("  Private Key:", privateKey);
  
  process.exit(0);
}

setupWellbitTestMerchant();