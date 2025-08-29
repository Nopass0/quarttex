/**
 * Утилиты для работы с числами
 */

/**
 * Обрезание числа до 2 знаков после запятой (округление вниз)
 * @param value - исходное значение
 * @returns значение с 2 знаками после запятой
 */
export function truncateToTwoDecimals(value: number): number {
  return Math.floor(value * 100) / 100;
}

/**
 * Форматирование числа для отображения (с 2 знаками после запятой)
 * @param value - исходное значение
 * @returns строка с форматированным числом
 */
export function formatUsdt(value: number): string {
  return truncateToTwoDecimals(value).toFixed(2);
}