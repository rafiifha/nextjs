import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create all categories
  const categories = [
    {
      name: 'Rokok',
      priceTypes: ['dus', 'pak', 'item'],
    },
    {
      name: 'Curah',
      priceTypes: ['bal', 'kg'],
    },
    {
      name: 'Mie Instant',
      priceTypes: ['dus', 'pak', 'item'],
    },
    {
      name: 'Minuman',
      priceTypes: ['dus', 'pak', 'item'],
    },
    {
      name: 'Kebutuhan Rumah',
      priceTypes: ['dus', 'pak', 'item'],
    },
    {
      name: 'Kopi',
      priceTypes: ['bal', 'kg', 'dus', 'pak'],
    },
    {
      name: 'Kebutuhan Pribadi',
      priceTypes: ['dus', 'pak', 'item'],
    },
    {
      name: 'Obat',
      priceTypes: ['dus', 'pak', 'item'],
    },
    {
      name: 'Lain-lain',
      priceTypes: ['dus', 'pak', 'item', 'bal', 'kg'],
    },
  ];

  const createdCategories = [];
  
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { name: category.name },
      update: {
        priceTypes: category.priceTypes,
      },
      create: {
        name: category.name,
        priceTypes: category.priceTypes,
      },
    });
    createdCategories.push(created);
  }

  console.log('✅ Categories seeded:', createdCategories.map(c => ({ name: c.name, priceTypes: c.priceTypes })));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

