import { schema, table, t, SenderError, type ReducerCtx, type InferSchema } from 'spacetimedb/server';
import { Timestamp } from 'spacetimedb';
const profile = table({ name: 'profile' }, { identity: t.identity().primaryKey(), name: t.string() });
const family = table({ name: 'family' }, { id: t.u64().primaryKey().autoInc(), name: t.string(), owner: t.identity(), createdAt: t.timestamp() });
const membership = table({ name: 'membership' }, { id: t.u64().primaryKey().autoInc(), groupId: t.u64().index('btree'), identity: t.identity().index('btree'), role: t.string(), name: t.string() });
const invitation = table({ name: 'invitation' }, { id: t.u64().primaryKey().autoInc(), groupId: t.u64().index('btree'), code: t.string().unique(), role: t.string(), expiresAt: t.timestamp() });
const budget = table({ name: 'budget' }, { id: t.u64().primaryKey().autoInc(), groupId: t.u64().index('btree'), author: t.identity(), kind: t.string(), category: t.string(), amount: t.u64(), currency: t.string(), month: t.string().index('btree'), explanation: t.string(), createdAt: t.timestamp() });
const request = table({ name: 'request' }, { id: t.u64().primaryKey().autoInc(), groupId: t.u64().index('btree'), author: t.identity(), amount: t.u64(), currency: t.string(), category: t.string(), explanation: t.string(), priority: t.string(), dueDate: t.string().index('btree'), status: t.string().index('btree'), approved: t.u64(), createdAt: t.timestamp() });
const comment = table({ name: 'comment' }, { id: t.u64().primaryKey().autoInc(), groupId: t.u64().index('btree'), requestId: t.u64().index('btree'), author: t.identity(), text: t.string(), createdAt: t.timestamp() });
const commitment = table({ name: 'commitment' }, { id: t.u64().primaryKey().autoInc(), groupId: t.u64().index('btree'), author: t.identity(), amount: t.u64(), currency: t.string(), cadence: t.string(), startDate: t.string(), note: t.string(), createdAt: t.timestamp() });
const recordedTransfer = table({ name: 'recorded_transfer' }, { id: t.u64().primaryKey().autoInc(), groupId: t.u64().index('btree'), requestId: t.u64().index('btree'), author: t.identity(), amount: t.u64(), currency: t.string(), fee: t.u64(), expected: t.u64(), receiveCurrency: t.string(), rate: t.string(), note: t.string(), createdAt: t.timestamp() });
const receipt = table({ name: 'receipt' }, { id: t.u64().primaryKey().autoInc(), groupId: t.u64().index('btree'), transferId: t.u64().unique(), author: t.identity(), amount: t.u64(), currency: t.string(), useNote: t.string(), createdAt: t.timestamp() });
const audit = table({ name: 'audit' }, { id: t.u64().primaryKey().autoInc(), groupId: t.u64().index('btree'), actor: t.identity(), action: t.string(), detail: t.string(), createdAt: t.timestamp().index('btree') });
// Retained solely for a non-destructive migration; no application writes or reads.
const person = table({ public: true }, { name: t.string() });
const db = schema({ person, profile, family, membership, invitation, budget, request, comment, commitment, recordedTransfer, receipt, audit });
export default db;
type Ctx = ReducerCtx<InferSchema<typeof db>>;
function fail(message: string): never { throw new SenderError(message); }
function text(value: string, label: string, max = 1000) { if (!value.trim() || value.length > max)
    fail(`${label} is required (maximum ${max} characters).`); return value.trim(); }
function money(amount: bigint, currency: string, zero = false) { if (amount < (zero ? 0n : 1n) || amount > 1000000000000n)
    fail('Amount is outside the supported range.'); if (!['USD', 'PHP', 'MXN', 'EUR', 'GBP', 'INR', 'CAD', 'JPY'].includes(currency))
    fail('Unsupported currency.'); }
function date(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail('Use a valid date.'); const d = new Date(value + 'T00:00:00Z'); if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== value)
    fail('Invalid calendar date.'); }
function member(ctx: Ctx, groupId: bigint, role?: string) { const m = [...ctx.db.membership.groupId.filter(groupId)].find(m => m.identity.equals(ctx.sender)); if (!m || (role && m.role !== role))
    fail('Unauthorized: this action requires an authorized ' + (role ?? 'family member') + '.'); return m; }
function owner(ctx: Ctx, groupId: bigint) { member(ctx, groupId); const g = ctx.db.family.id.find(groupId); if (!g?.owner.equals(ctx.sender))
    fail('Only the group owner can manage members.'); }
