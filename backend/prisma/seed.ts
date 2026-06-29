import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../src/common/constants/permissions';

const prisma = new PrismaClient();
const RESTAURANT_ID = 'default-restaurant';

async function main(): Promise<void> {
  // 1. Restaurant + settings (single restaurant for v1).
  const restaurant = await prisma.restaurant.upsert({
    where: { id: RESTAURANT_ID },
    update: {},
    create: {
      id: RESTAURANT_ID,
      name: 'ABC Restaurant',
      address: 'Main Street',
      contactNumber: '+92-300-0000000',
      email: 'info@restaurant.local',
      settings: {
        create: {
          currencyCode: 'PKR',
          currencySymbol: 'Rs',
          taxName: 'GST',
          taxPercentage: 15,
          isTaxEnabled: true,
          invoicePrefix: 'INV',
          receiptHeader: 'ABC Restaurant',
          receiptFooter: 'Thank you for dining with us!',
        },
      },
    },
  });
  console.log(`Seeded restaurant: ${restaurant.name}`);

  // 2. Permissions (24 keys).
  for (const name of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  const allPermissions = await prisma.permission.findMany();
  console.log(`Seeded ${allPermissions.length} permissions`);

  // 3. Roles + role-permission mappings.
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { restaurantId_name: { restaurantId: RESTAURANT_ID, name: roleName } },
      update: {},
      create: { restaurantId: RESTAURANT_ID, name: roleName, isSystem: true },
    });

    const permNames = perms === 'ALL' ? PERMISSIONS.slice() : perms;
    const permIds = allPermissions.filter((p) => permNames.includes(p.name as never)).map((p) => p.id);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permIds.map((permissionId) => ({ roleId: role.id, permissionId })),
    });
  }
  console.log(`Seeded ${Object.keys(ROLE_PERMISSIONS).length} roles`);

  // 4. Default admin user.
  const adminRole = await prisma.role.findFirstOrThrow({
    where: { restaurantId: RESTAURANT_ID, name: 'Admin' },
  });
  const passwordHash = await argon2.hash('admin123');
  await prisma.user.upsert({
    where: { restaurantId_email: { restaurantId: RESTAURANT_ID, email: 'admin@restaurant.local' } },
    update: {},
    create: {
      restaurantId: RESTAURANT_ID,
      roleId: adminRole.id,
      fullName: 'Restaurant Admin',
      email: 'admin@restaurant.local',
      username: 'admin',
      passwordHash,
      status: 'ACTIVE',
      joiningDate: new Date(),
    },
  });
  console.log('Seeded admin user → admin@restaurant.local / admin123');

  // 5. Example categories + a few menu items (demo data).
  const categorySeed = [
    { name: 'Burger', sortOrder: 1 },
    { name: 'Pizza', sortOrder: 2 },
    { name: 'Shawarma', sortOrder: 3 },
    { name: 'Cold Drinks', sortOrder: 4 },
    { name: 'Fries', sortOrder: 5 },
    { name: 'Desserts', sortOrder: 6 },
  ];
  const categoryByName: Record<string, string> = {};
  for (const c of categorySeed) {
    const existing = await prisma.category.findFirst({
      where: { restaurantId: RESTAURANT_ID, name: c.name, deletedAt: null },
    });
    const cat =
      existing ??
      (await prisma.category.create({
        data: { restaurantId: RESTAURANT_ID, name: c.name, sortOrder: c.sortOrder },
      }));
    categoryByName[c.name] = cat.id;
  }

  const itemSeed = [
    { name: 'Zinger Burger', category: 'Burger', price: 450 },
    { name: 'Beef Burger', category: 'Burger', price: 550 },
    { name: 'Chicken Tikka Pizza', category: 'Pizza', price: 1200 },
    { name: 'Chicken Shawarma', category: 'Shawarma', price: 300 },
    { name: 'Soft Drink 500ml', category: 'Cold Drinks', price: 120 },
    { name: 'Loaded Fries', category: 'Fries', price: 350 },
  ];
  for (const it of itemSeed) {
    const exists = await prisma.menuItem.findFirst({
      where: { restaurantId: RESTAURANT_ID, name: it.name, deletedAt: null },
    });
    if (!exists) {
      await prisma.menuItem.create({
        data: {
          restaurantId: RESTAURANT_ID,
          categoryId: categoryByName[it.category],
          name: it.name,
          price: it.price,
        },
      });
    }
  }
  console.log(`Seeded ${categorySeed.length} categories and ${itemSeed.length} menu items`);

  // 6. Default 8 tables.
  for (let n = 1; n <= 8; n++) {
    await prisma.restaurantTable.upsert({
      where: { restaurantId_tableNumber: { restaurantId: RESTAURANT_ID, tableNumber: n } },
      update: {},
      create: { restaurantId: RESTAURANT_ID, name: `Table ${n}`, tableNumber: n, capacity: 4 },
    });
  }
  console.log('Seeded 8 tables');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
