/**
 * Утилиты для заморозки баланса при создании транзакций
 */

import { db } from "@/db";
import { Prisma } from "@prisma/client";
import { floorDown2 } from "./freezing";
import { truncate2 } from "./rounding";
import {
  getFlexibleFeePercent,
  logFlexibleFeeApplication,
} from "./flexible-fee-calculator";

export interface FreezingResult {
  frozenUsdtAmount: number;
  calculatedCommission: number;
  totalRequired: number;
  kkkPercent: number;
  feeInPercent: number;
}

/**
 * Рассчитывает параметры заморозки для транзакции
 * @param amount - сумма транзакции в RUB
 * @param rate - курс (уже с применённым KKK)
 * @param traderId - ID трейдера
 * @param merchantId - ID мерчанта
 * @param methodId - ID метода
 * @returns параметры заморозки
 */
export async function calculateTransactionFreezing(
  amount: number,
  rate: number,
  traderId: string,
  merchantId: string,
  methodId: string
): Promise<FreezingResult> {
  // Получаем настройки трейдера для данного мерчанта и метода
  const traderMerchant = await db.traderMerchant.findUnique({
    where: {
      traderId_merchantId_methodId: {
        traderId,
        merchantId,
        methodId,
      },
    },
  });

  // Получаем настройки KKK из системы
  const kkkSetting = await db.systemConfig.findUnique({
    where: { key: "kkk_percent" },
  });

  const kkkPercent = kkkSetting ? parseFloat(kkkSetting.value) : 0;

  // Используем гибкую систему расчета комиссий
  const feeInPercent = await getFlexibleFeePercent(
    traderId,
    merchantId,
    methodId,
    amount,
    "IN"
  );

  // Рассчитываем заморозку - только основная сумма (amount / rate)
  // Используем floorDown2 для обрезания до 2 знаков после запятой
  const frozenUsdtAmount = floorDown2(amount / rate);
  // НЕ рассчитываем комиссию при создании - только при подтверждении!
  const calculatedCommission = 0; // Будет рассчитана при смене статуса на READY
  const totalRequired = frozenUsdtAmount; // Замораживаем только основную сумму без комиссии

  console.log(
    `[Transaction Freezing] Calculation: amount=${amount}, rate=${rate}, frozenUsdt=${frozenUsdtAmount}, feePercent=${feeInPercent}, commission=${calculatedCommission}, total=${totalRequired}`
  );

  return {
    frozenUsdtAmount,
    calculatedCommission,
    totalRequired,
    kkkPercent,
    feeInPercent,
  };
}

/**
 * Замораживает баланс трейдера в рамках транзакции
 * @param prisma - экземпляр Prisma для транзакций
 * @param traderId - ID трейдера
 * @param freezingParams - параметры заморозки
 * @returns обновленный трейдер
 */
export async function freezeTraderBalance(
  prisma: Prisma.TransactionClient,
  traderId: string,
  freezingParams: FreezingResult
) {
  // Проверяем достаточность баланса
  const trader = await prisma.user.findUnique({
    where: { id: traderId },
  });

  if (!trader) {
    throw new Error("Трейдер не найден");
  }

  const availableBalance = trader.trustBalance - trader.frozenUsdt;
  if (availableBalance < freezingParams.totalRequired) {
    throw new Error(
      `Недостаточно баланса трейдера. Требуется: ${freezingParams.totalRequired}, доступно: ${availableBalance}`
    );
  }

  // Замораживаем баланс и списываем с траст-баланса
  const updatedTrader = await prisma.user.update({
    where: { id: traderId },
    data: {
      frozenUsdt: { increment: truncate2(freezingParams.totalRequired) },
      trustBalance: { decrement: truncate2(freezingParams.totalRequired) },
    },
  });

  console.log(
    `[Transaction Freezing] Frozen ${freezingParams.totalRequired} USDT for trader ${traderId}`
  );

  return updatedTrader;
}

/**
 * Создает транзакцию с заморозкой баланса
 * @param data - данные для создания транзакции
 * @param freezeBalance - нужно ли замораживать баланс
 * @returns созданная транзакция
 */
export async function createTransactionWithFreezing(
  data: Prisma.TransactionCreateInput & {
    traderId?: string;
    merchantId: string;
    methodId: string;
    amount: number;
    rate: number;
  },
  freezeBalance: boolean = true
) {
  return await db.$transaction(async (prisma) => {
    let freezingParams: FreezingResult | null = null;

    // Если указан трейдер и нужно замораживать баланс
    if (data.traderId && freezeBalance && data.type === "IN") {
      freezingParams = await calculateTransactionFreezing(
        data.amount,
        data.rate,
        data.traderId,
        data.merchantId,
        data.methodId
      );

      // Замораживаем баланс
      await freezeTraderBalance(prisma, data.traderId, freezingParams);
    }

    // Создаем транзакцию с параметрами заморозки
    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        ...(freezingParams
          ? {
              frozenUsdtAmount: freezingParams.frozenUsdtAmount,
              calculatedCommission: freezingParams.calculatedCommission,
              kkkPercent: freezingParams.kkkPercent,
              feeInPercent: freezingParams.feeInPercent,
              adjustedRate: data.rate, // Deprecated, kept for compatibility
            }
          : {}),
      },
      include: {
        merchant: true,
        method: true,
        trader: true,
        requisites: true,
      },
    });

    return transaction;
  });
}
