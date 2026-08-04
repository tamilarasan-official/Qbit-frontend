# qbitio

An educational platform with role-based access (admin / mentor / student /
coursemaster), live Kahoot-style quizzes, multi-step task assignments, a points
and leaderboard system, discussions, hackathon teams, and shared resources.

**Stack:** Next.js 15 (App Router) · Express + TypeScript API · PostgreSQL 16 ·
WebSockets · Docker.

---

## Quick start

```bash
cp .env.example .env
# fill in POSTGRES_PASSWORD and JWT_SECRET -- both are required, see the file
docker compose up -d --build
```

Then create the first admin (signup always produces a student, and only an admin
can change roles):

```bash
docker compose exec backend node dist/scripts/create-admin.js \
  you@example.com 'a-strong-password' 'Your Name'
```

- App: http://localhost:3000
- API: http://localhost:4000/health

Deploying to a server: see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

---

## Layout

```
.                        Next.js frontend
├── app/                 routes (App Router)
├── components/          UI, mostly shadcn/ui
├── lib/api/core.ts      API client
├── utils/supabase/      client / server / middleware / realtime entry points
└── backend/             Express API
    ├── migrations/      schema, forward-only, committed
    └── src/
        ├── auth/        JWT sessions, Argon2id passwords, Google OAuth
        ├── query/       generic query endpoint + schema registry + policies
        ├── quiz/        live session control
        ├── rpc/         stored-procedure endpoints
        ├── storage/     file uploads
        └── realtime/    WebSocket hub
```

The `utils/supabase/` path is historical — those files no longer talk to
Supabase, they wrap `lib/api/core.ts`. The path was kept so the ~200 existing
call sites did not need editing.

---

## Local development without Docker

Two terminals, plus a Postgres you already have running:

```bash
# terminal 1 -- API on :4000
cd backend
npm install
cp ../.env.example .env       # set DATABASE_URL and JWT_SECRET
npm run migrate
npm run dev

# terminal 2 -- frontend on :3000
npm install
NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev
```

---

## How authorization works

There is no client-side database access. The browser talks only to the API,
which decides what each request may touch:

- **`backend/src/query/schema.ts`** — the allowlist. A table not listed here is
  unreachable; a column not listed cannot be read or written. `role` and
  `leaderboard_points` are absent from `profiles.updatable`, so no request can
  self-promote or mint points.
- **`backend/src/query/policies.ts`** — per-table, per-operation rules. Each
  returns a row filter that is ANDed into the query, constraining reads and
  bounding what an UPDATE or DELETE can reach. This is the equivalent of the
  Row Level Security policies that were previously an open TODO.
- **Dedicated endpoints** for anything the policy rules cannot express safely:
  role changes (`/api/admin/role`), points (`/api/rpc/*`), and live quiz control
  (`/api/quiz/*`).

Middleware redirects in `utils/supabase/middleware.ts` are UX only. Bypassing
them gains nothing, because the API authorizes independently.

---

## Schema changes

Migrations are forward-only and applied automatically at boot.

```bash
# add backend/migrations/0008_your_change.sql, then:
cd backend && npm run migrate
```

Applied files are immutable — each is checksummed in `schema_migrations`, and
editing one that has already run is a hard error rather than a silent drift
between environments. Add a new file instead.

`backend/migrations/` is the source of truth for the schema and **must stay in
version control**. `.gitignore` excludes `*.sql` with an explicit exception for
this directory.

---

## Dependency security

`next` is pinned to `^15.5.22`. Do not relax that floor: 15.5.4 carried a
**critical RCE in the React flight protocol** (GHSA-9qr9-h5gf-34mp) plus Server
Actions source-code exposure (GHSA-w37m-7fhw-fmv9), and this app uses Server
Actions throughout.

`npm audit` still reports 3 high findings, all in `sharp` → `libvips`. They are
not reachable here: `sharp` arrives only as Next's optional dependency for the
image optimizer, and this app sets `images.unoptimized: true` and uses zero
`next/image` — so sharp is never invoked and no attacker-supplied image is ever
decoded. Clearing them requires Next 16, which is a breaking upgrade and should
be done deliberately, not folded into a deployment.

The backend has zero vulnerabilities.

---

## Known gaps

- `next.config.mjs` sets `typescript.ignoreBuildErrors` because ~100 pre-existing
  type errors remain in the page components, mostly unannotated callback
  parameters under `strict`. The backend compiles clean with no such escape hatch.
- `npm run lint` does not work: there is no ESLint config and `eslint` is not
  installed.
- The WebSocket hub keeps subscriber state in process memory, so the backend runs
  as a single replica. See the scaling notes in DEPLOYMENT.md.
- `components/platform/tabs/AppsTab.tsx` imports `../AppCard`, which does not
  exist. Pre-existing; that tab will fail to render.
- The original README's task list is done or superseded: Google login is
  implemented (`backend/src/auth/routes.ts`), and RLS is replaced by the policy
  engine above. The leaderboard icon in the header remains open.
