import { prisma } from '@/lib/db';

const STORE_LAT = -6.98680382532075;
const STORE_LNG = 107.82755858678257;
const MAX_DISTANCE_KM = 10;

export class DeliveryService {
  async getDeliveryOrders() {
    return await prisma.order.findMany({
      where: {
        deliveryMethod: 'delivery',
        status: {
          in: ['paid', 'processing', 'shipped', 'delivered'],
        },
      },
      include: {
        courier: true,
        items: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }

  private haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  private getZoneAndFee(distanceKm: number) {
    if (distanceKm <= 3) return { zone: 1, shippingFee: 15000 };
    if (distanceKm <= 6) return { zone: 2, shippingFee: 20000 };
    if (distanceKm <= 10) return { zone: 3, shippingFee: 25000 };
    return null;
  }

  calculateShippingFee(lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error('Koordinat tidak valid');
    }

    const distanceKm = this.haversineDistanceKm(STORE_LAT, STORE_LNG, lat, lng);
    if (distanceKm > MAX_DISTANCE_KM) {
      throw new Error('Lokasi di luar jangkauan pengiriman (maksimal 10 km)');
    }

    const zoneData = this.getZoneAndFee(distanceKm);
    if (!zoneData) {
      throw new Error('Lokasi di luar jangkauan pengiriman (maksimal 10 km)');
    }

    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      zone: zoneData.zone,
      shippingFee: zoneData.shippingFee,
      store: { lat: STORE_LAT, lng: STORE_LNG },
    };
  }

  async getCouriers(includeAll: boolean = false) {
    return await prisma.courier.findMany({
      where: includeAll ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

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