function log(ctx: Ctx, groupId: bigint, action: string, detail: string) { ctx.db.audit.insert({ id: 0n, groupId, actor: ctx.sender, action, detail, createdAt: ctx.timestamp }); }
function req(ctx: Ctx, id: bigint) { const r = ctx.db.request.id.find(id); if (!r)
    fail('Request not found.'); member(ctx, r.groupId); return r; }
export const saveProfile = db.reducer({ name: t.string() }, (ctx, { name }) => { name = text(name, 'Name', 80); const row = { identity: ctx.sender, name }; if (ctx.db.profile.identity.find(ctx.sender))
    ctx.db.profile.identity.update(row);
else
    ctx.db.profile.insert(row); for (const m of ctx.db.membership.identity.filter(ctx.sender)) {
    ctx.db.membership.id.update({ ...m, name });
    log(ctx, m.groupId, 'Display name updated', m.name + ' → ' + name);
} });
export const createGroup = db.reducer({ name: t.string(), role: t.string() }, (ctx, { name, role }) => { if (!['sender', 'recipient'].includes(role))
    fail('Choose a role.'); const p = ctx.db.profile.identity.find(ctx.sender); if (!p)
    fail('Save your name first.'); const g = ctx.db.family.insert({ id: 0n, name: text(name, 'Group name', 80), owner: ctx.sender, createdAt: ctx.timestamp }); ctx.db.membership.insert({ id: 0n, groupId: g.id, identity: ctx.sender, role, name: p.name }); log(ctx, g.id, 'Group created', g.name); });
