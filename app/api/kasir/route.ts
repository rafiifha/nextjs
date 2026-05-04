import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';
import { pakasirService } from '@/services/pakasirService';

// API khusus untuk transaksi kasir (offline)
// Menggunakan stock dan langsung mengurangi stok
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, customerPhone, paymentMethod, discount, cashReceived, items } = body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      );
    }

    // Validate and normalize items
    const normalizedItems = items.map((item: any) => ({
      productId: parseInt(item.productId),
      variantId: item.variantId ? parseInt(item.variantId) : null,
      priceType: item.priceType,
      quantity: parseInt(item.quantity),
      price: parseInt(item.price),
    }));

    // Validate all required fields
    for (const item of normalizedItems) {
      if (!item.productId || isNaN(item.productId)) {
        return NextResponse.json(
          { error: 'ProductId tidak valid atau kosong' },
          { status: 400 }
        );
      }
      if (!item.priceType) {
        return NextResponse.json(
          { error: 'PriceType tidak valid atau kosong' },
          { status: 400 }
        );
      }
      if (!item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: 'Quantity harus lebih dari 0' },
          { status: 400 }
        );
      }
      if (!item.price || item.price <= 0) {
        return NextResponse.json(
          { error: 'Price harus lebih dari 0' },
          { status: 400 }
        );
      }
    }

    // Validate products exist and check stock per variant
    const productIds = normalizedItems.map((item: any) => item.productId);
    const uniqueProductIds = [...new Set(productIds)] as number[];
    
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
      include: {
        variants: true,
      },
    });

    if (products.length !== uniqueProductIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = uniqueProductIds.filter((id: number) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Produk dengan ID ${missingIds.join(', ')} tidak ditemukan` },
        { status: 404 }
      );
    }

    // Validate stock availability per variant
    const stockErrors: string[] = [];
    for (const item of normalizedItems) {
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
        const variantInfo = item.variantId 
          ? `ID ${item.variantId}` 
          : `priceType "${item.priceType}"`;
        stockErrors.push(`${product.name}: varian dengan ${variantInfo} tidak ditemukan`);
        continue;
      }

      const availableStock = variant.stock ?? 0;
      if (availableStock < item.quantity) {
        stockErrors.push(`${product.name} (${variant.priceType}): stok tersedia ${availableStock}, diminta ${item.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { error: 'Stok tidak mencukupi', details: stockErrors },
        { status: 400 }
      );
    }

    // Calculate subtotal
    const subtotal = normalizedItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    
    // Calculate discount
    const discountAmount = discount && !isNaN(parseFloat(discount)) ? Math.max(0, parseFloat(discount)) : 0;
    
    // Calculate total after discount
    const totalHarga = Math.max(0, subtotal - discountAmount);

    // Calculate change for cash payment
    const cashReceivedAmount = paymentMethod === 'tunai' && cashReceived && !isNaN(parseFloat(cashReceived))
      ? Math.max(0, parseFloat(cashReceived))
      : null;
    const changeAmount = cashReceivedAmount !== null
      ? Math.max(0, cashReceivedAmount - totalHarga)
      : null;

    const isTunai = paymentMethod === 'tunai';
    // Any method selain tunai harus pending sampai callback Pakasir
    const orderStatus = isTunai ? 'paid' : 'pending';
    
    // Create order
    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        status: orderStatus, // 'paid' for tunai, 'pending' for non-tunai
        totalHarga,
        discount: discountAmount > 0 ? discountAmount : 0,
        cashReceived: cashReceivedAmount,
        change: changeAmount,
        deliveryMethod: 'pickup',
        shippingFee: 0,
        paymentMethod: paymentMethod || 'tunai',
        items: {
          create: normalizedItems.map((item: any) => {
            const product = products.find(p => p.id === item.productId);
            const variant = item.variantId 
              ? product?.variants.find(v => v.id === item.variantId)
              : product?.variants.find(v => v.priceType === item.priceType);

            if (!product) {
              throw new Error(`Product dengan ID ${item.productId} tidak ditemukan saat membuat order`);
            }

            if (!variant) {
              throw new Error(`Variant untuk product ${product.name} dengan ${item.variantId ? `ID ${item.variantId}` : `priceType ${item.priceType}`} tidak ditemukan`);
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

    let updatedOrder = order;

    // Create transaksi Pakasir untuk non-tunai
    if (!isTunai) {
      try {
        const pakasirRes = await pakasirService.createTransaction(paymentMethod, {
          order_id: `INV-${order.id}`,
          amount: totalHarga,
        });

        if (!pakasirRes?.payment?.payment_number) {
          throw new Error('Pakasir tidak mengembalikan payment number');
        }

        updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentNumber: pakasirRes.payment.payment_number,
            paymentFee: pakasirRes.payment.fee,
            expiredAt: pakasirRes.payment.expired_at ? new Date(pakasirRes.payment.expired_at) : null,
          },
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
      } catch (pakasirErr: any) {
        console.error('❌ Error calling Pakasir (kasir):', pakasirErr);
        // Hapus order agar tidak ada order pending tanpa instruksi bayar
        await prisma.order.delete({ where: { id: order.id } });
        return NextResponse.json(
          { error: pakasirErr?.message || 'Gagal membuat transaksi Pakasir' },
          { status: 502 }
        );
      }
    }

    // Reduce stock for each variant (only for tunai payment)
    // For non-tunai, stock will be reduced after payment confirmation via Pakasir callback
    if (isTunai) {
      for (const item of updatedOrder.items) {
        if (!item.variantId) {
          console.error(`❌ VariantId is null for order item ${item.id}, product ${item.productId}, priceType ${item.priceType}`);
          continue;
        }

        try {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
          console.log(`✅ Reduced stock for variant ${item.variantId} (${item.priceType}) by ${item.quantity}`);
        } catch (error: any) {
          console.error(`❌ Failed to reduce stock for variant ${item.variantId}:`, error);
          // Continue with other items even if one fails
        }
      }
    } else {
      console.log(`⏳ Stock will be reduced after payment confirmation for order ${updatedOrder.id}`);
    }

    // Trigger Pusher event
    await triggerOrderEvent('order-created', updatedOrder);

    return NextResponse.json(updatedOrder, { status: 201 });
  } catch (error: any) {
    console.error('❌ Create kasir order error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat pesanan kasir', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}


