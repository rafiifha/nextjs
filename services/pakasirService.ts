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

class PakasirService {
  private readonly baseUrl = 'https://app.pakasir.com/api';
  
  /**
   * Membuat transaksi baru ke Pakasir
   */
  async createTransaction(method: string, data: PakasirTransactionRequest): Promise<PakasirTransactionResponse> {
    const response = await fetch(`${this.baseUrl}/transactioncreate/${method}`, {
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
      throw new Error(`Gagal membuat transaksi Pakasir: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Membatalkan transaksi
   */
  async cancelTransaction(data: PakasirTransactionRequest): Promise<any> {
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
   * Mengambil detail transaksi
   */
  async getTransactionDetail(orderId: string, amount: number): Promise<any> {
    const params = new URLSearchParams({
      project: env.PAKASIR_PROJECT,
      api_key: env.PAKASIR_API_KEY,
      order_id: orderId,
      amount: amount.toString(),
    });

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
