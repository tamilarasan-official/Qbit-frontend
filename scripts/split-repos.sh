#!/usr/bin/env bash
#
# Split this working tree into the two repositories that get pushed to GitHub:
#
#   edutou-frontend  -- everything except backend/
#   edutou-backend   -- the contents of backend/
#
# Both are created OUTSIDE this directory so nothing here is modified or
# deleted. Run it once, inspect the output, then add remotes and push.
#
#   bash scripts/split-repos.sh ../edutou-split
#
set -euo pipefail

SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-$(dirname "$SOURCE")/edutou-split}"

if [ -e "$TARGET" ]; then
  echo "Refusing to run: $TARGET already exists."
  echo "Remove it or pass a different path."
  exit 1
fi

FRONTEND="$TARGET/edutou-frontend"
BACKEND="$TARGET/edutou-backend"

echo "Source: $SOURCE"
echo "Target: $TARGET"
echo

mkdir -p "$FRONTEND" "$BACKEND"

# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------
echo "==> Building $BACKEND"
# -a preserves the dotfiles (.env.example, .gitignore, .github, .dockerignore).
cp -a "$SOURCE/backend/." "$BACKEND/"

# Never carry local build output or secrets across.
rm -rf "$BACKEND/node_modules" "$BACKEND/dist" "$BACKEND/.test-uploads"
rm -f "$BACKEND/.env"

# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------
echo "==> Building $FRONTEND"
for entry in "$SOURCE"/* "$SOURCE"/.[!.]*; do
  name="$(basename "$entry")"
  case "$name" in
    backend|node_modules|.next|.git|out|build) continue ;;
    .env) continue ;;
  esac
  [ -e "$entry" ] || continue
  cp -a "$entry" "$FRONTEND/"
done

# The root compose file builds all three services together, including
# `context: ./backend` -- a directory that does not exist in the frontend repo.
# Shipping it would leave a file that cannot work, so it is dropped. Local
# backend development uses backend/docker-compose.yml in the other repo; the
# frontend on its own only needs `npm run dev`.
rm -f "$FRONTEND/docker-compose.yml"

# ---------------------------------------------------------------------------
# Initialise git
# ---------------------------------------------------------------------------
# Use the machine's configured git identity so the commit is attributable to a
# real person. Falls back to a placeholder only if nothing is configured.
AUTHOR_NAME="$(git config --global user.name || true)"
AUTHOR_EMAIL="$(git config --global user.email || true)"
: "${AUTHOR_NAME:=edutou-setup}"
: "${AUTHOR_EMAIL:=setup@edutou.local}"

COMMIT_MESSAGE="$(cat <<'MSG'
Initial commit

Migrated off Supabase to a self-hosted PostgreSQL backend:

- 7 forward-only SQL migrations covering 26 application tables plus the
  identity tables that replace GoTrue
- Express + TypeScript API with JWT sessions, Argon2id passwords, a
  table/column allowlist and a per-table policy engine replacing the
  Row Level Security that was never written
- WebSocket hub replacing Supabase Realtime; disk-backed file storage
  replacing Supabase Storage
- 105 integration tests against a real database
- Docker images and GitHub Actions CI/CD for Dokploy

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"

for repo in "$FRONTEND" "$BACKEND"; do
  echo "==> git init $(basename "$repo")"
  git -C "$repo" init -q -b main
  git -C "$repo" add -A
  git -C "$repo" -c "user.name=$AUTHOR_NAME" -c "user.email=$AUTHOR_EMAIL" \
    commit -q -m "$COMMIT_MESSAGE"
done

# ---------------------------------------------------------------------------
# Report
# ---------------------------------------------------------------------------
echo
echo "Done."
echo
echo "  frontend: $FRONTEND   ($(git -C "$FRONTEND" ls-files | wc -l | tr -d ' ') files)"
echo "  backend:  $BACKEND    ($(git -C "$BACKEND" ls-files | wc -l | tr -d ' ') files)"
echo
echo "Sanity checks:"
echo -n "  backend migrations committed: "
git -C "$BACKEND" ls-files 'migrations/*.sql' | wc -l | tr -d ' '
echo -n "  any .env committed (must be 0): "
{ git -C "$FRONTEND" ls-files; git -C "$BACKEND" ls-files; } | grep -c '^\.env$' || true
echo
echo "Next:"
echo "  cd $BACKEND"
echo "  git remote add origin git@github.com:<you>/edutou-backend.git && git push -u origin main"
echo
echo "  cd $FRONTEND"
echo "  git remote add origin git@github.com:<you>/edutou-frontend.git && git push -u origin main"
