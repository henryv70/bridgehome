import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { t } from '@/lib/i18n';
import { formatMoney, toDecimal, toMinor } from '@/lib/money';
import { monthName } from '@/lib/time';
import { suggestBudget } from '@/lib/budget';
import { Button } from '@/components/ui/button';
import { MoneyField, Panel } from './kit';

export function StarterBudget({ income, currency, month, busy, onApply }: {
  income: bigint; currency: string; month: string; busy: boolean;
  onApply: (income: bigint, currency: string) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState(income > 0n ? toDecimal(income, currency) : '');
  const [chosenCurrency, setCurrency] = useState(currency);
  const [error, setError] = useState('');
  let total = 0n;
  try { total = toMinor(amount, chosenCurrency); } catch { /* Percentages are still useful before income is entered. */ }
  const suggestions = suggestBudget(total);

  return (
    <Panel className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-brand" />{t('A starting budget for your family')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('Start with the 50/30/20 guide: 50% for needs, 30% for wants, and 20% for savings or debt. Adjust it to fit your household.')}</p>
      </div>
      <form className="space-y-4" onSubmit={async e => {
        e.preventDefault();
        setError('');
        try {
          const parsed = toMinor(amount, chosenCurrency);
          if (parsed <= 0n || parsed > 1_000_000_000_000n) throw Error(t('Enter a monthly income greater than 0 and within the supported amount range.'));
          await onApply(parsed, chosenCurrency);
        } catch (err) { setError(err instanceof Error ? err.message : t('Check your monthly income.')); }
      }}>
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <MoneyField label={t('Monthly take-home income')} hint={t('Include regular support your household receives. This only calculates a plan; it does not record income.')}
            value={amount} onValueChange={setAmount} currency={chosenCurrency} onCurrencyChange={c => { setCurrency(c); setAmount(''); setError(''); }} />
          <div className="divide-y rounded-xl border">
            {suggestions.map(p => (
              <div key={p.category} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span className="min-w-0">{t(p.category)}<span className="ml-2 text-xs text-muted-foreground">{p.percent}%</span></span>
                <span className="tabular shrink-0 font-medium">{total > 0n ? formatMoney(p.amount, chosenCurrency) : '—'}</span>
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{t('The category split is a suggestion. Save it for {month}, then tap any category to change its amount. Existing plans are kept.', { month: monthName(month) })} <a href="https://files.consumerfinance.gov/f/documents/cfpb_worksheet_my-spending-rule-to-live-by.pdf" target="_blank" rel="noreferrer" className="underline underline-offset-2">{t('About the 50/30/20 guide')}</a></p>
          {error && <p role="alert" className="text-sm text-critical">{error}</p>}
          <Button type="submit" className="h-11 w-full sm:w-auto" disabled={busy}>{busy ? t('Saving…') : t('Use suggested budget')}</Button>
        </fieldset>
      </form>
    </Panel>
  );
}
