import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '../services/ProductService';

/**
 * Controller untuk mengelola data produk dan varian harga.
 * Menyediakan endpoint CRUD (Create, Read, Update, Delete) untuk barang sembako yang dijual di toko.
 */
export class ProductController {
  private productService: ProductService;

  /**
   * Menghubungkan controller dengan ProductService.
   */
  constructor() {
    this.productService = new ProductService();
  }

  /**
   * Mengambil daftar produk (mendukung pencarian, filter kategori, dan paginasi).
   * HTTP GET /api/produk
   */
  async getProducts(request: NextRequest) {
    try {
      const { searchParams } = new URL(request.url);
      const page = searchParams.get('page');
      const limit = parseInt(searchParams.get('limit') || '10');
      const search = searchParams.get('search') || undefined;
      const categoryIdStr = searchParams.get('categoryId');
      const categoryId = categoryIdStr ? parseInt(categoryIdStr) : undefined;

      // Jika terdapat parameter query 'page', kembalikan data dalam format paginasi (untuk katalog online)
      if (page) {
        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
          return NextResponse.json({ error: 'Parameter page tidak valid' }, { status: 400 });
        }
        const result = await this.productService.getProductsPaginated(pageNum, limit, search, categoryId);
        return NextResponse.json({
          data: result.data,
          total: result.total,
          page: pageNum,
          totalPages: Math.ceil(result.total / limit),
        });
      }

      // Jika tidak ada parameter 'page', kembalikan seluruh produk tanpa paginasi (backward compatibility untuk kasir offline/checkout)
      const products = await this.productService.getAllProducts();
      return NextResponse.json(products);
    } catch (error) {
      console.error('Get products error:', error);
      return NextResponse.json(
        { error: 'Gagal mengambil data produk' },
        { status: 500 }
      );
    }
  }

  /**
   * Mengambil informasi detail satu produk berdasarkan ID.
   * HTTP GET /api/produk/[id]
   */
  async getProductById(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
      const resolvedParams = params instanceof Promise ? await params : params;
      const id = parseInt(resolvedParams.id);
      
      if (isNaN(id)) {
        return NextResponse.json({ error: 'ID produk tidak valid' }, { status: 400 });
      }

      const product = await this.productService.getProductById(id);

      if (!product) {
        return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
      }

      return NextResponse.json(product);
    } catch (error) {
      console.error('Get product error:', error);
      return NextResponse.json(
        { error: 'Gagal mengambil data produk' },
        { status: 500 }
      );
    }
  }

  /**
   * Menambahkan produk baru beserta varian harganya (oleh Admin).
   * HTTP POST /api/produk
   */
  async createProduct(request: NextRequest) {
    try {
      const body = await request.json();
      // Memproses penambahan produk baru di ProductService
      const product = await this.productService.createProduct(body);
      return NextResponse.json(product, { status: 201 });
    } catch (error: any) {
      console.error('Create product error:', error);
      const errorMessage = error.message;

      // Menangani error validasi masukan atau relasi kategori yang tidak valid (status 400 Bad Request)
      if (['Nama, kategori, dan varian harga harus diisi', 'Kategori tidak ditemukan'].includes(errorMessage) || errorMessage.startsWith('Jenis harga tidak valid')) {
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }

      return NextResponse.json(
        { error: 'Gagal membuat produk', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
        { status: 500 }
      );
    }
  }

  /**
   * Memperbarui data produk dan varian harganya (oleh Admin).
   * HTTP PUT /api/produk/[id]
   */
  async updateProduct(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
      const body = await request.json();
      const resolvedParams = params instanceof Promise ? await params : params;
      const id = parseInt(resolvedParams.id);
      
      if (isNaN(id) || id <= 0) {
        return NextResponse.json({ error: 'ID produk tidak valid' }, { status: 400 });
      }

      // Memproses pembaruan produk di ProductService
      const product = await this.productService.updateProduct(id, body);
      return NextResponse.json(product);
    } catch (error: any) {
      console.error('Update product error:', error);
      const errorMessage = error.message;

      if (errorMessage === 'Produk tidak ditemukan') {
        return NextResponse.json({ error: errorMessage }, { status: 404 });
      }
      
      if (['Nama, kategori, dan varian harga harus diisi', 'Kategori tidak ditemukan'].includes(errorMessage) || errorMessage.startsWith('Jenis harga tidak valid')) {
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }

      return NextResponse.json(
        { error: 'Gagal mengupdate produk', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
        { status: 500 }
      );
    }
  }

  /**
   * Menghapus produk dari sistem (oleh Admin).
   * HTTP DELETE /api/produk/[id]
   */
  async deleteProduct(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
      const resolvedParams = params instanceof Promise ? await params : params;
      const id = parseInt(resolvedParams.id);
      
      if (isNaN(id) || id <= 0) {
        return NextResponse.json({ error: 'ID produk tidak valid' }, { status: 400 });
      }

      // Memanggil fungsi penghapusan produk di ProductService
      const result = await this.productService.deleteProduct(id);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Delete product error:', error);
      
      if (error.message === 'Produk tidak ditemukan') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      
      // Menangani error constraints integrity (Prisma P2003) jika produk masih digunakan dalam histori transaksi order (status 400 Bad Request)
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Produk tidak dapat dihapus karena masih digunakan dalam pesanan' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Gagal menghapus produk', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
        { status: 500 }
      );
    }
  }
}
