import { t } from 'spacetimedb/server';
import { Identity, Timestamp } from 'spacetimedb';
import db from './schema';
import { type Ctx, fail, randomHex } from './lib';
import { screenRequest } from './fraud';

const DAY = 86_400_000_000n;

type Who = 'me' | 'a' | 'b';
type Account = { institution: string; kind: string; last4: string; currency: string; country: string };
type Spec = {
  name: string; slugBase: string; story: (me: string) => string; goal: bigint;
  members: { a: string; b: string };
  receiveCurrency: string; rates: string[];
  accounts: { me: Account; a: Account; b: Account };
  requests: {
    key: string; by: Who; days: number; amount: bigint; category: string; priority: string; due: number; status: string; approved: bigint;
    explanation: string; title?: string; screen?: boolean;
    comments?: [Who, number, string][];
    transfer?: { days: number; fee: bigint; rate: number; note: string; pay?: boolean; receipt?: [number, string] };
  }[];
  commitment: [bigint, string];
  budget: { income: [string, number][]; expense: [string, number][]; extra?: [number, Who, string, number, string] };
  targets: [string, bigint][];
  posts: [Who, number, string | null, 'family' | 'public', string, string][];
  pledges: [string, string | null, bigint, string, number][];
};

const SPECS: Record<string, Spec> = {
  santos: {
    name: 'The Santos Family', slugBase: 'santos', goal: 150000n,
    story: me => `We are three generations split between Oakland and Quezon City. ${me} works in the Bay Area and supports Lola Rosa, who manages her blood pressure at home, and Ana, who is in her second year studying nursing. Every gift goes straight to a need you can see here.`,
    members: { a: 'Lola Rosa', b: 'Ana' },
    receiveCurrency: 'PHP', rates: ['58.10', '58.42', '58.25'],
    accounts: {
      me: { institution: 'Chase', kind: 'checking', last4: '4821', currency: 'USD', country: 'US' },
      a: { institution: 'BDO Unibank', kind: 'savings', last4: '6612', currency: 'PHP', country: 'PH' },
      b: { institution: 'GCash', kind: 'wallet', last4: '4410', currency: 'PHP', country: 'PH' },
    },
    requests: [
      { key: 'tuition', by: 'b', days: 40, amount: 45000n, category: 'Education', priority: 'important', due: -25, status: 'completed', approved: 45000n,
        explanation: 'Second-semester tuition for my nursing program. The registrar deadline is the 15th.', title: "Ana's nursing tuition",
        comments: [['me', 38, 'Approved in full. So proud of you!']],
        transfer: { days: 36, fee: 499n, rate: 58.1, note: 'Remitly, bank deposit', receipt: [34, 'Paid the registrar in full. Receipt photo is in the feed.'] } },
      { key: 'meds', by: 'a', days: 12, amount: 12000n, category: 'Health', priority: 'urgent', due: 3, status: 'sent', approved: 12000n,
        explanation: 'Three months of amlodipine and losartan. The pharmacy near church has them in stock.',
        comments: [['me', 11, 'Sending today. Please take care, Lola.']],
        transfer: { days: 0, fee: 159n, rate: 58.42, note: '', pay: true } },
      { key: 'roof', by: 'a', days: 4, amount: 80000n, category: 'Housing', priority: 'important', due: 21, status: 'submitted', approved: 0n,
        explanation: 'The kitchen roof leaks when it rains. A local carpenter quoted new corrugated sheets plus two days of labor.',
        title: "Fix Lola's roof before typhoon season", comments: [['b', 3, 'I got a second quote. It was about the same.']] },
      { key: 'laptop', by: 'b', days: 6, amount: 35000n, category: 'Education', priority: 'routine', due: 14, status: 'approved', approved: 30000n,
        explanation: 'A refurbished laptop for coursework. The library computers have a two-hour limit.',
        comments: [['me', 5, 'I can cover $300 now. Could you find one closer to that?']] },
      { key: 'electric', by: 'a', days: 20, amount: 7500n, category: 'Utilities', priority: 'routine', due: -5, status: 'received', approved: 7500n,
        explanation: 'Meralco bill for October. It went up because of the electric fan during the heat wave.',
        transfer: { days: 17, fee: 299n, rate: 58.25, note: 'GCash cash-in', receipt: [15, 'Paid at the Bayad center.'] } },
    ],
    commitment: [30000n, 'Base support for household costs every month.'],
    budget: {
      income: [['Support from family', 1700000], ['Ana part-time', 600000]],
      expense: [['Groceries', 1150000], ['Utilities', 420000], ['Health', 610000], ['Transport', 280000]],
      extra: [1, 'b', 'Education', 2614500, 'Second-semester tuition'],
    },
    targets: [['Groceries', 1200000n], ['Utilities', 400000n], ['Health', 600000n], ['Transport', 300000n], ['Education', 300000n]],
    posts: [
      ['b', 33, 'tuition', 'public', 'Enrollment confirmed and supplies bought for second semester! Thank you all 💙', '/demo/school.jpg'],
      ['a', 14, 'electric', 'family', 'Bill paid, and the fan is running again. Salamat, anak.', '/demo/fan.jpg'],
      ['a', 4, 'roof', 'public', 'These are the corrugated sheets the carpenter recommends for the kitchen roof.', '/demo/ironctx.jpg'],
      ['b', 9, 'meds', 'family', "Lola's new prescription. She takes them every morning with breakfast.", '/demo/pills.jpg'],
      ['b', 7, 'laptop', 'family', 'Found a refurbished one at the mall for ₱17,500. Close to the budget!', '/demo/laptop.jpg'],
      ['a', 2, null, 'public', 'Saturday market run. Tomatoes were cheap this week.', '/demo/market.jpg'],
    ],
    pledges: [
      ['Tita Marissa', 'roof', 10000n, 'For Lola, from all of us in San Diego.', 3], ['Kevin L.', 'roof', 2500n, '', 2],
      ['Church small group', null, 5000n, 'Praying for your family.', 6], ['$me', 'roof', 7500n, 'Hang in there, Lola!', 1],
      ['Marcus Johnson', 'roof', 5000n, 'Stay dry this typhoon season.', 1], ['Jose Ramirez', 'roof', 6000n, 'Para Lola, con cariño.', 2],
      ['Priya Patel', null, 2500n, "Rooting for Ana's nursing career.", 4], ['Emily Chen', 'roof', 1500n, '', 0],
    ],
  },
  nguyen: {
    name: 'The Nguyễn Family', slugBase: 'nguyen', goal: 100000n,
    story: me => `Three generations between San Jose and Huế. ${me} works as a nurse in San Jose and supports Bà Ngoại Lan, who still runs her fruit stall at Đông Ba market every morning, and Minh, a second-year engineering student in Đà Nẵng. Tết is coming, and so is the rainy season.`,
    members: { a: 'Bà Ngoại Lan', b: 'Minh' },
    receiveCurrency: 'VND', rates: ['26310', '26285', '26340'],
    accounts: {
      me: { institution: 'Chase', kind: 'checking', last4: '4821', currency: 'USD', country: 'US' },
      a: { institution: 'Vietcombank', kind: 'savings', last4: '3307', currency: 'VND', country: 'VN' },
      b: { institution: 'MoMo', kind: 'wallet', last4: '9124', currency: 'VND', country: 'VN' },
    },
    requests: [
      { key: 'tuition', by: 'b', days: 45, amount: 52000n, category: 'Education', priority: 'important', due: -30, status: 'completed', approved: 52000n,
        explanation: 'Học phí (tuition) for my second year at Đại học Bách khoa Đà Nẵng, plus two required textbooks.', title: "Minh's engineering tuition",
        comments: [['me', 44, 'Approved. Study hard, em!'], ['b', 41, 'Paid today. Cảm ơn anh/chị!']],
        transfer: { days: 43, fee: 399n, rate: 26310, note: 'Remitly, bank deposit to Vietcombank', receipt: [41, 'Paid the university office. Bought the textbooks too.'] } },
      { key: 'meds', by: 'a', days: 9, amount: 9500n, category: 'Health', priority: 'urgent', due: 2, status: 'sent', approved: 9500n,
        explanation: 'Thuốc huyết áp (blood pressure medicine) and joint pain tablets for three months from the pharmacy near Đông Ba.',
        comments: [['me', 1, 'Sent with BridgeHome Pay. It should be in your Vietcombank account shortly, Bà.']],
        transfer: { days: 0, fee: 146n, rate: 26285, note: '', pay: true } },
      { key: 'tet', by: 'a', days: 3, amount: 25000n, category: 'Celebration', priority: 'important', due: 30, status: 'submitted', approved: 0n,
        explanation: 'Tết groceries: bánh chưng, mứt, fruit for the ancestor altar, and a branch of hoa mai. All the cousins are coming home this year.',
        title: 'Help Bà Lan welcome the family home for Tết', comments: [['b', 2, "I'll help Bà wrap the bánh chưng this year."]] },
      { key: 'bike', by: 'b', days: 5, amount: 14000n, category: 'Transport', priority: 'routine', due: 10, status: 'approved', approved: 12000n,
        explanation: 'My xe máy needs new brake pads and a rear tire before the rainy season. The shop near campus quoted 3.6 triệu đồng.',
        title: "Keep Minh's motorbike safe for the rainy season",
        comments: [['me', 4, 'Approved $120 now. Ask the shop if they can do the tire for less.']] },
      { key: 'rice', by: 'a', days: 16, amount: 6000n, category: 'Groceries', priority: 'routine', due: -6, status: 'received', approved: 6000n,
        explanation: 'A 50 kg sack of rice for the month and cooking oil.',
        transfer: { days: 15, fee: 199n, rate: 26340, note: 'Xoom, cash pickup', receipt: [13, 'Bought the rice at the market. Delivered by motorbike!'] } },
      { key: 'checkup', by: 'a', days: 60, amount: 10500n, category: 'Health', priority: 'routine', due: -50, status: 'received', approved: 10500n,
        explanation: 'Yearly checkup and blood tests at Bệnh viện Trung ương Huế.',
        transfer: { days: 58, fee: 199n, rate: 26300, note: 'Remitly, bank deposit to Vietcombank', receipt: [56, 'Checkup done. The doctor says Bà is doing well.'] } },
      { key: 'clinic', by: 'a', days: 1, amount: 50000n, category: 'Health', priority: 'urgent', due: 5, status: 'submitted', approved: 0n,
        explanation: 'Treatment at a private clinic. The clinic asks for payment up front this week.', screen: true },
    ],
    commitment: [30000n, 'Monthly support for Bà Lan and Minh.'],
    budget: {
      income: [['Support from family', 7900000], ['Fruit stall', 4500000]],
      expense: [['Groceries', 4200000], ['Utilities', 950000], ['Health', 1600000], ['Transport', 700000]],
      extra: [1, 'b', 'Education', 13681200, 'Second-year tuition and textbooks'],
    },
    targets: [['Groceries', 4500000n], ['Utilities', 900000n], ['Health', 1500000n], ['Transport', 800000n], ['Celebration', 6000000n]],
    posts: [
      ['a', 2, 'tet', 'public', 'Bánh chưng from last Tết. This year Minh is learning to wrap them himself.', '/demo/banhchung.jpg'],
      ['b', 1, 'tet', 'public', 'The flower sellers are already out on their bikes. Bà wants a big branch of hoa mai.', '/demo/flowers.jpg'],
      ['a', 13, 'rice', 'family', 'Gạo mới (new rice) for the month. Thank you, con.', '/demo/rice.jpg'],
      ['b', 4, 'bike', 'family', 'Back on the road after the brake check. The tire is next.', '/demo/scootertrip.jpg'],
      ['b', 40, 'tuition', 'public', 'New semester, new textbooks. Second year here I come!', '/demo/books.jpg'],
      ['a', 6, null, 'public', 'Morning at the market before opening the stall.', '/demo/asianmarket.jpg'],
      ['a', 8, 'meds', 'family', "Bà's prescription from the doctor.", '/demo/meds.jpg'],
    ],
    pledges: [
      ['Cô Hạnh (San Jose)', 'tet', 5000n, 'Chúc mừng năm mới! For the Tết table.', 2], ['Anh Tuấn', 'tet', 2000n, '', 1],
      ['Viet Student Association', null, 10000n, 'Proud to support families back home.', 5], ['$me', 'tet', 5000n, "For Bà's Tết table. Love you all.", 1],
      ['Linh Tran', 'tet', 3500n, 'From one Huế family to another.', 1], ['Daniel Nguyen', null, 10000n, 'Proud of this family.', 3],
      ['Priya Patel', 'bike', 2000n, 'Ride safe, Minh!', 2], ['Grace Kim', 'tet', 1500n, 'Chúc mừng năm mới!', 0],
    ],
  },
};

