import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';
import { pakasirService } from '@/services/pakasirService';

export class CashierService {
  async createOfflineOrder(data: any) {
    const { customerName, customerPhone, paymentMethod, discount, cashReceived, items } = data;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      throw new Error('Data tidak lengkap');
    }

    const normalizedItems = items.map((item: any) => ({
      productId: parseInt(item.productId),
      variantId: item.variantId ? parseInt(item.variantId) : null,
      priceType: item.priceType,
      quantity: parseInt(item.quantity),
      price: parseInt(item.price),
    }));

    for (const item of normalizedItems) {
      if (!item.productId || isNaN(item.productId)) throw new Error('ProductId tidak valid atau kosong');
      if (!item.priceType) throw new Error('PriceType tidak valid atau kosong');
      if (!item.quantity || item.quantity <= 0) throw new Error('Quantity harus lebih dari 0');
      if (!item.price || item.price <= 0) throw new Error('Price harus lebih dari 0');
    }

    const productIds = normalizedItems.map((item: any) => item.productId);
    const uniqueProductIds = [...new Set(productIds)] as number[];
    
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
      include: { variants: true },
    });

    if (products.length !== uniqueProductIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = uniqueProductIds.filter((id: number) => !foundIds.includes(id));
      throw new Error(`Produk dengan ID ${missingIds.join(', ')} tidak ditemukan`);
    }

    const stockErrors: string[] = [];
    for (const item of normalizedItems) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;

      const variant = item.variantId 
        ? product.variants.find(v => v.id === item.variantId)
        : product.variants.find(v => v.priceType === item.priceType);

      if (!variant) {
        stockErrors.push(`${product.name}: varian tidak ditemukan`);
        continue;
      }

      const availableStock = variant.stockOffline ?? 0;
      if (availableStock < item.quantity) {
        stockErrors.push(`${product.name} (${variant.priceType}): stok tersedia ${availableStock}, diminta ${item.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      const error: any = new Error('Stok tidak mencukupi');
      error.details = stockErrors;
      throw error;
    }

    const subtotal = normalizedItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const discountAmount = discount && !isNaN(parseFloat(discount)) ? Math.max(0, parseFloat(discount)) : 0;
    const totalHarga = Math.max(0, subtotal - discountAmount);

    const cashReceivedAmount = paymentMethod === 'tunai' && cashReceived && !isNaN(parseFloat(cashReceived))
      ? Math.max(0, parseFloat(cashReceived))
      : null;
    const changeAmount = cashReceivedAmount !== null
      ? Math.max(0, cashReceivedAmount - totalHarga)
      : null;

    const isTunai = paymentMethod === 'tunai';
    const orderStatus = isTunai ? 'paid' : 'pending';
    
    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        status: orderStatus,
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

    // Reserve stock immediately for ALL orders (tunai maupun digital)
    for (const item of order.items) {
      if (!item.variantId) continue;
      try {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stockOffline: { decrement: item.quantity } },
        });
        console.log(`📦 Kasir stok reserved: variant ${item.variantId} dikurangi ${item.quantity}`);
      } catch (error: any) {
        console.error(`Failed to reduce stock for variant ${item.variantId}:`, error);
      }
    }

    if (!isTunai) {
      try {
        const pakasirRes = await pakasirService.createTransaction(paymentMethod, {
          order_id: `INV-${order.id}`,
          amount: totalHarga,
        });

        if (!pakasirRes?.payment?.payment_number) {
          throw new Error('Pakasir tidak mengembalikan payment number');
        }

        const { payment_number, fee, total_payment, amount } = pakasirRes.payment;
        const customerFee = (total_payment !== undefined && amount !== undefined) ? (total_payment - amount) : fee;

        const expiredAt = new Date();
        expiredAt.setMinutes(expiredAt.getMinutes() + 15);

        updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentNumber: payment_number,
            paymentFee: customerFee,
            expiredAt: expiredAt,
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
        // Restore stock before deleting order
        for (const item of order.items) {
          if (!item.variantId) continue;
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stockOffline: { increment: item.quantity } },
          });
          console.log(`↩️ Kasir stok restored: variant ${item.variantId} dikembalikan ${item.quantity}`);
        }
        await prisma.order.delete({ where: { id: order.id } });
        throw new Error(pakasirErr?.message || 'Gagal membuat transaksi Pakasir');
      }
    }

    await triggerOrderEvent('order-created', updatedOrder);

    return updatedOrder;
  }
}
