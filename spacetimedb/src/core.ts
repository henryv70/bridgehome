import { t } from 'spacetimedb/server';
import { Timestamp } from 'spacetimedb';
import db from './schema';
import { insertTransfer } from './transfers';
import { ROLES, date, fail, log, member, money, owner, randomHex, rate, req, text } from './lib';

export const saveProfile = db.reducer({ name: t.string() }, (ctx, { name }) => {
  name = text(name, 'Name', 80);
  const row = { identity: ctx.sender, name };
  if (ctx.db.profile.identity.find(ctx.sender)) ctx.db.profile.identity.update(row);
  else ctx.db.profile.insert(row);
  for (const m of ctx.db.membership.identity.filter(ctx.sender)) {
    if (m.name === name) continue;
    ctx.db.membership.id.update({ ...m, name });
    log(ctx, m.groupId, 'Display name updated', m.name + ' → ' + name);
  }
});

export const createGroup = db.reducer({ name: t.string(), role: t.string() }, (ctx, { name, role }) => {
  if (!ROLES.includes(role)) fail('Choose a role.');
  const p = ctx.db.profile.identity.find(ctx.sender);
  if (!p) fail('Save your name first.');
  const g = ctx.db.family.insert({
    id: 0n, name: text(name, 'Group name', 80), owner: ctx.sender, createdAt: ctx.timestamp,
    isPublic: false, slug: '', story: '', goalAmount: 0n, goalCurrency: 'USD', isDemo: false,
  });
  ctx.db.membership.insert({ id: 0n, groupId: g.id, identity: ctx.sender, role, name: p.name });
  log(ctx, g.id, 'Group created', g.name);
});

export const inviteMember = db.reducer({ groupId: t.u64(), role: t.string() }, (ctx, { groupId, role }) => {
  owner(ctx, groupId);
  if (!ROLES.includes(role)) fail('Invalid role.');
  ctx.db.invitation.insert({
    id: 0n, groupId, code: randomHex(ctx, 24), role,
    expiresAt: new Timestamp(ctx.timestamp.microsSinceUnixEpoch + 604800000000n),
  });
  log(ctx, groupId, 'Invitation created', role + '; expires in 7 days');
});

export const joinGroup = db.reducer({ code: t.string() }, (ctx, { code }) => {
  const i = ctx.db.invitation.code.find(code.trim());
  if (!i || i.expiresAt.microsSinceUnixEpoch < ctx.timestamp.microsSinceUnixEpoch) fail('Invitation is invalid or expired.');
  const p = ctx.db.profile.identity.find(ctx.sender);
  if (!p) fail('Save your name first.');
  if ([...ctx.db.membership.groupId.filter(i.groupId)].some(m => m.identity.equals(ctx.sender))) fail('Already a member.');
  ctx.db.membership.insert({ id: 0n, groupId: i.groupId, identity: ctx.sender, role: i.role, name: p.name });
  ctx.db.invitation.id.delete(i.id);
  log(ctx, i.groupId, 'Member joined', p.name + ' (' + i.role + ')');
});

export const manageMember = db.reducer({ memberId: t.u64(), role: t.string() }, (ctx, { memberId, role }) => {
  const m = ctx.db.membership.id.find(memberId);
  if (!m) fail('Member not found.');
  owner(ctx, m.groupId);
  if (m.identity.equals(ctx.sender)) fail('The owner cannot change or remove their own membership.');
  if (role === 'remove') ctx.db.membership.id.delete(m.id);
  else {
    if (!ROLES.includes(role)) fail('Invalid role.');
    ctx.db.membership.id.update({ ...m, role });
  }
  log(ctx, m.groupId, 'Membership changed', m.name + ': ' + m.role + ' → ' + role);
});

export const revokeInvite = db.reducer({ invitationId: t.u64() }, (ctx, { invitationId }) => {
  const i = ctx.db.invitation.id.find(invitationId);
  if (!i) fail('Invitation not found.');
  owner(ctx, i.groupId);
  ctx.db.invitation.id.delete(i.id);
  log(ctx, i.groupId, 'Invitation revoked', String(i.id));
});

const requestArgs = {
  groupId: t.u64(), amount: t.u64(), currency: t.string(), category: t.string(), explanation: t.string(),
  priority: t.string(), dueDate: t.string(), draft: t.bool(),
};

export const createRequest = db.reducer(requestArgs, (ctx, a) => {
  member(ctx, a.groupId, 'recipient');
  money(a.amount, a.currency);
  date(a.dueDate);
  if (!['routine', 'important', 'urgent'].includes(a.priority)) fail('Invalid priority.');
  const { draft, ...data } = a;
  const r = ctx.db.request.insert({
    ...data, id: 0n, category: text(a.category, 'Category', 80), explanation: text(a.explanation, 'Explanation'),
    author: ctx.sender, approved: 0n, status: draft ? 'draft' : 'submitted', createdAt: ctx.timestamp,
    isPublic: false, publicTitle: '',
  });
  log(ctx, a.groupId, 'Request ' + r.status, r.id + ': ' + a.amount + ' ' + a.currency + ' minor units');
});

