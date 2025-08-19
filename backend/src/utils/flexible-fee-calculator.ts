import { db } from "@/db";

/**
 * Интерфейс для результата расчета гибких комиссий
 */
export interface FlexibleFeeResult {
  feeInPercent: number;
  feeOutPercent: number;
  appliedRange?: {
    id: string;
    minAmount: number;
    maxAmount: number;
  };
  usedDefault: boolean;
}

/**
 * Рассчитывает процентные ставки для трейдера на основе суммы сделки
 * Использует либо гибкие ставки по промежуткам, либо дефолтные значения
 *
 * @param traderId - ID трейдера
 * @param merchantId - ID мерчанта
 * @param methodId - ID метода
 * @param amount - сумма сделки в рублях
 * @returns объект с рассчитанными ставками
 */
export async function calculateFlexibleFees(
  traderId: string,
  merchantId: string,
  methodId: string,
  amount: number
): Promise<FlexibleFeeResult> {
  // Получаем настройки трейдера для данного мерчанта и метода
  const traderMerchant = await db.traderMerchant.findUnique({
    where: {
      traderId_merchantId_methodId: {
        traderId,
        merchantId,
        methodId,
      },
    },
    include: {
      feeRanges: {
        where: { isActive: true },
        orderBy: { minAmount: "asc" },
      },
    },
  });

  if (!traderMerchant) {
    // Если связь не найдена, возвращаем нулевые ставки
    return {
      feeInPercent: 0,
      feeOutPercent: 0,
      usedDefault: true,
    };
  }

  // Если гибкие ставки отключены, используем дефолтные значения
  if (
    !traderMerchant.useFlexibleRates ||
    traderMerchant.feeRanges.length === 0
  ) {
    return {
      feeInPercent: traderMerchant.feeIn,
      feeOutPercent: traderMerchant.feeOut,
      usedDefault: true,
    };
  }

  // Ищем подходящий промежуток для данной суммы
  const matchingRange = traderMerchant.feeRanges.find(
    (range) => amount >= range.minAmount && amount <= range.maxAmount
  );

  if (matchingRange) {
    // Найден подходящий промежуток
    return {
      feeInPercent: matchingRange.feeInPercent,
      feeOutPercent: matchingRange.feeOutPercent,
      appliedRange: {
        id: matchingRange.id,
        minAmount: matchingRange.minAmount,
        maxAmount: matchingRange.maxAmount,
      },
      usedDefault: false,
    };
  }

  // Промежуток не найден, используем дефолтные ставки
  return {
    feeInPercent: traderMerchant.feeIn,
    feeOutPercent: traderMerchant.feeOut,
    usedDefault: true,
  };
}

/**
 * Получает процентную ставку для конкретного типа операции (вход/выход)
 *
 * @param traderId - ID трейдера
 * @param merchantId - ID мерчанта
 * @param methodId - ID метода
 * @param amount - сумма сделки в рублях
 * @param operationType - тип операции ('IN' или 'OUT')
 * @returns процентная ставка
 */
export async function getFlexibleFeePercent(
  traderId: string,
  merchantId: string,
  methodId: string,
  amount: number,
  operationType: "IN" | "OUT"
): Promise<number> {
  const result = await calculateFlexibleFees(
    traderId,
    merchantId,
    methodId,
    amount
  );

  return operationType === "IN" ? result.feeInPercent : result.feeOutPercent;
}

/**
 * Логирует информацию о применении гибких ставок для отладки
 */
export function logFlexibleFeeApplication(
  transactionId: string,
  amount: number,
  result: FlexibleFeeResult,
  operationType: "IN" | "OUT"
) {
  const appliedFee =
    operationType === "IN" ? result.feeInPercent : result.feeOutPercent;

  if (result.usedDefault) {
    console.log(
      `[Flexible Fee] Transaction ${transactionId}: Used default fee ${appliedFee}% for ${operationType} operation (amount: ₽${amount})`
    );
  } else {
    console.log(
      `[Flexible Fee] Transaction ${transactionId}: Applied range-based fee ${appliedFee}% for ${operationType} operation (amount: ₽${amount}, range: ₽${result.appliedRange?.minAmount}-₽${result.appliedRange?.maxAmount})`
    );
  }
}
