import type { Timestamp } from 'spacetimedb';

export const toDate = (t: Timestamp) => t.toDate();
export const byNewest = <T extends { createdAt: Timestamp }>(a: T, b: T) =>
  a.createdAt.microsSinceUnixEpoch > b.createdAt.microsSinceUnixEpoch ? -1 : 1;

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
export function ago(t: Timestamp) {
  const s = (t.toDate().getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, n] of units) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
  return 'just now';
}

export function dueLabel(date: string) {
  const d = new Date(date + 'T00:00:00');
  const days = Math.round((d.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`;
  if (days < 14) return `Due in ${days} days`;
  return 'Due ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const thisMonth = () => new Date().toISOString().slice(0, 7);
export const today = () => new Date().toISOString().slice(0, 10);
export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}
export const monthName = (month: string, style: 'long' | 'short' = 'long') =>
  new Date(month + '-01T00:00:00').toLocaleDateString(undefined, { month: style, year: style === 'long' ? 'numeric' : undefined });
