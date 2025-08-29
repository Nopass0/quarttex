import { db } from '@/db';
import { BankType } from '@prisma/client';

// Cache for bank mappings
let bankMappingCache: Map<string, BankType> | null = null;
let cacheLastUpdated: Date | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Hardcoded bank mappings as fallback
const HARDCODED_BANK_MAPPINGS: Record<string, BankType> = {
  'TCSBRUB': BankType.TBANK,
  'SBERRUB': BankType.SBERBANK,
  'TBRUB': BankType.VTB,
  'ACRUB': BankType.ALFABANK,
  'RFBRUB': BankType.RAIFFEISEN,
  'ROSBRUB': BankType.ROSBANK,
  'SNRRUB': BankType.SINARA,
  'KUBRUB': BankType.URALSIB,
  'RSSBRUB': BankType.RENAISSANCE,
  'PSBRUB': BankType.PROMSVYAZBANK,
  'GPBRUB': BankType.GAZPROMBANK,
  'OZONBRUB': BankType.OZONBANK,
  'SVCMBRUB': BankType.SOVCOMBANK,
  'OTPBRUB': BankType.OTPBANK,
  'YANDXBRUB': BankType.TBANK,
  'RSHBRUB': BankType.ROSSELKHOZBANK,
  'URSBRUB': BankType.URALSIB,
  'MTSBRUB': BankType.MTSBANK,
  'POSTBRUB': BankType.POCHTABANK,
  'WBRUB': BankType.SBERBANK,
  'FORARUB': BankType.FORABANK,
  'AKBRSRUB': BankType.AKBARS,
  'BKSRUB': BankType.BCSBANK,
  'MKBRUB': BankType.MKB,
  'AVBRUB': BankType.AVANGARD,
  'BSPBRUB': BankType.SPBBANK,
  'HMERUB': BankType.HOMECREDIT,
  'LOKRUB': BankType.LOKOBANK,
  'GENRUB': BankType.GENBANK,
  'ABSLRUB': BankType.ABSOLUTBANK,
  'TOCHRUB': BankType.OTKRITIE,
  'CIBRUB': BankType.SBERBANK,
  'REALISTRUB': BankType.SBERBANK,
  'MILLRUB': BankType.SBERBANK,
  'ATBRUB': BankType.ALFABANK,
  'RENSRUB': BankType.RENAISSANCE,
  // Additional mappings for banks not in our system - map to closest alternatives
  'VNTSRUB': BankType.SBERBANK,
  'CHINVBRUB': BankType.SBERBANK,
  'TRKBRUB': BankType.TRANSKAPITALBANK,
  'MTSDRUB': BankType.MTSMONEY,
  'YAMRUB': BankType.SBERBANK,
  'RUSSTRUB': BankType.RUSSIANSTANDARD,
  'RUSBNKRUB': BankType.SBERBANK,
  'SVOIRUB': BankType.SVOYBANK,
  'KKBRUB': BankType.SBERBANK,
  'KBRRUB': BankType.SBERBANK,
  'BBRBRUB': BankType.BBRBANK,
  'UBRRRUB': BankType.UBRIR,
  'UNSTRMRUB': BankType.SBERBANK,
  'LVBRJNRUB': BankType.SBERBANK,
  'DOMRFRUB': BankType.SBERBANK,
  'AZAYTIHOOCEANRUB': BankType.SBERBANK,
  'SURGTNFTRUB': BankType.SBERBANK,
  'RNKBRUB': BankType.RNKB,
  'ZENRUB': BankType.SBERBANK,
  'CIFRUB': BankType.SBERBANK,
  'INGRUB': BankType.SBERBANK,
  'BPDRUB': BankType.SBERBANK,
  'EXRUB': BankType.SBERBANK,
  'UMRUB': BankType.SBERBANK,
  'NOVRUB': BankType.SBERBANK,
  'RDORRUB': BankType.SBERBANK,
  'SOLRUB': BankType.SBERBANK,
  'VBRRUB': BankType.SBERBANK,
  'SIBCRUB': BankType.SBERBANK,
  'KAPRUB': BankType.SBERBANK,
  'KZNRUB': BankType.SBERBANK,
  'TRSRUB': BankType.SBERBANK,
  'CREURUB': BankType.CREDITEUROPE,
  'FINRUB': BankType.SBERBANK,
  'AMOBRUB': BankType.SBERBANK,
  'VKPRUB': BankType.SBERBANK,
  'DATRUB': BankType.SBERBANK,
  'CHINDRUB': BankType.SBERBANK,
  'NORVRUB': BankType.SBERBANK,
  'MBARUB': BankType.SBERBANK,
  'HLNVBRUB': BankType.SBERBANK,
  'DLNSKRUB': BankType.DOLINSK,
  'mpbankrub': BankType.SBERBANK,
  'TIMRUB': BankType.SBERBANK,
  'ITURRUB': BankType.SBERBANK,
  'SEVERRUB': BankType.SBERBANK,
  'AKBPRUB': BankType.SBERBANK,
  'ALMZRUB': BankType.SBERBANK,
  'ENRGRUB': BankType.SBERBANK,
  'BGFRUB': BankType.SBERBANK,
  'KTBRUB': BankType.SBERBANK,
  'CUPRUB': BankType.SBERBANK,
  'KONTRUB': BankType.SBERBANK,
  'EURALRUB': BankType.SBERBANK,
  'PRSOCRUB': BankType.SBERBANK,
  'AVITORUB': BankType.SBERBANK,
  'AKBLARUB': BankType.SBERBANK,
  'NOXRUB': BankType.SBERBANK,
  'CBRRUB': BankType.SBERBANK,
  'INTZARUB': BankType.SBERBANK,
  'LUCHIRUB': BankType.SBERBANK,
  'TKBBRUB': BankType.SBERBANK
};

