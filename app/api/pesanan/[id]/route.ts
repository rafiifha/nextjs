import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, customerName, customerPhone, deliveryMethod, shippingFee, trackingId, waybillId, biteshipOrderId } = body;

    // Get existing order first to check if it's an offline order
    const existingOrder = await prisma.order.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Pesanan tidak ditemukan' 
        },
        { status: 404 }
      );
    }

    // Prevent status update for offline orders (kasir orders)
    // Offline orders are identified by: pickup delivery method with no shipping fee
    const isOfflineOrder = existingOrder.deliveryMethod === 'pickup' && (!existingOrder.shippingFee || existingOrder.shippingFee === 0);
    
    if (status && isOfflineOrder) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Status pesanan offline tidak dapat diubah. Pesanan ini sudah dibayar langsung di kasir.' 
        },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
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

    return NextResponse.json({ 
      success: true,
      data: order 
    });
  } catch (error: any) {
    console.error('Update order error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
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

