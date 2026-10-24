import type { ReactNode } from 'react';
import { t } from '@/lib/i18n';
import { PublicHeader } from './public-header';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <main className="mx-auto w-full min-w-0 max-w-5xl px-4 pt-6 pb-12 md:px-8 md:pt-10 md:pb-16">{children}</main>
      <footer className="pb-safe border-t px-6 py-6 text-center text-xs leading-relaxed text-muted-foreground">{t('BridgeHome coordinates family support. It never holds or moves money.')}</footer>
    </div>
  );
}
