import { NextRequest, NextResponse } from 'next/server';
import { verifyNotification } from '@/services/midtransService';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';

// Helper function to update order to paid and reduce stock
async function updateOrderToPaid(orderId: number) {
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
    throw new Error(`Order ${orderId} not found`);
  }

  // Check if order is already paid
  if (order.status === 'paid') {
    console.log(`Order ${orderId} is already paid, skipping stock update`);
    return order;
  }

  // Check if order is expired
  if (order.expiredAt && new Date() > order.expiredAt) {
    console.log(`Order ${orderId} is expired, cannot be paid`);
    throw new Error('Order is expired');
  }

  // Validate stock_online availability before reducing
  const stockErrors: string[] = [];
  for (const item of order.items) {
    if (item.product.stock_online < item.quantity) {
      stockErrors.push(`${item.product.name}: stok online tersedia ${item.product.stock_online}, diminta ${item.quantity}`);
    }
  }

  if (stockErrors.length > 0) {
    console.error(`❌ Insufficient stock_online for order ${orderId}:`, stockErrors);
    throw new Error(`Stok online tidak mencukupi: ${stockErrors.join(', ')}`);
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
  await triggerOrderEvent('order-updated', updatedOrder);
  
  return updatedOrder;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📥 Midtrans notification received:', JSON.stringify(body, null, 2));
    
    const notification = await verifyNotification(body);
    console.log('✅ Notification verified:', JSON.stringify(notification, null, 2));

    // Parse order ID from format: ORDER-{id}-{timestamp}
    const orderIdParts = notification.order_id.split('-');
    const orderId = parseInt(orderIdParts[1]);
    
    if (isNaN(orderId)) {
      console.error('❌ Invalid order ID:', notification.order_id);
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    console.log(`🔄 Processing order ${orderId}: status=${transactionStatus}, fraud=${fraudStatus}`);

    if (transactionStatus === 'capture' && fraudStatus === 'accept') {
      // Payment successful
      console.log(`✅ Payment captured for order ${orderId}`);
      await updateOrderToPaid(orderId);
    } else if (transactionStatus === 'settlement') {
      // Payment settled
      console.log(`✅ Payment settled for order ${orderId}`);
      await updateOrderToPaid(orderId);
    } else if (transactionStatus === 'pending') {
      // Payment pending
      console.log(`⏳ Payment pending for order ${orderId}`);
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'pending' },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      await triggerOrderEvent('order-updated', order);
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      // Payment failed - don't reduce stock (order was never paid)
      console.log(`❌ Payment failed for order ${orderId}: ${transactionStatus}`);
      const order = await prisma.order.update({
        where: { id: orderId },
        data: { status: 'cancelled' },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      await triggerOrderEvent('order-updated', order);
    } else {
      console.log(`⚠️ Unknown transaction status for order ${orderId}: ${transactionStatus}`);
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error: any) {
    console.error('❌ Midtrans notify error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Gagal memproses notifikasi', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

