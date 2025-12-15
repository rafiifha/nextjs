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
          product: {
            include: {
              variants: true,
            },
          },
          variant: true,
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

  // Determine if this is a kasir order (pickup with no shipping fee) or online order
  const isKasirOrder = order.deliveryMethod === 'pickup' && (!order.shippingFee || order.shippingFee === 0);
  const stockField = isKasirOrder ? 'stock_offline' : 'stock_online';
  const stockType = isKasirOrder ? 'offline' : 'online';

  // Validate stock availability per variant before reducing
  const stockErrors: string[] = [];
  for (const item of order.items) {
    if (!item.variant) {
      // Try to find variant by priceType if variantId is null
      const variant = item.product.variants.find(v => v.priceType === item.priceType);
      if (!variant) {
        stockErrors.push(`${item.product.name}: varian "${item.priceType}" tidak ditemukan`);
        continue;
      }
      
      const availableStock = isKasirOrder ? (variant.stock_offline ?? 0) : (variant.stock_online ?? 0);
      if (availableStock < item.quantity) {
        stockErrors.push(`${item.product.name} (${variant.priceType}): stok ${stockType} tersedia ${availableStock}, diminta ${item.quantity}`);
      }
    } else {
      const availableStock = isKasirOrder ? (item.variant.stock_offline ?? 0) : (item.variant.stock_online ?? 0);
      if (availableStock < item.quantity) {
        stockErrors.push(`${item.product.name} (${item.variant.priceType}): stok ${stockType} tersedia ${availableStock}, diminta ${item.quantity}`);
      }
    }
  }

  if (stockErrors.length > 0) {
    console.error(`❌ Insufficient stock_${stockType} for order ${orderId}:`, stockErrors);
    throw new Error(`Stok ${stockType} tidak mencukupi: ${stockErrors.join(', ')}`);
  }

  // Reduce stock for each variant
  for (const item of order.items) {
    let variantId = item.variantId;
    
    // If variantId is null, find variant by priceType
    if (!variantId) {
      const variant = item.product.variants.find(v => v.priceType === item.priceType);
      if (!variant) {
        console.error(`❌ Variant not found for product ${item.productId} with priceType ${item.priceType}`);
        continue;
      }
      variantId = variant.id;
    }

    const updateData: any = {};
    if (isKasirOrder) {
      updateData.stock_offline = { decrement: item.quantity };
    } else {
      updateData.stock_online = { decrement: item.quantity };
    }

    await prisma.productVariant.update({
      where: { id: variantId },
      data: updateData,
    });
    console.log(`✅ Reduced stock_${stockType} for variant ${variantId} (${item.priceType}) by ${item.quantity}`);
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
              product: {
                include: {
                  category: true,
                  variants: true,
                },
              },
              variant: true,
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

