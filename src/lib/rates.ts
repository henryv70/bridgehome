import { digits } from './money';

// Indicative demo rates: units of each currency per 1 USD. Not live market data.
const PER_USD: Record<string, number> = {
  USD: 1, EUR: 0.86, GBP: 0.75, CAD: 1.39, AUD: 1.52, NZD: 1.71, JPY: 151.2, KRW: 1392, CNY: 7.12, HKD: 7.78, TWD: 30.6,
  SGD: 1.29, CHF: 0.8, AED: 3.6725, SAR: 3.75, VND: 26310, PHP: 58.42, MXN: 18.45, INR: 88.3, PKR: 281.4, BDT: 122.1,
  NPR: 141.3, LKR: 302.5, IDR: 16480, THB: 32.6, MYR: 4.21, KHR: 4015, MMK: 2099, NGN: 1478, GHS: 12.3, KES: 129.2,
  ZAR: 17.4, EGP: 48.2, MAD: 9.1, BRL: 5.38, COP: 3890, PEN: 3.46, GTQ: 7.68, HNL: 26.3, DOP: 63.4, JMD: 159.8,
  HTG: 131.2, UAH: 41.6, PLN: 3.66, TRY: 41.9,
};

// Rate as an exact decimal string the server accepts (no exponent, ≤ 12 decimals).
export function quoteRate(from: string, to: string) {
  const r = (PER_USD[to] ?? 1) / (PER_USD[from] ?? 1);
  const s = r.toFixed(r >= 100 ? 2 : r >= 1 ? 4 : 6);
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

// Converts minor units across currencies at a decimal rate.
export function convertMinor(amount: bigint, from: string, to: string, rate: string) {
  const major = Number(amount) / 10 ** digits(from);
  return BigInt(Math.round(major * Number(rate) * 10 ** digits(to)));
}

// Demo pricing: $0.99 plus 0.5%, in the sending currency's minor units.
export function demoFee(amount: bigint, currency: string) {
  const unit = 10n ** BigInt(digits(currency));
  return (99n * unit) / 100n + (amount * 5n) / 1000n;
}

// Approximate USD value of an amount, for ranking across currencies only.
export function toUsdApprox(amount: bigint, currency: string) {
  return Number(amount) / 10 ** digits(currency) / (PER_USD[currency] ?? 1);
}
