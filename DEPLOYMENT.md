# Deploying Edutou to Dokploy

Three **separate** Dokploy services, from two GitHub repositories:

| Service | Type | Source | Public domain |
| --- | --- | --- | --- |
| `edutou-db` | Database (PostgreSQL 16) | Dokploy managed | none — internal only |
| `edutou-api` | Application (Dockerfile) | `edutou-backend` repo | `api.edutou.example.com` |
| `edutou-web` | Application (Dockerfile) | `edutou-frontend` repo | `edutou.example.com` |

Deploys are driven by GitHub Actions: push to `main` → CI runs → on green, a
webhook triggers the Dokploy redeploy.

---

## 0. Split the repositories

From the current monorepo working tree:

```bash
bash scripts/split-repos.sh ../edutou-split
```

That produces two independent git repositories with an initial commit, without
touching the source tree. It refuses to run if the target exists, strips
`node_modules` / `dist` / `.next`, and never copies a real `.env`.

Then create two **empty** GitHub repos and push:

```bash
cd ../edutou-split/edutou-backend
git remote add origin git@github.com:<you>/edutou-backend.git
git push -u origin main

cd ../edutou-frontend
git remote add origin git@github.com:<you>/edutou-frontend.git
git push -u origin main
```

---

## 1. Generate secrets

Keep this output; you will paste it into Dokploy twice.

```bash
openssl rand -base64 32                                                        # DB password
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))" # JWT_SECRET
```

`JWT_SECRET` must be at least 32 characters — the API refuses to boot otherwise
rather than falling back to something guessable.

---

## 2. Create the database

Dokploy → **Project → Create Service → Database → PostgreSQL**.

| Field | Value |
| --- | --- |
| Name | `edutou-db` |
| Image | `postgres:16-alpine` |
| Database | `edutou` |
| User | `edutou` |
| Password | *the generated DB password* |

**Do not expose a public port.** Leave the external port unset so the database
is reachable only on Dokploy's internal network.

Note the internal hostname Dokploy assigns (usually the service name). The
connection string for the API is:

```
postgres://edutou:<DB_PASSWORD>@edutou-db:5432/edutou
```

Enable **Backups** on this service and set a schedule. See §6 — the database
backup alone is not sufficient.

---

## 3. Create the API application

Dokploy → **Create Service → Application**.

- **Source**: GitHub → `edutou-backend`, branch `main`
- **Build type**: Dockerfile, path `Dockerfile`
- **Port**: `4000`

### Environment

```env
NODE_ENV=production
PORT=4000

DATABASE_URL=postgres://edutou:<DB_PASSWORD>@edutou-db:5432/edutou
DATABASE_POOL_MAX=10

JWT_SECRET=<generated>
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_SECONDS=2592000

CORS_ORIGINS=https://edutou.example.com
PUBLIC_URL=https://api.edutou.example.com
FRONTEND_URL=https://edutou.example.com
COOKIE_DOMAIN=.edutou.example.com

STORAGE_DIR=/var/lib/edutou/uploads
MAX_UPLOAD_BYTES=26214400

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Volume — required

**Advanced → Volumes**, add a persistent volume:

| Mount path | Purpose |
| --- | --- |
| `/var/lib/edutou/uploads` | Task submissions and shared resources |

Without this, every uploaded file is deleted on the next deploy. The database
keeps rows pointing at files that no longer exist.

### Domain

`api.edutou.example.com` → container port `4000`, HTTPS on, Let's Encrypt on.

WebSockets (`wss://.../realtime`) are upgraded by Traefik automatically — no
extra configuration. If live quiz updates stall while normal requests work,
that upgrade is the first thing to check.

### Replicas — leave at 1

The WebSocket hub keeps subscriber state in process memory. With two replicas,
an event published by one never reaches clients connected to the other, so
students silently stop receiving questions. Scaling out requires a Redis
pub/sub adapter in `src/realtime/hub.ts` first.

---

## 4. Create the frontend application

- **Source**: GitHub → `edutou-frontend`, branch `main`
- **Build type**: Dockerfile, path `Dockerfile`
- **Port**: `3000`

### Build argument — not an env var

`NEXT_PUBLIC_API_URL` is inlined into the browser bundle at **build** time.
Set it under **Build → Build Arguments**:

```
NEXT_PUBLIC_API_URL=https://api.edutou.example.com
```

