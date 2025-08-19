import { db } from "../db";
import { MerchantRequestType } from "@prisma/client";

export class MerchantRequestLogService {
  static async log(merchantId: string, type: MerchantRequestType, data: any) {
    try {
      await db.merchantRequestLog.create({
        data: {
          merchantId,
          type,
          data,
        },
      });
    } catch (error) {
      console.error("Failed to log merchant request", error);
    }
  }
}
