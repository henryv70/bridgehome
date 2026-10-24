import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Copy, ExternalLink, MoreHorizontal, Share2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAction, useApp } from '@/lib/data';
import { locale, t, tn } from '@/lib/i18n';
import { copyText, shareLink } from '@/lib/share';
import { auditAction, auditActor, auditText } from '@/lib/status';
import { formatMoney, sum, toDecimal, toMinor } from '@/lib/money';
import { ago, byNewest } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AreaField, Help, Initials, MoneyField, PageHeader, Panel, Section, TextField, formValue } from '@/components/app/kit';

const ROLE_ABOUT = {
  sender: 'Reviews requests, sends money outside the app, and records it.',
  recipient: 'Asks for support and confirms what arrives.',
};
const roleLabel = (role: string) => t(role === 'sender' ? 'Sender' : 'Recipient');

export default function FamilyPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'members';
  return (
    <>
      <PageHeader title={t('Family')} subtitle={t("Who's here, what's public, and everything that happened.")} />
      <Tabs value={tab} onValueChange={v => setParams({ tab: String(v) })}>
        <TabsList className="mb-6">
          <TabsTrigger value="members">{t('Members')}</TabsTrigger>
          <TabsTrigger value="public">{t('Public page')}</TabsTrigger>
          <TabsTrigger value="history">{t('History')}</TabsTrigger>
        </TabsList>
        <TabsContent value="members"><Members autoInvite={params.get('invite') === '1'} /></TabsContent>
        <TabsContent value="public"><PublicSettings /></TabsContent>
        <TabsContent value="history"><HistoryList /></TabsContent>
      </Tabs>
    </>
  );
}

function inviteLink(code: string) {
  return `${location.origin}/welcome?code=${code}`;
}

