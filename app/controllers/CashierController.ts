import { NextRequest, NextResponse } from 'next/server';
import { CashierService } from '../services/CashierService';

export class CashierController {
  private cashierService: CashierService;

  constructor() {
    this.cashierService = new CashierService();
  }

  async createOfflineOrder(request: NextRequest) {
    try {
      const body = await request.json();
      const order = await this.cashierService.createOfflineOrder(body);
      return NextResponse.json(order, { status: 201 });
    } catch (error: any) {
      console.error('Create kasir order error:', error);
      
      if (['Data tidak lengkap', 'ProductId tidak valid atau kosong', 'PriceType tidak valid atau kosong', 'Quantity harus lebih dari 0', 'Price harus lebih dari 0'].includes(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      if (error.message.startsWith('Produk dengan ID')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      
      if (error.message === 'Stok tidak mencukupi') {
        return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
      }

      if (error.message.includes('Pakasir')) {
        return NextResponse.json({ error: error.message }, { status: 502 });
      }

      return NextResponse.json(
        { error: 'Gagal membuat pesanan kasir', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
        { status: 500 }
      );
    }
  }
}
