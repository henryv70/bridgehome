import { type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTable } from 'spacetimedb/react';
import {
  ArrowRight, Check, Eye, Globe, HandHeart, Heart, Landmark, Lock, ReceiptText, Send, ShieldCheck, Users, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { tables } from '@/module_bindings';
import { useApp } from '@/lib/data';
import { t } from '@/lib/i18n';
import { formatMoney, sum } from '@/lib/money';
import { monthName } from '@/lib/time';
import { useCountUp, useReveal } from '@/hooks/use-reveal';
import { buttonVariants } from '@/components/ui/button';
import { Wordmark } from '@/components/app/brand';
import { PublicHeader } from '@/components/app/public-header';
import { BankMark } from '@/components/app/bank-mark';

// A small, one-time entrance adds polish without delaying access to content.
function SectionBlock({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'li' | 'section' }) {
  return <Tag className={cn('section-enter', className)}>{children}</Tag>;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-sm font-medium text-brand">{children}</p>;
}

// ---------- Hero visuals: a composition of real family activity ----------

function HeroVisual() {
  return (
    <div className="hero-visual relative mx-auto grid w-full max-w-[460px] gap-2.5 sm:block sm:h-[500px]">

      {/* Photo card */}
      <div className="hero-photo relative w-full sm:absolute sm:top-0 sm:left-0 sm:w-[54%]">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <img src="/demo/banhchung.jpg" alt={t('Bánh chưng for Tết')} className="aspect-square w-full object-cover" />
          <div className="space-y-1.5 p-3">
            <p className="text-xs"><b>Bà Ngoại Lan</b> {t('Bánh chưng for the Tết table')}</p>
            <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full w-[72%] rounded-full bg-foreground" /></div>
            <p className="tabular text-[11px] text-muted-foreground">{t('{pledged} pledged of {goal}', { pledged: '$180', goal: '$250' })} · {t('{n} supporters', { n: 6 })}</p>
          </div>
        </div>
      </div>

      {/* Deposit card */}
      <div className="hero-deposit relative w-full sm:absolute sm:top-[18%] sm:right-0 sm:w-[56%]">
        <div className="space-y-2.5 rounded-2xl border bg-card p-3 shadow-sm sm:space-y-3 sm:p-4">
          <div className="flex items-center gap-2">
            <BankMark name="MoMo" className="size-8" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{t('Deposited to {account}', { account: 'MoMo ••9124' })}</p>
              <p className="text-[11px] text-muted-foreground">Minh · {t('just now')}</p>
            </div>
          </div>
          <p className="tabular text-xl font-semibold tracking-tight sm:text-2xl">₫3,157,200</p>
          <div className="flex gap-1.5">
            {['Sent', 'Processing', 'Deposited'].map((s, i) => (
              <div key={s} className="flex-1 space-y-1">
                <div className={cn('h-1 rounded-full', i < 2 ? 'bg-foreground' : 'bg-good')} />
                <p className="hidden items-center gap-0.5 text-[10px] text-muted-foreground sm:flex"><Check className="size-2.5" />{t(s)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Request card */}
      <div className="hero-request relative w-full sm:absolute sm:bottom-0 sm:left-[2%] sm:w-[58%]">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{t('Motorbike repair')}</p>
              <p className="text-[11px] text-muted-foreground">Minh · {t('before rainy season')}</p>
            </div>
            <p className="tabular text-sm font-semibold">$140</p>
          </div>
          <div className="mt-3 flex gap-1">{[1, 1, 1, 0, 0].map((d, i) => <span key={i} className={cn('h-1 flex-1 rounded-full', d ? (i === 2 ? 'bg-brand' : 'bg-foreground') : 'bg-muted')} />)}</div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t('Approved · sent with BridgeHome Pay')}</p>
        </div>
      </div>

      {/* Budget chip */}
      <div className="hero-budget relative w-full sm:absolute sm:right-0 sm:bottom-[16%] sm:w-[38%]">
        <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-3.5">
          <p className="text-[11px] text-muted-foreground">{t('{month} budget', { month: monthName('2026-10', 'short') })}</p>
          <div className="mt-2 flex h-12 items-end gap-1.5 sm:h-16">
            {[55, 80, 45, 92, 60, 74].map((h, i) => <span key={i} className="flex-1 rounded-t-[4px] bg-chart-1" style={{ height: `${h}%`, opacity: i === 3 ? 1 : 0.55 }} />)}
          </div>
          <p className="tabular mt-2 text-xs font-medium">{t('{amount} left over', { amount: '₫4,637,500' })}</p>
        </div>
      </div>
    </div>
  );
}

// ---------- Pillar visuals ----------

function BudgetVisual() {
  const rows = [['Groceries', 84, 92], ['Health', 112, 78], ['Utilities', 70, 95], ['Transport', 64, 80], ['Education', 30, 60]] as const;
  const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <p className="font-medium">{t('Spending vs. plan')}</p>
        <p className="text-xs text-muted-foreground">{monthName('2026-10', 'short')} · VND</p>
      </div>
      <div className="space-y-4">
        {rows.map(([name, actual, plan]) => (
          <div key={name}>
            <div className="mb-1.5 flex justify-between text-sm"><span>{t(name)}</span><span className={cn('tabular text-xs', actual > 100 ? 'text-critical' : 'text-muted-foreground')}>{actual > 100 ? t('Over plan') : t('{n}% of plan', { n: actual })}</span></div>
            <div className="relative h-2 rounded-full bg-muted">
              <div className={cn('absolute inset-y-0 left-0 rounded-full', actual > 100 ? 'bg-critical' : 'bg-chart-1')} style={{ width: `${Math.min(actual * plan / 100, 100)}%` }} />
              <span className="absolute -inset-y-1 w-0.5 rounded bg-foreground" style={{ left: `${plan}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-6 items-end gap-2 border-t pt-5">
        {[38, 52, 46, 61, 58, 70].map((h, i) => (
          <div key={i} className="flex h-24 flex-col items-center justify-end gap-1">
            <div className="flex h-full w-full items-end justify-center gap-0.5">
              <span className="w-2.5 rounded-t-[4px] bg-chart-1" style={{ height: `${h + 20}%` }} />
              <span className="w-2.5 rounded-t-[4px] bg-chart-2" style={{ height: `${h}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{monthName(months[i], 'short')}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-chart-1" />{t('Income')}</span><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-chart-2" />{t('Spending')}</span></div>
    </div>
  );
}

function SendVisual() {
  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <BankMark name="Chase" className="size-10" />
        <div className="flex-1"><p className="text-sm font-medium">Chase ••4821</p><p className="text-xs text-muted-foreground">San Jose · USD</p></div>
      </div>
      <div className="relative mx-5 h-8">
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed" />
      </div>
      <div className="flex items-center gap-3">
        <BankMark name="Vietcombank" className="size-10" />
        <div className="flex-1"><p className="text-sm font-medium">Vietcombank ••3307</p><p className="text-xs text-muted-foreground">Bà Ngoại Lan · Huế · VND</p></div>
        <Check className="size-4 text-good" />
      </div>
      <div className="tabular space-y-2 rounded-2xl bg-muted/60 p-4 text-sm">
        {[['You send', '$95.00'], ['Fee', '$1.46'], ['Rate', '1 USD = 26,285 VND']].map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-muted-foreground">{t(k)}</span><span>{v}</span></div>)}
        <div className="flex justify-between border-t pt-2 font-semibold"><span>{t('{who} receives', { who: 'Bà Lan' })}</span><span>₫2,497,075</span></div>
      </div>
      <p className="text-center text-xs text-muted-foreground">{t('BridgeHome Pay is a demo. No bank is contacted.')}</p>
    </div>
  );
}

function FundraiseVisual() {
  const donors = [['Henry Vu', '$125'], ['Viet Student Association', '$100'], ['Daniel Nguyen', '$100'], ['Linh Tran', '$55']];
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <img src="/demo/flowers.jpg" alt={t('A flower seller on a bicycle in Hanoi before Tết')} className="aspect-[16/8] w-full object-cover" loading="lazy" />
      <div className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="text-xs text-muted-foreground">{t('The Nguyễn Family')} · {t('Celebration')}</p>
          <p className="mt-1 font-medium">{t('Help Bà Lan welcome the family home for Tết')}</p>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[72%] rounded-full bg-foreground" /></div>
          <p className="tabular text-sm"><b>$180</b> <span className="text-muted-foreground">{t('pledged of {goal}', { goal: '$250' })} · {t('{n} supporters', { n: 6 })}</span></p>
        </div>
        <ol className="space-y-2.5 border-t pt-4">
          {donors.map(([n, a], i) => (
            <li key={n} className="flex items-center gap-3 text-sm">
              <span className={cn('tabular flex size-5 items-center justify-center rounded-full text-[10px] font-semibold', ['bg-amber-400 text-amber-950', 'bg-zinc-300 text-zinc-800', 'bg-orange-300 text-orange-950'][i] ?? 'bg-muted')}>{i + 1}</span>
              <span className="flex-1 truncate">{n}</span><span className="tabular font-medium">{a}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Pillar({ eyebrow, title, body, points, visual, flip, icon }: {
  eyebrow: string; title: string; body: string; points: string[]; visual: ReactNode; flip?: boolean; icon: ReactNode;
}) {
  return (
    <div className="grid items-center gap-6 sm:gap-10 lg:grid-cols-2 lg:gap-16">
      <SectionBlock className={cn(flip && 'lg:order-2')}>
        <span className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-muted [&_svg]:size-5">{icon}</span>
        <Eyebrow>{t(eyebrow)}</Eyebrow>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">{t(title)}</h3>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{t(body)}</p>
        <ul className="mt-6 space-y-3">
          {points.map(p => <li key={p} className="flex gap-3 text-[15px]"><Check className="mt-0.5 size-4 shrink-0 text-brand" />{t(p)}</li>)}
        </ul>
      </SectionBlock>
      <SectionBlock className={cn(flip && 'lg:order-1')}>{visual}</SectionBlock>
    </div>
  );
}

// ---------- Live numbers from public families ----------

function LiveStats() {
  const [families] = useTable(tables.publicFamily);
  const [pledges] = useTable(tables.publicContribution);
  const [ref, shown] = useReveal<HTMLDivElement>(0.4);
  const usd = pledges.filter(p => p.currency === 'USD');
  const pledged = useCountUp(Number(sum(usd, p => p.amount)) / 100, shown);
  const supporters = useCountUp(new Set(pledges.map(p => p.name.trim().toLowerCase())).size, shown);
  const stats = [
    { value: formatMoney(BigInt(Math.round(pledged * 100)), 'USD').replace(/\.\d+$/, ''), label: 'pledged to public families' },
    { value: Math.round(supporters).toString(), label: 'community supporters' },
    { value: '45', label: 'currencies, from VND to NGN' },
    { value: '40+', label: 'banks and mobile wallets' },
  ];
  return (
    <div ref={ref} className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border lg:grid-cols-4">
      {stats.map(s => (
        <div key={s.label} className="bg-card p-4 sm:p-8">
          <p className="tabular text-xl font-semibold tracking-tight sm:text-2xl sm:text-4xl">{s.value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t(s.label)}</p>
        </div>
      ))}
      <p className="sr-only">{t('{n} families have public pages.', { n: families.length })}</p>
    </div>
  );
}

const STEPS = [
  { icon: ReceiptText, title: 'Ask', body: 'Family back home shares what they need, how much, and by when.' },
  { icon: Check, title: 'Approve', body: 'Senders approve all or part of it, with a note.' },
  { icon: Send, title: 'Send', body: 'Deposit straight into a bank or mobile wallet, or record any transfer.' },
  { icon: Wallet, title: 'Confirm', body: 'The recipient confirms what arrived. Differences are just explained.' },
  { icon: Heart, title: 'Share', body: 'A photo shows how it helped, for family or the community.' },
];

const GALLERY = [
  ['banhchung', 'Bánh chưng for Tết'], ['school', 'School supplies'], ['rice', 'A month of rice'], ['flowers', 'Flowers before Tết'],
  ['pills', 'Medicine'], ['scootertrip', 'Back on the road'], ['market', 'Market day'], ['books', 'New textbooks'], ['asianmarket', 'Morning market'], ['laptop', 'A laptop for class'],
];

const TRUST = [
  { icon: Lock, title: 'Private by default', body: 'Requests, budgets, transfers and conversations are visible only to your family group.' },
  { icon: Users, title: 'Roles that fit real families', body: 'Senders and recipients each see the step that is theirs. The owner manages who is in.' },
  { icon: ShieldCheck, title: 'Honest by design', body: 'History can’t be edited away. In this demo no money moves, and only the last four digits of an account are stored.' },
];

export default function Landing() {
  const { profile, families } = useApp();
  const signedIn = !!profile && families.length > 0;
  const primary = signedIn ? { to: '/', label: t('Open my family') } : { to: '/signup', label: t('Get started') };

  return (
    <div className="landing-page min-h-dvh">
      <PublicHeader />

      {/* Hero */}
      <section className="relative isolate overflow-clip">
        <div className="relative mx-auto grid max-w-6xl items-center gap-6 px-4 pt-5 pb-8 sm:gap-12 sm:px-6 sm:pt-12 sm:pb-20 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-28">
          <div>
            <SectionBlock><p className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">{t('Built for families across borders')}</p></SectionBlock>
            <SectionBlock>
              <h1 className="mt-4 text-[clamp(2rem,8.5vw,2.75rem)] leading-[1.08] sm:mt-6 font-semibold tracking-tight text-balance sm:text-6xl">
                {t('Family support,')} <span>{t('across any distance.')}</span>
              </h1>
            </SectionBlock>
            <SectionBlock>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed sm:mt-6 sm:text-lg text-pretty text-muted-foreground">
                {t('BridgeHome brings the whole family into one place to plan the household budget, send money home, and rally the community when it matters. No more lost messages, guessing, or awkward follow-ups.')}
              </p>
            </SectionBlock>
            <SectionBlock className="mt-5 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
              <Link to={primary.to} className={cn(buttonVariants({ size: 'lg' }), 'h-auto min-h-12 rounded-lg px-3 py-3 text-sm whitespace-normal sm:px-6 sm:text-base')}>{primary.label}<ArrowRight /></Link>
              <Link to={signedIn ? '/give' : '/welcome?demo=1'} className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'h-auto min-h-12 rounded-lg border-foreground/20 bg-transparent px-3 py-3 text-sm whitespace-normal sm:px-6 sm:text-base')}>
                {signedIn ? t('Give to a family') : t('Try a demo family')}
              </Link>
            </SectionBlock>
            <SectionBlock>
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:mt-8 sm:gap-x-5 sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Lock className="size-4" />{t('Private by default')}</span>
                <span className="flex items-center gap-1.5"><Eye className="size-4" />{t('Every change visible to family')}</span>
                <span className="flex items-center gap-1.5"><Globe className="size-4" />{t('Web, iOS and Android')}</span>
              </p>
            </SectionBlock>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Problem */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-8 text-center sm:px-6 sm:py-20 md:px-8 md:py-28">
          <SectionBlock><Eyebrow>{t('Why BridgeHome')}</Eyebrow></SectionBlock>
          <SectionBlock>
            <p className="mt-4 text-2xl leading-snug font-medium tracking-tight text-balance sm:text-4xl">
              {t('Millions of families support each other across borders, yet the money, the plans and the gratitude are scattered across group chats, receipts and memory.')}
            </p>
          </SectionBlock>
          <SectionBlock>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{t('BridgeHome gives every family one honest, shared record, so support feels less like a transaction and more like what it is: love from far away.')}</p>
          </SectionBlock>
        </div>
      </section>

      {/* Pillars */}
      <section id="features" className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:space-y-28 sm:px-6 sm:py-24 md:px-8 md:py-32">
        <Pillar icon={<Wallet />} eyebrow="Budget together" title="See the whole household, month by month."
          body="Everyone adds income and spending as it happens. Set a plan per category and see at a glance what's on track, what's over, and what's left."
          points={['Plans per category with gentle over-budget warnings', 'Six-month trends for income, spending and support sent', 'Every currency kept separate, down to the đồng']}
          visual={<BudgetVisual />} />
        <Pillar flip icon={<Landmark />} eyebrow="Send remittances" title="Straight into their bank or mobile wallet."
          body="Link your bank once. Your relatives add their Vietcombank, GCash, MoMo or M-Pesa. Every request turns into a one-tap transfer with the fee and rate up front."
          points={['Clear quotes: what you pay, the rate, what they receive', 'Live tracking from sent to deposited', 'Edits keep the original values, so nothing quietly changes']}
          visual={<SendVisual />} />
        <Pillar icon={<HandHeart />} eyebrow="Fundraise for the community" title="Let friends and neighbors lift each other up."
          body="When a roof leaks or Tết comes around, families can share a need publicly. Supporters pledge toward it and see photos of exactly how their help was used."
          points={['Public pages share only what a family chooses', 'Pledge toward a family goal or a specific need', 'Top supporters celebrated on every page']}
          visual={<FundraiseVisual />} />
      </section>

      {/* Live numbers */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-24 md:px-8">
        <SectionBlock><LiveStats /></SectionBlock>
      </section>

      {/* How it works */}
      <section id="how" className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-24 md:px-8 md:py-28">
          <SectionBlock className="max-w-2xl">
            <Eyebrow>{t('How it works')}</Eyebrow>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">{t("Five steps, and everyone always knows what's next.")}</h2>
          </SectionBlock>
          <ol className="relative mt-8 grid gap-6 sm:mt-14 sm:gap-8 md:grid-cols-5 md:gap-6">
            <div aria-hidden className="absolute top-5 right-[10%] left-[10%] hidden h-px bg-border md:block" />
            {STEPS.map((s, i) => (
              <SectionBlock as="li" key={s.title} className="relative flex gap-4 md:flex-col md:gap-0">
                <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border bg-card shadow-sm"><s.icon className="size-4" /></span>
                <div className="md:mt-5">
                  <p className="text-xs text-muted-foreground tabular">{t('Step {n}', { n: i + 1 })}</p>
                  <p className="mt-0.5 font-medium">{t(s.title)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(s.body)}</p>
                </div>
              </SectionBlock>
            ))}
          </ol>
        </div>
      </section>

      {/* Moments gallery */}
      <section className="overflow-clip py-8 sm:py-24 md:py-28">
        <SectionBlock className="mx-auto max-w-6xl px-5 md:px-8">
          <Eyebrow>{t('Bring people together')}</Eyebrow>
          <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-4xl">{t('Support you can see, moments you can share.')}</h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t('A sack of rice, a semester of textbooks, bánh chưng for the ancestors. Photos turn transfers into stories the whole family is part of.')}</p>
        </SectionBlock>
        <div className="mx-auto mt-6 max-w-6xl sm:mt-12 px-5 md:px-8">
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4 sm:pb-4" tabIndex={0} role="region" aria-label={t('Bring people together')}>
            {GALLERY.map(([file, label]) => (
              <figure key={file} className="relative w-44 shrink-0 snap-start sm:w-64 overflow-hidden rounded-2xl">
                <img src={`/demo/${file}.jpg`} alt={t(label)} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-sm font-medium text-white">{t(label)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 sm:pb-24 md:px-8">
        <div className="grid min-w-0 grid-cols-1 divide-y border-y md:grid-cols-3 md:divide-x md:divide-y-0">
          {TRUST.map(c => (
            <SectionBlock key={c.title} className="px-4 py-5 sm:px-6 sm:py-8">
              <c.icon className="size-5" />
              <p className="mt-4 font-medium">{t(c.title)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(c.body)}</p>
            </SectionBlock>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-8 sm:px-6 sm:pb-24 md:px-8">
        <SectionBlock className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl bg-[#102a43] px-5 py-8 text-center text-[#f3f7fb] sm:px-12 sm:py-20">
          <h2 className="relative text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{t('Bring your family closer, wherever they are.')}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/65">{t('Start your family in a minute, or explore a Vietnamese or Filipino demo family with real requests, budgets and photos.')}</p>
          <div className="relative mt-6 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <Link to={primary.to} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg py-3 bg-white px-6 font-medium text-[#102a43] transition hover:bg-white/90">{primary.label}<ArrowRight className="size-4" /></Link>
            <Link to="/give" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg py-3 border border-white/20 px-6 font-medium transition hover:bg-white/10"><HandHeart className="size-4" />{t('Support a family')}</Link>
          </div>
        </SectionBlock>
      </section>

      <footer className="pb-safe border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row md:px-8">
          <Wordmark className="text-foreground" />
          <nav className="flex gap-5"><Link to="/how" className="hover:text-foreground">{t('How it works')}</Link><Link to="/give" className="hover:text-foreground">{t('Give')}</Link><Link to="/explore" className="hover:text-foreground">{t('Explore')}</Link></nav>
          <p className="text-xs">{t('Demo payments only. Photos: Wikimedia Commons (CC0 / public domain).')}</p>
        </div>
      </footer>
    </div>
  );
}
