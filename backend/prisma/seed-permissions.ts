/**
 * Permissions-only seed — safe to run against a live/production database.
 *
 * Fixes the case where roles exist but carry no `RolePermission` rows, which
 * makes `/auth/me` return `permissions: []`. The frontend's landingPath() then
 * falls through to '/login', so a successful sign-in appears to "not redirect".
 *
 * Unlike prisma/seed.ts this script does NOT touch restaurant settings,
 * categories, menu items, tables, or user accounts. It only:
 *   1. upserts the PERMISSIONS catalogue
 *   2. rebuilds RolePermission rows from ROLE_PERMISSIONS for existing roles
 *
 * Run from backend/:  npx ts-node prisma/seed-permissions.ts
 */
import { PrismaClient } from '@prisma/client';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../src/common/constants/permissions';

const prisma = new PrismaClient();

// Preview changes without writing: `DRY_RUN=1 npx ts-node prisma/seed-permissions.ts`
const DRY_RUN = process.env.DRY_RUN === '1';

async function main(): Promise<void> {
  if (DRY_RUN) console.log('DRY_RUN=1 — no writes will be made.\n');

  // 1. Permission catalogue. Upsert by unique name; existing rows keep their id,
  //    so current RolePermission references stay valid.
  for (const name of PERMISSIONS) {
    if (DRY_RUN) continue;
    await prisma.permission.upsert({ where: { name }, update: {}, create: { name } });
  }
  const allPermissions = await prisma.permission.findMany();
  console.log(`Permissions in catalogue: ${allPermissions.length} (expected ${PERMISSIONS.length})`);

  const idByName = new Map(allPermissions.map((p) => [p.name, p.id]));

  // 2. Rebuild mappings for roles that already exist. We deliberately do not
  //    create roles here — a missing role means the main seed never ran, which
  //    is a bigger problem than this script should silently paper over.
  const roles = await prisma.role.findMany({ include: { permissions: true } });
  if (roles.length === 0) {
    throw new Error('No roles found. Run the full seed (prisma/seed.ts) on a fresh database first.');
  }

  for (const role of roles) {
    const mapping = ROLE_PERMISSIONS[role.name];
    if (!mapping) {
      console.log(`- ${role.name}: custom role, not in ROLE_PERMISSIONS — left untouched`);
      continue;
    }

    const wanted = mapping === 'ALL' ? [...PERMISSIONS] : mapping;
    const permissionIds = wanted
      .map((name) => idByName.get(name))
      .filter((id): id is string => Boolean(id));

    if (permissionIds.length !== wanted.length) {
      const missing = wanted.filter((n) => !idByName.has(n));
      throw new Error(`Missing permission rows for: ${missing.join(', ')}`);
    }

    if (DRY_RUN) {
      console.log(`- ${role.name}: ${role.permissions.length} → ${permissionIds.length} permissions`);
      continue;
    }

    // Replace wholesale inside a transaction so a role is never left with a
    // partial permission set if this fails midway.
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
      prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      }),
    ]);

    console.log(`- ${role.name}: ${role.permissions.length} → ${permissionIds.length} permissions`);
  }

  console.log(DRY_RUN ? '\nDry run complete.' : '\nDone. Sign out and back in to pick up the new permissions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
