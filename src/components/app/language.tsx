import { useEffect } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/data';
import { LANGUAGES, t, useLanguage, type Lang } from '@/lib/i18n';

const ADOPT_KEY = 'bridgehome.lang.adopt';
// Call before switching to a signed-in identity so that device picks up the account's language.
export const adoptAccountLanguage = () => localStorage.setItem(ADOPT_KEY, '1');

// Keeps the account's saved language and this device's language in step. The device choice wins,
// except right after logging in, when the account's language is applied.
export function LanguageSync() {
  const { profile, reducers, isActive } = useApp();
  const { lang, setLang } = useLanguage();
  useEffect(() => {
    if (!profile || !isActive || !reducers) return;
    if (localStorage.getItem(ADOPT_KEY)) {
      localStorage.removeItem(ADOPT_KEY);
      if (LANGUAGES.some(l => l.code === profile.language)) return setLang(profile.language as Lang);
    }
    if (profile.language !== lang) void reducers.setLanguage({ language: lang }).catch(() => {});
  }, [profile, isActive, reducers, lang, setLang]);
  return null;
}

// Compact language picker for headers and sign-in screens.
export function LanguageSelect({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { lang, setLang } = useLanguage();
  return (
    <label className={cn('relative inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground', compact && 'w-11 sm:w-auto', className)}>
      <Globe className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">{t('Language')}</span>
      <select value={lang} onChange={e => setLang(e.target.value as Lang)} className={cn("min-w-0 cursor-pointer appearance-none bg-transparent pr-1 outline-none", compact && "absolute inset-0 h-full w-full opacity-0 sm:static sm:h-auto sm:w-auto sm:opacity-100")}>
        {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
      </select>
    </label>
  );
}
