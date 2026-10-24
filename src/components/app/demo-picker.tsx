import { useNavigate } from 'react-router';
import { useAction, useApp } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Drawer } from './kit';

const DEMOS = [
  { key: 'nguyen', name: 'The Nguyễn Family', where: 'San Jose → Huế & Đà Nẵng, Vietnam', money: 'USD → VND', photo: '/demo/banhchung.jpg', blurb: 'Tết groceries, Bà Lan’s medicine, and Minh’s motorbike and tuition.' },
  { key: 'santos', name: 'The Santos Family', where: 'Oakland → Quezon City, Philippines', money: 'USD → PHP', photo: '/demo/school.jpg', blurb: 'Lola’s roof before typhoon season, nursing tuition, and a laptop for school.' },
];

export function DemoPicker({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { reducers } = useApp();
  const { run, busy } = useAction();
  const navigate = useNavigate();
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title="Choose a demo family" description="Sample members, requests, bank accounts, budgets and photos. You'll be the sender and owner.">
      <div className="space-y-3">
        {DEMOS.map(d => (
          <button key={d.key} type="button" disabled={busy}
            onClick={async () => { if (await run(() => reducers?.seedDemo({ family: d.key }), `${d.name} is ready`)) { onOpenChange(false); navigate('/'); } }}
            className={cn('flex w-full gap-4 overflow-hidden rounded-2xl border bg-card p-3 text-left transition hover:border-foreground/30 hover:shadow-sm disabled:opacity-60')}>
            <img src={d.photo} alt="" className="size-20 shrink-0 rounded-xl object-cover" />
            <span className="min-w-0">
              <span className="block font-medium">{d.name}</span>
              <span className="block text-xs text-muted-foreground">{d.where} · {d.money}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{d.blurb}</span>
            </span>
          </button>
        ))}
      </div>
    </Drawer>
  );
}
