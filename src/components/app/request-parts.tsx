import { useState } from 'react';
import { Link } from 'react-router';
import { Check, ChevronRight, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAction, useApp, type Request, type Transfer } from '@/lib/data';
import { formatMoney, sum, toDecimal, toMinor } from '@/lib/money';
import { STEPS, stepIndex, waitingOn } from '@/lib/status';
import { dueLabel, today } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { AreaField, MoneyField, SelectField, StatusBadge, TextField, formValue } from './kit';

export const CATEGORIES = ['Groceries', 'Health', 'Education', 'Housing', 'Utilities', 'Transport', 'Emergency', 'Celebration', 'Other'];

export function Steps({ status, compact }: { status: string; compact?: boolean }) {
  const at = stepIndex(status);
  const rejected = status === 'rejected';
  return (
    <ol className={cn('flex w-full items-center', compact ? 'gap-1' : 'gap-2')} aria-label="Progress">
      {STEPS.map((s, i) => {
        const done = i < at || (i === at && status === 'completed');
        const current = i === at && status !== 'completed';
        return (
          <li key={s.key} className={cn('flex flex-1 flex-col gap-1.5', compact && 'gap-0')} aria-current={current ? 'step' : undefined}>
            <span className={cn('h-1 rounded-full bg-muted', done && 'bg-foreground', current && (rejected ? 'bg-muted-foreground/40' : 'bg-brand'))} />
            {!compact && (
              <span className={cn('flex items-center gap-1 text-[11px] text-muted-foreground', (done || current) && 'text-foreground')}>
                {done && <Check className="size-3" />}{s.label}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function RequestCard({ r }: { r: Request }) {
  const app = useApp();
  const sent = sum(app.transfers.filter(t => t.requestId === r.id), t => t.amount);
  return (
    <Link to={`/requests/${r.id}`} className="group block rounded-2xl border bg-card p-4 transition hover:border-foreground/20 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{r.category}</p>
            {r.priority === 'urgent' && <span className="text-[11px] font-medium text-critical">Urgent</span>}
            {r.isPublic && <Globe className="size-3.5 text-muted-foreground" aria-label="Shared publicly" />}
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{r.explanation}</p>
        </div>
        <div className="text-right">
          <p className="tabular font-semibold">{formatMoney(r.amount, r.currency)}</p>
          {r.approved > 0n && r.approved !== r.amount && <p className="tabular text-xs text-muted-foreground">{formatMoney(r.approved, r.currency)} approved</p>}
          {sent > 0n && r.status === 'approved' && <p className="tabular text-xs text-muted-foreground">{formatMoney(sent, r.currency)} sent</p>}
        </div>
      </div>
      <div className="mt-4"><Steps status={r.status} compact /></div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{app.nameOf(r.author)} · {waitingOn(app, r)}</span>
        <span className="flex shrink-0 items-center gap-1">{['completed', 'received'].includes(r.status) ? <StatusBadge status={r.status} /> : dueLabel(r.dueDate)}<ChevronRight className="size-4 opacity-0 transition group-hover:opacity-100" /></span>
      </div>
    </Link>
  );
}

const money = (f: FormData, c: string, k = 'amount') => toMinor(formValue(f, k), c);

export function NewRequestForm({ onDone }: { onDone: (id?: bigint) => void }) {
  const { group, reducers } = useApp();
  const { run, busy } = useAction();
  const [draft, setDraft] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const currency = formValue(f, 'currency');
      const ok = await run(() => reducers?.createRequest({
        groupId: group!.id, amount: money(f, currency), currency, category: formValue(f, 'category'), explanation: formValue(f, 'explanation'),
        priority: formValue(f, 'priority'), dueDate: formValue(f, 'dueDate'), draft,
      }), draft ? 'Saved as draft' : 'Request sent to your family');
      if (ok) onDone();
    }}>
      <SelectField name="category" label="What is it for?" options={CATEGORIES} />
      <MoneyField label="How much do you need?" />
      <AreaField name="explanation" label="Tell your family more" placeholder="What it's for, and anything that helps them understand." required maxLength={1000} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField name="priority" label="Priority" options={[['routine', 'Routine'], ['important', 'Important'], ['urgent', 'Urgent']]} defaultValue="important" />
        <TextField name="dueDate" label="Needed by" type="date" min={today()} required defaultValue={new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)} />
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="submit" variant="outline" size="lg" className="h-11 flex-1" disabled={busy} onClick={() => setDraft(true)}>Save draft</Button>
        <Button type="submit" size="lg" className="h-11 flex-[2]" disabled={busy} onClick={() => setDraft(false)}>Send request</Button>
      </div>
    </form>
  );
}

export function ReviseForm({ r, onDone }: { r: Request; onDone: () => void }) {
  const { reducers } = useApp();
  const { run, busy } = useAction();
  const [submit, setSubmit] = useState(true);
  return (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      if (await run(() => reducers?.reviseRequest({ requestId: r.id, amount: money(f, r.currency), explanation: formValue(f, 'explanation'), submit }), submit ? 'Request submitted' : 'Draft saved')) onDone();
    }}>
      <MoneyField label="Amount" currency={r.currency} lockCurrency defaultValue={toDecimal(r.amount, r.currency)} />
      <AreaField name="explanation" label="Details" defaultValue={r.explanation} required maxLength={1000} hint="Your earlier version stays in the family history." />
      <div className="flex gap-2">
        <Button type="submit" variant="outline" size="lg" className="h-11 flex-1" disabled={busy} onClick={() => setSubmit(false)}>Save draft</Button>
        <Button type="submit" size="lg" className="h-11 flex-[2]" disabled={busy} onClick={() => setSubmit(true)}>Submit</Button>
      </div>
    </form>
  );
}

export function ReviewForm({ r, onDone }: { r: Request; onDone: () => void }) {
  const { reducers } = useApp();
  const { run, busy } = useAction();
  const [decline, setDecline] = useState(false);
  return (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const approved = decline ? 0n : money(f, r.currency);
      if (await run(() => reducers?.reviewRequest({ requestId: r.id, approved, note: formValue(f, 'note') }), decline ? 'Request declined' : 'Request approved')) onDone();
    }}>
      <MoneyField label="Amount you'll send" currency={r.currency} lockCurrency defaultValue={toDecimal(r.amount, r.currency)}
        hint={`Requested ${formatMoney(r.amount, r.currency)}. You can approve part of it.`} />
      <AreaField name="note" label="Message to your family" placeholder="A short note about your decision." required maxLength={1000} />
      <div className="flex gap-2">
        <Button type="submit" variant="outline" size="lg" className="h-11 flex-1" disabled={busy} onClick={() => setDecline(true)}>Decline</Button>
        <Button type="submit" size="lg" className="h-11 flex-[2]" disabled={busy} onClick={() => setDecline(false)}>Approve</Button>
      </div>
    </form>
  );
}

