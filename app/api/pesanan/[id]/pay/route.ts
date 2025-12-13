import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';

// Endpoint to manually mark order as paid and reduce stock
// Used as fallback when Midtrans callback is not received
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = parseInt(params.id);
    
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID' },
        { status: 400 }
      );
    }

    // Get order with items
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

    // Check if order is already paid
    if (order.status === 'paid') {
      return NextResponse.json({
        message: 'Order already paid',
        order,
      });
    }

    // Check if order is expired
    if (order.expiredAt && new Date() > order.expiredAt) {
      return NextResponse.json(
        { error: 'Pesanan sudah kedaluwarsa' },
        { status: 400 }
      );
    }

    // Check if order is cancelled
    if (order.status === 'cancelled' || order.status === 'expired') {
      return NextResponse.json(
        { error: 'Pesanan sudah dibatalkan' },
        { status: 400 }
      );
    }

    // Validate stock_online availability before reducing
    const stockErrors: string[] = [];
    for (const item of order.items) {
      if (item.product.stock_online < item.quantity) {
        stockErrors.push(`${item.product.name}: stok online tersedia ${item.product.stock_online}, diminta ${item.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { error: 'Stok online tidak mencukupi', details: stockErrors },
        { status: 400 }
      );
    }

    // Reduce stock_online for each item (transaksi online)
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock_online: {
            decrement: item.quantity,
          },
        },
      });
      console.log(`✅ Reduced stock_online for product ${item.productId} by ${item.quantity}`);
    }

    // Update order status to paid
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'paid' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log(`✅ Order ${orderId} updated to paid status and stock reduced`);
    
    // Trigger Pusher event
    try {
      await triggerOrderEvent('order-updated', updatedOrder);
    } catch (error) {
      console.error('Pusher error:', error);
    }

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('❌ Pay order error:', error);
    return NextResponse.json(
      { error: 'Gagal memproses pembayaran', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

