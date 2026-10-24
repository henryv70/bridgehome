import { useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, CheckCircle2, Globe, ImagePlus, KeyRound, Landmark, Plus, Sparkles, Wallet } from 'lucide-react';
import { useApp } from '@/lib/data';
import { lang, t, tn } from '@/lib/i18n';
import { formatMoney, sum } from '@/lib/money';
import { auditAction, auditActor, taskFor } from '@/lib/status';
import { ago, byNewest, thisMonth } from '@/lib/time';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Drawer, Initials, PageHeader, Panel, Photo, Section, Stat } from '@/components/app/kit';
import { CredentialForm } from '@/components/app/sign-in';
import { SupportIllustration } from '@/components/app/support-illustration';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? t('Good morning') : h < 18 ? t('Good afternoon') : t('Good evening');
}

export default function Home() {
  const app = useApp();
  const { group, profile, requests, transfers, receipts, posts, audit, role } = app;
  const tasks = requests.map(r => taskFor(app, r)).filter(x => !!x).sort((a, b) => Number(b.urgent) - Number(a.urgent));
  const month = thisMonth();
  const monthTransfers = transfers.filter(x => x.createdAt.toDate().toISOString().startsWith(month));
  const currencies = [...new Set(monthTransfers.map(x => x.currency))];
  const mainCurrency = currencies[0] ?? requests[0]?.currency ?? 'USD';
  const open = requests.filter(r => !['completed', 'rejected', 'draft'].includes(r.status));
  const onTheWay = requests.filter(r => r.status === 'sent').length;
  const recentPosts = [...posts].sort(byNewest).slice(0, 4);
  const [signIn, setSignIn] = useState(false);
  // English reads "Henry money sent", so lowercase the action there only.
  const actionText = (action: string) => (lang() === 'en' ? auditAction(action).toLowerCase() : auditAction(action));

  return (
    <div className="space-y-6">
      <PageHeader title={t('{greeting}, {name}', { greeting: greeting(), name: profile?.name.split(' ')[0] ?? '' })} subtitle={group?.name} />

      <section className="support-summary flex flex-col items-center rounded-3xl px-4 py-5 text-center md:flex-row-reverse md:justify-between md:px-8 md:text-left">
        <SupportIllustration className="w-44 shrink-0 md:w-52" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{role === 'recipient' ? t('Received this month') : t('Sent this month')}</p>
          <p className="tabular mt-1 text-4xl font-bold tracking-tight md:text-5xl">{formatMoney(sum(monthTransfers.filter(x => x.currency === mainCurrency), x => x.amount), mainCurrency)}</p>
          <p className="mt-2 text-xs text-muted-foreground">{tn('{n} transfer', '{n} transfers', monthTransfers.filter(x => x.currency === mainCurrency).length)}</p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link to={role === 'recipient' ? '/requests?new=1' : '/requests'} className="action-tile">{role === 'recipient' ? <Plus /> : <ArrowRight />}{role === 'recipient' ? t('Ask for support') : t('Requests')}</Link>
        <Link to="/feed?new=1" className="action-tile"><ImagePlus />{t('Share a moment')}</Link>
        <Link to="/budget" className="action-tile"><Wallet />{t('Household budget')}</Link>
        <Link to="/accounts" className="action-tile"><Landmark />{t('Bank accounts')}</Link>
      </div>

      {group?.isDemo && (
        <details className="rounded-2xl bg-card/70 p-4 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-medium text-primary"><Sparkles className="size-4" />{t('This is a demo family.')}</summary>
          <div className="mt-3">
          <p className="text-muted-foreground"><b className="font-medium text-foreground">{t('This is a demo family.')}</b> {t('The other members are sample people, so you can try every sender step here, including sending with BridgeHome Pay. To try the recipient side, open BridgeHome on another device (or in the Expo app), then invite it under')} <Link to="/family" className="underline">{t('Family')}</Link>.</p>
          </div>
        </details>
      )}

      {!app.myAccounts.some(a => a.purpose === (role === 'sender' ? 'send' : 'receive')) && (
        <Link to="/accounts" className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition hover:border-foreground/20">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted"><Landmark className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{role === 'sender' ? t('Link your bank to send in one tap') : t('Add where money should arrive')}</p>
            <p className="text-sm text-muted-foreground">{role === 'sender' ? t('Deposit directly into family bank accounts and mobile wallets.') : t('Your bank or mobile wallet, so family can deposit directly.')}</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      {!app.username && (
        <button type="button" onClick={() => setSignIn(true)} className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition hover:border-foreground/20">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted"><KeyRound className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t('Save a username and password')}</p>
            <p className="text-sm text-muted-foreground">{t('So you can log back in to your family on any phone or computer.')}</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </button>
      )}
      <Drawer open={signIn} onOpenChange={setSignIn} title={t('Set up sign-in')} description={t('Use this username and password to log back in on any device.')}>
        <CredentialForm submitLabel={t('Save sign-in')} onDone={() => setSignIn(false)} />
      </Drawer>

      <Section title={tasks.length ? t('Needs your attention · {n}', { n: tasks.length }) : undefined}>
        {tasks.length ? (
          <div className="divide-y overflow-hidden rounded-2xl border bg-card">
            {tasks.map(task => (
              <Link key={String(task.request.id)} to={`/requests/${task.request.id}`} className="flex items-center gap-3 p-4 transition hover:bg-muted/50">
                <span className={cn('size-2 shrink-0 rounded-full', task.urgent ? 'bg-critical' : 'bg-brand')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
                  <p className="tabular text-xs text-muted-foreground">{formatMoney(task.request.amount, task.request.currency)} · {app.nameOf(task.request.author)}{task.urgent ? ` · ${t('urgent')}` : ''}</p>
                </div>
                <span className={buttonVariants({ size: 'sm', variant: 'secondary' })}>{task.cta}</span>
              </Link>
            ))}
          </div>
        ) : (
          <Panel className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-good" />
            <div>
              <p className="font-medium">{t("You're all caught up")}</p>
              <p className="text-sm text-muted-foreground">{role === 'recipient' ? t('Need something? Ask your family and they will see it right away.') : t("When family asks for support, it'll show up here first.")}</p>
            </div>
          </Panel>
        )}
      </Section>

      <div className="home-stats grid gap-3 sm:grid-cols-3">
        <Stat label={t('Open requests')} value={open.length} sub={t('{amount} total', { amount: formatMoney(sum(open.filter(r => r.currency === mainCurrency), r => r.amount), mainCurrency, { compact: true }) })} />
        <Stat label={t('On the way')} value={onTheWay} sub={t('Waiting for confirmation')} />
        <Stat label={t('Confirmed received')} value={receipts.length} sub={t('All time')} />
      </div>

      {group?.isPublic && <Link to={`/p/${group.slug}`} className={buttonVariants({ variant: 'outline', size: 'lg' })}><Globe />{t('Public page')}</Link>}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <Section title={t('Recent activity')} action={<Link to="/family?tab=history" className="text-xs text-muted-foreground hover:text-foreground">{t('History')}</Link>}>
          <ol className="activity-list surface-card rounded-2xl bg-card px-4">
            {[...audit].sort(byNewest).slice(0, 7).map(a => (
              <li key={String(a.id)} className="flex gap-3">
                <Initials name={auditActor(app, a)} className="size-7 text-[10px]" />
                <div className="min-w-0 text-sm">
                  <p><span className="font-medium">{auditActor(app, a)}</span> <span className="text-muted-foreground">{actionText(a.action)}</span></p>
                  <p className="text-xs text-muted-foreground">{ago(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title={t('Moments')} action={<Link to="/feed" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">{t('All')}<ArrowRight className="size-3" /></Link>}>
          {recentPosts.length ? (
            <div className="grid grid-cols-2 gap-2">
              {recentPosts.map(p => <Link key={String(p.id)} to="/feed"><Photo bytes={p.photo} type={p.photoType} url={p.photoUrl} alt={p.caption} className="aspect-square w-full rounded-xl" /></Link>)}
            </div>
          ) : (
            <Link to="/feed?new=1" className="flex aspect-[2/1] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-sm text-muted-foreground hover:text-foreground">
              <ImagePlus className="size-5" />{t('Share how support helped')}
            </Link>
          )}
        </Section>
      </div>
    </div>
  );
}
