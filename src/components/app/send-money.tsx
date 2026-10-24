import { useEffect, useState } from 'react';
import { ArrowDown, Check, Clock, Loader2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAction, useApp, type Request, type Transfer } from '@/lib/data';
import { DEPOSIT_SECONDS } from '@/lib/banks';
import { formatMoney, formatRate, toDecimal, toMinor } from '@/lib/money';
import { convertMinor, demoFee, quoteRate } from '@/lib/rates';
import { Button } from '@/components/ui/button';
import { AccountLine, BankMark, DemoBadge, LinkBankFlow } from './accounts';
import { MoneyField, NativeSelect } from './kit';

export function SendMoneyFlow({ r, remaining, onDone, onManual }: { r: Request; remaining: bigint; onDone: () => void; onManual: () => void }) {
  const app = useApp();
  const { run } = useAction();
  const funding = app.myAccounts.filter(a => a.purpose === 'send');
  const payouts = app.payoutsOf(r.author);
  const [fromId, setFrom] = useState<string>();
  const [toId, setTo] = useState<string>();
  const [amountText, setAmount] = useState(toDecimal(remaining, r.currency));
  const [step, setStep] = useState<'form' | 'link' | 'sending' | 'sent'>('form');
  const from = funding.find(a => String(a.id) === fromId) ?? funding[0];
  const to = payouts.find(a => String(a.id) === toId) ?? payouts[0];
  const who = app.nameOf(r.author);

  let amount = 0n;
  try { amount = toMinor(amountText || '0', r.currency); } catch { /* shown as invalid below */ }
  const rate = to ? quoteRate(r.currency, to.currency) : '1';
  const fee = amount > 0n ? demoFee(amount, r.currency) : 0n;
  const receives = to ? convertMinor(amount, r.currency, to.currency, rate) : 0n;
  const valid = amount > 0n && amount <= remaining && !!from && !!to;

  if (step === 'link') return <LinkBankFlow onDone={() => setStep('form')} />;
  if (step === 'sending') return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <Loader2 className="size-7 animate-spin text-muted-foreground" />
      <p className="font-medium">Authorizing with {from?.institution}…</p>
      <p className="text-sm text-muted-foreground">Sending {formatMoney(amount, r.currency)} to {who}</p>
    </div>
  );
  if (step === 'sent' && to) return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-good/15 text-good"><Check className="size-6" /></span>
      <p className="text-lg font-semibold">Money is on its way</p>
      <p className="tabular max-w-xs text-sm text-muted-foreground">{formatMoney(receives, to.currency)} will be deposited into {who}'s {to.institution} ••{to.last4}, usually within minutes.</p>
      <Button className="mt-2" onClick={onDone}>Done</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Deposit directly into {who}'s account.</p><DemoBadge /></div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-medium">From</p>
        {funding.length ? (
          funding.length > 1
            ? <NativeSelect value={String(from?.id)} onChange={e => setFrom(e.target.value)}>{funding.map(a => <option key={String(a.id)} value={String(a.id)}>{a.institution} ••{a.last4} ({a.kind})</option>)}</NativeSelect>
            : <div className="rounded-xl border p-3"><AccountLine a={funding[0]} /></div>
        ) : (
          <button type="button" onClick={() => setStep('link')} className="flex w-full items-center gap-3 rounded-xl border border-dashed p-3 text-left text-sm hover:bg-muted">
            <span className="flex size-9 items-center justify-center rounded-xl bg-muted"><Plus className="size-4" /></span>Link your bank to send
          </button>
        )}
      </div>

      <div className="flex justify-center text-muted-foreground"><ArrowDown className="size-4" /></div>

      <div className="space-y-1.5">
        <p className="text-[13px] font-medium">To</p>
        {payouts.length ? (
          payouts.length > 1
            ? <NativeSelect value={String(to?.id)} onChange={e => setTo(e.target.value)}>{payouts.map(a => <option key={String(a.id)} value={String(a.id)}>{a.institution} ••{a.last4} ({a.currency})</option>)}</NativeSelect>
            : <div className="rounded-xl border p-3"><AccountLine a={payouts[0]} /></div>
        ) : (
          <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">{who} hasn't added a receiving account yet. Ask them to add one under Bank accounts, or record a transfer you sent another way.</p>
        )}
      </div>

      <MoneyField label="Amount" currency={r.currency} lockCurrency value={amountText} onValueChange={setAmount}
        hint={amount > remaining ? `Only ${formatMoney(remaining, r.currency)} remains on this approval.` : undefined} />

      {to && amount > 0n && (
        <div className="tabular space-y-2 rounded-xl bg-muted/60 p-4 text-sm">
          <Row label="Exchange rate" value={`1 ${r.currency} = ${formatRate(rate)} ${to.currency}`} />
          <Row label="Transfer fee" value={formatMoney(fee, r.currency)} />
          <Row label="Total charged" value={formatMoney(amount + fee, r.currency)} />
          <div className="border-t pt-2"><Row label={`${who} receives`} value={formatMoney(receives, to.currency)} strong /></div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" />Arrives in minutes · indicative demo rate</p>
        </div>
      )}

      <Button size="lg" className="h-11 w-full" disabled={!valid} onClick={async () => {
        if (!from || !to) return;
        setStep('sending');
        await new Promise(res => setTimeout(res, 1400));
        const ok = await run(() => app.reducers?.sendMoney({ requestId: r.id, fundingId: from.id, payoutId: to.id, amount, fee, expected: receives, rate }));
        setStep(ok ? 'sent' : 'form');
      }}>
        {amount > 0n ? `Send ${formatMoney(amount, r.currency)}` : 'Send'}
      </Button>
      <button type="button" onClick={onManual} className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Sent it another way? Record it manually
      </button>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className={cn(strong && 'font-semibold')}>{value}</span></div>;
}

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

// Simulated delivery for BridgeHome Pay transfers: sent → processing → deposited.
export function DepositTracker({ t }: { t: Transfer }) {
  const app = useApp();
  const payout = app.accounts.find(a => a.id === t.payoutMethodId);
  const elapsed = (Date.now() - t.createdAt.toDate().getTime()) / 1000;
  const now = useNow(elapsed < DEPOSIT_SECONDS + 2);
  const secs = (now - t.createdAt.toDate().getTime()) / 1000;
  const stage = secs >= DEPOSIT_SECONDS ? 2 : secs >= 4 ? 1 : 0;
  const steps = ['Sent', 'Processing', 'Deposited'];
  return (
    <div className="space-y-2 rounded-xl border p-3">
      <div className="flex items-center gap-2 text-sm">
        {payout && <BankMark name={payout.institution} className="size-6 rounded-lg text-[10px]" />}
        <span className="font-medium">{stage === 2 ? 'Deposited' : 'Depositing'} to {payout ? `${payout.institution} ••${payout.last4}` : 'linked account'}</span>
        <DemoBadge className="ml-auto" />
      </div>
      <ol className="flex gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-1">
            <span className={cn('h-1 rounded-full bg-muted', i < stage && 'bg-foreground', i === stage && (stage === 2 ? 'bg-good' : 'animate-pulse bg-brand'))} />
            <span className={cn('flex items-center gap-1 text-[11px] text-muted-foreground', i <= stage && 'text-foreground')}>{i < stage || stage === 2 ? <Check className="size-3" /> : null}{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
