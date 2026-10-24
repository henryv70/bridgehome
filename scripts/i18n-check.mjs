// Lists every interface string the app can pass to t() and checks that vi and zh cover it.
// Usage: npm run i18n:check  (or: node scripts/i18n-check.mjs . <outDir> to write keys.json)
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repo = process.argv[2];
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(join(repo, 'src')).filter(f => /\.(tsx?|ts)$/.test(f) && !f.includes('module_bindings') && !f.includes('locales'));
const server = walk(join(repo, 'spacetimedb', 'src')).filter(f => f.endsWith('.ts') && !f.endsWith('demo.ts'));

const keys = new Set();
const str = String.raw`'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|\x60((?:[^\x60\\$]|\\.)*)\x60`;
const lit = m => (m[1] ?? m[2] ?? m[3]).replace(/\\(.)/g, '$1');
const grab = (src, re) => { for (const m of src.matchAll(re)) keys.add(lit(m)); };

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  grab(src, new RegExp(String.raw`\bt\(\s*(?:${str})`, 'g'));                       // t('...')
  for (const m of src.matchAll(new RegExp(String.raw`\btn\(\s*(?:${str})\s*,\s*(?:${str})`, 'g'))) {
    keys.add((m[1] ?? m[2] ?? m[3]).replace(/\\(.)/g, '$1'));
    keys.add((m[4] ?? m[5] ?? m[6]).replace(/\\(.)/g, '$1'));
  }
  // Success toasts: run(() => ..., 'Message') or run(fn, cond ? 'A' : 'B')
  for (const m of src.matchAll(/\}\),\s*([^)]*?)\)\)?\s*(?:onDone|\)|\{|;|setStep|close|setEditing|el\.|onClose|navigate|setAsked)/g)) {
    for (const s of m[1].matchAll(new RegExp(str, 'g'))) keys.add(lit(s));
  }
  // status(label, tone, about) and step(key, label, who) in lib/status.ts translate through getters.
  for (const m of src.matchAll(new RegExp(String.raw`\bstatus\(\s*(?:${str})\s*,\s*(?:${str})\s*,\s*(?:${str})`, 'g'))) {
    keys.add((m[1] ?? m[2] ?? m[3]).replace(/\\(.)/g, '$1'));
    keys.add((m[7] ?? m[8] ?? m[9]).replace(/\\(.)/g, '$1'));
  }
  for (const m of src.matchAll(new RegExp(String.raw`\bstep\(\s*(?:${str})\s*,\s*(?:${str})\s*,\s*(?:${str})`, 'g'))) {
    keys.add((m[4] ?? m[5] ?? m[6]).replace(/\\(.)/g, '$1'));
    keys.add((m[7] ?? m[8] ?? m[9]).replace(/\\(.)/g, '$1'));
  }
  // Landing <Pillar eyebrow="…" title="…" body="…"> props, translated inside Pillar.
  if (f.endsWith('landing.tsx')) for (const m of src.matchAll(/\b(?:eyebrow|title|body)="([^"]*)"/g)) keys.add(m[1]);
  // English labels kept in data and translated at render.
  for (const m of src.matchAll(/\b(?:label|title|body|eyebrow|blurb|name|where|category|bucket):\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g)) keys.add(lit(m));
}

// Arrays of plain labels used with t(x) at render time.
const ARRAY_FILES = { 'src/components/app/request-parts.tsx': /CATEGORIES = \[([^\]]*)\]/, 'src/lib/budget.ts': /INCOME_CATEGORIES = \[([^\]]*)\]/,
  'src/pages/how.tsx': /STEP_TEXT = \[([\s\S]*?)\];/, 'src/pages/landing.tsx': /points=\{\[([^\]]*)\]\}/g };
