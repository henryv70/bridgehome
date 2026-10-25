import { useId, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Menu, X } from 'lucide-react';
import { useApp } from '@/lib/data';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { Wordmark } from './brand';
import { LanguageSelect } from './language';

const links = [
  { to: '/explore', label: 'Explore' },
  { to: '/give', label: 'Give' },
  { to: '/how', label: 'How it works' },
];

export function PublicHeader() {
  const { profile, families } = useApp();
  const signedIn = !!profile && families.length > 0;
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);
  const primary = { to: signedIn ? '/' : '/signup', label: signedIn ? t('My family') : t('Get started') };
  const navigation = links.map(({ to, label }) => (
    <NavLink key={to} to={to} aria-label={to === '/explore' ? t('BridgeHome explore') : undefined} onClick={close} className={({ isActive }) => cn(
      'flex min-h-11 min-w-0 items-center rounded-xl px-3 py-2 text-sm leading-snug transition-colors hover:bg-accent hover:text-primary',
      isActive ? 'bg-accent font-medium text-primary' : 'text-muted-foreground',
    )}>{t(label)}</NavLink>
  ));
  return (
    <header onKeyDown={e => { if (e.key === 'Escape') { close(); toggle.current?.focus(); } }} className="pt-safe sticky top-0 z-40 border-b border-border/60 bg-background">
      <div className="mx-auto flex min-h-14 max-w-6xl sm:min-h-16 items-center justify-between gap-2 px-4 sm:px-6 lg:gap-4 lg:px-8">
        <Link to={signedIn ? '/about' : '/'} onClick={close} className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-ring"><Wordmark /></Link>
        <nav aria-label={t('Main navigation')} className="ml-auto hidden min-w-0 flex-wrap items-center gap-1 lg:flex">{navigation}</nav>
        <div className="flex shrink-0 items-center gap-1">
          <LanguageSelect compact />
          <div className="hidden items-center gap-1 lg:flex">
            {!signedIn && <Link to="/login" className={buttonVariants({ variant: 'ghost' })}>{t('Log in')}</Link>}
            <Link to={primary.to} className={cn(buttonVariants(), 'rounded-lg')}>{primary.label}</Link>
          </div>
          <Button ref={toggle} type="button" variant="ghost" size="icon" className="lg:hidden" aria-label={open ? t('Close') : t('Main navigation')}
            aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
        </div>
      </div>
      {open && <nav id={menuId} aria-label={t('Main navigation')} className="mobile-menu mx-4 mb-3 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-2xl border bg-card p-2 shadow-sm lg:hidden"
        onKeyDown={e => { if (e.key === 'Escape') { close(); toggle.current?.focus(); } }}>
        {navigation}
        <div className="mt-2 grid grid-cols-2 gap-2 border-t pt-3">
          {!signedIn && <Link to="/login" onClick={close} className={cn(buttonVariants({ variant: 'outline' }), 'h-auto min-h-11 whitespace-normal py-2')}>{t('Log in')}</Link>}
          <Link to={primary.to} onClick={close} className={cn(buttonVariants(), 'h-auto min-h-11 whitespace-normal py-2', signedIn && 'col-span-2')}>{primary.label}</Link>
        </div>
      </nav>}
    </header>
  );
}
