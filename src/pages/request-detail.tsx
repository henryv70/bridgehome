import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Globe, History, Pencil, Plus, Send } from 'lucide-react';
import { useAction, useApp, type Transfer } from '@/lib/data';
import { formatMoney, formatRate, sum } from '@/lib/money';
import { taskFor, waitingOn } from '@/lib/status';
import { ago, byNewest, dueLabel } from '@/lib/time';
import { Button, buttonVariants } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Drawer, Empty, Initials, Panel, Photo, Section, StatusBadge, TextField, formValue } from '@/components/app/kit';
import { DepositTracker, SendMoneyFlow } from '@/components/app/send-money';
import { MissingAccountNotice } from '@/components/app/accounts';
import { EditTransferForm, ReceiptForm, ReviewForm, ReviseForm, Steps, TransferForm, sentFor } from '@/components/app/request-parts';

// Statuses where a sender may still deposit money for the request.
const OPEN_FOR_DEPOSIT = ['submitted', 'approved', 'sent'];

type Sheet = { title: string; description?: string; body: ReactNode } | null;

export default function RequestDetail() {
  const app = useApp();
  const { id } = useParams();
  const r = app.requests.find(x => String(x.id) === id);
  const [sheet, setSheet] = useState<Sheet>(null);
  const { run, busy } = useAction();
  const close = () => setSheet(null);

  if (!r) return <Empty title="Request not found">It may belong to another family, or access was removed. <Link to="/requests" className="underline">Back to requests</Link></Empty>;

  const mine = app.isMe(r.author);
  const sender = app.role === 'sender';
  const transfers = app.transfers.filter(t => t.requestId === r.id).sort(byNewest);
  const sent = sentFor(app, r);
  const remaining = r.approved - sent;
  const comments = app.comments.filter(c => c.requestId === r.id).sort((a, b) => -byNewest(a, b));
  const posts = app.posts.filter(p => p.requestId === r.id);
  const pledges = app.contributions.filter(c => c.requestId === r.id);
  const task = taskFor(app, r);
  const canShare = mine || app.isOwner;

  const nextAction = (() => {
    if (sender && r.status === 'submitted') return { label: 'Review request', open: () => setSheet({ title: 'Review request', description: `${app.nameOf(r.author)} asked for ${formatMoney(r.amount, r.currency)}.`, body: <ReviewForm r={r} onDone={close} /> }) };
    if (sender && ['approved', 'sent'].includes(r.status) && remaining > 0n) {
      const manual = () => setSheet({ title: 'Record a transfer', body: <TransferForm r={r} remaining={remaining} onDone={close} /> });
      return { label: 'Send money', open: () => setSheet({ title: 'Send with BridgeHome Pay', body: <SendMoneyFlow r={r} remaining={remaining} onDone={close} onManual={manual} /> }) };
    }
    if (mine && ['draft', 'submitted', 'rejected'].includes(r.status)) return { label: r.status === 'draft' ? 'Edit and submit' : 'Revise request', open: () => setSheet({ title: 'Revise request', body: <ReviseForm r={r} onDone={close} /> }) };
    if (mine && r.status === 'received') return { label: 'Close request', open: () => run(() => app.reducers?.completeRequest({ requestId: r.id }), 'Request closed') };
    return null;
  })();

  return (
    <div className="space-y-6">
      <Link to="/requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Requests</Link>

      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.status} />
              {r.isPublic && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Globe className="size-3.5" />Public</span>}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{r.category}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{app.nameOf(r.author)} · {r.priority} · {dueLabel(r.dueDate)}</p>
          </div>
          <div className="text-right">
            <p className="tabular text-3xl font-semibold tracking-tight">{formatMoney(r.amount, r.currency)}</p>
            {r.approved > 0n && <p className="tabular text-sm text-muted-foreground">{formatMoney(r.approved, r.currency)} approved · {formatMoney(sent, r.currency)} sent</p>}
          </div>
        </div>
        <p className="max-w-2xl text-[15px] leading-relaxed">{r.explanation}</p>
        <Steps status={r.status} />
      </header>

      <Panel className={task ? 'border-brand/40 bg-brand/[0.04]' : ''}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{task ? 'Your next step' : 'Status'}</p>
            <p className="mt-1 font-medium">{task?.title ?? waitingOn(app, r)}</p>
          </div>
          {nextAction && <Button size="lg" className="h-10" onClick={nextAction.open} disabled={busy}>{nextAction.label}</Button>}
        </div>
      </Panel>

      {mine && OPEN_FOR_DEPOSIT.includes(r.status) && !app.payoutsOf(r.author).length && (
        <MissingAccountNotice title="You haven't added a receiving account"
          action={<Link to="/accounts" className={buttonVariants({ size: 'sm' })}><Plus />Add bank or wallet</Link>}>
          Your family can't deposit this money directly until you add the bank account or mobile wallet where it should arrive. Add one under Bank accounts. Until then, they'll have to send it another way.
        </MissingAccountNotice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section title="Transfers">
            {transfers.length ? transfers.map(t => <TransferRow key={String(t.id)} t={t} onEdit={() => setSheet({ title: 'Edit transfer', description: 'Fix a mistake before the recipient confirms it.', body: <EditTransferForm t={t} onDone={close} /> })} onConfirm={() => setSheet({ title: 'Confirm what arrived', body: <ReceiptForm t={t} onDone={close} /> })} />)
              : <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">No money recorded yet. {r.status === 'approved' ? 'The sender records it here after sending.' : ''}</p>}
          </Section>

          <Section title={`Conversation · ${comments.length}`}>
            <div className="space-y-4">
              {comments.map(c => (
                <div key={String(c.id)} className="flex gap-3">
                  <Initials name={app.nameOf(c.author)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><span className="font-medium">{app.nameOf(c.author)}</span> <span className="text-xs text-muted-foreground">{ago(c.createdAt)}</span></p>
                    <p className="mt-0.5 text-sm leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))}
              <form className="flex gap-2" onSubmit={async e => {
                e.preventDefault();
                const el = e.currentTarget;
                if (await run(() => app.reducers?.addComment({ requestId: r.id, text: formValue(new FormData(el), 'text') }))) el.reset();
              }}>
                <Input name="text" placeholder="Add context or ask a question" required maxLength={1000} className="h-10" />
                <Button size="icon-lg" className="size-10" disabled={busy} aria-label="Send"><Send /></Button>
              </form>
            </div>
          </Section>
        </div>

        <aside className="space-y-6">
          {posts.length > 0 && (
            <Section title="Moments" action={<Link to="/feed" className="text-xs text-muted-foreground hover:text-foreground">See all</Link>}>
              <div className="grid grid-cols-3 gap-1.5">{posts.map(p => <Photo key={String(p.id)} bytes={p.photo} type={p.photoType} url={p.photoUrl} alt={p.caption} className="aspect-square w-full rounded-lg" />)}</div>
            </Section>
          )}

          <Section title="Public support">
            <Panel className="space-y-3 p-4">
              {canShare ? (
                <ShareToggle requestId={r.id} isPublic={r.isPublic} title={r.publicTitle} familyPublic={!!app.group?.isPublic} />
              ) : (
                <p className="text-sm text-muted-foreground">{r.isPublic ? 'Shared on the family public page.' : 'Only your family can see this request.'}</p>
              )}
              {pledges.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="tabular text-sm"><b>{formatMoney(sum(pledges, p => p.amount), r.currency)}</b> pledged by {pledges.length} supporter{pledges.length > 1 ? 's' : ''}</p>
                  {pledges.map(p => <p key={String(p.id)} className="text-xs text-muted-foreground">{p.name} · {formatMoney(p.amount, p.currency)}{p.message && ` · “${p.message}”`}</p>)}
                </div>
              )}
            </Panel>
          </Section>
        </aside>
      </div>

      <Drawer open={!!sheet} onOpenChange={o => !o && close()} title={sheet?.title ?? ''} description={sheet?.description}>{sheet?.body}</Drawer>
    </div>
  );
}

function TransferRow({ t, onEdit, onConfirm }: { t: Transfer; onEdit: () => void; onConfirm: () => void }) {
  const app = useApp();
  const receipt = app.receipts.find(x => x.transferId === t.id);
  const revisions = app.revisions.filter(v => v.transferId === t.id).sort(byNewest);
  const request = app.requests.find(r => r.id === t.requestId);
  const canEdit = app.isMe(t.author) && !receipt;
  const canConfirm = !receipt && !!request && app.isMe(request.author);
  const diff = receipt ? receipt.amount - t.expected : 0n;
  return (
    <Panel className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tabular font-medium">{formatMoney(t.amount, t.currency)} <span className="font-normal text-muted-foreground">+ {formatMoney(t.fee, t.currency)} fee</span></p>
          <p className="text-xs text-muted-foreground">{app.nameOf(t.author)} · {t.note} · {ago(t.createdAt)}</p>
        </div>
        {revisions.length > 0 && (
          <Popover>
            <PopoverTrigger className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"><History className="size-3" />Edited</PopoverTrigger>
            <PopoverContent className="w-72 space-y-3 text-sm">
              <p className="font-medium">Edit history</p>
              {revisions.map(v => (
                <div key={String(v.id)} className="border-l-2 pl-3">
                  <p className="text-xs text-muted-foreground">{ago(v.createdAt)} · {app.nameOf(v.author)}</p>
                  <p className="tabular">Was {formatMoney(v.prevAmount, t.currency)} + {formatMoney(v.prevFee, t.currency)} fee at {formatRate(v.prevRate)}</p>
                  <p className="text-muted-foreground">“{v.reason}”</p>
                </div>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-3 text-sm">
        <div><p className="text-xs text-muted-foreground">Expected to arrive</p><p className="tabular font-medium">{formatMoney(t.expected, t.receiveCurrency)}</p><p className="text-xs text-muted-foreground">at {formatRate(t.rate)}</p></div>
        <div>
          <p className="text-xs text-muted-foreground">Confirmed received</p>
          {receipt ? <>
            <p className="tabular font-medium">{formatMoney(receipt.amount, receipt.currency)}</p>
            {diff !== 0n && <p className="tabular text-xs text-muted-foreground">{diff > 0n ? '+' : ''}{formatMoney(diff, receipt.currency)} vs expected</p>}
          </> : <p className="text-muted-foreground">Not yet</p>}
        </div>
      </div>
      {t.payoutMethodId !== 0n && <DepositTracker t={t} />}
      {receipt && <p className="text-sm text-muted-foreground">“{receipt.useNote}” · {app.nameOf(receipt.author)}</p>}
      {(canEdit || canConfirm) && (
        <div className="flex gap-2">
          {canConfirm && <Button onClick={onConfirm}>{t.payoutMethodId !== 0n ? 'Confirm deposit' : 'Confirm receipt'}</Button>}
          {canEdit && <Button variant="outline" onClick={onEdit}><Pencil />Edit</Button>}
        </div>
      )}
    </Panel>
  );
}

function ShareToggle({ requestId, isPublic, title, familyPublic }: { requestId: bigint; isPublic: boolean; title: string; familyPublic: boolean }) {
  const { reducers } = useApp();
  const { run, busy } = useAction();
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <form className="space-y-3" onSubmit={async e => {
        e.preventDefault();
        if (await run(() => reducers?.setRequestPublic({ requestId, isPublic: true, publicTitle: formValue(new FormData(e.currentTarget), 'title') }), 'Shared on your public page')) setEditing(false);
      }}>
        <TextField name="title" label="Public title" defaultValue={title} placeholder="e.g. Fix Lola's roof" required maxLength={120} hint="Visitors see this title, the amount and progress. Your explanation and conversation stay private." />
        <div className="flex gap-2"><Button variant="outline" type="button" onClick={() => setEditing(false)}>Cancel</Button><Button disabled={busy}>Share</Button></div>
      </form>
    );
  }
  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>Let the public pledge support</span>
        <Switch checked={isPublic} disabled={busy} onCheckedChange={on => on ? setEditing(true) : run(() => reducers?.setRequestPublic({ requestId, isPublic: false, publicTitle: '' }), 'Request is private again')} />
      </label>
      {isPublic && <p className="text-xs text-muted-foreground">Shown as “{title}”.</p>}
      {!familyPublic && <p className="text-xs text-muted-foreground">Your family's public page is off, so nobody outside the family can see it yet. The owner can turn it on under Family → Public page.</p>}
    </div>
  );
}
