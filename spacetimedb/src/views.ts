import { t, type AnonymousViewCtx, type InferSchema, type ViewCtx } from 'spacetimedb/server';
import db, {
  audit, budget, budgetTarget, comment, commitment, contribution, family, invitation, membership, post, profile, reaction,
  receipt, recordedTransfer, request, transferRevision, paymentMethod,
} from './schema';
import { OPEN_FOR_FUNDING } from './lib';

// Family views: each caller only receives rows for groups they belong to.
type Schema = InferSchema<typeof db>;
const myGroups = (ctx: ViewCtx<Schema>) => new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId));

export const visibleProfile = db.view({ name: 'my_profile', public: true }, t.array(profile.rowType),
  ctx => [...ctx.db.profile.iter()].filter(r => r.identity.equals(ctx.sender)));
export const visibleFamily = db.view({ name: 'my_family', public: true }, t.array(family.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.family.iter()].filter(r => ids.has(r.id)); });
export const visibleMembership = db.view({ name: 'my_membership', public: true }, t.array(membership.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.membership.iter()].filter(r => ids.has(r.groupId)); });
export const visibleInvitation = db.view({ name: 'my_invitation', public: true }, t.array(invitation.rowType),
  ctx => [...ctx.db.invitation.iter()].filter(r => ctx.db.family.id.find(r.groupId)?.owner.equals(ctx.sender)));
export const visibleBudget = db.view({ name: 'my_budget', public: true }, t.array(budget.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.budget.iter()].filter(r => ids.has(r.groupId)); });
export const visibleBudgetTarget = db.view({ name: 'my_budget_target', public: true }, t.array(budgetTarget.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.budgetTarget.iter()].filter(r => ids.has(r.groupId)); });
export const visibleRequest = db.view({ name: 'my_request', public: true }, t.array(request.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.request.iter()].filter(r => ids.has(r.groupId)); });
export const visibleComment = db.view({ name: 'my_comment', public: true }, t.array(comment.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.comment.iter()].filter(r => ids.has(r.groupId)); });
export const visibleCommitment = db.view({ name: 'my_commitment', public: true }, t.array(commitment.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.commitment.iter()].filter(r => ids.has(r.groupId)); });
export const visibleRecordedTransfer = db.view({ name: 'my_recorded_transfer', public: true }, t.array(recordedTransfer.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.recordedTransfer.iter()].filter(r => ids.has(r.groupId)); });
export const visibleTransferRevision = db.view({ name: 'my_transfer_revision', public: true }, t.array(transferRevision.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.transferRevision.iter()].filter(r => ids.has(r.groupId)); });
export const visibleReceipt = db.view({ name: 'my_receipt', public: true }, t.array(receipt.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.receipt.iter()].filter(r => ids.has(r.groupId)); });
export const visiblePost = db.view({ name: 'my_post', public: true }, t.array(post.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.post.iter()].filter(r => ids.has(r.groupId)); });
export const visibleReaction = db.view({ name: 'my_reaction', public: true }, t.array(reaction.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.reaction.iter()].filter(r => ids.has(r.groupId)); });
export const visibleContribution = db.view({ name: 'my_contribution', public: true }, t.array(contribution.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.contribution.iter()].filter(r => ids.has(r.groupId)); });
export const visibleAudit = db.view({ name: 'my_audit', public: true }, t.array(audit.rowType),
  ctx => { const ids = myGroups(ctx); return [...ctx.db.audit.iter()].filter(r => ids.has(r.groupId)); });

// Your own accounts, plus receiving accounts of people in your families (masked to last four digits).
export const visiblePaymentMethod = db.view({ name: 'my_payment_method', public: true }, t.array(paymentMethod.rowType), ctx => {
  const ids = myGroups(ctx);
  const relatives = new Set([...ctx.db.membership.iter()].filter(m => ids.has(m.groupId)).map(m => m.identity.toHexString()));
  return [...ctx.db.paymentMethod.iter()].filter(m => m.owner.isEqual(ctx.sender) || (m.purpose === 'receive' && relatives.has(m.owner.toHexString())));
});

