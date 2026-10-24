import { CheckCircle2, Eye, Globe, HandHeart, Lock, Send, ShieldCheck } from 'lucide-react';
import { STEPS } from '@/lib/status';
import { PublicLayout } from '@/components/app/public-layout';
import { Panel } from '@/components/app/kit';

const STEP_TEXT = [
  'Someone back home asks for what they need: the amount, why, and when.',
  'A sender approves all of it, part of it, or explains why not.',
  'The sender sends with BridgeHome Pay straight into the relative’s bank or mobile wallet, or records a transfer made with any other service.',
  'The recipient confirms what actually arrived. Differences are normal; they just add a note.',
  'The recipient closes the request, and can share a photo of how it helped.',
];

export default function HowItWorks() {
  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl space-y-12">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">How BridgeHome works</h1>
          <p className="mt-3 text-muted-foreground">A shared, honest record of family support, so nobody has to keep track in group chats.</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <Panel><Send className="mb-3 size-5" /><p className="font-medium">Senders</p><p className="mt-1 text-sm text-muted-foreground">Usually family working abroad. They review requests, send money outside the app, and record what they sent.</p></Panel>
          <Panel><HandHeart className="mb-3 size-5" /><p className="font-medium">Recipients</p><p className="mt-1 text-sm text-muted-foreground">Family back home. They ask for support, confirm what arrives, and share how it helped.</p></Panel>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Every request follows five steps</h2>
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.key} className="flex gap-4">
                <span className="tabular flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-medium">{i + 1}</span>
                <div><p className="font-medium">{s.label} <span className="text-sm font-normal text-muted-foreground">· {s.who}</span></p><p className="text-sm text-muted-foreground">{STEP_TEXT[i]}</p></div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted-foreground">Your home screen always shows what's waiting on you, so you never have to guess.</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Panel><Lock className="mb-3 size-5" /><p className="font-medium">Private by default</p><p className="mt-1 text-sm text-muted-foreground">Only members of your family group can see requests, budgets, transfers and conversations.</p></Panel>
          <Panel><Globe className="mb-3 size-5" /><p className="font-medium">Public when you choose</p><p className="mt-1 text-sm text-muted-foreground">Owners can publish a family page. You pick which requests and photos appear. Visitors can pledge support.</p></Panel>
          <Panel><Eye className="mb-3 size-5" /><p className="font-medium">Nothing disappears</p><p className="mt-1 text-sm text-muted-foreground">Edits keep the original values. History can't be changed, so everyone sees the same story.</p></Panel>
          <Panel><ShieldCheck className="mb-3 size-5" /><p className="font-medium">BridgeHome Pay (demo)</p><p className="mt-1 text-sm text-muted-foreground">Link a bank, add a relative's Vietcombank, GCash or MoMo account, and deposit directly. In this demo no bank is contacted and only the last four digits of an account are stored.</p></Panel>
        </section>

        <p className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-good" />Built with React, SpacetimeDB and live subscriptions. Every change shows up instantly for the whole family.</p>
      </div>
    </PublicLayout>
  );
}
