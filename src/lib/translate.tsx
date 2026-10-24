import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorText, useApp } from './data';
import { lang, t, type Lang } from './i18n';

// Translation of what family members write. Translations are made on the server (see
// spacetimedb/src/translate.ts) and cached per family, so each message is translated once.
export type SourceKind = 'request' | 'comment' | 'post';

// Cheap script check: Han characters → Chinese, Vietnamese-only letters → Vietnamese, else English.
const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
export function detectLang(text: string): Lang {
  const han = text.match(/[㐀-鿿]/g)?.length ?? 0;
  if (han && han * 3 >= text.replace(/\s/g, '').length) return 'zh';
  return VI.test(text) ? 'vi' : 'en';
}

// Per-device setting, on by default.
const AUTO_KEY = 'bridgehome.autoTranslate';
const listeners = new Set<() => void>();
const readAuto = () => { try { return localStorage.getItem(AUTO_KEY) !== 'off'; } catch { return true; } };
export function setAutoTranslate(on: boolean) {
  try { localStorage.setItem(AUTO_KEY, on ? 'on' : 'off'); } catch { /* storage unavailable */ }
  listeners.forEach(l => l());
}
export const useAutoTranslate = () => useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, readAuto);

// Results from this session (also covers public posts, whose translations aren't in the family view).
const results = new Map<string, Promise<string>>();
let running = 0;
const waiting: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>) {
  if (running >= 3) await new Promise<void>(r => waiting.push(r));
  running++;
  try { return await fn(); } finally { running--; waiting.shift()?.(); }
}

export function useTranslated(kind: SourceKind, id: bigint, text: string) {
  const app = useApp();
  const to = lang();
  const auto = useAutoTranslate();
  const source = `${kind}:${id}`;
  const key = `${source}|${to}|${text}`;
  const cached = app.translations.find(r => r.source === source && r.lang === to && r.original === text)?.text;
  const [fetched, setFetched] = useState<string>();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');
  const [original, setOriginal] = useState(false);
  const translation = cached ?? fetched;
  const foreign = !!text.trim() && detectLang(text) !== to;
  const available = app.translationEnabled && !!app.procedures;

  const request = useCallback(() => {
    if (!app.procedures) return;
    const procedures = app.procedures;
    let job = results.get(key);
    if (!job) {
      job = limited(() => procedures.translateContent({ kind, id, lang: to }));
      results.set(key, job);
      job.catch(() => results.delete(key));
    }
    setStatus('loading');
    job.then(r => { setFetched(r); setStatus('idle'); }, e => { setError(errorText(e)); setStatus('error'); });
  }, [app.procedures, key, kind, id, to]);

  useEffect(() => {
    if (auto && available && foreign && !translation && status === 'idle') request();
  }, [auto, available, foreign, translation, status, request]);

  const showing = !!translation && !original;
  return {
    text: showing ? translation : text,
    translated: showing,
    canTranslate: available && foreign,
    loading: status === 'loading',
    error: status === 'error' ? error : '',
    translate: () => { setOriginal(false); if (!translation) request(); },
    showOriginal: () => setOriginal(true),
  };
}

// The small "Translate · Show original" control under a message.
export function TranslateToggle({ state, className }: { state: ReturnType<typeof useTranslated>; className?: string }) {
  if (!state.canTranslate && !state.translated) return null;
  const link = 'underline-offset-4 hover:text-foreground hover:underline';
  return (
    <p className={cn('flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <Languages className="size-3.5 shrink-0" aria-hidden />
      {state.loading ? <span className="flex items-center gap-1"><Loader2 className="size-3 animate-spin" />{t('Translating…')}</span>
        : state.translated ? <>{t('Translated')} · <button type="button" className={link} onClick={state.showOriginal}>{t('Show original')}</button></>
          : <button type="button" className={link} onClick={state.translate} title={state.error || undefined}>{state.error ? t('Translation failed. Try again') : t('Translate')}</button>}
    </p>
  );
}

// A message with its translation control, for places that show the full text.
export function TranslatedText({ kind, id, text, className, as: Tag = 'p' }: { kind: SourceKind; id: bigint; text: string; className?: string; as?: 'p' | 'span' }) {
  const state = useTranslated(kind, id, text);
  return (
    <>
      <Tag className={className} lang={state.translated ? lang() : undefined}>{state.text}</Tag>
      <TranslateToggle state={state} className="mt-1" />
    </>
  );
}
