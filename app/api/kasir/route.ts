import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';

// API khusus untuk transaksi kasir (offline)
// Menggunakan stock_offline dan langsung mengurangi stok
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, items } = body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      );
    }

    // Validate products exist and check stock_offline
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter((id: number) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Produk dengan ID ${missingIds.join(', ')} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Validate stock_offline availability
    const stockErrors: string[] = [];
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.stock_offline < item.quantity) {
        stockErrors.push(`${product.name}: stok offline tersedia ${product.stock_offline}, diminta ${item.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { error: 'Stok offline tidak mencukupi', details: stockErrors },
        { status: 400 }
      );
    }

    // Calculate total
    const totalHarga = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);

    // Create order with status 'paid' (kasir langsung bayar)
    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        status: 'paid', // Kasir langsung dibayar
        totalHarga,
        deliveryMethod: 'pickup',
        shippingFee: 0,
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

    // Reduce stock_offline for each item (transaksi kasir)
    for (const item of order.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock_offline: {
            decrement: item.quantity,
          },
        },
      });
      console.log(`✅ Reduced stock_offline for product ${item.productId} by ${item.quantity}`);
    }

    // Trigger Pusher event
    await triggerOrderEvent('order-created', order);

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error('❌ Create kasir order error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat pesanan kasir', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

