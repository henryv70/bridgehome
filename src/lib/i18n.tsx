import { createContext, Fragment, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import vi from '@/locales/vi';
import zh from '@/locales/zh';

// Interface translation. English text is the key, so untranslated strings fall back to English.
// What family members type (requests, comments, captions) is shown as written.
export type Lang = 'en' | 'vi' | 'zh';
export const LANGUAGES: { code: Lang; label: string; locale: string }[] = [
  { code: 'en', label: 'English', locale: 'en-US' },
  { code: 'vi', label: 'Tiếng Việt', locale: 'vi-VN' },
  { code: 'zh', label: '简体中文', locale: 'zh-CN' },
];
const DICTIONARIES: Record<Lang, Record<string, string>> = { en: {}, vi, zh };
const KEY = 'bridgehome.lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'vi' || saved === 'zh') return saved;
  } catch { /* storage unavailable */ }
  for (const l of navigator.languages ?? [navigator.language]) {
    const code = l.slice(0, 2).toLowerCase();
    if (code === 'vi' || code === 'zh' || code === 'en') return code;
  }
  return 'en';
}

// Module-level so plain helpers (status text, dates, errors) can translate too.
let current: Lang = detect();
export const lang = () => current;
export const locale = () => LANGUAGES.find(l => l.code === current)!.locale;

type Vars = Record<string, string | number>;
export function t(text: string, vars?: Vars) {
  const s = DICTIONARIES[current][text] ?? text;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
}
// English singular/plural; Vietnamese and Chinese use the plural entry for every count.
export const tn = (one: string, other: string, n: number, vars?: Vars) => t(n === 1 ? one : other, { n, ...vars });

const displayNames = (type: 'region' | 'currency') => {
  try { return new Intl.DisplayNames([locale()], { type }); } catch { return null; }
};
export const countryName = (code: string, fallback: string) => displayNames('region')?.of(code) ?? fallback;
export const currencyLabel = (code: string, fallback: string) => displayNames('currency')?.of(code) ?? fallback;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void } | null>(null);

// Re-renders the app under a new key when the language changes, so every t() call re-runs.
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<Lang>(current);
  useEffect(() => { document.documentElement.lang = value; }, [value]);
  const setLang = useCallback((l: Lang) => {
    current = l;
    try { localStorage.setItem(KEY, l); } catch { /* storage unavailable */ }
    setValue(l);
  }, []);
  return <LangContext.Provider value={{ lang: value, setLang }}><Fragment key={value}>{children}</Fragment></LangContext.Provider>;
}

export function useLanguage() {
  const v = useContext(LangContext);
  if (!v) throw Error('useLanguage must be used inside LanguageProvider');
  return v;
}
