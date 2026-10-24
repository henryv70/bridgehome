import { formatMoney } from './money';
import { toUsdApprox } from './rates';

export type Pledge = { groupId: bigint; requestId: bigint; name: string; amount: bigint; currency: string };

// "$1,250.00" or "$1,250.00 + ₱500.00" when pledges span currencies.
export function formatTotals(rows: readonly Pledge[]) {
  const by = new Map<string, bigint>();
  for (const r of rows) by.set(r.currency, (by.get(r.currency) ?? 0n) + r.amount);
  if (!by.size) return formatMoney(0n, 'USD');
  return [...by].sort((a, b) => toUsdApprox(b[1], b[0]) - toUsdApprox(a[1], a[0])).map(([c, n]) => formatMoney(n, c)).join(' + ');
}

export type Donor = { name: string; pledges: Pledge[]; families: number; usd: number };

// Supporters ranked by total pledged. Pledges are public by display name, so names group them.
export function topDonors(rows: readonly Pledge[], limit = 10): Donor[] {
  const by = new Map<string, Pledge[]>();
  for (const r of rows) {
    const key = r.name.trim().toLowerCase();
    by.set(key, [...(by.get(key) ?? []), r]);
  }
  return [...by.values()]
    .map(pledges => ({
      name: pledges[0].name.trim(),
      pledges,
      families: new Set(pledges.map(p => String(p.groupId))).size,
      usd: pledges.reduce((s, p) => s + toUsdApprox(p.amount, p.currency), 0),
    }))
    .sort((a, b) => b.usd - a.usd)
    .slice(0, limit);
}

export const percent = (part: bigint, whole: bigint) => (whole > 0n ? Math.min(100, Number((part * 100n) / whole)) : 0);
