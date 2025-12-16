import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  try {
    console.log('🔄 Starting migration to category and variant system...');

    // 1. Create default categories first
    const rokokCategory = await prisma.category.upsert({
      where: { name: 'Rokok' },
      update: {},
      create: {
        name: 'Rokok',
        priceTypes: ['dus', 'pak', 'item'],
      },
    });

    const curahCategory = await prisma.category.upsert({
      where: { name: 'Curah' },
      update: {},
      create: {
        name: 'Curah',
        priceTypes: ['bal', 'kg'],
      },
    });

    console.log('✅ Categories created:', { rokokCategory, curahCategory });

    // 2. Get all existing products (using raw query because schema might not match yet)
    const existingProducts = await prisma.$queryRaw`
      SELECT id, name, "hargaDus", "hargaPak", "hargaRenceng", "stock_online", "stock_offline"
      FROM "Product"
    ` as Array<{
      id: number;
      name: string;
      hargaDus: number;
      hargaPak: number;
      hargaRenceng: number;
      stock_online: number;
      stock_offline: number;
    }>;

    console.log(`📦 Found ${existingProducts.length} products to migrate`);

    // 3. For each product, we'll need to:
    // - Update categoryId (default to Rokok for now)
    // - Create variants from existing harga fields
    // Note: This will be done after schema is updated

    console.log('✅ Migration script ready. Products will be migrated after schema update.');
    console.log('⚠️  Note: Existing products will be assigned to "Rokok" category by default.');
    console.log('⚠️  Variants will be created from existing hargaDus, hargaPak, hargaRenceng fields.');

  } catch (error: any) {
    if (error.code === 'P2021') {
      console.log('ℹ️  Tables not created yet. This is expected. Run this after schema push.');
    } else {
      console.error('❌ Migration error:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

migrate();


