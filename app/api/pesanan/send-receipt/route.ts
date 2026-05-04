import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendReceipt } from '@/services/whatsappService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID harus diisi' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      );
    }

    await sendReceipt(order.customerPhone, {
      orderId: order.id,
      customerName: order.customerName,
      totalHarga: order.totalHarga,
      shippingFee: order.shippingFee,
      status: order.status,
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price * item.quantity,
      })),
      createdAt: order.createdAt.toISOString(),
    });

    return NextResponse.json({ message: 'E-receipt berhasil dikirim' });
  } catch (error) {
    console.error('Send receipt error:', error);
    return NextResponse.json(
      { error: 'Gagal mengirim e-receipt' },
      { status: 500 }
    );
  }
}

