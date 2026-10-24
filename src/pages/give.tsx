import { useState } from 'react';
import { Link } from 'react-router';
import { useTable } from 'spacetimedb/react';
import { HandHeart, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tables } from '@/module_bindings';
import { useApp } from '@/lib/data';
import { formatMoney, sum } from '@/lib/money';
import { formatTotals, percent, topDonors } from '@/lib/donations';
import { ago, byNewest, dueLabel } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Empty, Panel, Photo, Section, Stat } from '@/components/app/kit';
import { Leaderboard, LeaderboardTitle, PledgeDrawer, SupportBar, type PledgeTarget } from '@/components/app/giving';
import { PublicLayout } from '@/components/app/public-layout';

const SORTS = [
  { key: 'supported', label: 'Most supported' },
  { key: 'close', label: 'Closest to goal' },
  { key: 'new', label: 'Newest' },
] as const;

export default function Give() {
  const { profile } = useApp();
  const [families, ready] = useTable(tables.publicFamily);
  const [requests] = useTable(tables.publicRequest);
  const [pledges] = useTable(tables.publicContribution);
  const [posts] = useTable(tables.publicPost);
  const [sort, setSort] = useState<(typeof SORTS)[number]['key']>('supported');
  const [target, setTarget] = useState<PledgeTarget | null>(null);

  const famName = (id: bigint) => families.find(f => f.id === id)?.name ?? '';
  const famSlug = (id: bigint) => families.find(f => f.id === id)?.slug ?? '';
  const visible = new Set(families.map(f => f.id));
  const allPledges = pledges.filter(p => visible.has(p.groupId));
  const supporters = new Set(allPledges.map(p => p.name.trim().toLowerCase())).size;

  const needs = requests
    .filter(r => visible.has(r.groupId) && ['submitted', 'approved', 'sent'].includes(r.status))
    .map(r => { const ps = allPledges.filter(p => p.requestId === r.id); return { r, pledged: sum(ps, p => p.amount), supporters: ps.length }; })
    .sort((a, b) => Number(b.r.priority === 'urgent') - Number(a.r.priority === 'urgent') || percent(a.pledged, a.r.amount) - percent(b.pledged, b.r.amount));

  const familyRows = families.map(f => {
    const ps = allPledges.filter(p => p.groupId === f.id);
    const raised = sum(ps.filter(p => p.currency === f.goalCurrency), p => p.amount);
    return { f, ps, raised, pct: percent(raised, f.goalAmount), cover: [...posts].filter(p => p.groupId === f.id).sort(byNewest)[0] };
  }).sort((a, b) =>
    sort === 'new' ? Number(b.f.createdAt.microsSinceUnixEpoch - a.f.createdAt.microsSinceUnixEpoch)
      : sort === 'close' ? b.pct - a.pct
        : Number(b.raised - a.raised));

  const recent = [...allPledges].sort(byNewest).slice(0, 8);

  return (
    <PublicLayout>
      <section className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Give to families you can see.</h1>
        <p className="mt-3 text-muted-foreground">Every family here shares real needs and photos of how support is used. Pledge to a specific need or to a family's goal.</p>
      </section>

      <div className="mb-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pledged so far" value={formatTotals(allPledges)} />
        <Stat label="Supporters" value={supporters} />
        <Stat label="Families" value={families.length} />
        <Stat label="Open needs" value={needs.length} />
      </div>

      {!families.length ? (
        <Empty title={ready ? 'No public families yet' : 'Loading…'}>When a family turns on its public page, it will appear here.</Empty>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="space-y-10">
            <Section title="Open needs">
              {needs.length ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {needs.map(({ r, pledged, supporters }) => (
                    <Panel key={String(r.id)} className="flex flex-col gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          <Link to={`/p/${famSlug(r.groupId)}`} className="hover:underline">{famName(r.groupId)}</Link> · {r.category} · {dueLabel(r.dueDate)}
                          {r.priority === 'urgent' && <span className="font-medium text-critical"> · Urgent</span>}
                        </p>
                        <p className="mt-1 font-medium">{r.title}</p>
                      </div>
                      <SupportBar compact pledged={pledged} goal={r.amount} currency={r.currency} supporters={supporters} />
                      <Button variant="secondary" className="mt-auto" onClick={() => setTarget({ groupId: r.groupId, familyName: famName(r.groupId), requestId: r.id, title: r.title, currency: r.currency })}>
                        <HandHeart />Pledge
                      </Button>
                    </Panel>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">Every shared need is fully supported right now.</p>}
            </Section>

            <Section title="Families" action={
              <div className="flex gap-1 rounded-lg bg-muted p-0.5">
                {SORTS.map(s => (
                  <button key={s.key} type="button" onClick={() => setSort(s.key)}
                    className={cn('rounded-md px-2.5 py-1 text-xs text-muted-foreground', sort === s.key && 'bg-background font-medium text-foreground shadow-sm')}>{s.label}</button>
                ))}
              </div>
            }>
              <div className="grid gap-4 sm:grid-cols-2">
                {familyRows.map(({ f, ps, raised, cover }) => (
                  <div key={String(f.id)} className="overflow-hidden rounded-2xl border bg-card">
                    <Link to={`/p/${f.slug}`}>
                      {cover ? <Photo bytes={cover.photo} type={cover.photoType} url={cover.photoUrl} alt="" className="aspect-[16/9] w-full" /> : <div className="aspect-[16/9] bg-muted" />}
                    </Link>
                    <div className="space-y-3 p-4">
                      <div>
                        <Link to={`/p/${f.slug}`} className="font-medium hover:underline">{f.name}</Link>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{f.story}</p>
                      </div>
                      {f.goalAmount > 0n ? (
                        <div className="space-y-1">
                          <Progress value={percent(raised, f.goalAmount)} className="h-1.5" />
                          <p className="tabular text-xs text-muted-foreground"><b className="text-foreground">{formatMoney(raised, f.goalCurrency)}</b> of {formatMoney(f.goalAmount, f.goalCurrency)} · {ps.length} pledges</p>
                        </div>
                      ) : <p className="tabular text-xs text-muted-foreground">{formatTotals(ps)} pledged · {ps.length} pledges</p>}
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3" />{f.memberCount} members</span>
                        <Button size="sm" onClick={() => setTarget({ groupId: f.id, familyName: f.name, requestId: 0n, currency: f.goalCurrency })}>Support</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
            <Section title={<LeaderboardTitle />}>
              <Leaderboard donors={topDonors(allPledges, 10)} highlight={profile?.name} />
            </Section>
            <Section title="Recent pledges">
              <div className="space-y-3">
                {recent.map(p => (
                  <div key={String(p.id)} className="text-sm">
                    <p><span className="font-medium">{p.name}</span> <span className="tabular text-muted-foreground">pledged {formatMoney(p.amount, p.currency)} to </span>
                      <Link to={`/p/${famSlug(p.groupId)}`} className="hover:underline">{famName(p.groupId)}</Link></p>
                    <p className="text-xs text-muted-foreground">{p.message ? `“${p.message}” · ` : ''}{ago(p.createdAt)}</p>
                  </div>
                ))}
              </div>
            </Section>
            <p className="rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">Pledges are a demo: they record what supporters intend to give and no payment is collected. Supporter names are shown as entered.</p>
          </aside>
        </div>
      )}

      <PledgeDrawer target={target} onClose={() => setTarget(null)} />
    </PublicLayout>
  );
}
