import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, Check, Landmark, Loader2, Lock, Search, ShieldCheck, Smartphone, Trash2, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAction, useApp, type Account } from '@/lib/data';
import { COUNTRIES, INSTITUTIONS, type Institution } from '@/lib/banks';
import { countryName, t } from '@/lib/i18n';
import { formatMoney } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, SelectField, TextField, formValue } from './kit';
import { BankMark } from './bank-mark';
export { BankMark } from './bank-mark';

const KIND_LABELS: Record<string, string> = { checking: 'Checking', savings: 'Savings', wallet: 'Wallet', debit: 'Debit' };
export const kindLabel = (kind: string) => t(KIND_LABELS[kind] ?? kind);

export function DemoBadge({ className }: { className?: string }) {
  return <span className={cn('inline-flex h-5 items-center rounded-full border border-dashed px-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase', className)}>{t('Demo')}</span>;
}

export function AccountLine({ a, right, className }: { a: Account; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <BankMark name={a.institution} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{a.institution} <span className="tabular text-muted-foreground">••{a.last4}</span></p>
        <p className="truncate text-xs text-muted-foreground">{kindLabel(a.kind)} · {a.currency} · {a.holderName}</p>
      </div>
      {right}
    </div>
  );
}

// Shown when a bank account BridgeHome Pay needs is missing, with what to do about it.
export function MissingAccountNotice({ title, children, action, className }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn('space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm', className)}>
      <p className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300"><TriangleAlert className="size-4 shrink-0" />{title}</p>
      <p className="leading-relaxed text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}

const rand4 = () => String(Math.floor(1000 + Math.random() * 9000));
const SecurityNote = () => (
  <p className="flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" />
    {t('Demo only. BridgeHome does not connect to banks yet. Sign-in details never leave this screen, and only the bank name and last four digits are saved.')}
  </p>
);

// Plaid-style flow to link an account to send from.
export function LinkBankFlow({ onDone }: { onDone: () => void }) {
  const { reducers, profile } = useApp();
  const { run } = useAction();
  const [step, setStep] = useState<'pick' | 'manual' | 'login' | 'connecting' | 'choose' | 'done'>('pick');
  const [country, setCountry] = useState('US');
  const [q, setQ] = useState('');
  const [bank, setBank] = useState<Institution>();
  const [picked, setPicked] = useState(0);
  const currency = COUNTRIES[country]?.currency ?? 'USD';
  const options = useMemo(() => [
    { kind: 'checking', last4: rand4(), balance: BigInt(180000 + Math.floor(Math.random() * 900000)) },
    { kind: 'savings', last4: rand4(), balance: BigInt(500000 + Math.floor(Math.random() * 2500000)) },
  ], [bank]); // eslint-disable-line react-hooks/exhaustive-deps
  const banks = INSTITUTIONS.filter(i => i.country === country && i.kind === 'bank' && i.name.toLowerCase().includes(q.toLowerCase()));

  const save = async (kind: string, last4: string, institutionName: string) =>
    run(() => reducers?.addPaymentMethod({ purpose: 'send', institution: institutionName, kind, holderName: profile?.name ?? 'Account holder', last4, currency, country }));

  const back = <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={() => setStep('pick')}><ArrowLeft />{t('Back')}</Button>;

  if (step === 'pick') return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder={t('Search your bank')} className="h-10 pl-9" />
        </div>
        <NativeSelect value={country} onChange={e => setCountry(e.target.value)} className="w-auto" aria-label={t('Country')}>
          {['US', 'CA', 'GB', 'AU'].map(c => <option key={c} value={c}>{c}</option>)}
        </NativeSelect>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {banks.map(b => (
          <button key={b.name} type="button" onClick={() => { setBank(b); setStep('login'); }} className="flex items-center gap-3 rounded-xl border p-3 text-left text-sm hover:bg-muted">
            <BankMark name={b.name} className="size-8" /><span className="font-medium">{b.name}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => setStep('manual')} className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        {t('Enter routing and account numbers instead')}
      </button>
      <SecurityNote />
    </div>
  );

  if (step === 'manual') return (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const account = formValue(f, 'account').replace(/\D/g, '');
      // Only the last four digits are sent to the database.
      if (await save(formValue(f, 'kind'), account.slice(-4), formValue(f, 'bank'))) setStep('done');
    }}>
      {back}
      <TextField name="bank" label={t('Bank name')} required maxLength={80} placeholder={t('e.g. Chase')} />
      <TextField name="routing" label={t('Routing number')} inputMode="numeric" pattern="\d{9}" required placeholder={t('9 digits')} autoComplete="off" />
      <TextField name="account" label={t('Account number')} inputMode="numeric" pattern="\d{4,17}" required autoComplete="off" hint={t('Only the last four digits are saved.')} />
      <SelectField name="kind" label={t('Account type')} options={[['checking', t('Checking')], ['savings', t('Savings')]]} />
      <Button size="lg" className="h-11 w-full">{t('Link account')}</Button>
      <SecurityNote />
    </form>
  );

  if (step === 'login' && bank) return (
    <form className="space-y-4" autoComplete="off" onSubmit={e => {
      e.preventDefault();
      // Credentials are intentionally discarded: this is a simulated bank sign-in.
      e.currentTarget.reset();
      setStep('connecting');
      setTimeout(() => setStep('choose'), 1600);
    }}>
      {back}
      <div className="flex items-center gap-3"><BankMark name={bank.name} /><div><p className="font-medium">{t('Sign in to {bank}', { bank: bank.name })}</p><p className="text-xs text-muted-foreground">{t('Sandbox: any username and password work.')}</p></div></div>
      <TextField name="user" label={t('Username')} required autoComplete="off" />
      <TextField name="pass" label={t('Password')} type="password" required autoComplete="new-password" />
      <Button size="lg" className="h-11 w-full"><Lock />{t('Sign in securely')}</Button>
      <SecurityNote />
    </form>
  );

  if (step === 'connecting') return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <Loader2 className="size-7 animate-spin text-muted-foreground" />
      <p className="font-medium">{t('Connecting to {bank}…', { bank: bank?.name ?? '' })}</p>
      <p className="text-sm text-muted-foreground">{t('Verifying your accounts')}</p>
    </div>
  );

  if (step === 'choose' && bank) return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('Choose the account BridgeHome Pay should send from.')}</p>
      <div className="space-y-2">
        {options.map((o, i) => (
          <button key={o.last4} type="button" onClick={() => setPicked(i)} className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left', picked === i && 'border-foreground ring-1 ring-foreground')}>
            <BankMark name={bank.name} className="size-8" />
            <span className="flex-1 text-sm"><span className="font-medium">{kindLabel(o.kind)}</span> <span className="tabular text-muted-foreground">••{o.last4}</span></span>
            <span className="tabular text-sm text-muted-foreground">{formatMoney(o.balance, currency)}</span>
          </button>
        ))}
      </div>
      <Button size="lg" className="h-11 w-full" onClick={async () => { const o = options[picked]; if (await save(o.kind, o.last4, bank.name)) setStep('done'); }}>{t('Link account')}</Button>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-good/15 text-good"><Check className="size-6" /></span>
      <p className="font-medium">{t('Account linked')}</p>
      <p className="text-sm text-muted-foreground">{t('You can now send money to your family in one step.')}</p>
      <Button className="mt-2" onClick={onDone}>{t('Done')}</Button>
    </div>
  );
}

