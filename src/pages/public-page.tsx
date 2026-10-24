import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTable } from 'spacetimedb/react';
import { HandHeart, Info, Share2 } from 'lucide-react';
import { tables } from '@/module_bindings';
import { useAction, useApp } from '@/lib/data';
import { shareLink } from '@/lib/share';
import { formatMoney, sum } from '@/lib/money';
import { percent, topDonors } from '@/lib/donations';
import { STATUS } from '@/lib/status';
import { ago, byNewest, dueLabel } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Empty, Panel, Section } from '@/components/app/kit';
import { PostCard, summarize } from '@/components/app/post-card';
import { Leaderboard, LeaderboardTitle, PledgeDrawer, SupportBar, type PledgeTarget } from '@/components/app/giving';
import { PublicLayout } from '@/components/app/public-layout';

export default function PublicPage() {
  const { slug } = useParams();
  const app = useApp();
  const [families, ready] = useTable(tables.publicFamily);
  const [posts] = useTable(tables.publicPost);
  const [requests] = useTable(tables.publicRequest);
  const [pledges] = useTable(tables.publicContribution);
  const [reactions] = useTable(tables.publicReaction);
  const [mine] = useTable(tables.myReactionOnPublic);
  const { run } = useAction();
  const [target, setTarget] = useState<PledgeTarget | null>(null);

  const f = families.find(x => x.slug === slug);
  if (!f) return <PublicLayout><Empty title={ready ? 'This page is private or does not exist' : 'Loading…'}>{ready && <Link to="/explore" className="underline">Explore public families</Link>}</Empty></PublicLayout>;

  const famPosts = posts.filter(p => p.groupId === f.id).sort(byNewest);
  const needs = requests.filter(r => r.groupId === f.id);
  const openNeeds = needs.filter(r => ['submitted', 'approved', 'sent'].includes(r.status));
  const metNeeds = needs.filter(r => !openNeeds.includes(r));
  const famPledges = pledges.filter(p => p.groupId === f.id).sort(byNewest);
  const raised = sum(famPledges.filter(p => p.currency === f.goalCurrency), p => p.amount);
  const isMember = app.families.some(g => g.id === f.id);
  const forNeed = (id: bigint) => famPledges.filter(p => p.requestId === id);
  const pledgeTo = (r?: (typeof needs)[number]) => setTarget(r
    ? { groupId: f.id, familyName: f.name, requestId: r.id, title: r.title, currency: r.currency }
    : { groupId: f.id, familyName: f.name, requestId: 0n, currency: f.goalCurrency });

  return (
    <PublicLayout>
      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <header className="space-y-4">
            <p className="text-sm text-muted-foreground">{f.memberCount} family members · on BridgeHome since {f.createdAt.toDate().getFullYear()}</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{f.name}</h1>
            <p className="max-w-2xl text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">{f.story}</p>
            <div className="flex gap-2">
              <Button size="lg" className="h-10" onClick={() => pledgeTo()}><HandHeart />Support this family</Button>
              <Button size="lg" variant="outline" className="h-10" onClick={() => shareLink(f.name, location.href)}><Share2 />Share</Button>
            </div>
            {isMember && <p className="text-xs text-muted-foreground">You're a member. This is what visitors see. <Link to="/family?tab=public" className="underline">Edit page</Link></p>}
          </header>

          <Section title="Current needs">
            {openNeeds.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {openNeeds.map(r => (
                  <Panel key={String(r.id)} className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{r.category} · {dueLabel(r.dueDate)}</p>
                      <p className="mt-1 font-medium">{r.title}</p>
                    </div>
                    <SupportBar compact pledged={sum(forNeed(r.id), p => p.amount)} goal={r.amount} currency={r.currency} supporters={forNeed(r.id).length} />
                    <Button variant="secondary" className="mt-auto" onClick={() => pledgeTo(r)}><HandHeart />Pledge</Button>
                  </Panel>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">No open needs right now.</p>}
            {metNeeds.length > 0 && <p className="text-sm text-muted-foreground">Recently met: {metNeeds.map(r => `${r.title} (${STATUS[r.status]?.label.toLowerCase()})`).join(' · ')}</p>}
          </Section>

          <Section title="Moments">
            {famPosts.length ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {famPosts.map(p => {
                  const need = needs.find(r => r.id === p.requestId);
                  const ps = need ? forNeed(need.id) : [];
                  const open = !!need && openNeeds.includes(need);
                  return (
                    <PostCard key={String(p.id)} photo={p.photo} photoType={p.photoType} photoUrl={p.photoUrl} caption={p.caption} author={p.authorName} createdAt={p.createdAt}
                      context={p.requestTitle || undefined}
                      reactions={summarize(reactions.filter(r => r.postId === p.id).map(r => ({ emoji: r.emoji, mine: mine.some(m => m.id === r.id) })))}
                      onReact={emoji => run(() => app.reducers?.toggleReaction({ postId: p.id, emoji }))}
                      support={need && (open || ps.length > 0) && <SupportBar pledged={sum(ps, c => c.amount)} goal={need.amount} currency={need.currency} supporters={ps.length} onPledge={open ? () => pledgeTo(need) : undefined} />} />
                  );
                })}
              </div>
            ) : <p className="text-sm text-muted-foreground">No public moments yet.</p>}
          </Section>
        </div>

        <aside className="space-y-8 lg:sticky lg:top-20 lg:self-start">
          {f.goalAmount > 0n && (
            <Panel className="space-y-3">
              <p className="tabular text-2xl font-semibold tracking-tight">{formatMoney(raised, f.goalCurrency)}</p>
              <Progress value={percent(raised, f.goalAmount)} className="h-2" />
              <p className="tabular text-sm text-muted-foreground">pledged toward {formatMoney(f.goalAmount, f.goalCurrency)} · {famPledges.length} pledge{famPledges.length === 1 ? '' : 's'}</p>
              <Button className="w-full" onClick={() => pledgeTo()}>Pledge support</Button>
            </Panel>
          )}
          <Section title={<LeaderboardTitle />}>
            <Leaderboard donors={topDonors(famPledges, 5)} highlight={app.profile?.name} />
          </Section>
          <Section title="Recent supporters">
            {famPledges.length ? famPledges.slice(0, 6).map(p => (
              <div key={String(p.id)} className="text-sm">
                <p><span className="font-medium">{p.name}</span> <span className="tabular text-muted-foreground">· {formatMoney(p.amount, p.currency)} · {ago(p.createdAt)}</span></p>
                {p.message && <p className="text-muted-foreground">“{p.message}”</p>}
              </div>
            )) : <p className="text-sm text-muted-foreground">Be the first to support {f.name}.</p>}
          </Section>
          <p className="flex gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground"><Info className="size-4 shrink-0" />Pledges are a demo: they record what you intend to give and no money moves. Families never share identities, budgets or private conversations here.</p>
          <Link to="/give" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">See all families and top supporters</Link>
        </aside>
      </div>

      <PledgeDrawer target={target} onClose={() => setTarget(null)} />
    </PublicLayout>
  );
}
