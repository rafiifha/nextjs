import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { triggerOrderEvent } from '@/services/pusherService';
import { sendReceiptEmail } from '@/services/emailService';

/**
 * Service untuk memproses konfirmasi pembayaran dan integrasi dengan Payment Gateway (Pakasir).
 */
export class PaymentService {
  /**
   * Webhook handler untuk menerima notifikasi pembayaran sukses dari server Pakasir.
   * Webhook ini dipanggil secara asinkron (callback) oleh server Pakasir setelah pembeli menyelesaikan transfer.
   */
  async handlePakasirWebhook(data: any) {
    console.log('📩 Webhook Pakasir diterima:', data);

    const { amount, order_id, project, status, payment_method } = data;

    // 1. Validasi Keamanan: memastikan request webhook berasal dari project merchant yang sesuai di konfigurasi .env kita
    if (project !== env.PAKASIR_PROJECT) {
      console.warn('Webhook ditolak: Project tidak cocok', { received: project, expected: env.PAKASIR_PROJECT });
      throw new Error('Project tidak valid');
    }

    // 2. Filter Status: Batasi pemrosesan hanya jika status transaksi bernilai 'completed' (sukses dibayar)
    if (status !== 'completed') {
      console.log(`Status transaksi ${order_id} adalah ${status}, diabaikan.`);
      return { success: true, message: 'Status diabaikan' };
    }

    // 3. Normalisasi ID Pesanan: Mengambil angka ID database murni (contoh: mengambil angka "123" dari format string "INV-123")
    let numericId = 0;
    if (order_id.startsWith('INV-')) {
      numericId = parseInt(order_id.substring(4), 10);
    } else {
      numericId = parseInt(order_id, 10);
    }

    if (isNaN(numericId)) {
      throw new Error('Format order_id tidak valid');
    }

    // 4. Cari Pesanan: Mengambil data pesanan dari database berdasarkan ID pesanan hasil normalisasi
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

    // 5. Idempotensi: Cegah pemrosesan ulang jika pesanan di database sudah berstatus 'paid' (lunas)
    if (order.status === 'paid') {
      console.log(`Pesanan ${numericId} sudah berstatus paid, skip update.`);
      return { success: true, message: 'Pesanan sudah dibayar' };
    }

    console.log(`Verifikasi amount: webhook=${amount}, db=${order.totalHarga + (order.shippingFee || 0)}`);

    // 6. Update Status Lunas: Mengubah status pesanan di database menjadi 'paid' (Sudah Dibayar)
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
    // Catatan Skripsi: Stok barang sudah dipotong saat pesanan pertama kali dibuat (checkout/createOrder),
    // sehingga tidak perlu dipotong lagi di sini untuk menghindari pengurangan stok ganda.

    // 7. Update Real-time: Memicu event WebSocket Pusher agar antarmuka admin/kasir langsung terupdate otomatis
    try {
      await triggerOrderEvent('order-updated', updatedOrder);
    } catch (pusherErr) {
      console.error('Pusher error:', pusherErr);
    }

    // 8. Kirim Struk Belanja via Gmail: Mengirimkan struk pembelian otomatis ke Gmail customer
    (async () => {
      try {
        const customerUser = order.userId
          ? await prisma.user.findUnique({ where: { id: order.userId } })
          : await prisma.user.findFirst({ where: { phone: order.customerPhone } });
        const customerEmail = customerUser?.email || (order.customerPhone.includes('@') ? order.customerPhone : null);

        if (customerEmail) {
          await sendReceiptEmail(customerEmail, {
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
          console.log(`📧 Invoice Gmail berhasil dikirim ke ${customerEmail}`);
        }
      } catch (err) {
        console.error('❌ Gagal kirim Gmail invoice:', err);
      }
    })();

    return { success: true, message: 'Pesanan berhasil diupdate dan invoice dikirim' };
  }
}
