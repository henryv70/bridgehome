import { t } from 'spacetimedb/server';
import { Timestamp } from 'spacetimedb';
import db from './schema';
import { LANGUAGES, ROLES, fail, type Ctx } from './lib';

// Username sign-in (see `credential` in schema.ts). The auth key only gates who may fetch the
// sealed token; without the password-derived encryption key it cannot be unsealed, so it is
// stored as sent.
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const KEY = /^[0-9a-f]{64}$/;
const MAX_FAILURES = 5;
const LOCK_MICROS = 5n * 60_000_000n;

type CredentialArgs = { username: string; authKey: string; sealedToken: string };

function writeCredential(ctx: Ctx, a: CredentialArgs) {
  const username = a.username.trim().toLowerCase();
  if (!USERNAME.test(username)) fail('Usernames are 3 to 32 characters: lowercase letters, numbers, dots, dashes or underscores.');
  if (!KEY.test(a.authKey) || !/^[0-9a-f]{100,16000}$/.test(a.sealedToken)) fail('Sign-in details are malformed. Reload and try again.');
  const taken = ctx.db.credential.username.find(username);
  if (taken && !taken.identity.isEqual(ctx.sender)) fail('That username is taken. Try another.');
  const row = {
    identity: ctx.sender, username, authKey: a.authKey, sealedToken: a.sealedToken,
    failures: 0, lockedUntil: new Timestamp(0n), createdAt: ctx.timestamp,
  };
  if (ctx.db.credential.identity.find(ctx.sender)) ctx.db.credential.identity.update(row);
  else ctx.db.credential.insert(row);
  return username;
}

export const setCredential = db.reducer({ username: t.string(), authKey: t.string(), sealedToken: t.string() }, (ctx, a) => {
  if (!ctx.db.profile.identity.find(ctx.sender)) fail('Choose a display name before setting up sign-in.');
  writeCredential(ctx, a);
});

// First-time sign-up: creates the profile and its sign-in together. The username doubles as the
// display name until the person changes it.
export const signUp = db.reducer({
  username: t.string(), authKey: t.string(), sealedToken: t.string(), language: t.string(), role: t.string(),
}, (ctx, a) => {
  if (ctx.db.credential.identity.find(ctx.sender)) fail('This device already has an account. Log out to create another.');
  if (!LANGUAGES.includes(a.language)) fail('Choose a language.');
  if (!ROLES.includes(a.role)) fail('Choose whether you send or receive support.');
  const username = writeCredential(ctx, a);
  const existing = ctx.db.profile.identity.find(ctx.sender);
  if (existing) ctx.db.profile.identity.update({ ...existing, language: a.language, role: a.role });
  else ctx.db.profile.insert({ identity: ctx.sender, name: username, language: a.language, role: a.role });
});

export const removeCredential = db.reducer(ctx => {
  ctx.db.credential.identity.delete(ctx.sender);
});

// Never throws on a wrong password, so the failure count survives (a failed reducer rolls back).
export const signIn = db.reducer({ username: t.string(), authKey: t.string(), attempt: t.string() }, (ctx, a) => {
  if (!/^[0-9a-f]{8,64}$/.test(a.attempt)) fail('Invalid sign-in attempt.');
  const now = ctx.timestamp.microsSinceUnixEpoch;
  const c = ctx.db.credential.username.find(a.username.trim().toLowerCase());
  let ok = false, message = 'Username or password is incorrect.';
  if (c && c.lockedUntil.microsSinceUnixEpoch > now) {
    const minutes = Number((c.lockedUntil.microsSinceUnixEpoch - now) / 60_000_000n) + 1;
    message = `Too many attempts. Try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
  } else if (c && c.authKey === a.authKey) {
    ok = true; message = '';
    ctx.db.credential.identity.update({ ...c, failures: 0 });
  } else if (c) {
    const failures = c.failures + 1;
    const locked = failures >= MAX_FAILURES;
    ctx.db.credential.identity.update({
      ...c, failures: locked ? 0 : failures, lockedUntil: locked ? new Timestamp(now + LOCK_MICROS) : c.lockedUntil,
    });
  }
  const row = { identity: ctx.sender, attempt: a.attempt, ok, message, sealedToken: ok && c ? c.sealedToken : '' };
  if (ctx.db.signInResult.identity.find(ctx.sender)) ctx.db.signInResult.identity.update(row);
  else ctx.db.signInResult.insert(row);
});

export const clearSignInResult = db.reducer(ctx => {
  ctx.db.signInResult.identity.delete(ctx.sender);
});
