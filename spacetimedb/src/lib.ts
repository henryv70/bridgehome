import { SenderError, type InferSchema, type ReducerCtx } from 'spacetimedb/server';
import db from './schema';

export type Ctx = ReducerCtx<InferSchema<typeof db>>;

export const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'JPY', 'KRW', 'CNY', 'HKD', 'TWD', 'SGD', 'CHF', 'AED', 'SAR',
  'VND', 'PHP', 'MXN', 'INR', 'PKR', 'BDT', 'NPR', 'LKR', 'IDR', 'THB', 'MYR', 'KHR', 'MMK',
  'NGN', 'GHS', 'KES', 'ZAR', 'EGP', 'MAD', 'BRL', 'COP', 'PEN', 'GTQ', 'HNL', 'DOP', 'JMD', 'HTG', 'UAH', 'PLN', 'TRY',
];
export const ROLES = ['sender', 'recipient'];
export const OPEN_FOR_FUNDING = ['submitted', 'approved', 'sent'];

export function fail(message: string): never {
  throw new SenderError(message);
}

export function text(value: string, label: string, max = 1000) {
  if (!value.trim() || value.length > max) fail(`${label} is required (maximum ${max} characters).`);
  return value.trim();
}

export function optionalText(value: string, label: string, max = 1000) {
  if (value.length > max) fail(`${label} can be at most ${max} characters.`);
  return value.trim();
}

export function money(amount: bigint, currency: string, zero = false) {
  if (amount < (zero ? 0n : 1n) || amount > 1000000000000n) fail('Amount is outside the supported range.');
  if (!CURRENCIES.includes(currency)) fail('Unsupported currency.');
}

export function date(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Use a valid date.');
  const d = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value) fail('Invalid calendar date.');
}

export function month(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) fail('Use a valid month.');
}

export function rate(value: string) {
  if (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,12})?$/.test(value) || !/[1-9]/.test(value)) {
    fail('Enter a positive decimal exchange rate.');
  }
}

export function member(ctx: Ctx, groupId: bigint, role?: string) {
  const m = [...ctx.db.membership.groupId.filter(groupId)].find(m => m.identity.equals(ctx.sender));
  if (!m || (role && m.role !== role)) {
    fail('Unauthorized: this action requires an authorized ' + (role ?? 'family member') + '.');
  }
  return m;
}

export function isMember(ctx: Ctx, groupId: bigint) {
  return [...ctx.db.membership.groupId.filter(groupId)].some(m => m.identity.equals(ctx.sender));
}

export function owner(ctx: Ctx, groupId: bigint) {
  member(ctx, groupId);
  const g = ctx.db.family.id.find(groupId);
  if (!g?.owner.equals(ctx.sender)) fail('Only the group owner can do this.');
  return g;
}

export function log(ctx: Ctx, groupId: bigint, action: string, detail: string) {
  ctx.db.audit.insert({ id: 0n, groupId, actor: ctx.sender, action, detail, createdAt: ctx.timestamp });
}

export function req(ctx: Ctx, id: bigint) {
  const r = ctx.db.request.id.find(id);
  if (!r) fail('Request not found.');
  member(ctx, r.groupId);
  return r;
}

export function randomHex(ctx: Ctx, bytes: number) {
  return Array.from(ctx.random.fill(new Uint8Array(bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
