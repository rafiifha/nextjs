import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '../services/OrderService';
import { verifyToken } from '@/lib/auth';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  async getOrders(request: NextRequest) {
    try {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      let userPayload = null;
      if (token) {
        userPayload = verifyToken(token);
      }

      const { searchParams } = new URL(request.url);
      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');

      // Admin gets all orders, customer gets only their own
      if (userPayload && userPayload.role !== 'admin') {
        if (pageParam) {
          const page = Math.max(1, parseInt(pageParam) || 1);
          const limit = Math.max(1, Math.min(100, parseInt(limitParam || '10') || 10));
          const result = await this.orderService.getOrdersByCustomerPaginated(userPayload.userId, page, limit);
          return NextResponse.json({
            data: result.data,
            total: result.total,
            page,
            totalPages: Math.ceil(result.total / limit),
          });
        }
        const orders = await this.orderService.getOrdersByCustomer(userPayload.userId);
        return NextResponse.json(orders);
      }

      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const search = searchParams.get('search') || '';
      const status = searchParams.get('status') || '';

      const result = await this.orderService.getAllOrders({ page, limit, search, status });
      return NextResponse.json(result);
    } catch (error: any) {
      console.error('Get orders error:', error);
      return NextResponse.json(
        { 
          error: 'Gagal mengambil data pesanan',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  }

  async getOrderById(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
      const resolvedParams = params instanceof Promise ? await params : params;
      const id = parseInt(resolvedParams.id);
      
      if (isNaN(id)) {
        return NextResponse.json({ error: 'ID pesanan tidak valid' }, { status: 400 });
      }

      const order = await this.orderService.getOrderById(id);
      return NextResponse.json(order);
    } catch (error: any) {
      console.error('Get order error:', error);
      if (error.message === 'Pesanan tidak ditemukan') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: 'Gagal mengambil data pesanan' }, { status: 500 });
    }
  }

  async createOrder(request: NextRequest) {
    try {
      const body = await request.json();
      
      // Extract userId from JWT token
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (token) {
        const userPayload = verifyToken(token);
        if (userPayload) {
          body.userId = userPayload.userId;
        }
      }
      
      const order = await this.orderService.createOrder(body);
      return NextResponse.json(order, { status: 201 });
    } catch (error: any) {
      console.error('Create order error:', error);
      
      if (error.message === 'Data pelanggan dan items harus diisi' || error.message === 'Pesanan antar wajib menggunakan pembayaran non-tunai') {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      
      if (error.message === 'Produk tidak ditemukan') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      
      if (error.message === 'Stok tidak mencukupi') {
        return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
      }

      if (error.message === 'Gagal membuat transaksi pembayaran') {
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
      
      return NextResponse.json(
        { 
          error: 'Gagal membuat pesanan',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  }

  async updateOrder(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
    try {
      const resolvedParams = params instanceof Promise ? await params : params;
      const id = parseInt(resolvedParams.id);
      const body = await request.json();
      
      if (isNaN(id)) {
        return NextResponse.json({ success: false, error: 'ID pesanan tidak valid' }, { status: 400 });
      }

      const order = await this.orderService.updateOrder(id, body);
      return NextResponse.json({ success: true, data: order });
    } catch (error: any) {
      console.error('Update order error:', error);
      
      if (error.message === 'Pesanan tidak ditemukan') {
        return NextResponse.json({ success: false, error: error.message }, { status: 404 });
      }
      
      if (['Pesanan offline yang sudah selesai tidak dapat diubah statusnya.', 'Kurir wajib dipilih sebelum kirim pesanan', 'Kurir tidak valid atau tidak aktif'].includes(error.message)) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }
      
      return NextResponse.json(
        { 
          success: false,
          error: 'Gagal mengupdate pesanan',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500 }
      );
    }
  }

  async checkExpiredOrders() {
    try {
      const expiredOrders = await this.orderService.checkExpiredOrders();
      return NextResponse.json({
        message: `Cancelled ${expiredOrders.length} expired orders`,
        expiredOrders: expiredOrders.map(o => o.id),
      });
    } catch (error: any) {
      console.error('Check expired orders error:', error);
      return NextResponse.json(
        { error: 'Gagal memproses expired orders', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
        { status: 500 }
      );
    }
  }

  async getExpiredOrdersForTest() {
    try {
      const expiredOrders = await this.orderService.getExpiredOrdersForTest();
      return NextResponse.json({
        expiredCount: expiredOrders.length,
        expiredOrders,
      });
    } catch (error: any) {
      console.error('Get expired orders error:', error);
      return NextResponse.json(
        { error: 'Gagal mengambil expired orders' },
        { status: 500 }
      );
    }
  }

  async sendReceipt(request: NextRequest) {
    try {
      const body = await request.json();
      const { orderId } = body;

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID harus diisi' }, { status: 400 });
      }

      await this.orderService.sendReceipt(orderId);
      return NextResponse.json({ message: 'E-receipt berhasil dikirim' });
    } catch (error: any) {
      console.error('Send receipt error:', error);
      if (error.message === 'Pesanan tidak ditemukan') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: 'Gagal mengirim e-receipt' }, { status: 500 });
    }
  }
}
