import { t } from 'spacetimedb/server';
import db from './schema';
import {
  CURRENCIES, OPEN_FOR_FUNDING, type Ctx, fail, isMember, log, member, money, month, optionalText, owner, rate, req, text,
} from './lib';

const MAX_PHOTO_BYTES = 450_000;
const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EMOJIS = ['❤️', '🙏', '🎉'];

// Transfers: the sender who recorded a transfer can correct it until the recipient confirms receipt.
export const editTransfer = db.reducer({
  transferId: t.u64(), amount: t.u64(), fee: t.u64(), expected: t.u64(), rate: t.string(), note: t.string(), reason: t.string(),
}, (ctx, a) => {
  const tr = ctx.db.recordedTransfer.id.find(a.transferId);
  if (!tr) fail('Transfer not found.');
  member(ctx, tr.groupId, 'sender');
  if (!tr.author.equals(ctx.sender)) fail('Only the sender who recorded this transfer can edit it.');
  if (ctx.db.receipt.transferId.find(tr.id)) fail('This transfer was already confirmed by the recipient. Add a comment instead.');
  const r = req(ctx, tr.requestId);
  money(a.amount, tr.currency);
  money(a.fee, tr.currency, true);
  money(a.expected, tr.receiveCurrency);
  rate(a.rate);
  const reason = text(a.reason, 'Reason for the edit', 500);
  const others = [...ctx.db.recordedTransfer.requestId.filter(r.id)].filter(x => x.id !== tr.id).reduce((s, x) => s + x.amount, 0n);
  if (others + a.amount > r.approved) fail('Total sent cannot exceed approval.');
  ctx.db.transferRevision.insert({
    id: 0n, groupId: tr.groupId, transferId: tr.id, author: ctx.sender, prevAmount: tr.amount, prevFee: tr.fee,
    prevExpected: tr.expected, prevRate: tr.rate, prevNote: tr.note, reason, createdAt: ctx.timestamp,
  });
  ctx.db.recordedTransfer.id.update({ ...tr, amount: a.amount, fee: a.fee, expected: a.expected, rate: a.rate, note: text(a.note, 'Transfer note') });
  log(ctx, tr.groupId, 'Transfer edited', tr.id + ': ' + tr.amount + ' → ' + a.amount + ' ' + tr.currency + ' minor units; ' + reason);
});

// Budgets
export const deleteBudget = db.reducer({ budgetId: t.u64() }, (ctx, { budgetId }) => {
  const b = ctx.db.budget.id.find(budgetId);
  if (!b) fail('Budget entry not found.');
  member(ctx, b.groupId);
  if (!b.author.equals(ctx.sender)) fail('Only the person who added this entry can remove it.');
  ctx.db.budget.id.delete(b.id);
  log(ctx, b.groupId, 'Budget entry removed', b.kind + ' ' + b.category + ' ' + b.amount + ' ' + b.currency + ' minor units; ' + b.month);
});

export const setBudgetTarget = db.reducer({
  groupId: t.u64(), month: t.string(), category: t.string(), currency: t.string(), amount: t.u64(),
}, (ctx, a) => {
  member(ctx, a.groupId);
  month(a.month);
  money(a.amount, a.currency, true);
  const category = text(a.category, 'Category', 80);
  const existing = [...ctx.db.budgetTarget.groupId.filter(a.groupId)]
    .find(x => x.month === a.month && x.currency === a.currency && x.category.toLowerCase() === category.toLowerCase());
  if (existing && a.amount === 0n) ctx.db.budgetTarget.id.delete(existing.id);
  else if (existing) ctx.db.budgetTarget.id.update({ ...existing, amount: a.amount, author: ctx.sender, updatedAt: ctx.timestamp });
  else if (a.amount > 0n) {
    ctx.db.budgetTarget.insert({ ...a, category, id: 0n, author: ctx.sender, updatedAt: ctx.timestamp });
  }
  log(ctx, a.groupId, 'Budget target set', category + ' ' + a.month + ': ' + a.amount + ' ' + a.currency + ' minor units');
});

// Photo feed
function canSeePost(ctx: Ctx, postId: bigint) {
  const p = ctx.db.post.id.find(postId);
  if (!p) fail('Post not found.');
  const g = ctx.db.family.id.find(p.groupId);
  const visible = isMember(ctx, p.groupId) || (p.visibility === 'public' && !!g?.isPublic);
  if (!visible) fail('Post not found.');
  return p;
}

export const createPost = db.reducer({
  groupId: t.u64(), requestId: t.u64(), caption: t.string(), visibility: t.string(), photo: t.array(t.u8()), photoType: t.string(),
}, (ctx, a) => {
  member(ctx, a.groupId);
  if (!['family', 'public'].includes(a.visibility)) fail('Choose who can see this post.');
  if (a.photo.length === 0 || a.photo.length > MAX_PHOTO_BYTES) fail('Add a photo under 450 KB.');
  if (!UPLOAD_TYPES.includes(a.photoType)) fail('Photos must be JPEG, PNG or WebP.');
  if (a.requestId !== 0n) {
    const r = ctx.db.request.id.find(a.requestId);
    if (!r || r.groupId !== a.groupId) fail('Linked request not found.');
  }
  const p = ctx.db.post.insert({
    ...a, id: 0n, caption: text(a.caption, 'Caption', 500), author: ctx.sender, createdAt: ctx.timestamp, photoUrl: '',
  });
  log(ctx, a.groupId, 'Photo posted', p.id + ' (' + a.visibility + ')');
});

