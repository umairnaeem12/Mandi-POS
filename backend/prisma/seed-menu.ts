import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RESTAURANT_ID = 'default-restaurant';

// Categories: [English, Arabic]
const CATEGORIES: [string, string][] = [
  ['Main Courses', 'الوجبات الرئيسية'],
  ['Breakfast', 'قائمة الإفطار'],
  ['Grill', 'المشاوي'],
  ['Curry', 'صالونة'],
  ['Appetizers', 'المقبلات'],
  ['Collective Dishes', 'أطباق جماعية'],
  ['Sweets', 'حلويات'],
  ['Drinks', 'مشروبات'],
];

// Items: [English, Arabic, CategoryEnglish, basePrice]
// Multi-price rows (e.g. "13 / 25", "12/8") use the first/base price; the name keeps the options.
const ITEMS: [string, string, string, number][] = [
  ['Mandi Rice with Mutton', 'رز مندي مع لحم', 'Main Courses', 30],
  ['Mandi Rice with Chicken BBQ', 'رز مندي مع دجاج عالفحم', 'Main Courses', 25],
  ['Mandi Rice with Grilled Chicken', 'رز مندي مع دجاج شوايه', 'Main Courses', 23],
  ['Mandi Rice with Quarter Mutton', 'ربع رز مندي مع لحم', 'Main Courses', 16],
  ['Mandi Rice with Quarter Chicken BBQ', 'ربع رز مندي مع دجاج باربكيو على الفحم', 'Main Courses', 14],
  ['Mandi Rice with Quarter Grilled Chicken', 'ربع رز مندي مع دجاج مشوي', 'Main Courses', 14],
  ['Bukhari Rice with Mutton', 'رز بخاري مع لحم', 'Main Courses', 30],
  ['Bukhari Rice with Chicken BBQ', 'رز بخاري مع دجاج عالفحم', 'Main Courses', 25],
  ['Bukhari Rice with Grilled Chicken', 'رز بخاري مع دجاج شوايه', 'Main Courses', 23],
  ['Bukhari Rice with Quarter Mutton', 'ربع رز بخاري مع لحم', 'Main Courses', 16],
  ['Bukhari Rice with Quarter Chicken BBQ', 'ربع رز بخاري مع دجاج باربكيو على الفحم', 'Main Courses', 14],
  ['Bukhari Rice with Quarter Grilled Chicken', 'ربع رز بخاري مع دجاج مشوي', 'Main Courses', 14],
  ['Mandi / Bukhari / Majboos Plain Rice', 'رز سادة مندي/بخاري/مجبوس', 'Main Courses', 12],
  ['Majboos Rice with Chicken BBQ', 'رز مجبوس مع دجاج عالفحم', 'Main Courses', 25],
  ['Majboos Rice with Grilled Chicken', 'رز مجبوس مع دجاج شوايه', 'Main Courses', 23],
  ['Majboos Rice with Quarter Mutton', 'ربع رز مجبوس مع لحم', 'Main Courses', 16],
  ['Majboos Rice with Quarter Chicken BBQ', 'ربع رز مجبوس مع دجاج باربكيو على الفحم', 'Main Courses', 14],
  ['Majboos Rice with Quarter Grilled Chicken', 'ربع رز مجبوس مع دجاج مشوي', 'Main Courses', 14],
  ['Fish Fillet with Mandi / Bukhari / Majboos', 'فيليه سمك مع مندي/بخاري/مجبوس', 'Main Courses', 30],

  ['Foul Mixed', 'فول مشكل', 'Breakfast', 12],
  ['Foul with Hummus', 'فول مع حمص', 'Breakfast', 11],
  ['Foul Normal', 'فول عادي', 'Breakfast', 10],
  ['Lentils Mixed', 'عدس مشكل', 'Breakfast', 11],
  ['Shakshuka Cheese', 'شكشوكة جبن', 'Breakfast', 13],
  ['Shakshuka', 'شكشوكة', 'Breakfast', 10],
  ['Egg Bulsai', 'بيض عيون', 'Breakfast', 10],
  ['Liver Cheese', 'كبدة جبن', 'Breakfast', 19],
  ['Liver Normal', 'كبدة عادي', 'Breakfast', 16],
  ['Egg Bulsai Cheese', 'بيض عيون مع جبن', 'Breakfast', 13],
  ['Baba Ganoush', 'بابا غنوج', 'Breakfast', 15],
  ['Hummus', 'حمص', 'Breakfast', 10],
  ['Mutabal', 'متبل', 'Breakfast', 10],

  ['Kebab Chops', 'ريش كباب', 'Grill', 40],
  ['Mixed Grill 1kg', 'كيلو مشاوي مشكل', 'Grill', 115],
  ['Mixed Grill 1/2 kg', 'نصف كيلو مشاوي مشكل', 'Grill', 60],
  ['Mixed Grill', 'مشاوي مشكل', 'Grill', 30],
  ['Chicken Kofta', 'كفتة دجاج', 'Grill', 28],
  ['Mutton Kofta', 'كفتة لحم', 'Grill', 30],
  ['Meat Grill', 'شقف لحم', 'Grill', 30],
  ['Shish Tawook', 'شيش طاووق', 'Grill', 28],
  ['Grill Chicken Half / Full', 'دجاج شوايه نصف / كامل', 'Grill', 13],
  ['Grill Fish Fillet', 'مشوي فيليه سمك', 'Grill', 25],
  ['Chicken BBQ Half / Full', 'دجاج عالفحم نصف / كامل', 'Grill', 17],
  ['Sherry Fish BBQ', 'سمك شعري', 'Grill', 20],
  ['Tamis Bread', 'خبز تميس', 'Grill', 3],
  ['Afghan Bread', 'خبز أفغاني', 'Grill', 1],

  ['Shawarma Chicken', 'شاورما دجاج', 'Curry', 6],
  ['Mix Veg. Curry', 'صالونة خضار مشكل', 'Curry', 8],
  ['Mutton Curry', 'صالونة لحم', 'Curry', 15],
  ['Chicken Curry', 'صالونة دجاج', 'Curry', 12],
  ['Red Beans', 'الفاصوليا الحمراء', 'Curry', 10],

  ['Tabbouleh', 'تبولة', 'Appetizers', 10],
  ['Fattoush', 'فتوش', 'Appetizers', 10],
  ['Arabic Salad', 'سلطة عربية', 'Appetizers', 10],
  ['Mix Appetizer (Small)', 'مقبلات مشكلة (صغير)', 'Appetizers', 15],
  ['Grape Leaves', 'ورق العنب', 'Appetizers', 12],
  ['Cucumber Salad', 'روب خيار', 'Appetizers', 5],
  ['Onion', 'بصل', 'Appetizers', 2],
  ['Soup', 'شوربة', 'Appetizers', 5],
  ['Olive', 'زيتون', 'Appetizers', 3],
  ['French Fries', 'بطاطس مقلية', 'Appetizers', 5],
  ['Garlic Paste', 'ثوم', 'Appetizers', 2],
  ['Daqus', 'دقوس', 'Appetizers', 2],

  ['Mix Box', 'بوكس مشكل', 'Collective Dishes', 70],
  ['Mixed Box Normal', 'بوكس مشكل و عادي', 'Collective Dishes', 65],
  ['Box Normal', 'بوكس عادي', 'Collective Dishes', 60],
  ['Grilled Chicken & Rice Large Plate', 'صينية مشاوي و دجاج مع رز', 'Collective Dishes', 170],
  ['Chicken Azeema Platter', 'طبق عزيمة دجاج', 'Collective Dishes', 99],
  ['Mix Azeema Platter', 'طبق عزيمة مشكل', 'Collective Dishes', 149],
  ['Grilled Plate with Rice', 'صينية مشاوي مع رز', 'Collective Dishes', 170],

  ['Cream Caramel', 'كريم كراميل', 'Sweets', 4],
  ['Mahlabia', 'مهلبية', 'Sweets', 5],
  ['Rez B Halib', 'رز بالحليب', 'Sweets', 15],
  ['Gulab Jamun', 'جلاب جامن', 'Sweets', 6],

  ['Soft Drink', 'مشروب غازي', 'Drinks', 3],
  ['Orange Juice', 'عصير برتقال', 'Drinks', 7],
  ['Water', 'ماء', 'Drinks', 1],
  ['Laban', 'لبن', 'Drinks', 2],
  ['Yoghurt', 'روب', 'Drinks', 2],
];