// Where a recipient wants money to arrive: a local bank or mobile wallet.
export function AddPayoutFlow({ onDone, defaultCountry = 'VN' }: { onDone: () => void; defaultCountry?: string }) {
  const { reducers, profile } = useApp();
  const { run, busy } = useAction();
  const [country, setCountry] = useState(defaultCountry);
  const [inst, setInst] = useState<Institution>();
  const list = INSTITUTIONS.filter(i => i.country === country);
  const currency = COUNTRIES[country]?.currency ?? 'USD';

  if (!inst) return (
    <div className="space-y-4">
      <SelectField label={t('Country where money should arrive')} value={country} onChange={e => setCountry(e.target.value)}
        options={Object.entries(COUNTRIES).map(([code, c]) => [code, `${countryName(code, c.name)} (${c.currency})`])} />
      <div className="grid grid-cols-2 gap-2">
        {list.map(b => (
          <button key={b.name} type="button" onClick={() => setInst(b)} className="flex items-center gap-3 rounded-xl border p-3 text-left text-sm hover:bg-muted">
            <BankMark name={b.name} className="size-8" />
            <span><span className="block font-medium">{b.name}</span><span className="text-xs text-muted-foreground">{b.kind === 'wallet' ? t('Mobile wallet') : t('Bank')}</span></span>
          </button>
        ))}
      </div>
      <SecurityNote />
    </div>
  );

  const wallet = inst.kind === 'wallet';
  return (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const digits = formValue(f, 'number').replace(/\D/g, '');
      if (await run(() => reducers?.addPaymentMethod({
        purpose: 'receive', institution: inst.name, kind: wallet ? 'wallet' : formValue(f, 'kind'), holderName: formValue(f, 'holder'),
        last4: digits.slice(-4), currency, country,
      }), 'Receiving account added')) onDone();
    }}>
      <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={() => setInst(undefined)}><ArrowLeft />{t('Back')}</Button>
      <div className="flex items-center gap-3"><BankMark name={inst.name} /><div><p className="font-medium">{inst.name}</p><p className="text-xs text-muted-foreground">{t('Deposits arrive in {currency}', { currency })}</p></div></div>
      <TextField name="holder" label={t('Account holder name')} defaultValue={profile?.name} required maxLength={80} />
      <TextField name="number" label={wallet ? t('Phone number on the wallet') : t('Account number')} inputMode="numeric" pattern="[\d\s+\-]{6,24}" required autoComplete="off"
        hint={t('Only the last four digits are saved.')} />
      {!wallet && <SelectField name="kind" label={t('Account type')} options={[['savings', t('Savings')], ['checking', t('Checking / current')]]} />}
      <Button size="lg" className="h-11 w-full" disabled={busy}>{wallet ? <Smartphone /> : <Landmark />}{wallet ? t('Add wallet') : t('Add account')}</Button>
    </form>
  );
}

export function AccountList({ list }: { list: Account[] }) {
  const { reducers } = useApp();
  const { run, busy } = useAction();
  return (
    <div className="surface-card divide-y rounded-2xl border bg-card">
      {list.map(a => (
        <AccountLine key={String(a.id)} a={a} className="px-4 py-3"
          right={<Button variant="ghost" size="icon-sm" aria-label={t('Remove {bank}', { bank: a.institution })} disabled={busy} onClick={() => run(() => reducers?.removePaymentMethod({ id: a.id }), 'Account removed')}><Trash2 /></Button>} />
      ))}
    </div>
  );
}
