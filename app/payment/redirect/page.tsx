'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PaymentRedirectPage() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get parameters from Midtrans redirect
    const orderId = searchParams?.get('order_id');
    const statusCode = searchParams?.get('status_code');
    const transactionStatus = searchParams?.get('transaction_status');

    if (orderId && statusCode) {
      // Extract actual order ID from Midtrans order_id format: ORDER-{id}-{timestamp}
      const orderIdMatch = orderId.match(/ORDER-(\d+)-/);
      const actualOrderId = orderIdMatch ? orderIdMatch[1] : null;

      if (actualOrderId) {
        // Determine payment status
        let paymentStatus = 'pending';
        if (statusCode === '200' && (transactionStatus === 'settlement' || transactionStatus === 'capture')) {
          paymentStatus = 'success';
        } else if (transactionStatus === 'pending') {
          paymentStatus = 'pending';
        } else {
          paymentStatus = 'failed';
        }

        // Redirect to kasir page with proper parameters
        const redirectUrl = `${window.location.origin}/admin/kasir?payment=${paymentStatus}&orderId=${actualOrderId}`;
        console.log('Redirecting from payment redirect page to:', redirectUrl);
        window.location.replace(redirectUrl);
      } else {
        // If we can't extract order ID, redirect to kasir page
        window.location.replace(`${window.location.origin}/admin/kasir`);
      }
    } else {
      // If no parameters, redirect to kasir page
      window.location.replace(`${window.location.origin}/admin/kasir`);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
        <p className="text-gray-600">Memproses pembayaran...</p>
        <p className="text-sm text-gray-500 mt-2">Mengarahkan ke halaman kasir...</p>
      </div>
    </div>
  );
}



