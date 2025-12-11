'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Home, Package } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const orderIdParam = searchParams.get('order_id');
    const statusParam = searchParams.get('transaction_status');
    
    setOrderId(orderIdParam);
    setStatus(statusParam);

    // If order_id exists, you might want to fetch order details
    if (orderIdParam) {
      // Optionally fetch order details here
      console.log('Order ID:', orderIdParam);
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
            <p className="text-sm text-blue-900">
              Pesanan Anda sedang diproses. Kami akan mengirimkan konfirmasi melalui WhatsApp.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

