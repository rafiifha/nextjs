import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '../services/PaymentService';

/**
 * Controller untuk menangani alur konfirmasi pembayaran.
 * Menyediakan endpoint webhook yang menerima callback dari Payment Gateway Pakasir setelah transaksi diselesaikan oleh pembeli.
 */
export class PaymentController {
  private paymentService: PaymentService;

  /**
   * Inisialisasi instance PaymentService.
   */
  constructor() {
    this.paymentService = new PaymentService();
  }

  /**
   * Menerima dan memproses notifikasi webhook pembayaran sukses dari server Pakasir.
   * HTTP POST /api/payment/webhook
   */
  async handlePakasirWebhook(request: NextRequest) {
    try {
      const body = await request.json();
      // Memproses data webhook di PaymentService
      const result = await this.paymentService.handlePakasirWebhook(body);
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      console.error('Error memproses webhook Pakasir:', error);
      
      // Menangani error validasi keamanan proyek atau parameter order_id (status 400 Bad Request)
      if (error.message === 'Project tidak valid' || error.message === 'Format order_id tidak valid') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      // Menangani error jika pesanan yang diwebhook tidak terdaftar di database kita (status 404 Not Found)
      if (error.message === 'Pesanan tidak ditemukan') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      
      return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
    }
  }
}
