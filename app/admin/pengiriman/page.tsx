'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, User, Phone, MapPin, PackageCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Courier {
  id: number;
  name: string;
  phone: string;
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
  courier: Courier | null;
}

export default function PengirimanPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [tab, setTab] = useState<'siap' | 'jalan' | 'selesai'>('siap');
  const [selectedCourier, setSelectedCourier] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  const updateStatus = async (orderId: number, status: 'shipped' | 'delivered') => {
    const courierId = selectedCourier[orderId];
    const body: Record<string, any> = { status };
    if (status === 'shipped') {
      if (!courierId) {
        toast({ variant: 'warning', title: 'Kurir belum dipilih', description: 'Pilih kurir dulu sebelum kirim.' });
        return;
      }
      body.courierId = Number(courierId);
    }

    const res = await fetch(`/api/pesanan/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      toast({ variant: 'error', title: 'Gagal update status', description: (await res.json()).error || 'Terjadi kesalahan' });
      return;
    }
    await fetchData();
    toast({
      variant: 'success',
      title: 'Status diperbarui',
      description: status === 'shipped' ? 'Pesanan masuk dalam pengiriman.' : 'Pesanan ditandai selesai.',
    });
  };

  const filteredOrders = orders.filter((order) => {
    if (tab === 'siap') return order.status === 'paid' || order.status === 'processing';
    if (tab === 'jalan') return order.status === 'shipped';
    return order.status === 'delivered';
  });

  const tabStyle = (key: 'siap' | 'jalan' | 'selesai') =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      tab === key
        ? 'bg-[#ffd700] text-gray-900 shadow-sm'
        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    }`;

  const getStatusPill = (status: string) => {
    if (status === 'paid' || status === 'processing') {
      return <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">Siap Kirim</span>;
    }
    if (status === 'shipped') {
      return <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700">Dalam Pengiriman</span>;
    }
    return <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Selesai</span>;
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pengiriman</h1>
        <p className="text-sm text-gray-600">Kelola assignment kurir dan progres kiriman pelanggan.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={tabStyle('siap')} onClick={() => setTab('siap')}>Siap Kirim</button>
        <button className={tabStyle('jalan')} onClick={() => setTab('jalan')}>Dalam Pengiriman</button>
        <button className={tabStyle('selesai')} onClick={() => setTab('selesai')}>Selesai</button>
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
                    Kurir: {order.courier ? `${order.courier.name} (${order.courier.phone})` : 'Belum ditentukan'}
                  </p>
                </div>

                {order.shippingNotes && (
                  <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Catatan kurir: {order.shippingNotes}
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
                          {courier.name} - {courier.phone}
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
    </div>
  );
}
