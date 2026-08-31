import { NextRequest, NextResponse } from 'next/server';
import { DeliveryService } from '../services/DeliveryService';

/**
 * Controller untuk menangani urusan logistik pengiriman barang (delivery).
 * Menyediakan endpoint untuk mengambil data pesanan antar, menghitung ongkos kirim berdasarkan koordinat, dan manajemen kurir.
 */
export class DeliveryController {
  private deliveryService: DeliveryService;

  /**
   * Menghubungkan controller dengan DeliveryService.
   */
  constructor() {
    this.deliveryService = new DeliveryService();
  }

  /**
   * Mengambil semua pesanan yang bertipe 'delivery' (pengantaran kurir) yang perlu diproses.
   * HTTP GET /api/delivery
   */
  async getDeliveryOrders() {
    try {
      const orders = await this.deliveryService.getDeliveryOrders();
      return NextResponse.json(orders);
    } catch (error) {
      console.error('Delivery orders error:', error);
      return NextResponse.json({ error: 'Gagal mengambil data pengiriman' }, { status: 500 });
    }
  }

  /**
   * Menghitung ongkos kirim (shipping fee) berdasarkan jarak (Haversine formula) dari lokasi toko ke lokasi koordinat pembeli.
   * HTTP POST /api/delivery/calculate
   */
  async calculateShippingFee(request: NextRequest) {
    try {
      const body = await request.json();
      const lat = Number(body?.lat);
      const lng = Number(body?.lng);

      // Memanggil fungsi kalkulator jarak dan tarif ongkir di DeliveryService
      const result = this.deliveryService.calculateShippingFee(lat, lng);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Calculate delivery error:', error);
      // Validasi kesalahan jika koordinat tidak valid atau lokasi di luar radius maksimum 10km (status 400 Bad Request)
      if (error.message === 'Koordinat tidak valid' || error.message.includes('Lokasi di luar jangkauan')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: 'Gagal menghitung ongkir' }, { status: 500 });
    }
  }

  /**
   * Mengambil daftar kurir yang bertugas mengantar pesanan (dari tabel User, role 'kurir').
   * HTTP GET /api/delivery/couriers
   * @param includeAll Jika true, akan menampilkan kurir yang tidak aktif juga (berguna untuk manajemen di admin).
   */
  async getCouriers(includeAll: boolean = false) {
    try {
      const couriers = await this.deliveryService.getCouriers(includeAll);
      return NextResponse.json(couriers);
    } catch (error) {
      console.error('Get couriers error:', error);
      return NextResponse.json({ error: 'Gagal mengambil data kurir' }, { status: 500 });
    }
  }

  /**
   * Mengambil daftar pesanan yang ditugaskan ke kurir tertentu.
   * HTTP GET /api/kurir/orders
   */
  async getCourierOrders(courierId: number) {
    try {
      const orders = await this.deliveryService.getCourierOrders(courierId);
      return NextResponse.json(orders);
    } catch (error) {
      console.error('Get courier orders error:', error);
      return NextResponse.json({ error: 'Gagal mengambil data pesanan kurir' }, { status: 500 });
    }
  }
}
