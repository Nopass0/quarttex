import { db } from "@/db";
import { RateSource, KkkOperationType } from "@prisma/client";

async function initRateSources() {
  console.log("Initializing rate sources...");

  try {
    // Check if rate sources already exist
    const existingSources = await db.rateSourceConfig.findMany();
    
    if (existingSources.length > 0) {
      console.log("Rate sources already exist, skipping initialization");
      return;
    }

    // Create Bybit source
    const bybitSource = await db.rateSourceConfig.create({
      data: {
        source: RateSource.bybit,
        displayName: "Bybit",
        kkkPercent: 0,
        kkkOperation: KkkOperationType.MINUS,
        isActive: true,
        baseRate: null,
        lastRateUpdate: null
      }
    });
    console.log("Created Bybit rate source:", bybitSource.id);

    // Create Rapira source
    const rapiraSource = await db.rateSourceConfig.create({
      data: {
        source: RateSource.rapira,
        displayName: "Rapira",
        kkkPercent: 0,
        kkkOperation: KkkOperationType.MINUS,
        isActive: true,
        baseRate: null,
        lastRateUpdate: null
      }
    });
    console.log("Created Rapira rate source:", rapiraSource.id);

    console.log("Rate sources initialized successfully");
  } catch (error) {
    console.error("Error initializing rate sources:", error);
  } finally {
    await db.$disconnect();
  }
}

// Run the initialization
initRateSources();
