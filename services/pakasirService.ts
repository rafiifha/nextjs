import { env } from '@/lib/env';

export interface PakasirTransactionRequest {
  order_id: string;
  amount: number;
}

export interface PakasirTransactionResponse {
  payment: {
    project: string;
    order_id: string;
    amount: number;
    fee: number;
    total_payment: number;
    payment_method: string;
    payment_number: string;
    expired_at: string;
  };
}

/**
 * Service khusus untuk mengintegrasikan sistem dengan API Gateway Pakasir.
 * Berfungsi membuat transaksi non-tunai (seperti QRIS/E-Wallet), melakukan pembatalan invoice,
 * dan memverifikasi status pembayaran langsung ke server Pakasir.
 */
class PakasirService {
  // Base URL endpoint API gateway Pakasir
  private readonly baseUrl = 'https://app.pakasir.com/api';
  
  /**
   * Membuat transaksi pembayaran digital baru di server Pakasir.
   * @param method Metode pembayaran digital (misal: 'qris').
   * @param data Data transaksi (order_id unik & amount nominal pembayaran).
   */
  async createTransaction(method: string, data: PakasirTransactionRequest): Promise<PakasirTransactionResponse> {
    // Melakukan request HTTP POST ke endpoint transactioncreate Pakasir
    const response = await fetch(`${this.baseUrl}/transactioncreate/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: env.PAKASIR_PROJECT, // Kode project merchant dari environment
        api_key: env.PAKASIR_API_KEY,   // Kunci rahasia API key dari environment
        ...data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pakasir API Error:', errorText);
      throw new Error(`Gagal membuat transaksi Pakasir: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Membatalkan tagihan transaksi digital secara resmi di server Pakasir.
   * Digunakan jika pesanan dibatalkan atau kadaluwarsa (expired).
   */
  async cancelTransaction(data: PakasirTransactionRequest): Promise<any> {
    // Melakukan request HTTP POST ke endpoint transactioncancel Pakasir
    const response = await fetch(`${this.baseUrl}/transactioncancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: env.PAKASIR_PROJECT,
        api_key: env.PAKASIR_API_KEY,
        ...data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pakasir API Error:', errorText);
      throw new Error(`Gagal membatalkan transaksi Pakasir: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Mengambil informasi detail transaksi pembayaran langsung ke server Pakasir.
   * Berguna untuk melakukan rekonsiliasi atau pengecekan status pembayaran secara manual (polling).
   */
  async getTransactionDetail(orderId: string, amount: number): Promise<any> {
    const params = new URLSearchParams({
      project: env.PAKASIR_PROJECT,
      api_key: env.PAKASIR_API_KEY,
      order_id: orderId,
      amount: amount.toString(),
    });

    // Melakukan request HTTP GET dengan query string parameter ke server Pakasir
    const response = await fetch(`${this.baseUrl}/transactiondetail?${params.toString()}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pakasir API Error:', errorText);
      throw new Error(`Gagal mengambil detail transaksi Pakasir: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}

export const pakasirService = new PakasirService();
