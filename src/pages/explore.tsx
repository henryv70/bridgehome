import { Link } from 'react-router';
import { useTable } from 'spacetimedb/react';
import { HandHeart, Users } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { tables } from '@/module_bindings';
import { formatMoney, sum } from '@/lib/money';
import { byNewest } from '@/lib/time';
import { Progress } from '@/components/ui/progress';
import { Empty, Photo } from '@/components/app/kit';
import { PublicLayout } from '@/components/app/public-layout';

export default function Explore() {
  const [families, ready] = useTable(tables.publicFamily);
  const [posts] = useTable(tables.publicPost);
  const [pledges] = useTable(tables.publicContribution);
  const feed = [...posts].sort(byNewest);

  return (
    <PublicLayout>
      <section className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Families, supporting each other across borders.</h1>
        <p className="mt-3 text-muted-foreground">These families chose to share their story and the moments support made possible. You can follow along and pledge to help.</p>
        <Link to="/give" className={buttonVariants({ className: 'mt-5' })}><HandHeart />See needs and top supporters</Link>
      </section>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Families</h2>
      {families.length ? (
        <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {families.map(f => {
            const raised = sum(pledges.filter(p => p.groupId === f.id && p.currency === f.goalCurrency), p => p.amount);
            const cover = feed.find(p => p.groupId === f.id);
            return (
              <Link key={String(f.id)} to={`/p/${f.slug}`} className="group overflow-hidden rounded-2xl border bg-card transition hover:shadow-md">
                {cover ? <Photo bytes={cover.photo} type={cover.photoType} url={cover.photoUrl} alt="" className="aspect-[16/9] w-full" /> : <div className="aspect-[16/9] bg-muted" />}
                <div className="space-y-2 p-4">
                  <p className="font-medium">{f.name}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{f.story}</p>
                  {f.goalAmount > 0n && (
                    <div className="space-y-1 pt-1">
                      <Progress value={Math.min(100, Number((raised * 100n) / f.goalAmount))} className="h-1.5" />
                      <p className="tabular text-xs text-muted-foreground">{formatMoney(raised, f.goalCurrency)} pledged of {formatMoney(f.goalAmount, f.goalCurrency)}</p>
                    </div>
                  )}
                  <p className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3" />{f.memberCount} members</p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="mb-12"><Empty title={ready ? 'No public families yet' : 'Loading…'}>When a family turns on its public page, it will appear here.</Empty></div>
      )}

      {feed.length > 0 && (
        <>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Recent moments</h2>
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {feed.map(p => (
              <Link key={String(p.id)} to={`/p/${p.slug}`} className="group relative overflow-hidden rounded-md sm:rounded-xl" title={p.caption}>
                <Photo bytes={p.photo} type={p.photoType} url={p.photoUrl} alt={p.caption} className="aspect-square w-full transition group-hover:scale-[1.02]" />
                <span className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/60 p-2 text-xs text-white sm:block">{p.familyName}</span>
                {p.requestId !== 0n && (() => { const ps = pledges.filter(c => c.requestId === p.requestId); return ps.length > 0 && (
                  <span className="tabular absolute top-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">{formatMoney(sum(ps, c => c.amount), ps[0].currency)} pledged</span>
                ); })()}
              </Link>
            ))}
          </div>
        </>
      )}
    </PublicLayout>
  );
}
