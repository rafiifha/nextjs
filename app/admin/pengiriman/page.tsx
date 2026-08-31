'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, User, Phone, MapPin, PackageCheck, CheckCircle2, Image as ImageIcon, X, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Courier {
  id: number;
  name: string;
  phone: string | null;
}

interface DeliveryOrder {
  id: number;
  customerName: string;
  customerPhone: string;
  status: string;
  shippingAddress: string | null;
  shippingZone: number | null;
  shippingDistance: number | null;
  shippingNotes: string | null;
  proofOfDelivery: string | null;
  courier: Courier | null;
}

/**
 * Halaman Manajemen Pengiriman.
 * Menampilkan daftar pesanan yang perlu dikirim, sedang dalam pengiriman, dan yang sudah selesai.
 * Admin dapat menugaskan kurir dan mengubah status pengiriman dari halaman ini.
 */
export default function PengirimanPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [tab, setTab] = useState<'siap' | 'jalan' | 'selesai'>('siap');
  const [selectedCourier, setSelectedCourier] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Mengambil data pesanan delivery dan daftar kurir secara paralel dari API
  const fetchData = async () => {
    try {
      const [orderRes, courierRes] = await Promise.all([
        fetch('/api/delivery'),
        fetch('/api/delivery/couriers'),
      ]);
      if (orderRes.ok) setOrders(await orderRes.json());
      if (courierRes.ok) setCouriers(await courierRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Memperbarui status pesanan (misal: 'shipped' saat mengirim, atau 'delivered' saat selesai)
  const updateStatus = async (orderId: number, status: 'shipped' | 'delivered') => {
    const courierId = selectedCourier[orderId];

    // Validasi: kurir wajib dipilih sebelum mengirim pesanan
    if (status === 'shipped' && !courierId) {
      toast.warning('Kurir belum dipilih', { description: 'Pilih kurir dulu sebelum kirim.' });
      return;
    }

    try {
      const res = await fetch(`/api/pesanan/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(courierId && { courierId: Number(courierId) }),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Gagal update status');
      }

      await fetchData();
      toast.success('Status diperbarui', {
        description: status === 'shipped' ? 'Pesanan dalam proses kirim.' : 'Pesanan selesai.',
      });
    } catch (error: any) {
      toast.error('Gagal update status', { description: error.message });
    }
  };

  // Memfilter pesanan berdasarkan tab status
  const filteredOrders = orders.filter((order) => {
    if (tab === 'siap') return order.status === 'paid' || order.status === 'processing';
    if (tab === 'jalan') return order.status === 'shipped';
    return order.status === 'delivered';
  });

  const getStatusPill = (status: string) => {
    if (status === 'paid') return <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">Sudah Bayar</span>;
    if (status === 'processing') return <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">Diproses</span>;
    if (status === 'shipped') return <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">Sedang Dikirim</span>;
    return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">Selesai</span>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pengiriman</h1>
        <p className="text-sm text-gray-600">Kelola assignment kurir dan progres kiriman pelanggan.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab('siap')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === 'siap' ? 'bg-[#ffd700] text-gray-900 shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Siap Kirim
        </button>
        <button
          onClick={() => setTab('jalan')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === 'jalan' ? 'bg-[#ffd700] text-gray-900 shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Sedang Jalan
        </button>
        <button
          onClick={() => setTab('selesai')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === 'selesai' ? 'bg-[#ffd700] text-gray-900 shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Selesai
        </button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-gray-500">Memuat data pengiriman...</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="border-gray-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Pesanan #{order.id}</CardTitle>
                    <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      {order.customerName}
                      <Phone className="ml-2 h-4 w-4" />
                      {order.customerPhone}
                    </p>
                  </div>
                  {getStatusPill(order.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                    <span>{order.shippingAddress || '-'}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gray-500" />
                    Zona {order.shippingZone || '-'} {order.shippingDistance ? `(${order.shippingDistance.toFixed(2)} km)` : ''}
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-gray-500" />
                    Kurir: {order.courier ? `${order.courier.name} (${order.courier.phone || '-'})` : 'Belum ditentukan'}
                  </p>
                </div>

                {order.shippingNotes && (
                  <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Catatan kurir: {order.shippingNotes}
                  </div>
                )}

                {/* Foto Bukti Pengiriman */}
                {order.proofOfDelivery && (
                  <div className="rounded-lg border border-green-200 bg-green-50/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-green-600" />
                        Bukti Foto Pengiriman
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-blue-600 hover:text-blue-700"
                        onClick={() => setZoomImageUrl(order.proofOfDelivery)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Perbesar Foto
                      </Button>
                    </div>
                    <div
                      className="relative h-36 w-full max-w-xs overflow-hidden rounded-md border border-gray-200 cursor-pointer group"
                      onClick={() => setZoomImageUrl(order.proofOfDelivery)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={order.proofOfDelivery}
                        alt="Bukti Pengiriman"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  </div>
                )}

                {(order.status === 'paid' || order.status === 'processing') && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                      value={selectedCourier[order.id] || ''}
                      onChange={(e) => setSelectedCourier((prev) => ({ ...prev, [order.id]: e.target.value }))}
                    >
                      <option value="">Pilih kurir</option>
                      {couriers.map((courier) => (
                        <option key={courier.id} value={courier.id}>
                          {courier.name} - {courier.phone || '-'}
                        </option>
                      ))}
                    </select>
                    <Button onClick={() => updateStatus(order.id, 'shipped')}>Kirim Pesanan</Button>
                  </div>
                )}

                {order.status === 'shipped' && (
                  <Button onClick={() => updateStatus(order.id, 'delivered')} className="sm:w-fit">
                    Tandai Terkirim
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredOrders.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-gray-500">
                Tidak ada pesanan pada tab ini.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal Zoom Foto */}
      {zoomImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomImageUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 bg-gray-900 text-white">
              <span className="text-sm font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#ffd700]" />
                Foto Bukti Pengiriman
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-gray-300 hover:text-white"
                onClick={() => setZoomImageUrl(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[80vh] overflow-auto flex items-center justify-center bg-black p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomImageUrl}
                alt="Bukti Pengiriman Full"
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
