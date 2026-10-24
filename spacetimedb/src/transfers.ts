import { type Ctx, fail, log, member, money, rate, req, text } from './lib';

type TransferInput = {
  amount: bigint; fee: bigint; expected: bigint; receiveCurrency: string; rate: string; note: string;
  fundingMethodId: bigint; payoutMethodId: bigint;
};

// Shared by manual recording and the demo BridgeHome Pay send.
export function insertTransfer(ctx: Ctx, requestId: bigint, a: TransferInput, action: string) {
  const r = req(ctx, requestId);
  member(ctx, r.groupId, 'sender');
  if (!['approved', 'sent', 'received'].includes(r.status)) fail('Request must be approved and open.');
  money(a.amount, r.currency);
  money(a.fee, r.currency, true);
  money(a.expected, a.receiveCurrency);
  rate(a.rate);
  const sent = [...ctx.db.recordedTransfer.requestId.filter(r.id)].reduce((s, t) => s + t.amount, 0n);
  if (sent + a.amount > r.approved) fail('Total sent cannot exceed approval.');
  const row = ctx.db.recordedTransfer.insert({
    ...a, note: text(a.note, 'Transfer note'), id: 0n, groupId: r.groupId, requestId: r.id, currency: r.currency,
    author: ctx.sender, createdAt: ctx.timestamp,
  });
  ctx.db.request.id.update({ ...r, status: 'sent' });
  log(ctx, r.groupId, action, row.id + ': ' + a.amount + ' ' + r.currency + ' minor units; fee ' + a.fee + ' ' + r.currency
    + ' minor units; expected ' + a.expected + ' ' + a.receiveCurrency + ' minor units; rate ' + a.rate);
  return row;
}
