/**
 * Утилиты для расчета заморозки средств в RUB транзакциях
 */

/**
 * Округление вверх до 2 знаков после запятой
 */
export function ceilUp2(value: number): number {
  return Math.ceil(value * 100) / 100;
}

/**
 * Округление вниз до 2 знаков после запятой
 */
export function floorDown2(value: number): number {
  return Math.floor(value * 100) / 100;
}

/**
 * Расчет скорректированного курса с учетом ККК
 * @param rateMerchant - курс мерчанта
 * @param kkkPercent - процент ККК (коэффициент корректировки курса)
 * @param kkkOperation - операция для ККК (PLUS или MINUS)
 * @returns скорректированный курс, округленный вниз до сотых
 */
export function calculateAdjustedRate(
  rateMerchant: number,
  kkkPercent: number,
  kkkOperation: "PLUS" | "MINUS" = "MINUS"
): number {
  const adjusted =
    kkkOperation === "PLUS"
      ? rateMerchant * (1 + kkkPercent / 100)
      : rateMerchant * (1 - kkkPercent / 100);
  return floorDown2(adjusted);
}

/**
 * Расчет количества USDT для заморозки
 * @param amountRub - сумма в рублях
 * @param adjustedRate - скорректированный курс
 * @returns количество USDT для заморозки (обрезано до 2 знаков)
 */
export function calculateFrozenUsdt(
  amountRub: number,
  adjustedRate: number
): number {
  // Используем ceilUp2 для округления вверх до 2 знаков после запятой
  // Например: 0.0098 -> 0.01
  return ceilUp2(amountRub / adjustedRate);
}

/**
 * Расчет комиссии в USDT
 * @param frozenUsdt - количество замороженных USDT
 * @param feeInPercent - процент комиссии на ввод
 * @returns комиссия в USDT (обрезано до 2 знаков)
 */
export function calculateCommissionUsdt(
  frozenUsdt: number,
  feeInPercent: number
): number {
  // Используем ceilUp2 для округления вверх до 2 знаков после запятой
  return ceilUp2((frozenUsdt * feeInPercent) / 100);
}

/**
 * Полный расчет параметров заморозки для транзакции
 * @param amountRub - сумма в рублях
 * @param rateMerchant - курс мерчанта
 * @param kkkPercent - процент ККК
 * @param feeInPercent - процент комиссии на ввод
 * @param kkkOperation - операция для ККК (PLUS или MINUS)
 * @returns объект с рассчитанными параметрами
 */
export function calculateFreezingParams(
  amountRub: number,
  rateMerchant: number,
  kkkPercent: number,
  feeInPercent: number,
  kkkOperation: "PLUS" | "MINUS" = "MINUS"
): {
  adjustedRate: number;
  frozenUsdtAmount: number;
  calculatedCommission: number;
  totalRequired: number;
} {
  const adjustedRate = calculateAdjustedRate(
    rateMerchant,
    kkkPercent,
    kkkOperation
  );
  const frozenUsdtAmount = calculateFrozenUsdt(amountRub, adjustedRate);
  const calculatedCommission = calculateCommissionUsdt(
    frozenUsdtAmount,
    feeInPercent
  );
  // Округляем totalRequired вверх до 2 знаков после запятой
  const totalRequired = ceilUp2(frozenUsdtAmount + calculatedCommission);

  return {
    adjustedRate,
    frozenUsdtAmount,
    calculatedCommission,
    totalRequired,
  };
}

/**
 * Расчет прибыли трейдера при успешном завершении транзакции
 * @param frozenUsdtAmount - количество замороженных USDT
 * @param calculatedCommission - рассчитанная комиссия
 * @param amountRub - сумма в рублях
 * @param actualRate - фактический курс выполнения
 * @returns прибыль трейдера в USDT (обрезано до 2 знаков)
 */
export function calculateTraderProfit(
  frozenUsdtAmount: number,
  calculatedCommission: number,
  amountRub: number,
  actualRate: number
): number {
  // Прибыль трейдера = комиссия от сделки
  // Комиссия уже рассчитана как процент от замороженной суммы
  return floorDown2(Math.max(0, calculatedCommission)); // Прибыль не может быть отрицательной
}
