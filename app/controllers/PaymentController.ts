import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '../services/PaymentService';

export class PaymentController {
  private paymentService: PaymentService;

  constructor() {
    this.paymentService = new PaymentService();
  }

  async handlePakasirWebhook(request: NextRequest) {
    try {
      const body = await request.json();
      const result = await this.paymentService.handlePakasirWebhook(body);
      return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
      console.error('Error memproses webhook Pakasir:', error);
      
      if (error.message === 'Project tidak valid' || error.message === 'Format order_id tidak valid') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      if (error.message === 'Pesanan tidak ditemukan') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      
      return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
    }
  }
}
