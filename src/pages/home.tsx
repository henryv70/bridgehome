import { Link } from 'react-router';
import { ArrowRight, CheckCircle2, Globe, ImagePlus, Landmark, Plus, Sparkles, Wallet } from 'lucide-react';
import { useApp } from '@/lib/data';
import { formatMoney, sum } from '@/lib/money';
import { auditActor, taskFor } from '@/lib/status';
import { ago, byNewest, thisMonth } from '@/lib/time';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Initials, PageHeader, Panel, Photo, Section, Stat } from '@/components/app/kit';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const app = useApp();
  const { group, profile, requests, transfers, receipts, posts, audit, role } = app;
  const tasks = requests.map(r => taskFor(app, r)).filter(t => !!t).sort((a, b) => Number(b.urgent) - Number(a.urgent));
  const month = thisMonth();
  const monthTransfers = transfers.filter(t => t.createdAt.toDate().toISOString().startsWith(month));
  const currencies = [...new Set(monthTransfers.map(t => t.currency))];
  const mainCurrency = currencies[0] ?? requests[0]?.currency ?? 'USD';
  const open = requests.filter(r => !['completed', 'rejected', 'draft'].includes(r.status));
  const onTheWay = requests.filter(r => r.status === 'sent').length;
  const recentPosts = [...posts].sort(byNewest).slice(0, 4);

  return (
    <div className="space-y-8">
      <PageHeader title={`${greeting()}, ${profile?.name.split(' ')[0]}`} subtitle={group?.name} />

      {group?.isDemo && (
        <div className="flex gap-3 rounded-2xl border border-dashed p-4 text-sm">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />
          <p className="text-muted-foreground"><b className="font-medium text-foreground">This is a demo family.</b> The other members are sample people, so you can try every sender step here, including sending with BridgeHome Pay. To try the recipient side, open BridgeHome on another device (or in the Expo app), then invite it under <Link to="/family" className="underline">Family</Link>.</p>
        </div>
      )}

      {!app.myAccounts.some(a => a.purpose === (role === 'sender' ? 'send' : 'receive')) && (
        <Link to="/accounts" className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition hover:border-foreground/20">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted"><Landmark className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{role === 'sender' ? 'Link your bank to send in one tap' : 'Add where money should arrive'}</p>
            <p className="text-sm text-muted-foreground">{role === 'sender' ? 'Deposit directly into family bank accounts and mobile wallets.' : 'Your bank or mobile wallet, so family can deposit directly.'}</p>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      )}

      <Section title={tasks.length ? `Needs your attention · ${tasks.length}` : undefined}>
        {tasks.length ? (
          <div className="divide-y overflow-hidden rounded-2xl border bg-card">
            {tasks.map(t => (
              <Link key={String(t.request.id)} to={`/requests/${t.request.id}`} className="flex items-center gap-3 p-4 transition hover:bg-muted/50">
                <span className={cn('size-2 shrink-0 rounded-full', t.urgent ? 'bg-critical' : 'bg-brand')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">{t.title}</p>
                  <p className="tabular text-xs text-muted-foreground">{formatMoney(t.request.amount, t.request.currency)} · {app.nameOf(t.request.author)}{t.urgent ? ' · urgent' : ''}</p>
                </div>
                <span className={buttonVariants({ size: 'sm', variant: 'secondary' })}>{t.cta}</span>
              </Link>
            ))}
          </div>
        ) : (
          <Panel className="flex items-center gap-3">
            <CheckCircle2 className="size-5 text-good" />
            <div>
              <p className="font-medium">You're all caught up</p>
              <p className="text-sm text-muted-foreground">{role === 'recipient' ? 'Need something? Ask your family and they will see it right away.' : "When family asks for support, it'll show up here first."}</p>
            </div>
          </Panel>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Sent this month`} value={formatMoney(sum(monthTransfers.filter(t => t.currency === mainCurrency), t => t.amount), mainCurrency)} sub={`${monthTransfers.length} transfer${monthTransfers.length === 1 ? '' : 's'}`} />
        <Stat label="Open requests" value={open.length} sub={`${formatMoney(sum(open.filter(r => r.currency === mainCurrency), r => r.amount), mainCurrency, { compact: true })} total`} />
        <Stat label="On the way" value={onTheWay} sub="Waiting for confirmation" />
        <Stat label="Confirmed received" value={receipts.length} sub="All time" />
      </div>

      <div className="flex flex-wrap gap-2">
        {role === 'recipient' && <Link to="/requests?new=1" className={buttonVariants({ size: 'lg' })}><Plus />Ask for support</Link>}
        <Link to="/feed?new=1" className={buttonVariants({ variant: 'outline', size: 'lg' })}><ImagePlus />Share a moment</Link>
        <Link to="/budget" className={buttonVariants({ variant: 'outline', size: 'lg' })}><Wallet />Household budget</Link>
        {group?.isPublic && <Link to={`/p/${group.slug}`} className={buttonVariants({ variant: 'outline', size: 'lg' })}><Globe />Public page</Link>}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <Section title="Recent activity" action={<Link to="/family?tab=history" className="text-xs text-muted-foreground hover:text-foreground">History</Link>}>
          <ol className="space-y-4">
            {[...audit].sort(byNewest).slice(0, 7).map(a => (
              <li key={String(a.id)} className="flex gap-3">
                <Initials name={auditActor(app, a)} className="size-7 text-[10px]" />
                <div className="min-w-0 text-sm">
                  <p><span className="font-medium">{auditActor(app, a)}</span> <span className="text-muted-foreground">{a.action.replace(/ \(self-reported\)/, '').toLowerCase()}</span></p>
                  <p className="text-xs text-muted-foreground">{ago(a.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Moments" action={<Link to="/feed" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">All<ArrowRight className="size-3" /></Link>}>
          {recentPosts.length ? (
            <div className="grid grid-cols-2 gap-2">
              {recentPosts.map(p => <Link key={String(p.id)} to="/feed"><Photo bytes={p.photo} type={p.photoType} url={p.photoUrl} alt={p.caption} className="aspect-square w-full rounded-xl" /></Link>)}
            </div>
          ) : (
            <Link to="/feed?new=1" className="flex aspect-[2/1] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed text-sm text-muted-foreground hover:text-foreground">
              <ImagePlus className="size-5" />Share how support helped
            </Link>
          )}
        </Section>
      </div>
    </div>
  );
}
