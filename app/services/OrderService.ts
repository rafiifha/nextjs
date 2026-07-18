import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';
import { sendOrderNotification, sendCourierDeliveryNotification, sendCustomerShippingNotification } from '@/services/whatsappService';
import { pakasirService } from '@/services/pakasirService';

export class OrderService {
  async getOrdersByCustomer(userId: number) {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            variant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map(order => {
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
              stockOnline: item.variant.stockOnline,
              stockOffline: item.variant.stockOffline,
            } : null,
          })),
        };
      } catch (itemError) {
        console.error('Error normalizing order:', order.id, itemError);
        return null;
      }
    }).filter(order => order !== null);
  }

  async getOrdersByCustomerPaginated(userId: number, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
              variant: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    const data = orders.map(order => {
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
              stockOnline: item.variant.stockOnline,
              stockOffline: item.variant.stockOffline,
            } : null,
          })),
        };
      } catch (itemError) {
        console.error('Error normalizing order:', order.id, itemError);
        return null;
      }
    }).filter(order => order !== null);

    return { data, total };
  }

  async getAllOrders(options?: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;
    const search = options?.search || '';
    const status = options?.status || '';

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
        ...(isNaN(Number(search)) ? [] : [{ id: Number(search) }]),
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
              variant: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);
    
    const data = orders.map(order => {
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
              stockOnline: item.variant.stockOnline,
              stockOffline: item.variant.stockOffline,
            } : null,
          })),
        };
      } catch (itemError) {
        console.error('Error normalizing order:', order.id, itemError);
        return null;
      }
    }).filter(order => order !== null);

    return { orders: data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOrderById(id: number) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Pesanan tidak ditemukan');
    }

    return order;
  }

  async createOrder(data: any) {
    const {
      customerName,
      customerPhone,
      userId,
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
    } = data;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      throw new Error('Data pelanggan dan items harus diisi');
    }

    if (deliveryMethod === 'delivery' && paymentMethod === 'tunai') {
      throw new Error('Pesanan antar wajib menggunakan pembayaran non-tunai');
    }

    const productIds = items.map((item: any) => parseInt(item.productId));
    const uniqueProductIds = Array.from(new Set(productIds)) as number[];
    
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
      include: { variants: true },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new Error('Produk tidak ditemukan');
    }

    const stockErrors: string[] = [];
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;

      let variant;
      if (item.variantId) {
        variant = product.variants.find((v: any) => v.id === parseInt(item.variantId));
      } else if (item.priceType) {
        variant = product.variants.find((v: any) => v.priceType === item.priceType);
      }

      if (!variant) {
        stockErrors.push(`${product.name}: jenis/varian harga tidak ditemukan`);
        continue;
      }

      const availableStock = variant.stockOnline ?? 0;
      if (availableStock < item.quantity) {
        stockErrors.push(`${product.name} (${variant.priceType}): stok tersedia ${availableStock}, diminta ${item.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      const error: any = new Error('Stok tidak mencukupi');
      error.details = stockErrors;
      throw error;
    }

    const totalHarga = items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) + (shippingFee || 0);

    const expiredAt = new Date();
    if (paymentMethod === 'tunai') {
      expiredAt.setHours(expiredAt.getHours() + 1); // 1 jam timeout untuk bayar tunai
    } else {
      expiredAt.setMinutes(expiredAt.getMinutes() + 15); // 15 menit timeout untuk digital
    }

    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        userId: userId || null,
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
        expiredAt,
        items: {
          create: items.map((item: any) => {
            const product = products.find(p => p.id === item.productId);
            const variant = item.variantId 
              ? product?.variants.find((v: any) => v.id === item.variantId)
              : product?.variants.find((v: any) => v.priceType === item.priceType);

            return {
              productId: item.productId,
              variantId: variant!.id,
              priceType: variant!.priceType,
              quantity: item.quantity,
              price: item.price,
            };
          }),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    let updatedOrder = order;

    // Reserve stock immediately on order creation
    for (const item of order.items) {
      if (item.variantId) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stockOnline: { decrement: item.quantity } },
        });
        console.log(`📦 Stok reserved: variant ${item.variantId} dikurangi ${item.quantity}`);
      }
    }

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
            expiredAt: expiredAt,
          },
          include: {
            items: { include: { product: true } },
          },
        });
      } catch (pakasirErr: any) {
        console.error('Pakasir error during checkout:', pakasirErr);
        // Restore stock before deleting order
        for (const item of order.items) {
          if (item.variantId) {
            await prisma.productVariant.update({
              where: { id: item.variantId },
              data: { stockOnline: { increment: item.quantity } },
            });
            console.log(`↩️ Stok restored: variant ${item.variantId} dikembalikan ${item.quantity}`);
          }
        }
        await prisma.order.delete({ where: { id: order.id } });
        throw new Error('Gagal membuat transaksi pembayaran');
      }
    }

    try {
      await triggerOrderEvent('order-created', updatedOrder);
    } catch (error) {
      console.error('Pusher error:', error);
    }

    // Kirim WhatsApp secara async agar tidak menghambat response API
    sendOrderNotification(customerPhone, {
      orderId: order.id,
      customerName,
      totalHarga,
      shippingFee: shippingFee || null,
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price * item.quantity,
      })),
    }).catch((error) => {
      console.error('WhatsApp error:', error);
    });

    return updatedOrder;
  }

  async updateOrder(id: number, data: any) {
    const {
      status,
      customerName,
      customerPhone,
      deliveryMethod,
      shippingFee,
      paymentMethod,
      paymentNumber,
      paymentFee,
      courierId,
    } = data;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingOrder) {
      throw new Error('Pesanan tidak ditemukan');
    }

    // Restore reserved stock when cancelling a pending order
    if (status === 'cancelled' && existingOrder.status === 'pending') {
      for (const item of existingOrder.items) {
        if (item.variantId) {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stockOnline: { increment: item.quantity } },
          });
          console.log(`↩️ Cancel: stok variant ${item.variantId} dikembalikan ${item.quantity}`);
        }
      }

      // Cancel Pakasir transaction on manual cancel
      if (existingOrder.paymentMethod && existingOrder.paymentMethod !== 'tunai') {
        try {
          await pakasirService.cancelTransaction({
            order_id: `INV-${existingOrder.id}`,
            amount: existingOrder.totalHarga,
          });
          console.log(`❌ Pakasir transaction INV-${existingOrder.id} cancelled manually.`);
        } catch (err: any) {
          console.error(`Failed to cancel Pakasir transaction INV-${existingOrder.id} on manual cancel:`, err.message);
        }
      }
    }

    const isOfflineOrder = existingOrder.deliveryMethod === 'pickup' && (!existingOrder.shippingFee || existingOrder.shippingFee === 0);
    
    if (status && isOfflineOrder && existingOrder.status === 'delivered' && status !== 'cancelled') {
      throw new Error('Pesanan offline yang sudah selesai tidak dapat diubah statusnya.');
    }

    const updateData: Record<string, any> = {
      ...(status && { status }),
      ...(customerName && { customerName }),
      ...(customerPhone && { customerPhone }),
      ...(deliveryMethod !== undefined && { deliveryMethod }),
      ...(shippingFee !== undefined && { shippingFee }),
      ...(paymentMethod !== undefined && { paymentMethod }),
      ...(paymentNumber !== undefined && { paymentNumber }),
      ...(paymentFee !== undefined && { paymentFee }),
    };

    if (status === 'shipped') {
      if (!courierId) {
        throw new Error('Kurir wajib dipilih sebelum kirim pesanan');
      }

      const courier = await prisma.courier.findUnique({
        where: { id: Number(courierId) },
      });

      if (!courier || !courier.isActive) {
        throw new Error('Kurir tidak valid atau tidak aktif');
      }

      updateData.courierId = Number(courierId);
      updateData.shippedAt = new Date();
    }

    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        courier: true,
        items: {
          include: { product: true },
        },
      },
    });

    try {
      await triggerOrderEvent('order-updated', order);
    } catch (error) {
      console.error('Pusher error:', error);
    }

    if (status === 'shipped' && order.courier) {
      // Kirim WhatsApp secara async
      sendCourierDeliveryNotification(order.courier.phone, {
        orderId: order.id,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress || '-',
        shippingNotes: order.shippingNotes || '-',
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
        })),
      }).catch((waError) => {
        console.error('Courier WhatsApp error:', waError);
      });

      sendCustomerShippingNotification(order.customerPhone, {
        orderId: order.id,
        customerName: order.customerName,
        shippingAddress: order.shippingAddress || '-',
        courierName: order.courier.name,
        courierPhone: order.courier.phone,
      }).catch((waError) => {
        console.error('Customer WhatsApp shipped error:', waError);
      });
    }

    return order;
  }

  async checkExpiredOrders() {
    const now = new Date();
    
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'pending',
        expiredAt: { lte: now },
      },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    for (const order of expiredOrders) {
      // Restore reserved stock before marking as expired
      for (const item of order.items) {
        if (item.variantId) {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stockOnline: { increment: item.quantity } },
          });
          console.log(`↩️ Expired: stok variant ${item.variantId} dikembalikan ${item.quantity}`);
        }
      }

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'expired' },
      });

      // Cancel Pakasir transaction on expiry
      if (order.paymentMethod && order.paymentMethod !== 'tunai') {
        try {
          await pakasirService.cancelTransaction({
            order_id: `INV-${order.id}`,
            amount: order.totalHarga,
          });
          console.log(`❌ Pakasir transaction INV-${order.id} cancelled due to expiry.`);
        } catch (err: any) {
          console.error(`Failed to cancel Pakasir transaction INV-${order.id} on expiry:`, err.message);
        }
      }
      
      try {
        await triggerOrderEvent('order-updated', {
          ...order,
          status: 'expired',
        });
      } catch (error) {
        console.error('Pusher error:', error);
      }
    }

    return expiredOrders;
  }

  async getExpiredOrdersForTest() {
    const now = new Date();
    
    return await prisma.order.findMany({
      where: {
        status: 'pending',
        expiredAt: { lte: now },
      },
      select: {
        id: true,
        customerName: true,
        totalHarga: true,
        expiredAt: true,
        createdAt: true,
      },
    });
  }

  async sendReceipt(orderId: number) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new Error('Pesanan tidak ditemukan');
    }

    // Dynamic import to avoid circular dependencies if any, but since we already import it above, we can just use another service function if we imported it.
    // Let's import sendReceipt from whatsappService at the top of the file, or assume it's available.
    const { sendReceipt: sendWaReceipt } = await import('@/services/whatsappService');
    
    await sendWaReceipt(order.customerPhone, {
      orderId: order.id,
      customerName: order.customerName,
      totalHarga: order.totalHarga,
      shippingFee: order.shippingFee,
      status: order.status,
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price * item.quantity,
      })),
      createdAt: order.createdAt.toISOString(),
    });

    return true;
  }
}
