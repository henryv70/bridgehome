import type { AppData, Request } from './data';
import { lang, t } from './i18n';
import { formatMoney, sum } from './money';

export const STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'sent', 'received', 'completed'] as const;

// Getters so labels follow the current interface language.
const status = (label: string, tone: string, about: string) => ({ get label() { return t(label); }, tone, get about() { return t(about); } });
export const STATUS: Record<string, { label: string; tone: string; about: string }> = {
  draft: status('Draft', 'bg-muted text-muted-foreground', 'Saved but not submitted. Family can see it; nobody needs to act yet.'),
  submitted: status('Waiting for review', 'bg-amber-500/12 text-amber-700 dark:text-amber-400', 'A sender needs to approve all, part, or none of it.'),
  approved: status('Approved', 'bg-brand/12 text-brand', 'A sender agreed to help. Next they send the money and record it here.'),
  rejected: status('Not approved', 'bg-muted text-muted-foreground', 'The sender explained why. The requester can revise and resubmit.'),
  sent: status('On the way', 'bg-brand/12 text-brand', 'Money was sent outside BridgeHome. The requester confirms what arrived.'),
  received: status('Received', 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400', 'The requester confirmed receipt. They close it when the need is met.'),
  completed: status('Done', 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400', 'Closed by the requester.'),
};

// The five steps every request moves through.
const step = (key: string, label: string, who: string) => ({ key, get label() { return t(label); }, get who() { return t(who); } });
export const STEPS = [
  step('submitted', 'Asked', 'Recipient'),
  step('approved', 'Approved', 'Sender'),
  step('sent', 'Sent', 'Sender'),
  step('received', 'Received', 'Recipient'),
  step('completed', 'Done', 'Recipient'),
];
export function stepIndex(status: string) {
  return { draft: -1, submitted: 0, rejected: 0, approved: 1, sent: 2, received: 3, completed: 4 }[status] ?? -1;
}

// Request categories are stored in English; show them in the interface language mid-sentence.
export const categoryText = (category: string) => (lang() === 'en' ? category.toLowerCase() : t(category).toLowerCase());

export type Task = { request: Request; title: string; cta: string; urgent: boolean };

// What the current person needs to do next, if anything, for one request.
export function taskFor(app: AppData, r: Request): Task | null {
  const mine = app.isMe(r.author);
  const sender = app.role === 'sender';
  const who = app.nameOf(r.author);
  const urgent = r.priority === 'urgent';
  const category = categoryText(r.category);
  if (r.status === 'draft' && mine) return { request: r, title: t('Finish your {category} draft', { category }), cta: t('Submit'), urgent: false };
  if (r.status === 'submitted' && sender) return { request: r, title: t("Review {who}'s {category} request", { who, category }), cta: t('Review'), urgent };
  if (r.status === 'approved' && sender) {
    const sent = sum(app.transfers.filter(x => x.requestId === r.id), x => x.amount);
    if (sent < r.approved) return { request: r, title: t('Send {who} money for {category}', { who, category }), cta: t('Send'), urgent };
  }
  if (r.status === 'sent' && mine) {
    const open = app.transfers.some(x => x.requestId === r.id && !app.receipts.some(y => y.transferId === x.id));
    if (open) return { request: r, title: t('Confirm the money that arrived for {category}', { category }), cta: t('Confirm'), urgent: true };
  }
  if (r.status === 'received' && mine) return { request: r, title: t('Close your {category} request', { category }), cta: t('Close'), urgent: false };
  return null;
}

// Who the request is waiting on, in plain words.
export function waitingOn(app: AppData, r: Request) {
  const mine = app.isMe(r.author);
  const who = app.nameOf(r.author);
  switch (r.status) {
    case 'draft': return mine ? t('Draft. Waiting on you to submit.') : t('Draft. Waiting on {who} to submit.', { who });
    case 'submitted': return app.role === 'sender' ? t('Waiting on you to review.') : t('Waiting on a sender to review.');
    case 'approved': return app.role === 'sender' ? t('Waiting on you to send it.') : t('Approved. Waiting on a sender to send it.');
    case 'rejected': return mine ? t('Not approved. You can revise and resubmit.') : t('Not approved. {who} can revise and resubmit.', { who });
    case 'sent': return mine ? t('On the way. Waiting on you to confirm receipt.') : t('On the way. Waiting on {who} to confirm receipt.', { who });
    case 'received': return mine ? t('Received. Waiting on you to close it.') : t('Received. Waiting on {who} to close it.', { who });
    default: return t('Done.');
  }
}

// Audit rows store raw minor units; render them the way people read money.
export function auditText(detail: string) {
  return detail.replace(/(\d+) ([A-Z]{3}) minor units/g, (_, n: string, c: string) => formatMoney(BigInt(n), c));
}

// Audit actions are written in English by the server; translate the ones we know.
export const auditAction = (action: string) => t(action.replace(/ \(self-reported\)/, ''));

// Public pledgers are not family members, so name them from the entry itself.
export function auditActor(app: AppData, a: { action: string; detail: string; actor: Parameters<AppData['nameOf']>[0] }) {
  return a.action.startsWith('Public pledge') ? a.detail.split(':')[0] : app.nameOf(a.actor);
}
