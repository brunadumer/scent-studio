# Scent Studio

A fragrance store demo in **Node.js + TypeScript + React** with three parts:

1. **Interactive storefront.** A dark, futuristic landing page built around a real-time **3D glass bottle** (three.js) that follows the cursor and changes liquid colour by scent family. It also has a family explorer that re-ranks the catalog live, tilt-and-glare product cards, and animated transitions (framer-motion).
2. **Scent finder.** A five-question quiz recommends perfumes by scent family, occasion and projection, and explains every match. The bottle's liquid mixes the colours of the families you pick, as you pick them.
3. **Multichannel operations.** Orders from **Shopify** and **Mercado Libre** flow into one inventory, get booked in **QuickBooks**, and push stock to the other channel. Retries, idempotency and webhook security are built in.

The catalog is fictional. The Shopify, Mercado Libre and QuickBooks calls are mocked, but they use the real payload shapes, so swapping in the real APIs means changing only the adapter files.

## Run it

```bash
npm install
npm run dev        # API on :5551, React app on http://localhost:5550
```

Production (one process serves the API and the built app):

```bash
npm run build
PORT=8080 npm start
```

## How an order flows

```
Shopify checkout ──webhook (HMAC-signed)──┐
                                          ├─► Order service ──► Job queue ──► QuickBooks SalesReceipt
Mercado Libre sale ─notification─► GET ───┘    dedupe            retry         Shopify inventory
                                   /orders/{id}  reserve stock   backoff       Mercado Libre stock
                                                                 dead-letter
```

| Concern | How it's handled | Where |
|---|---|---|
| Fake webhooks | Shopify HMAC-SHA256 over the **raw** body, constant-time compare. Mercado Libre notifications carry no data: we fetch the order with our own token | `server/integrations/shopify.ts`, `server/index.ts` |
| Duplicate deliveries | Orders are deduped by `(channel, external id)`. QuickBooks calls use `?requestid=` so a retry never books twice | `server/pipeline.ts`, `server/integrations/quickbooks.ts` |
| Flaky APIs | In-process queue with exponential backoff plus jitter, a dead-letter state, and a manual retry button | `server/queue.ts` |
| Overselling | One on-hand count is the source of truth. Stock jobs send **absolute** quantities read at run time, so retries converge. A sale against a stale count is flagged, not booked | `server/pipeline.ts` |
| Slow webhooks | Respond 200 right away and do the work afterwards | `server/index.ts` |
| Live dashboard | Server-Sent Events with a heartbeat and a client-side reconnect watchdog | `server/index.ts`, `web/src/api.ts` |
| Bad input | Zod schemas, with a 400 that explains the problem | `server/index.ts` |
| One type system | `shared/types.ts` is imported by both the API and the React app | `shared/` |

**Chaos mode** (Operations tab) makes the mocked APIs fail about 55% of the time, so you can watch retries, dead-letters and oversell detection happen live.

## Production next steps

- Store data in Postgres with a `UNIQUE (channel, external_id)` constraint. Run the queue on BullMQ/Redis, or a Postgres-backed queue, so jobs survive restarts.
- Store OAuth tokens per account, with scheduled refresh (QuickBooks and Mercado Libre access tokens are short-lived).
- Run a nightly reconciliation that compares channel stock and QuickBooks totals against our own records and alerts on drift.
- Ship the scent finder in the real store as a **Shopify theme app extension** (app block) that calls the API through an **app proxy**, with scent families stored as product **metafields**.
- Treat Mercado Libre marketplace fees and refunds as their own QuickBooks entries.

## Front-end details

| What | How |
|---|---|
| 3D bottle | `@react-three/fiber` + `drei`: studio lighting built from light panels (no HDR download), pointer-follow with damping, liquid colour eased per frame (`web/src/components/Bottle3D.tsx`) |
| Performance | The 3D scene is **code-split** with `React.lazy`, so three.js only downloads when a 3D stage is on screen. Without WebGL, a CSS bottle is shown instead (`Stage.tsx`) |
| Card tilt and cursor light | Pointer position is written straight to CSS variables, so mouse movement causes no React re-renders (`hooks.ts`, `App.tsx`) |
| Motion | framer-motion for reveals, shared-layout pills (`layoutId`) and the match rings. Page changes animate in only, so navigation never waits on an animation. `MotionConfig reducedMotion="user"` respects the OS setting |
| Colour transitions | `@property --scent` registers the colour as a typed CSS variable, so glows animate smoothly between scent colours |

## Stack

Node 22+, Express, TypeScript (strict), React 18, Vite, Zod, three.js (react-three-fiber), framer-motion. No database is needed to run the demo.
