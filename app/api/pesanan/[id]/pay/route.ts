import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';

// Endpoint to manually mark order as paid and reduce stock
// Used as fallback when Midtrans callback is not received
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    
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

    // Validate stock_online availability per variant before reducing
    const stockErrors: string[] = [];
    for (const item of order.items) {
      let variant = item.variant;
      
      // If variant is null, find by priceType
      if (!variant) {
        variant = item.product.variants.find(v => v.priceType === item.priceType);
        if (!variant) {
          stockErrors.push(`${item.product.name}: varian "${item.priceType}" tidak ditemukan`);
          continue;
        }
      }

      if (variant.stock_online < item.quantity) {
        stockErrors.push(`${item.product.name} (${variant.priceType}): stok online tersedia ${variant.stock_online}, diminta ${item.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { error: 'Stok online tidak mencukupi', details: stockErrors },
        { status: 400 }
      );
    }

    // Reduce stock_online for each variant (transaksi online)
    for (const item of order.items) {
      let variantId = item.variantId;
      
      if (!variantId) {
        const variant = item.product.variants.find(v => v.priceType === item.priceType);
        if (!variant) {
          console.error(`❌ Variant not found for product ${item.productId} with priceType ${item.priceType}`);
          continue;
        }
        variantId = variant.id;
      }

      await prisma.productVariant.update({
        where: { id: variantId },
        data: {
          stock_online: {
            decrement: item.quantity,
          },
        },
      });
      console.log(`✅ Reduced stock_online for variant ${variantId} by ${item.quantity}`);
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