function TransferFields({ currency, t, initialAmount }: { currency: string; t?: Transfer; initialAmount?: string }) {
  const [receive, setReceive] = useState(t?.receiveCurrency ?? (currency === 'USD' ? 'PHP' : currency));
  const [amount, setAmount] = useState(t ? toDecimal(t.amount, currency) : initialAmount ?? '');
  const [rate, setRate] = useState(t?.rate ?? '');
  // Suggest the received amount from amount x rate; the sender can still type the exact figure.
  const estimate = Number(amount) * Number(rate);
  const suggestion = Number.isFinite(estimate) && estimate > 0 ? estimate.toFixed(receive === 'JPY' ? 0 : 2) : '';
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <MoneyField label="Amount sent" currency={currency} lockCurrency value={amount} onValueChange={setAmount} />
        <MoneyField label="Transfer fee" name="fee" currency={currency} lockCurrency defaultValue={t ? toDecimal(t.fee, currency) : '0'} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <TextField name="rate" label="Exchange rate" inputMode="decimal" placeholder="e.g. 56.10" required value={rate} onChange={e => setRate(e.target.value.trim())} />
        <MoneyField key={suggestion || 'none'} label="They should get" name="expected" currencyName="receiveCurrency" currency={receive} lockCurrency={!!t}
          defaultValue={t && rate === t.rate && amount === toDecimal(t.amount, currency) ? toDecimal(t.expected, t.receiveCurrency) : suggestion}
          hint={suggestion ? 'Estimated from the rate. Adjust if needed.' : undefined} onCurrencyChange={setReceive} />
      </div>
      <TextField name="note" label="How you sent it" placeholder="e.g. Remitly, bank deposit" required maxLength={1000} defaultValue={t?.note} />
    </>
  );
}

