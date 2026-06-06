import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { triggerOrderEvent } from '@/services/pusherService';
import { sendReceipt } from '@/services/whatsappService';

export class PaymentService {
  async handlePakasirWebhook(data: any) {
    console.log('📩 Webhook Pakasir diterima:', data);

    const { amount, order_id, project, status, payment_method } = data;

    if (project !== env.PAKASIR_PROJECT) {
      console.warn('Webhook ditolak: Project tidak cocok', { received: project, expected: env.PAKASIR_PROJECT });
      throw new Error('Project tidak valid');
    }

    if (status !== 'completed') {
      console.log(`Status transaksi ${order_id} adalah ${status}, diabaikan.`);
      return { success: true, message: 'Status diabaikan' };
    }

    let numericId = 0;
    if (order_id.startsWith('INV-')) {
      numericId = parseInt(order_id.substring(4), 10);
    } else {
      numericId = parseInt(order_id, 10);
    }

    if (isNaN(numericId)) {
      throw new Error('Format order_id tidak valid');
    }

    const order = await prisma.order.findUnique({
      where: { id: numericId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new Error('Pesanan tidak ditemukan');
    }

    if (order.status === 'paid') {
      console.log(`Pesanan ${numericId} sudah berstatus paid, skip update.`);
      return { success: true, message: 'Pesanan sudah dibayar' };
    }

    console.log(`Verifikasi amount: webhook=${amount}, db=${order.totalHarga + (order.shippingFee || 0)}`);

    const updatedOrder = await prisma.order.update({
      where: { id: numericId },
      data: { status: 'paid' },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    console.log(`✅ Pesanan ${numericId} berhasil diupdate menjadi paid via Pakasir.`);

    for (const item of updatedOrder.items) {
      if (item.variantId) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: { decrement: item.quantity },
          },
        });
        console.log(`📦 Stok online variant ${item.variantId} dikurangi ${item.quantity}`);
      }
    }

    try {
      await triggerOrderEvent('order-updated', updatedOrder);
    } catch (pusherErr) {
      console.error('Pusher error:', pusherErr);
    }

    // Kirim WhatsApp secara async agar tidak menghambat response webhook
    sendReceipt(order.customerPhone, {
      orderId: order.id,
      customerName: order.customerName,
      totalHarga: order.totalHarga,
      shippingFee: order.shippingFee,
      status: 'paid',
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.price * item.quantity,
      })),
      createdAt: order.createdAt.toISOString(),
    })
      .then(() => console.log(`📱 Invoice WhatsApp berhasil dikirim ke ${order.customerPhone}`))
      .catch((waErr) => console.error('❌ Gagal kirim WhatsApp invoice:', waErr));

    return { success: true, message: 'Pesanan berhasil diupdate dan invoice dikirim' };
  }
}
