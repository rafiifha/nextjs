/**
 * WhatsApp Service Adapter (Telah dialihkan ke arsitektur Gmail)
 * File ini dipertahankan sebagai compatibility layer agar seluruh fungsi lama
 * tetap berjalan mulus dengan mengarahkan notifikasi ke email Gmail (emailService.ts).
 */
import { 
  sendEmail, 
  sendOrderNotificationEmail, 
  sendReceiptEmail, 
  sendCourierDeliveryEmail, 
  sendCustomerShippingEmail 
} from '@/services/emailService';

/**
 * Adapter untuk fungsi sendWhatsAppMessage -> dialihkan ke Gmail
 */
export async function sendWhatsAppMessage(target: string, message: string) {
  console.log(`📨 [Adapter] Mengalihkan notifikasi pesan ke Gmail untuk target: ${target}`);
  
  const recipientEmail = target.includes('@') ? target : process.env.GMAIL_USER || target;

  return sendEmail({
    to: recipientEmail,
    subject: 'Notifikasi Toko Naning',
    text: message,
    html: `
      <div style="font-family: sans-serif; padding: 20px; background: #f8fafc; border-radius: 12px; max-width: 500px;">
        <h3 style="color: #d4a800; margin-top: 0;">🛒 Toko Naning</h3>
        <pre style="white-space: pre-wrap; font-family: inherit; font-size: 14px; color: #1e293b;">${message}</pre>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
        <small style="color: #94a3b8;">Notifikasi resmi Toko Naning via Gmail</small>
      </div>
    `,
  });
}

/**
 * Adapter untuk Notifikasi Pesanan Baru -> dialihkan ke sendOrderNotificationEmail
 */
export async function sendOrderNotification(target: string, orderData: {
  orderId: number;
  customerName: string;
  totalHarga: number;
  shippingFee?: number | null;
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  const recipientEmail = target.includes('@') ? target : process.env.GMAIL_USER || target;
  return sendOrderNotificationEmail(recipientEmail, orderData);
}

/**
 * Adapter untuk Struk Transaksi -> dialihkan ke sendReceiptEmail
 */
export async function sendReceipt(target: string, orderData: {
  orderId: number;
  customerName: string;
  totalHarga: number;
  shippingFee?: number | null;
  status: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  createdAt: string;
}) {
  const recipientEmail = target.includes('@') ? target : process.env.GMAIL_USER || target;
  return sendReceiptEmail(recipientEmail, orderData);
}

/**
 * Adapter untuk Tugas Pengiriman Kurir -> dialihkan ke sendCourierDeliveryEmail
 */
export async function sendCourierDeliveryNotification(target: string, orderData: {
  orderId: number;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  shippingNotes?: string;
  items: Array<{ name: string; quantity: number }>;
}) {
  const recipientEmail = target.includes('@') ? target : process.env.GMAIL_USER || target;
  return sendCourierDeliveryEmail(recipientEmail, orderData);
}

/**
 * Adapter untuk Status Pengiriman Pelanggan -> dialihkan ke sendCustomerShippingEmail
 */
export async function sendCustomerShippingNotification(target: string, orderData: {
  orderId: number;
  customerName: string;
  shippingAddress: string;
  courierName: string;
  courierPhone: string;
}) {
  const recipientEmail = target.includes('@') ? target : process.env.GMAIL_USER || target;
  return sendCustomerShippingEmail(recipientEmail, orderData);
}
