/** Convert a decimal amount (e.g. 9.99) to cents (integer, e.g. 999) */
export function toCents(amount: number): number {
  return Math.round(amount * 100)
}

/** Convert cents to decimal (e.g. 999 → 9.99) */
export function fromCents(cents: number): number {
  return cents / 100
}

/** Format cents as a currency string (e.g. 999 → "€9.99") */
export function formatMoney(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(fromCents(cents))
}

/** Format a plain decimal number as currency */
export function formatDecimal(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}
