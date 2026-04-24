import axios from 'axios';
import { env } from '@/lib/env';

const fonnteApi = axios.create({
  baseURL: env.FONNTE_API_URL,
  timeout: 15000,
  headers: {
    'Authorization': (env.FONNTE_API_KEY || '').trim(),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

function normalizeWhatsAppNumber(rawPhone: string) {
  const trimmed = (rawPhone || '').trim();
  if (!trimmed) {
    throw new Error('Nomor WhatsApp kosong');
  }

  // Keep digits only (drop spaces, +, -, parentheses)
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    throw new Error(`Format nomor WhatsApp tidak valid: ${rawPhone}`);
  }

  // Indonesia normalization: 08xx -> 628xx, 8xx -> 628xx, 62xx -> 62xx
  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith('8')) {
    digits = `62${digits}`;
  } else if (!digits.startsWith('62')) {
    digits = `62${digits}`;
  }

  if (digits.length < 10) {
    throw new Error(`Nomor WhatsApp terlalu pendek: ${rawPhone}`);
  }

  return digits;
}

export async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    const normalizedPhone = normalizeWhatsAppNumber(phone);
    const response = await fonnteApi.post('/send', {
      target: normalizedPhone,
      message: message,
    });

    const data = response.data;
    // Fonnte biasanya return { status: true/false, ... }
    if (data?.status === false) {
      throw new Error(data?.reason || data?.message || 'Fonnte menolak permintaan');
    }

    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Fonnte WhatsApp error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      console.error('Fonnte WhatsApp error:', error);
    }
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

  const message = `🧾 *Bukti Transaksi - Toko Naning*

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

export async function sendCourierDeliveryNotification(phone: string, orderData: {
  orderId: number;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingNotes?: string;
  items: Array<{ name: string; quantity: number }>;
}) {
  const itemsText = orderData.items
    .map((item) => `- ${item.name} (${item.quantity}x)`)
    .join('\n');

  const message = `🚚 *Tugas Pengiriman Baru - Toko Naning*

Pelanggan: ${orderData.customerName} (${orderData.customerPhone})
Alamat: ${orderData.shippingAddress}

📦 Barang:
${itemsText}

📝 Catatan: ${orderData.shippingNotes || '-'}`;

  return sendWhatsAppMessage(phone, message);
}

export async function sendCustomerShippingNotification(phone: string, orderData: {
  orderId: number;
  customerName: string;
  shippingAddress: string;
  courierName: string;
  courierPhone: string;
}) {
  const message = `🚚 *Pesanan Sedang Dikirim - Toko Naning*

Halo ${orderData.customerName},
Pesanan Anda sedang dikirim.

No. Pesanan: #${orderData.orderId}
Alamat Tujuan: ${orderData.shippingAddress}
Kurir: ${orderData.courierName} (${orderData.courierPhone})

Terima kasih sudah berbelanja di Toko Naning 🙏`;

  return sendWhatsAppMessage(phone, message);
}

