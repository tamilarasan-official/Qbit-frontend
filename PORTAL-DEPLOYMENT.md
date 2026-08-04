# Deploying the qbitio portal

Puts the rebranded frontend on **`portal.qbitio.com`**, served by the **existing**
backend — same container, same database, same data. Nothing is migrated and no
backend code changes.

`DEPLOYMENT.md` covers standing the whole stack up from nothing. This document
covers only the new frontend.

---

## The one prerequisite: the API needs a `qbitio.com` hostname

**This is not optional, and it is not something the frontend can work around.**

Authentication rides on httpOnly cookies (`lib/api/core.ts` sends
`credentials: 'include'`), and the backend sets them `SameSite=Lax`
(`backend/src/middleware/auth.ts`). Browsers decide "same-site" by comparing the
**registrable domain**, not the hostname:

| Frontend | API | Registrable domains | Cookie sent? |
| --- | --- | --- | --- |
| `portal.qbitio.com` | `api.qbitio.com` | `qbitio.com` = `qbitio.com` | **yes** |
| `portal.qbitio.com` | `api.edutou.in` | `qbitio.com` ≠ `edutou.in` | **no** |

Pointing the portal straight at `api.edutou.in` fails three ways at once:

1. **Every REST call is anonymous.** The cookie is not attached to a cross-site
   `fetch`. Login appears to succeed, then the app bounces back to `/login`.
2. **Live quizzes never start.** `backend/src/realtime/hub.ts` authenticates the
   WebSocket from that same cookie in the handshake; without it the socket is
   closed with `4401 Unauthenticated`. This one is silent — normal pages look
   fine while students sit on a frozen lobby.
3. **Safari and iOS cannot log in at all.** Relaxing the backend to
   `SameSite=None; Secure` would make it a third-party cookie: Safari's ITP
   blocks those outright, Firefox partitions them, Chrome blocks them in
   Incognito. That change also weakens CSRF protection, and it is a backend code
   change — so it buys a worse product *and* breaks the "frontend only" rule.

### What to do instead

In Dokploy, open the **existing** API application and add a **second domain**:

| Field | Value |
| --- | --- |
| Host | `api.qbitio.com` |
| Container port | `4000` |
| HTTPS | on |
| Let's Encrypt | on |

`api.edutou.in` stays exactly as it is and keeps serving. You are adding a route
to the running service, not redeploying or moving it.

DNS: `api.qbitio.com` → the same server IP as `api.edutou.in`.

---

## Backend environment (env vars only — no code, no rebuild)

On the existing API application:

```env
# add the new origin; keep the old one so the current frontend keeps working
CORS_ORIGINS=https://edutou.in,https://portal.qbitio.com

# REMOVE this variable entirely (see below)
# COOKIE_DOMAIN=.edutou.in
```

### Why `COOKIE_DOMAIN` must be unset

A cookie's `Domain` attribute can only name the domain that set it or a parent
of it. `api.edutou.in` **cannot** issue a cookie scoped to `qbitio.com` — the
browser rejects it. One backend serving two unrelated domains therefore cannot
use a single pinned `COOKIE_DOMAIN`.

With the variable absent, the backend issues **host-only** cookies, which is
what you want here:

- request to `api.edutou.in` → cookie for `api.edutou.in` → sent from `edutou.in` (same-site)
- request to `api.qbitio.com` → cookie for `api.qbitio.com` → sent from `portal.qbitio.com` (same-site)

Both frontends work off one backend.

> **Expect one forced sign-out.** Changing the cookie scope invalidates sessions
> issued under the old scope. Existing users log in again once. Schedule it
> accordingly.

`PUBLIC_URL` and `FRONTEND_URL` are used for OAuth redirects. They take a single
value, so point them at whichever frontend is now canonical:

```env
PUBLIC_URL=https://api.qbitio.com
FRONTEND_URL=https://portal.qbitio.com
```

---

## Frontend application

Dokploy → **Create Service → Application**.

- **Source**: GitHub → the frontend repo, branch `main`
- **Build type**: Dockerfile, path `Dockerfile`
- **Port**: `3000`

