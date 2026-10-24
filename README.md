# BridgeHome

A family remittance coordination MVP using React 18, TypeScript, Vite and SpacetimeDB 2.13.0. It records plans and self-reported activity; it does not transfer money or verify financial information.

## Run locally

Requirements: Node.js **^20.19.0 or >=22.12.0**, SpacetimeDB CLI **2.13.0**.

Existing dependencies need no reinstall. On a fresh checkout only, run `npm install` and `npm --prefix spacetimedb install`. Copy `.env.example` to `.env.local` only when no local configuration exists.

```sh
spacetime start
# In a second terminal, from this directory:
spacetime publish bridgehome-3386g --server local --yes
npm run spacetime:generate
npm run dev -- --host 127.0.0.1
```

Open http://localhost:5173. Save a display name and create a group as sender or recipient. The creator owns membership administration. Under Members, create a single-use seven-day invitation and share it privately. An invited member saves their own name and joins with the code. Different browser profiles have independent identities; two tabs on the same origin share an identity.

Recipients create drafts or submit requests. Senders approve all or part of the amount, or reject with an explanation. After sending money outside BridgeHome, senders record principal, additional fee, receiving currency, estimated arrival, decimal exchange rate and assumptions. The requesting recipient confirms the actual receipt and records use or discrepancies, then closes the request. Updates appear through live subscriptions.

## Data and authorization

Private tables: profiles, families, memberships, invitations, budgets, requests, comments, commitments, recorded transfers, receipts and audit events. Authenticated views expose only rows for the caller's memberships; invitation codes are owner-only. The old public `person` table remains untouched solely to preserve existing data. Its example reducers and UI are removed.

Every sensitive reducer authorizes with `ctx.sender`. No reducer accepts a caller identity. Owners administer roles and removal; senders review and record transfers; recipients create requests, and only the requesting recipient confirms receipts or completion. Every family member can see group drafts, discuss needs and add budget entries. These are group-wide permissions, not per-field permissions. Membership removal also retracts subscribed financial rows. Database administrators remain trusted and can access underlying data.

Audit events use database timestamps and have no update/delete reducers. Financial records are append-only except request revisions/status transitions; revisions preserve earlier explanations and amounts in history. Display-name updates synchronize membership labels and record the old/new names. This is application-level immutability, not cryptographic tamper-proof storage against the database owner.

Indexes cover memberships by group/identity, records by group, transfers/comments by request, request status/due date, budget month and audit date. Views currently scan relevant source tables and filter membership; optimize for scale before production.

## Money and product assumptions

All amounts are unsigned 64-bit integer minor units, exposed as JavaScript `bigint`; decimal input is parsed as strings without floating-point arithmetic. Supported ISO currencies: USD, PHP, MXN, EUR, GBP, INR, CAD (2 decimals), JPY (0). Amounts are capped at 1,000,000,000,000 minor units. Zero is allowed for fees, rejection and receipt confirmation. Totals stay separated by currency.

Approval and sent principal use the request currency. Fees are extra and use that same currency. Each transfer preserves its receiving currency, exact decimal exchange-rate string, expected arrival and assumptions. Arrival is a manually supplied estimate, not automatically derived from the rate. A receipt can differ from the estimate; the UI neutrally labels this and requires context. Completion means the recipient closes the request, not legal settlement; it can close with unused approval or a receipt discrepancy.

Monthly commitments are plans and do not schedule payments or automatically create requests. Request summaries filter by due month, category and status. Budget summaries use the reported month and currency.

## Verification

```sh
spacetime build --module-path spacetimedb
npm run spacetime:generate
npm run build
./node_modules/.bin/tsc --project spacetimedb/tsconfig.json --noEmit
node tests/run.mjs
git diff --check
git status --short
```

Integration tests require the published local database. They create clearly labeled test families and preserve them instead of deleting data. They use three independent identities to test private-table denial, family isolation, one-use invitations, role enforcement, over-approval/oversending rejection, cross-currency receipt confirmation, duplicate receipt rejection, completion, real-time subscriptions and access revocation.

Browser verification completed with independent sender and recipient sessions: create group → invite/join → request USD 100 → approve USD 80 → record USD 80 plus USD 2 fee, expected PHP 4,500 → confirm PHP 4,490 with explanation → complete. Both sessions displayed the final state without a reload. A separate unaffiliated identity could not read or mutate the family's records.

## Current limits and next steps

- Development identity is a token in browser local storage. No account recovery, cross-device login, MFA or production identity provider is integrated; losing browser storage loses that identity.
- Invitations are bearer codes: privately share only with intended members. They expire after seven days and can be revoked.
- Evidence/file uploads are deferred. No receipts, bank credentials, IDs or payment secrets are collected.
- Corrections to immutable transfer/receipt records are documented in comments; structured reversal/correction entries and budget/commitment revision workflows remain future work.
- No payment provider, bank verification, FX quote service, notifications or background recurring execution.
- Add production authentication/recovery, structured correction workflows, attachment storage/access policies and scale testing before real household use.
- No commits, pushes, dependency upgrades or destructive migrations were performed.
