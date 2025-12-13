import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: parseInt(params.id) },
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

    return NextResponse.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data pesanan' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, customerName, customerPhone, deliveryMethod, shippingFee, trackingId, waybillId, biteshipOrderId } = body;

    const order = await prisma.order.update({
      where: { id: parseInt(params.id) },
      data: {
        ...(status && { status }),
        ...(customerName && { customerName }),
        ...(customerPhone && { customerPhone }),
        ...(deliveryMethod !== undefined && { deliveryMethod }),
        ...(shippingFee !== undefined && { shippingFee }),
        ...(trackingId !== undefined && { trackingId }),
        ...(waybillId !== undefined && { waybillId }),
        ...(biteshipOrderId !== undefined && { biteshipOrderId }),
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Trigger Pusher event
    try {
      await triggerOrderEvent('order-updated', order);
    } catch (error) {
      console.error('Pusher error:', error);
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate pesanan' },
      { status: 500 }
    );
  }
}

