import { prisma } from '@/lib/db';

export class CategoryService {
  async getAllCategories() {
    return await prisma.category.findMany({
      include: {
        products: {
          include: {
            variants: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(name: string, priceTypes: string[]) {
    if (!name || !priceTypes || !Array.isArray(priceTypes) || priceTypes.length === 0) {
      throw new Error('Nama kategori dan jenis harga harus diisi');
    }

    try {
      const category = await prisma.category.create({
        data: {
          name,
          priceTypes,
        },
      });
      return category;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Kategori dengan nama ini sudah ada');
      }
      throw error;
    }
  }
}
