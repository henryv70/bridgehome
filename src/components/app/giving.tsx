import { HandHeart, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAction, useApp } from '@/lib/data';
import { formatMoney, toMinor } from '@/lib/money';
import { type Donor, formatTotals, percent } from '@/lib/donations';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AreaField, Drawer, Initials, MoneyField, TextField, formValue } from './kit';

export type PledgeTarget = { groupId: bigint; familyName: string; requestId: bigint; title?: string; currency: string };

export function PledgeDrawer({ target, onClose }: { target: PledgeTarget | null; onClose: () => void }) {
  const app = useApp();
  const { run, busy } = useAction();
  const currency = target?.currency ?? 'USD';
  return (
    <Drawer open={!!target} onOpenChange={o => !o && onClose()} title={target?.title ? `Support: ${target.title}` : `Support ${target?.familyName ?? ''}`}
      description="Demo pledge. No payment is collected.">
      {target && (
        <form className="space-y-4" onSubmit={async e => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (await run(() => app.reducers?.contribute({
            groupId: target.groupId, requestId: target.requestId, name: formValue(fd, 'name'), amount: toMinor(formValue(fd, 'amount'), currency), currency, message: formValue(fd, 'message'),
          }), 'Thank you for your pledge')) onClose();
        }}>
          <div className="flex flex-wrap gap-2">
            {['10', '25', '50', '100'].map(v => (
              <Button key={v} type="button" variant="outline" onClick={e => { (e.currentTarget.form?.elements.namedItem('amount') as HTMLInputElement).value = v; }}>
                {formatMoney(toMinor(v, currency), currency)}
              </Button>
            ))}
          </div>
          <MoneyField label="Amount" currency={currency} lockCurrency />
          <TextField name="name" label="Your name" defaultValue={app.profile?.name} required maxLength={60} hint="Shown publicly with your pledge and on the supporters board." />
          <AreaField name="message" label="Message (optional)" maxLength={280} />
          <Button size="lg" className="h-11 w-full" disabled={busy}><HandHeart />Pledge</Button>
        </form>
      )}
    </Drawer>
  );
}

const MEDALS = ['bg-amber-400 text-amber-950', 'bg-zinc-300 text-zinc-800', 'bg-orange-300 text-orange-950'];

export function Leaderboard({ donors, highlight, className }: { donors: Donor[]; highlight?: string; className?: string }) {
  if (!donors.length) return <p className="text-sm text-muted-foreground">No supporters yet. Be the first.</p>;
  return (
    <ol className={cn('divide-y rounded-2xl border bg-card', className)}>
      {donors.map((d, i) => (
        <li key={d.name} className={cn('flex items-center gap-3 px-4 py-3', highlight && d.name.toLowerCase() === highlight.toLowerCase() && 'bg-brand/[0.06]')}>
          <span className={cn('tabular flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold', MEDALS[i] ?? 'bg-muted text-muted-foreground')}>{i + 1}</span>
          <Initials name={d.name} className="size-7 text-[10px]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{d.name}{highlight && d.name.toLowerCase() === highlight.toLowerCase() && <span className="font-normal text-muted-foreground"> (you)</span>}</p>
            <p className="text-xs text-muted-foreground">{d.pledges.length} pledge{d.pledges.length === 1 ? '' : 's'}{d.families > 1 ? ` · ${d.families} families` : ''}</p>
          </div>
          <span className="tabular text-sm font-semibold">{formatTotals(d.pledges)}</span>
        </li>
      ))}
    </ol>
  );
}

export function LeaderboardTitle() {
  return <span className="inline-flex items-center gap-1.5"><Trophy className="size-3.5" />Top supporters</span>;
}

// Pledge progress for a need, shown under a photo or on a need card.
export function SupportBar({ pledged, goal, currency, supporters, onPledge, compact }: {
  pledged: bigint; goal: bigint; currency: string; supporters: number; onPledge?: () => void; compact?: boolean;
}) {
  return (
    <div className={cn('space-y-1.5', !compact && 'rounded-xl bg-muted/60 p-3')}>
      <p className="tabular text-sm"><b>{formatMoney(pledged, currency)}</b> <span className="text-muted-foreground">pledged{goal > 0n ? ` of ${formatMoney(goal, currency)}` : ''}</span></p>
      {goal > 0n && <Progress value={percent(pledged, goal)} className="h-1.5" />}
      <p className="text-xs text-muted-foreground">{supporters} supporter{supporters === 1 ? '' : 's'}{goal > 0n ? ` · ${percent(pledged, goal)}% of goal` : ''}</p>
      {onPledge && <Button variant="secondary" size="sm" className="mt-1 w-full" onClick={onPledge}><HandHeart />Pledge</Button>}
    </div>
  );
}