function Members({ autoInvite }: { autoInvite: boolean }) {
  const app = useApp();
  const { run, busy } = useAction();
  const [role, setRole] = useState<'recipient' | 'sender'>('recipient');
  const invites = [...app.invitations].sort((a, b) => Number(b.id - a.id));

  const share = (code: string) => shareLink(t('Join {family} on BridgeHome', { family: app.group?.name ?? '' }), inviteLink(code), t('Invitation link copied'));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <Section title={tn('{n} member', '{n} members', app.members.length)}>
        <div className="divide-y rounded-2xl border bg-card">
          {app.members.map(m => {
            const owner = app.group?.owner.isEqual(m.identity);
            return (
              <div key={String(m.id)} className="flex items-center gap-3 px-4 py-3">
                <Initials name={m.name} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{m.name}{app.isMe(m.identity) && <span className="font-normal text-muted-foreground"> ({t('you')})</span>}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel(m.role)}{owner ? ` · ${t('owner')}` : ''}</p>
                </div>
                {app.isOwner && !app.isMe(m.identity) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label={t('Manage {name}', { name: m.name })}><MoreHorizontal className="size-4" /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => run(() => app.reducers?.manageMember({ memberId: m.id, role: m.role === 'sender' ? 'recipient' : 'sender' }), 'Role updated')}>
                        {m.role === 'sender' ? t('Make recipient') : t('Make sender')}
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => run(() => app.reducers?.manageMember({ memberId: m.id, role: 'remove' }), t('{name} removed', { name: m.name }))}>{t('Remove from family')}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['sender', 'recipient'] as const).map(r => (
            <div key={r} className="rounded-xl bg-muted/60 p-3 text-sm"><p className="font-medium">{t(r === 'sender' ? 'Senders' : 'Recipients')}</p><p className="text-muted-foreground">{t(ROLE_ABOUT[r])}</p></div>
          ))}
        </div>
      </Section>

      <Section title={t('Invite family')}>
        {app.isOwner ? (
          <Panel className={autoInvite ? 'space-y-4 border-brand/40' : 'space-y-4'}>
            {autoInvite && !invites.length && <p className="text-sm">{t('Your family is ready. Invite the first person to join you.')}</p>}
            <div className="grid grid-cols-2 gap-2">
              {(['recipient', 'sender'] as const).map(r => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className={'rounded-xl border p-3 text-left text-sm ' + (role === r ? 'border-foreground ring-1 ring-foreground' : '')}>
                  <span className="font-medium">{roleLabel(r)}</span>
                  <span className="block text-xs text-muted-foreground">{r === 'recipient' ? t('Receives support') : t('Sends support')}</span>
                </button>
              ))}
            </div>
            <Button size="lg" className="h-10 w-full" disabled={busy} onClick={() => run(() => app.reducers?.inviteMember({ groupId: app.group!.id, role }), 'Invitation created')}>
              <UserPlus />{t('Create invitation link')}
            </Button>
            {invites.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-xs text-muted-foreground">{t('Each link works once and expires in 7 days. Share it privately.')}</p>
                {invites.map(i => (
                  <div key={String(i.id)} className="flex items-center gap-2 rounded-xl border p-2 pl-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{roleLabel(i.role)}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">{i.code.slice(0, 16)}…</p>
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label={t('Copy link')} onClick={async () => { await copyText(inviteLink(i.code)); toast.success(t('Link copied')); }}><Copy /></Button>
                    <Button variant="secondary" size="sm" onClick={() => share(i.code)}><Share2 />{t('Share')}</Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => run(() => app.reducers?.revokeInvite({ invitationId: i.id }), 'Invitation revoked')}>{t('Revoke')}</Button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        ) : <p className="text-sm text-muted-foreground">{t('Only the family owner can invite people. Ask {name} to send an invitation link.', { name: app.nameOf(app.group!.owner) })}</p>}
      </Section>
    </div>
  );
}

function PublicSettings() {
  const app = useApp();
  const g = app.group!;
  const { run, busy } = useAction();
  const [isPublic, setIsPublic] = useState(g.isPublic);
  const pledges = [...app.contributions].sort(byNewest);
  const shared = app.requests.filter(r => r.isPublic);
  const suggested = g.slug || g.name.toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'my-family';

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <Section title={<span className="inline-flex items-center gap-1">{t('Public page')} <Help>{t('A page anyone with the link can visit. It shows your story, the requests you choose to share, public photos and pledges. It never shows member identities, budgets, transfers or private conversations.')}</Help></span>}>
        {app.isOwner ? (
          <form className="space-y-4" onSubmit={async e => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const c = formValue(f, 'currency');
            await run(() => app.reducers?.updatePublicPage({ groupId: g.id, isPublic, slug: formValue(f, 'slug'), story: formValue(f, 'story'), goalAmount: toMinor(formValue(f, 'amount') || '0', c), goalCurrency: c }), isPublic ? 'Public page saved' : 'Saved. Page is private.');
          }}>
            <Panel className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{isPublic ? t('Your page is public') : t('Your page is private')}</p>
                <p className="text-sm text-muted-foreground">{isPublic ? t('Anyone with the link can see it and pledge support.') : t('Turn on to let friends and community support your family.')}</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} aria-label={t('Public page')} />
            </Panel>
            <TextField name="slug" label={t('Page link')} defaultValue={suggested} required pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" hint={`${location.host}/p/…  ${t('Lowercase letters, numbers and dashes.')}`} />
            <AreaField name="story" label={t('Your story')} rows={5} defaultValue={g.story} maxLength={1500} placeholder={t('Who you are, where your family is, and what support makes possible.')} />
            <MoneyField label={t('Fundraising goal (optional)')} currency={g.goalCurrency} defaultValue={g.goalAmount ? toDecimal(g.goalAmount, g.goalCurrency) : ''} />
            <div className="flex gap-2">
              <Button size="lg" disabled={busy}>{t('Save')}</Button>
              {g.isPublic && <Link to={`/p/${g.slug}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted"><ExternalLink className="size-4" />{t('View page')}</Link>}
            </div>
          </form>
        ) : (
          <Panel>
            <p className="text-sm">{g.isPublic ? <>{t('Your family has a public page.')} <Link to={`/p/${g.slug}`} className="underline">{t('Open it')}</Link>.</> : t('Your family page is private. The owner can make it public.')}</p>
          </Panel>
        )}
        <p className="text-xs text-muted-foreground">{t('Pledges are a demo feature: supporters record what they intend to give and no money moves through BridgeHome.')}</p>
      </Section>

      <div className="space-y-8">
        <Section title={t('Shared requests · {n}', { n: shared.length })}>
          {shared.length ? shared.map(r => {
            const pledged = sum(pledges.filter(p => p.requestId === r.id), p => p.amount);
            return <Link key={String(r.id)} to={`/requests/${r.id}`} className="block rounded-xl border p-3 text-sm hover:bg-muted/50"><p className="font-medium">{r.publicTitle}</p><p className="tabular text-xs text-muted-foreground">{t('{pledged} pledged of {goal}', { pledged: formatMoney(pledged, r.currency), goal: formatMoney(r.amount, r.currency) })}</p></Link>;
          }) : <p className="text-sm text-muted-foreground">{t('Open a request and turn on “Let the public pledge support” to feature it here.')}</p>}
        </Section>
        <Section title={t('Supporters · {n}', { n: pledges.length })}>
          {pledges.slice(0, 8).map(p => (
            <div key={String(p.id)} className="text-sm">
              <p><span className="font-medium">{p.name}</span> <span className="tabular text-muted-foreground">{t('pledged {amount}', { amount: formatMoney(p.amount, p.currency) })}</span></p>
              {p.message && <p className="text-muted-foreground">“{p.message}”</p>}
            </div>
          ))}
          {!pledges.length && <p className="text-sm text-muted-foreground">{t('No pledges yet.')}</p>}
        </Section>
      </div>
    </div>
  );
}

function HistoryList() {
  const app = useApp();
  return (
    <Section title={t("Every change, in order. Entries can't be edited or deleted.")}>
      <ol className="divide-y rounded-2xl border bg-card">
        {[...app.audit].sort(byNewest).map(a => (
          <li key={String(a.id)} className="flex gap-3 px-4 py-3">
            <Initials name={auditActor(app, a)} className="size-7 text-[10px]" />
            <div className="min-w-0 flex-1 text-sm">
              <p><span className="font-medium">{auditActor(app, a)}</span> · {auditAction(a.action)}</p>
              <p className="break-words text-xs text-muted-foreground">{auditText(a.detail)}</p>
            </div>
            <time className="shrink-0 text-xs text-muted-foreground" title={a.createdAt.toDate().toLocaleString(locale())}>{ago(a.createdAt)}</time>
          </li>
        ))}
      </ol>
    </Section>
  );
}
