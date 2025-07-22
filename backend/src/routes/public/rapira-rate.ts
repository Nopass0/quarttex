import { Elysia } from "elysia";
import { db } from "@/db";
import { rapiraService } from "@/services/rapira.service";

export const rapiraRateRoutes = new Elysia()
  .get("/rapira-rate", async () => {
    try {
      // Get current Rapira rate
      const baseRate = await rapiraService.getUsdtRubRate();
      
      // Get KKK settings from database
      const rateSettings = await db.rateSetting.findFirst({
        where: { id: 1 }
      });
      
      const rapiraKkk = rateSettings?.rapiraKkk || 0;
      
      // Apply KKK to the rate
      const rateWithKkk = await rapiraService.getRateWithKkk(rapiraKkk);
      
      return {
        success: true,
        data: {
          baseRate,
          kkk: rapiraKkk,
          rate: rateWithKkk,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('[RapiraRate] Error:', error);
      return {
        success: false,
        error: 'Failed to fetch Rapira rate'
      };
    }
  })
  .get("/rapira-rate/raw", async () => {
    try {
      // Get raw rate without KKK applied
      const rate = await rapiraService.getUsdtRubRate();
      
      return {
        success: true,
        data: {
          rate,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('[RapiraRate] Error:', error);
      return {
        success: false,
        error: 'Failed to fetch Rapira rate'
      };
    }
  });