export const inviteMember = db.reducer({ groupId: t.u64(), role: t.string() }, (ctx, { groupId, role }) => { owner(ctx, groupId); if (!['sender', 'recipient'].includes(role))
    fail('Invalid role.'); const code = Array.from(ctx.random.fill(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join(''); ctx.db.invitation.insert({ id: 0n, groupId, code, role, expiresAt: new Timestamp(ctx.timestamp.microsSinceUnixEpoch + 604800000000n) }); log(ctx, groupId, 'Invitation created', role + '; expires in 7 days'); });
export const joinGroup = db.reducer({ code: t.string() }, (ctx, { code }) => { const i = ctx.db.invitation.code.find(code.trim()); if (!i || i.expiresAt.microsSinceUnixEpoch < ctx.timestamp.microsSinceUnixEpoch)
    fail('Invitation is invalid or expired.'); const p = ctx.db.profile.identity.find(ctx.sender); if (!p)
    fail('Save your name first.'); if ([...ctx.db.membership.groupId.filter(i.groupId)].some(m => m.identity.equals(ctx.sender)))
    fail('Already a member.'); ctx.db.membership.insert({ id: 0n, groupId: i.groupId, identity: ctx.sender, role: i.role, name: p.name }); ctx.db.invitation.id.delete(i.id); log(ctx, i.groupId, 'Member joined', p.name + ' (' + i.role + ')'); });
export const manageMember = db.reducer({ memberId: t.u64(), role: t.string() }, (ctx, { memberId, role }) => { const m = ctx.db.membership.id.find(memberId); if (!m)
    fail('Member not found.'); owner(ctx, m.groupId); if (m.identity.equals(ctx.sender))
    fail('The owner cannot change or remove their own membership.'); if (role === 'remove')
    ctx.db.membership.id.delete(m.id);
else {
    if (!['sender', 'recipient'].includes(role))
        fail('Invalid role.');
    ctx.db.membership.id.update({ ...m, role });
} log(ctx, m.groupId, 'Membership changed', m.name + ': ' + m.role + ' → ' + role); });
export const revokeInvite = db.reducer({ invitationId: t.u64() }, (ctx, { invitationId }) => { const i = ctx.db.invitation.id.find(invitationId); if (!i)
    fail('Invitation not found.'); owner(ctx, i.groupId); ctx.db.invitation.id.delete(i.id); log(ctx, i.groupId, 'Invitation revoked', String(i.id)); });
export const addBudget = db.reducer({ groupId: t.u64(), kind: t.string(), category: t.string(), amount: t.u64(), currency: t.string(), month: t.string(), explanation: t.string() }, (ctx, a) => { member(ctx, a.groupId); money(a.amount, a.currency); if (!['income', 'expense'].includes(a.kind) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(a.month))
    fail('Invalid kind or month.'); ctx.db.budget.insert({ ...a, id: 0n, category: text(a.category, 'Category', 80), explanation: text(a.explanation, 'Explanation'), author: ctx.sender, createdAt: ctx.timestamp }); log(ctx, a.groupId, 'Self-reported budget added', a.kind + ' ' + a.amount + ' ' + a.currency + ' minor units; ' + a.month); });
const requestArgs = { groupId: t.u64(), amount: t.u64(), currency: t.string(), category: t.string(), explanation: t.string(), priority: t.string(), dueDate: t.string(), draft: t.bool() };
export const createRequest = db.reducer(requestArgs, (ctx, a) => { member(ctx, a.groupId, 'recipient'); money(a.amount, a.currency); date(a.dueDate); if (!['routine', 'important', 'urgent'].includes(a.priority))
    fail('Invalid priority.'); const { draft, ...data } = a; const r = ctx.db.request.insert({ ...data, id: 0n, category: text(a.category, 'Category', 80), explanation: text(a.explanation, 'Explanation'), author: ctx.sender, approved: 0n, status: draft ? 'draft' : 'submitted', createdAt: ctx.timestamp }); log(ctx, a.groupId, 'Request ' + r.status, String(r.id) + ': ' + a.amount + ' ' + a.currency + ' minor units'); });
export const reviseRequest = db.reducer({ requestId: t.u64(), amount: t.u64(), explanation: t.string(), submit: t.bool() }, (ctx, a) => { const r = req(ctx, a.requestId); member(ctx, r.groupId, 'recipient'); if (!r.author.equals(ctx.sender) || !['draft', 'submitted', 'rejected'].includes(r.status))
    fail('Only the author may revise an unapproved request.'); money(a.amount, r.currency); const explanation = text(a.explanation, 'Explanation'); ctx.db.request.id.update({ ...r, amount: a.amount, explanation, status: a.submit ? 'submitted' : 'draft', approved: 0n }); log(ctx, r.groupId, 'Request revised', r.id + ': ' + r.amount + ' → ' + a.amount + ' ' + r.currency + ' minor units; previous explanation: ' + r.explanation + '; updated explanation: ' + explanation + '; ' + r.status + ' → ' + (a.submit ? 'submitted' : 'draft')); });
export const reviewRequest = db.reducer({ requestId: t.u64(), approved: t.u64(), note: t.string() }, (ctx, a) => { const r = req(ctx, a.requestId); member(ctx, r.groupId, 'sender'); if (r.status !== 'submitted')
    fail('Only submitted requests may be reviewed.'); money(a.approved, r.currency, true); if (a.approved > r.amount)
    fail('Approval cannot exceed requested amount.'); const note = text(a.note, 'Review explanation'); ctx.db.request.id.update({ ...r, approved: a.approved, status: a.approved === 0n ? 'rejected' : 'approved' }); ctx.db.comment.insert({ id: 0n, groupId: r.groupId, requestId: r.id, author: ctx.sender, text: note, createdAt: ctx.timestamp }); log(ctx, r.groupId, a.approved === 0n ? 'Request rejected' : 'Request approved', r.id + ': ' + a.approved + ' ' + r.currency + ' minor units; ' + note); });
export const addComment = db.reducer({ requestId: t.u64(), text: t.string() }, (ctx, a) => { const r = req(ctx, a.requestId); const body = text(a.text, 'Comment'); ctx.db.comment.insert({ id: 0n, groupId: r.groupId, requestId: r.id, author: ctx.sender, text: body, createdAt: ctx.timestamp }); log(ctx, r.groupId, 'Comment added', r.id + ': ' + body); });
export const addCommitment = db.reducer({ groupId: t.u64(), amount: t.u64(), currency: t.string(), cadence: t.string(), startDate: t.string(), note: t.string() }, (ctx, a) => { member(ctx, a.groupId, 'sender'); money(a.amount, a.currency); date(a.startDate); if (!['once', 'monthly'].includes(a.cadence))
    fail('Invalid cadence.'); ctx.db.commitment.insert({ ...a, note: text(a.note, 'Note'), id: 0n, author: ctx.sender, createdAt: ctx.timestamp }); log(ctx, a.groupId, 'Commitment recorded', a.amount + ' ' + a.currency + ' minor units; ' + a.cadence + '; ' + a.startDate); });
export const recordTransfer = db.reducer({ requestId: t.u64(), amount: t.u64(), fee: t.u64(), expected: t.u64(), receiveCurrency: t.string(), rate: t.string(), note: t.string() }, (ctx, a) => { const r = req(ctx, a.requestId); member(ctx, r.groupId, 'sender'); if (!['approved', 'sent', 'received'].includes(r.status))
    fail('Request must be approved and open.'); money(a.amount, r.currency); money(a.fee, r.currency, true); money(a.expected, a.receiveCurrency); if (!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,12})?$/.test(a.rate) || !/[1-9]/.test(a.rate))
    fail('Enter a positive decimal exchange rate.'); const sent = [...ctx.db.recordedTransfer.requestId.filter(r.id)].reduce((s, t) => s + t.amount, 0n); if (sent + a.amount > r.approved)
    fail('Total sent cannot exceed approval.'); const row = ctx.db.recordedTransfer.insert({ ...a, note: text(a.note, 'Transfer note'), id: 0n, groupId: r.groupId, currency: r.currency, author: ctx.sender, createdAt: ctx.timestamp }); ctx.db.request.id.update({ ...r, status: 'sent' }); log(ctx, r.groupId, 'Transfer recorded (self-reported)', row.id + ': ' + a.amount + ' ' + r.currency + '; fee ' + a.fee + '; expected ' + a.expected + ' ' + a.receiveCurrency + '; rate ' + a.rate); });
