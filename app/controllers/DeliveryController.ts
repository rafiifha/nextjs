import { NextRequest, NextResponse } from 'next/server';
import { DeliveryService } from '../services/DeliveryService';

export class DeliveryController {
  private deliveryService: DeliveryService;

  constructor() {
    this.deliveryService = new DeliveryService();
  }

  async getDeliveryOrders() {
    try {
      const orders = await this.deliveryService.getDeliveryOrders();
      return NextResponse.json(orders);
    } catch (error) {
      console.error('Delivery orders error:', error);
      return NextResponse.json({ error: 'Gagal mengambil data pengiriman' }, { status: 500 });
    }
  }

  async calculateShippingFee(request: NextRequest) {
    try {
      const body = await request.json();
      const lat = Number(body?.lat);
      const lng = Number(body?.lng);

      const result = this.deliveryService.calculateShippingFee(lat, lng);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Calculate delivery error:', error);
      if (error.message === 'Koordinat tidak valid' || error.message.includes('Lokasi di luar jangkauan')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ error: 'Gagal menghitung ongkir' }, { status: 500 });
    }
  }

  async getCouriers(includeAll: boolean = false) {
    try {
      const couriers = await this.deliveryService.getCouriers(includeAll);
      return NextResponse.json(couriers);
    } catch (error) {
      console.error('Get couriers error:', error);
      return NextResponse.json({ error: 'Gagal mengambil data kurir' }, { status: 500 });
    }
  }

  async createCourier(request: NextRequest) {
    try {
      const body = await request.json();
      const courier = await this.deliveryService.createCourier(body);
      return NextResponse.json(courier, { status: 201 });
    } catch (error: any) {
      console.error('Create courier error:', error);
      if (error.message === 'Nama dan nomor whatsapp wajib diisi') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error?.code === 'P2002') {
        return NextResponse.json({ error: 'Nomor whatsapp kurir sudah terdaftar' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Gagal menambah kurir' }, { status: 500 });
    }
  }
}
