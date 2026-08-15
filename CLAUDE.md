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

`structure/` holds a mysqldump snapshot of the current schema (`structure-<date>.sql`) plus `structure/migrations/*.sql` — hand-written `CREATE TABLE`/`ALTER TABLE` scripts for schema changes made after the last dump. There is no migration runner: when adding a table, write the script into `structure/migrations/` and tell the user to apply it manually to MySQL.

## Architecture

### API (`api/`)
- `server.js` — single Express app: registers CORS, JSON body parsing, a dev-only request logger, mounts one router per resource under `/api/<resource>`, a `/api/health` check, and a catch-all error handler. Exports the `app` (for Vercel's serverless handler) and only calls `.listen()` when `NODE_ENV !== 'production'`.
- `routes/*.js` — one file per resource (`transactions`, `cards`, `loans`, `houseExpenses`, `credits`, `categories`, `fixedExpenses`, `recurringIncome`, `investments`, `dashboard`), each a self-contained `express.Router()` with inline SQL and try/catch per handler. There is no service/model/controller layering — routes talk to `db.query()` directly. Follow this same flat pattern for new resources rather than introducing new layers.
- `routes/loans.js` (`/api/loans`, table `loan`) and `routes/houseExpenses.js` (`/api/house-expenses`, table `house_expense`) share the same **installment-chain model**: one row per installment, carrying `parcelas` (total) + `parcela_atual` (which one this row is) + `status_pago`. `POST /:id/pagar` marks the row paid and inserts the *next* installment row (`parcela_atual + 1`, due date advanced one month via the local `proximaDataLimite`/`proximoVencimento` helper, which clamps to the last day of the target month so 31/01 → 28/02). Loans project forward only when `is_fixo = 1` (perpetual debt); house expenses project while `parcela_atual < parcelas`. `parcela_atual` is settable on create so debts/purchases already partly paid outside the system can be registered mid-chain. `houseExpenses` also exposes `POST /:id/reabrir` to undo a payment (no UI consumer today).
- `routes/dashboard.js` is the one aggregate endpoint: it fires the usual queries in parallel via `Promise.all` (current balance, month totals, latest investment per category, daily/monthly income-vs-expense series, spend-by-category, last 7 transactions, per-card invoice summary) **plus** a `previsaoSaldo` block (`calcularPrevisaoSaldo()`) computing a forward-looking balance forecast for the current and next month — it nets starting balance, pending recurring incomes/fixed expenses (those without a matching transaction yet in the period), projected card invoices, and current investment totals. Reshapes everything into one JSON payload consumed by the dashboard page's charts and forecast cards.
- Transactions with `DESCRICAO = 'BALANCEAMENTO'` (case/whitespace-insensitive) are treated as manual balance corrections, not real month activity: they're excluded from month income/expense totals and the daily/monthly series, but still counted in the all-time accumulated balance. Preserve this convention in any new balance-related query.
- The accumulated balance (`saldoGeral` / `previsaoSaldo.mesAtual.saldoInicial`) always subtracts the current total invested (latest `investment` row per `CATEGORIA`) — money moved into investments leaves available cash but is never logged as a `SAIDA` transaction, so it must be deducted manually wherever a "total balance" is computed (both `dashboard.js` and `DashboardPage.js` do this).
- Table names do not consistently match route/resource names — note the mismatches when writing SQL: `fixedExpenses` route → `fixed_expense` table, `recurringIncome` route → `recurring_income` table, `credits` route → `credit` table, `investments` route → `investment` table, `loans` route → `loan` table, `houseExpenses` route (`/api/house-expenses`) → `house_expense` table (all singular), while `transactions`, `cards`, `categories` are plural. Column names are mixed-case SCREAMING_SNAKE for financial fields (`DATA`, `TIPO`, `VALOR`, `DESCRICAO`) and lowercase snake_case for card/category metadata and for the newer tables (`nome`, `limite_total`, `vencimento_dia`, `categoria_id`, `descricao`, `valor_mensal`, `data_vencimento`, `status_pago`). Both `fixed_expense` and `recurring_income` have an `ATIVO` tinyint(1) flag (default `1`) for soft-disabling an entry without deleting it — the forecast query only considers rows where `ATIVO = 1`; recurring incomes also only recur monthly if `RECEITA = 'SALÁRIO'`, other recurring incomes only count as pending in the month they were registered in.

### Frontend (`frontend/src/`)
- No router library — `App.js` holds `currentPage` state and a `renderPage()` switch statement; `Sidebar` calls `onNavigate(page)` to change it. Add new pages by adding a case here and a nav entry in `Sidebar`, not by introducing React Router.
- `services/ApiService.js` — the only place that talks to the backend. A static class with one method per endpoint, all going through a shared `request()` helper. `API_BASE_URL` is `http://localhost:3001/api` in dev and `/api` in production (relies on `vercel.json` routing `/api/*` to the serverless function). Add new endpoints here rather than calling `fetch` directly from components.
- `pages/` — one top-level component per sidebar destination (`DashboardPage`, `TransactionsPage`, `CardsPage`, `HousePage`, `LoansPage`, `SettingsPage`); `components/` holds shared UI (`Sidebar`, `Pagination`) and a small `ui/` kit (`Button`, `Card`, `Input`, `Select`, `Table`) used across pages instead of a third-party component library.
- `HousePage` ("Casa", `/api/house-expenses`) and `LoansPage` ("Empréstimos", `/api/loans`) are the two installment-chain pages and share a layout contract — keep them in sync when touching either:
  - a highlighted `glass-card` **totalizador** at the top of the page (headline value for the current month + `Pendente no mês` / `Já pago no mês` / `Falta pagar|receber (total)`), then the inline quick-add form in a `Card`, then a `dashboard-grid` of expandable cards grouped by `categoria` (Casa) or `nome_devedor` (Empréstimos).
  - a **"Simplificado"** modal rendered through `createPortal` listing the open installments with `Faltam: N` and a total — on Casa it lives next to the headline value and groups everything by category with subtotals; on Empréstimos there is one per debtor card (the page-level totalizador deliberately has no button).
  - per-item actions in a fixed order: ✓ `Check` (only while pending) → `RotateCcw` indicator (the next installment is already projected) → `Edit2` → `Trash2`.
  - `corRestantes(restantes, padrao)` — a local helper both pages define — colors the remaining-installment count: **2 → blue (`COLORS.info`), 1 → green (`COLORS.success`)**, anything else keeps the caller's default color. Apply it anywhere a "N restantes"/"Faltam: N" count is rendered.
- Because paying an installment immediately creates the next row, `HousePage` derives `gastosProcessados` (a `useMemo`) to avoid showing the same purchase twice: rows are grouped into chains by `descricao + categoria` with sequential `parcela_atual`, and only **one row per chain stays visible** — the pending installment once its month has arrived (or is overdue), otherwise the last paid row flagged `projetado` (shows the `RotateCcw` icon). Totalizadores always sum *all* rows from the API, never the filtered/visible subset, so hiding a row never changes a total.
- `SettingsPage` manages CRUD for cards, categories, fixed expenses, recurring incomes (Receitas Recorrentes), and investments as tabs of one page, each following the same load/form/edit/delete pattern — add new settings-style resources as another tab here rather than a new page.
- `DashboardPage` renders a "Previsão de Saldo" (balance forecast) section for the current and next month, sourced from the dashboard endpoint's `previsaoSaldo` field, with an expandable breakdown of pending recurring incomes/fixed expenses/card invoices per month.
- `Pagination` shows a condensed page range (first, last, current ± 1 neighbor, with `…` ellipses) rather than every page number — keep this when touching pagination on large tables.
- `constants/theme.js` — the design system: `COLORS`, `GLASS`/`GLASS_LIGHT` (glassmorphism backdrop-filter presets), `SHADOWS`, `TRANSITIONS`, `FONT`, `SIDEBAR`, `BREAKPOINTS`. Styling is inline-style objects built from these constants (no CSS-in-JS library, no Tailwind) plus `App.css`/`index.css` for global rules. Reuse these tokens instead of hardcoding colors/spacing.
- Categories and cards are loaded once in `App.js` on mount and passed down as props (`categories`, `cards`) rather than fetched independently by each page.
- Background: `App.js` cross-fades through 10 static images in `public/background/` (`bg1.jpg`…`bg10.jpg`) on a 10-minute interval.

## Deployment

Deployed on Vercel via `vercel.json`: `api/server.js` is built as a serverless function (`@vercel/node`), the frontend is a static build (`@vercel/static-build`, `distDir: build`). Routes: `/api/*` → the API function, `/static/*` and known asset extensions → the frontend build output, everything else → `frontend/index.html` (SPA fallback). The root `vercel-build` script (`cd frontend && npm install && npm run build`) is what Vercel actually runs for the frontend half.
