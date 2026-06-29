'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Copy, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';

export default function PaymentInstructionPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentExpired, setPaymentExpired] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(4);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);


  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/pesanan/${params.id}?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);

        // Check if payment confirmed
        if (data.status === 'paid' || data.status === 'processing') {
          setPaymentConfirmed(true);
          // Stop polling
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          toast.success('Pembayaran Berhasil!', {
            description: `Pesanan #${params.id} telah dikonfirmasi.`,
          });
        }

        // Check if payment expired
        if (data.status === 'expired' || data.status === 'cancelled') {
          setPaymentExpired(true);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  // Initial fetch
  useEffect(() => {
    if (params.id) {
      fetchOrder();
    }
  }, [params.id, fetchOrder]);

  // Polling every 5s when status is pending
  useEffect(() => {
    if (!order || paymentConfirmed || paymentExpired) return;
    if (order.status !== 'pending') return;

    pollingRef.current = setInterval(() => {
      fetchOrder();
    }, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [order, paymentConfirmed, paymentExpired, fetchOrder]);

  // Countdown + redirect after payment confirmed
  useEffect(() => {
    if (!paymentConfirmed) return;

    countdownRef.current = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [paymentConfirmed]);

  // Handle redirect when countdown reaches 0
  useEffect(() => {
    if (paymentConfirmed && redirectCountdown === 0) {
      router.push(`/pesanan?orderId=${params.id}&payment=success`);
    }
  }, [paymentConfirmed, redirectCountdown, params.id, router]);

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

  // Payment confirmed overlay
  if (paymentConfirmed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full shadow-2xl border-t-4 border-t-green-500 overflow-hidden">
          <CardContent className="pt-10 pb-10 text-center space-y-6">
            {/* Animated checkmark */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-30" />
              <div className="relative flex items-center justify-center w-24 h-24 bg-green-100 rounded-full">
                <CheckCircle className="h-14 w-14 text-green-600" strokeWidth={1.5} />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Berhasil! 🎉</h2>
              <p className="text-gray-600">
                Pesanan <span className="font-semibold">#{params.id}</span> telah dikonfirmasi dan sedang diproses.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Dibayar</span>
                <span className="font-bold text-green-700">{formatRupiah(totalPayment)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Metode</span>
                <span className="font-medium uppercase text-gray-900">{order.paymentMethod.replace('_va', ' Virtual Account')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Status</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs font-medium">
                  <CheckCircle className="h-3 w-3" /> Lunas
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <p className="text-sm text-gray-500">
                Mengarahkan ke riwayat pesanan dalam <span className="font-bold text-gray-900">{redirectCountdown}</span> detik...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((4 - redirectCountdown) / 4) * 100}%` }}
                />
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                onClick={() => router.push(`/pesanan?orderId=${params.id}&payment=success`)}
              >
                Lihat Pesanan Sekarang
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }



  // Payment expired overlay
  if (paymentExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full shadow-2xl border-t-4 border-t-red-500">
          <CardContent className="pt-10 pb-10 text-center space-y-6">
            <div className="flex items-center justify-center w-24 h-24 bg-red-100 rounded-full mx-auto">
              <XCircle className="h-14 w-14 text-red-500" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pemesanan Dibatalkan</h2>
              <p className="text-gray-600">Pesanan ini telah dibatalkan secara otomatis karena pembayaran tidak diterima dalam batas waktu 15 menit. Silakan lakukan checkout ulang.</p>
            </div>
            <div className="space-y-3">
              <Button
                className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-black font-semibold"
                onClick={() => router.push('/')}
              >
                Buat Pesanan Baru
              </Button>
              <Button
                variant="outline"
                className="w-full font-semibold"
                onClick={() => router.push('/pesanan')}
              >
                Kembali ke Riwayat Pesanan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

            {/* Polling indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Menunggu konfirmasi pembayaran...</span>
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