Also add it as a runtime environment variable, which is what server-side
rendering uses:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.edutou.example.com
```

Changing this value later requires a **rebuild**, not a restart. A plain
redeploy leaves browsers calling the old URL.

### Domain

`edutou.example.com` → container port `3000`, HTTPS on, Let's Encrypt on.

---

## 5. Wire up CI/CD

In each Dokploy application: **Deployments → Webhook**, copy the URL.

In each GitHub repo: **Settings → Secrets and variables → Actions → New secret**

| Repo | Secret name | Value |
| --- | --- | --- |
| `edutou-backend` | `DOKPLOY_BACKEND_DEPLOY_URL` | backend webhook URL |
| `edutou-frontend` | `DOKPLOY_FRONTEND_DEPLOY_URL` | frontend webhook URL |

The workflows skip the deploy step (rather than failing) when the secret is
absent, so a fork or a first push does not show a red build.

**What runs on every push:**

*Backend* — typecheck (`strict`, zero errors) → migrate against a throwaway
Postgres → migrate again to prove idempotency → 105 integration tests → build
the image → boot it against a real database and poll `/health/ready` → deploy.

*Frontend* — `npm ci` → `next build` → assert no `@supabase` import has been
reintroduced → build the image → boot it and poll `/login` → deploy.

A failing test blocks the deploy.

---

## 6. First deploy

Deploy the **API first** — on boot it applies all migrations, so the schema
exists before anything else touches it. Then deploy the frontend.

Create the first admin (signup always yields a student, and only an admin can
change roles). Dokploy → `edutou-api` → **Terminal**:

```bash
node dist/scripts/create-admin.js you@yourdomain.com 'a-strong-password' 'Your Name'
```

---

## 7. Verify

```bash
curl https://api.edutou.example.com/health        # {"status":"ok",...}
curl https://api.edutou.example.com/health/ready  # {"status":"ready"} -- DB reachable
```

Then walk the portal in a browser:

1. Sign in as the admin → `/admin` loads, users are listed.
2. **Admin → Students** → change someone's role. It should succeed *and* sign
   that user out (their role claim is revoked).
3. Create a mentor, sign in as them, **Mentor → Make Quiz** → create and publish.
4. **Start Live** → note the code. In a second browser, sign in as a student and
   join by code.
5. Start the quiz. The student should see the question appear without
   refreshing — that proves the WebSocket path works end to end.
6. Answer, advance, finish. Check `/leaderboard` shows the points.
7. **Task** → submit a step with a file attachment, then redeploy the API and
   confirm the file still downloads. That proves the volume is mounted.

Step 7 is the one people skip and regret.

---

## 8. Backups

Two things must be backed up, and they are **not** in the same place:

```bash
# Database -- or use Dokploy's scheduled backup on the edutou-db service
docker exec <db-container> pg_dump -U edutou edutou | gzip > edutou-$(date +%F).sql.gz

# Uploads volume
docker run --rm -v <uploads-volume>:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

A database dump alone restores the app with every file reference dangling.

Restore:

```bash
gunzip -c edutou-2026-08-04.sql.gz | docker exec -i <db-container> psql -U edutou -d edutou
```

---

## Google sign-in (optional)

1. Google Cloud Console → **APIs & Services → Credentials → OAuth client ID →
   Web application**.
2. Authorized redirect URI, exactly:
   `https://api.edutou.example.com/auth/oauth/google/callback`
3. Put the client ID and secret in the **API** application's environment and
   redeploy.

The client secret stays server-side; the browser only ever follows a redirect.
The button hides itself when the variables are absent.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Login succeeds then bounces straight back to `/login` | `COOKIE_DOMAIN` does not cover both subdomains, or `CORS_ORIGINS` is missing the frontend origin |
| Every API call returns 403 `CORS` | Frontend origin absent from `CORS_ORIGINS` — needs the scheme, no trailing slash |
| Browser requests `localhost:4000` in production | `NEXT_PUBLIC_API_URL` changed without a rebuild |
| Live quiz never advances for students | WebSocket upgrade not reaching `/realtime`, or the API is running more than one replica |
| Uploaded files vanish after a deploy | The `/var/lib/edutou/uploads` volume is not mounted |
| API restart-loops on first deploy | `JWT_SECRET` missing or under 32 characters — the log names the failing variable |
| `Migration XXXX was already applied but its contents have changed` | A committed migration was edited. Revert it and add a new file. |
| `503` from `/health/ready` | The API is up but cannot reach Postgres — check `DATABASE_URL` and that both services share a network |