function monthOf(ctx: Ctx, monthsAgo: number) {
  const d = new Date(Number(ctx.timestamp.microsSinceUnixEpoch / 1000n));
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d.toISOString().slice(0, 7);
}

function dayOffset(ctx: Ctx, days: number) {
  return new Date(Number(ctx.timestamp.microsSinceUnixEpoch / 1000n) + days * 86_400_000).toISOString().slice(0, 10);
}

// Converts USD minor units at a rate into receiving-currency minor units (VND has no minor unit).
function convert(usdCents: bigint, rate: number, currency: string) {
  return currency === 'VND' ? BigInt(Math.round((Number(usdCents) / 100) * rate)) : BigInt(Math.round(Number(usdCents) * rate));
}

export const seedDemo = db.reducer({ family: t.string() }, (ctx, { family }) => {
  const spec = SPECS[family];
  if (!spec) fail('Unknown demo family.');
  const me = ctx.db.profile.identity.find(ctx.sender);
  if (!me) fail('Save your name first.');
  const now = ctx.timestamp.microsSinceUnixEpoch;
  const ago = (days: number, minutes = 0) => new Timestamp(now - BigInt(days) * DAY - BigInt(minutes) * 60_000_000n);
  const fake = () => new Identity(BigInt('0x' + randomHex(ctx, 32)));
  const ids: Record<Who, Identity> = { me: ctx.sender, a: fake(), b: fake() };
  const nameOf = (w: Who) => (w === 'me' ? me.name : spec.members[w]);

  const g = ctx.db.family.insert({
    id: 0n, name: spec.name, owner: ctx.sender, createdAt: ago(75), isPublic: true, slug: spec.slugBase + '-' + randomHex(ctx, 2),
    story: spec.story(me.name), goalAmount: spec.goal, goalCurrency: 'USD', isDemo: true,
  });
  const gid = g.id;
  ctx.db.membership.insert({ id: 0n, groupId: gid, identity: ids.me, role: 'sender', name: me.name });
  ctx.db.membership.insert({ id: 0n, groupId: gid, identity: ids.a, role: 'recipient', name: spec.members.a });
  ctx.db.membership.insert({ id: 0n, groupId: gid, identity: ids.b, role: 'recipient', name: spec.members.b });
  const audit = (who: Who, days: number, action: string, detail: string) =>
    ctx.db.audit.insert({ id: 0n, groupId: gid, actor: ids[who], action, detail, createdAt: ago(days) });
  audit('me', 75, 'Group created', g.name + ' (demo)');
  audit('a', 74, 'Member joined', spec.members.a + ' (recipient)');
  audit('b', 74, 'Member joined', spec.members.b + ' (recipient)');

  // Demo accounts. Reuse the caller's sending account if they already linked one.
  const account = (who: Who, a: Account) => ctx.db.paymentMethod.insert({
    ...a, id: 0n, owner: ids[who], purpose: who === 'me' ? 'send' : 'receive', holderName: nameOf(who), createdAt: ago(30),
  });
  const myAccount = [...ctx.db.paymentMethod.owner.filter(ctx.sender)].find(m => m.purpose === 'send') ?? account('me', spec.accounts.me);
  const payout = { a: account('a', spec.accounts.a), b: account('b', spec.accounts.b) };

  const requestIds: Record<string, bigint> = {};
  for (const q of spec.requests) {
    const r = ctx.db.request.insert({
      id: 0n, groupId: gid, author: ids[q.by], amount: q.amount, currency: 'USD', category: q.category, explanation: q.explanation,
      priority: q.priority, dueDate: dayOffset(ctx, q.due), status: q.status, approved: q.approved, createdAt: ago(q.days),
      isPublic: !!q.title, publicTitle: q.title ?? '',
    });
    requestIds[q.key] = r.id;
    for (const [who, days, text] of q.comments ?? []) {
      ctx.db.comment.insert({ id: 0n, groupId: gid, requestId: r.id, author: ids[who], text, createdAt: ago(days) });
    }
    if (q.transfer) {
      const tr = q.transfer;
      const dest = q.by === 'me' ? payout.a : payout[q.by];
      const expected = convert(q.approved, tr.rate, spec.receiveCurrency);
      const row = ctx.db.recordedTransfer.insert({
        id: 0n, groupId: gid, requestId: r.id, author: ctx.sender, amount: q.approved, currency: 'USD', fee: tr.fee, expected,
        receiveCurrency: spec.receiveCurrency, rate: String(tr.rate),
        note: tr.pay ? `BridgeHome Pay (demo): ${myAccount.institution} ••${myAccount.last4} → ${dest.institution} ••${dest.last4}` : tr.note,
        createdAt: tr.pay ? ago(0, 3) : ago(tr.days), fundingMethodId: tr.pay ? myAccount.id : 0n, payoutMethodId: tr.pay ? dest.id : 0n,
      });
      if (tr.receipt) {
        ctx.db.receipt.insert({ id: 0n, groupId: gid, transferId: row.id, author: ids[q.by], amount: expected, currency: spec.receiveCurrency, useNote: tr.receipt[1], createdAt: ago(tr.receipt[0]) });
      }
      if (tr.pay) audit('me', 0, 'Money sent with BridgeHome Pay (demo)', `${dest.institution} ••${dest.last4}`);
    }
    if (q.status === 'completed') audit(q.by, Math.max(q.days - 12, 0), 'Request completed', String(r.id));
  }

  for (const q of spec.requests) if (q.screen) screenRequest(ctx, ctx.db.request.id.find(requestIds[q.key])!);

  ctx.db.commitment.insert({ id: 0n, groupId: gid, author: ctx.sender, amount: spec.commitment[0], currency: 'USD', cadence: 'monthly', startDate: dayOffset(ctx, -70), note: spec.commitment[1], createdAt: ago(70) });

  // Household budget in the receiving currency for the last three months.
  for (let m = 2; m >= 0; m--) {
    const month = monthOf(ctx, m);
    const add = (kind: string, author: Who, category: string, base: number, note: string, days: number) => ctx.db.budget.insert({
      id: 0n, groupId: gid, author: ids[author], kind, category, currency: spec.receiveCurrency, month, explanation: note, createdAt: ago(days),
      amount: BigInt(Math.round(base * (1 + ((m * 7 + category.length) % 9 - 4) / 40))),
    });
    for (const [c, base] of spec.budget.income) add('income', 'me', c, base, 'Monthly', m * 30 + 3);
    for (const [c, base] of spec.budget.expense) add('expense', 'a', c, base, 'Receipts kept in the kitchen drawer', m * 30 + 2);
    const extra = spec.budget.extra;
    if (extra && extra[0] === m) {
      ctx.db.budget.insert({ id: 0n, groupId: gid, author: ids[extra[1]], kind: 'expense', category: extra[2], amount: BigInt(extra[3]), currency: spec.receiveCurrency, month, explanation: extra[4], createdAt: ago(m * 30 + 4) });
    }
  }
  for (const [category, amount] of spec.targets) {
    ctx.db.budgetTarget.insert({ id: 0n, groupId: gid, month: monthOf(ctx, 0), category, currency: spec.receiveCurrency, amount, author: ctx.sender, updatedAt: ago(1) });
  }

  // Moments with real photos (served from /demo).
  const reactors: Who[] = ['me', 'a', 'b'];
  spec.posts.forEach(([who, days, key, visibility, caption, url], i) => {
    const p = ctx.db.post.insert({
      id: 0n, groupId: gid, author: ids[who], requestId: key ? requestIds[key] : 0n, caption, visibility, photo: [], photoType: 'image/jpeg',
      photoUrl: url, createdAt: ago(days, 30 + i * 7),
    });
    for (const [j, emoji] of (['❤️', '🙏', '🎉'] as const).entries()) {
      const r = reactors[(i + j) % 3];
      if (r !== who && (i + j) % 2 === 0) ctx.db.reaction.insert({ id: 0n, groupId: gid, postId: p.id, identity: ids[r], emoji, createdAt: ago(days) });
    }
  });

  for (const [name, key, amount, message, days] of spec.pledges) {
    const self = name === '$me';
    ctx.db.contribution.insert({
      id: 0n, groupId: gid, requestId: key ? requestIds[key] : 0n, contributor: self ? ctx.sender : fake(), name: self ? me.name : name,
      amount, currency: 'USD', message, createdAt: ago(days, 45),
    });
  }
  audit('me', 0, 'Demo data loaded', 'Sample members, requests, accounts, budget, photos and pledges');
});