/**
 * Maps Wellbit bank code to our internal BankType
 * Uses database mappings with caching for performance
 */
export async function mapWellbitBankToOurs(wellbitBankCode: string | null): Promise<BankType> {
  // If no bank code provided, default to SBERBANK
  if (!wellbitBankCode) {
    return BankType.SBERBANK;
  }

  // Check if cache is valid
  if (
    bankMappingCache &&
    cacheLastUpdated &&
    Date.now() - cacheLastUpdated.getTime() < CACHE_TTL
  ) {
    const cachedMapping = bankMappingCache.get(wellbitBankCode);
    if (cachedMapping) {
      return cachedMapping;
    }
  }

  // Load mappings from database
  await refreshBankMappingCache();

  // Try to get mapping from refreshed cache
  const mapping = bankMappingCache?.get(wellbitBankCode);
  if (mapping) {
    return mapping;
  }

  // Try hardcoded mappings as fallback
  const hardcodedMapping = HARDCODED_BANK_MAPPINGS[wellbitBankCode];
  if (hardcodedMapping) {
    console.log(`Using hardcoded mapping for ${wellbitBankCode} -> ${hardcodedMapping}`);
    return hardcodedMapping;
  }

  // If no mapping found, try direct match by name
  const directMatch = Object.values(BankType).find(
    (bankType) => bankType === wellbitBankCode.toUpperCase()
  );
  if (directMatch) {
    return directMatch;
  }

  // Default to SBERBANK if no mapping found
  console.warn(`No mapping found for Wellbit bank code: ${wellbitBankCode}, defaulting to SBERBANK`);
  return BankType.SBERBANK;
}

/**
 * Refreshes the bank mapping cache from database
 */
async function refreshBankMappingCache(): Promise<void> {
  try {
    const mappings = await db.wellbitBankMapping.findMany();
    
    bankMappingCache = new Map();
    
    for (const mapping of mappings) {
      // Try to find matching BankType enum value
      const bankType = Object.values(BankType).find(
        (type) => type === mapping.ourBankName.toUpperCase()
      );
      
      if (bankType) {
        bankMappingCache.set(mapping.wellbitBankCode, bankType);
      } else {
        console.warn(`Invalid bank type in mapping: ${mapping.ourBankName}`);
      }
    }
    
    cacheLastUpdated = new Date();
  } catch (error) {
    console.error('Failed to refresh bank mapping cache:', error);
    // Keep existing cache if refresh fails
  }
}

/**
 * Get all Wellbit bank mappings
 */
export async function getAllWellbitBankMappings() {
  return await db.wellbitBankMapping.findMany({
    orderBy: { wellbitBankName: 'asc' }
  });
}

/**
 * Update Wellbit bank mapping
 */
export async function updateWellbitBankMapping(
  wellbitBankCode: string,
  ourBankName: string
): Promise<void> {
  await db.wellbitBankMapping.update({
    where: { wellbitBankCode },
    data: { ourBankName }
  });
  
  // Invalidate cache
  bankMappingCache = null;
  cacheLastUpdated = null;
}

/**
 * Maps our internal BankType to Wellbit bank code
 */
export async function mapOurBankToWellbit(ourBankType: BankType): Promise<string | null> {
  const mapping = await db.wellbitBankMapping.findFirst({
    where: { ourBankName: ourBankType }
  });
  
  return mapping?.wellbitBankCode || null;
}