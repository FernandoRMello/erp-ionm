<!--
Short, actionable guidance for AI coding agents working on this repository.
Focus: what an agent needs to be immediately productive (architecture, conventions,
API shapes, hotspots, and quirks discovered in the codebase).
```instructions
<!--
Short, actionable guidance for AI coding agents working on this repository.
Focus: what an agent needs to be immediately productive (architecture, conventions,
API shapes, hotspots, and quirks discovered in the codebase).
-->

# Copilot / AI agent instructions — ERP IONM (Netlify)

Purpose: give an AI coding agent the minimal, high‑value facts and examples so changes are safe and predictable.

- Top-level architecture
  - Frontend: single-file SPA at `index.html`. No build step; UI is pure HTML/JS/CSS and fetches `/api/<endpoint>` for data.
  - Backend: Netlify serverless functions in `netlify/functions/*.mjs`. Each file maps to `/api/<filename-without-.mjs>` via `netlify.toml` redirects.
  - Database: functions use `@netlify/neon` with `process.env.NETLIFY_DATABASE_URL` (Postgres). SQL uses the `sql` tagged template returned by `neon()`.

- Quick dev/run notes
  - Install deps: `npm install` (see `package.json`).
  - Local dev: prefer `netlify dev` (Netlify CLI). Set `NETLIFY_DATABASE_URL` in your shell before running to test DB-backed flows.
  - The UI contains a built-in mock DB (`MOCK_DB`) and a `useMockApi` toggle. The mock is active when `window.location.protocol === 'blob:'`. Use the mock for quick UI iterations.

  Note: functions rely on `NETLIFY_DATABASE_URL` at runtime. Do not commit credentials; set the env var in your shell before `netlify dev`.

- Naming and routing conventions
  - Function filename → API route: `netlify/functions/login-user.mjs` → `/api/login-user`.
  - Client-side helper calls use short names: `api.post('login-user', body)` → `/api/login-user`.

  Be aware: some filenames are slightly misleading — e.g. `get-user.mjs` returns a list of users. Inspect file contents before renaming.

- Important files to reference
  - `index.html` — single-file UI and the mock backend (shapes used by UI forms and requests).
  - `netlify/functions/*.mjs` — server handlers using `@netlify/neon` (examples: `login-user.mjs`, `create-user.mjs`, `get-companies.mjs`).
  - `netlify.toml` — redirect rules, `esbuild` bundler and `external_node_modules = ["@netlify/neon"]`.
  - `modules/` — HTML fragments loaded into the user workspace (e.g. `modules/pdv.html`).

- API surface (derived from filenames)
  - GET: `get-dashboard-data`, `get-companies`, `get-user` (returns users list), `get-modules`, `get-company-details`, `get-subscriptions-by-company`
  - POST: `login-user`, `create-company`, `create-user`, `create-module`, `update-company`, `update-subscriptions`, `renew-contract`
  - Example: `login-user` expects { login_user, password } and returns `{ user, permittedModules }`. See `netlify/functions/login-user.mjs` for SQL examples using `ANY()` with Postgres arrays.

- Patterns & conventions an agent must preserve
  - Functions are ESM `.mjs`. Two handler styles are present:
    - Lambda-style: `export const handler = async (event) => { return { statusCode, body } }` (example: `create-company.mjs`).
    - Fetch/edge-style: `export default async (req) => { const body = await req.json(); return new Response(...) }` (examples: `login-user.mjs`, `get-companies.mjs`).
    Match the local file style when editing or run the function locally to verify.
  - DB queries use `sql` tagged templates (neon). Always parameterize values using `${}` inside the template to avoid SQL injection.
  - Postgres arrays are used (e.g. `allowed_user_types`) and checked with `ANY()` in SQL. When inserting arrays from JS, pass JS arrays so `neon` maps them correctly.
  - Error responses use JSON: `{ error: '...' }` with appropriate HTTP status codes.

  Note: a few files contain accidental TypeScript-style artifacts or different hashing approaches; see 'quirks' below.

- Known quirks and hotspots (must call out to avoid regressions)
  - Handler style inconsistency: some functions export `handler` (Lambda style) while others export a default async function. Both run on Netlify, but be consistent when adding files.
  - TypeScript annotations inside `.mjs`: `create-user.mjs` imports `Context` and uses `req: Request, context: Context` — these are TS annotations and must be removed for Node runtime. Fix these before deploying.
  - Filename/content mismatches:
    - `get-user.mjs` returns multiple users (plural). Rename carefully or adjust client calls.
  - Password hashing is inconsistent:
    - `login-user.mjs` currently compares against `hashed_${password}` (placeholder).
    - `create-user.mjs` hashes using `crypto.createHash('sha256')`.
    Treat these as placeholders: if implementing real auth, update both create and login functions and the client expectations.

- Practical guidance when editing
  - Update client calls in `index.html` when adding/changing endpoints (search `api.post('...')` / `api.get('...')`).
  - Keep DB schema changes backward-compatible where possible; also update the in-browser `MOCK_DB` to mirror shape changes so the UI mock stays useful.
  - When adding dependencies that aren't provided by Netlify, either bundle them with `esbuild` or mark them carefully and test with `netlify dev`.
  - When changing SQL, run `netlify dev` with a test DB and exercise the UI flows that call the modified endpoints.

- Quick examples from the codebase
  - SQL parameterization example (do this style):
    const result = await sql`SELECT id, name FROM users WHERE login_user = ${login_user} AND password_hash = ${password_hash};`
  - Array check example used in `login-user.mjs`:
    AND ${user.user_type} = ANY(m.allowed_user_types)
  - Client call example from `index.html`:
    const { user, permittedModules } = await api.post('login-user', { login_user: login, password });

- Environment & security notes
  - `NETLIFY_DATABASE_URL` must be set in CI and local dev for DB-backed functions.
  - Do not commit secrets. Use Netlify environment variables for production.
  - `netlify.toml` marks `@netlify/neon` as external — when adding native modules, confirm runtime availability or include them in the bundle.

If any section is unclear or you want me to (a) remove TypeScript annotations from `.mjs` files and standardize handlers, (b) add npm scripts for `dev`/`start` (e.g. `npm run dev` calling `netlify dev`), or (c) implement bcrypt-based password hashing and update login flows, tell me which and I will update the repo accordingly.

```
