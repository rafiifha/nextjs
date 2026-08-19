import { prisma } from '@/lib/db';

// Titik koordinat GPS Toko Naning sebagai titik acuan (Store Latitude dan Longitude)
const STORE_LAT = -6.98680382532075;
const STORE_LNG = 107.82755858678257;
// Batas radius pengantaran maksimal (10 kilometer)
const MAX_DISTANCE_KM = 10;

/**
 * Service untuk memproses logika bisnis pengiriman (delivery) dan manajemen kurir.
 * Berinteraksi langsung dengan database via Prisma ORM dan mengimplementasikan algoritma rumus jarak Haversine.
 */
export class DeliveryService {
  /**
   * Mengambil daftar pesanan yang memerlukan pengiriman kurir.
   * Hanya memfilter pesanan yang metode pengirimannya adalah 'delivery' dan status pembayarannya valid untuk diantar.
   */
  async getDeliveryOrders() {
    return await prisma.order.findMany({
      where: {
        deliveryMethod: 'delivery',
        status: {
          in: ['paid', 'processing', 'shipped', 'delivered'], // Filter status pesanan logistik
        },
      },
      include: {
        courier: true, // Sertakan info kurir yang ditugaskan
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mengonversi nilai derajat (degree) ke radian.
   * Digunakan sebagai fungsi pembantu untuk perhitungan rumus trigonometri Haversine.
   */
  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }

  /**
   * Menghitung jarak bumi bulat antara dua koordinat GPS menggunakan Formula Haversine.
   * @returns Jarak dalam satuan kilometer (km).
   */
  private haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const earthRadiusKm = 6371; // Radius rata-rata bumi dalam kilometer
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    // Rumus inti Haversine
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    // Hasil perhitungan sudut busur dikali radius bumi
    return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  /**
   * Menentukan zona pengiriman dan tarif ongkos kirim berdasarkan jarak tempuh.
   * - Jarak <= 3 km: Zona 1, Ongkir Rp 15.000
   * - Jarak <= 6 km: Zona 2, Ongkir Rp 20.000
   * - Jarak <= 10 km: Zona 3, Ongkir Rp 25.000
   */
  private getZoneAndFee(distanceKm: number) {
    if (distanceKm <= 3) return { zone: 1, shippingFee: 15000 };
    if (distanceKm <= 6) return { zone: 2, shippingFee: 20000 };
    if (distanceKm <= 10) return { zone: 3, shippingFee: 25000 };
    return null; // Di luar zona jangkauan
  }

  /**
   * Menghitung tarif ongkos kirim berdasarkan koordinat latitude dan longitude lokasi pembeli.
   */
  calculateShippingFee(lat: number, lng: number) {
    // Validasi input koordinat GPS
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Koordinat tidak valid');
    }

    // 1. Hitung jarak dari toko ke lokasi tujuan dengan rumus Haversine
    const distanceKm = this.haversineDistanceKm(STORE_LAT, STORE_LNG, lat, lng);
    
    // 2. Batasi jarak pengantaran maksimal 10 km
    if (distanceKm > MAX_DISTANCE_KM) {
      throw new Error('Lokasi di luar jangkauan pengiriman (maksimal 10 km)');
    }

    // 3. Tentukan zona dan tarif ongkir
    const zoneData = this.getZoneAndFee(distanceKm);
    if (!zoneData) {
      throw new Error('Lokasi di luar jangkauan pengiriman (maksimal 10 km)');
    }

    // Mengembalikan data hasil kalkulasi detail untuk disimpan/ditampilkan di client
    return {
      distanceKm: Number(distanceKm.toFixed(2)), // Pembulatan 2 desimal
      zone: zoneData.zone,
      shippingFee: zoneData.shippingFee,
      store: { lat: STORE_LAT, lng: STORE_LNG },
    };
  }

  /**
   * Mengambil daftar kurir yang terdaftar di sistem.
   * @param includeAll Jika true, tampilkan semua kurir. Jika false, hanya tampilkan yang berstatus aktif.
   */
  async getCouriers(includeAll: boolean = false) {
    return await prisma.courier.findMany({
      where: includeAll ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mendaftarkan kurir baru ke database.
   */
  async createCourier(data: any) {
    const name = String(data?.name || '').trim();
    const phone = String(data?.phone || '').trim();

    if (!name || !phone) {
      throw new Error('Nama dan nomor whatsapp wajib diisi');
    }

    return await prisma.courier.create({
      data: { name, phone },
    });
  }
}
