# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

CoreFin is a personal finance control system ("Sistema de Controle Financeiro Pessoal"), a monorepo with:
- `api/` — Express + MySQL REST API (raw SQL via `mysql2/promise`, no ORM)
- `frontend/` — Create React App (React 19) SPA, no client-side router (page switching via component state)

Both sides use Portuguese for domain terms (variable names, DB columns, UI copy, comments). Match this convention when adding code — don't translate existing Portuguese identifiers to English.

## Commands

Run from the repo root (uses npm workspaces-style scripts via `concurrently`, not actual workspaces):

```bash
npm run install:all      # install deps in both api/ and frontend/
npm run dev              # run api + frontend concurrently
npm run dev:api           # api only, nodemon on port 3001 (or $PORT)
npm run dev:frontend      # frontend only, react-scripts start on port 3002 (hardcoded in frontend/package.json start script)
npm run build:frontend    # production build of the frontend
```

Frontend tests (Create React App / Jest + React Testing Library):
```bash
cd frontend && npm test                          # watch mode
cd frontend && npm test -- --watchAll=false       # single run (CI mode)
cd frontend && npm test -- App.test.js            # single file
```

There is no test suite for the API.

There is no lint script configured for either package; `frontend`'s only lint config is CRA's default `eslintConfig` (`react-app`, `react-app/jest`) which runs as part of `react-scripts start`/`build`.

## Environment

The API loads config from `api/.env` (gitignored) via `dotenv`. Required variables:
```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, NODE_ENV, PORT
```
`api/config/database.js` creates a `mysql2/promise` connection pool from these at import time and logs a connect/fail message immediately — there's no separate "run migrations" step; the schema is assumed to already exist in the target MySQL database.

## Architecture

### API (`api/`)
- `server.js` — single Express app: registers CORS, JSON body parsing, a dev-only request logger, mounts one router per resource under `/api/<resource>`, a `/api/health` check, and a catch-all error handler. Exports the `app` (for Vercel's serverless handler) and only calls `.listen()` when `NODE_ENV !== 'production'`.
- `routes/*.js` — one file per resource (`transactions`, `cards`, `credits`, `categories`, `fixedExpenses`, `investments`, `dashboard`), each a self-contained `express.Router()` with inline SQL and try/catch per handler. There is no service/model/controller layering — routes talk to `db.query()` directly. Follow this same flat pattern for new resources rather than introducing new layers.
- `routes/dashboard.js` is the one aggregate endpoint: it fires ~8 queries in parallel via `Promise.all` (current balance, month totals, latest investment per category, daily/monthly income-vs-expense series, spend-by-category, last 7 transactions, per-card invoice summary) and reshapes them into one JSON payload consumed by the dashboard page's charts.
- Table names do not consistently match route/resource names — note the mismatches when writing SQL: `fixedExpenses` route → `fixed_expense` table, `credits` route → `credit` table, `investments` route → `investment` table (all singular), while `transactions`, `cards`, `categories` are plural. Column names are mixed-case SCREAMING_SNAKE for financial fields (`DATA`, `TIPO`, `VALOR`, `DESCRICAO`) and lowercase snake_case for card/category metadata (`nome`, `limite_total`, `vencimento_dia`, `categoria_id`).

### Frontend (`frontend/src/`)
- No router library — `App.js` holds `currentPage` state and a `renderPage()` switch statement; `Sidebar` calls `onNavigate(page)` to change it. Add new pages by adding a case here and a nav entry in `Sidebar`, not by introducing React Router.
- `services/ApiService.js` — the only place that talks to the backend. A static class with one method per endpoint, all going through a shared `request()` helper. `API_BASE_URL` is `http://localhost:3001/api` in dev and `/api` in production (relies on `vercel.json` routing `/api/*` to the serverless function). Add new endpoints here rather than calling `fetch` directly from components.
- `pages/` — one top-level component per sidebar destination (`DashboardPage`, `TransactionsPage`, `CardsPage`, `SettingsPage`); `components/` holds shared UI (`Sidebar`, `Pagination`) and a small `ui/` kit (`Button`, `Card`, `Input`, `Select`, `Table`) used across pages instead of a third-party component library.
- `constants/theme.js` — the design system: `COLORS`, `GLASS`/`GLASS_LIGHT` (glassmorphism backdrop-filter presets), `SHADOWS`, `TRANSITIONS`, `FONT`, `SIDEBAR`, `BREAKPOINTS`. Styling is inline-style objects built from these constants (no CSS-in-JS library, no Tailwind) plus `App.css`/`index.css` for global rules. Reuse these tokens instead of hardcoding colors/spacing.
- Categories and cards are loaded once in `App.js` on mount and passed down as props (`categories`, `cards`) rather than fetched independently by each page.
- Background: `App.js` cross-fades through 10 static images in `public/background/` (`bg1.jpg`…`bg10.jpg`) on a 10-minute interval.

## Deployment

Deployed on Vercel via `vercel.json`: `api/server.js` is built as a serverless function (`@vercel/node`), the frontend is a static build (`@vercel/static-build`, `distDir: build`). Routes: `/api/*` → the API function, `/static/*` and known asset extensions → the frontend build output, everything else → `frontend/index.html` (SPA fallback). The root `vercel-build` script (`cd frontend && npm install && npm run build`) is what Vercel actually runs for the frontend half.
