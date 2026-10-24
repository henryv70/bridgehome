import { Suspense, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useTheme } from '@/lib/theme';
import { BookOpen, Check, HandHeart, ChevronsUpDown, Compass, Globe, Home, Images, KeyRound, Landmark, LogOut, Moon, Plus, ReceiptText, Sparkles, Sun, Users, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/data';
import { taskFor } from '@/lib/status';
import { LANGUAGES, t, useLanguage } from '@/lib/i18n';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Drawer, Initials } from './kit';
import { Logo, Wordmark } from './brand';
import { DemoPicker } from './demo-picker';
import { CredentialForm, SignOutPanel } from './sign-in';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/requests', label: 'Requests', icon: ReceiptText },
  { to: '/budget', label: 'Budget', icon: Wallet },
  { to: '/feed', label: 'Moments', icon: Images },
  { to: '/family', label: 'Family', icon: Users },
];

export function Splash() {
  const { isActive } = useApp();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-muted-foreground">
      <Logo className="size-10 animate-pulse" />
      <p className="text-sm">{isActive ? t('Loading your family…') : t('Connecting to BridgeHome…')}</p>
    </div>
  );
}

function FamilySwitcher({ compact }: { compact?: boolean }) {
  const { families, group, selectGroup, me, isOwner } = useApp();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn('flex min-w-0 items-center gap-2 rounded-xl text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50', compact ? 'px-2 py-1.5' : 'w-full p-2')}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold">{group?.name.replace(/^the\s+/i, '')[0]}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{group?.name}</span>
          {!compact && <span className="block truncate text-xs text-muted-foreground capitalize">{me ? t(me.role === 'sender' ? 'Sender' : 'Recipient') : ''}{isOwner ? ` · ${t('owner')}` : ''}</span>}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t('Your families')}</DropdownMenuLabel>
          {families.map(f => (
            <DropdownMenuItem key={String(f.id)} onClick={() => { selectGroup(f.id); navigate('/'); }}>
              <span className="flex-1 truncate">{f.name}</span>
              {f.id === group?.id && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/welcome?step=family')}><Plus className="size-4" />{t('Create or join a family')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu() {
  const { profile, username } = useApp();
  const { resolvedTheme, setTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const navigate = useNavigate();
  const [demo, setDemo] = useState(false);
  const [sheet, setSheet] = useState<'credential' | 'logout' | null>(null);
  const close = () => setSheet(null);
  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label={t('Account')}>
        <Initials name={profile?.name ?? '?'} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate">{profile?.name}</span>
            <span className="block truncate text-xs font-normal">{username ? t('Logged in as {username}', { username }) : t('No sign-in set up')}</span>
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setSheet('credential')}><KeyRound className="size-4" />{username ? t('Change username or password') : t('Set up sign-in')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/welcome?step=name')}>{t('Edit display name')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
            {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}{resolvedTheme === 'dark' ? t('Light mode') : t('Dark mode')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-2"><Globe className="size-3.5" />{t('Language')}</DropdownMenuLabel>
          {LANGUAGES.map(l => (
            <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}>
              <span className="flex-1">{l.label}</span>{l.code === lang && <Check className="size-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/about')}><Sparkles className="size-4" />{t('About BridgeHome')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/how')}><BookOpen className="size-4" />{t('How BridgeHome works')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/explore')}><Compass className="size-4" />{t('Explore public families')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/give')}><HandHeart className="size-4" />{t('Give to families')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/accounts')}><Landmark className="size-4" />{t('Bank accounts')}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setDemo(true)}><Sparkles className="size-4" />{t('Add a demo family')}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setSheet('logout')}><LogOut className="size-4" />{t('Log out')}</DropdownMenuItem>
      </DropdownMenuContent>
      <DemoPicker open={demo} onOpenChange={setDemo} />
    </DropdownMenu>
    <Drawer open={sheet === 'credential'} onOpenChange={o => !o && close()} title={username ? t('Change sign-in') : t('Set up sign-in')}
      description={t('Use this username and password to log back in on any device.')}>
      <CredentialForm submitLabel={username ? t('Save changes') : t('Save sign-in')} onDone={close} />
    </Drawer>
    <Drawer open={sheet === 'logout'} onOpenChange={o => !o && close()} title={t('Log out')}>
      <SignOutPanel />
    </Drawer>
    </>
  );
}

export function AppShell() {
  const app = useApp();
  const tasks = app.requests.filter(r => taskFor(app, r)).length;
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r bg-sidebar px-3 py-4 md:flex">
        <Link to="/" className="mb-5 px-2"><Wordmark /></Link>
        <FamilySwitcher />
        <nav className="mt-4 space-y-0.5">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', isActive && 'bg-muted font-medium text-foreground')}>
              <n.icon className="size-4" />{t(n.label)}
              {n.to === '/' && tasks > 0 && <span className="tabular ml-auto rounded-full bg-foreground px-1.5 text-[11px] font-medium text-background">{tasks}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 px-2">
          {!app.isActive && <p className="text-xs text-amber-600">{t('Reconnecting…')}</p>}
          <div className="flex items-center justify-between">
            <span className="truncate text-sm">{app.profile?.name}</span>
            <AccountMenu />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Mobile top bar */}
        <header className="pt-safe sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md md:hidden">
          <div className="flex h-14 items-center justify-between gap-2 px-3">
            <FamilySwitcher compact />
            <AccountMenu />
          </div>
          {!app.isActive && <p className="bg-amber-500/10 px-4 py-1 text-center text-xs text-amber-700">{t('Reconnecting…')}</p>}
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 md:px-8 md:pt-10 md:pb-16">
          <Suspense fallback={null}><Outlet /></Suspense>
        </main>

        {/* Mobile tab bar */}
        <nav aria-label={t('Family navigation')} className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 backdrop-blur-md md:hidden">
          <div className="grid h-16 grid-cols-5">
            {NAV.map(n => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('relative flex h-16 min-w-0 touch-manipulation flex-col items-center justify-center gap-1 text-[11px] leading-4 font-medium whitespace-nowrap text-muted-foreground select-none', isActive && 'text-foreground')}>
                <n.icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                <span className="block h-4">{t(n.label)}</span>
                {n.to === '/' && tasks > 0 && <span className="absolute top-1 left-1/2 ml-2 size-2 rounded-full bg-brand" />}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
