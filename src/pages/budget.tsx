import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Target, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAction, useApp } from '@/lib/data';
import { formatMoney, sum, toDecimal, toMinor, toNumber } from '@/lib/money';
import { monthName, shiftMonth, thisMonth, today } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { AreaField, Drawer, Empty, Help, MoneyField, NativeSelect, PageHeader, Panel, Section, SelectField, Stat, TextField, formValue } from '@/components/app/kit';
import { CATEGORIES } from '@/components/app/request-parts';

const trendConfig = {
  income: { label: 'Income', color: 'var(--chart-1)' },
  expenses: { label: 'Spending', color: 'var(--chart-2)' },
} satisfies ChartConfig;
const sentConfig = { sent: { label: 'Sent', color: 'var(--chart-1)' } } satisfies ChartConfig;

type Sheet = 'entry' | 'target' | 'plan' | null;

export default function Budget() {
  const app = useApp();
  const { group, budgets, targets, transfers, commitments, reducers, role } = app;
  const { run, busy } = useAction();
  const [month, setMonth] = useState(thisMonth());
  const currencies = [...new Set([...budgets.map(b => b.currency), ...targets.map(t => t.currency)])];
  const [currencyPick, setCurrency] = useState<string>();
  const currency = currencyPick ?? currencies[0] ?? 'USD';
  const [sheet, setSheet] = useState<Sheet>(null);
  const [targetCategory, setTargetCategory] = useState('');

  const inCur = budgets.filter(b => b.currency === currency);
  const monthRows = inCur.filter(b => b.month === month);
  const income = sum(monthRows.filter(b => b.kind === 'income'), b => b.amount);
  const spent = sum(monthRows.filter(b => b.kind === 'expense'), b => b.amount);
  const left = income - spent;
  const monthTargets = targets.filter(t => t.month === month && t.currency === currency);
  const planned = sum(monthTargets, t => t.amount);

  // Category rows: every category with spending or a target this month.
  const cats = [...new Set([...monthRows.filter(b => b.kind === 'expense').map(b => b.category), ...monthTargets.map(t => t.category)])];
  const rows = cats.map(c => ({
    category: c,
    actual: sum(monthRows.filter(b => b.kind === 'expense' && b.category.toLowerCase() === c.toLowerCase()), b => b.amount),
    target: monthTargets.find(t => t.category.toLowerCase() === c.toLowerCase())?.amount ?? 0n,
  })).sort((a, b) => Number(b.actual - a.actual));
  const scaleMax = rows.reduce((m, r) => [m, r.actual, r.target].reduce((a, b) => (b > a ? b : a)), 1n);

  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const trend = months.map(m => ({
    month: monthName(m, 'short'),
    income: toNumber(sum(inCur.filter(b => b.month === m && b.kind === 'income'), b => b.amount), currency),
    expenses: toNumber(sum(inCur.filter(b => b.month === m && b.kind === 'expense'), b => b.amount), currency),
  }));
  const sentCurrency = transfers[0]?.currency ?? 'USD';
  const sentTrend = months.map(m => ({
    month: monthName(m, 'short'),
    sent: toNumber(sum(transfers.filter(t => t.currency === sentCurrency && t.createdAt.toDate().toISOString().startsWith(m)), t => t.amount), sentCurrency),
  }));
  const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
  const axisMoney = (v: number) => compact.format(v);
  const fmtTip = (cur: string) => (v: unknown) => formatMoney(BigInt(Math.round(Number(v) * 10 ** (cur === 'JPY' ? 0 : 2))), cur);

  const close = () => setSheet(null);
  const openTarget = (c = '') => { setTargetCategory(c); setSheet('target'); };

  return (
    <div className="space-y-8">
      <PageHeader title="Budget" subtitle="What the household brings in, spends and plans for. Everything is self-reported."
        actions={<Button size="lg" onClick={() => setSheet('entry')}><Plus />Add entry</Button>} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border bg-card">
          <Button variant="ghost" size="icon-lg" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft /></Button>
          <span className="tabular w-36 text-center text-sm font-medium">{monthName(month)}</span>
          <Button variant="ghost" size="icon-lg" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight /></Button>
        </div>
        {currencies.length > 1 && (
          <NativeSelect value={currency} onChange={e => setCurrency(e.target.value)} className="h-9 w-auto" aria-label="Currency">
            {currencies.map(c => <option key={c}>{c}</option>)}
          </NativeSelect>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Income" value={formatMoney(income, currency)} />
        <Stat label="Spending" value={formatMoney(spent, currency)} sub={planned ? `of ${formatMoney(planned, currency)} planned` : undefined} />
        <Stat label={left >= 0n ? 'Left over' : 'Short by'} value={formatMoney(left >= 0n ? left : -left, currency)} className={left < 0n ? 'border-critical/40' : ''}
          sub={left < 0n ? 'Spending is above income' : undefined} />
        <Stat label="Monthly support plans" value={commitments.filter(c => c.cadence === 'monthly').length} sub="Commitments from senders" />
      </div>

      <Section title="Spending vs. plan" action={<Button variant="ghost" size="sm" onClick={() => openTarget()}><Target />Set a plan</Button>}>
        {rows.length ? (
          <Panel className="space-y-4">
            {rows.map(r => {
              const over = r.target > 0n && r.actual > r.target;
              return (
                <button key={r.category} type="button" className="block w-full text-left" onClick={() => openTarget(r.category)} title="Set plan">
                  <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{r.category}</span>
                    <span className="tabular text-muted-foreground">
                      <span className="text-foreground">{formatMoney(r.actual, currency)}</span>{r.target > 0n && ` / ${formatMoney(r.target, currency)}`}
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-muted">
                    <div className={cn('absolute inset-y-0 left-0 rounded-full', over ? 'bg-critical' : 'bg-chart-1')} style={{ width: `${Number((r.actual * 1000n) / scaleMax) / 10}%` }} />
                    {r.target > 0n && <div className="absolute -inset-y-1 w-0.5 rounded bg-foreground" style={{ left: `calc(${Number((r.target * 1000n) / scaleMax) / 10}% - 1px)` }} aria-hidden />}
                  </div>
                  {over && <p className="mt-1 flex items-center gap-1 text-xs text-critical"><AlertTriangle className="size-3" />Over plan by {formatMoney(r.actual - r.target, currency)}</p>}
                  {!r.target && <p className="mt-1 text-xs text-muted-foreground">No plan yet. Tap to set one.</p>}
                </button>
              );
            })}
            <p className="flex items-center gap-2 pt-1 text-xs text-muted-foreground"><span className="inline-block h-3 w-0.5 bg-foreground" />Plan for the month</p>
          </Panel>
        ) : (
          <Empty title={`Nothing recorded for ${monthName(month)}`} action={<Button variant="outline" onClick={() => setSheet('entry')}><Plus />Add the first entry</Button>}>
            Add income and spending as it happens. Set a plan per category to see how the month is going.
          </Empty>
        )}
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={`Income and spending · last 6 months · ${currency}`}>
          <Panel>
            <ChartContainer config={trendConfig} className="aspect-auto h-56 w-full">
              <BarChart data={trend} barGap={2} margin={{ left: -12, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} strokeOpacity={0.5} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={58} tickFormatter={axisMoney} />
                <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent formatter={(v, n) => <span className="flex w-full justify-between gap-4"><span className="text-muted-foreground">{trendConfig[n as keyof typeof trendConfig]?.label}</span><span className="tabular font-medium">{fmtTip(currency)(v)}</span></span>} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          </Panel>
        </Section>
        <Section title={<span className="inline-flex items-center gap-1">Support sent · {sentCurrency} <Help>Recorded transfers by month, not counting fees. Money moves outside BridgeHome; senders record it here.</Help></span>}>
          <Panel>
            <ChartContainer config={sentConfig} className="aspect-auto h-56 w-full">
              <BarChart data={sentTrend} margin={{ left: -12, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} strokeOpacity={0.5} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={58} tickFormatter={axisMoney} />
                <ChartTooltip cursor={{ fillOpacity: 0.4 }} content={<ChartTooltipContent hideIndicator formatter={v => <span className="tabular font-medium">{fmtTip(sentCurrency)(v)} sent</span>} />} />
                <Bar dataKey="sent" fill="var(--color-sent)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
          </Panel>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={`Entries · ${monthName(month)}`}>
          {monthRows.length ? (
            <div className="divide-y rounded-2xl border bg-card">
              {monthRows.map(b => (
                <div key={String(b.id)} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{b.category}</p>
                    <p className="truncate text-xs text-muted-foreground">{b.explanation} · {app.nameOf(b.author)}</p>
                  </div>
                  <p className={cn('tabular text-sm font-medium', b.kind === 'income' && 'text-good')}>{b.kind === 'income' ? '+' : '−'}{formatMoney(b.amount, b.currency)}</p>
                  {app.isMe(b.author) && (
                    <Button variant="ghost" size="icon-sm" aria-label="Remove entry" disabled={busy} onClick={() => run(() => reducers?.deleteBudget({ budgetId: b.id }), 'Entry removed')}><Trash2 /></Button>
                  )}
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">No entries this month.</p>}
        </Section>

        <Section title="Support plans" action={role === 'sender' && <Button variant="ghost" size="sm" onClick={() => setSheet('plan')}><Plus />Add plan</Button>}>
          {commitments.length ? (
            <div className="divide-y rounded-2xl border bg-card">
              {commitments.map(c => (
                <div key={String(c.id)} className="px-4 py-3">
                  <p className="tabular text-sm font-medium">{formatMoney(c.amount, c.currency)} {c.cadence === 'monthly' ? 'every month' : 'once'}</p>
                  <p className="text-xs text-muted-foreground">{c.note} · {app.nameOf(c.author)} · from {c.startDate}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted-foreground">{role === 'sender' ? 'Let your family know what they can count on each month.' : 'Senders can share what support they plan to give each month.'}</p>}
          <p className="text-xs text-muted-foreground">Plans are promises, not scheduled payments. Nothing is sent automatically.</p>
        </Section>
      </div>

      <Drawer open={sheet === 'entry'} onOpenChange={o => !o && close()} title="Add a budget entry" description="Record income or spending for the household.">
        <form className="space-y-4" onSubmit={async e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const c = formValue(f, 'currency');
          if (await run(() => reducers?.addBudget({ groupId: group!.id, kind: formValue(f, 'kind'), category: formValue(f, 'category'), amount: toMinor(formValue(f, 'amount'), c), currency: c, month: formValue(f, 'month'), explanation: formValue(f, 'explanation') }), 'Entry added')) close();
        }}>
          <SelectField name="kind" label="Type" options={[['expense', 'Spending'], ['income', 'Income']]} />
          <TextField name="category" label="Category" list="budget-categories" placeholder="e.g. Groceries" required maxLength={80} />
          <datalist id="budget-categories">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
          <MoneyField label="Amount" currency={currency} />
          <TextField name="month" label="Month" type="month" defaultValue={month} required />
          <AreaField name="explanation" label="Note" placeholder="e.g. Weekly market run" required maxLength={1000} />
          <Button size="lg" className="h-11 w-full" disabled={busy}>Add entry</Button>
        </form>
      </Drawer>

      <Drawer open={sheet === 'target'} onOpenChange={o => !o && close()} title={`Plan for ${monthName(month)}`} description="How much the household expects to spend in a category. Use 0 to remove a plan.">
        <form key={targetCategory} className="space-y-4" onSubmit={async e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (await run(() => reducers?.setBudgetTarget({ groupId: group!.id, month, category: formValue(f, 'category'), currency, amount: toMinor(formValue(f, 'amount'), currency) }), 'Plan saved')) close();
        }}>
          <TextField name="category" label="Category" list="target-categories" defaultValue={targetCategory} required maxLength={80} />
          <datalist id="target-categories">{CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
          <MoneyField label="Planned amount" currency={currency} lockCurrency
            defaultValue={(() => { const t = monthTargets.find(x => x.category.toLowerCase() === targetCategory.toLowerCase()); return t ? toDecimal(t.amount, currency) : undefined; })()} />
          <Button size="lg" className="h-11 w-full" disabled={busy}>Save plan</Button>
        </form>
      </Drawer>

      <Drawer open={sheet === 'plan'} onOpenChange={o => !o && close()} title="Add a support plan" description="Share what your family can count on. It doesn't send money.">
        <form className="space-y-4" onSubmit={async e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const c = formValue(f, 'currency');
          if (await run(() => reducers?.addCommitment({ groupId: group!.id, amount: toMinor(formValue(f, 'amount'), c), currency: c, cadence: formValue(f, 'cadence'), startDate: formValue(f, 'startDate'), note: formValue(f, 'note') }), 'Plan shared')) close();
        }}>
          <MoneyField label="Amount" currency="USD" />
          <SelectField name="cadence" label="How often" options={[['monthly', 'Every month'], ['once', 'One time']]} />
          <TextField name="startDate" label="Starting" type="date" defaultValue={today()} required />
          <AreaField name="note" label="What it covers" placeholder="e.g. Base household costs" required maxLength={1000} />
          <Button size="lg" className="h-11 w-full" disabled={busy}>Share plan</Button>
        </form>
      </Drawer>
    </div>
  );
}
