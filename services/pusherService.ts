import Pusher from 'pusher';
import { env } from '@/lib/env';

// Menginisialisasi instance Pusher Server SDK untuk pengiriman event WebSocket real-time
export const pusher = new Pusher({
  appId: env.PUSHER_APP_ID,
  key: env.PUSHER_KEY,
  secret: env.PUSHER_SECRET,
  cluster: env.PUSHER_CLUSTER,
  useTLS: true,
});

/**
 * Mengirimkan sinyal/event real-time ke web client (browser) menggunakan WebSocket Pusher.
 * Berguna untuk memperbarui daftar antrean pesanan di dashboard admin secara instan tanpa perlu memuat ulang halaman (reload).
 * @param event Jenis event ('order-created' untuk pesanan masuk, 'order-updated' untuk perubahan status/pembayaran).
 * @param data Objek berisi data pesanan terbaru untuk dikirim ke browser client.
 */
export async function triggerOrderEvent(event: 'order-created' | 'order-updated', data: any) {
  try {
    // Memicu trigger event ke channel bernama 'orders'
    await pusher.trigger('orders', event, data);
  } catch (error) {
    console.error('Pusher error:', error);
    throw error;
  }
}

