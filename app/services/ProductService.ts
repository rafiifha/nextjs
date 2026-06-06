import { prisma } from '@/lib/db';

export class ProductService {
  async getAllProducts() {
    return await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          orderBy: { priceType: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProductsPaginated(page: number, limit: number, search?: string) {
    const where: any = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
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
    const { name, categoryId, variants } = data;

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
    const { name, categoryId, variants } = data;

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
      
      let stock: number | null = null;
      if (variant.stock !== undefined && variant.stock !== null && variant.stock !== '') {
        const parsed = typeof variant.stock === 'string' ? parseInt(variant.stock) : variant.stock;
        stock = isNaN(parsed) ? null : parsed;
      }
      
      return {
        priceType: variant.priceType,
        price: price ?? null,
        stock: stock ?? null,
      };
    });
  }
}
