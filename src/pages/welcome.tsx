import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowRight, HandHeart, Home, KeyRound, Send, Sparkles } from 'lucide-react';
import { useAction, useApp } from '@/lib/data';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/app/brand';
import { Choice, TextField, formValue } from '@/components/app/kit';
import { Splash } from '@/components/app/shell';
import { DemoPicker } from '@/components/app/demo-picker';
import { LanguageSelect } from '@/components/app/language';

type Step = 'name' | 'family' | 'create' | 'join';

export default function Welcome() {
  const app = useApp();
  const { reducers, profile, families, ready } = app;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get('code') ?? '';
  const [step, setStep] = useState<Step>((params.get('step') as Step) || 'name');
  const { search } = useLocation();
  const [role, setRole] = useState<'sender' | 'recipient'>(profile?.role === 'recipient' ? 'recipient' : 'sender');
  const { run, busy } = useAction();
  const [demo, setDemo] = useState(false);

  // The profile arrives after the first render; adopt the role chosen at sign-up once it does.
  useEffect(() => { if (profile?.role === 'sender' || profile?.role === 'recipient') setRole(profile.role); }, [profile?.role]);

  // Returning users skip straight to the right step (decided once, on first load).
  const decided = useRef(false);
  useEffect(() => {
    if (!ready || decided.current) return;
    decided.current = true;
    if (params.get('step')) return;
    if (profile && params.get('demo')) { setStep('family'); setDemo(true); }
    else if (profile && code) setStep('join');
    else if (profile && families.length) navigate('/', { replace: true });
    else if (profile) setStep('family');
  }, [ready, profile, families.length, code, params, navigate]);

  if (!ready) return <Splash />;
  // First-time visitors create an account before anything else; invite codes and demo flags carry over.
  if (!profile) return <Navigate to={'/signup' + search} replace />;

  const back = (to: Step) => <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => setStep(to)}><ArrowLeft />{t('Back')}</Button>;

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="dark relative hidden flex-col justify-between overflow-hidden bg-[#102a43] p-12 text-[#f3f7fb] lg:flex">
        <Wordmark />
        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">{t('Support your family across borders, together.')}</h1>
          <ul className="space-y-4 text-white/70">
            <li className="flex gap-3"><HandHeart className="mt-0.5 size-5 shrink-0" />{t('Family back home asks for what they need, with context.')}</li>
            <li className="flex gap-3"><Send className="mt-0.5 size-5 shrink-0" />{t('You approve it, send money however you already do, and record it.')}</li>
            <li className="flex gap-3"><Home className="mt-0.5 size-5 shrink-0" />{t('They confirm it arrived and share how it helped.')}</li>
          </ul>
        </div>
        <p className="text-xs text-white/45">{t('BridgeHome coordinates. It never holds or moves money.')}</p>
      </aside>

      <main className="pt-safe flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <Wordmark className="lg:invisible" />
          <LanguageSelect compact />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {step === 'name' && (
            <form className="space-y-6" onSubmit={async e => {
              e.preventDefault();
              const name = formValue(new FormData(e.currentTarget), 'name');
              if (await run(() => reducers?.saveProfile({ name }))) {
                if (params.get('step') === 'name' && families.length) navigate(-1);
                else { setStep(code ? 'join' : 'family'); if (params.get('demo')) setDemo(true); }
              }
            }}>
              <div>
                <p className="text-sm text-muted-foreground">{code ? t("You've been invited to a family") : t('Welcome')}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t('What should your family call you?')}</h2>
              </div>
              <TextField name="name" label={t('Display name')} placeholder={t('e.g. Marco')} defaultValue={profile?.name} required maxLength={80} autoFocus
                hint={t('Shown to people in your family groups. You can change it later.')} />
              <Button size="lg" className="h-11 w-full" disabled={busy}>{t('Continue')}<ArrowRight /></Button>
              <p className="text-center text-sm text-muted-foreground">{t('Just looking?')} <Link to="/explore" className="font-medium text-foreground underline-offset-4 hover:underline">{t('Explore public families')}</Link></p>
            </form>
          )}

          {step === 'family' && (
            <div className="space-y-6">
              <div>
                {families.length > 0 && back('name')}
                <p className="text-sm text-muted-foreground">{t('Hi {name}', { name: profile?.name ?? '' })}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{t('How would you like to start?')}</h2>
              </div>
              <div className="space-y-3">
                <Choice icon={<Home />} title={t('Start a family group')} onClick={() => setStep('create')}>{t("You'll be the owner and can invite others.")}</Choice>
                <Choice icon={<KeyRound />} title={t('I have an invitation')} onClick={() => setStep('join')}>{t('Join with a link or code from your family.')}</Choice>
                <Choice icon={<Sparkles />} title={t('Try a demo family')} onClick={() => setDemo(true)}>
                  {t('A Vietnamese or Filipino family with requests, bank accounts, budgets, photos and a public page.')}
                </Choice>
              </div>
            </div>
          )}

          {step === 'create' && (
            <form className="space-y-6" onSubmit={async e => {
              e.preventDefault();
              const name = formValue(new FormData(e.currentTarget), 'name');
              if (await run(() => reducers?.createGroup({ name, role }), 'Family created')) navigate('/family?invite=1');
            }}>
              <div>
                {back('family')}
                <h2 className="text-2xl font-semibold tracking-tight">{t('Start your family group')}</h2>
              </div>
              <TextField name="name" label={t('Family name')} placeholder={t('e.g. The Reyes Family')} required maxLength={80} autoFocus />
              <div className="space-y-2">
                <p className="text-[13px] font-medium">{t('Your role')}</p>
                <Choice icon={<Send />} title={t('I send support')} selected={role === 'sender'} onClick={() => setRole('sender')}>
                  {t('You review requests, send money (outside the app), and record what you sent.')}
                </Choice>
                <Choice icon={<HandHeart />} title={t('I receive support')} selected={role === 'recipient'} onClick={() => setRole('recipient')}>
                  {t("You ask for what's needed and confirm what arrives.")}
                </Choice>
              </div>
              <Button size="lg" className="h-11 w-full" disabled={busy}>{t('Create family')}</Button>
            </form>
          )}

          {step === 'join' && (
            <form className="space-y-6" onSubmit={async e => {
              e.preventDefault();
              const value = formValue(new FormData(e.currentTarget), 'code');
              const c = value.includes('code=') ? new URL(value, location.origin).searchParams.get('code') ?? '' : value;
              if (await run(() => reducers?.joinGroup({ code: c }), 'Welcome to the family')) navigate('/');
            }}>
              <div>
                {back('family')}
                <h2 className="text-2xl font-semibold tracking-tight">{t('Join your family')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('Paste the invitation link or code your family owner shared. Each invitation works once and expires after 7 days.')}</p>
              </div>
              <TextField name="code" label={t('Invitation link or code')} defaultValue={code} required autoFocus={!code} />
              <Button size="lg" className="h-11 w-full" disabled={busy}>{t('Join family')}</Button>
            </form>
          )}
        </div>
      </main>
      <DemoPicker open={demo} onOpenChange={setDemo} />
    </div>
  );
}
