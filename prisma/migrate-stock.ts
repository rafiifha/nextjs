import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateStock() {
  try {
    console.log('🔄 Starting stock migration...');
    
    // Get all products
    const products = await prisma.$queryRaw`
      SELECT id, stok FROM "Product"
    ` as Array<{ id: number; stok: number }>;
    
    console.log(`📦 Found ${products.length} products to migrate`);
    
    // Migrate each product
    for (const product of products) {
      // Split stok: 50% online, 50% offline (or all to online if you prefer)
      // You can adjust this logic as needed
      const totalStock = product.stok || 0;
      const stockOnline = Math.ceil(totalStock * 0.5); // 50% untuk online
      const stockOffline = totalStock - stockOnline; // Sisanya untuk offline
      
      await prisma.$executeRaw`
        UPDATE "Product"
        SET "stock_online" = ${stockOnline}, "stock_offline" = ${stockOffline}
        WHERE id = ${product.id}
      `;
      
      console.log(`✅ Product ${product.id}: ${totalStock} → online: ${stockOnline}, offline: ${stockOffline}`);
    }
    
    console.log('✅ Migration completed!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateStock();

