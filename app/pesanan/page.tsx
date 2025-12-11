'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { Package, Loader2, ShoppingCart, Calendar, MapPin, Truck, CreditCard, CheckCircle, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product: {
    id: number;
    name: string;
  };
}

interface Order {
  id: number;
  customerName: string;
  customerPhone: string;
  status: string;
  totalHarga: number;
  deliveryMethod: string | null;
  shippingFee: number | null;
  createdAt: string;
  items: OrderItem[];
}

export default function PesananPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      router.push('/login?redirect=/pesanan');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setIsAuthenticated(true);
      fetchOrders();
    } catch (e) {
      router.push('/login?redirect=/pesanan');
    }
  }, [router]);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/pesanan', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        // Filter orders by current user (if not admin)
        if (user?.role !== 'admin') {
          const filtered = Array.isArray(data) ? data.filter((order: Order) => 
            order.customerPhone === user?.phone || order.customerPhone === user?.email
          ) : [];
          setOrders(filtered);
        } else {
          setOrders(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
      pending: { label: 'Menunggu Pembayaran', icon: Clock, className: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'Sudah Dibayar', icon: CheckCircle, className: 'bg-green-100 text-green-800' },
      processing: { label: 'Sedang Diproses', icon: Package, className: 'bg-blue-100 text-blue-800' },
      delivered: { label: 'Sudah Dikirim', icon: Truck, className: 'bg-purple-100 text-purple-800' },
      cancelled: { label: 'Dibatalkan', icon: XCircle, className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
          <p className="text-gray-600">Memuat pesanan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Riwayat Pesanan</h1>
            <p className="text-gray-600">Lihat semua pesanan Anda</p>
          </div>
          <Link href="/checkout">
            <Button className="bg-[#ffd700] hover:bg-[#e6c200] text-gray-900">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Pesan Baru
            </Button>
          </Link>
        </div>

        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="border-gray-200 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">Pesanan #{order.id}</CardTitle>
                      <CardDescription className="mt-1">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {formatDate(order.createdAt)}
                      </CardDescription>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Order Items */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Item Pesanan:</h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <p className="font-medium text-gray-900">{item.product.name}</p>
                              <p className="text-sm text-gray-600">
                                {item.quantity} x {formatRupiah(item.price)}
                              </p>
                            </div>
                            <p className="font-semibold text-gray-900">
                              {formatRupiah(item.price * item.quantity)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          {order.deliveryMethod === 'delivery' ? (
                            <Truck className="h-4 w-4 text-[#ffd700]" />
                          ) : (
                            <MapPin className="h-4 w-4 text-[#ffd700]" />
                          )}
                          {order.deliveryMethod === 'delivery' ? 'Pengiriman' : 'Ambil Sendiri'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {order.deliveryMethod === 'delivery' 
                            ? `Ongkir: ${formatRupiah(order.shippingFee || 0)}`
                            : 'Tidak ada biaya pengiriman'}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-[#ffd700]" />
                          Total Pembayaran
                        </h4>
                        <p className="text-2xl font-bold text-[#ffd700]">
                          {formatRupiah(order.totalHarga + (order.shippingFee || 0))}
                        </p>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Pelanggan:</span> {order.customerName}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Kontak:</span> {order.customerPhone}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-gray-200 shadow-md">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum Ada Pesanan</h3>
                <p className="text-gray-600 mb-6">
                  Anda belum memiliki pesanan. Mulai pesan produk sekarang!
                </p>
                <Link href="/checkout">
                  <Button className="bg-[#ffd700] hover:bg-[#e6c200] text-gray-900">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Pesan Sekarang
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