export const confirmReceipt = db.reducer({ transferId: t.u64(), amount: t.u64(), useNote: t.string() }, (ctx, a) => { const tr = ctx.db.recordedTransfer.id.find(a.transferId); if (!tr)
    fail('Transfer not found.'); member(ctx, tr.groupId, 'recipient'); const r = req(ctx, tr.requestId); if (!r.author.equals(ctx.sender))
    fail('Only the request author may confirm receipt.'); money(a.amount, tr.receiveCurrency, true); if (ctx.db.receipt.transferId.find(tr.id))
    fail('Receipt already recorded. Add a comment to explain a correction.'); ctx.db.receipt.insert({ ...a, useNote: text(a.useNote, 'Use or discrepancy explanation'), id: 0n, groupId: tr.groupId, author: ctx.sender, currency: tr.receiveCurrency, createdAt: ctx.timestamp }); const all = [...ctx.db.recordedTransfer.requestId.filter(r.id)]; if (all.every(t => ctx.db.receipt.transferId.find(t.id)))
    ctx.db.request.id.update({ ...r, status: 'received' }); log(ctx, tr.groupId, 'Receipt confirmed (self-reported)', tr.id + ': ' + a.amount + ' ' + tr.receiveCurrency + '; ' + a.useNote); });
export const completeRequest = db.reducer({ requestId: t.u64() }, (ctx, { requestId }) => { const r = req(ctx, requestId); member(ctx, r.groupId, 'recipient'); if (!r.author.equals(ctx.sender) || r.status !== 'received')
    fail('Only the author can close a received request.'); ctx.db.request.id.update({ ...r, status: 'completed' }); log(ctx, r.groupId, 'Request completed', String(r.id)); });
export const visibleProfile = db.view({ name: 'my_profile', public: true }, t.array(profile.rowType), (ctx) => { const ids = new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId)); return [...ctx.db.profile.iter()].filter(r => r.identity.equals(ctx.sender)); });
export const visibleFamily = db.view({ name: 'my_family', public: true }, t.array(family.rowType), (ctx) => { const ids = new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId)); return [...ctx.db.family.iter()].filter(r => ids.has(r.id)); });
export const visibleMembership = db.view({ name: 'my_membership', public: true }, t.array(membership.rowType), (ctx) => { const ids = new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId)); return [...ctx.db.membership.iter()].filter(r => ids.has(r.groupId)); });
export const visibleInvitation = db.view({ name: 'my_invitation', public: true }, t.array(invitation.rowType), (ctx) => { const ids = new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId)); return [...ctx.db.invitation.iter()].filter(r => ctx.db.family.id.find(r.groupId)?.owner.equals(ctx.sender)); });
export const visibleBudget = db.view({ name: 'my_budget', public: true }, t.array(budget.rowType), (ctx) => { const ids = new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId)); return [...ctx.db.budget.iter()].filter(r => ids.has(r.groupId)); });
export const visibleRequest = db.view({ name: 'my_request', public: true }, t.array(request.rowType), (ctx) => { const ids = new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId)); return [...ctx.db.request.iter()].filter(r => ids.has(r.groupId)); });
export const visibleComment = db.view({ name: 'my_comment', public: true }, t.array(comment.rowType), (ctx) => { const ids = new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId)); return [...ctx.db.comment.iter()].filter(r => ids.has(r.groupId)); });
export const visibleCommitment = db.view({ name: 'my_commitment', public: true }, t.array(commitment.rowType), (ctx) => { const ids = new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId)); return [...ctx.db.commitment.iter()].filter(r => ids.has(r.groupId)); });
export const visibleRecordedTransfer = db.view({ name: 'my_recorded_transfer', public: true }, t.array(recordedTransfer.rowType), (ctx) => { const ids = new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId)); return [...ctx.db.recordedTransfer.iter()].filter(r => ids.has(r.groupId)); });
export const visibleReceipt = db.view({ name: 'my_receipt', public: true }, t.array(receipt.rowType), (ctx) => { const ids = new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId)); return [...ctx.db.receipt.iter()].filter(r => ids.has(r.groupId)); });
export const visibleAudit = db.view({ name: 'my_audit', public: true }, t.array(audit.rowType), (ctx) => { const ids = new Set([...ctx.db.membership.identity.filter(ctx.sender)].map(m => m.groupId)); return [...ctx.db.audit.iter()].filter(r => ids.has(r.groupId)); });
