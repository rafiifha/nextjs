'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, CheckCircle } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

export default function PaymentInstructionPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/pesanan/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ffd700]" />
      </div>
    );
  }

  if (!order || !order.paymentNumber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full shadow-lg p-8 text-center">
          <h2 className="text-xl font-bold mb-4">Informasi Pembayaran Tidak Ditemukan</h2>
          <Button onClick={() => router.push('/pesanan')} className="w-full">Lihat Pesanan Saya</Button>
        </Card>
      </div>
    );
  }

  const isQris = order.paymentMethod === 'qris';
  const totalPayment = order.totalHarga + (order.paymentFee || 0);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <Card className="shadow-lg border-t-4 border-t-[#ffd700]">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Menunggu Pembayaran</CardTitle>
            <CardDescription>
              Segera selesaikan pembayaran agar pesanan Anda dapat diproses.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-800 mb-1">Batas Waktu Pembayaran</p>
                <p className="font-bold text-blue-900">
                  {order.expiredAt ? new Date(order.expiredAt).toLocaleString('id-ID') : '-'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between pb-3 border-b border-gray-100">
                <span className="text-gray-600">Total Tagihan</span>
                <span className="font-bold text-xl">{formatRupiah(totalPayment)}</span>
              </div>
              <div className="flex justify-between pb-3 border-b border-gray-100">
                <span className="text-gray-600">Metode Pembayaran</span>
                <span className="font-medium uppercase">{order.paymentMethod.replace('_va', ' Virtual Account')}</span>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center space-y-4">
              {isQris ? (
                <>
                  <p className="text-sm font-medium text-gray-700">Scan QR Code di bawah menggunakan aplikasi pembayaran (GoPay, OVO, Dana, M-Banking, dll)</p>
                  <div className="bg-white p-4 rounded-lg inline-block border-2 border-gray-100 mx-auto">
                    <QRCodeSVG value={order.paymentNumber} size={200} />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700">Nomor Virtual Account</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl font-bold tracking-wider font-mono text-[#ffd700] bg-black px-4 py-2 rounded-lg">
                      {order.paymentNumber}
                    </span>
                    <Button variant="outline" size="icon" onClick={() => handleCopy(order.paymentNumber)} title="Salin VA">
                      {copied ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-gray-600" />}
                    </Button>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 space-y-3">
              <Button className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-black font-semibold" onClick={() => router.push('/pesanan')}>
                Lihat Daftar Pesanan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
