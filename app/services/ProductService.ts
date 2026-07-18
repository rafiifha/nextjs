import { prisma } from '@/lib/db';

export class ProductService {
  async getAllProducts() {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          orderBy: { priceType: 'asc' },
        },
        items: {
          select: {
            quantity: true,
          },
        },
      },
    });

    return products
      .map((p) => {
        const salesCount = p.items.reduce((sum, item) => sum + item.quantity, 0);
        const { items, ...rest } = p;
        return { ...rest, salesCount };
      })
      .sort((a, b) => b.salesCount - a.salesCount);
  }

  async getProductsPaginated(page: number, limit: number, search?: string, categoryId?: number) {
    const where: any = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          variants: {
            orderBy: { priceType: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductById(id: number) {
    return await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: {
          orderBy: { priceType: 'asc' },
        },
      },
    });
  }

  async createProduct(data: any) {
    const { name, categoryId, variants, image } = data;

    if (!name || !categoryId || !variants || !Array.isArray(variants) || variants.length === 0) {
      throw new Error('Nama, kategori, dan varian harga harus diisi');
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new Error('Kategori tidak ditemukan');
    }

    const categoryPriceTypes = category.priceTypes;
    const variantPriceTypes = variants.map((v: any) => v.priceType);
    const invalidTypes = variantPriceTypes.filter((type: string) => !categoryPriceTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      throw new Error(`Jenis harga tidak valid untuk kategori ini: ${invalidTypes.join(', ')}. Kategori ini hanya mendukung: ${categoryPriceTypes.join(', ')}`);
    }

    const product = await prisma.product.create({
      data: {
        name,
        categoryId,
        image: image || null,
        variants: {
          create: this.parseVariants(variants),
        },
      },
      include: {
        category: true,
        variants: true,
      },
    });

    return product;
  }

  async updateProduct(id: number, data: any) {
    const { name, categoryId, variants, image } = data;

    if (!name || !categoryId || !variants || !Array.isArray(variants) || variants.length === 0) {
      throw new Error('Nama, kategori, dan varian harga harus diisi');
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      throw new Error('Produk tidak ditemukan');
    }

    const category = await prisma.category.findUnique({
      where: { id: parseInt(categoryId) },
    });

    if (!category) {
      throw new Error('Kategori tidak ditemukan');
    }

    const categoryPriceTypes = category.priceTypes;
    const variantPriceTypes = variants.map((v: any) => v.priceType);
    const invalidTypes = variantPriceTypes.filter((type: string) => !categoryPriceTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      throw new Error(`Jenis harga tidak valid untuk kategori ini: ${invalidTypes.join(', ')}. Kategori ini hanya mendukung: ${categoryPriceTypes.join(', ')}`);
    }

    await prisma.productVariant.deleteMany({
      where: { productId: id },
    });

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        categoryId: parseInt(categoryId),
        image: image || null,
        variants: {
          create: this.parseVariants(variants),
        },
      },
      include: {
        category: true,
        variants: {
          orderBy: { priceType: 'asc' },
        },
      },
    });

    return product;
  }

  async deleteProduct(id: number) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error('Produk tidak ditemukan');
    }

    await prisma.product.delete({
      where: { id },
    });

    return { message: 'Produk berhasil dihapus' };
  }

  private parseVariants(variants: any[]) {
    return variants.map((variant: any) => {
      let price: number | null = null;
      if (variant.price !== undefined && variant.price !== null && variant.price !== '') {
        const parsed = typeof variant.price === 'string' ? parseInt(variant.price) : variant.price;
        price = isNaN(parsed) ? null : parsed;
      }
      
      let stockOnline: number | null = null;
      if (variant.stockOnline !== undefined && variant.stockOnline !== null && variant.stockOnline !== '') {
        const parsed = typeof variant.stockOnline === 'string' ? parseInt(variant.stockOnline) : variant.stockOnline;
        stockOnline = isNaN(parsed) ? null : parsed;
      }

      let stockOffline: number | null = null;
      if (variant.stockOffline !== undefined && variant.stockOffline !== null && variant.stockOffline !== '') {
        const parsed = typeof variant.stockOffline === 'string' ? parseInt(variant.stockOffline) : variant.stockOffline;
        stockOffline = isNaN(parsed) ? null : parsed;
      }
      
      return {
        priceType: variant.priceType,
        price: price ?? null,
        stockOnline: stockOnline ?? null,
        stockOffline: stockOffline ?? null,
      };
    });
  }
}
