import nodemailer from 'nodemailer';
import { env } from '@/lib/env';

/**
 * Inisialisasi Transporter Nodemailer untuk Gmail SMTP.
 * Menggunakan kredensial dari environment variable (GMAIL_USER & GMAIL_APP_PASSWORD).
 */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Interface parameter pengiriman email umum
 */
export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Fungsi inti pengiriman email via Gmail.
 * Jika kredensial belum diset (misal di localhost sebelum user isi App Password),
 * sistem akan mencatat log ke konsol agar proses aplikasi tetap berjalan mulus.
 */
export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!to) {
    console.warn('⚠️ sendEmail dilewati: Alamat email tujuan kosong.');
    return { success: false, reason: 'Email tujuan kosong' };
  }

  // Jika GMAIL belum dikonfigurasi, beri log simulasi
  if (!env.GMAIL_USER || !env.GMAIL_APP_PASSWORD || env.GMAIL_APP_PASSWORD === 'your-google-app-password') {
    console.warn('⚠️ [GMAIL NOT CONFIGURED] Email tidak terkirim secara riil karena GMAIL_USER / GMAIL_APP_PASSWORD belum diisi di .env.');
    console.log(`📧 [Simulasi Email Terkirim]\n  Kepada: ${to}\n  Subjek: ${subject}\n  Pesan Teks:\n${text || '(HTML Content)'}`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Toko Imas" <${env.GMAIL_USER}>`,
      to,
      subject,
      text: text || '',
      html,
    });

    console.log(`✅ Email berhasil dikirim ke ${to} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Gagal mengirim email via Gmail:', error);
    throw error;
  }
}

// ================= TEMPLATE NOTIFIKASI GMAIL =================

/**
 * 1. Mengirimkan kode OTP (Registrasi / Reset Password) via Gmail.
 */
export async function sendOtpEmail(email: string, code: string, type: 'register' | 'forgot_password') {
  const typeLabel = type === 'register' ? 'Registrasi Akun' : 'Reset Kata Sandi';
  const subject = `🔐 Kode OTP ${typeLabel} - Toko Imas`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: #ffd700; background: linear-gradient(135deg, #ffd700 0%, #e6c200 100%); padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #0f172a; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
        .content { padding: 32px 24px; text-align: center; }
        .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #0f172a; }
        .desc { font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.5; }
        .otp-box { background: #fffdf0; border: 2px dashed #d4a800; border-radius: 12px; padding: 18px 24px; display: inline-block; margin-bottom: 24px; }
        .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #855d00; font-family: monospace; }
        .warning { font-size: 12px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 16px; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🛒 TOKO IMAS</h1>
        </div>
        <div class="content">
          <div class="title">Verifikasi ${typeLabel}</div>
          <p class="desc">Gunakan kode OTP berikut untuk melanjutkan proses ${typeLabel.toLowerCase()} Anda:</p>
          <div class="otp-box">
            <div class="otp-code">${code}</div>
          </div>
          <p class="warning">
            ⏱️ Kode berlaku selama <strong>5 menit</strong>.<br>
            Jangan berikan kode ini kepada siapa pun demi keamanan akun Anda.
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Toko Imas • Toko Sembako Terpercaya
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `🔐 Kode OTP ${typeLabel} - Toko Imas\n\nKode verifikasi Anda: ${code}\n\nKode berlaku 5 menit. Jangan bagikan kode ini kepada siapapun.`;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * 2. Mengirimkan Notifikasi Pesanan Baru (Checkout) via Gmail.
 */
export async function sendOrderNotificationEmail(email: string, orderData: {
  orderId: number;
  customerName: string;
  totalHarga: number;
  shippingFee?: number | null;
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  const subject = `📦 Pesanan Baru #${orderData.orderId} - Toko Imas`;

  const itemsHtml = orderData.items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155;">
        ${item.name} <span style="color:#64748b;">(x${item.quantity})</span>
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; text-align: right; color: #0f172a;">
        Rp ${item.price.toLocaleString('id-ID')}
      </td>
    </tr>
  `).join('');

  const subtotal = orderData.items.reduce((sum, item) => sum + item.price, 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #ffd700 0%, #e6c200 100%); padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #0f172a; font-size: 20px; font-weight: 800; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #fef3c7; color: #92400e; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .total-row { border-top: 2px solid #e2e8f0; padding-top: 12px; font-size: 15px; font-weight: 800; color: #0f172a; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🛒 TOKO IMAS</h1>
        </div>
        <div class="content">
          <span class="badge">Pesanan Diterima</span>
          <h2 style="margin: 0 0 8px 0; font-size: 18px; color: #0f172a;">Halo, ${orderData.customerName}!</h2>
          <p style="font-size: 13px; color: #64748b; margin: 0 0 16px 0;">Terima kasih atas pesanan Anda. Berikut rincian pesanan <strong>#${orderData.orderId}</strong>:</p>

          <table>
            <thead>
              <tr style="border-bottom: 1px solid #cbd5e1; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">
                <th style="padding-bottom: 6px;">Produk</th>
                <th style="padding-bottom: 6px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">Subtotal: </span>
              <span style="font-weight: 600;">Rp ${subtotal.toLocaleString('id-ID')}</span>
            </div>
            ${orderData.shippingFee ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">Ongkir: </span>
              <span style="font-weight: 600;">Rp ${orderData.shippingFee.toLocaleString('id-ID')}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 15px; font-weight: 800; color: #0f172a;">
              <span>Total Pembayaran: </span>
              <span style="color: #b45309;">Rp ${orderData.totalHarga.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Toko Imas • Terima kasih telah berbelanja!
        </div>
      </div>
    </body>
    </html>
  `;

  const itemsText = orderData.items.map(item => `- ${item.name} (${item.quantity}x) = Rp ${item.price.toLocaleString('id-ID')}`).join('\n');
  const text = `📦 Pesanan Baru #${orderData.orderId} - Toko Imas\n\nNama: ${orderData.customerName}\n\nDetail:\n${itemsText}\nTotal: Rp ${orderData.totalHarga.toLocaleString('id-ID')}\n\nTerima kasih atas pesanan Anda!`;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * 3. Mengirimkan Struk / Bukti Transaksi Lunas via Gmail.
 */
export async function sendReceiptEmail(email: string, orderData: {
  orderId: number;
  customerName: string;
  totalHarga: number;
  shippingFee?: number | null;
  status: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  createdAt: string;
}) {
  const subject = `🧾 Bukti Transaksi #${orderData.orderId} - Toko Imas`;

  const itemsHtml = orderData.items.map(item => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155;">
        ${item.name} <span style="color:#64748b;">(x${item.quantity})</span>
      </td>
      <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; text-align: right; color: #0f172a;">
        Rp ${item.price.toLocaleString('id-ID')}
      </td>
    </tr>
  `).join('');

  const subtotal = orderData.items.reduce((sum, item) => sum + item.price, 0);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; }
        .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; }
        .content { padding: 24px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: #d1fae5; color: #065f46; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h1>🧾 TOKO IMAS</h1>
          <p style="color: #ecfdf5; margin: 4px 0 0 0; font-size: 12px;">STRUK TRANSAKSI RESMI</p>
        </div>
        <div class="content">
          <span class="badge">✅ Pembayaran Sukses</span>
          <h2 style="margin: 0 0 4px 0; font-size: 18px; color: #0f172a;">Terima Kasih, ${orderData.customerName}!</h2>
          <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">No. Transaksi: <strong>#${orderData.orderId}</strong> • Tanggal: ${new Date(orderData.createdAt).toLocaleString('id-ID')}</p>

          <table>
            <thead>
              <tr style="border-bottom: 1px solid #cbd5e1; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b;">
                <th style="padding-bottom: 6px;">Item</th>
                <th style="padding-bottom: 6px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 12px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">Subtotal :</span>
              <span style="font-weight: 600;">Rp ${subtotal.toLocaleString('id-ID')}</span>
            </div>
            ${orderData.shippingFee ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #64748b;">Ongkos Kirim :</span>
              <span style="font-weight: 600;">Rp ${orderData.shippingFee.toLocaleString('id-ID')}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 2px solid #0f172a; font-size: 15px; font-weight: 800; color: #0f172a;">
              <span>Total Lunas :</span>
              <span style="color: #059669;">Rp ${orderData.totalHarga.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} Toko Imas • Simpan email ini sebagai bukti transaksi resmi.
        </div>
      </div>
    </body>
    </html>
  `;

  const itemsText = orderData.items.map(item => `- ${item.name} (${item.quantity}x) = Rp ${item.price.toLocaleString('id-ID')}`).join('\n');
  const text = `🧾 Bukti Transaksi #${orderData.orderId} - Toko Imas\n\nNama: ${orderData.customerName}\nStatus: Sudah Dibayar (LUNAS)\nTanggal: ${new Date(orderData.createdAt).toLocaleString('id-ID')}\n\nDetail:\n${itemsText}\nTotal: Rp ${orderData.totalHarga.toLocaleString('id-ID')}\n\nTerima kasih telah berbelanja di Toko Imas!`;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * 4. Mengirimkan Notifikasi Tugas Pengiriman Baru ke Kurir via Gmail.
 */
export async function sendCourierDeliveryEmail(email: string, orderData: {
  orderId: number;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingNotes?: string;
  items: Array<{ name: string; quantity: number }>;
}) {
  const subject = `🚚 Tugas Pengiriman Baru #${orderData.orderId} - Toko Imas`;

  const itemsList = orderData.items.map(item => `<li>${item.name} (${item.quantity}x)</li>`).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #3b82f6; padding: 20px; text-align: center; color: white; }
        .content { padding: 24px; font-size: 14px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin: 0;">🚚 Tugas Pengiriman Baru #${orderData.orderId}</h2>
        </div>
        <div class="content">
          <div class="box">
            <strong>Pelanggan:</strong> ${orderData.customerName} (${orderData.customerPhone})<br>
            <strong>Alamat Tujuan:</strong> ${orderData.shippingAddress}<br>
            <strong>Catatan:</strong> ${orderData.shippingNotes || '-'}
          </div>
          <p><strong>Daftar Item yang Harus Diantar:</strong></p>
          <ul>${itemsList}</ul>
          <p style="font-size: 12px; color: #64748b;">Silakan buka panel kurir untuk memperbarui status pengiriman setelah pesanan diantar.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const itemsText = orderData.items.map(i => `- ${i.name} (${i.quantity}x)`).join('\n');
  const text = `🚚 Tugas Pengiriman Baru #${orderData.orderId} - Toko Imas\n\nPelanggan: ${orderData.customerName} (${orderData.customerPhone})\nAlamat: ${orderData.shippingAddress}\nCatatan: ${orderData.shippingNotes || '-'}\n\nProduk:\n${itemsText}`;

  return sendEmail({ to: email, subject, html, text });
}

/**
 * 5. Mengirimkan Notifikasi Pesanan Sedang Dikirim kepada Pelanggan via Gmail.
 */
export async function sendCustomerShippingEmail(email: string, orderData: {
  orderId: number;
  customerName: string;
  shippingAddress: string;
  courierName: string;
  courierPhone: string;
}) {
  const subject = `🚚 Pesanan #${orderData.orderId} Sedang Dikirim - Toko Imas`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
        .header { background: #f59e0b; padding: 20px; text-align: center; color: white; }
        .content { padding: 24px; font-size: 14px; }
        .box { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 14px; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <h2 style="margin: 0;">🚚 Pesanan Anda Sedang Diantar</h2>
        </div>
        <div class="content">
          <p>Halo <strong>${orderData.customerName}</strong>,</p>
          <p>Pesanan Anda dengan nomor <strong>#${orderData.orderId}</strong> saat ini sedang dalam perjalanan menuju alamat Anda.</p>
          <div class="box">
            <strong>Alamat Tujuan:</strong><br>${orderData.shippingAddress}<br><br>
            <strong>Kurir Pengantar:</strong><br>${orderData.courierName} (${orderData.courierPhone})
          </div>
          <p style="font-size: 13px; color: #64748b;">Pastikan nomor telepon Anda dapat dihubungi kurir jika diperlukan konfirmasi titik lokasi.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `🚚 Pesanan Sedang Dikirim - Toko Imas\n\nHalo ${orderData.customerName},\nPesanan #${orderData.orderId} sedang dalam perjalanan.\nAlamat: ${orderData.shippingAddress}\nKurir: ${orderData.courierName} (${orderData.courierPhone})\n\nTerima kasih telah berbelanja di Toko Imas!`;

  return sendEmail({ to: email, subject, html, text });
}
