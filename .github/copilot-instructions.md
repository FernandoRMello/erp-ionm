<!--
Short, actionable guidance for AI coding agents working on this repository.
Focus: what an agent needs to be immediately productive (architecture, conventions,
API shapes, hotspots, and quirks discovered in the codebase).
-->

# Copilot / AI agent instructions — ERP IONM (Netlify)

Purpose: give an AI coding agent the minimal, high‑value facts and examples so changes are safe and predictable.

- Top-level architecture
  - Frontend: single-file SPA at `index.html`. It's a lightweight client-side app (no build step) that uses fetch to `/api/<endpoint>`.
  - Backend: Netlify serverless functions located in `netlify/functions/*.mjs`. Each `.mjs` file maps to a runtime endpoint `/api/<filename-without-.mjs>` (see `netlify.toml` redirect).
  - Database: functions use `@netlify/neon` and expect `process.env.NETLIFY_DATABASE_URL` (Postgres). SQL is executed via the tagged template `sql` exported by `neon()`.

- Quick dev/run notes (discoverable but not present as scripts)
  - Install deps: run `npm install` (repository has a `package.json` with dependency `@netlify/neon`).
  - To run functions + frontend locally prefer the Netlify CLI: `netlify dev` (set `NETLIFY_DATABASE_URL` in your environment to test real DB calls).
  - The `index.html` includes a client-side mock (`MOCK_DB`) used by the UI preview. The mock is enabled when `window.location.protocol === 'blob:'`. If you need to force it, toggle the `useMockApi` variable in the file.

- Naming and routing conventions
  - Function filename → API route: `netlify/functions/login-user.mjs` → `/api/login-user`.
  - Client-side code calls `/api/<name>` (e.g. `api.post('login-user', body)` maps to `/api/login-user`). Keep this mapping when renaming endpoints.

- Important files to reference
  - `index.html` — single-file UI and the mock backend (MOCK_DB). Shows the client shapes used by the UI (forms, payload keys).
  - `netlify/functions/*.mjs` — server handlers using `@netlify/neon` (examples: `login-user.mjs`, `create-user.mjs`, `get-companies.mjs`).
  - `netlify.toml` — functions directory, `esbuild` bundler and `external_node_modules = ["@netlify/neon"]`.

- API surface (derived from filenames)
  - GET: `get-dashboard-data`, `get-companies`, `get-users`, `get-modules`, `get-company-details`, `get-subscriptions-by-company`, `get-user`
  - POST: `login-user`, `create-company`, `create-user`, `create-module`, `update-company`, `update-subscriptions`, `renew-contract`
  - Example: `login-user` expects { login_user, password } and returns `{ user, permittedModules }` on success. See `netlify/functions/login-user.mjs`.

- Patterns & conventions an agent must preserve
  - Functions are ESM `.mjs` files that export a default async handler: `export default async (req) => { ... }` and return `new Response(JSON.stringify(...), { status })`.
  - Database queries use `sql\\`...\\`` (neon tagged template). Keep template parameters inside `${}` — do not build SQL via string concatenation.
  - Postgres arrays are used (e.g. `allowed_user_types`); queries use `ANY()` in SQL (see `login-user.mjs`). When inserting/updating, ensure arrays are stored in a Postgres-friendly format.
  - Error responses follow `{ error: '...' }` and appropriate HTTP status codes (400, 401, 404, 500). Follow the same shape for consistency.

- Known quirks and hotspots (must call out to avoid regressions)
  - create-company mismatch: `netlify/functions/create-company.mjs` currently contains logic to renew a contract (accepts `{ companyId, renewalPeriodDays }`) — not a create flow. The frontend expects `create-company` to create a new company (see `index.html` which posts `create-company` from the company form). Investigate and reconcile endpoints before refactoring or deleting files.
  - Password handling is simulated: functions set `password_hash = 'hashed_' + password` (placeholder). Real work: replace with bcrypt (or equivalent) when implementing real auth; remember to update both creation and login flows to use the real hash and verification.
  - Client mock vs real API: `index.html` contains `mockApi` logic for local preview. The production code uses `/api/*` routes. When editing UI logic, check both the mock implementation (for quick UI tests) and server handlers (for real integration).

- Small implementation guidance for agents
  - When adding or changing endpoints, update both: `netlify/functions/<file>.mjs` and any client usage in `index.html` (search for `api.post('...')` or `api.get('...')`).
  - Keep SQL parameterization via the `sql` template; prefer returning structured objects, not HTML, from functions.
  - When adding DB fields used by the frontend, prefer backward-compatible changes (nullable/optional) and add defensive checks in both functions and `index.html` (the UI expects certain fields like `nome_fantasia`, `company_id`, `user_type`).

- Environment and security notes
  - The runtime expects `NETLIFY_DATABASE_URL` in environment variables. Do not commit DB credentials. Local dev: export that env var in your shell before running `netlify dev`.
  - `netlify.toml` marks `@netlify/neon` as external — when adding new native modules, confirm Netlify runtime availability or include them in the bundle.

If any section is unclear or you want me to (a) reconcile `create-company` ⇄ frontend usage, (b) add simple npm scripts for `dev`/`start`, or (c) implement bcrypt-based password hashing across functions, tell me which and I will update the repo accordingly.