// Public views: only data a family explicitly published, and never identities.
const PublicFamilyRow = t.row('PublicFamilyRow', {
  id: t.u64().primaryKey(), name: t.string(), slug: t.string(), story: t.string(), goalAmount: t.u64(),
  goalCurrency: t.string(), memberCount: t.u32(), createdAt: t.timestamp(), isDemo: t.bool(),
});
const PublicPostRow = t.row('PublicPostRow', {
  id: t.u64().primaryKey(), groupId: t.u64(), familyName: t.string(), slug: t.string(), authorName: t.string(),
  caption: t.string(), photo: t.array(t.u8()), photoType: t.string(), requestTitle: t.string(), createdAt: t.timestamp(), photoUrl: t.string(),
});
const PublicRequestRow = t.row('PublicRequestRow', {
  id: t.u64().primaryKey(), groupId: t.u64(), title: t.string(), category: t.string(), amount: t.u64(),
  currency: t.string(), status: t.string(), dueDate: t.string(), priority: t.string(),
});
const PublicContributionRow = t.row('PublicContributionRow', {
  id: t.u64().primaryKey(), groupId: t.u64(), requestId: t.u64(), name: t.string(), amount: t.u64(),
  currency: t.string(), message: t.string(), createdAt: t.timestamp(),
});
const PublicReactionRow = t.row('PublicReactionRow', { id: t.u64().primaryKey(), postId: t.u64(), emoji: t.string() });

const publicGroups = (ctx: AnonymousViewCtx<Schema>) => new Set([...ctx.db.family.iter()].filter(f => f.isPublic).map(f => f.id));
const publicPosts = (ctx: AnonymousViewCtx<Schema>) => {
  const ids = publicGroups(ctx);
  return [...ctx.db.post.iter()].filter(p => p.visibility === 'public' && ids.has(p.groupId));
};

export const publicFamily = db.anonymousView({ name: 'public_family', public: true }, t.array(PublicFamilyRow), ctx =>
  [...ctx.db.family.iter()].filter(f => f.isPublic).map(f => ({
    id: f.id, name: f.name, slug: f.slug, story: f.story, goalAmount: f.goalAmount, goalCurrency: f.goalCurrency,
    memberCount: [...ctx.db.membership.groupId.filter(f.id)].length, createdAt: f.createdAt, isDemo: f.isDemo,
  })));

export const publicPost = db.anonymousView({ name: 'public_post', public: true }, t.array(PublicPostRow), ctx =>
  publicPosts(ctx).map(p => {
    const g = ctx.db.family.id.find(p.groupId)!;
    const author = [...ctx.db.membership.groupId.filter(p.groupId)].find(m => m.identity.equals(p.author));
    const r = p.requestId ? ctx.db.request.id.find(p.requestId) : undefined;
    return {
      id: p.id, groupId: p.groupId, familyName: g.name, slug: g.slug, authorName: author?.name ?? 'Family member',
      caption: p.caption, photo: p.photo, photoType: p.photoType, requestTitle: r?.isPublic ? r.publicTitle : '',
      createdAt: p.createdAt, photoUrl: p.photoUrl,
    };
  }));

export const publicRequest = db.anonymousView({ name: 'public_request', public: true }, t.array(PublicRequestRow), ctx => {
  const ids = publicGroups(ctx);
  return [...ctx.db.request.iter()]
    .filter(r => r.isPublic && ids.has(r.groupId) && [...OPEN_FOR_FUNDING, 'received', 'completed'].includes(r.status))
    .map(r => ({
      id: r.id, groupId: r.groupId, title: r.publicTitle, category: r.category, amount: r.amount, currency: r.currency,
      status: r.status, dueDate: r.dueDate, priority: r.priority,
    }));
});

export const publicContribution = db.anonymousView({ name: 'public_contribution', public: true }, t.array(PublicContributionRow), ctx => {
  const ids = publicGroups(ctx);
  return [...ctx.db.contribution.iter()].filter(c => ids.has(c.groupId)).map(c => ({
    id: c.id, groupId: c.groupId, requestId: c.requestId, name: c.name, amount: c.amount, currency: c.currency,
    message: c.message, createdAt: c.createdAt,
  }));
});

export const publicReaction = db.anonymousView({ name: 'public_reaction', public: true }, t.array(PublicReactionRow), ctx => {
  const ids = new Set(publicPosts(ctx).map(p => p.id));
  return [...ctx.db.reaction.iter()].filter(r => ids.has(r.postId)).map(r => ({ id: r.id, postId: r.postId, emoji: r.emoji }));
});

// Lets a visitor see which public reactions are their own.
export const myReactionOnPublic = db.view({ name: 'my_public_reaction', public: true }, t.array(reaction.rowType),
  ctx => [...ctx.db.reaction.identity.filter(ctx.sender)]);
