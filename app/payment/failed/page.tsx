'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function PaymentFailedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const orderIdParam = searchParams.get('order_id');
    const statusParam = searchParams.get('transaction_status');
    
    setOrderId(orderIdParam);
    setStatus(statusParam);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Pembayaran Gagal</CardTitle>
          <CardDescription className="text-base mt-2">
            Terjadi kesalahan saat memproses pembayaran
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
              <p className="text-sm font-semibold text-red-600 capitalize">
                {status === 'cancel' ? 'Dibatalkan' : 
                 status === 'deny' ? 'Ditolak' : 
                 status === 'expire' ? 'Kedaluwarsa' : status}
              </p>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <p className="text-sm text-red-900">
              Pembayaran tidak dapat diproses. Silakan coba lagi atau hubungi customer service jika masalah berlanjut.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              onClick={() => router.push('/pesanan')}
              className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-gray-900"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Coba Lagi
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/')}
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Kembali ke Beranda
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

