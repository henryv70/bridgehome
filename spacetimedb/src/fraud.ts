import { t } from 'spacetimedb/server';
import db from './schema';
import { fail, log, member, type Ctx } from './lib';

// Rule-based review flags. Advisory only: they are shown to senders and never block a request or payment.
type Request = NonNullable<ReturnType<Ctx['db']['request']['id']['find']>>;
type PaymentMethod = NonNullable<ReturnType<Ctx['db']['paymentMethod']['id']['find']>>;

const DAY = 86_400_000_000n;
const HOUR = 3_600_000_000n;
const sameCategory = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function flag(ctx: Ctx, r: Request, kind: string, severity: 'low' | 'medium' | 'high', detail: string) {
  if ([...ctx.db.fraudFlag.requestId.filter(r.id)].some(f => f.kind === kind && f.status === 'open')) return;
  ctx.db.fraudFlag.insert({ id: 0n, groupId: r.groupId, requestId: r.id, kind, severity, detail, status: 'open', createdAt: ctx.timestamp });
}

function median(values: bigint[]) {
  const s = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2n;
}

export function screenRequest(ctx: Ctx, r: Request) {
  const now = ctx.timestamp.microsSinceUnixEpoch;
  const others = [...ctx.db.request.groupId.filter(r.groupId)]
    .filter(o => o.id !== r.id && o.status !== 'draft' && o.currency === r.currency);

  const prior = others.filter(o => sameCategory(o.category, r.category)).map(o => o.amount);
  if (prior.length >= 2) {
    const m = median(prior);
    if (m > 0n && r.amount >= 3n * m) {
      const times = (r.amount + m / 2n) / m;
      flag(ctx, r, 'amount_spike', r.amount >= 5n * m ? 'high' : 'medium', `About ${times}× the usual amount for ${r.category} requests.`);
    }
  }

  const mine = others.filter(o => o.author.equals(r.author));
  const recent = mine.filter(o => now - o.createdAt.microsSinceUnixEpoch < 7n * DAY).length + 1;
  if (recent >= 3) flag(ctx, r, 'rapid_repeat', recent >= 5 ? 'medium' : 'low', `${recent} requests from the same person in the past 7 days.`);

  const dup = mine.find(o => sameCategory(o.category, r.category) && o.status !== 'rejected'
    && now - o.createdAt.microsSinceUnixEpoch < 14n * DAY
    && (r.amount > o.amount ? r.amount - o.amount : o.amount - r.amount) * 10n <= o.amount);
  if (dup) flag(ctx, r, 'possible_duplicate', 'medium', `Similar to another ${r.category} request from the past two weeks.`);
}

export function screenPayout(ctx: Ctx, r: Request, payout: PaymentMethod) {
  if (ctx.timestamp.microsSinceUnixEpoch - payout.createdAt.microsSinceUnixEpoch < 72n * HOUR) {
    flag(ctx, r, 'new_payout_account', 'medium', 'The receiving account was added less than 3 days ago.');
  }
  const previous = [...ctx.db.recordedTransfer.iter()]
    .filter(tr => tr.payoutMethodId !== 0n && tr.requestId !== r.id && ctx.db.request.id.find(tr.requestId)?.author.equals(r.author))
    .sort((a, b) => (a.createdAt.microsSinceUnixEpoch < b.createdAt.microsSinceUnixEpoch ? 1 : -1))[0];
  if (previous && previous.payoutMethodId !== payout.id) {
    flag(ctx, r, 'payout_changed', 'medium', 'Money is going to a different account than last time.');
  }
}

export const resolveFraudFlag = db.reducer({ flagId: t.u64() }, (ctx, { flagId }) => {
  const f = ctx.db.fraudFlag.id.find(flagId);
  if (!f) fail('Flag not found.');
  member(ctx, f.groupId, 'sender');
  ctx.db.fraudFlag.id.update({ ...f, status: 'dismissed' });
  log(ctx, f.groupId, 'Review flag dismissed', '');
});
