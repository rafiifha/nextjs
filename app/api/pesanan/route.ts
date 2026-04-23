import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';
import { sendOrderNotification } from '@/services/whatsappService';
import { pakasirService } from '@/services/pakasirService';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            variant: true, // variant bisa null untuk pesanan lama
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Normalize data to ensure all fields are properly formatted
    const normalizedOrders = orders.map(order => {
      try {
        return {
          id: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          status: order.status,
          totalHarga: order.totalHarga,
          discount: order.discount ?? null,
          cashReceived: order.cashReceived ?? null,
          change: order.change ?? null,
          deliveryMethod: order.deliveryMethod ?? null,
          shippingFee: order.shippingFee ?? null,
          shippingAddress: order.shippingAddress ?? null,
          shippingLat: order.shippingLat ?? null,
          shippingLng: order.shippingLng ?? null,
          shippingDistance: order.shippingDistance ?? null,
          shippingZone: order.shippingZone ?? null,
          shippingNotes: order.shippingNotes ?? null,
          courierId: order.courierId ?? null,
          shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
          deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
          paymentMethod: order.paymentMethod ?? null,
          paymentNumber: order.paymentNumber ?? null,
          paymentFee: order.paymentFee ?? null,
          expiredAt: order.expiredAt ? order.expiredAt.toISOString() : null,
          createdAt: order.createdAt.toISOString(),
          updatedAt: order.updatedAt.toISOString(),
          items: order.items.map(item => ({
            id: item.id,
            orderId: item.orderId,
            productId: item.productId,
            variantId: item.variantId ?? null,
            priceType: item.priceType ?? 'dus',
            quantity: item.quantity,
            price: item.price,
            product: {
              id: item.product.id,
              name: item.product.name,
              categoryId: item.product.categoryId,
              category: item.product.category ? {
                id: item.product.category.id,
                name: item.product.category.name,
              } : null,
            },
            variant: item.variant ? {
              id: item.variant.id,
              productId: item.variant.productId,
              priceType: item.variant.priceType,
              price: item.variant.price,
              stock_online: item.variant.stock_online,
              stock_offline: item.variant.stock_offline,
            } : null,
          })),
        };
      } catch (itemError) {
        console.error('Error normalizing order:', order.id, itemError);
        return null;
      }
    }).filter(order => order !== null);
    
    return NextResponse.json(normalizedOrders);
  } catch (error: any) {
    console.error('Get orders error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        error: 'Gagal mengambil data pesanan',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      items,
      deliveryMethod,
      shippingFee,
      paymentMethod,
      shippingAddress,
      shippingLat,
      shippingLng,
      shippingDistance,
      shippingZone,
      shippingNotes,
    } = body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Data pelanggan dan items harus diisi' },
        { status: 400 }
      );
    }

    if (deliveryMethod === 'delivery' && paymentMethod === 'tunai') {
      return NextResponse.json(
        { error: 'Pesanan antar wajib menggunakan pembayaran non-tunai' },
        { status: 400 }
      );
    }

    // Validate products exist and check stock
    const productIds = items.map((item: any) => parseInt(item.productId));
    const uniqueProductIds = Array.from(new Set(productIds)) as number[];
    
    console.log('🔍 Looking for products with IDs:', uniqueProductIds);
    
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
      include: {
        variants: true,
      },
    });

    console.log('✅ Found products:', products.map(p => ({ id: p.id, name: p.name, variantsCount: p.variants.length })));

    if (products.length !== uniqueProductIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = uniqueProductIds.filter((id: number) => !foundIds.includes(id));
      console.error('❌ Missing products:', missingIds);
      return NextResponse.json(
        { 
          error: `Produk dengan ID ${missingIds.join(', ')} tidak ditemukan`,
          details: `Ditemukan ${products.length} dari ${uniqueProductIds.length} produk yang diminta`
        },
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
      let variant;
      if (item.variantId) {
        variant = product.variants.find((v: any) => v.id === parseInt(item.variantId));
        if (!variant) {
          console.error(`❌ Variant dengan ID ${item.variantId} tidak ditemukan untuk produk ${product.name}`);
          stockErrors.push(`${product.name}: varian dengan ID ${item.variantId} tidak ditemukan`);
          continue;
        }
      } else if (item.priceType) {
        variant = product.variants.find((v: any) => v.priceType === item.priceType);
        if (!variant) {
          console.error(`❌ Variant dengan priceType "${item.priceType}" tidak ditemukan untuk produk ${product.name}`);
          stockErrors.push(`${product.name}: varian harga "${item.priceType}" tidak ditemukan. Varian yang tersedia: ${product.variants.map((v: any) => v.priceType).join(', ')}`);
          continue;
        }
      } else {
        console.error(`❌ Item tidak memiliki variantId atau priceType untuk produk ${product.name}`);
        stockErrors.push(`${product.name}: jenis harga tidak ditentukan`);
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
        shippingAddress: shippingAddress || null,
        shippingLat: typeof shippingLat === 'number' ? shippingLat : null,
        shippingLng: typeof shippingLng === 'number' ? shippingLng : null,
        shippingDistance: typeof shippingDistance === 'number' ? shippingDistance : null,
        shippingZone: typeof shippingZone === 'number' ? shippingZone : null,
        shippingNotes: shippingNotes || null,
        paymentMethod: paymentMethod || 'tunai',
        expiredAt: expiredAt, // 24 jam dari sekarang
        items: {
          create: items.map((item: any) => {
            const product = products.find(p => p.id === item.productId);
            const variant = item.variantId 
              ? product?.variants.find((v: any) => v.id === item.variantId)
              : product?.variants.find((v: any) => v.priceType === item.priceType);

            if (!product) {
              throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan saat membuat order`);
            }

            if (!variant) {
              throw new Error(`Variant untuk produk ${product.name} dengan ${item.variantId ? `ID ${item.variantId}` : `priceType ${item.priceType || 'tidak ditentukan'}`} tidak ditemukan`);
            }

            return {
              productId: item.productId,
              variantId: variant.id,
              priceType: variant.priceType,
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

    let updatedOrder = order;

    // Call Pakasir if paymentMethod is not 'tunai'
    if (paymentMethod && paymentMethod !== 'tunai') {
      try {
        const pakasirRes = await pakasirService.createTransaction(paymentMethod, {
          order_id: `INV-${order.id}`,
          amount: totalHarga,
        });

        if (!pakasirRes?.payment?.payment_number) {
          throw new Error('Pakasir tidak mengembalikan payment number');
        }

        const { payment_number, fee, expired_at } = pakasirRes.payment;
        
        updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentNumber: payment_number,
            paymentFee: fee,
            expiredAt: expired_at ? new Date(expired_at) : expiredAt,
          },
          include: {
            items: {
              include: { product: true },
            },
          },
        });
      } catch (pakasirErr) {
        console.error('❌ Error calling Pakasir:', pakasirErr);
        // Jangan simpan order tanpa instruksi bayar
        await prisma.order.delete({ where: { id: order.id } });
        return NextResponse.json(
          {
            error: 'Gagal membuat transaksi pembayaran',
            details: pakasirErr instanceof Error ? pakasirErr.message : 'Pakasir error',
          },
          { status: 502 }
        );
      }
    }

    // Trigger Pusher event
    try {
      await triggerOrderEvent('order-created', updatedOrder);
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

    return NextResponse.json(updatedOrder, { status: 201 });
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

