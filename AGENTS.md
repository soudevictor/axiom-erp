# AGENTS.md

Client-only Angular 22 ERP demo. There is no backend, auth, or real API: data lives in IndexedDB (Dexie) and `/api/v1/*` is served by an HTTP interceptor. UI copy, test descriptions, and seed data are pt-BR.

## Commands

- `npm start` — dev server at http://localhost:4200.
- `npm test` — full Vitest suite (~11 s).
- `npx vitest run src/app/path/to/file.spec.ts` — one spec; add `-t "test name"` to narrow further.
- `npm run type-check` — `tsc` for app sources only; specs are excluded, and app sources compile with `types: []` (no Node globals).
- `npm run build` — production build; Vercel output is `dist/axiom-erp/browser`.
- Run `npm run type-check && npm test && npm run build` before calling work done.
- `npm run lint` is broken (`ng lint` has no target); no ESLint is configured, so don't treat that failure as a regression.
- Keep `.npmrc`'s `legacy-peer-deps=true`; dependency installation relies on it.

## Architecture

- Boot path: `src/main.ts` → `app.config.ts` (providers + seed initializer) → `app.ts` (`<app-main-layout />`) → lazy routes in `app.routes.ts` (dashboard, inventory, treasury, partners).
- `core/api/*.api.ts` is the only layer that injects `HttpClient`; `signalStore`s call these services. Don't call `HttpClient` from stores or components.
- Stores live in `features/<feature>/data-access/*.store.ts`, are `providedIn: 'root'`, and load in `withHooks.onInit` (inventory, partners, treasury), so state survives route changes.
- `core/interceptors/mock-api.interceptor.ts` *is* the backend. A new endpoint needs changes in both the API service and this interceptor's routing block; URLs outside `/api/v1/{inventory,treasury,partners}` pass through to the real network.
- Validation and business rules are enforced in the interceptor and returned as `HttpErrorResponse` with `{ code, message }` in pt-BR; stores surface `error.error.message` through their `messageFrom` helpers.
- Domain rules, labels, and enums live in `core/models/*` (e.g. `deriveInventoryStatus`, `PARTNER_STATUS_TRANSITIONS`). Reuse them instead of re-deriving rules in components or specs.
- Dexie schema is in `core/database/app-database.ts`; for table/index changes add a new `version(n).stores(...)`, never edit an existing version.
- Startup seeding fills empty tables only. After changing seed files, use "Ferramentas de demonstração → Repopular dados" in the header (or delete IndexedDB) to see changes in an existing browser.
- `APP_VERSION` in `core/config/app-version.ts` is displayed in the UI; keep it aligned with `package.json` and the README version badge.

## UI

- Components are standalone, `OnPush`, and use inline templates/styles plus `inject()`, signals, and `@if`/`@for`. `src/app/app.html` and `app.scss` are unused leftovers; editing them has no effect.
- Import across folders with the `@/*` alias (`src/app/*`), configured in both `tsconfig.json` and `vitest.config.ts`.
- Reuse `shared/ui/*` and the `.ui-*` classes in `src/styles.scss`. Stick to semantic Tailwind tokens (`bg-canvas-surface`, `text-content-muted`, `border-border-subtle`, `text-state-*`); raw hex outside `styles.scss`, Tailwind `slate`/`gray` colors, gradients, and backdrop blur are intentionally absent.
- Theme is dark by default (`axiom-theme` in localStorage, `.dark` on `<html>`); `index.html` applies a stored light preference before boot.
- Filters are deep-linkable via query params (`?search=`, `?status=`, etc.). Preserve query-param syncing in inventory/partners/treasury when touching filtering.
- Keep new user-visible strings in pt-BR; there is no i18n layer.

## Tests

- Specs sit next to source as `*.spec.ts`; Vitest + jsdom, with `fake-indexeddb` and TestBed configured in `src/test-setup.ts`.
- The interceptor's 200–500 ms latency is real in tests. Existing specs wait with `setTimeout` (500/650/800 ms) or fake timers; don't assume an API call resolves immediately.
- Store specs seed and clear the shared Dexie `db` directly between tests; use the singleton from `core/database/app-database.ts`.
- The main-layout spec logs a pre-existing `NG0303` warning for the `open` binding plus jsdom `localStorage` warnings; the suite still passes.

## Deploy

- Vercel serves `dist/axiom-erp/browser`; `vercel.json` rewrites all paths to `index.html` for SPA deep links.
