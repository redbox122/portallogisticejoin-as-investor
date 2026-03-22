#!/usr/bin/env bash
set -Eeuo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

LOG_DIR="/home/portallogist/deploy-logs"
LOG_FILE="$LOG_DIR/deploy.log"
LOCK_FILE="/tmp/portallogist_deploy.lock"
TRIGGER_FILE="$LOG_DIR/deploy_requested"
FRONTEND_DIR="/home/portallogist/public_html/portallogistice"
BACKEND_DEFAULT_DIR="/home/portallogist/laravel_app"
REPO_URL="https://github.com/redbox122/portallogisticejoin-as-investor.git"
COMPOSER_BIN="/usr/local/bin/composer"
KEEP_BACKUPS=3

mkdir -p "$LOG_DIR"

# Rotate deploy log when it grows too much.
if [ -f "$LOG_FILE" ] && [ "$(wc -c < "$LOG_FILE")" -gt 5242880 ]; then
  mv "$LOG_FILE" "$LOG_FILE.$(date +%Y%m%d_%H%M%S)"
fi

touch "$LOG_FILE"
exec >> "$LOG_FILE" 2>&1

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] ---- DEPLOY START ----"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Deploy already running, exiting."
  exit 0
fi

if [ "${1:-}" != "--force" ] && [ ! -f "$TRIGGER_FILE" ]; then
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] No deploy trigger found; exiting."
  exit 0
fi

rm -f "$TRIGGER_FILE"

cd "$FRONTEND_DIR"

if [ ! -d .git ]; then
  git init
fi
if ! git remote | grep -q '^origin$'; then
  git remote add origin "$REPO_URL"
else
  git remote set-url origin "$REPO_URL"
fi

PREV_SHA=""
NEW_SHA=""
CHANGED_FILES=""
SYNCED_FROM_GIT=false

if git ls-remote --heads origin main | grep -q main; then
  PREV_SHA="$(git rev-parse --verify HEAD 2>/dev/null || true)"
  git fetch origin main
  if git rev-parse --verify main >/dev/null 2>&1; then
    git checkout main
  else
    git checkout -b main
  fi
  git reset --hard origin/main
  NEW_SHA="$(git rev-parse --verify HEAD 2>/dev/null || true)"
  if [ -n "$PREV_SHA" ] && [ -n "$NEW_SHA" ] && [ "$PREV_SHA" != "$NEW_SHA" ]; then
    CHANGED_FILES="$(git diff --name-only "$PREV_SHA" "$NEW_SHA" || true)"
  fi
  SYNCED_FROM_GIT=true
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Synced frontend from origin/main"
else
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] origin/main not found; skipping git sync"
fi

BACKEND_DIR="$BACKEND_DEFAULT_DIR"
if [ -d "$FRONTEND_DIR/tasheel-backend" ]; then
  BACKEND_DIR="$FRONTEND_DIR/tasheel-backend"
fi

FORCE_DEPLOY=false
if [ "${1:-}" = "--force" ]; then
  FORCE_DEPLOY=true
fi

backend_changed=false
frontend_changed=false
composer_inputs_changed=false
npm_inputs_changed=false

if $FORCE_DEPLOY; then
  backend_changed=true
  frontend_changed=true
  composer_inputs_changed=true
  npm_inputs_changed=true
elif $SYNCED_FROM_GIT && [ -n "$PREV_SHA" ] && [ -n "$NEW_SHA" ] && [ "$PREV_SHA" = "$NEW_SHA" ]; then
  backend_changed=false
  frontend_changed=false
  composer_inputs_changed=false
  npm_inputs_changed=false
elif [ -n "$CHANGED_FILES" ]; then
  while IFS= read -r file; do
    case "$file" in
      tasheel-backend/*|laravel_app/*)
        backend_changed=true
        ;;
      src/*|public/*|package.json|package-lock.json|.env.production|index.html)
        frontend_changed=true
        ;;
    esac
    case "$file" in
      tasheel-backend/composer.json|tasheel-backend/composer.lock|laravel_app/composer.json|laravel_app/composer.lock)
        composer_inputs_changed=true
        ;;
      package.json|package-lock.json)
        npm_inputs_changed=true
        ;;
    esac
  done <<< "$CHANGED_FILES"
else
  # No git diff available (initial sync / empty repo): keep safe behavior.
  backend_changed=true
  frontend_changed=true
  composer_inputs_changed=true
  npm_inputs_changed=true
fi

cd "$BACKEND_DIR"
if [ ! -d vendor ] || $composer_inputs_changed; then
  "$COMPOSER_BIN" install --no-dev --optimize-autoloader
else
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Skipping composer install (no backend dependency changes)"
fi

if $backend_changed || $FORCE_DEPLOY; then
  php artisan migrate --force
  php artisan optimize:clear
else
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Skipping backend migrate/optimize (no backend changes)"
fi

cd "$FRONTEND_DIR"
if [ ! -d node_modules ] || $npm_inputs_changed; then
  npm install --legacy-peer-deps
else
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Skipping npm install (node_modules present, lock unchanged)"
fi

if ! $frontend_changed && ! $FORCE_DEPLOY; then
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Skipping frontend build (no frontend changes)"
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Deploy completed successfully"
  exit 0
fi

BUILD_PATH="$FRONTEND_DIR/build_new" npm run build

BACKUP_DIR="$FRONTEND_DIR/build_prev_$(date +%Y%m%d_%H%M%S)"
if [ -d "$FRONTEND_DIR/build" ]; then
  mv "$FRONTEND_DIR/build" "$BACKUP_DIR"
fi
mv "$FRONTEND_DIR/build_new" "$FRONTEND_DIR/build"

mkdir -p "$FRONTEND_DIR/build/api"
cat > "$FRONTEND_DIR/build/.htaccess" <<'HT'
<IfModule mod_rewrite.c>
    RewriteEngine On

    RewriteCond %{REQUEST_URI} ^/api(?:/.*)?$ [NC]
    RewriteRule ^api(?:/(.*))?$ api/index.php [L,QSA]

    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]

    RewriteRule ^ index.html [L]
</IfModule>
HT

cat > "$FRONTEND_DIR/build/api/.htaccess" <<'HT'
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^ index.php [L,QSA]
</IfModule>
HT

cat > "$FRONTEND_DIR/build/api/index.php" <<'PHP'
<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

require __DIR__ . '/../../../../laravel_app/vendor/autoload.php';

$app = require_once __DIR__ . '/../../../../laravel_app/bootstrap/app.php';

$app->handleRequest(Request::capture());
PHP

# Keep only a small number of old build backups.
ls -1dt "$FRONTEND_DIR"/build_prev_* 2>/dev/null | awk "NR>${KEEP_BACKUPS}" | xargs -r rm -rf || true
ls -1t "$LOG_FILE".* 2>/dev/null | awk 'NR>10' | xargs -r rm -f || true

echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] Deploy completed successfully"