# Deploying the qbitio portal

Puts the rebranded frontend on **`portal.qbitio.com`**, served by the **existing**
backend at **`api.edutou.in`** — same container, same database, same data.
Nothing is migrated.

`DEPLOYMENT.md` covers standing the whole stack up from nothing. This document
covers only the new frontend.

---

## How auth survives two different domains

The portal and the API are on different registrable domains (`qbitio.com` vs
`edutou.in`). That normally breaks cookie sessions, so it is worth knowing why
this setup works before changing anything.

Sign-in is a **Server Action**. `persistSessionCookies` in
`app/login/actions.ts` takes the API's `Set-Cookie` response and re-issues it
through Next's own cookie store — deliberately dropping the `Domain` attribute.
The session therefore lands as a **host-only cookie on `portal.qbitio.com`**, and
never exists on `api.edutou.in` at all.

The consequence: a browser `fetch` straight to `https://api.edutou.in` sends **no
cookie**, `credentials: 'include'` or not, and comes back 401. Not a CORS
problem and not a SameSite problem — the credential simply isn't on that host.

So browser traffic is routed through a path on the portal's own origin, proxied
upstream by the rewrite in `next.config.mjs`:

```
browser  ->  https://portal.qbitio.com/backend/...   (first-party, cookie attached)
             |
             |  Next.js rewrite
             v
             https://api.edutou.in/...
```

`lib/api/core.ts` picks the base per environment: `apiBase()` returns the proxy
path in the browser and the absolute API URL on the server, where fetches
forward the incoming cookie header explicitly.

This also keeps working in **Safari and on iOS**, which block third-party
cookies outright and would defeat any cross-site cookie arrangement.

---

## Frontend application

Dokploy → **Create Service → Application**.

- **Source**: GitHub → the frontend repo, branch `main`
- **Build type**: Dockerfile, path `Dockerfile`
- **Port**: `3000`

### Build arguments — not just env vars

Next.js inlines `NEXT_PUBLIC_*` into the browser bundle at **build** time. Set
these under **Build → Build Arguments** *and* as runtime environment variables,
or the deploy will look fine while browsers call the wrong host.

```
NEXT_PUBLIC_API_URL=https://api.edutou.in
NEXT_PUBLIC_API_PROXY_PATH=/backend
```

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.edutou.in
NEXT_PUBLIC_API_PROXY_PATH=/backend
```

Changing either later needs a **rebuild**, not a restart.

> `NEXT_PUBLIC_API_PROXY_PATH` defaults to `/backend` when unset. Set it to an
> empty string *only* if the API ever moves to a `qbitio.com` subdomain, which
> makes the proxy unnecessary.

### Domain

`portal.qbitio.com` → container port `3000`, HTTPS on, Let's Encrypt on.

---

## Backend environment

One line changes. **No code, no rebuild** — the API keeps serving `edutou.in`
exactly as it does now.

```env
CORS_ORIGINS=https://edutou.in,https://portal.qbitio.com
```

Strictly, proxied requests reach the API server-to-server and carry no `Origin`
header, so CORS is not consulted on the hot path. Add the origin anyway: it
costs nothing and prevents a confusing 403 the moment anything calls the API
directly from the browser.

Leave `COOKIE_DOMAIN` alone. The frontend strips the `Domain` attribute off
every session cookie it forwards (`app/login/actions.ts` on sign-in,
`utils/supabase/middleware.ts` on refresh), so whatever the backend scopes them
to is re-scoped host-only to the portal.

---

## Two features need more than the proxy

Both are called out in the code at their call sites. Neither blocks a deploy —
decide whether you need them.

### 1. Live quizzes (WebSocket)

`lib/api/core.ts` opens `wss://api.edutou.in/realtime`, and
`backend/src/realtime/hub.ts` authenticates that handshake from the session
cookie. Cross-domain, the handshake carries no cookie and the server closes it
`4401 Unauthenticated`.

**A Next.js rewrite cannot fix this** — rewrites do not upgrade connections, so
a WebSocket cannot travel through the proxy.

The failure is silent: normal pages work, students sit on a lobby that never
advances.

To enable live quizzes, add a **Traefik route on `portal.qbitio.com`** for path
`/backend/realtime` forwarding to the backend service on port `4000`, then point
the socket at the portal's own origin. Everything else keeps working untouched
if you skip this.

### 2. Google sign-in

The OAuth callback returns to the API's own `PUBLIC_URL`, which sets cookies on
`api.edutou.in` — a domain the portal cannot read. Email/password sign-in is
unaffected.

To enable it, route the callback through the portal so the cookie lands
first-party:

- backend env: `PUBLIC_URL=https://portal.qbitio.com/backend`
- Google Cloud Console → **Credentials → your OAuth client → Authorized redirect
  URIs**, add: `https://portal.qbitio.com/backend/auth/oauth/google/callback`

Keep the existing `api.edutou.in` entry so the old frontend still works. Note
`PUBLIC_URL` takes a single value, so this does move the canonical callback.

---

## Verify

```bash
curl https://api.edutou.in/health              # {"status":"ok",...}
curl https://portal.qbitio.com/backend/health  # same payload, through the proxy
```

The second command is the one that matters — it proves the rewrite is live.

Then in a browser at `https://portal.qbitio.com`:

1. **Branding** — tab title reads `qbitio`, favicon is the lime "Q", login hero
   and sidebar show the qbitio wordmark. No "Edutou" anywhere.
2. **Log in.** Bouncing straight back to `/login` means the proxy is not routing
   — check the build argument actually reached the image.
3. **DevTools → Network.** API calls should go to `portal.qbitio.com/backend/...`,
   not `api.edutou.in`. If you see the latter in the browser, the build arg was
   set as a runtime var only.
4. **DevTools → Application → Cookies.** `edutou_access` on `portal.qbitio.com`
   with **no** Domain value. (The cookie *name* still says edutou — it is
   internal, never shown to users, and renaming it is a backend change that
   would force everyone to sign in again.)
5. **Wait past the access-token TTL (15 min) and navigate.** You should stay
   signed in. This exercises the refresh path and the `Domain`-stripping fix; if
   you get bounced to `/login`, that is what regressed.
6. **Upload a file** on a task submission and download it back — proves the proxy
   passes bodies through intact.
7. **Themes** — toggle light / dark / reading. Lime surfaces should carry black
   text; nothing should be lime-on-white.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Login bounces straight back to `/login` | Browser is calling the API directly — `NEXT_PUBLIC_API_PROXY_PATH` empty, or the rewrite is not in the built image |
| Signed out every ~15 minutes | Refresh cookie rejected. The `Domain`-strip in `utils/supabase/middleware.ts` is missing or was reverted |
| Network tab shows `api.edutou.in` from the browser | `NEXT_PUBLIC_*` set as runtime env only — it must **also** be a build argument, then rebuild |
| `404` on `/backend/...` | Rewrite absent; `NEXT_PUBLIC_API_PROXY_PATH` was empty at **build** time |
| Live quiz never advances, everything else fine | Expected without the Traefik `/backend/realtime` route — see above |
| Google button does nothing useful | Expected without the `PUBLIC_URL` change — see above |
| `403 CORS` | `https://portal.qbitio.com` missing from `CORS_ORIGINS` — needs the scheme, no trailing slash |
| Old `edutou.in` frontend broke | Nothing here should touch it. Check `CORS_ORIGINS` still lists its origin |