for (const [f, re] of Object.entries(ARRAY_FILES)) {
  const src = readFileSync(join(repo, f), 'utf8');
  for (const m of re.global ? src.matchAll(re) : [src.match(re)]) for (const s of m[1].matchAll(new RegExp(str, 'g'))) keys.add(lit(s));
}
for (const s of ['Debt repayment', 'Checking', 'Savings', 'Wallet', 'Debit', 'Routine', 'Important', 'Urgent', 'Sent', 'Processing', 'Deposited',
  'You send', 'Fee', 'Rate', 'Bánh chưng for Tết', 'School supplies', 'A month of rice', 'Flowers before Tết', 'Medicine', 'Back on the road',
  'Market day', 'New textbooks', 'Morning market', 'A laptop for class', 'Groceries', 'Health', 'Utilities', 'Transport', 'Education',
  'pledged to public families', 'community supporters', 'currencies, from VND to NGN', 'banks and mobile wallets', 'Sender', 'Recipient', 'Senders', 'Recipients',
  'Reviews requests, sends money outside the app, and records it.', 'Asks for support and confirms what arrives.',
  'Home', 'Requests', 'Budget', 'Moments', 'Family', 'Explore', 'Give', 'How it works', 'Active', 'Needs me', 'Done', 'All',
  'Most supported', 'Closest to goal', 'Newest', 'Family only', 'Public',
  'Could you add a bank account or mobile wallet under Bank accounts (in your profile menu)? Then I can send this straight to you with BridgeHome Pay.',
  "Your password never leaves this device. It unlocks a sealed copy of this device's sign-in, so you can log back in here or on another phone or computer.",
  'Username or password is incorrect.', 'Too many attempts. Try again in {n} minutes.', 'Translation is busy right now. Try again in a minute.',
  // Audit actions the server builds dynamically or the demo seed writes.
  'Request draft', 'Request submitted', 'Request rejected', 'Public page published', 'Public page updated (private)',
  'Request shared publicly', 'Request made private', 'Transfer recorded', 'Receipt confirmed', 'Money sent with BridgeHome Pay (demo)', 'Demo data loaded']) keys.add(s);
// Not interface text: crypto names, language names (shown as-is), country names (from Intl.DisplayNames).
const IGNORED = ['PBKDF2', 'Request ', 'English', 'Tiếng Việt', '简体中文', 'Australia', 'Bangladesh', 'Brazil', 'Canada', 'Colombia', 'Dominican Republic',
  'Guatemala', 'India', 'Indonesia', 'Kenya', 'Mexico', 'Nigeria', 'Pakistan', 'Philippines', 'South Korea', 'United Kingdom', 'United States', 'Vietnam'];

// Server: audit actions and error messages people can see.
for (const f of server) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(new RegExp(String.raw`\blog\(ctx,[^,]+,\s*(?:${str})`, 'g'))) keys.add(lit(m).replace(/ \(self-reported\)/, ''));
  for (const m of src.matchAll(new RegExp(String.raw`(?:\bfail|new SenderError)\(\s*(?:${str})\s*\)`, 'g'))) keys.add(lit(m));
}
for (const m of readFileSync(join(repo, 'spacetimedb/src/demo.ts'), 'utf8').matchAll(new RegExp(String.raw`\blog\(ctx,[^,]+,\s*(?:${str})`, 'g'))) keys.add(lit(m));

for (const s of IGNORED) keys.delete(s);
const list = [...keys].filter(k => k &&/[A-Za-z]/.test(k) && !/^[a-z]+\.[a-z.]+$/.test(k) && !k.includes('${')).sort();
if (process.argv.includes('--check')) {
  let missing = 0;
  for (const lang of ['vi', 'zh']) {
    const dict = readFileSync(join(repo, `src/locales/${lang}.ts`), 'utf8');
    const have = new Set([...dict.matchAll(new RegExp(String.raw`^\s*(?:${str})\s*:`, 'gm'))].map(lit));
    const miss = list.filter(k => !have.has(k));
    const extra = [...have].filter(k => !keys.has(k));
    missing += miss.length;
    console.log(`${lang}: ${have.size} entries, ${miss.length} missing, ${extra.length} unused`);
    miss.forEach(k => console.log('  MISSING', JSON.stringify(k)));
    // Placeholders must survive translation.
    for (const m of dict.matchAll(new RegExp(String.raw`^\s*(?:${str})\s*:\s*(?:${str})`, 'gm'))) {
      const k = (m[1] ?? m[2] ?? m[3]).replace(/\\(.)/g, '$1'), v = (m[4] ?? m[5] ?? m[6]).replace(/\\(.)/g, '$1');
      const ph = s => [...s.matchAll(/\{\w+\}/g)].map(x => x[0]).sort().join();
      if (ph(k) !== ph(v)) console.log('  PLACEHOLDER', lang, JSON.stringify(k), '->', JSON.stringify(v));
    }
  }
  process.exitCode = missing ? 1 : 0;
} else {
  writeFileSync(join(process.argv[3] ?? '.', 'keys.json'), JSON.stringify(list, null, 1));
  console.log(list.length, 'keys');
}
