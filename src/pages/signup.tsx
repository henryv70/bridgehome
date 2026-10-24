import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, HandHeart, Loader2, Send, ShieldCheck, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorText, useApp } from '@/lib/data';
import { LANGUAGES, t, useLanguage } from '@/lib/i18n';
import { normalizeUsername, sealToken, storedToken } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/app/brand';
import { Choice, TextField, formValue } from '@/components/app/kit';
import { Splash } from '@/components/app/shell';
import { USERNAME_PATTERN } from '@/components/app/sign-in';

type Role = 'sender' | 'recipient';

// Changing the language re-mounts the whole app, so typed values live outside the component.
const draft = { username: '', role: '' as Role | '' };

export default function SignUp() {
  const { reducers, isActive, ready, profile, username } = useApp();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const { search } = useLocation();
  const [role, setRoleState] = useState(draft.role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const setRole = (r: Role) => { draft.role = r; setRoleState(r); };

  if (!ready) return <Splash />;
  if (profile && username) return <Navigate to={'/welcome' + search} replace />;

  return (
    <div className="pt-safe flex min-h-dvh flex-col px-5 py-8 sm:px-10">
      <div className="flex items-center justify-between gap-3">
        <Link to="/"><Wordmark /></Link>
      </div>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <form className="space-y-6 rounded-3xl bg-card/70 p-5 sm:p-8" onSubmit={async e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const name = normalizeUsername(formValue(f, 'username'));
          const password = String(f.get('password') ?? '');
          if (password !== String(f.get('confirm') ?? '')) return setError(t("The passwords don't match."));
          if (!role) return setError(t('Choose whether you send or receive support.'));
          const token = storedToken();
          if (!token || !isActive || !reducers) return setError(t('Still connecting to BridgeHome. Try again in a moment.'));
          setError('');
          setBusy(true);
          try {
            const sealed = await sealToken(name, password, token);
            await reducers.signUp({ username: name, ...sealed, language: lang, role });
            draft.username = ''; draft.role = '';
            navigate('/welcome' + search, { replace: true });
          } catch (err) {
            setError(errorText(err));
            setBusy(false);
          }
        }}>
          <div>
            <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => history.length > 1 ? history.back() : location.assign('/')}><ArrowLeft />{t('Back')}</Button>
            <h1 className="text-2xl font-semibold tracking-tight">{t('Create your BridgeHome account')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('You can log in with it on any phone or computer.')}</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-[13px] font-medium">{t('Language')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map(l => (
                <button key={l.code} type="button" aria-pressed={lang === l.code} onClick={() => setLang(l.code)}
                  className={cn('h-12 rounded-xl border bg-card/60 text-sm transition hover:border-foreground/30', lang === l.code && 'border-primary bg-card font-semibold text-primary ring-1 ring-primary')}>
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>

          <TextField name="username" label={t('Username')} defaultValue={draft.username} onChange={e => { draft.username = e.target.value; }}
            required minLength={3} maxLength={32} pattern={USERNAME_PATTERN}
            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username"
            hint={t('3 to 32 characters: letters, numbers, dots, dashes or underscores.')} />
          <TextField name="password" label={t('Password')} type="password" required minLength={8} maxLength={128} autoComplete="new-password"
            hint={t('At least 8 characters.')} />
          <TextField name="confirm" label={t('Confirm password')} type="password" required minLength={8} maxLength={128} autoComplete="new-password" />

          <fieldset className="space-y-2">
            <legend className="mb-2 text-[13px] font-medium">{t('I am a…')}</legend>
            <Choice icon={<Send />} title={t('Sender')} selected={role === 'sender'} onClick={() => setRole('sender')}>
              {t('You review requests, send money (outside the app), and record what you sent.')}
            </Choice>
            <Choice icon={<HandHeart />} title={t('Receiver')} selected={role === 'recipient'} onClick={() => setRole('recipient')}>
              {t("You ask for what's needed and confirm what arrives.")}
            </Choice>
          </fieldset>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button size="lg" className="h-11 w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <UserPlus />}{busy ? t('Creating account…') : t('Sign up')}</Button>
          <p className="flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" />{t("Your password never leaves this device. It unlocks a sealed copy of this device's sign-in, so you can log back in here or on another phone or computer.")}</p>
          <p className="text-center text-sm text-muted-foreground">{t('Already have an account?')} <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">{t('Log in')}</Link></p>
        </form>
      </main>
    </div>
  );
}
