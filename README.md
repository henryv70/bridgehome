# BridgeHome

A family remittance coordination app built with React 19, TypeScript, Vite, Tailwind, shadcn/ui and SpacetimeDB 2.13. Family abroad and family back home share one live record of requests, transfers, budgets and the moments support makes possible. BridgeHome records plans and self-reported activity; it never transfers money or verifies financial information.

Runs as a responsive web app (installable to the home screen) and inside an Expo app for iOS and Android.

## Run locally

Requirements: Node.js **^20.19.0 or >=22.12.0**, SpacetimeDB CLI **2.13.0**.

On a fresh checkout run `npm install`, `npm --prefix spacetimedb install` and `npm --prefix mobile install`.

```sh
spacetime start
# In a second terminal, from this directory:
spacetime publish bridgehome-3386g --module-path spacetimedb --server local --yes
npm run spacetime:generate
npm run dev
```

Open http://localhost:5173. Choose **Try a demo family** and pick the Vietnamese Nguyễn family (USD → VND) or the Filipino Santos family (USD → PHP). Each comes with sample members, requests in every state, demo bank accounts, a household budget, real photos and a public page. The Vite dev server proxies SpacetimeDB (`/v1` → `localhost:3000`), so other devices only need port 5173.

## Test on your phone with Expo

1. Install **Expo Go** from the App Store or Play Store.
2. Keep `spacetime start` and `npm run dev` running, with your phone on the same Wi-Fi as your computer.
3. In another terminal: `npm run mobile`, then scan the QR code (Camera app on iPhone, Expo Go on Android).

The Expo app (`mobile/`) loads the web app from your computer's address (detected from Expo's host, port 5173) in a full-screen WebView with native share sheets, Android back-button support, pull to refresh and camera/photo access. To point it elsewhere, set `EXPO_PUBLIC_WEB_URL`, for example `EXPO_PUBLIC_WEB_URL=https://your-deploy.example npm run mobile`.

**On event, campus or office Wi-Fi** (for example the Cal Hacks network), devices usually can't reach each other, so Expo Go can't load the app. Use the tunnel instead (requires `brew install cloudflared`, no accounts needed):

```sh
npm run mobile:tunnel            # or: npm run mobile:tunnel -- --port 8082
```

It opens two public HTTPS tunnels (web app and Metro), points the app at them, and prints the QR code. Anyone with the URLs can reach your local dev server while it runs, so stop it (Ctrl+C) when you're done.

Without Expo, open `http://<your-computer-ip>:5173` in the phone browser and use **Add to Home Screen**.

Each browser profile, device and the Expo app has its own identity, which makes it easy to demo two roles: be the sender on your laptop, create an invitation under **Family**, and join as a recipient on your phone.

## Features

- **Home**: what needs your attention right now, monthly totals, recent activity and photos.
- **Requests**: five-step timeline (asked → approved → sent → received → done) with a "your next step" panel, partial approvals, transfer recording with an exchange-rate estimate, receipt confirmation, and a conversation per request.
- **BridgeHome Pay (demo)**: senders link a bank through a simulated sign-in (or routing/account numbers), recipients add a local bank or mobile wallet (Vietcombank, MoMo, BDO, GCash, M-Pesa, bKash and more), and senders deposit directly with a fee and exchange-rate quote and a live deposit tracker. No bank is contacted and no money moves. Only the institution name and last four digits are stored; sign-in details never leave the browser. Rates are indicative demo values.
- **Editable transfers**: the sender who recorded a transfer can correct it until the recipient confirms receipt. Every edit requires a reason and keeps the previous values (`transfer_revision`), shown in an "Edited" history.
- **Budget**: month-by-month income and spending, per-category plans with over-plan warnings, a six-month income vs. spending chart, support sent per month, and monthly support plans from senders.
- **Moments**: an Instagram-style photo feed. Demo families use real public-domain/CC0 photos from Wikimedia Commons (`public/demo`, credits in `public/demo/CREDITS.md`). Photos are compressed in the browser (≤ 400 KB JPEG) and stored in SpacetimeDB. Each post is family-only or public, can link to a request, and has reactions.
- **Public page** (`/p/:slug`): an opt-in page with the family story, a goal, chosen requests, public photos and supporters. Visitors can pledge toward the goal or a specific need. Pledges are a demo: no payment is collected.
- **Explore** (`/explore`): public families and recent public moments.
- **Log in and log out**: set a username and password from the profile menu (Home also nudges you), then log out and log back in at `/login`, on the same device or another one. Logging out without a username warns first, because the device's anonymous identity can't be recovered. Five wrong passwords lock the username for five minutes.
- **Missing bank accounts**: when a sender has no linked bank, or the recipient has no receiving account, the send flow explains what to do and offers to link one or to remind the recipient in the conversation. Recipients see the same guidance on their open requests.
- **Onboarding and guidance**: role explanations, invitation links (`/welcome?code=…`), status explanations, a How it works page (`/how`), and a one-tap demo family.

## Data and authorization

Private tables: profiles, payment methods (masked), families, memberships, invitations, budgets, budget targets, requests, comments, commitments, recorded transfers, transfer revisions, receipts, posts, reactions, contributions and audit events. Per-user views (`my_*`) expose only rows for the caller's memberships; invitation codes are owner-only.

Public anonymous views (`public_family`, `public_post`, `public_request`, `public_contribution`, `public_reaction`) expose only what a family explicitly published: families with the public page turned on, posts marked public, and requests shared with a public title. They never include identities, budgets, transfers, explanations or conversations. Unpublishing removes everything from visitors immediately.

Every sensitive reducer authorizes with `ctx.sender`. Owners manage members, invitations and the public page; senders review requests and record or edit their own transfers; recipients create requests, and only the requesting recipient confirms receipt or closes a request. The requester or owner can share a request publicly. Anyone can react to public posts or pledge on a public page.

Sign-in never sends the password to the database. The browser derives two keys from it with PBKDF2-SHA256 (100,000 iterations, salted with the database name and username). The first, the auth key, is checked by the `sign_in` reducer. The second seals this device's SpacetimeDB token (HMAC-SHA256 counter-mode encryption with an HMAC tag) and never leaves the browser. A successful sign-in returns the sealed token through `my_sign_in_result`, which only the requesting connection can read. The browser unseals it and reconnects as that identity. WebCrypto is used where available, with an identical pure-TypeScript fallback for plain-http LAN addresses and the Expo app. The `credential` table is private, and `my_credential` exposes only your own username.

Audit events use database timestamps and have no update/delete reducers. Transfer edits and request revisions keep earlier values. This is application-level immutability, not cryptographic tamper-proofing against the database owner.

New columns are appended with defaults, so publishing over existing data migrates in place.

## Money

All amounts are unsigned 64-bit integer minor units, exposed as JavaScript `bigint`; decimal input is parsed as strings without floating-point arithmetic. 45 currencies are supported, including VND, PHP, MXN, INR, NGN, KES, BDT, PKR, GTQ, DOP and BRL. JPY, KRW and VND have no minor unit; the rest use 2 decimals. Totals stay separated by currency. Exchange rates are stored as exact decimal strings; the "they should get" estimate is a suggestion the sender can edit. Chart axes are the only place amounts become floating-point numbers.

## Verification

```sh
spacetime build --module-path spacetimedb
./node_modules/.bin/tsc --project spacetimedb/tsconfig.json --noEmit
npm run spacetime:generate
npm run build
npm test            # integration tests against the local database (creates labeled test data)
cd mobile && npx tsc --noEmit && npx expo-doctor
```
