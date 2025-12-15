import { Snap } from 'midtrans-client';
import { env } from '@/lib/env';

const snap = new Snap({
  isProduction: false, // Set to true for production
  serverKey: env.MIDTRANS_SERVER_KEY,
  clientKey: env.MIDTRANS_CLIENT_KEY,
});

export async function createSnapTransaction(orderDetails: {
  orderId: string;
  grossAmount: number;
  customerDetails: {
    first_name: string;
    phone: string;
  };
  finishRedirectUrl?: string;
  unfinishRedirectUrl?: string;
  errorRedirectUrl?: string;
  notificationUrl?: string;
}) {
  try {
    // Use provided URLs or construct from baseUrl
    // baseUrl should be passed from the calling function (API route)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Use provided redirect URLs if available, otherwise construct from baseUrl
    const finishUrl = orderDetails.finishRedirectUrl || `${baseUrl}/payment/success`;
    const unfinishUrl = orderDetails.unfinishRedirectUrl || `${baseUrl}/payment/pending`;
    const errorUrl = orderDetails.errorRedirectUrl || `${baseUrl}/payment/failed`;
    const notifyUrl = orderDetails.notificationUrl || `${baseUrl}/api/payment/midtrans/notify`;
    
    const parameter: any = {
      transaction_details: {
        order_id: orderDetails.orderId,
        gross_amount: orderDetails.grossAmount,
      },
      customer_details: {
        first_name: orderDetails.customerDetails.first_name,
        phone: orderDetails.customerDetails.phone,
      },
      // Redirect URLs
      finish_redirect_url: finishUrl,
      unfinish_redirect_url: unfinishUrl,
      error_redirect_url: errorUrl,
      // Notification URL for server-to-server callback
      notification_url: notifyUrl,
    };

    console.log('📤 Creating Midtrans transaction:');
    console.log('  - Order ID:', parameter.transaction_details.order_id);
    console.log('  - Finish Redirect:', parameter.finish_redirect_url);
    console.log('  - Unfinish Redirect:', parameter.unfinish_redirect_url);
    console.log('  - Error Redirect:', parameter.error_redirect_url);
    console.log('  - Notification URL:', parameter.notification_url);
    console.log('  - Full parameter:', JSON.stringify(parameter, null, 2));

    const transaction = await snap.createTransaction(parameter);
    
    console.log('✅ Midtrans transaction created:');
    console.log('  - Token:', transaction.token);
    console.log('  - Redirect URL from response:', transaction.redirect_url);
    
    return transaction;
  } catch (error) {
    console.error('Midtrans error:', error);
    throw error;
  }
}

export async function verifyNotification(notification: any) {
  try {
    // For Snap, notification verification is typically handled by Midtrans's server-to-server callback
    // This function might be more relevant for Core API or direct API calls
    // For now, we'll just return the notification as is, assuming it's from a trusted source (Midtrans)
    return notification;
  } catch (error) {
    console.error('Midtrans verification error:', error);
    throw error;
  }
}

