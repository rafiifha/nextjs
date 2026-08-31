import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';

/**
 * PATCH /api/kurir/orders/[id]/status
 * Kurir mengupdate status pengiriman (shipped → delivered).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { status, proofOfDelivery } = body;

    // Validasi status yang diizinkan untuk kurir
    if (!['delivered'].includes(status)) {
      return NextResponse.json({ error: 'Kurir hanya bisa mengubah status ke "delivered"' }, { status: 400 });
    }

    // Cek pesanan exists dan ditugaskan ke kurir ini
    const order = await prisma.order.findUnique({
      where: { id: Number(id) },
    });

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    if (order.courierId !== payload.userId) {
      return NextResponse.json({ error: 'Pesanan ini bukan tugas Anda' }, { status: 403 });
    }

    if (order.status !== 'shipped') {
      return NextResponse.json({ error: 'Hanya pesanan berstatus "shipped" yang bisa diubah ke "delivered"' }, { status: 400 });
    }

    // Update status ke delivered beserta foto bukti pengiriman jika ada
    const updatedOrder = await prisma.order.update({
      where: { id: Number(id) },
      data: {
        status: 'delivered',
        deliveredAt: new Date(),
        ...(proofOfDelivery && { proofOfDelivery: String(proofOfDelivery) }),
      },
      include: {
        courier: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: { product: true },
        },
      },
    });

    // Kirim event real-time via Pusher
    try {
      await triggerOrderEvent('order-updated', updatedOrder);
    } catch (error) {
      console.error('Pusher error:', error);
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Update delivery status error:', error);
    return NextResponse.json({ error: 'Gagal mengupdate status pengiriman' }, { status: 500 });
  }
}
