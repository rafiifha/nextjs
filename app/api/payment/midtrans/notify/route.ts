import { NextRequest, NextResponse } from 'next/server';
import { verifyNotification } from '@/services/midtransService';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const notification = await verifyNotification(body);

    const orderId = parseInt(notification.order_id.split('-')[1]);
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    if (transactionStatus === 'capture' && fraudStatus === 'accept') {
      // Payment successful
      const order = await prisma.order.update({
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

      await triggerOrderEvent('order-updated', order);
    } else if (transactionStatus === 'settlement') {
      // Payment settled
      const order = await prisma.order.update({
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

      await triggerOrderEvent('order-updated', order);
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
      // Payment failed
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
    }

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    console.error('Midtrans notify error:', error);
    return NextResponse.json(
      { error: 'Gagal memproses notifikasi' },
      { status: 500 }
    );
  }
}

