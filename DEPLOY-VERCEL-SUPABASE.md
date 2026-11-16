# Deploying on Vercel + Supabase

Moves production off AWS (Amplify, Beanstalk, CloudFront, RDS) onto:

| Piece | Runs on |
|---|---|
| Frontend (React) | Vercel project #1, repo root, existing `vercel.json` |
| Backend (NestJS API) | Vercel project #2, root directory `backend`, one serverless function |
| Database | Supabase Postgres, reached through the Supabase connection pooler |
| Live updates | Supabase Realtime private channels (replaces Socket.IO) |
| Image uploads | Supabase Storage through its S3-compatible API |

The AWS stack keeps running until step 10, so nothing breaks while you set this up.
Local development is unchanged: without the Supabase variables the app falls back to
Socket.IO and local disk uploads.

**Costs.** Vercel's free Hobby plan is for non-commercial use only, so a restaurant
needs Vercel Pro. Supabase's free plan pauses a project after a week without activity,
so production needs Supabase Pro.

---

## 1. Create the Supabase project

1. supabase.com > New project. Region: **East US (North Virginia)**. Vercel runs
   functions in `iad1` (Washington DC) by default, so both sit in us-east-1.
2. Save the database password somewhere safe. You need it for the connection strings.

## 2. Collect keys and connection strings

| Value | Where in the Supabase dashboard | Used as |
|---|---|---|
| Project URL `https://<ref>.supabase.co` | Project Settings > API (or the Connect dialog) | `SUPABASE_URL`, `VITE_SUPABASE_URL` |
| Publishable key (`sb_publishable_...`, or the legacy `anon` key) | Project Settings > API Keys | `VITE_SUPABASE_ANON_KEY` |
| Secret key (`sb_secret_...`, or the legacy `service_role` key) | Project Settings > API Keys | `SUPABASE_SECRET_KEY` |
| JWT secret | Project Settings > JWT Keys > **Legacy JWT secret** | `SUPABASE_JWT_SECRET` |
| Transaction pooler string (port **6543**) | Connect > Connection string > Transaction pooler | `DATABASE_URL` |
| Session pooler string (port **5432**) | Connect > Connection string > Session pooler | `DIRECT_URL` |

The secret key and JWT secret are server-only. Never put them in a `VITE_*` variable.

**JWT secret caveat.** The backend signs realtime tokens with an HS256 shared secret.
Projects on Supabase's newer JWT signing keys may not show a "Legacy JWT secret". If
yours doesn't, stop here and we will sort out the signing key together before going
further.

**Connection strings.** Append Prisma's pooler flags to the transaction string:

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=3
DIRECT_URL=postgresql://postgres.<ref>:<password>@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Use the session pooler for `DIRECT_URL`, not the "Direct connection" host. The direct
host is IPv6-only unless you buy the IPv4 add-on, and neither Vercel builds nor the
EC2 box below are guaranteed IPv6. If your password has special characters,
URL-encode them.

## 3. Create the schema

From your machine, in `backend/`:

```bash
DATABASE_URL="<DIRECT_URL>" npx prisma migrate deploy
```

## 4. Lock down Supabase

In the Supabase SQL editor, run both files:

1. [backend/supabase/lock-down-data-api.sql](backend/supabase/lock-down-data-api.sql)
   enables RLS on every POS table. Without it, anyone with the publishable key (which
   ships in the frontend) can read and write your tables over Supabase's REST API.
   Re-run it after any future migration that adds a table.
2. [backend/supabase/realtime-policies.sql](backend/supabase/realtime-policies.sql)
   lets each client receive live updates only for its own restaurant.

Then in the dashboard:

- **Project Settings > Data API**: remove `public` from Exposed schemas, or disable the
  Data API. The app never uses it.
- **Realtime > Settings**: turn **off** "Allow public access", so only private,
  policy-checked channels work.

## 5. Storage for images

1. Storage > New bucket, name `uploads`, **Public bucket** on.
2. Storage > Settings > S3 Connection: note the endpoint and region, then create a new
   access key pair.

| Variable | Value |
|---|---|
| `S3_BUCKET` | `uploads` |
| `S3_REGION` | region shown on the S3 Connection page |
| `S3_ENDPOINT` | `https://<ref>.supabase.co/storage/v1/s3` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | the key pair you just created |

Public image URLs are derived automatically as
`https://<ref>.supabase.co/storage/v1/object/public/uploads/<file>`. Set
`S3_PUBLIC_URL` only if you put a CDN in front.

The upload limit is now **4 MB** per image, because Vercel caps a request body at 4.5 MB.

## 6. Copy the data from RDS

RDS only accepts connections from inside the AWS VPC, so run the dump on the legacy
EC2 box (`ssh -i ~/Downloads/bukhari-key.pem ubuntu@18.209.210.215`).

RDS runs PostgreSQL 18, and `pg_dump` must be at least the server's major version.
Check with `pg_dump --version`. If it is older, install `postgresql-client-18` from the
PostgreSQL apt repository (apt.postgresql.org).

