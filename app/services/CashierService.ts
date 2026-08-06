import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';
import { pakasirService } from '@/services/pakasirService';

/**
 * Service untuk menangani transaksi Kasir Offline (Point of Sale / POS).
 */
export class CashierService {
  /**
   * Mencatat transaksi pembelian offline secara langsung di toko fisik oleh Kasir.
   * Transaksi ini mendukung pembayaran 'tunai' (langsung lunas) dan 'non-tunai' (menggunakan QRIS/Digital Payment via Pakasir).
   */
  async createOfflineOrder(data: any) {
    const { customerName, customerPhone, paymentMethod, discount, cashReceived, items } = data;

    // 1. Validasi input data dasar
    if (!customerName || !customerPhone || !items || items.length === 0) {
      throw new Error('Data tidak lengkap');
    }

    // 2. Menormalisasi format data item belanjaan yang dimasukkan oleh kasir
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

    // 3. Mengambil data produk beserta varian harga dari database secara massal berdasarkan ID produk unik
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

    // 4. Validasi Stok Offline: memastikan stok di toko fisik mencukupi sebelum checkout
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

    // 5. Kalkulasi finansial (Subtotal, Diskon, Total Bayar, dan Uang Kembalian Tunai)
    const subtotal = normalizedItems.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0);
    const discountAmount = discount && !isNaN(parseFloat(discount)) ? Math.max(0, parseFloat(discount)) : 0;
    const totalHarga = Math.max(0, subtotal - discountAmount);

    const cashReceivedAmount = paymentMethod === 'tunai' && cashReceived && !isNaN(parseFloat(cashReceived))
      ? Math.max(0, parseFloat(cashReceived))
      : null;
    const changeAmount = cashReceivedAmount !== null
      ? Math.max(0, cashReceivedAmount - totalHarga)
      : null;

    // Menetapkan status awal pesanan: 'paid' jika tunai langsung lunas, 'pending' jika digital (menunggu payment gateway)
    const isTunai = paymentMethod === 'tunai';
    const orderStatus = isTunai ? 'paid' : 'pending';
    
    // 6. Membuat data record transaksi baru di Database menggunakan Prisma
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

    // 7. Mengurangi stok offline (stok toko fisik) secara real-time di database untuk barang yang dibeli
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

    // 8. Mengintegrasikan ke Payment Gateway (Pakasir) jika memilih pembayaran Non-Tunai / Digital
    if (!isTunai) {
      try {
        // Membuat transaksi pembayaran baru di server Pakasir
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
        expiredAt.setMinutes(expiredAt.getMinutes() + 15); // Masa aktif bayar qris/ewallet selama 15 menit

        // Memperbarui database order dengan nomor pembayaran (qris link/va) & fee tambahan dari Pakasir
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
        // ROLLBACK STOK: Jika integrasi Pakasir gagal, membatalkan pesanan dan mengembalikan stok offline toko
        for (const item of order.items) {
          if (!item.variantId) continue;
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: { stockOffline: { increment: item.quantity } },
          });
          console.log(`↩️ Kasir stok restored: variant ${item.variantId} dikembalikan ${item.quantity}`);
        }
        // Menghapus pesanan gagal dari DB agar data bersih
        await prisma.order.delete({ where: { id: order.id } });
        throw new Error(pakasirErr?.message || 'Gagal membuat transaksi Pakasir');
      }
    }

    // 9. Mengirimkan event real-time via Pusher agar monitor transaksi kasir langsung memperbarui data di client browser
    await triggerOrderEvent('order-created', updatedOrder);

    return updatedOrder;
  }
}
