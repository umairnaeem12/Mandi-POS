#!/bin/sh
# Vercel runs this instead of `build` (see package.json "vercel-build").
set -e

# Vercel caches node_modules, so the Prisma client must be regenerated each build.
npx prisma generate

# Migrations only on production deploys, so preview builds never touch the live
# schema. DIRECT_URL bypasses the pooler, which cannot run migrations.
if [ "$VERCEL_ENV" = "production" ]; then
  if [ -z "$DIRECT_URL" ]; then
    echo "DIRECT_URL is not set; refusing to run migrations through the pooler." >&2
    exit 1
  fi
  DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
fi

npx nest build
