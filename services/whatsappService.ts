import axios from 'axios';
import { env } from '@/lib/env';

const fonnteApi = axios.create({
  baseURL: env.FONNTE_API_URL,
  headers: {
    'Authorization': env.FONNTE_API_KEY,
    'Content-Type': 'application/json',
  },
});

export async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    const response = await fonnteApi.post('/send', {
      target: phone,
      message: message,
    });
    return response.data;
  } catch (error) {
    console.error('Fonnte WhatsApp error:', error);
    throw error;
  }
}

export async function sendOrderNotification(phone: string, orderData: {
  orderId: number;
  customerName: string;
  totalHarga: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  const itemsText = orderData.items
    .map(item => `- ${item.name} (${item.quantity}x) = Rp ${item.price.toLocaleString('id-ID')}`)
    .join('\n');

  const message = `📦 *Pesanan Baru - Toko Naning*

ID Pesanan: #${orderData.orderId}
Nama: ${orderData.customerName}
Total: Rp ${orderData.totalHarga.toLocaleString('id-ID')}

*Detail Pesanan:*
${itemsText}

Terima kasih atas pesanan Anda!`;

  return sendWhatsAppMessage(phone, message);
}

export async function sendReceipt(phone: string, orderData: {
  orderId: number;
  customerName: string;
  totalHarga: number;
  status: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  createdAt: string;
}) {
  const itemsText = orderData.items
    .map(item => `- ${item.name} (${item.quantity}x) = Rp ${item.price.toLocaleString('id-ID')}`)
    .join('\n');

  const statusText = {
    pending: '⏳ Menunggu Pembayaran',
    paid: '✅ Sudah Dibayar',
    processing: '🔄 Sedang Diproses',
    delivered: '🚚 Sudah Dikirim',
  }[orderData.status] || orderData.status;

  const message = `🧾 *E-Receipt - Toko Naning*

ID Pesanan: #${orderData.orderId}
Nama: ${orderData.customerName}
Status: ${statusText}
Tanggal: ${new Date(orderData.createdAt).toLocaleString('id-ID')}

*Detail Pesanan:*
${itemsText}

*Total: Rp ${orderData.totalHarga.toLocaleString('id-ID')}*

Terima kasih telah berbelanja di Toko Naning! 🛒`;

  return sendWhatsAppMessage(phone, message);
}

