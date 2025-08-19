/**
 * Rounds a number down to 2 decimal places
 * Examples:
 * - 10.999 -> 10.99
 * - 10.991 -> 10.99
 * - 10.99 -> 10.99
 * - 10.9 -> 10.90
 * 
 * @param value The number to round down
 * @returns The number rounded down to 2 decimal places
 */
export function roundDown2(value: number): number {
  return Math.floor(value * 100) / 100;
}

/**
 * Truncates a number to 2 decimal places (cuts off without rounding)
 * Examples:
 * - 10.999 -> 10.99
 * - 10.991 -> 10.99
 * - 10.99 -> 10.99
 * - 10.9 -> 10.90
 * - -10.999 -> -10.99
 * 
 * @param value The number to truncate
 * @returns The number truncated to 2 decimal places
 */
export function truncate2(value: number): number {
  return Math.trunc(value * 100) / 100;
}

/**
 * Rounds a number down to specified decimal places
 * @param value The number to round down
 * @param decimals Number of decimal places (default: 2)
 * @returns The number rounded down to specified decimal places
 */
export function roundDown(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.floor(value * multiplier) / multiplier;
}