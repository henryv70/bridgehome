import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSpacetimeDB, useTable } from 'spacetimedb/react';
import type { Identity } from 'spacetimedb';
import { toast } from 'sonner';
import { DbConnection, tables } from '@/module_bindings';
import { GROUP_KEY } from './session';
import { t } from './i18n';

function useFamilyTables() {
  const [profiles, r1] = useTable(tables.visibleProfile);
  const [families, r2] = useTable(tables.visibleFamily);
  const [memberships, r3] = useTable(tables.visibleMembership);
  const [invitations, r4] = useTable(tables.visibleInvitation);
  const [requests, r5] = useTable(tables.visibleRequest);
  const [budgets, r6] = useTable(tables.visibleBudget);
  const [targets, r7] = useTable(tables.visibleBudgetTarget);
  const [comments, r8] = useTable(tables.visibleComment);
  const [commitments, r9] = useTable(tables.visibleCommitment);
  const [transfers, r10] = useTable(tables.visibleRecordedTransfer);
  const [revisions, r11] = useTable(tables.visibleTransferRevision);
  const [receipts, r12] = useTable(tables.visibleReceipt);
  const [posts, r13] = useTable(tables.visiblePost);
  const [reactions, r14] = useTable(tables.visibleReaction);
  const [contributions, r15] = useTable(tables.visibleContribution);
  const [audit, r16] = useTable(tables.visibleAudit);
  const [accounts, r17] = useTable(tables.visiblePaymentMethod);
  const [credentials, r18] = useTable(tables.visibleCredential);
  const [fraudFlags, r19] = useTable(tables.visibleFraudFlag);
  const ready = r1 && r2 && r3 && r4 && r5 && r6 && r7 && r8 && r9 && r10 && r11 && r12 && r13 && r14 && r15 && r16 && r17 && r18 && r19;
  return {
    ready, profiles, families, memberships, invitations, requests, budgets, targets, comments, commitments,
    transfers, revisions, receipts, posts, reactions, contributions, audit, accounts, credentials, fraudFlags,
  };
}

type Tables = ReturnType<typeof useFamilyTables>;
export type Family = Tables['families'][number];
export type Membership = Tables['memberships'][number];
export type Request = Tables['requests'][number];
export type Transfer = Tables['transfers'][number];
export type Receipt = Tables['receipts'][number];
export type Post = Tables['posts'][number];
export type Account = Tables['accounts'][number];

function scope(t: Tables, gid: bigint | undefined) {
  const inGroup = <R extends { groupId: bigint }>(rows: readonly R[]) => rows.filter(r => r.groupId === gid);
  return {
    members: inGroup(t.memberships),
    invitations: inGroup(t.invitations),
    requests: inGroup(t.requests),
    budgets: inGroup(t.budgets),
    targets: inGroup(t.targets),
    comments: inGroup(t.comments),
    commitments: inGroup(t.commitments),
    transfers: inGroup(t.transfers),
    revisions: inGroup(t.revisions),
    receipts: inGroup(t.receipts),
    posts: inGroup(t.posts),
    reactions: inGroup(t.reactions),
    contributions: inGroup(t.contributions),
    audit: inGroup(t.audit),
    fraudFlags: inGroup(t.fraudFlags),
  };
}

function useAppValue() {
  const { isActive, identity, getConnection } = useSpacetimeDB();
  const conn = getConnection() as DbConnection | null | undefined;
  const t = useFamilyTables();
  // Cached translations load in the background; they never hold up the app.
  const [translations] = useTable(tables.visibleTranslation);
  const [translationEnabled, setTranslationEnabled] = useState(false);
  useEffect(() => {
    if (!isActive || !conn) return;
    conn.procedures.translationEnabled({}).then(setTranslationEnabled, () => setTranslationEnabled(false));
  }, [isActive, conn]);
  const [selected, setSelected] = useState(() => localStorage.getItem(GROUP_KEY) ?? '');
  const selectGroup = useCallback((id: bigint) => { localStorage.setItem(GROUP_KEY, String(id)); setSelected(String(id)); }, []);

  return useMemo(() => {
    const families = [...t.families].sort((a, b) => Number(a.id - b.id));
    const group = families.find(g => String(g.id) === selected) ?? families[0];
    const s = scope(t, group?.id);
    const isMe = (id: Identity) => !!identity && id.isEqual(identity);
    const me = s.members.find(m => isMe(m.identity));
    const nameOf = (id: Identity) => s.members.find(m => m.identity.isEqual(id))?.name ?? 'Former member';
    return {
      isActive, identity, reducers: conn?.reducers, procedures: conn?.procedures, ready: t.ready,
      translations, translationEnabled,
      profile: t.profiles[0], username: t.credentials[0]?.username, families, group, selectGroup, ...s,
      accounts: t.accounts,
      myAccounts: t.accounts.filter(a => isMe(a.owner)),
      payoutsOf: (id: Identity) => t.accounts.filter(a => a.purpose === 'receive' && a.owner.isEqual(id)),
      me, role: me?.role as 'sender' | 'recipient' | undefined, isOwner: !!group && isMe(group.owner),
      isMe, nameOf,
    };
  }, [t, selected, identity, isActive, conn, selectGroup, translations, translationEnabled]);
}

export type AppData = ReturnType<typeof useAppValue>;
const AppContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  return <AppContext.Provider value={useAppValue()}>{children}</AppContext.Provider>;
}

export function useApp() {
  const v = useContext(AppContext);
  if (!v) throw Error('useApp must be used inside AppDataProvider');
  return v;
}

// Server messages are English; known ones are translated, the rest pass through.
export function errorText(e: unknown) {
  const m = e instanceof Error ? e.message : String(e);
  return t(m.replace(/^(Error|SenderError):\s*/i, '').replace(/^The reducer .*? failed: /, '').replace(/^The module instance encountered a fatal error: /, ''));
}

// Runs a reducer call with consistent feedback. Resolves true on success.
export function useAction() {
  const { isActive } = useApp();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<unknown> | undefined, success?: string) => {
    if (!isActive) { toast.error(t('Reconnecting to BridgeHome. Try again in a moment.')); return false; }
    setBusy(true);
    try {
      await fn();
      if (success) toast.success(t(success));
      return true;
    } catch (e) {
      toast.error(errorText(e));
      return false;
    } finally {
      setBusy(false);
    }
  }, [isActive]);
  return { run, busy };
}
