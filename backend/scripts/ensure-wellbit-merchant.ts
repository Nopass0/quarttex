import { db } from '@/db';
import { randomBytes } from 'node:crypto';

async function ensureWellbitMerchant() {
  try {
    // Check if Wellbit merchant exists
    let merchant = await db.merchant.findFirst({
      where: { name: 'Wellbit' }
    });

    if (merchant) {
      console.log('✅ Wellbit merchant already exists:', {
        id: merchant.id,
        name: merchant.name,
        hasPublicKey: !!merchant.apiKeyPublic,
        hasPrivateKey: !!merchant.apiKeyPrivate,
        hasCallbackUrl: !!merchant.wellbitCallbackUrl
      });
    } else {
      // Create Wellbit merchant
      merchant = await db.merchant.create({
        data: {
          name: 'Wellbit',
          token: randomBytes(32).toString('hex'),
          apiKeyPublic: randomBytes(16).toString('hex'),
          apiKeyPrivate: randomBytes(32).toString('hex'),
          wellbitCallbackUrl:
            'https://wellbit.pro/cascade/cb/79af32c6-37e2-4dd1-bf7f-fbef29bf2a24',
          balanceUsdt: 0,
          disabled: false,
          banned: false,
          countInRubEquivalent: false
        }
      });
      
      console.log('✅ Created Wellbit merchant:', {
        id: merchant.id,
        name: merchant.name,
        apiKeyPublic: merchant.apiKeyPublic,
        apiKeyPrivate: merchant.apiKeyPrivate,
        wellbitCallbackUrl: merchant.wellbitCallbackUrl
      });
    }

    // Check bank mappings
    const mappingCount = await db.wellbitBankMapping.count();
    console.log(`\n📊 Bank mappings: ${mappingCount} records`);

    if (mappingCount === 0) {
      console.log('❌ No bank mappings found. Run migration to populate them.');
    } else {
      const sampleMappings = await db.wellbitBankMapping.findMany({
        take: 5
      });
      console.log('\nSample mappings:');
      sampleMappings.forEach(m => {
        console.log(`  ${m.wellbitBankCode} (${m.wellbitBankName}) → ${m.ourBankName}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

ensureWellbitMerchant();