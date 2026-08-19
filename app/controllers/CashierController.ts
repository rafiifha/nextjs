import { NextRequest, NextResponse } from 'next/server';
import { CashierService } from '../services/CashierService';

/**
 * Controller untuk menangani proses transaksi di halaman Kasir.
 * Menghubungkan client kasir (frontend) dengan CashierService untuk membuat pesanan offline/tunai maupun non-tunai.
 */
export class CashierController {
  private cashierService: CashierService;

  /**
   * Menghubungkan controller dengan CashierService.
   */
  constructor() {
    this.cashierService = new CashierService();
  }

  /**
   * Membuat transaksi pesanan baru dari antarmuka Kasir (pembelian offline langsung di toko).
   * HTTP POST /api/kasir
   */
  async createOfflineOrder(request: NextRequest) {
    try {
      // Membaca body request JSON (customerName, customerPhone, items, paymentMethod, discount, dll.)
      const body = await request.json();
      // Memanggil service untuk membuat pesanan offline
      const order = await this.cashierService.createOfflineOrder(body);
      // Mengembalikan response data pesanan yang sukses dibuat dengan status 201 (Created)
      return NextResponse.json(order, { status: 201 });
    } catch (error: any) {
      console.error('Create kasir order error:', error);
      
      // Menangani error validasi data pesanan (status 400 Bad Request)
      if (['Data tidak lengkap', 'ProductId tidak valid atau kosong', 'PriceType tidak valid atau kosong', 'Quantity harus lebih dari 0', 'Price harus lebih dari 0'].includes(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      // Menangani error jika produk tidak ditemukan (status 404 Not Found)
      if (error.message.startsWith('Produk dengan ID')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      
      // Menangani error jika stok barang di toko habis atau kurang (status 400 Bad Request)
      if (error.message === 'Stok tidak mencukupi') {
        return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
      }

      // Menangani error koneksi ke API Gateway Pembayaran Pakasir (status 502 Bad Gateway)
      if (error.message.includes('Pakasir')) {
        return NextResponse.json({ error: error.message }, { status: 502 });
      }

      // Menangani error server internal tak terduga (status 500)
      return NextResponse.json(
        { error: 'Gagal membuat pesanan kasir', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
        { status: 500 }
      );
    }
  }
}
