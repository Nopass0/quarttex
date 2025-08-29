/**
 * Middleware для проверки аукционных мерчантов
 * Определяет, нужно ли использовать аукционный флоу для создания сделок
 */

import { Elysia } from "elysia";
import { auctionIntegrationService } from "@/services/auction-integration.service";

/**
 * Middleware для проверки аукционных мерчантов
 */
export const auctionMerchantGuard = () =>
  new Elysia({ name: "auctionMerchantGuard" })
    .derive(async ({ merchant }) => {
      if (!merchant) {
        return {
          isAuctionMerchant: false,
          auctionConfig: null,
        };
      }

      try {
        // Проверяем, является ли мерчант аукционным
        const isAuctionMerchant = await auctionIntegrationService.isAuctionMerchant(merchant.id);
        
        // Получаем конфигурацию, если мерчант аукционный
        const auctionConfig = isAuctionMerchant 
          ? await auctionIntegrationService.getAuctionMerchantConfig(merchant.id)
          : null;

        return {
          isAuctionMerchant,
          auctionConfig,
        };
      } catch (error) {
        console.error(`[AuctionMerchantGuard] Ошибка проверки аукционного мерчанта:`, error);
        return {
          isAuctionMerchant: false,
          auctionConfig: null,
        };
      }
    });
