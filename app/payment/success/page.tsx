'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [extractedOrderId, setExtractedOrderId] = useState<number | null>(null);
  const [hasShownNotification, setHasShownNotification] = useState(false);

  useEffect(() => {
    const orderIdParam = searchParams.get('order_id');
    const statusParam = searchParams.get('transaction_status');
    
    if (!orderIdParam) {
      // If no order_id, redirect to home after 3 seconds
      setTimeout(() => {
        router.push('/');
      }, 3000);
      return;
    }
    
    setOrderId(orderIdParam);
    setStatus(statusParam);

    // Extract actual order ID from Midtrans order_id format: ORDER-{id}-{timestamp}
    const parts = orderIdParam.split('-');
    if (parts.length >= 2 && parts[0] === 'ORDER') {
      const actualOrderId = parseInt(parts[1]);
      if (!isNaN(actualOrderId)) {
        setExtractedOrderId(actualOrderId);
        
        console.log('📦 Payment Success - Order ID:', actualOrderId);
        console.log('📦 Payment Status:', statusParam);
        
        // Show success notification immediately
        if ((statusParam === 'settlement' || statusParam === 'capture') && !hasShownNotification) {
          setHasShownNotification(true);
          
          // Show toast notification immediately
          toast({
            variant: "success",
            title: "✅ Pembayaran Berhasil!",
            description: `Pesanan #${actualOrderId} berhasil dibayar. Mengarahkan ke halaman pesanan...`,
          });
          
          // Update order status if payment is successful (fallback if callback not received)
          fetch(`/api/pesanan/${actualOrderId}/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).then(res => {
            if (res.ok) {
              console.log(`✅ Order ${actualOrderId} status updated to paid and stock reduced`);
            } else {
              console.error(`❌ Failed to update order ${actualOrderId} status`);
            }
          }).catch(error => {
            console.error('Error updating order status:', error);
          });
          
          // Auto-redirect to pesanan page with orderId after 2.5 seconds
          const redirectTimer = setTimeout(() => {
            console.log('🔄 Redirecting to pesanan page with orderId:', actualOrderId);
            window.location.href = `/pesanan?orderId=${actualOrderId}&payment=success`;
          }, 2500);
          
          return () => clearTimeout(redirectTimer);
        }
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Pembayaran Berhasil!</CardTitle>
          <CardDescription className="text-base mt-2">
            Terima kasih atas pembayaran Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderId && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Order ID:</p>
              <p className="font-mono text-sm font-semibold text-gray-900">{orderId}</p>
            </div>
          )}

          {status && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Status:</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">
                {status === 'settlement' ? 'Settlement' : status}
              </p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-900 font-medium">
              ✅ Pembayaran Anda berhasil!
            </p>
            <p className="text-sm text-blue-800 mt-1">
              Pesanan Anda sedang diproses. Kami akan mengirimkan konfirmasi melalui WhatsApp.
            </p>
            {extractedOrderId && (
              <p className="text-sm text-blue-700 mt-2 font-medium">
                Mengarahkan ke halaman pesanan dalam beberapa detik...
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-4">
            {extractedOrderId ? (
              <Link href={`/pesanan?orderId=${extractedOrderId}`} className="w-full">
                <Button
                  className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-gray-900"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Lihat Detail Pesanan
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  onClick={() => router.push('/')}
                  className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-gray-900"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Kembali ke Beranda
                </Button>
                <Link href="/pesanan" className="w-full">
                  <Button
                    variant="outline"
                    className="w-full"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Lihat Riwayat Pesanan
                  </Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

