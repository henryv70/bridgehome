import { DbConnection, tables } from '../src/module_bindings/index';
import assert from 'node:assert/strict';

const connect = () => new Promise<DbConnection>((resolve, reject) => {
  DbConnection.builder().withUri('ws://localhost:3000').withDatabaseName('bridgehome-3386g')
    .onConnect(c => resolve(c)).onConnectError((_c, e) => reject(e)).build();
});
const ready = (c: DbConnection) => new Promise<void>((resolve, reject) => {
  c.subscriptionBuilder().onApplied(() => resolve()).onError(e => reject(e)).subscribe([
    tables.visibleFamily, tables.visibleMembership, tables.visibleRequest, tables.visibleRecordedTransfer,
    tables.visibleTransferRevision, tables.visiblePost, tables.visibleBudgetTarget, tables.visibleContribution,
    tables.visibleInvitation, tables.visiblePaymentMethod, tables.publicFamily, tables.publicPost, tables.publicRequest, tables.publicContribution,
  ]);
});
const wait = async (p: () => boolean) => {
  for (let i = 0; i < 100; i++) { if (p()) return; await new Promise(r => setTimeout(r, 50)); }
  throw Error('Subscription update timeout');
};
const rows = <T>(it: Iterable<T>) => [...it];

const owner = await connect(), visitor = await connect(), recipient = await connect();
try {
  await Promise.all([ready(owner), ready(visitor), ready(recipient)]);
  await owner.reducers.saveProfile({ name: 'Feature test owner' });
  await recipient.reducers.saveProfile({ name: 'Feature test recipient' });

  // Demo seed builds a full family the caller owns.
  await owner.reducers.seedDemo({ family: 'santos' });
  await wait(() => rows(owner.db.visibleFamily.iter()).some(f => f.isDemo));
  const g = rows(owner.db.visibleFamily.iter()).find(f => f.isDemo)!;
  assert.ok(g.isPublic);
  assert.equal(rows(owner.db.visibleRequest.iter()).filter(r => r.groupId === g.id).length, 5);
  assert.ok(rows(owner.db.visiblePost.iter()).filter(p => p.groupId === g.id).every(p => p.photoUrl.startsWith('/demo/')));

  // Public views expose only published data and no identities.
  await wait(() => rows(visitor.db.publicFamily.iter()).some(f => f.id === g.id));
  assert.equal(rows(visitor.db.visibleFamily.iter()).length, 0);
  const pubPosts = rows(visitor.db.publicPost.iter()).filter(p => p.groupId === g.id);
  assert.equal(pubPosts.length, 3, 'only public posts are visible');
  assert.ok(!('author' in pubPosts[0]));
  const roof = rows(visitor.db.publicRequest.iter()).find(r => r.groupId === g.id && r.status === 'submitted')!;
  assert.ok(roof);

  // Pledges: currency and openness are enforced.
  await assert.rejects(visitor.reducers.contribute({ groupId: g.id, requestId: roof.id, name: 'Visitor', amount: 1000n, currency: 'PHP', message: '' }));
  await visitor.reducers.contribute({ groupId: g.id, requestId: roof.id, name: 'Visitor', amount: 1000n, currency: 'USD', message: 'Good luck' });
  await wait(() => rows(owner.db.visibleContribution.iter()).some(c => c.name === 'Visitor'));

  // Visitors cannot post or edit; members can.
  const tiny = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
  await assert.rejects(visitor.reducers.createPost({ groupId: g.id, requestId: 0n, caption: 'x', visibility: 'public', photo: tiny, photoType: 'image/jpeg' }));
  await assert.rejects(owner.reducers.createPost({ groupId: g.id, requestId: 0n, caption: 'x', visibility: 'public', photo: tiny, photoType: 'image/svg+xml' }));
  await owner.reducers.createPost({ groupId: g.id, requestId: 0n, caption: 'Test photo', visibility: 'family', photo: tiny, photoType: 'image/jpeg' });
  await wait(() => rows(owner.db.visiblePost.iter()).some(p => p.caption === 'Test photo'));
  assert.ok(!rows(visitor.db.publicPost.iter()).some(p => p.caption === 'Test photo'), 'family post stays private');

  // Editing a sent transfer keeps a revision; over-approval is rejected.
  const meds = rows(owner.db.visibleRequest.iter()).find(r => r.groupId === g.id && r.status === 'sent')!;
  const tr = rows(owner.db.visibleRecordedTransfer.iter()).find(t => t.requestId === meds.id)!;
  const edit = { transferId: tr.id, fee: 250n, expected: 670000n, rate: '55.83', note: 'Corrected', reason: 'Typo in fee' };
  await assert.rejects(owner.reducers.editTransfer({ ...edit, amount: meds.approved + 1n }));
  await owner.reducers.editTransfer({ ...edit, amount: 11900n });
  await wait(() => rows(owner.db.visibleTransferRevision.iter()).some(r => r.transferId === tr.id));
  assert.equal(rows(owner.db.visibleRecordedTransfer.iter()).find(t => t.id === tr.id)!.amount, 11900n);
  assert.equal(rows(owner.db.visibleTransferRevision.iter()).find(r => r.transferId === tr.id)!.prevAmount, 12000n);

  // Demo payments: only last four digits are accepted; payouts must belong to the requester.
  await assert.rejects(owner.reducers.addPaymentMethod({ purpose: 'send', institution: 'Chase', kind: 'checking', holderName: 'X', last4: '123456789', currency: 'USD', country: 'US' }));
  await recipient.reducers.addPaymentMethod({ purpose: 'receive', institution: 'Vietcombank', kind: 'savings', holderName: 'R', last4: '7788', currency: 'VND', country: 'VN' });
  await wait(() => rows(owner.db.visiblePaymentMethod.iter()).some(m => m.purpose === 'send'));
  assert.ok(!rows(owner.db.visiblePaymentMethod.iter()).some(m => m.last4 === '7788'), "a stranger's account is not visible");
  const laptop = rows(owner.db.visibleRequest.iter()).find(r => r.groupId === g.id && r.status === 'approved')!;
  const mine = rows(owner.db.visiblePaymentMethod.iter()).find(m => m.purpose === 'send')!;
  const payouts = rows(owner.db.visiblePaymentMethod.iter()).filter(m => m.purpose === 'receive');
  const wrong = payouts.find(m => !m.owner.isEqual(laptop.author))!;
  const right = payouts.find(m => m.owner.isEqual(laptop.author))!;
  const pay = { requestId: laptop.id, fundingId: mine.id, amount: 30000n, fee: 249n, expected: 1747500n, rate: '58.25' };
  await assert.rejects(owner.reducers.sendMoney({ ...pay, payoutId: wrong.id }));
  await owner.reducers.sendMoney({ ...pay, payoutId: right.id });
  await wait(() => rows(owner.db.visibleRecordedTransfer.iter()).some(t => t.requestId === laptop.id && t.payoutMethodId === right.id));

  // The Vietnamese demo uses VND, which has no minor unit.
  await owner.reducers.seedDemo({ family: 'nguyen' });
  await wait(() => rows(owner.db.visibleFamily.iter()).some(f => f.slug.startsWith('nguyen-')));
  const vn = rows(owner.db.visibleFamily.iter()).find(f => f.slug.startsWith('nguyen-'))!;
  assert.ok(rows(owner.db.visibleRecordedTransfer.iter()).some(t => t.groupId === vn.id && t.receiveCurrency === 'VND' && t.expected === 2497075n));
  await owner.reducers.updatePublicPage({ groupId: vn.id, isPublic: false, slug: vn.slug, story: vn.story, goalAmount: vn.goalAmount, goalCurrency: 'USD' });

  // Confirmed transfers are locked; only senders can edit.
  const done = rows(owner.db.visibleRequest.iter()).find(r => r.groupId === g.id && r.status === 'completed')!;
  const doneTr = rows(owner.db.visibleRecordedTransfer.iter()).find(t => t.requestId === done.id)!;
  await assert.rejects(owner.reducers.editTransfer({ ...edit, transferId: doneTr.id, amount: 100n }));
  await assert.rejects(visitor.reducers.editTransfer({ ...edit, amount: 100n }));

  // Budget targets upsert by month/category/currency.
  const month = new Date().toISOString().slice(0, 7);
  await owner.reducers.setBudgetTarget({ groupId: g.id, month, category: 'groceries', currency: 'PHP', amount: 999n });
  await wait(() => rows(owner.db.visibleBudgetTarget.iter()).some(t => t.groupId === g.id && t.amount === 999n));
  assert.equal(rows(owner.db.visibleBudgetTarget.iter()).filter(t => t.groupId === g.id && t.category.toLowerCase() === 'groceries').length, 1);

  // Only the owner controls the public page; unpublishing hides it immediately.
  await recipient.reducers.saveProfile({ name: 'Feature test recipient' });
  await assert.rejects(visitor.reducers.updatePublicPage({ groupId: g.id, isPublic: false, slug: g.slug, story: '', goalAmount: 0n, goalCurrency: 'USD' }));
  await owner.reducers.updatePublicPage({ groupId: g.id, isPublic: false, slug: g.slug, story: g.story, goalAmount: g.goalAmount, goalCurrency: 'USD' });
  await wait(() => !rows(visitor.db.publicFamily.iter()).some(f => f.id === g.id) && !rows(visitor.db.publicPost.iter()).some(p => p.groupId === g.id));
  await assert.rejects(visitor.reducers.contribute({ groupId: g.id, requestId: 0n, name: 'Late', amount: 100n, currency: 'USD', message: '' }));

  console.log('PASS: demo seeds (PH + VN), demo payments, public-view isolation, pledge rules, photo posts and visibility, transfer edits with revisions, edit locks, budget target upsert, public page ownership.');
} finally {
  owner.disconnect();
  visitor.disconnect();
  recipient.disconnect();
}
