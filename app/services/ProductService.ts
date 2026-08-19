import { prisma } from '@/lib/db';

/**
 * Service untuk memproses logika bisnis terkait manajemen produk sembako dan variannya.
 * Berinteraksi langsung dengan database PostgreSQL menggunakan Prisma ORM.
 */
export class ProductService {
  /**
   * Mengambil semua produk dari database, lengkap dengan data kategori, varian harga,
   * dan jumlah penjualan (salesCount) per produk.
   * Diurutkan berdasarkan jumlah produk terlaris.
   */
  async getAllProducts() {
    // 1. Mengambil produk beserta relasinya dari database
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          orderBy: { priceType: 'asc' }, // Urutkan varian harga
        },
        items: {
          select: {
            quantity: true, // Ambil qty penjualan untuk hitung penjualan terlaris
          },
        },
      },
    });

    // 2. Memetakan salesCount (menghitung total item yang terjual) secara fungsional
    return products
      .map((p) => {
        const salesCount = p.items.reduce((sum, item) => sum + item.quantity, 0);
        const { items, ...rest } = p;
        return { ...rest, salesCount };
      })
      .sort((a, b) => b.salesCount - a.salesCount); // Diurutkan dari yang paling laris (descending)
  }

  /**
   * Mengambil data produk berpaginasi untuk halaman katalog depan client.
   * Mendukung filter pencarian nama produk dan filter berdasarkan kategori.
   */
  async getProductsPaginated(page: number, limit: number, search?: string, categoryId?: number) {
    const where: any = {};
    // Menambahkan filter pencarian jika diinput oleh user
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }; // Case-insensitive search
    }
    // Menambahkan filter kategori jika dipilih
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Melakukan query pararel untuk menghemat waktu respon database
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          variants: {
            orderBy: { priceType: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' }, // Produk terbaru tampil di depan
        skip: (page - 1) * limit, // Skip record untuk paginasi
        take: limit, // Batasi jumlah data yang diambil
      }),
      prisma.product.count({ where }), // Hitung total record untuk kalkulasi total halaman
    ]);

    return {
      data: products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mengambil satu produk berdasarkan ID produk.
   */
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

  /**
   * Menambahkan produk baru beserta varian harganya (oleh Admin).
   */
  async createProduct(data: any) {
    const { name, categoryId, variants, image } = data;

    // Validasi input wajib
    if (!name || !categoryId || !variants || !Array.isArray(variants) || variants.length === 0) {
      throw new Error('Nama, kategori, dan varian harga harus diisi');
    }

    // Pastikan kategori yang dituju ada di database
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new Error('Kategori tidak ditemukan');
    }

    // Aturan bisnis: Varian jenis harga yang dimasukkan produk harus didukung oleh kategori produk tersebut
    const categoryPriceTypes = category.priceTypes;
    const variantPriceTypes = variants.map((v: any) => v.priceType);
    const invalidTypes = variantPriceTypes.filter((type: string) => !categoryPriceTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      throw new Error(`Jenis harga tidak valid untuk kategori ini: ${invalidTypes.join(', ')}. Kategori ini hanya mendukung: ${categoryPriceTypes.join(', ')}`);
    }

    // Menyimpan produk baru beserta variannya menggunakan fitur nested write Prisma
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

  /**
   * Memperbarui data produk dan varian harganya (oleh Admin).
   */
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

    // Validasi tipe jenis harga varian produk terhadap kategori
    const categoryPriceTypes = category.priceTypes;
    const variantPriceTypes = variants.map((v: any) => v.priceType);
    const invalidTypes = variantPriceTypes.filter((type: string) => !categoryPriceTypes.includes(type));
    
    if (invalidTypes.length > 0) {
      throw new Error(`Jenis harga tidak valid untuk kategori ini: ${invalidTypes.join(', ')}. Kategori ini hanya mendukung: ${categoryPriceTypes.join(', ')}`);
    }

    // 1. Hapus varian produk yang lama terlebih dahulu
    await prisma.productVariant.deleteMany({
      where: { productId: id },
    });

    // 2. Update produk dan masukkan varian baru
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

  /**
   * Menghapus produk dari database berdasarkan ID.
   */
  async deleteProduct(id: number) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new Error('Produk tidak ditemukan');
    }

    // Menghapus produk (varian produk akan otomatis terhapus jika diatur Cascade Delete di schema)
    await prisma.product.delete({
      where: { id },
    });

    return { message: 'Produk berhasil dihapus' };
  }

  /**
   * Fungsi pembantu untuk mem-parsing input varian dan mengonversi tipe data string ke number yang valid.
   */
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
