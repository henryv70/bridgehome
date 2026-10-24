import { currencyLabel, t } from './i18n';

// Code, symbol, name. Order matches the server's supported list, grouped by region.
const TABLE: [string, string, string][] = [
  ['USD', '$', 'US dollar'], ['EUR', '€', 'Euro'], ['GBP', '£', 'British pound'], ['CAD', 'CA$', 'Canadian dollar'],
  ['AUD', 'A$', 'Australian dollar'], ['NZD', 'NZ$', 'New Zealand dollar'], ['JPY', '¥', 'Japanese yen'], ['KRW', '₩', 'South Korean won'],
  ['CNY', 'CN¥', 'Chinese yuan'], ['HKD', 'HK$', 'Hong Kong dollar'], ['TWD', 'NT$', 'New Taiwan dollar'], ['SGD', 'S$', 'Singapore dollar'],
  ['CHF', 'CHF ', 'Swiss franc'], ['AED', 'AED ', 'UAE dirham'], ['SAR', 'SAR ', 'Saudi riyal'],
  ['VND', '₫', 'Vietnamese đồng'], ['PHP', '₱', 'Philippine peso'], ['MXN', 'MX$', 'Mexican peso'], ['INR', '₹', 'Indian rupee'],
  ['PKR', 'Rs ', 'Pakistani rupee'], ['BDT', '৳', 'Bangladeshi taka'], ['NPR', 'NRs ', 'Nepalese rupee'], ['LKR', 'LKR ', 'Sri Lankan rupee'],
  ['IDR', 'Rp ', 'Indonesian rupiah'], ['THB', '฿', 'Thai baht'], ['MYR', 'RM ', 'Malaysian ringgit'], ['KHR', '៛', 'Cambodian riel'],
  ['MMK', 'K ', 'Myanmar kyat'], ['NGN', '₦', 'Nigerian naira'], ['GHS', 'GH₵', 'Ghanaian cedi'], ['KES', 'KSh ', 'Kenyan shilling'],
  ['ZAR', 'R ', 'South African rand'], ['EGP', 'E£', 'Egyptian pound'], ['MAD', 'MAD ', 'Moroccan dirham'], ['BRL', 'R$', 'Brazilian real'],
  ['COP', 'COL$', 'Colombian peso'], ['PEN', 'S/ ', 'Peruvian sol'], ['GTQ', 'Q', 'Guatemalan quetzal'], ['HNL', 'L ', 'Honduran lempira'],
  ['DOP', 'RD$', 'Dominican peso'], ['JMD', 'J$', 'Jamaican dollar'], ['HTG', 'G ', 'Haitian gourde'], ['UAH', '₴', 'Ukrainian hryvnia'],
  ['PLN', 'zł ', 'Polish złoty'], ['TRY', '₺', 'Turkish lira'],
];
export const CURRENCIES = TABLE.map(([c]) => c);
export const currencyName = (c: string) => currencyLabel(c, TABLE.find(([x]) => x === c)?.[2] ?? c);

// Currencies with no minor unit in everyday use.
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND']);
export const digits = (c: string) => (ZERO_DECIMAL.has(c) ? 0 : 2);

// Exact decimal string -> integer minor units. No floating point.
export function toMinor(v: string, c: string) {
  const d = digits(c);
  const clean = v.trim().replace(/,/g, '');
  if (!(d ? /^\d+(\.\d{1,2})?$/ : /^\d+$/).test(clean)) {
    throw Error(t('Enter a {currency} amount with at most {n} decimal places.', { currency: c, n: d }));
  }
  const [a, b = ''] = clean.split('.');
  return BigInt(a) * 10n ** BigInt(d) + BigInt(b.padEnd(d, '0') || '0');
}

// Integer minor units -> plain decimal string for inputs.
export function toDecimal(n: bigint, c: string) {
  const d = digits(c);
  if (!d) return String(n);
  return `${n / 100n}.${String(n % 100n).padStart(2, '0')}`;
}

const groups = (s: string) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const SYMBOL: Record<string, string> = Object.fromEntries(TABLE.map(([c, sym]) => [c, sym]));

export function formatMoney(n: bigint, c: string, opts: { compact?: boolean } = {}) {
  const neg = n < 0n;
  const abs = neg ? -n : n;
  const d = digits(c);
  const whole = d ? abs / 100n : abs;
  const cents = d ? abs % 100n : 0n;
  const sym = SYMBOL[c] ?? c + ' ';
  if (opts.compact && whole >= 10000n) {
    const k = Number(whole) / (whole >= 1_000_000n ? 1_000_000 : 1000);
    return `${neg ? '−' : ''}${sym}${k.toFixed(k < 10 ? 1 : 0)}${whole >= 1_000_000n ? 'M' : 'k'}`;
  }
  const showCents = d && (!opts.compact || cents !== 0n);
  return `${neg ? '−' : ''}${sym}${groups(String(whole))}${showCents ? '.' + String(cents).padStart(2, '0') : ''}`;
}

// For chart axes only; display text always uses formatMoney.
export const toNumber = (n: bigint, c: string) => Number(n) / 10 ** digits(c);

export const sum = <T,>(rows: readonly T[], f: (r: T) => bigint) => rows.reduce((s, r) => s + f(r), 0n);

// Exact decimal rate string with thousands separators, e.g. "26310" -> "26,310".
export function formatRate(rate: string) {
  const [i, f] = rate.split('.');
  return groups(i) + (f ? '.' + f : '');
}