The schema already exists from step 3, so copy data only and skip Prisma's own history
table:

```bash
pg_dump "postgresql://postgres:<rds-password>@database-1.c2dyuouwo2em.us-east-1.rds.amazonaws.com:5432/restaurant_pos" \
  --data-only --no-owner --no-acl --exclude-table=_prisma_migrations -Fp -f pos-data.sql

( echo "SET session_replication_role = replica;"; cat pos-data.sql ) \
  | psql "<DIRECT_URL>" -v ON_ERROR_STOP=1
```

`session_replication_role = replica` stops foreign-key checks from failing on row
order during the load. Then spot-check: log in and look at menu items, orders and
invoices.

Alternative: dump everything with `pg_dump --no-owner --no-acl -Fc` and load it with
`pg_restore --no-owner --no-acl -d "<DIRECT_URL>"` into an **empty** database (skip
step 3). Supabase may run an older Postgres major than RDS 18, so expect to clear up a
few errors on that path.

**Images do not come across.** Logos and menu photos uploaded so far were saved on the
Beanstalk container's disk under `/uploads`, and the database only stores paths like
`/uploads/abc.png`. Re-upload them from the Settings and Menu Items screens after
cutover.

## 7. Backend on Vercel

Vercel > Add New > Project > import the repo.

- **Root Directory:** `backend`
- Leave "Include files outside the root directory in the Build Step" **on**. The repo
  uses npm workspaces and dependencies install at the repo root.
- Framework is detected as NestJS (entry `src/main.ts`). The `vercel-build` script
  runs `prisma generate`, then `prisma migrate deploy` against `DIRECT_URL` on
  production deploys only, then `nest build`.

Environment variables (Production; add them to Preview too if you use preview deploys,
ideally pointing at a separate Supabase project, because previews would otherwise share
the production database):

| Variable | Value |
|---|---|
| `DATABASE_URL` | transaction pooler string with `?pgbouncer=true&connection_limit=3` |
| `DIRECT_URL` | session pooler string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | copy the current values from Beanstalk, or every user is logged out |
| `FRONTEND_URL` | the frontend URL from step 8, e.g. `https://mandi-pos.vercel.app` (comma-separated if several) |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_SECRET_KEY` | secret key |
| `SUPABASE_JWT_SECRET` | legacy JWT secret |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | from step 5 |

Vercel reserves the `AWS_*` variable names, which is why storage uses `S3_*`.

Deploy, then open `https://<backend>.vercel.app/api/health` and check it returns
`"status": "ok"`.

## 8. Frontend on Vercel

Add a second project from the same repo.

- **Root Directory:** repo root. The existing `vercel.json` builds `apps/pos-web` and
  adds the SPA rewrite.

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<backend>.vercel.app/api` |
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | publishable key |

`VITE_SOCKET_URL` is not needed. `VITE_*` values are baked in at build time, so
redeploy after changing them. Then go back and set `FRONTEND_URL` on the backend
project (step 7) and redeploy the backend.

## 9. Windows desktop app

In [.github/workflows/desktop-windows.yml](.github/workflows/desktop-windows.yml),
under "Build web frontend", replace the CloudFront values:

```yaml
env:
  VITE_API_URL: https://<backend>.vercel.app/api
  VITE_SUPABASE_URL: https://<ref>.supabase.co
  VITE_SUPABASE_ANON_KEY: <publishable key>
```

Remove `VITE_SOCKET_URL`. Bump the version (`apps/desktop/package.json`,
`src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `Cargo.lock`), push a `v*` tag,
and install the new build on each Windows PC. Old installers keep talking to AWS until
it is shut down.

## Smoke test

Run this on the Vercel URLs before switching anyone over:

- [ ] Log in as admin and land on the dashboard
- [ ] Open the Kitchen screen in a second browser or device, create an order from the
      POS, and watch it appear on the Kitchen screen **without refreshing**
- [ ] Move the order through its statuses; the Orders page and table status update live
- [ ] Upload a menu item image and the restaurant logo; both display after a reload
- [ ] Generate and pay an invoice, then print the receipt
- [ ] Log out, log back in, and leave a screen open past 15 minutes; live updates keep
      arriving after the token refresh
- [ ] Windows app installed from the new release logs in and receives live updates

## 10. Cutover and AWS shutdown

Once the smoke test passes and staff are on the new URLs and installer:

1. Take a final RDS snapshot of `database-1` and keep it for a while.
2. Delete, in this order:
   - Amplify app `Mandi-POS` (`d23q3hbf71n2y5`)
   - Elastic Beanstalk environment `bukhari-pos-env` (and the `bukhari-pos` application)
   - CloudFront distribution `ELY2J65FYD5IM` (disable first, then delete)
   - RDS instance `database-1`, after the snapshot
   - Legacy EC2 instance `i-0dd3b4d05eec29730` (`18.209.210.215`), once you no longer
     need it as a jump box
3. In IAM, **delete the `cli-admin` access key**. It was exposed in an earlier chat and
   must not stay active.
