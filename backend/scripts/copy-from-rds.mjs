// Copies all POS data from the old AWS RDS database into Supabase.
// Reads RDS_DATABASE_URL and DIRECT_URL from an env file in backend/ (default .env).
// Refuses to run if the schemas differ or Supabase already has data. Prints no secrets.
// Usage, from the repo root:  node backend/scripts/copy-from-rds.mjs [env-file]
import { readFileSync, writeFileSync, existsSync, rmSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const backendDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const envName = process.argv[2] ?? '.env';
const envFile = resolve(backendDir, envName);
if (!existsSync(envFile)) {
  console.error(`Missing backend/${envName}`);
  process.exit(1);
}
const vars = dotenv.parse(readFileSync(envFile));
const RDS = vars.RDS_DATABASE_URL?.trim();
const SUPA = vars.DIRECT_URL?.trim();
if (!RDS || !SUPA) {
  console.error(`Add RDS_DATABASE_URL (the old AWS database) and DIRECT_URL (Supabase) to backend/${envName}.`);
  process.exit(1);
}
if (!RDS.includes('rds.amazonaws.com')) {
  console.error('RDS_DATABASE_URL does not point at an AWS RDS host; check you copied the right value.');
  process.exit(1);
}

// Tables we deliberately do not copy: Prisma's own bookkeeping (Supabase already has
// it) and login sessions (the new deploy has new JWT secrets, so everyone logs in again).
const SKIP = ['_prisma_migrations', 'refresh_tokens'];

const psql = (url, sql) => {
  const r = spawnSync('psql', [url, '-X', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr.replace(/postgres(ql)?:\/\/\S+/g, '<connection-string>').trim());
  return r.stdout.trim();
};
const step = (msg) => console.log(`\n${msg}`);
const fail = (msg) => {
  console.error(`\nSTOP  ${msg}`);
  process.exit(1);
};

step('1/5  Connecting to both databases');
let rdsVersion, supaVersion;
try {
  rdsVersion = psql(RDS, 'show server_version');
  console.log(`ok    AWS RDS (Postgres ${rdsVersion})`);
} catch (e) {
  fail(
    `Cannot reach the AWS database: ${e.message}\n      Is "Publicly accessible" on and is your IP allowed on port 5432 in its security group?`,
  );
}
try {
  supaVersion = psql(SUPA, 'show server_version');
  console.log(`ok    Supabase (Postgres ${supaVersion})`);
} catch (e) {
  fail(`Cannot reach Supabase: ${e.message}`);
}

step('2/5  Checking both databases have the same tables');
const migrations = (url) =>
  psql(url, "select migration_name from _prisma_migrations where finished_at is not null and rolled_back_at is null order by 1")
    .split('\n')
    .filter(Boolean);
const rdsMig = migrations(RDS);
const supaMig = migrations(SUPA);
const missingOnSupa = rdsMig.filter((m) => !supaMig.includes(m));
const missingOnRds = supaMig.filter((m) => !rdsMig.includes(m));
if (missingOnSupa.length) fail(`AWS has migrations Supabase lacks: ${missingOnSupa.join(', ')}`);
if (missingOnRds.length) {
  fail(
    `AWS is behind Supabase by: ${missingOnRds.join(', ')}.\n      Ask Claude: the AWS data needs those migrations applied before copying.`,
  );
}
console.log(`ok    both at the same ${rdsMig.length} migrations`);

const tables = psql(SUPA, "select tablename from pg_tables where schemaname = 'public' order by 1")
  .split('\n')
  .filter((t) => t && !SKIP.includes(t));

const nonEmpty = tables.filter((t) => Number(psql(SUPA, `select count(*) from public."${t}"`)) > 0);
if (nonEmpty.length) {
  fail(`Supabase already has data in: ${nonEmpty.join(', ')}.\n      Copying on top would duplicate or clash. Ask Claude how to clear it first.`);
}
console.log('ok    Supabase tables are empty');

const work = mkdtempSync(join(tmpdir(), 'pos-copy-'));
const dumpFile = join(work, 'data.sql');
const wrapper = join(work, 'restore.sql');
try {
  step('3/5  Exporting data from AWS');
  const dump = spawnSync(
    'pg_dump',
    [
      RDS, '--data-only', '--no-owner', '--no-privileges', '--schema=public',
      ...SKIP.map((t) => `--exclude-table=public.${t}`),
      '-f', dumpFile,
    ],
    { encoding: 'utf8' },
  );
  if (dump.status !== 0) fail(`pg_dump failed: ${dump.stderr.replace(/postgres(ql)?:\/\/\S+/g, '<connection-string>').trim()}`);

  // Settings newer than the Supabase server would abort the restore; drop them.
  const supaMajor = Number(supaVersion.split('.')[0]);
  let sql = readFileSync(dumpFile, 'utf8');
  if (supaMajor < 17) sql = sql.replace(/^SET transaction_timeout = .*$/m, '');
  writeFileSync(dumpFile, sql);
  console.log('ok    exported');

  step('4/5  Importing into Supabase (all or nothing)');
  // replica mode skips foreign-key checks while rows load. If the role may not set it,
  // fall back to plain loading: pg_dump already orders tables by their foreign keys.
  const runRestore = (prelude) => {
    writeFileSync(wrapper, `${prelude}\\i ${dumpFile}\n`);
    return spawnSync('psql', [SUPA, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-f', wrapper], {
      encoding: 'utf8',
    });
  };
  let restore = runRestore('SET session_replication_role = replica;\n');
  if (restore.status !== 0 && /session_replication_role/.test(restore.stderr)) {
    console.log('      (replica mode not allowed here, loading in foreign-key order instead)');
    restore = runRestore('');
  }
  if (restore.status !== 0) {
    fail(`Import failed and was rolled back, Supabase is unchanged:\n      ${restore.stderr.replace(/postgres(ql)?:\/\/\S+/g, '<connection-string>').trim()}`);
  }
  console.log('ok    imported');
} finally {
  rmSync(work, { recursive: true, force: true });
}

step('5/5  Comparing row counts');
let mismatch = false;
for (const t of tables) {
  const a = psql(RDS, `select count(*) from public."${t}"`);
  const b = psql(SUPA, `select count(*) from public."${t}"`);
  if (a !== b) mismatch = true;
  console.log(`${a === b ? 'ok  ' : 'DIFF'}  ${t.padEnd(24)} AWS ${a.padStart(6)}   Supabase ${b.padStart(6)}`);
}

const oldImages = psql(
  SUPA,
  `select (select count(*) from restaurants where "logoUrl" like '/uploads/%')
        + (select count(*) from categories where "imageUrl" like '/uploads/%')
        + (select count(*) from menu_items where "imageUrl" like '/uploads/%')
        + (select count(*) from menu_item_images where url like '/uploads/%')`,
);
if (Number(oldImages) > 0) {
  console.log(`\nnote  ${oldImages} image link(s) point at the old server's disk and will show as missing. Re-upload those images in the app.`);
}
console.log(mismatch ? '\nSome counts differ. Paste this output to Claude.' : '\nAll data copied.');
process.exit(mismatch ? 1 : 0);
