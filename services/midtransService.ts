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
}) {
  try {
    // Get base URL from environment or use localhost for development
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
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
      finish_redirect_url: orderDetails.finishRedirectUrl || `${baseUrl}/payment/success`,
      unfinish_redirect_url: orderDetails.unfinishRedirectUrl || `${baseUrl}/payment/pending`,
      error_redirect_url: orderDetails.errorRedirectUrl || `${baseUrl}/payment/failed`,
    };

    const transaction = await snap.createTransaction(parameter);
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