export const reviseRequest = db.reducer({ requestId: t.u64(), amount: t.u64(), explanation: t.string(), submit: t.bool() }, (ctx, a) => {
  const r = req(ctx, a.requestId);
  member(ctx, r.groupId, 'recipient');
  if (!r.author.equals(ctx.sender) || !['draft', 'submitted', 'rejected'].includes(r.status)) {
    fail('Only the author may revise an unapproved request.');
  }
  money(a.amount, r.currency);
  const explanation = text(a.explanation, 'Explanation');
  const status = a.submit ? 'submitted' : 'draft';
  ctx.db.request.id.update({ ...r, amount: a.amount, explanation, status, approved: 0n });
  log(ctx, r.groupId, 'Request revised', r.id + ': ' + r.amount + ' → ' + a.amount + ' ' + r.currency
    + ' minor units; previous explanation: ' + r.explanation + '; updated explanation: ' + explanation
    + '; ' + r.status + ' → ' + status);
});

export const reviewRequest = db.reducer({ requestId: t.u64(), approved: t.u64(), note: t.string() }, (ctx, a) => {
  const r = req(ctx, a.requestId);
  member(ctx, r.groupId, 'sender');
  if (r.status !== 'submitted') fail('Only submitted requests may be reviewed.');
  money(a.approved, r.currency, true);
  if (a.approved > r.amount) fail('Approval cannot exceed requested amount.');
  const note = text(a.note, 'Review explanation');
  ctx.db.request.id.update({ ...r, approved: a.approved, status: a.approved === 0n ? 'rejected' : 'approved' });
  ctx.db.comment.insert({ id: 0n, groupId: r.groupId, requestId: r.id, author: ctx.sender, text: note, createdAt: ctx.timestamp });
  log(ctx, r.groupId, a.approved === 0n ? 'Request rejected' : 'Request approved', r.id + ': ' + a.approved + ' ' + r.currency + ' minor units; ' + note);
});

export const addComment = db.reducer({ requestId: t.u64(), text: t.string() }, (ctx, a) => {
  const r = req(ctx, a.requestId);
  const body = text(a.text, 'Comment');
  ctx.db.comment.insert({ id: 0n, groupId: r.groupId, requestId: r.id, author: ctx.sender, text: body, createdAt: ctx.timestamp });
  log(ctx, r.groupId, 'Comment added', r.id + ': ' + body);
});

export const addCommitment = db.reducer({ groupId: t.u64(), amount: t.u64(), currency: t.string(), cadence: t.string(), startDate: t.string(), note: t.string() }, (ctx, a) => {
  member(ctx, a.groupId, 'sender');
  money(a.amount, a.currency);
  date(a.startDate);
  if (!['once', 'monthly'].includes(a.cadence)) fail('Invalid cadence.');
  ctx.db.commitment.insert({ ...a, note: text(a.note, 'Note'), id: 0n, author: ctx.sender, createdAt: ctx.timestamp });
  log(ctx, a.groupId, 'Commitment recorded', a.amount + ' ' + a.currency + ' minor units; ' + a.cadence + '; ' + a.startDate);
});

export const recordTransfer = db.reducer({ requestId: t.u64(), amount: t.u64(), fee: t.u64(), expected: t.u64(), receiveCurrency: t.string(), rate: t.string(), note: t.string() }, (ctx, a) => {
  const { requestId, ...rest } = a;
  insertTransfer(ctx, requestId, { ...rest, fundingMethodId: 0n, payoutMethodId: 0n }, 'Transfer recorded (self-reported)');
});

export const confirmReceipt = db.reducer({ transferId: t.u64(), amount: t.u64(), useNote: t.string() }, (ctx, a) => {
  const tr = ctx.db.recordedTransfer.id.find(a.transferId);
  if (!tr) fail('Transfer not found.');
  member(ctx, tr.groupId, 'recipient');
  const r = req(ctx, tr.requestId);
  if (!r.author.equals(ctx.sender)) fail('Only the request author may confirm receipt.');
  money(a.amount, tr.receiveCurrency, true);
  if (ctx.db.receipt.transferId.find(tr.id)) fail('Receipt already recorded. Add a comment to explain a correction.');
  ctx.db.receipt.insert({
    ...a, useNote: text(a.useNote, 'Use or discrepancy explanation'), id: 0n, groupId: tr.groupId,
    author: ctx.sender, currency: tr.receiveCurrency, createdAt: ctx.timestamp,
  });
  const all = [...ctx.db.recordedTransfer.requestId.filter(r.id)];
  if (all.every(t => ctx.db.receipt.transferId.find(t.id))) ctx.db.request.id.update({ ...r, status: 'received' });
  log(ctx, tr.groupId, 'Receipt confirmed (self-reported)', tr.id + ': ' + a.amount + ' ' + tr.receiveCurrency + '; ' + a.useNote);
});

export const completeRequest = db.reducer({ requestId: t.u64() }, (ctx, { requestId }) => {
  const r = req(ctx, requestId);
  member(ctx, r.groupId, 'recipient');
  if (!r.author.equals(ctx.sender) || r.status !== 'received') fail('Only the author can close a received request.');
  ctx.db.request.id.update({ ...r, status: 'completed' });
  log(ctx, r.groupId, 'Request completed', String(r.id));
});

export const addBudget = db.reducer({ groupId: t.u64(), kind: t.string(), category: t.string(), amount: t.u64(), currency: t.string(), month: t.string(), explanation: t.string() }, (ctx, a) => {
  member(ctx, a.groupId);
  money(a.amount, a.currency);
  if (!['income', 'expense'].includes(a.kind) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(a.month)) fail('Invalid kind or month.');
  ctx.db.budget.insert({
    ...a, id: 0n, category: text(a.category, 'Category', 80), explanation: text(a.explanation, 'Explanation'),
    author: ctx.sender, createdAt: ctx.timestamp,
  });
  log(ctx, a.groupId, 'Self-reported budget added', a.kind + ' ' + a.amount + ' ' + a.currency + ' minor units; ' + a.month);
});
