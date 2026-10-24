import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Globe, History, Pencil, Plus, Send } from 'lucide-react';
import { useAction, useApp, type Transfer } from '@/lib/data';
import { t, tn } from '@/lib/i18n';
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
import { TranslatedText } from '@/lib/translate';
import { EditTransferForm, ReceiptForm, ReviewForm, ReviseForm, Steps, TransferForm, priorityLabel, sentFor } from '@/components/app/request-parts';

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

  if (!r) return <Empty title={t('Request not found')}>{t('It may belong to another family, or access was removed.')} <Link to="/requests" className="underline">{t('Back to requests')}</Link></Empty>;

  const mine = app.isMe(r.author);
  const sender = app.role === 'sender';
  const transfers = app.transfers.filter(x => x.requestId === r.id).sort(byNewest);
  const sent = sentFor(app, r);
  const remaining = r.approved - sent;
  const comments = app.comments.filter(c => c.requestId === r.id).sort((a, b) => -byNewest(a, b));
  const posts = app.posts.filter(p => p.requestId === r.id);
  const pledges = app.contributions.filter(c => c.requestId === r.id);
  const task = taskFor(app, r);
  const canShare = mine || app.isOwner;

  const nextAction = (() => {
    if (sender && r.status === 'submitted') return { label: t('Review request'), open: () => setSheet({ title: t('Review request'), description: t('{who} asked for {amount}.', { who: app.nameOf(r.author), amount: formatMoney(r.amount, r.currency) }), body: <ReviewForm r={r} onDone={close} /> }) };
    if (sender && ['approved', 'sent'].includes(r.status) && remaining > 0n) {
      const manual = () => setSheet({ title: t('Record a transfer'), body: <TransferForm r={r} remaining={remaining} onDone={close} /> });
      return { label: t('Send money'), open: () => setSheet({ title: t('Send with BridgeHome Pay'), body: <SendMoneyFlow r={r} remaining={remaining} onDone={close} onManual={manual} /> }) };
    }
    if (mine && ['draft', 'submitted', 'rejected'].includes(r.status)) return { label: r.status === 'draft' ? t('Edit and submit') : t('Revise request'), open: () => setSheet({ title: t('Revise request'), body: <ReviseForm r={r} onDone={close} /> }) };
    if (mine && r.status === 'received') return { label: t('Close request'), open: () => run(() => app.reducers?.completeRequest({ requestId: r.id }), 'Request closed') };
    return null;
  })();

  return (
    <div className="space-y-6">
      <Link to="/requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{t('Requests')}</Link>

      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={r.status} />
              {r.isPublic && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Globe className="size-3.5" />{t('Public')}</span>}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{t(r.category)}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{app.nameOf(r.author)} · {priorityLabel(r.priority)} · {dueLabel(r.dueDate)}</p>
          </div>
          <div className="text-right">
            <p className="tabular text-3xl font-semibold tracking-tight">{formatMoney(r.amount, r.currency)}</p>
            {r.approved > 0n && <p className="tabular text-sm text-muted-foreground">{t('{approved} approved · {sent} sent', { approved: formatMoney(r.approved, r.currency), sent: formatMoney(sent, r.currency) })}</p>}
          </div>
        </div>
        <div className="max-w-2xl"><TranslatedText kind="request" id={r.id} text={r.explanation} className="text-[15px] leading-relaxed" /></div>
        <Steps status={r.status} />
      </header>

      <Panel className={task ? 'border-brand/40 bg-brand/[0.04]' : ''}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{task ? t('Your next step') : t('Status')}</p>
            <p className="mt-1 font-medium">{task?.title ?? waitingOn(app, r)}</p>
          </div>
          {nextAction && <Button size="lg" className="h-10" onClick={nextAction.open} disabled={busy}>{nextAction.label}</Button>}
        </div>
      </Panel>

      {mine && OPEN_FOR_DEPOSIT.includes(r.status) && !app.payoutsOf(r.author).length && (
        <MissingAccountNotice title={t("You haven't added a receiving account")}
          action={<Link to="/accounts" className={buttonVariants({ size: 'sm' })}><Plus />{t('Add bank or wallet')}</Link>}>
          {t("Your family can't deposit this money directly until you add the bank account or mobile wallet where it should arrive. Add one under Bank accounts. Until then, they'll have to send it another way.")}
        </MissingAccountNotice>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Section title={t('Transfers')}>
            {transfers.length ? transfers.map(x => <TransferRow key={String(x.id)} transfer={x} onEdit={() => setSheet({ title: t('Edit transfer'), description: t('Fix a mistake before the recipient confirms it.'), body: <EditTransferForm t={x} onDone={close} /> })} onConfirm={() => setSheet({ title: t('Confirm what arrived'), body: <ReceiptForm t={x} onDone={close} /> })} />)
              : <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{t('No money recorded yet.')} {r.status === 'approved' ? t('The sender records it here after sending.') : ''}</p>}
          </Section>

          <Section title={t('Conversation · {n}', { n: comments.length })}>
            <div className="space-y-4">
              {comments.map(c => (
                <div key={String(c.id)} className="flex gap-3">
                  <Initials name={app.nameOf(c.author)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm"><span className="font-medium">{app.nameOf(c.author)}</span> <span className="text-xs text-muted-foreground">{ago(c.createdAt)}</span></p>
                    <TranslatedText kind="comment" id={c.id} text={c.text} className="mt-0.5 text-sm leading-relaxed" />
                  </div>
                </div>
              ))}
              <form className="flex gap-2" onSubmit={async e => {
                e.preventDefault();
                const el = e.currentTarget;
                if (await run(() => app.reducers?.addComment({ requestId: r.id, text: formValue(new FormData(el), 'text') }))) el.reset();
              }}>
                <Input name="text" placeholder={t('Add context or ask a question')} required maxLength={1000} className="h-10" />
                <Button size="icon-lg" className="size-10" disabled={busy} aria-label={t('Send')}><Send /></Button>
              </form>
            </div>
          </Section>
        </div>

        <aside className="space-y-6">
          {posts.length > 0 && (
            <Section title={t('Moments')} action={<Link to="/feed" className="text-xs text-muted-foreground hover:text-foreground">{t('See all')}</Link>}>
              <div className="grid grid-cols-3 gap-1.5">{posts.map(p => <Photo key={String(p.id)} bytes={p.photo} type={p.photoType} url={p.photoUrl} alt={p.caption} className="aspect-square w-full rounded-lg" />)}</div>
            </Section>
          )}

          <Section title={t('Public support')}>
            <Panel className="space-y-3 p-4">
              {canShare ? (
                <ShareToggle requestId={r.id} isPublic={r.isPublic} title={r.publicTitle} familyPublic={!!app.group?.isPublic} />
              ) : (
                <p className="text-sm text-muted-foreground">{r.isPublic ? t('Shared on the family public page.') : t('Only your family can see this request.')}</p>
              )}
              {pledges.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <p className="tabular text-sm"><b>{formatMoney(sum(pledges, p => p.amount), r.currency)}</b> {tn('pledged by {n} supporter', 'pledged by {n} supporters', pledges.length)}</p>
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

function TransferRow({ transfer: tr, onEdit, onConfirm }: { transfer: Transfer; onEdit: () => void; onConfirm: () => void }) {
  const app = useApp();
  const receipt = app.receipts.find(x => x.transferId === tr.id);
  const revisions = app.revisions.filter(v => v.transferId === tr.id).sort(byNewest);
  const request = app.requests.find(r => r.id === tr.requestId);
  const canEdit = app.isMe(tr.author) && !receipt;
  const canConfirm = !receipt && !!request && app.isMe(request.author);
  const diff = receipt ? receipt.amount - tr.expected : 0n;
  return (
    <Panel className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="tabular font-medium">{formatMoney(tr.amount, tr.currency)} <span className="font-normal text-muted-foreground">{t('+ {fee} fee', { fee: formatMoney(tr.fee, tr.currency) })}</span></p>
          <p className="text-xs text-muted-foreground">{app.nameOf(tr.author)} · {tr.note} · {ago(tr.createdAt)}</p>
        </div>
        {revisions.length > 0 && (
          <Popover>
            <PopoverTrigger className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"><History className="size-3" />{t('Edited')}</PopoverTrigger>
            <PopoverContent className="w-72 space-y-3 text-sm">
              <p className="font-medium">{t('Edit history')}</p>
              {revisions.map(v => (
                <div key={String(v.id)} className="border-l-2 pl-3">
                  <p className="text-xs text-muted-foreground">{ago(v.createdAt)} · {app.nameOf(v.author)}</p>
                  <p className="tabular">{t('Was {amount} + {fee} fee at {rate}', { amount: formatMoney(v.prevAmount, tr.currency), fee: formatMoney(v.prevFee, tr.currency), rate: formatRate(v.prevRate) })}</p>
                  <p className="text-muted-foreground">“{v.reason}”</p>
                </div>
              ))}
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-3 text-sm">
        <div><p className="text-xs text-muted-foreground">{t('Expected to arrive')}</p><p className="tabular font-medium">{formatMoney(tr.expected, tr.receiveCurrency)}</p><p className="text-xs text-muted-foreground">{t('at {rate}', { rate: formatRate(tr.rate) })}</p></div>
        <div>
          <p className="text-xs text-muted-foreground">{t('Confirmed received')}</p>
          {receipt ? <>
            <p className="tabular font-medium">{formatMoney(receipt.amount, receipt.currency)}</p>
            {diff !== 0n && <p className="tabular text-xs text-muted-foreground">{t('{diff} vs expected', { diff: (diff > 0n ? '+' : '') + formatMoney(diff, receipt.currency) })}</p>}
          </> : <p className="text-muted-foreground">{t('Not yet')}</p>}
        </div>
      </div>
      {tr.payoutMethodId !== 0n && <DepositTracker t={tr} />}
      {receipt && <p className="text-sm text-muted-foreground">“{receipt.useNote}” · {app.nameOf(receipt.author)}</p>}
      {(canEdit || canConfirm) && (
        <div className="flex gap-2">
          {canConfirm && <Button onClick={onConfirm}>{tr.payoutMethodId !== 0n ? t('Confirm deposit') : t('Confirm receipt')}</Button>}
          {canEdit && <Button variant="outline" onClick={onEdit}><Pencil />{t('Edit')}</Button>}
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
        <TextField name="title" label={t('Public title')} defaultValue={title} placeholder={t("e.g. Fix Lola's roof")} required maxLength={120} hint={t('Visitors see this title, the amount and progress. Your explanation and conversation stay private.')} />
        <div className="flex gap-2"><Button variant="outline" type="button" onClick={() => setEditing(false)}>{t('Cancel')}</Button><Button disabled={busy}>{t('Share')}</Button></div>
      </form>
    );
  }
  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>{t('Let the public pledge support')}</span>
        <Switch checked={isPublic} disabled={busy} onCheckedChange={on => on ? setEditing(true) : run(() => reducers?.setRequestPublic({ requestId, isPublic: false, publicTitle: '' }), 'Request is private again')} />
      </label>
      {isPublic && <p className="text-xs text-muted-foreground">{t('Shown as “{title}”.', { title })}</p>}
      {!familyPublic && <p className="text-xs text-muted-foreground">{t("Your family's public page is off, so nobody outside the family can see it yet. The owner can turn it on under Family → Public page.")}</p>}
    </div>
  );
}
