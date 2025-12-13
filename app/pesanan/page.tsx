'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  trackingId: string | null;
  waybillId: string | null;
  biteshipOrderId: string | null;
  createdAt: string;
  items: OrderItem[];
}

export default function PesananPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [highlightOrderId, setHighlightOrderId] = useState<number | null>(null);

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
      
      // Check if there's orderId in URL (from payment success redirect)
      const orderIdParam = searchParams?.get('orderId');
      if (orderIdParam) {
        const orderId = parseInt(orderIdParam);
        if (!isNaN(orderId)) {
          setHighlightOrderId(orderId);
          // Scroll to highlighted order after a short delay
          setTimeout(() => {
            const element = document.getElementById(`order-${orderId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 500);
        }
      }
      
      // Fetch orders after user is set
      setTimeout(() => {
        // Fetch orders after user is set
      setTimeout(() => {
        fetchOrders();
      }, 100);
      }, 100);
    } catch (e) {
      router.push('/login?redirect=/pesanan');
    }
  }, [router, searchParams]);

  const fetchOrders = async () => {
    try {
      // Get user from localStorage to ensure we have the latest data
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : user;
      
      const token = localStorage.getItem('token');
      const res = await fetch('/api/pesanan', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('📦 Fetched orders:', data);
        console.log('👤 Current user:', currentUser);
        
        // Filter orders by current user (if not admin)
        if (currentUser?.role !== 'admin') {
          // Normalize phone/email for comparison (remove spaces, convert to lowercase)
          const normalize = (str: string | null | undefined) => {
            if (!str) return '';
            return str.toString().trim().toLowerCase().replace(/\s+/g, '');
          };
          
          const userPhone = normalize(currentUser?.phone);
          const userEmail = normalize(currentUser?.email);
          
          const filtered = Array.isArray(data) ? data.filter((order: Order) => {
            const orderPhone = normalize(order.customerPhone);
            // Match if order phone matches user phone OR user email
            const matches = orderPhone === userPhone || orderPhone === userEmail || 
                          (userPhone && orderPhone.includes(userPhone)) ||
                          (userEmail && orderPhone.includes(userEmail));
            
            console.log(`🔍 Order ${order.id}: customerPhone="${order.customerPhone}" (normalized: "${orderPhone}") vs user phone="${userPhone}" email="${userEmail}" -> ${matches ? 'MATCH' : 'NO MATCH'}`);
            
            return matches;
          }) : [];
          
          console.log(`✅ Filtered orders for user:`, filtered);
          setOrders(filtered);
        } else {
          setOrders(Array.isArray(data) ? data : []);
        }
      } else {
        console.error('❌ Failed to fetch orders:', res.status, res.statusText);
        const errorData = await res.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
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
      expired: { label: 'Kedaluwarsa', icon: XCircle, className: 'bg-gray-100 text-gray-800' },
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
              <Card 
                key={order.id} 
                className={`border-gray-200 shadow-md hover:shadow-lg transition-shadow ${
                  highlightOrderId === order.id ? 'ring-2 ring-[#ffd700] bg-[#ffd700]/5' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-bold">Pesanan #{order.id}</CardTitle>
                      <CardDescription className="mt-1">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {formatDate(order.createdAt)}
                      </CardDescription>
                      {order.expiredAt && order.status === 'pending' && (
                        <CardDescription className="mt-1 text-xs text-red-600">
                          ⏰ Kedaluwarsa: {formatDate(order.expiredAt)}
                        </CardDescription>
                      )}
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
                          {formatRupiah(order.totalHarga)}
                        </p>
                      </div>
                    </div>

                    {/* Order IDs & Tracking Info */}
                    {(order.trackingId || order.waybillId || order.biteshipOrderId) && (
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Package className="h-4 w-4 text-[#ffd700]" />
                          Informasi Pengiriman
                        </h4>
                        <div className="space-y-1 text-sm">
                          {order.trackingId && (
                            <p className="text-gray-600">
                              <span className="font-medium">Tracking ID:</span>{' '}
                              <span className="font-mono text-gray-900">{order.trackingId}</span>
                            </p>
                          )}
                          {order.waybillId && (
                            <p className="text-gray-600">
                              <span className="font-medium">Waybill ID:</span>{' '}
                              <span className="font-mono text-gray-900">{order.waybillId}</span>
                            </p>
                          )}
                          {order.biteshipOrderId && (
                            <p className="text-gray-600">
                              <span className="font-medium">Biteship Order ID:</span>{' '}
                              <span className="font-mono text-gray-900">{order.biteshipOrderId}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

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
