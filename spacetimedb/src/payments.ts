import { t } from 'spacetimedb/server';
import db from './schema';
import { CURRENCIES, fail, log, req, text } from './lib';
import { insertTransfer } from './transfers';

// Demo payments. Nothing here contacts a bank; it records what a real integration would.
const PURPOSES = ['send', 'receive'];
const KINDS = ['checking', 'savings', 'wallet', 'debit'];

export const addPaymentMethod = db.reducer({
  purpose: t.string(), institution: t.string(), kind: t.string(), holderName: t.string(), last4: t.string(), currency: t.string(), country: t.string(),
}, (ctx, a) => {
  if (!PURPOSES.includes(a.purpose)) fail('Choose whether this account sends or receives.');
  if (!KINDS.includes(a.kind)) fail('Unsupported account type.');
  if (!/^\d{4}$/.test(a.last4)) fail('Store only the last four digits of an account.');
  if (!CURRENCIES.includes(a.currency)) fail('Unsupported currency.');
  if (!/^[A-Z]{2}$/.test(a.country)) fail('Unsupported country.');
  if ([...ctx.db.paymentMethod.owner.filter(ctx.sender)].length >= 10) fail('You can link up to 10 accounts.');
  ctx.db.paymentMethod.insert({
    ...a, id: 0n, owner: ctx.sender, institution: text(a.institution, 'Bank', 80), holderName: text(a.holderName, 'Account holder', 80), createdAt: ctx.timestamp,
  });
});

export const removePaymentMethod = db.reducer({ id: t.u64() }, (ctx, { id }) => {
  const m = ctx.db.paymentMethod.id.find(id);
  if (!m || !m.owner.isEqual(ctx.sender)) fail('Account not found.');
  ctx.db.paymentMethod.id.delete(id);
});

export const sendMoney = db.reducer({
  requestId: t.u64(), fundingId: t.u64(), payoutId: t.u64(), amount: t.u64(), fee: t.u64(), expected: t.u64(), rate: t.string(),
}, (ctx, a) => {
  const r = req(ctx, a.requestId);
  const funding = ctx.db.paymentMethod.id.find(a.fundingId);
  const payout = ctx.db.paymentMethod.id.find(a.payoutId);
  if (!funding || !funding.owner.isEqual(ctx.sender) || funding.purpose !== 'send') fail('Choose one of your linked accounts to pay from.');
  if (!payout || !payout.owner.isEqual(r.author) || payout.purpose !== 'receive') fail("Choose the requester's receiving account.");
  const note = `BridgeHome Pay (demo): ${funding.institution} ••${funding.last4} → ${payout.institution} ••${payout.last4}`;
  insertTransfer(ctx, r.id, {
    amount: a.amount, fee: a.fee, expected: a.expected, receiveCurrency: payout.currency, rate: a.rate, note,
    fundingMethodId: funding.id, payoutMethodId: payout.id,
  }, 'Money sent with BridgeHome Pay (demo)');
  log(ctx, r.groupId, 'Deposit scheduled (demo)', `${payout.institution} ••${payout.last4}`);
});