async function main() {
  // 1. Brand + currency (Qatari Riyal, tax disabled — menu prices are inclusive).
  await prisma.restaurant.update({
    where: { id: RESTAURANT_ID },
    data: { name: 'Mandi Bukhari Point Restaurant' },
  });
  await prisma.restaurantSettings.update({
    where: { restaurantId: RESTAURANT_ID },
    data: {
      currencyCode: 'QAR',
      currencySymbol: 'Qr.',
      isTaxEnabled: false,
      taxPercentage: 0,
      taxName: 'Tax',
      invoicePrefix: 'INV',
      receiptHeader: 'Mandi Bukhari Point Restaurant\nمطعم مندي بخاري بوينت',
      receiptFooter: 'Thank you for dining with us!\nشكراً لزيارتكم',
    },
  });
  console.log('Updated brand + currency (QAR / Qr.)');

  // 2. Categories (idempotent by name).
  const catByName = new Map<string, string>();
  for (let i = 0; i < CATEGORIES.length; i++) {
    const [name, nameAr] = CATEGORIES[i];
    const existing = await prisma.category.findFirst({ where: { restaurantId: RESTAURANT_ID, name } });
    const cat = existing
      ? await prisma.category.update({ where: { id: existing.id }, data: { nameAr, sortOrder: i, isActive: true, deletedAt: null } })
      : await prisma.category.create({ data: { restaurantId: RESTAURANT_ID, name, nameAr, sortOrder: i } });
    catByName.set(name, cat.id);
  }
  console.log(`Seeded ${CATEGORIES.length} categories`);

  // 3. Items (idempotent by name).
  let created = 0;
  let updated = 0;
  for (let i = 0; i < ITEMS.length; i++) {
    const [name, nameAr, catName, price] = ITEMS[i];
    const categoryId = catByName.get(catName);
    if (!categoryId) throw new Error(`Missing category: ${catName}`);
    const existing = await prisma.menuItem.findFirst({ where: { restaurantId: RESTAURANT_ID, name } });
    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: { nameAr, price, categoryId, sortOrder: i, isAvailable: true, isOutOfStock: false, deletedAt: null },
      });
      updated++;
    } else {
      await prisma.menuItem.create({
        data: { restaurantId: RESTAURANT_ID, categoryId, name, nameAr, price, sortOrder: i },
      });
      created++;
    }
  }
  console.log(`Menu items — created: ${created}, updated: ${updated}, total: ${ITEMS.length}`);

  // 4. Remove demo data from the base seed (Burger/Pizza/etc.) so only the real menu remains.
  // Safe because this is a fresh install with no orders referencing them.
  const keepItemNames = ITEMS.map(([n]) => n);
  const keepCatNames = CATEGORIES.map(([n]) => n);
  const delItems = await prisma.menuItem.deleteMany({
    where: { restaurantId: RESTAURANT_ID, name: { notIn: keepItemNames } },
  });
  const delCats = await prisma.category.deleteMany({
    where: { restaurantId: RESTAURANT_ID, name: { notIn: keepCatNames } },
  });
  console.log(`Removed demo data — items: ${delItems.count}, categories: ${delCats.count}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
