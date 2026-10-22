export const SUPPORTED_CURRENCIES = ['AED', 'INR'] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];
export const DEFAULT_CURRENCY: CurrencyCode = 'AED';

export const normalizeCurrencyCode = (currency?: string): CurrencyCode => {
  const normalized = typeof currency === 'string' ? currency.toUpperCase() : '';
  return SUPPORTED_CURRENCIES.includes(normalized as CurrencyCode)
    ? (normalized as CurrencyCode)
    : DEFAULT_CURRENCY;
};
