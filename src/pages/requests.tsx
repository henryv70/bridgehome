import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Inbox, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/data';
import { t } from '@/lib/i18n';
import { taskFor } from '@/lib/status';
import { byNewest } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Drawer, Empty, PageHeader } from '@/components/app/kit';
import { NewRequestForm, RequestCard } from '@/components/app/request-parts';

const VIEWS = [
  { key: 'active', label: 'Active' },
  { key: 'mine', label: 'Needs me' },
  { key: 'done', label: 'Done' },
  { key: 'all', label: 'All' },
] as const;

export default function Requests() {
  const app = useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<(typeof VIEWS)[number]['key']>('active');
  const [q, setQ] = useState('');
  const open = params.get('new') === '1';
  const setOpen = (o: boolean) => setParams(o ? { new: '1' } : {});
  const recipient = app.role === 'recipient';

  const counts = { mine: app.requests.filter(r => taskFor(app, r)).length };
  const list = [...app.requests]
    .filter(r => view === 'all' || (view === 'done' ? ['completed', 'rejected'].includes(r.status) : view === 'mine' ? !!taskFor(app, r) : !['completed', 'rejected'].includes(r.status)))
    .filter(r => !q || (r.category + ' ' + t(r.category) + ' ' + r.explanation + ' ' + app.nameOf(r.author)).toLowerCase().includes(q.toLowerCase()))
    .sort(byNewest);

  return (
    <>
      <PageHeader title={t('Requests')} subtitle={t('Every need, from ask to arrival.')}
        actions={recipient && <Button size="lg" onClick={() => setOpen(true)}><Plus />{t('New request')}</Button>} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition', view === v.key && 'bg-background font-medium text-foreground shadow-sm')}>
              {t(v.label)}{v.key === 'mine' && counts.mine > 0 && <span className="tabular rounded-full bg-brand px-1.5 text-[11px] text-white">{counts.mine}</span>}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search requests')} className="h-9 pl-9" />
        </div>
      </div>

      {list.length ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">{list.map(r => <RequestCard key={String(r.id)} r={r} />)}</div>
      ) : (
        <Empty icon={<Inbox />} title={view === 'mine' ? t("You're all caught up") : t('No requests here yet')}
          action={recipient && <Button onClick={() => setOpen(true)}><Plus />{t('New request')}</Button>}>
          {recipient ? t('When something comes up, ask your family here. They will see it right away.')
            : t('Requests from family members who receive support will show up here in real time.')}
        </Empty>
      )}

      <Drawer open={open} onOpenChange={setOpen} title={t('Ask your family')} description={t("They'll see it right away and can approve all or part of it.")}>
        <NewRequestForm onDone={() => { setOpen(false); navigate('/requests'); }} />
      </Drawer>
    </>
  );
}
