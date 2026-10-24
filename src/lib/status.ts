import type { AppData, Request } from './data';
import { formatMoney, sum } from './money';

export const STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'sent', 'received', 'completed'] as const;

export const STATUS: Record<string, { label: string; tone: string; about: string }> = {
  draft: { label: 'Draft', tone: 'bg-muted text-muted-foreground', about: 'Saved but not submitted. Family can see it; nobody needs to act yet.' },
  submitted: { label: 'Waiting for review', tone: 'bg-amber-500/12 text-amber-700 dark:text-amber-400', about: 'A sender needs to approve all, part, or none of it.' },
  approved: { label: 'Approved', tone: 'bg-brand/12 text-brand', about: 'A sender agreed to help. Next they send the money and record it here.' },
  rejected: { label: 'Not approved', tone: 'bg-muted text-muted-foreground', about: 'The sender explained why. The requester can revise and resubmit.' },
  sent: { label: 'On the way', tone: 'bg-brand/12 text-brand', about: 'Money was sent outside BridgeHome. The requester confirms what arrived.' },
  received: { label: 'Received', tone: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400', about: 'The requester confirmed receipt. They close it when the need is met.' },
  completed: { label: 'Done', tone: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400', about: 'Closed by the requester.' },
};

// The five steps every request moves through.
export const STEPS = [
  { key: 'submitted', label: 'Asked', who: 'Recipient' },
  { key: 'approved', label: 'Approved', who: 'Sender' },
  { key: 'sent', label: 'Sent', who: 'Sender' },
  { key: 'received', label: 'Received', who: 'Recipient' },
  { key: 'completed', label: 'Done', who: 'Recipient' },
];
export function stepIndex(status: string) {
  return { draft: -1, submitted: 0, rejected: 0, approved: 1, sent: 2, received: 3, completed: 4 }[status] ?? -1;
}

export type Task = { request: Request; title: string; cta: string; urgent: boolean };

// What the current person needs to do next, if anything, for one request.
export function taskFor(app: AppData, r: Request): Task | null {
  const mine = app.isMe(r.author);
  const sender = app.role === 'sender';
  const who = app.nameOf(r.author);
  const urgent = r.priority === 'urgent';
  if (r.status === 'draft' && mine) return { request: r, title: `Finish your ${r.category.toLowerCase()} draft`, cta: 'Submit', urgent: false };
  if (r.status === 'submitted' && sender) return { request: r, title: `Review ${who}'s ${r.category.toLowerCase()} request`, cta: 'Review', urgent };
  if (r.status === 'approved' && sender) {
    const sent = sum(app.transfers.filter(t => t.requestId === r.id), t => t.amount);
    if (sent < r.approved) return { request: r, title: `Send ${who} money for ${r.category.toLowerCase()}`, cta: 'Send', urgent };
  }
  if (r.status === 'sent' && mine) {
    const open = app.transfers.some(t => t.requestId === r.id && !app.receipts.some(x => x.transferId === t.id));
    if (open) return { request: r, title: `Confirm the money that arrived for ${r.category.toLowerCase()}`, cta: 'Confirm', urgent: true };
  }
  if (r.status === 'received' && mine) return { request: r, title: `Close your ${r.category.toLowerCase()} request`, cta: 'Close', urgent: false };
  return null;
}

// Who the request is waiting on, in plain words.
export function waitingOn(app: AppData, r: Request) {
  const who = app.isMe(r.author) ? 'you' : app.nameOf(r.author);
  switch (r.status) {
    case 'draft': return `Draft. Waiting on ${who} to submit.`;
    case 'submitted': return app.role === 'sender' ? 'Waiting on you to review.' : 'Waiting on a sender to review.';
    case 'approved': return app.role === 'sender' ? 'Waiting on you to send it.' : 'Approved. Waiting on a sender to send it.';
    case 'rejected': return `Not approved. ${who === 'you' ? 'You can' : who + ' can'} revise and resubmit.`;
    case 'sent': return `On the way. Waiting on ${who} to confirm receipt.`;
    case 'received': return `Received. Waiting on ${who} to close it.`;
    default: return 'Done.';
  }
}

// Audit rows store raw minor units; render them the way people read money.
export function auditText(detail: string) {
  return detail.replace(/(\d+) ([A-Z]{3}) minor units/g, (_, n: string, c: string) => formatMoney(BigInt(n), c));
}

// Public pledgers are not family members, so name them from the entry itself.
export function auditActor(app: AppData, a: { action: string; detail: string; actor: Parameters<AppData['nameOf']>[0] }) {
  return a.action.startsWith('Public pledge') ? a.detail.split(':')[0] : app.nameOf(a.actor);
}
