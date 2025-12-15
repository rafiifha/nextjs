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
    const { customerName, customerPhone, items, deliveryMethod, shippingFee, trackingId, waybillId, biteshipOrderId } = body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Data pelanggan dan items harus diisi' },
        { status: 400 }
      );
    }

    // Validate products exist and check stock
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        variants: true,
      },
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter((id: number) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Produk dengan ID ${missingIds.join(', ')} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Validate stock_online availability per variant (stok tidak dikurangi, hanya divalidasi)
    const stockErrors: string[] = [];
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        stockErrors.push(`Produk dengan ID ${item.productId} tidak ditemukan`);
        continue;
      }

      // Find variant by variantId or priceType
      const variant = item.variantId 
        ? product.variants.find(v => v.id === item.variantId)
        : product.variants.find(v => v.priceType === item.priceType);

      if (!variant) {
        stockErrors.push(`${product.name}: varian harga "${item.priceType}" tidak ditemukan`);
        continue;
      }

      const availableStock = variant.stock_online ?? 0;
      if (availableStock < item.quantity) {
        stockErrors.push(`${product.name} (${variant.priceType}): stok online tersedia ${availableStock}, diminta ${item.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { error: 'Stok tidak mencukupi', details: stockErrors },
        { status: 400 }
      );
    }

    // Calculate total
    const totalHarga = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) + (shippingFee || 0);

    // Set expiredAt to 24 hours from now
    const expiredAt = new Date();
    expiredAt.setHours(expiredAt.getHours() + 24);

    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        totalHarga,
        deliveryMethod: deliveryMethod || null,
        shippingFee: shippingFee || null,
        trackingId: trackingId || null,
        waybillId: waybillId || null,
        biteshipOrderId: biteshipOrderId || null,
        expiredAt: expiredAt, // 24 jam dari sekarang
        items: {
          create: items.map((item: any) => {
            const product = products.find(p => p.id === item.productId);
            const variant = item.variantId 
              ? product?.variants.find(v => v.id === item.variantId)
              : product?.variants.find(v => v.priceType === item.priceType);

            return {
              productId: item.productId,
              variantId: variant?.id || null,
              priceType: item.priceType || variant?.priceType || '',
              quantity: item.quantity,
              price: item.price,
            };
          }),
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
  } catch (error: any) {
    console.error('❌ Create order error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    
    // Provide more specific error messages
    let errorMessage = 'Gagal membuat pesanan';
    if (error.code === 'P2002') {
      errorMessage = 'Data sudah ada di database';
    } else if (error.code === 'P2003') {
      errorMessage = 'Produk tidak ditemukan';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

