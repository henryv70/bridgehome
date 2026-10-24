import { useState } from 'react';
import { KeyRound, LogOut, ShieldCheck, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useApp, errorText } from '@/lib/data';
import { normalizeUsername, sealToken, storedToken, switchIdentity } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { TextField, formValue } from './kit';

export const USERNAME_PATTERN = '[A-Za-z0-9][A-Za-z0-9._\\-]{2,31}';
const PRIVACY_NOTE = 'Your password never leaves this device. It unlocks a sealed copy of this device\'s sign-in, so you can log back in here or on another phone or computer.';

// Creates or changes the username and password used to log back in.
export function CredentialForm({ submitLabel, onDone }: { submitLabel: string; onDone: () => void }) {
  const { reducers, username, isActive } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const name = normalizeUsername(formValue(f, 'username'));
      const password = String(f.get('password') ?? '');
      if (password !== String(f.get('confirm') ?? '')) return setError("The passwords don't match.");
      const token = storedToken();
      if (!token || !isActive || !reducers) return setError('Still connecting to BridgeHome. Try again in a moment.');
      setError('');
      setBusy(true);
      try {
        const sealed = await sealToken(name, password, token);
        await reducers.setCredential({ username: name, ...sealed });
        toast.success(username ? 'Sign-in updated' : 'Sign-in saved');
        onDone();
      } catch (err) {
        setError(errorText(err));
      } finally {
        setBusy(false);
      }
    }}>
      <TextField name="username" label="Username" defaultValue={username} required minLength={3} maxLength={32} pattern={USERNAME_PATTERN}
        autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username"
        hint="3 to 32 characters: letters, numbers, dots, dashes or underscores." />
      <TextField name="password" label={username ? 'New password' : 'Password'} type="password" required minLength={8} maxLength={128} autoComplete="new-password"
        hint="At least 8 characters." />
      <TextField name="confirm" label="Confirm password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button size="lg" className="h-11 w-full" disabled={busy}><KeyRound />{busy ? 'Saving…' : submitLabel}</Button>
      <p className="flex gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0" />{PRIVACY_NOTE}</p>
    </form>
  );
}

// Logging out forgets this device's identity, so make sure the person can get back in first.
export function SignOutPanel() {
  const { username } = useApp();
  const [confirming, setConfirming] = useState(false);

  if (username) return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">You'll be logged out on this device. To come back, log in with your username <b className="font-medium text-foreground">{username}</b> and your password.</p>
      <Button size="lg" className="h-11 w-full" onClick={() => switchIdentity()}><LogOut />Log out</Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div role="alert" className="space-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <p className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300"><TriangleAlert className="size-4 shrink-0" />Set a username and password first</p>
        <p className="text-muted-foreground">You haven't set up sign-in yet. Without it, you can't log back in to your families after logging out.</p>
      </div>
      <CredentialForm submitLabel="Save and log out" onDone={() => switchIdentity()} />
      <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={() => confirming ? switchIdentity() : setConfirming(true)}>
        {confirming ? 'Tap again: I understand I will lose access' : 'Log out without saving'}
      </Button>
    </div>
  );
}
