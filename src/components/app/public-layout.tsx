import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { useApp } from '@/lib/data';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Wordmark } from './brand';

const publicLinks = [
  { to: '/explore', label: 'Explore' },
  { to: '/give', label: 'Give' },
  { to: '/how', label: 'How it works' },
];

export function PublicLayout({ children }: { children: ReactNode }) {
  const { profile, families } = useApp();
  return (
    <div className="min-h-dvh">
      <header className="pt-safe sticky top-0 z-30 border-b bg-background/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 md:flex md:gap-4 md:px-8">
          <Link to="/explore" aria-label="BridgeHome explore" className="flex min-h-16 min-w-0 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
            <Wordmark className="whitespace-nowrap" />
          </Link>
          <Link to={profile && families.length ? '/' : '/welcome'} className={cn(buttonVariants({ size: 'sm' }), 'h-11 px-4 md:order-last')}>{profile && families.length ? 'My family' : 'Get started'}</Link>
          <nav aria-label="Main navigation" className="col-span-2 grid min-w-0 grid-cols-3 gap-1 pb-2 md:ml-auto md:flex md:pb-0">
            {publicLinks.map(({ to, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'h-11 min-w-0 px-3',
                isActive ? 'bg-muted text-foreground' : 'text-muted-foreground',
              )}>{label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-5xl px-4 pt-6 pb-12 md:px-8 md:pt-10 md:pb-16">{children}</main>
      <footer className="pb-safe border-t px-6 py-6 text-center text-xs leading-relaxed text-muted-foreground">BridgeHome coordinates family support. It never holds or moves money.</footer>
    </div>
  );
}
