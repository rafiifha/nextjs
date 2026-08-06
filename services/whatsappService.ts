import axios from 'axios';
import { env } from '@/lib/env';

// Menginisialisasi instance Axios custom khusus untuk integrasi dengan API Fonnte (WhatsApp Gateway)
const fonnteApi = axios.create({
  baseURL: env.FONNTE_API_URL,
  timeout: 15000,
  headers: {
    // Mengambil token otentikasi Fonnte dari konfigurasi environment (.env)
    'Authorization': (env.FONNTE_API_KEY || '').trim(),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Menormalisasi nomor telepon agar sesuai dengan format standar internasional (ID: 62).
 * Berguna agar API Fonnte tidak mengalami error akibat format nomor telepon yang tidak standar (seperti memakai spasi, '+' atau tanda baca).
 */
function normalizeWhatsAppNumber(rawPhone: string) {
  const trimmed = (rawPhone || '').trim();
  if (!trimmed) {
    throw new Error('Nomor WhatsApp kosong');
  }

  // Menghapus semua karakter non-digit (seperti spasi, +, -, tanda kurung) menggunakan regex
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    throw new Error(`Format nomor WhatsApp tidak valid: ${rawPhone}`);
  }

  // Menormalisasi awalan nomor telepon Indonesia:
  // Jika diawali '0' -> diubah ke '628...', jika diawali langsung '8' -> diubah ke '628...', selain itu jika tidak diawali '62' -> ditambahkan '62'
  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  } else if (digits.startsWith('8')) {
    digits = `62${digits}`;
  } else if (!digits.startsWith('62')) {
    digits = `62${digits}`;
  }

  // Memastikan panjang nomor minimal 10 digit agar valid sebagai nomor seluler
  if (digits.length < 10) {
    throw new Error(`Nomor WhatsApp terlalu pendek: ${rawPhone}`);
  }

  return digits;
}

/**
 * Mengirimkan pesan WhatsApp ke nomor target tertentu via gateway API Fonnte (fungsi utama).
 */
export async function sendWhatsAppMessage(phone: string, message: string) {
  try {
    // 1. Menormalisasi nomor tujuan terlebih dahulu ke format 62
    const normalizedPhone = normalizeWhatsAppNumber(phone);
    
    // 2. Mengirimkan HTTP POST request ke endpoint /send milik API Fonnte
    const response = await fonnteApi.post('/send', {
      target: normalizedPhone,
      message: message,
    });

    const data = response.data;
    
    // 3. Memeriksa properti status dari respon Fonnte.
    // Jika API request sukses secara HTTP namun status bernilai false, lemparkan error.
    if (data?.status === false) {
      throw new Error(data?.reason || data?.message || 'Fonnte menolak permintaan');
    }

    return data;
  } catch (error) {
    // Mencatat log detail kesalahan ke console jika terjadi error koneksi atau kegagalan dari Fonnte
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

/**
 * Mengirimkan Notifikasi Pesanan Baru (Checkout Online) kepada Pelanggan/Admin.
 */
export async function sendOrderNotification(phone: string, orderData: {
  orderId: number;
  customerName: string;
  totalHarga: number;
  shippingFee?: number | null;
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  // Memformat daftar produk pesanan menjadi baris list terpisah
  const itemsText = orderData.items
    .map(item => `- ${item.name} (${item.quantity}x) = Rp ${item.price.toLocaleString('id-ID')}`)
    .join('\n');

  const subtotal = orderData.items.reduce((sum, item) => sum + item.price, 0);
  const ongkirLine = orderData.shippingFee
    ? `\nOngkir: Rp ${orderData.shippingFee.toLocaleString('id-ID')}`
    : '';

  // Menyusun teks pesan WhatsApp dengan format Markdown tebal (*)
  const message = `📦 *Pesanan Baru - Toko Naning*

ID Pesanan: #${orderData.orderId}
Nama: ${orderData.customerName}

*Detail Pesanan:*
${itemsText}
${orderData.shippingFee ? `\nSubtotal: Rp ${subtotal.toLocaleString('id-ID')}${ongkirLine}` : ''}
*Total: Rp ${orderData.totalHarga.toLocaleString('id-ID')}*

Terima kasih atas pesanan Anda!`;

  // Mengeksekusi pengiriman pesan WhatsApp
  return sendWhatsAppMessage(phone, message);
}

/**
 * Mengirimkan Struk / Bukti Transaksi setelah pembayaran terkonfirmasi (Paid).
 */
export async function sendReceipt(phone: string, orderData: {
  orderId: number;
  customerName: string;
  totalHarga: number;
  shippingFee?: number | null;
  status: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  createdAt: string;
}) {
  // Memformat daftar produk pesanan menjadi baris list
  const itemsText = orderData.items
    .map(item => `- ${item.name} (${item.quantity}x) = Rp ${item.price.toLocaleString('id-ID')}`)
    .join('\n');

  const statusText = {
    pending: '⏳ Menunggu Pembayaran',
    paid: '✅ Sudah Dibayar',
    processing: '🔄 Sedang Diproses',
    delivered: '🚚 Sudah Dikirim',
  }[orderData.status] || orderData.status;

  const subtotal = orderData.items.reduce((sum, item) => sum + item.price, 0);
  const ongkirLine = orderData.shippingFee
    ? `\nOngkir: Rp ${orderData.shippingFee.toLocaleString('id-ID')}`
    : '';

  // Menyusun template pesan bukti transaksi
  const message = `🧾 *Bukti Transaksi - Toko Naning*

ID Pesanan: #${orderData.orderId}
Nama: ${orderData.customerName}
Status: ${statusText}
Tanggal: ${new Date(orderData.createdAt).toLocaleString('id-ID')}

*Detail Pesanan:*
${itemsText}
${orderData.shippingFee ? `\nSubtotal: Rp ${subtotal.toLocaleString('id-ID')}${ongkirLine}` : ''}
*Total: Rp ${orderData.totalHarga.toLocaleString('id-ID')}*

Terima kasih telah berbelanja di Toko Naning! 🛒`;

  // Mengeksekusi pengiriman pesan WhatsApp bukti transaksi
  return sendWhatsAppMessage(phone, message);
}

/**
 * Mengirimkan notifikasi penugasan pengiriman baru kepada Kurir.
 */
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

  // Menyusun template notifikasi kurir
  const message = `🚚 *Tugas Pengiriman Baru - Toko Naning*

Pelanggan: ${orderData.customerName} (${orderData.customerPhone})
Alamat: ${orderData.shippingAddress}

📦 Produk:
${itemsText}

📝 Catatan: ${orderData.shippingNotes || '-'}`;

  // Mengeksekusi pengiriman pesan WhatsApp ke Kurir
  return sendWhatsAppMessage(phone, message);
}

/**
 * Memberi tahu Pelanggan bahwa pesanan mereka sedang dalam proses pengiriman oleh kurir.
 */
export async function sendCustomerShippingNotification(phone: string, orderData: {
  orderId: number;
  customerName: string;
  shippingAddress: string;
  courierName: string;
  courierPhone: string;
}) {
  // Menyusun template pesan pengiriman pelanggan
  const message = `🚚 *Pesanan Sedang Dikirim - Toko Naning*

Halo ${orderData.customerName},
Pesanan Anda sedang dikirim.

No. Pesanan: #${orderData.orderId}
Alamat Tujuan: ${orderData.shippingAddress}
Kurir: ${orderData.courierName} (${orderData.courierPhone})

Terima kasih sudah berbelanja di Toko Naning 🙏`;

  // Mengeksekusi pengiriman pesan WhatsApp ke pelanggan
  return sendWhatsAppMessage(phone, message);
}