### `NEXT_PUBLIC_API_URL` is a build argument, not just an env var

Next.js inlines `NEXT_PUBLIC_*` into the browser bundle at **build** time. Set it
in **both** places or the deploy will look fine and the browser will call the
wrong host.

**Build → Build Arguments:**

```
NEXT_PUBLIC_API_URL=https://api.qbitio.com
```

**Environment** (used by server-side rendering):

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.qbitio.com
```

Changing this later needs a **rebuild**, not a restart. A plain redeploy leaves
browsers calling the old address.

### Domain

`portal.qbitio.com` → container port `3000`, HTTPS on, Let's Encrypt on.

WebSockets (`wss://api.qbitio.com/realtime`) are upgraded by Traefik
automatically — but note they go to the **API** domain, not the portal domain, so
nothing extra is needed on this service.

---

## Google sign-in

If Google OAuth is enabled, add the new callback URL in Google Cloud Console →
**APIs & Services → Credentials → your OAuth client → Authorized redirect URIs**:

```
https://api.qbitio.com/auth/oauth/google/callback
```

Keep the existing `api.edutou.in` entry. Google accepts multiple redirect URIs;
the one used is whichever host the request came through.

---

## Verify

```bash
curl https://api.qbitio.com/health        # {"status":"ok",...}
curl https://api.qbitio.com/health/ready  # {"status":"ready"}
```

Then in a browser at `https://portal.qbitio.com`:

1. **Branding** — tab title reads `qbitio`, favicon is the lime "Q", the login
   hero and sidebar show the qbitio wordmark. No "Edutou" anywhere.
2. **Log in.** If you land back on `/login`, the cookie is not crossing — recheck
   `CORS_ORIGINS` and that `COOKIE_DOMAIN` is genuinely unset (not empty-string).
3. **Reload a signed-in page.** Proves SSR is forwarding cookies.
4. **Open DevTools → Application → Cookies.** You should see `edutou_access` on
   `api.qbitio.com` with **no** Domain value. (The cookie *name* still says
   edutou — it is internal and never shown to users. Renaming it is a backend
   change and would force another sign-out.)
5. **Start a live quiz** and join as a student in a second browser. The question
   must appear without a refresh. This is the check that catches the WebSocket
   cookie problem, and it is the one people skip.
6. **Themes** — toggle light / dark / reading. Lime surfaces should carry black
   text; nothing should be lime-on-white.

---

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Login succeeds then bounces to `/login` | Portal is calling `api.edutou.in` instead of `api.qbitio.com`, or `COOKIE_DOMAIN` is still pinned to `.edutou.in` |
| Every API call returns 403 `CORS` | `https://portal.qbitio.com` missing from `CORS_ORIGINS` — needs the scheme, no trailing slash |
| Browser calls the old API host | `NEXT_PUBLIC_API_URL` changed without a **rebuild** |
| Live quiz never advances, REST works | WebSocket handshake carried no cookie — almost always the cross-site case above |
| Works in Chrome, fails in Safari | Third-party cookies. Means the portal is still talking cross-site to `api.edutou.in` |
| Old frontend logged everyone out | Expected once, after `COOKIE_DOMAIN` was unset |

---

## If you truly cannot add `api.qbitio.com`

The only remaining option that keeps auth working is to make the API
**same-origin** with the portal by proxying it through the frontend:

- `next.config.mjs` rewrite `/api/:path*` → `https://api.edutou.in/:path*`, with
  `NEXT_PUBLIC_API_URL` set to empty so calls go to the portal's own origin
- a Route Handler is additionally needed to strip the `Domain` attribute from
  proxied `Set-Cookie` headers, or the browser rejects them
- **WebSockets cannot be proxied this way.** Next.js rewrites and Route Handlers
  do not upgrade connections, so `/realtime` needs a Traefik route on
  `portal.qbitio.com` pointing at the backend service — which is infrastructure
  work anyway

That is strictly more moving parts than adding a hostname, and it puts every API
request through an extra hop. Adding `api.qbitio.com` is the better trade in
essentially every case.
