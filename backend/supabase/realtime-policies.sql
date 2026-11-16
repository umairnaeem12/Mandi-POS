-- Realtime authorization for the POS broadcast channels.
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- The backend publishes to private channels named
--   restaurant:<rid>, kitchen:<rid>, admin-dashboard:<rid>, table:<rid>:<tableId>
-- and hands each signed-in client a short-lived JWT carrying a restaurant_id claim.
-- This policy lets a client receive a broadcast only when the restaurant id in the
-- topic (always the second ':' segment) matches the one in its token.
--
-- Clients only listen. The backend sends through the REST API with the secret key,
-- which bypasses RLS, so no insert policy is needed (and none is granted).
--
-- Also turn off "Allow public access" under Realtime > Settings, otherwise public
-- channels skip these checks entirely.

-- RLS is already on for realtime.messages; Supabase owns the table, so we only add a policy.

drop policy if exists "pos tenants receive own broadcasts" on realtime.messages;

create policy "pos tenants receive own broadcasts"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast')
  and split_part((select realtime.topic()), ':', 2) = (select auth.jwt() ->> 'restaurant_id')
);
