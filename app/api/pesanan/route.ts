import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';
import { sendOrderNotification } from '@/services/whatsappService';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
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
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data pesanan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, items, deliveryMethod, shippingFee } = body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Data pelanggan dan items harus diisi' },
        { status: 400 }
      );
    }

    // Calculate total
    const totalHarga = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) + (shippingFee || 0);

    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        totalHarga,
        deliveryMethod: deliveryMethod || null,
        shippingFee: shippingFee || null,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
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
      await triggerOrderEvent('order-created', order);
    } catch (error) {
      console.error('Pusher error:', error);
    }

    // Send WhatsApp notification
    try {
      await sendOrderNotification(customerPhone, {
        orderId: order.id,
        customerName,
        totalHarga,
        items: order.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price * item.quantity,
        })),
      });
    } catch (error) {
      console.error('WhatsApp error:', error);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat pesanan' },
      { status: 500 }
    );
  }
}

