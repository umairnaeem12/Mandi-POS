#!/bin/sh
# Kept so the old command still works; the setup lives in supabase-setup.mjs.
# Usage, from the repo root:  sh backend/scripts/supabase-setup.sh [env-file]
exec node "$(dirname "$0")/supabase-setup.mjs" "$@"
