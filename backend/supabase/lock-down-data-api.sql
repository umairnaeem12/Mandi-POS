-- Close the Supabase Data API (PostgREST) over the POS tables.
-- Run in the Supabase SQL editor after the first `prisma migrate deploy`, and again
-- after any migration that adds a table. Safe to re-run.
--
-- Supabase exposes the public schema over REST to anyone holding the publishable
-- (anon) key, and that key ships inside the frontend bundle. Prisma creates tables
-- with RLS off, so without this every table is readable and writable from a browser.
--
-- Enabling RLS with no policies denies anon and authenticated roles everything.
-- Prisma connects as the table owner (postgres), and owners bypass RLS unless it is
-- forced, so the backend keeps working unchanged.
--
-- This is the backstop. Also remove `public` from Exposed schemas (or disable the
-- Data API) under Project Settings > Data API, since the app never uses it.

do $$
declare
  t record;
begin
  for t in
    select schemaname, tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table %I.%I enable row level security', t.schemaname, t.tablename);
  end loop;
end
$$;

-- Check: every row should show rowsecurity = true.
select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
