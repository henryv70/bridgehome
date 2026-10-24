import { useId, type ComponentProps, type ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CURRENCIES } from '@/lib/money';
import { STATUS } from '@/lib/status';
import { t } from '@/lib/i18n';
import { usePhotoUrl } from '@/lib/photo';
import { useIsMobile } from '@/hooks/use-media';

// Large selectable card for one-of-a-few choices (role, how to start).
export function Choice({ icon, title, children, onClick, selected }: { icon: ReactNode; title: string; children: ReactNode; onClick: () => void; selected?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={cn('flex w-full items-start gap-4 surface-card flex-1 rounded-2xl border bg-card p-4 text-left transition hover:border-primary/30 hover:shadow-sm', selected && 'border-primary bg-accent ring-1 ring-primary')}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary [&_svg]:size-5">{icon}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{children}</span>
      </span>
    </button>
  );
}

export function PageHeader({ title, subtitle, actions, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <header className={cn('mb-6 flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-bold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Section({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('space-y-3', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Panel({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('surface-card rounded-2xl border bg-card p-4 md:p-5', className)} {...props} />;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'bg-muted', about: '' };
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap', s.tone, className)} />}>
        {s.label}
      </TooltipTrigger>
      <TooltipContent className="max-w-60">{s.about}</TooltipContent>
    </Tooltip>
  );
}

// Tap-friendly explanation (tooltips do not open on touch screens).
export function Help({ children }: { children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger render={<button type="button" className="inline-flex align-middle text-muted-foreground hover:text-foreground" aria-label={t('More info')} />}>
        <CircleHelp className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm">{children}</PopoverContent>
    </Popover>
  );
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id} className="text-[13px]">{label}</Label>
      {children(id)}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function TextField({ label, hint, className, ...props }: { label: ReactNode; hint?: ReactNode } & ComponentProps<typeof Input>) {
  return <Field label={label} hint={hint} className={className}>{id => <Input id={id} className="h-12 bg-card" {...props} />}</Field>;
}

export function AreaField({ label, hint, className, ...props }: { label: ReactNode; hint?: ReactNode } & ComponentProps<typeof Textarea>) {
  return <Field label={label} hint={hint} className={className}>{id => <Textarea id={id} rows={3} {...props} />}</Field>;
}

export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn('h-12 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-base outline-none md:text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30', className)}
      {...props}
    />
  );
}

export function SelectField({ label, hint, options, className, ...props }: { label: ReactNode; hint?: ReactNode; options: (string | [string, string])[] } & ComponentProps<'select'>) {
  return (
    <Field label={label} hint={hint} className={className}>
      {id => (
        <NativeSelect id={id} {...props}>
          {options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <option key={v} value={v}>{l}</option>; })}
        </NativeSelect>
      )}
    </Field>
  );
}

// Amount with its currency next to it, as one control.
export function MoneyField({ label, hint, name = 'amount', currencyName = 'currency', currency, defaultValue, value, onValueChange, lockCurrency, onCurrencyChange }: {
  label: ReactNode; hint?: ReactNode; name?: string; currencyName?: string; currency?: string; defaultValue?: string; lockCurrency?: boolean;
  value?: string; onValueChange?: (v: string) => void; onCurrencyChange?: (c: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      {id => (
        <div className="flex rounded-xl border border-input bg-card focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30">
          <input id={id} name={name} inputMode="decimal" autoComplete="off" required placeholder="0.00"
            {...(onValueChange ? { value, onChange: e => onValueChange(e.target.value) } : { defaultValue })}
            className="tabular h-12 min-w-0 flex-1 bg-transparent px-3 text-base outline-none md:text-sm" />
          {lockCurrency
            ? <span className="flex items-center border-l px-3 text-sm text-muted-foreground">{currency}<input type="hidden" name={currencyName} value={currency} /></span>
            : <select name={currencyName} defaultValue={currency ?? 'USD'} onChange={e => onCurrencyChange?.(e.target.value)} aria-label={t('Currency')}
                className="border-l bg-transparent px-2 text-sm outline-none">
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>}
        </div>
      )}
    </Field>
  );
}

const AVATAR_TONES = ['bg-sky-100 text-sky-800', 'bg-amber-100 text-amber-800', 'bg-emerald-100 text-emerald-800', 'bg-rose-100 text-rose-800', 'bg-violet-100 text-violet-800', 'bg-slate-200 text-slate-800'];
export function Initials({ name, className }: { name: string; className?: string }) {
  const tone = AVATAR_TONES[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  const letters = name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return <span aria-hidden className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold dark:opacity-90', tone, className)}>{letters || '?'}</span>;
}

export function Photo({ bytes, type, url: src, alt, className }: { bytes: Uint8Array; type: string; url?: string; alt: string; className?: string }) {
  const blobUrl = usePhotoUrl(src ? undefined : bytes, type);
  const url = src || blobUrl;
  return url ? <img src={url} alt={alt} loading="lazy" className={cn('object-cover', className)} /> : <div className={cn('animate-pulse bg-muted', className)} />;
}

export function Empty({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="surface-card flex flex-col items-center rounded-2xl border bg-card px-6 py-12 text-center">
      {icon && <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-secondary text-primary [&_svg]:size-6">{icon}</div>}
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Bottom sheet on phones, side panel on larger screens.
export function Drawer({ open, onOpenChange, title, description, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode; children: ReactNode;
}) {
  const mobile = useIsMobile();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={mobile ? 'bottom' : 'right'} className={cn('gap-0 bg-background', mobile ? 'max-h-[92dvh] rounded-t-3xl' : 'w-full sm:max-w-md')}>
        <SheetHeader className="border-b px-5 py-5">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-safe">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

export function Stat({ label, value, sub, className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn('surface-card rounded-2xl border bg-card p-4', className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold tracking-tight md:text-2xl">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export const formValue = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
