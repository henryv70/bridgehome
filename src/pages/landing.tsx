import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTable } from 'spacetimedb/react';
import {
  ArrowRight, Check, Eye, Globe, HandHeart, Heart, Landmark, Lock, ReceiptText, Send, ShieldCheck, Sparkles, Users, Wallet,
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
import { LanguageSelect } from '@/components/app/language';
import { BankMark } from '@/components/app/bank-mark';

// Fades and lifts its children into place the first time they scroll into view.
function Reveal({ children, delay = 0, className, as: Tag = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'li' | 'section' }) {
  const [ref, shown] = useReveal<HTMLDivElement>(0.15);
  return (
    <Tag ref={ref as never} data-shown={shown || undefined} className={cn('reveal', className)} style={{ '--delay': `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-sm font-medium text-brand">{children}</p>;
}

// ---------- Hero visuals: a composition of real UI pieces, gently floating ----------

function HeroVisual() {
  // Flip to shown after the first paint so the cards animate in on load.
  const [ready, setReady] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(id); }, []);
  const shown = ready || undefined;
  return (
    <div className="relative mx-auto h-[440px] w-full max-w-[460px] sm:h-[500px]">
      <div aria-hidden className="absolute inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand/15 via-transparent to-chart-2/15 blur-2xl" />

      {/* Photo card */}
      <div className="reveal absolute top-0 left-0 w-[54%] animate-float-slow" data-shown={shown} style={{ '--delay': '150ms' } as CSSProperties}>
        <div className="overflow-hidden rounded-3xl border bg-card shadow-xl shadow-black/5">
          <img src="/demo/banhchung.jpg" alt={t('Bánh chưng for Tết')} className="aspect-square w-full object-cover" />
          <div className="space-y-1.5 p-3">
            <p className="text-xs"><b>Bà Ngoại Lan</b> {t('Bánh chưng for the Tết table')} 🧧</p>
            <div className="h-1 overflow-hidden rounded-full bg-muted"><div className="h-full w-[72%] rounded-full bg-foreground" /></div>
            <p className="tabular text-[11px] text-muted-foreground">{t('{pledged} pledged of {goal}', { pledged: '$180', goal: '$250' })} · {t('{n} supporters', { n: 6 })}</p>
          </div>
        </div>
      </div>

      {/* Deposit card */}
      <div className="reveal absolute top-[18%] right-0 w-[56%] animate-float" data-shown={shown} style={{ '--delay': '350ms', animationDelay: '-2s' } as CSSProperties}>
        <div className="space-y-3 rounded-3xl border bg-card p-4 shadow-xl shadow-black/5">
          <div className="flex items-center gap-2">
            <BankMark name="MoMo" className="size-8" />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{t('Deposited to {account}', { account: 'MoMo ••9124' })}</p>
              <p className="text-[11px] text-muted-foreground">Minh · {t('just now')}</p>
            </div>
          </div>
          <p className="tabular text-2xl font-semibold tracking-tight">₫3,157,200</p>
          <div className="flex gap-1.5">
            {['Sent', 'Processing', 'Deposited'].map((s, i) => (
              <div key={s} className="flex-1 space-y-1">
                <div className={cn('h-1 rounded-full', i < 2 ? 'bg-foreground' : 'bg-good')} />
                <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Check className="size-2.5" />{t(s)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Request card */}
      <div className="reveal absolute bottom-0 left-[2%] w-[58%] animate-float" data-shown={shown} style={{ '--delay': '550ms', animationDelay: '-4s' } as CSSProperties}>
        <div className="rounded-3xl border bg-card p-4 shadow-xl shadow-black/5">
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
      <div className="reveal absolute right-0 bottom-[3%] w-[38%] animate-float-slow sm:bottom-[16%]" data-shown={shown} style={{ '--delay': '750ms', animationDelay: '-1s' } as CSSProperties}>
        <div className="rounded-3xl border bg-card p-3.5 shadow-xl shadow-black/5">
          <p className="text-[11px] text-muted-foreground">{t('{month} budget', { month: monthName('2026-10', 'short') })}</p>
          <div className="mt-2 flex h-16 items-end gap-1.5">
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
  const [ref, shown] = useReveal<HTMLDivElement>(0.3);
  const rows = [['Groceries', 84, 92], ['Health', 112, 78], ['Utilities', 70, 95], ['Transport', 64, 80], ['Education', 30, 60]] as const;
  const months = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
  return (
    <div ref={ref} data-shown={shown || undefined} className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <p className="font-medium">{t('Spending vs. plan')}</p>
        <p className="text-xs text-muted-foreground">{monthName('2026-10', 'short')} · VND</p>
      </div>
      <div className="space-y-4">
        {rows.map(([name, actual, plan], i) => (
          <div key={name}>
            <div className="mb-1.5 flex justify-between text-sm"><span>{t(name)}</span><span className={cn('tabular text-xs', actual > 100 ? 'text-critical' : 'text-muted-foreground')}>{actual > 100 ? t('Over plan') : t('{n}% of plan', { n: actual })}</span></div>
            <div className="relative h-2 rounded-full bg-muted">
              <div className={cn('grow-x absolute inset-y-0 left-0 rounded-full', actual > 100 ? 'bg-critical' : 'bg-chart-1')} style={{ width: `${Math.min(actual * plan / 100, 100)}%`, '--delay': `${i * 120}ms` } as CSSProperties} />
              <span className="absolute -inset-y-1 w-0.5 rounded bg-foreground" style={{ left: `${plan}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-6 items-end gap-2 border-t pt-5">
        {[38, 52, 46, 61, 58, 70].map((h, i) => (
          <div key={i} className="flex h-24 flex-col items-center justify-end gap-1">
            <div className="flex h-full w-full items-end justify-center gap-0.5">
              <span className="grow-y w-2.5 rounded-t-[4px] bg-chart-1" style={{ height: `${h + 20}%`, '--delay': `${300 + i * 80}ms` } as CSSProperties} />
              <span className="grow-y w-2.5 rounded-t-[4px] bg-chart-2" style={{ height: `${h}%`, '--delay': `${340 + i * 80}ms` } as CSSProperties} />
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
    <div className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <BankMark name="Chase" className="size-10" />
        <div className="flex-1"><p className="text-sm font-medium">Chase ••4821</p><p className="text-xs text-muted-foreground">San Jose · USD</p></div>
      </div>
      <div className="relative mx-5 h-8">
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed" />
        <span className="animate-travel absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-brand" />
        <span className="animate-travel absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-brand" style={{ animationDelay: '1.4s' }} />
      </div>
      <div className="flex items-center gap-3">
        <BankMark name="Vietcombank" className="animate-pulse-ring size-10" />
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
  const [ref, shown] = useReveal<HTMLDivElement>(0.3);
  const donors = [['Henry Vu', '$125'], ['Viet Student Association', '$100'], ['Daniel Nguyen', '$100'], ['Linh Tran', '$55']];
  return (
    <div ref={ref} data-shown={shown || undefined} className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <img src="/demo/flowers.jpg" alt={t('A flower seller on a bicycle in Hanoi before Tết')} className="aspect-[16/8] w-full object-cover" loading="lazy" />
      <div className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="text-xs text-muted-foreground">{t('The Nguyễn Family')} · {t('Celebration')}</p>
          <p className="mt-1 font-medium">{t('Help Bà Lan welcome the family home for Tết')}</p>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="grow-x h-full w-[72%] rounded-full bg-foreground" /></div>
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
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <Reveal className={cn(flip && 'lg:order-2')}>
        <span className="mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-muted [&_svg]:size-5">{icon}</span>
        <Eyebrow>{t(eyebrow)}</Eyebrow>
        <h3 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t(title)}</h3>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{t(body)}</p>
        <ul className="mt-6 space-y-3">
          {points.map(p => <li key={p} className="flex gap-3 text-[15px]"><Check className="mt-0.5 size-4 shrink-0 text-brand" />{t(p)}</li>)}
        </ul>
      </Reveal>
      <Reveal delay={150} className={cn(flip && 'lg:order-1')}>{visual}</Reveal>
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
    <div ref={ref} className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border bg-border lg:grid-cols-4">
      {stats.map(s => (
        <div key={s.label} className="bg-card p-6 sm:p-8">
          <p className="tabular text-3xl font-semibold tracking-tight sm:text-4xl">{s.value}</p>
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
    <div className="min-h-dvh overflow-x-hidden">
      {/* Nav */}
      <header className="pt-safe sticky top-0 z-40 border-b border-transparent bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
          <Link to={signedIn ? '/about' : '/'}><Wordmark /></Link>
          <nav className="flex items-center gap-1 text-sm">
            <a href="#how" className="hidden rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground md:block">{t('How it works')}</a>
            <Link to="/give" className="hidden rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground sm:block">{t('Give')}</Link>
            <Link to="/explore" className="hidden rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground sm:block">{t('Explore')}</Link>
            <LanguageSelect />
            {!signedIn && <Link to="/login" className="rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground">{t('Log in')}</Link>}
            <Link to={primary.to} className={cn(buttonVariants({ size: 'lg' }), 'ml-2 rounded-full px-4')}>{primary.label}</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 animate-drift rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_18%,transparent),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-12 pb-20 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-28">
          <div>
            <Reveal><span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"><Sparkles className="size-3.5 text-brand" />{t('Built for families across borders')}</span></Reveal>
            <Reveal delay={100}>
              <h1 className="mt-6 text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl">
                {t('Family support,')} <span className="text-muted-foreground">{t('across any distance.')}</span>
              </h1>
            </Reveal>
            <Reveal delay={200}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
                {t('BridgeHome brings the whole family into one place to plan the household budget, send money home, and rally the community when it matters. No more lost messages, guessing, or awkward follow-ups.')}
              </p>
            </Reveal>
            <Reveal delay={300} className="mt-8 flex flex-wrap gap-3">
              <Link to={primary.to} className={cn(buttonVariants({ size: 'lg' }), 'h-12 rounded-full px-6 text-base')}>{primary.label}<ArrowRight /></Link>
              <Link to={signedIn ? '/give' : '/welcome?demo=1'} className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'h-12 rounded-full border-foreground/20 bg-transparent px-6 text-base')}>
                {signedIn ? t('Give to a family') : t('Try a demo family')}
              </Link>
            </Reveal>
            <Reveal delay={400}>
              <p className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Lock className="size-4" />{t('Private by default')}</span>
                <span className="flex items-center gap-1.5"><Eye className="size-4" />{t('Every change visible to family')}</span>
                <span className="flex items-center gap-1.5"><Globe className="size-4" />{t('Web, iOS and Android')}</span>
              </p>
            </Reveal>
          </div>
          <HeroVisual />
        </div>
      </section>

      {/* Problem */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center md:px-8 md:py-28">
          <Reveal><Eyebrow>{t('Why BridgeHome')}</Eyebrow></Reveal>
          <Reveal delay={100}>
            <p className="mt-4 text-2xl leading-snug font-medium tracking-tight text-balance sm:text-4xl">
              {t('Millions of families support each other across borders, yet the money, the plans and the gratitude are scattered across group chats, receipts and memory.')}
            </p>
          </Reveal>
          <Reveal delay={200}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{t('BridgeHome gives every family one honest, shared record, so support feels less like a transaction and more like what it is: love from far away.')}</p>
          </Reveal>
        </div>
      </section>

      {/* Pillars */}
      <section id="features" className="mx-auto max-w-6xl space-y-28 px-5 py-24 md:px-8 md:py-32">
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
      <section className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
        <Reveal><LiveStats /></Reveal>
      </section>

      {/* How it works */}
      <section id="how" className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-28">
          <Reveal className="max-w-2xl">
            <Eyebrow>{t('How it works')}</Eyebrow>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{t("Five steps, and everyone always knows what's next.")}</h2>
          </Reveal>
          <ol className="relative mt-14 grid gap-8 md:grid-cols-5 md:gap-6">
            <div aria-hidden className="absolute top-5 right-[10%] left-[10%] hidden h-px bg-border md:block" />
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 120} className="relative flex gap-4 md:flex-col md:gap-0">
                <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border bg-card shadow-sm"><s.icon className="size-4" /></span>
                <div className="md:mt-5">
                  <p className="text-xs text-muted-foreground tabular">{t('Step {n}', { n: i + 1 })}</p>
                  <p className="mt-0.5 font-medium">{t(s.title)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(s.body)}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Moments gallery */}
      <section className="py-24 md:py-28">
        <Reveal className="mx-auto max-w-6xl px-5 md:px-8">
          <Eyebrow>{t('Bring people together')}</Eyebrow>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">{t('Support you can see, moments you can share.')}</h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{t('A sack of rice, a semester of textbooks, bánh chưng for the ancestors. Photos turn transfers into stories the whole family is part of.')}</p>
        </Reveal>
        <div className="group relative mt-12 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max animate-marquee gap-4 group-hover:[animation-play-state:paused]">
            {[...GALLERY, ...GALLERY].map(([file, label], i) => (
              <figure key={i} className="relative w-56 shrink-0 overflow-hidden rounded-3xl sm:w-64" aria-hidden={i >= GALLERY.length || undefined}>
                <img src={`/demo/${file}.jpg`} alt={i < GALLERY.length ? t(label) : ''} loading="lazy" className="aspect-[4/5] w-full object-cover" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-sm font-medium text-white">{t(label)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {TRUST.map((c, i) => (
            <Reveal key={c.title} delay={i * 120} className="rounded-3xl border bg-card p-6">
              <c.icon className="size-5" />
              <p className="mt-4 font-medium">{t(c.title)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(c.body)}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 pb-24 md:px-8">
        <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#141413] px-6 py-16 text-center text-[#fcfcfb] sm:px-12 sm:py-20">
          <div aria-hidden className="absolute -top-32 left-1/2 h-80 w-[720px] -translate-x-1/2 animate-drift rounded-full bg-[radial-gradient(closest-side,rgba(57,135,229,0.35),transparent)]" />
          <h2 className="relative text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{t('Bring your family closer, wherever they are.')}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-white/65">{t('Start your family in a minute, or explore a Vietnamese or Filipino demo family with real requests, budgets and photos.')}</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link to={primary.to} className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-medium text-[#141413] transition hover:bg-white/90">{primary.label}<ArrowRight className="size-4" /></Link>
            <Link to="/give" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 font-medium transition hover:bg-white/10"><HandHeart className="size-4" />{t('Support a family')}</Link>
          </div>
        </Reveal>
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
