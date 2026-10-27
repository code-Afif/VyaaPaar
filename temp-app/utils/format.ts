/**
 * Currency & Formatting Utilities for DukaanSaathi
 * All monetary amounts in business logic are handled in integer paise.
 */

export function formatPaise(paise: number, showDecimals: boolean = false): string {
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = absPaise / 100;

  const formatted = rupees.toLocaleString('en-IN', {
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  });

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatDate(dateStr: string): string {
  return dateStr;
}
