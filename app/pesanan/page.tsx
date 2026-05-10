'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah, isTokenValid } from '@/lib/utils';
import { toast } from 'sonner';
import { Package, Loader2, ShoppingCart, Calendar, MapPin, Truck, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
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
  paymentMethod: string | null;
  paymentNumber: string | null;
  expiredAt: string | null;
  shippingAddress: string | null;
  shippingZone: number | null;
  shippingNotes: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  items: OrderItem[];
}

export default function PesananPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [highlightOrderId, setHighlightOrderId] = useState<number | null>(null);
  const [hasShownPaymentNotification, setHasShownPaymentNotification] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr || !isTokenValid(token)) {
      if (token && !isTokenValid(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      router.push('/login?redirect=/pesanan');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setIsAuthenticated(true);
      
      const urlParams = new URLSearchParams(window.location.search);
      const orderIdParam = urlParams.get('orderId');
      const paymentStatus = urlParams.get('payment');
      
      fetchOrders().then(() => {
        if (orderIdParam) {
          const orderId = parseInt(orderIdParam);
          if (!isNaN(orderId)) {
            setHighlightOrderId(orderId);
            if (paymentStatus === 'success' && !hasShownPaymentNotification) {
              setHasShownPaymentNotification(true);
              setExpandedOrders(prev => new Set(prev).add(orderId));
              toast.success('Pembayaran Berhasil!', { description: `Pesanan #${orderId} Anda berhasil dibayar dan sedang diproses.` });
            }
            
            const scrollToOrder = () => {
              const element = document.getElementById(`order-${orderId}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                setTimeout(scrollToOrder, 500);
              }
            };
            setTimeout(scrollToOrder, 800);
            
            if (paymentStatus) {
              setTimeout(() => {
                window.history.replaceState({}, '', window.location.pathname);
              }, 3000);
            }
          }
        }
      });
    } catch (e) {
      router.push('/login?redirect=/pesanan');
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const hasPendingOrders = orders.some(order => order.status === 'pending');
    if (!hasPendingOrders) return;
    const interval = setInterval(() => { fetchOrders(); }, 10000);
    return () => clearInterval(interval);
  }, [orders, isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : user;
      const token = localStorage.getItem('token');
      
      const res = await fetch('/api/pesanan', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        if (currentUser?.role !== 'admin') {
          const normalize = (str: string | null | undefined) => {
            if (!str) return '';
            return str.toString().trim().toLowerCase().replace(/\s+/g, '');
          };
          const userPhone = normalize(currentUser?.phone);
          const userEmail = normalize(currentUser?.email);
          
          const filtered = Array.isArray(data) ? data.filter((order: Order) => {
            const orderPhone = normalize(order.customerPhone);
            return orderPhone === userPhone || orderPhone === userEmail || 
                   (userPhone && orderPhone.includes(userPhone)) ||
                   (userEmail && orderPhone.includes(userEmail));
          }) : [];
          setOrders(filtered);
          return filtered;
        } else {
          const ordersData = Array.isArray(data) ? data : [];
          setOrders(ordersData);
          return ordersData;
        }
      } else {
        toast.error('Gagal Memuat Pesanan', { description: 'Terjadi kesalahan saat memuat data.' });
        return [];
      }
    } catch (error: any) {
      toast.error('Gagal Memuat Pesanan', { description: error.message });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
      pending: { label: 'Menunggu Pembayaran', icon: Clock, className: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'Sudah Dibayar', icon: CheckCircle, className: 'bg-green-100 text-green-800' },
      processing: { label: 'Sedang Diproses', icon: Package, className: 'bg-blue-100 text-blue-800' },
      shipped: { label: 'Dalam Pengiriman', icon: Truck, className: 'bg-orange-100 text-orange-800' },
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
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
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
              <ShoppingCart className="h-4 w-4 mr-2" /> Pesan Baru
            </Button>
          </Link>
        </div>

        {orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const itemsCount = order.items.length;
              return (
                <Card 
                  key={order.id} id={`order-${order.id}`}
                  className={`border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer ${highlightOrderId === order.id ? 'ring-2 ring-[#ffd700] bg-[#ffd700]/5' : ''}`}
                  onClick={() => {
                    setExpandedOrders(prev => {
                      const newSet = new Set(prev);
                      newSet.has(order.id) ? newSet.delete(order.id) : newSet.add(order.id);
                      return newSet;
                    });
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-bold text-gray-900">Pesanan #{order.id}</h3>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total</p>
                          <p className="text-lg font-bold text-[#ffd700]">{formatRupiah(order.totalHarga)}</p>
                        </div>
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {itemsCount} item</span>
                        <span className="flex items-center gap-1">
                          {order.deliveryMethod === 'delivery' ? <><Truck className="h-3.5 w-3.5" /> Pengiriman</> : <><MapPin className="h-3.5 w-3.5" /> Ambil Sendiri</>}
                        </span>
                      </div>
                      {order.status === 'pending' && order.paymentMethod !== 'tunai' && (
                        <Button 
                          size="sm" 
                          className="bg-[#ffd700] text-black hover:bg-[#e6c200]"
                          onClick={(e) => { e.stopPropagation(); router.push(`/payment/instruction/${order.id}`); }}
                        >
                          Bayar Sekarang
                        </Button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm">Item Pesanan:</h4>
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                <div>
                                  <p className="font-medium text-gray-900">{item.product.name}</p>
                                  <p className="text-xs text-gray-600">{item.quantity} x {formatRupiah(item.price)}</p>
                                </div>
                                <p className="font-semibold text-gray-900">{formatRupiah(item.price * item.quantity)}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Metode Pengiriman</p>
                            <p className="text-sm font-medium text-gray-900">{order.deliveryMethod === 'delivery' ? 'Pengiriman' : 'Ambil Sendiri'}</p>
                            {order.deliveryMethod === 'delivery' && order.shippingFee && <p className="text-xs text-gray-600 mt-1">Ongkir: {formatRupiah(order.shippingFee)}</p>}
                            {order.deliveryMethod === 'delivery' && (
                              <p className="text-xs text-gray-600 mt-1">Zona: {order.shippingZone || '-'}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Total Pembayaran</p>
                            <p className="text-lg font-bold text-[#ffd700]">{formatRupiah(order.totalHarga)}</p>
                          </div>
                        </div>

                        {order.deliveryMethod === 'delivery' && (
                          <div className="pt-2 border-t border-gray-100 text-xs text-gray-700 space-y-1">
                            <p><span className="font-medium">Alamat:</span> {order.shippingAddress || '-'}</p>
                            <p><span className="font-medium">Catatan:</span> {order.shippingNotes || '-'}</p>
                            <p>
                              <span className="font-medium">Timeline:</span>{' '}
                              Dibuat {formatDate(order.createdAt)}
                              {order.shippedAt ? ` -> Dikirim ${formatDate(order.shippedAt)}` : ''}
                              {order.deliveredAt ? ` -> Sampai ${formatDate(order.deliveredAt)}` : ''}
                            </p>
                          </div>
                        )}

                        {order.expiredAt && order.status === 'pending' && (
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-xs text-red-600">⏰ Kedaluwarsa: {formatDate(order.expiredAt)}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-gray-200 shadow-md">
            <CardContent className="pt-12 pb-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum Ada Pesanan</h3>
              <p className="text-gray-600 mb-6">Anda belum memiliki pesanan. Mulai pesan produk sekarang!</p>
              <Link href="/checkout"><Button className="bg-[#ffd700] hover:bg-[#e6c200] text-gray-900"><ShoppingCart className="h-4 w-4 mr-2" /> Pesan Sekarang</Button></Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