export function TransferForm({ r, remaining, onDone }: { r: Request; remaining: bigint; onDone: () => void }) {
  const { reducers } = useApp();
  const { run, busy } = useAction();
  return (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const rc = formValue(f, 'receiveCurrency');
      if (await run(() => reducers?.recordTransfer({
        requestId: r.id, amount: money(f, r.currency), fee: money(f, r.currency, 'fee'), expected: toMinor(formValue(f, 'expected'), rc),
        receiveCurrency: rc, rate: formValue(f, 'rate'), note: formValue(f, 'note'),
      }), 'Transfer recorded')) onDone();
    }}>
      <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">Send the money with any service you already use, then record it here. Up to <b className="text-foreground">{formatMoney(remaining, r.currency)}</b> remains on this approval.</p>
      <TransferFields currency={r.currency} initialAmount={toDecimal(remaining, r.currency)} />
      <Button size="lg" className="h-11 w-full" disabled={busy}>Record transfer</Button>
    </form>
  );
}

export function EditTransferForm({ t, onDone }: { t: Transfer; onDone: () => void }) {
  const { reducers } = useApp();
  const { run, busy } = useAction();
  return (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      if (await run(() => reducers?.editTransfer({
        transferId: t.id, amount: money(f, t.currency), fee: money(f, t.currency, 'fee'), expected: toMinor(formValue(f, 'expected'), t.receiveCurrency),
        rate: formValue(f, 'rate'), note: formValue(f, 'note'), reason: formValue(f, 'reason'),
      }), 'Transfer updated')) onDone();
    }}>
      <TransferFields currency={t.currency} t={t} />
      <AreaField name="reason" label="Why are you changing it?" placeholder="e.g. I typed the fee wrong" required maxLength={500}
        hint="The original values stay visible to your family." />
      <Button size="lg" className="h-11 w-full" disabled={busy}>Save changes</Button>
    </form>
  );
}

export function ReceiptForm({ t, onDone }: { t: Transfer; onDone: () => void }) {
  const { reducers } = useApp();
  const { run, busy } = useAction();
  return (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      if (await run(() => reducers?.confirmReceipt({ transferId: t.id, amount: toMinor(formValue(f, 'amount'), t.receiveCurrency), useNote: formValue(f, 'useNote') }), 'Thanks for confirming')) onDone();
    }}>
      <MoneyField label="Amount that arrived" currency={t.receiveCurrency} lockCurrency defaultValue={toDecimal(t.expected, t.receiveCurrency)}
        hint={`Expected ${formatMoney(t.expected, t.receiveCurrency)}. If it's different, that's okay. Just explain below.`} />
      <AreaField name="useNote" label="What it was used for, or any difference" required maxLength={1000} />
      <Button size="lg" className="h-11 w-full" disabled={busy}>Confirm receipt</Button>
    </form>
  );
}

export function sentFor(app: ReturnType<typeof useApp>, r: Request) {
  return sum(app.transfers.filter(t => t.requestId === r.id), t => t.amount);
}