export const setPostVisibility = db.reducer({ postId: t.u64(), visibility: t.string() }, (ctx, a) => {
  const p = ctx.db.post.id.find(a.postId);
  if (!p) fail('Post not found.');
  member(ctx, p.groupId);
  const g = ctx.db.family.id.find(p.groupId);
  if (!p.author.equals(ctx.sender) && !g?.owner.equals(ctx.sender)) fail('Only the author or group owner can change this post.');
  if (!['family', 'public'].includes(a.visibility)) fail('Invalid visibility.');
  ctx.db.post.id.update({ ...p, visibility: a.visibility });
  log(ctx, p.groupId, 'Post visibility changed', p.id + ': ' + p.visibility + ' → ' + a.visibility);
});

export const deletePost = db.reducer({ postId: t.u64() }, (ctx, { postId }) => {
  const p = ctx.db.post.id.find(postId);
  if (!p) fail('Post not found.');
  member(ctx, p.groupId);
  const g = ctx.db.family.id.find(p.groupId);
  if (!p.author.equals(ctx.sender) && !g?.owner.equals(ctx.sender)) fail('Only the author or group owner can remove this post.');
  for (const r of [...ctx.db.reaction.postId.filter(p.id)]) ctx.db.reaction.id.delete(r.id);
  ctx.db.post.id.delete(p.id);
  log(ctx, p.groupId, 'Post removed', String(p.id));
});

export const toggleReaction = db.reducer({ postId: t.u64(), emoji: t.string() }, (ctx, { postId, emoji }) => {
  const p = canSeePost(ctx, postId);
  if (!EMOJIS.includes(emoji)) fail('Unsupported reaction.');
  const mine = [...ctx.db.reaction.postId.filter(postId)].find(r => r.identity.equals(ctx.sender) && r.emoji === emoji);
  if (mine) ctx.db.reaction.id.delete(mine.id);
  else ctx.db.reaction.insert({ id: 0n, groupId: p.groupId, postId, identity: ctx.sender, emoji, createdAt: ctx.timestamp });
});

// Public page and demo pledges
export const updatePublicPage = db.reducer({
  groupId: t.u64(), isPublic: t.bool(), slug: t.string(), story: t.string(), goalAmount: t.u64(), goalCurrency: t.string(),
}, (ctx, a) => {
  const g = owner(ctx, a.groupId);
  const slug = a.slug.trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) fail('Page link must be 3–40 lowercase letters, numbers or dashes.');
  if ([...ctx.db.family.iter()].some(f => f.id !== g.id && f.slug === slug)) fail('That page link is taken.');
  money(a.goalAmount, a.goalCurrency, true);
  const story = optionalText(a.story, 'Story', 1500);
  if (a.isPublic && !story) fail('Write a short story before publishing your page.');
  ctx.db.family.id.update({ ...g, isPublic: a.isPublic, slug, story, goalAmount: a.goalAmount, goalCurrency: a.goalCurrency });
  log(ctx, g.id, a.isPublic ? 'Public page published' : 'Public page updated (private)', '/p/' + slug);
});

export const setRequestPublic = db.reducer({ requestId: t.u64(), isPublic: t.bool(), publicTitle: t.string() }, (ctx, a) => {
  const r = req(ctx, a.requestId);
  const g = ctx.db.family.id.find(r.groupId);
  if (!r.author.equals(ctx.sender) && !g?.owner.equals(ctx.sender)) fail('Only the requester or group owner can share a request.');
  const publicTitle = a.isPublic ? text(a.publicTitle, 'Public title', 120) : r.publicTitle;
  ctx.db.request.id.update({ ...r, isPublic: a.isPublic, publicTitle });
  log(ctx, r.groupId, a.isPublic ? 'Request shared publicly' : 'Request made private', r.id + ': ' + publicTitle);
});

export const contribute = db.reducer({
  groupId: t.u64(), requestId: t.u64(), name: t.string(), amount: t.u64(), currency: t.string(), message: t.string(),
}, (ctx, a) => {
  const g = ctx.db.family.id.find(a.groupId);
  if (!g?.isPublic) fail('This family page is not public.');
  let currency = g.goalCurrency;
  if (a.requestId !== 0n) {
    const r = ctx.db.request.id.find(a.requestId);
    if (!r || r.groupId !== g.id || !r.isPublic || !OPEN_FOR_FUNDING.includes(r.status)) fail('This need is not open for support.');
    currency = r.currency;
  }
  if (a.currency !== currency || !CURRENCIES.includes(currency)) fail('Use ' + currency + ' for this pledge.');
  money(a.amount, currency);
  const name = text(a.name, 'Your name', 60);
  const message = optionalText(a.message, 'Message', 280);
  ctx.db.contribution.insert({ id: 0n, groupId: g.id, requestId: a.requestId, contributor: ctx.sender, name, amount: a.amount, currency, message, createdAt: ctx.timestamp });
  log(ctx, g.id, 'Public pledge (demo)', name + ': ' + a.amount + ' ' + currency + ' minor units' + (a.requestId ? ' for request ' + a.requestId : ''));
});
