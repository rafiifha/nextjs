import { prisma } from '@/lib/db';
import { triggerOrderEvent } from '@/services/pusherService';
import { 
  sendOrderNotificationEmail, 
  sendCourierDeliveryEmail, 
  sendCustomerShippingEmail, 
  sendReceiptEmail 
} from '@/services/emailService';
import { pakasirService } from '@/services/pakasirService';

/**
 * Service untuk memproses logika bisnis transaksi pesanan (Order).
 * Mengatur pengambilan riwayat order, proses checkout online (createOrder), perubahan status logistik (updateOrder),
 * penanganan pembatalan otomatis order expired (checkExpiredOrders), dan pengiriman notifikasi WhatsApp.
 */
export class OrderService {
  /**
   * Mengambil semua daftar pesanan milik customer tertentu.
   * Melakukan normalisasi data (formatting ISOString, default type, dll.) agar siap dikonsumsi di frontend.
   */
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
      orderBy: { createdAt: 'desc' }, // Menampilkan transaksi terbaru di atas
    });

    // Menormalisasi format data sebelum dikembalikan ke front-end
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

  /**
   * Mengambil riwayat pesanan customer secara berpaginasi.
   */
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
          proofOfDelivery: (order as any).proofOfDelivery ?? null,
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

  /**
   * Mengambil seluruh data pesanan untuk dashboard admin.
   * Mendukung filter pencarian nama/HP/ID pesanan, status pesanan, serta paginasi.
   */
  async getAllOrders(options?: { page?: number; limit?: number; search?: string; status?: string }) {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;
    const search = options?.search || '';
    const status = options?.status || '';

    const where: any = {};

    // Filter status jika spesifik
    if (status && status !== 'all') {
      where.status = status;
    }

    // Pencarian jika ada query (mencari nama pelanggan, nomor telepon, atau ID pesanan)
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
          courier: {
            select: { id: true, name: true, phone: true },
          },
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
          courier: order.courier ? {
            id: order.courier.id,
            name: order.courier.name,
            phone: order.courier.phone ?? null,
          } : null,
          shippedAt: order.shippedAt ? order.shippedAt.toISOString() : null,
          deliveredAt: order.deliveredAt ? order.deliveredAt.toISOString() : null,
          proofOfDelivery: (order as any).proofOfDelivery ?? null,
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

  /**
   * Mengambil detail satu data pesanan berdasarkan ID.
   */
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

  /**
   * Mencatat pesanan baru (Checkout Online) dari aplikasi web pelanggan.
   * Alur proses meliputi:
   * 1. Validasi input & metode pembayaran (pesanan antar wajib non-tunai)
   * 2. Pengecekan ketersediaan stok online produk
   * 3. Penyimpanan data transaksi ke database menggunakan Prisma
   * 4. Pemesanan/pengurangan stok online secara langsung (stock reservation)
   * 5. Pembuatan transaksi pembayaran digital di gateway Pakasir (QRIS/VA)
   * 6. Logika rollback stok jika integrasi ke payment gateway gagal
   * 7. Trigger notifikasi WebSocket Pusher dan notifikasi WhatsApp ke pembeli.
   */
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

    // 1. Validasi input
    if (!customerName || !customerPhone || !items || items.length === 0) {
      throw new Error('Data pelanggan dan items harus diisi');
    }

    // Aturan bisnis: Jika dikirim (delivery), maka pembayaran wajib non-tunai demi keamanan pengantaran kurir
    if (deliveryMethod === 'delivery' && paymentMethod === 'tunai') {
      throw new Error('Pesanan antar wajib menggunakan pembayaran non-tunai');
    }

    // 2. Mengambil data produk & varian harga untuk pengecekan stok
    const productIds = items.map((item: any) => parseInt(item.productId));
    const uniqueProductIds = Array.from(new Set(productIds)) as number[];
    
    const products = await prisma.product.findMany({
      where: { id: { in: uniqueProductIds } },
      include: { variants: true },
    });

    if (products.length !== uniqueProductIds.length) {
      throw new Error('Produk tidak ditemukan');
    }

    // 3. Validasi Stok Online: memastikan stok online mencukupi untuk setiap produk yang dipesan
    const stockErrors: string[] = [];
    for (const item of items) {
      const product = products.find(p => p.id === Number(item.productId));
      if (!product) {
        stockErrors.push(`Produk tidak ditemukan`);
        continue;
      }

      let variant;
      if (item.variantId) {
        variant = product.variants.find((v: any) => v.id === Number(item.variantId));
      } else if (item.priceType) {
        variant = product.variants.find((v: any) => v.priceType === item.priceType);
      }

      if (!variant) {
        stockErrors.push(`${product.name}: jenis/varian harga tidak ditemukan`);
        continue;
      }

      const availableStock = variant.stockOffline ?? variant.stockOnline ?? 0;
      if (availableStock < Number(item.quantity)) {
        stockErrors.push(`${product.name} (${variant.priceType}): stok tersedia ${availableStock}, diminta ${item.quantity}`);
      }
    }

    if (stockErrors.length > 0) {
      const error: any = new Error('Stok tidak mencukupi');
      error.details = stockErrors;
      throw error;
    }

    // 4. Menghitung total harga (harga item + ongkir)
    const totalHarga = items.reduce((sum: number, item: any) => sum + Number(item.price) * Number(item.quantity), 0) + (Number(shippingFee) || 0);

    // 5. Menetapkan batas waktu pembayaran (Expired Time)
    // Tunai diberikan waktu 1 jam (karena harus ke kasir/COD), non-tunai (digital) diberikan waktu 15 menit
    const expiredAt = new Date();
    if (paymentMethod === 'tunai') {
      expiredAt.setHours(expiredAt.getHours() + 1);
      
      // Waktu kadaluarsa tidak boleh melebihi batas operasional jam 18:00 hari ini
      const batasWaktu = new Date();
      batasWaktu.setHours(18, 0, 0, 0);
      
      if (expiredAt > batasWaktu) {
        throw new Error('Pemesanan dengan pembayaran tunai tidak dapat dilakukan karena batas waktu bayar melewati jam tutup toko (18:00)');
      }
    } else {
      expiredAt.setMinutes(expiredAt.getMinutes() + 15);
    }

    // 6. Mencatat pesanan baru ini ke Database menggunakan Prisma
    const order = await prisma.order.create({
      data: {
        customerName,
        customerPhone,
        userId: userId ? Number(userId) : null,
        totalHarga,
        deliveryMethod: deliveryMethod || null,
        shippingFee: shippingFee ? Number(shippingFee) : null,
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
            const product = products.find(p => p.id === Number(item.productId));
            const variant = item.variantId 
              ? product?.variants.find((v: any) => v.id === Number(item.variantId))
              : product?.variants.find((v: any) => v.priceType === item.priceType);

            if (!product || !variant) {
              throw new Error(`Produk atau varian tidak valid: ${item.productId}`);
            }

            return {
              productId: Number(item.productId),
              variantId: variant.id,
              priceType: variant.priceType,
              quantity: Number(item.quantity),
              price: Number(item.price),
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

    // 7. Mengurangi stok (Reserve Stock): langsung memotong stok di database agar barang tidak dibeli orang lain
    for (const item of order.items) {
      if (item.variantId) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: {
            stockOnline: { decrement: item.quantity },
            stockOffline: { decrement: item.quantity },
          },
        });
        console.log(`📦 Stok reserved: variant ${item.variantId} dikurangi ${item.quantity}`);
      }
    }

    // 8. Membuat transaksi pembayaran non-tunai di Pakasir
    if (paymentMethod && paymentMethod !== 'tunai') {
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
        
        // Simpan tautan bayar (payment number / e-wallet URL) & admin fee ke data order
        updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentNumber: payment_number,
            paymentFee: customerFee,
            expiredAt: expiredAt,
          },
          include: {
            items: {
              include: { product: true },
            },
          },
        });
      } catch (pakasirErr: any) {
        // ROLLBACK STOK: Jika integrasi Pakasir gagal, mengembalikan stok dan menghapus pesanan gagal tersebut
        console.error('Pakasir error during checkout:', pakasirErr);
        for (const item of order.items) {
          if (item.variantId) {
            await prisma.productVariant.update({
              where: { id: item.variantId },
              data: {
                stockOnline: { increment: item.quantity },
                stockOffline: { increment: item.quantity },
              },
            });
            console.log(`↩️ Stok restored: variant ${item.variantId} dikembalikan ${item.quantity}`);
          }
        }
        await prisma.order.delete({ where: { id: order.id } });
        throw new Error('Gagal membuat transaksi pembayaran');
      }
    }

    // 9. Mengirimkan event real-time ke web dashboard  via Pusher
    try {
      await triggerOrderEvent('order-created', updatedOrder);
    } catch (error) {
      console.error('Pusher error:', error);
    }

    // 10. Mengirimkan notifikasi pesanan baru secara asinkron via Gmail ke Pelanggan
    (async () => {
      try {
        let recipientEmail: string | null = null;
        if (userId) {
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user?.email) recipientEmail = user.email;
        }
        if (!recipientEmail) {
          const userByPhone = await prisma.user.findFirst({ where: { phone: customerPhone } });
          if (userByPhone?.email) recipientEmail = userByPhone.email;
        }
        if (!recipientEmail && customerPhone.includes('@')) {
          recipientEmail = customerPhone;
        }

        if (recipientEmail) {
          await sendOrderNotificationEmail(recipientEmail, {
            orderId: order.id,
            customerName,
            totalHarga,
            shippingFee: shippingFee || null,
            items: order.items.map(item => ({
              name: item.product.name,
              quantity: item.quantity,
              price: item.price * item.quantity,
            })),
          });
        }
      } catch (error) {
        console.error('Email order notification error:', error);
      }
    })();

    return updatedOrder;
  }

  /**
   * Memperbarui status pesanan (seperti pending -> processing -> shipped -> delivered, atau cancelled).
   * Menangani logika pengembalian stok jika pesanan dibatalkan, penugasan kurir secara dinamis,
   * pencatatan data logistik (shippedAt, deliveredAt), update real-time via Pusher, serta pengiriman notifikasi WhatsApp ke Kurir & Pelanggan.
   */
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

    // 1. ROLLBACK STOK jika pesanan dibatalkan (cancelled) saat masih berstatus pending
    if (status === 'cancelled' && existingOrder.status === 'pending') {
      for (const item of existingOrder.items) {
        if (item.variantId) {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: {
              stockOnline: { increment: item.quantity },
              stockOffline: { increment: item.quantity },
            },
          });
          console.log(`↩️ Cancel: stok variant ${item.variantId} dikembalikan ${item.quantity}`);
        }
      }

      // Memanggil API Pakasir untuk membatalkan transaksi digital secara resmi
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
    
    // Validasi aturan bisnis offline order
    if (status && isOfflineOrder && existingOrder.status === 'delivered' && status !== 'cancelled') {
      throw new Error('Pesanan offline yang sudah selesai tidak dapat diubah statusnya.');
    }

    // 2. Menyusun objek perubahan data (Prisma data update)
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

    // 3. Memproses logika jika status diubah menjadi 'shipped' (Sedang Dikirim oleh Kurir)
    if (status === 'shipped') {
      if (!courierId) {
        throw new Error('Kurir wajib dipilih sebelum kirim pesanan');
      }

      const courier = await prisma.user.findUnique({
        where: { id: Number(courierId) },
      });

      if (!courier || courier.role !== 'kurir' || !courier.isActive) {
        throw new Error('Kurir tidak valid atau tidak aktif');
      }

      updateData.courierId = Number(courierId);
      updateData.shippedAt = new Date(); // Catat waktu pengiriman
    }

    // 4. Memproses logika jika status diubah menjadi 'delivered' (Sampai ke Pelanggan / Selesai)
    if (status === 'delivered') {
      updateData.deliveredAt = new Date(); // Catat waktu pesanan sampai
    }

    // 5. Memperbarui data transaksi tersebut di database
    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        courier: {
          select: { id: true, name: true, email: true, phone: true, isActive: true },
        },
        items: {
          include: { product: true },
        },
      },
    });

    // 6. Mengirimkan event real-time ke web client via Pusher
    try {
      await triggerOrderEvent('order-updated', order);
    } catch (error) {
      console.error('Pusher error:', error);
    }

    // 7. Mengirimkan notifikasi pengiriman via Gmail secara asinkron setelah barang dikirim (shipped)
    if (status === 'shipped' && order.courier) {
      // 7a. Mengirimkan rincian tugas pengiriman ke Gmail Kurir
      if (order.courier.email) {
        sendCourierDeliveryEmail(order.courier.email, {
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          shippingAddress: order.shippingAddress || '-',
          shippingNotes: order.shippingNotes || '-',
          items: order.items.map((item) => ({
            name: item.product.name,
            quantity: item.quantity,
          })),
        }).catch((err) => {
          console.error('Courier email error:', err);
        });
      }

      // 7b. Mengirimkan info bahwa barang sedang jalan ke Gmail Pelanggan
      (async () => {
        try {
          const customerUser = order.userId 
            ? await prisma.user.findUnique({ where: { id: order.userId } })
            : await prisma.user.findFirst({ where: { phone: order.customerPhone } });
          const customerEmail = customerUser?.email || (order.customerPhone.includes('@') ? order.customerPhone : null);

          if (customerEmail) {
            await sendCustomerShippingEmail(customerEmail, {
              orderId: order.id,
              customerName: order.customerName,
              shippingAddress: order.shippingAddress || '-',
              courierName: order.courier!.name,
              courierPhone: order.courier!.phone || '-',
            });
          }
        } catch (err) {
          console.error('Customer shipping email error:', err);
        }
      })();
    }

    // 8. Mengirimkan bukti pembayaran/lunas via Gmail jika pesanan diset 'paid' (Validasi manual kasir/admin)
    if (status === 'paid' && existingOrder.status !== 'paid') {
      (async () => {
        try {
          const customerUser = order.userId 
            ? await prisma.user.findUnique({ where: { id: order.userId } })
            : await prisma.user.findFirst({ where: { phone: order.customerPhone } });
          const customerEmail = customerUser?.email || (order.customerPhone?.includes('@') ? order.customerPhone : null);

          if (customerEmail) {
            await sendReceiptEmail(customerEmail, {
              orderId: order.id,
              customerName: order.customerName,
              totalHarga: order.totalHarga,
              shippingFee: order.shippingFee,
              status: 'paid',
              items: order.items.map((item) => ({
                name: item.product.name,
                quantity: item.quantity,
                price: item.price * item.quantity,
              })),
              createdAt: order.createdAt.toISOString(),
            });
            console.log(`📧 Bukti pembayaran lunas via Gmail berhasil dikirim ke ${customerEmail} (Order #${order.id})`);
          }
        } catch (err) {
          console.error('❌ Gagal mengirim Gmail bukti pembayaran lunas:', err);
        }
      })();
    }

    return order;
  }

  /**
   * Fungsi otomatis (Scheduler / Cron Job) untuk membatalkan pesanan yang kadaluarsa (melewati batas waktu bayar).
   * Mengembalikan stok barang yang dipesan, memperbarui status di database menjadi 'expired',
   * membatalkan tagihan di Pakasir, serta mengirimkan event update secara real-time.
   */
  async checkExpiredOrders() {
    const now = new Date();
    
    // 1. Mencari semua order pending yang batas waktu bayar (expiredAt) kurang dari sama dengan waktu sekarang
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
      // 2. Mengembalikan stok barang (Rollback Stock):
      // Karena pesanan kadaluarsa/tidak dibayar, mengembalikan stok agar bisa dibeli orang lain lagi
      for (const item of order.items) {
        if (item.variantId) {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: {
              stockOnline: { increment: item.quantity },
              stockOffline: { increment: item.quantity },
            },
          });
          console.log(`↩️ Expired: stok variant ${item.variantId} dikembalikan ${item.quantity}`);
        }
      }

      // 3. Mengupdate status pesanan di database menjadi 'expired'
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'expired' },
      });

      // 4. Membatalkan transaksi/tagihan di server Pakasir secara asinkron
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
      
      // 5. Mengirimkan update status real-time via Pusher ke Admin
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

  /**
   * Mengambil daftar pesanan yang kadaluwarsa untuk tujuan testing.
   */
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

  /**
   * Mengirim e-receipt transaksi ke Gmail pelanggan.
   */
  async sendReceipt(orderId: number) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new Error('Pesanan tidak ditemukan');
    }

    const customerEmail = order.user?.email || (await prisma.user.findFirst({ where: { phone: order.customerPhone } }))?.email || (order.customerPhone.includes('@') ? order.customerPhone : null);

    if (customerEmail) {
      await sendReceiptEmail(customerEmail, {
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
    }

    return true;
  }

  /**
   * Mengambil informasi kepadatan toko berdasarkan jumlah pesanan yang sedang diproses (status 'paid' atau 'processing').
   * Aturan Indikator:
   * - 0 s.d 6 pesanan (< 7): Sepi
   * - 7 pesanan ke atas (>= 7): Ramai
   */
  async getStoreDensity() {
    const count = await prisma.order.count({
      where: {
        status: { in: ['paid', 'processing'] },
      },
    });

    const isRamai = count >= 7;
    const status: 'sepi' | 'ramai' = isRamai ? 'ramai' : 'sepi';
    const label = isRamai ? 'Ramai' : 'Sepi';

    return {
      count,
      status,
      label,
      threshold: 7,
      description: isRamai
        ? 'Toko sedang ramai pesanan. Pemrosesan dan pengiriman mungkin membutuhkan sedikit waktu tambahan.'
        : 'Antrean toko lancar. Pesanan Anda dapat segera diproses.',
    };
  }
}

