import { schema, table, t } from 'spacetimedb/server';

// New columns are appended with defaults so existing local data migrates in place.
export const profile = table({ name: 'profile' }, {
  identity: t.identity().primaryKey(),
  name: t.string(),
});

export const family = table({ name: 'family' }, {
  id: t.u64().primaryKey().autoInc(),
  name: t.string(),
  owner: t.identity(),
  createdAt: t.timestamp(),
  isPublic: t.bool().default(false),
  slug: t.string().default(''),
  story: t.string().default(''),
  goalAmount: t.u64().default(0n),
  goalCurrency: t.string().default('USD'),
  isDemo: t.bool().default(false),
});

export const membership = table({ name: 'membership' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  identity: t.identity().index('btree'),
  role: t.string(),
  name: t.string(),
});

export const invitation = table({ name: 'invitation' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  code: t.string().unique(),
  role: t.string(),
  expiresAt: t.timestamp(),
});

export const budget = table({ name: 'budget' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  author: t.identity(),
  kind: t.string(),
  category: t.string(),
  amount: t.u64(),
  currency: t.string(),
  month: t.string().index('btree'),
  explanation: t.string(),
  createdAt: t.timestamp(),
});

export const budgetTarget = table({ name: 'budget_target' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  month: t.string(),
  category: t.string(),
  currency: t.string(),
  amount: t.u64(),
  author: t.identity(),
  updatedAt: t.timestamp(),
});

export const request = table({ name: 'request' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  author: t.identity(),
  amount: t.u64(),
  currency: t.string(),
  category: t.string(),
  explanation: t.string(),
  priority: t.string(),
  dueDate: t.string().index('btree'),
  status: t.string().index('btree'),
  approved: t.u64(),
  createdAt: t.timestamp(),
  isPublic: t.bool().default(false),
  publicTitle: t.string().default(''),
});

export const comment = table({ name: 'comment' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  requestId: t.u64().index('btree'),
  author: t.identity(),
  text: t.string(),
  createdAt: t.timestamp(),
});

export const commitment = table({ name: 'commitment' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  author: t.identity(),
  amount: t.u64(),
  currency: t.string(),
  cadence: t.string(),
  startDate: t.string(),
  note: t.string(),
  createdAt: t.timestamp(),
});

export const recordedTransfer = table({ name: 'recorded_transfer' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  requestId: t.u64().index('btree'),
  author: t.identity(),
  amount: t.u64(),
  currency: t.string(),
  fee: t.u64(),
  expected: t.u64(),
  receiveCurrency: t.string(),
  rate: t.string(),
  note: t.string(),
  createdAt: t.timestamp(),
  fundingMethodId: t.u64().default(0n),
  payoutMethodId: t.u64().default(0n),
});

// Every edit to a recorded transfer keeps the previous values here.
export const transferRevision = table({ name: 'transfer_revision' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  transferId: t.u64().index('btree'),
  author: t.identity(),
  prevAmount: t.u64(),
  prevFee: t.u64(),
  prevExpected: t.u64(),
  prevRate: t.string(),
  prevNote: t.string(),
  reason: t.string(),
  createdAt: t.timestamp(),
});

export const receipt = table({ name: 'receipt' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  transferId: t.u64().unique(),
  author: t.identity(),
  amount: t.u64(),
  currency: t.string(),
  useNote: t.string(),
  createdAt: t.timestamp(),
});

export const post = table({ name: 'post' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  author: t.identity(),
  requestId: t.u64(),
  caption: t.string(),
  visibility: t.string(),
  photo: t.array(t.u8()),
  photoType: t.string(),
  createdAt: t.timestamp(),
  photoUrl: t.string().default(''),
});

export const reaction = table({ name: 'reaction' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  postId: t.u64().index('btree'),
  identity: t.identity().index('btree'),
  emoji: t.string(),
  createdAt: t.timestamp(),
});

// Demo pledges from the public. No money moves through BridgeHome.
export const contribution = table({ name: 'contribution' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  requestId: t.u64(),
  contributor: t.identity(),
  name: t.string(),
  amount: t.u64(),
  currency: t.string(),
  message: t.string(),
  createdAt: t.timestamp(),
});

// Demo bank accounts and wallets. Only the institution and last four digits are stored;
// full account numbers and bank sign-in details never leave the browser.
export const paymentMethod = table({ name: 'payment_method' }, {
  id: t.u64().primaryKey().autoInc(),
  owner: t.identity().index('btree'),
  purpose: t.string(),
  institution: t.string(),
  kind: t.string(),
  holderName: t.string(),
  last4: t.string(),
  currency: t.string(),
  country: t.string(),
  createdAt: t.timestamp(),
});

export const audit = table({ name: 'audit' }, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  actor: t.identity(),
  action: t.string(),
  detail: t.string(),
  createdAt: t.timestamp().index('btree'),
});

// Username sign-in. The password never reaches the database: the browser derives an auth key
// (checked here) and an encryption key (kept in the browser) from it, and stores its connection
// token sealed with the encryption key. Signing in on another device unseals that token.
export const credential = table({ name: 'credential' }, {
  identity: t.identity().primaryKey(),
  username: t.string().unique(),
  authKey: t.string(),
  sealedToken: t.string(),
  failures: t.u32(),
  lockedUntil: t.timestamp(),
  createdAt: t.timestamp(),
});

// Outcome of a sign-in attempt, readable only by the connection that made it.
export const signInResult = table({ name: 'sign_in_result' }, {
  identity: t.identity().primaryKey(),
  attempt: t.string(),
  ok: t.bool(),
  message: t.string(),
  sealedToken: t.string(),
});

// Retained solely for a non-destructive migration; no application writes or reads.
export const person = table({ public: true }, { name: t.string() });

// Machine translations of what family members write, shared by the whole family.
// `source` is "request:<id>", "comment:<id>" or "post:<id>"; `original` detects later edits.
export const translation = table({
  name: 'translation',
  indexes: [{ accessor: 'by_source_lang', algorithm: 'btree', columns: ['source', 'lang'] }],
}, {
  id: t.u64().primaryKey().autoInc(),
  groupId: t.u64().index('btree'),
  source: t.string(),
  lang: t.string(),
  original: t.string(),
  text: t.string(),
  createdAt: t.timestamp(),
});

const db = schema({
  person, profile, family, membership, invitation, budget, budgetTarget, request, comment,
  commitment, recordedTransfer, transferRevision, receipt, post, reaction, contribution, paymentMethod, audit,
  credential, signInResult, translation,
}, {
  // Set at publish time from shell variables of the same name; never stored in tables or sent to clients.
  env: { ANTHROPIC_API_KEY: t.option(t.string()), TRANSLATION_MODEL: t.option(t.string()) },
});
export default db;
