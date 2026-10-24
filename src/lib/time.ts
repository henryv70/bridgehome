import type { Timestamp } from 'spacetimedb';
import { locale, t, tn } from './i18n';

export const toDate = (t: Timestamp) => t.toDate();
export const byNewest = <T extends { createdAt: Timestamp }>(a: T, b: T) =>
  a.createdAt.microsSinceUnixEpoch > b.createdAt.microsSinceUnixEpoch ? -1 : 1;

export function ago(ts: Timestamp) {
  const s = (ts.toDate().getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, n] of units) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
  return t('just now');
}

export function dueLabel(date: string) {
  const d = new Date(date + 'T00:00:00');
  const days = Math.round((d.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  if (days === 0) return t('Due today');
  if (days === 1) return t('Due tomorrow');
  if (days < 0) return tn('{n} day overdue', '{n} days overdue', -days);
  if (days < 14) return t('Due in {n} days', { n: days });
  return t('Due {date}', { date: d.toLocaleDateString(locale(), { month: 'short', day: 'numeric' }) });
}

export const thisMonth = () => new Date().toISOString().slice(0, 7);
export const today = () => new Date().toISOString().slice(0, 10);
export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}
export const monthName = (month: string, style: 'long' | 'short' = 'long') =>
  new Date(month + '-01T00:00:00').toLocaleDateString(locale(), { month: style, year: style === 'long' ? 'numeric' : undefined });
