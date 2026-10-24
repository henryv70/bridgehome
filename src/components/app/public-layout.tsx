import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useApp } from '@/lib/data';
import { buttonVariants } from '@/components/ui/button';
import { Wordmark } from './brand';

export function PublicLayout({ children }: { children: ReactNode }) {
  const { profile, families } = useApp();
  return (
    <div className="min-h-dvh">
      <header className="pt-safe sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 md:px-8">
          <Link to="/explore"><Wordmark /></Link>
          <nav className="flex items-center gap-1">
            <Link to="/how" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>How it works</Link>
            <Link to={profile && families.length ? '/' : '/welcome'} className={buttonVariants({ size: 'sm' })}>{profile && families.length ? 'My family' : 'Get started'}</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16 md:px-8 md:pt-10">{children}</main>
      <footer className="pb-safe border-t py-6 text-center text-xs text-muted-foreground">BridgeHome coordinates family support. It never holds or moves money.</footer>
    </div>
  );
}
