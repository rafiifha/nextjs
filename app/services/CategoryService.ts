import { prisma } from '@/lib/db';

/**
 * Service untuk memproses logika bisnis terkait kategori produk.
 * Berinteraksi langsung dengan database menggunakan Prisma ORM.
 */
export class CategoryService {
  /**
   * Mengambil semua kategori dari database, lengkap dengan produk-produk di dalamnya dan variannya.
   * Diurutkan berdasarkan nama kategori secara menaik (A-Z).
   */
  async getAllCategories() {
    return await prisma.category.findMany({
      include: {
        products: {
          include: {
            variants: true,
          },
        },
      },
      orderBy: { name: 'asc' }, // Mengurutkan nama dari A ke Z
    });
  }

  /**
   * Membuat kategori produk baru di database.
   * @param name Nama kategori baru.
   * @param priceTypes Daftar jenis satuan harga (misal: 'dus', 'bal', 'pack').
   */
  async createCategory(name: string, priceTypes: string[]) {
    // Validasi data masukan wajib
    if (!name || !priceTypes || !Array.isArray(priceTypes) || priceTypes.length === 0) {
      throw new Error('Nama kategori dan jenis harga harus diisi');
    }

    try {
      // Menyimpan kategori baru ke tabel category di database
      const category = await prisma.category.create({
        data: {
          name,
          priceTypes,
        },
      });
      return category;
    } catch (error: any) {
      // Menangani error constraints integrity dari database jika kategori dengan nama tersebut sudah terdaftar
      if (error.code === 'P2002') {
        throw new Error('Kategori dengan nama ini sudah ada');
      }
      throw error;
    }
  }
}
