import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        deliveryMethod: 'delivery',
        status: {
          in: ['paid', 'processing', 'shipped', 'delivered'],
        },
      },
      include: {
        courier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Delivery orders error:', error);
    return NextResponse.json({ error: 'Gagal mengambil data pengiriman' }, { status: 500 });
  }
}
