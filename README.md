# BridgeHome

BridgeHome is a Cal Hacks React + TypeScript starter backed by SpacetimeDB. The
starter includes a public `person` table, reducers, generated TypeScript
bindings, and a React subscription that updates in real time.

## Prerequisites

- Node.js 18 or newer
- [SpacetimeDB CLI](https://spacetimedb.com/install) 2.13 or newer

## Run locally

Install the client and module dependencies:

```sh
npm install
npm --prefix spacetimedb install
```

Start SpacetimeDB in one terminal:

```sh
spacetime start
```

Publish the module and generate client bindings in another terminal:

```sh
spacetime publish bridgehome-3386g --server local --yes
npm run spacetime:generate
```

Start the React client:

```sh
npm run dev
```

Open <http://localhost:5173>. The status should show **Connected**. Adding a
person calls a reducer and updates every subscribed client in real time.

## Verify builds

```sh
spacetime build --module-path spacetimedb
npm run build
```

Local database names and environment overrides live in ignored files
(`spacetime.local.json` and `.env.local`) and are not committed.
