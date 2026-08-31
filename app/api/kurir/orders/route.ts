import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { DeliveryController } from '@/app/controllers/DeliveryController';

const deliveryController = new DeliveryController();

/**
 * GET /api/kurir/orders
 * Mengambil daftar pesanan yang ditugaskan ke kurir yang sedang login.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload || payload.role !== 'kurir') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya kurir yang diizinkan.' }, { status: 403 });
    }

    return deliveryController.getCourierOrders(payload.userId);
  } catch (error) {
    console.error('Get courier orders error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pesanan' }, { status: 500 });
  }
}
