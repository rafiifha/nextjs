import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { triggerOrderEvent } from '@/services/pusherService';
import { sendReceipt } from '@/services/whatsappService';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    console.log('📩 Webhook Pakasir diterima:', data);

    const { amount, order_id, project, status, payment_method } = data;

    // Verifikasi project
    if (project !== env.PAKASIR_PROJECT) {
      console.warn('Webhook ditolak: Project tidak cocok', { received: project, expected: env.PAKASIR_PROJECT });
      return NextResponse.json({ error: 'Project tidak valid' }, { status: 400 });
    }

    if (status !== 'completed') {
      console.log(`Status transaksi ${order_id} adalah ${status}, diabaikan.`);
      return NextResponse.json({ message: 'OK' }, { status: 200 });
    }

    // Ekstrak ID pesanan numerik. Format: "INV-{id}" atau "{id}"
    let numericId = 0;
    if (order_id.startsWith('INV-')) {
      numericId = parseInt(order_id.substring(4), 10);
    } else {
      numericId = parseInt(order_id, 10);
    }

    if (isNaN(numericId)) {
      console.error('Format order_id tidak valid:', order_id);
      return NextResponse.json({ error: 'Format order_id tidak valid' }, { status: 400 });
    }

    // Cari pesanan beserta items dan produk
    const order = await prisma.order.findUnique({
      where: { id: numericId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      console.error('Pesanan tidak ditemukan:', numericId);
      return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    }

    // Cegah update ganda jika webhook dikirim lebih dari sekali
    if (order.status === 'paid') {
      console.log(`Pesanan ${numericId} sudah berstatus paid, skip update.`);
      return NextResponse.json({ success: true, message: 'Pesanan sudah dibayar' }, { status: 200 });
    }

    // Log verifikasi amount
    console.log(`Verifikasi amount: webhook=${amount}, db=${order.totalHarga + (order.shippingFee || 0)}`);

    // Update status pesanan menjadi paid
    const updatedOrder = await prisma.order.update({
      where: { id: numericId },
      data: {
        status: 'paid',
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log(`✅ Pesanan ${numericId} berhasil diupdate menjadi paid via Pakasir.`);

    // Kurangi stok online untuk setiap item
    for (const item of updatedOrder.items) {
      if (item.variantId) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
        console.log(`📦 Stok online variant ${item.variantId} dikurangi ${item.quantity}`);
      }
    }

    // Trigger Pusher event agar admin dashboard real-time update
    try {
      await triggerOrderEvent('order-updated', updatedOrder);
    } catch (pusherErr) {
      console.error('Pusher error:', pusherErr);
    }

    // Kirim invoice/receipt via WhatsApp (Fonnte)
    try {
      await sendReceipt(order.customerPhone, {
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
      });
      console.log(`📱 Invoice WhatsApp berhasil dikirim ke ${order.customerPhone}`);
    } catch (waErr) {
      // Jangan gagalkan webhook hanya karena WhatsApp error
      console.error('❌ Gagal kirim WhatsApp invoice:', waErr);
    }

    return NextResponse.json({ success: true, message: 'Pesanan berhasil diupdate dan invoice dikirim' }, { status: 200 });

  } catch (error) {
    console.error('Error memproses webhook Pakasir:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}
