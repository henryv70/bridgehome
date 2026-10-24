import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useTable } from 'spacetimedb/react';
import { ArrowLeft, Loader2, LogIn, TriangleAlert } from 'lucide-react';
import { tables } from '@/module_bindings';
import { errorText, useApp } from '@/lib/data';
import { deriveKeys, newAttemptId, normalizeUsername, switchIdentity, unsealToken } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/app/brand';
import { TextField, formValue } from '@/components/app/kit';
import { USERNAME_PATTERN } from '@/components/app/sign-in';

type Pending = { attempt: string; keys: Awaited<ReturnType<typeof deriveKeys>> };

export default function Login() {
  const { reducers, isActive, profile, families, username } = useApp();
  const [results] = useTable(tables.visibleSignInResult);
  const pending = useRef<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const unsaved = !!profile && families.length > 0 && !username;

  // The sign-in reducer answers through a row only this connection can see.
  useEffect(() => {
    const p = pending.current;
    const result = results.find(r => r.attempt === p?.attempt);
    if (!p || !result) return;
    pending.current = null;
    void reducers?.clearSignInResult({}).catch(() => {});
    if (!result.ok) { setError(result.message); setBusy(false); return; }
    try {
      switchIdentity(unsealToken(p.keys, result.sealedToken));
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }, [results, reducers]);

  return (
    <div className="pt-safe flex min-h-dvh flex-col px-5 py-8 sm:px-10">
      <Link to="/" className="self-start"><Wordmark /></Link>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <form className="space-y-6" onSubmit={async e => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const name = normalizeUsername(formValue(f, 'username'));
          const password = String(f.get('password') ?? '');
          if (!isActive || !reducers) return setError('Still connecting to BridgeHome. Try again in a moment.');
          setError('');
          setBusy(true);
          try {
            const p = { attempt: newAttemptId(), keys: await deriveKeys(name, password) };
            pending.current = p;
            await reducers.signIn({ username: name, authKey: p.keys.authKey, attempt: p.attempt });
          } catch (err) {
            pending.current = null;
            setError(errorText(err));
            setBusy(false);
          }
        }}>
          <div>
            <Button type="button" variant="ghost" size="sm" className="-ml-2 mb-4" onClick={() => history.length > 1 ? history.back() : location.assign('/')}><ArrowLeft />Back</Button>
            <h1 className="text-2xl font-semibold tracking-tight">Log in to BridgeHome</h1>
            <p className="mt-1 text-sm text-muted-foreground">Use the username and password you set up on your first device.</p>
          </div>

          {unsaved && (
            <div role="alert" className="space-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300"><TriangleAlert className="size-4 shrink-0" />This device has unsaved family access</p>
              <p className="text-muted-foreground">You're using BridgeHome here as {profile?.name} without a username. If you log in to another account, you can't get back to {profile?.name}'s families. <Link to="/" className="font-medium text-foreground underline-offset-4 hover:underline">Set up sign-in first</Link> from your profile menu.</p>
            </div>
          )}

          <TextField name="username" label="Username" required minLength={3} maxLength={32} pattern={USERNAME_PATTERN} autoFocus
            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" />
          <TextField name="password" label="Password" type="password" required minLength={8} maxLength={128} autoComplete="current-password" />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button size="lg" className="h-11 w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <LogIn />}{busy ? 'Checking…' : 'Log in'}</Button>
          <p className="text-center text-sm text-muted-foreground">New to BridgeHome? <Link to="/welcome" className="font-medium text-foreground underline-offset-4 hover:underline">Get started</Link></p>
        </form>
      </main>
    </div>
  );
}
