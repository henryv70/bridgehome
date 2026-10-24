import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LANGUAGES, t, useLanguage, type Lang } from '@/lib/i18n';

// Compact language picker for headers and sign-in screens.
export function LanguageSelect({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  return (
    <label className={cn('relative inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground', className)}>
      <Globe className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">{t('Language')}</span>
      <select value={lang} onChange={e => setLang(e.target.value as Lang)} className="cursor-pointer appearance-none bg-transparent pr-1 outline-none">
        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
