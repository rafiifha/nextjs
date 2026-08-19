import { NextRequest, NextResponse } from 'next/server';
import { CategoryService } from '../services/CategoryService';

/**
 * Controller untuk mengelola kategori produk.
 * Berfungsi sebagai perantara antara request API dari client (frontend) dan logika bisnis di CategoryService.
 */
export class CategoryController {
  private categoryService: CategoryService;

  /**
   * Constructor untuk inisialisasi instance CategoryService yang dibutuhkan controller ini.
   */
  constructor() {
    this.categoryService = new CategoryService();
  }

  /**
   * Mengambil semua data kategori dari database.
   * Dipanggil melalui metode HTTP GET.
   */
  async getCategories() {
    try {
      // Memanggil service untuk mengambil semua kategori dari database
      const categories = await this.categoryService.getAllCategories();
      // Mengembalikan response dalam format JSON
      return NextResponse.json(categories);
    } catch (error) {
      console.error('Get categories error:', error);
      // Mengembalikan status error 500 jika terjadi kesalahan pada server
      return NextResponse.json(
        { error: 'Gagal mengambil data kategori' },
        { status: 500 }
      );
    }
  }

  /**
   * Membuat kategori produk baru di database.
   * Dipanggil melalui metode HTTP POST dengan data input nama kategori dan jenis harga.
   */
  async createCategory(request: NextRequest) {
    try {
      // Membaca body request JSON dari client
      const body = await request.json();
      const { name, priceTypes } = body;

      // Memanggil service untuk memproses pembuatan kategori baru
      const category = await this.categoryService.createCategory(name, priceTypes);
      // Mengembalikan data kategori yang berhasil dibuat dengan status 201 (Created)
      return NextResponse.json(category, { status: 201 });
    } catch (error: any) {
      console.error('Create category error:', error);
      
      const errorMessage = error.message;
      // Menangani error validasi input dari logika bisnis (status 400 Bad Request)
      if (errorMessage === 'Nama kategori dan jenis harga harus diisi' || errorMessage === 'Kategori dengan nama ini sudah ada') {
        return NextResponse.json({ error: errorMessage }, { status: 400 });
      }

      // Mengembalikan status error 500 jika terjadi kesalahan pada server
      return NextResponse.json(
        { error: 'Gagal membuat kategori' },
        { status: 500 }
      );
    }
  }
}
