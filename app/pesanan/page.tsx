'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Package, Loader2, ShoppingCart, Calendar, MapPin, Truck, CreditCard, CheckCircle, Clock, XCircle, Navigation, Phone, User, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
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
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [highlightOrderId, setHighlightOrderId] = useState<number | null>(null);
  const [hasShownPaymentNotification, setHasShownPaymentNotification] = useState(false);
  const [trackingData, setTrackingData] = useState<{ [key: number]: any }>({});
  const [loadingTracking, setLoadingTracking] = useState<{ [key: number]: boolean }>({});
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

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
      const paymentStatus = searchParams?.get('payment');
      
      // Fetch orders first
      fetchOrders().then(() => {
        // After orders are loaded, handle notification and scroll
        if (orderIdParam) {
          const orderId = parseInt(orderIdParam);
          if (!isNaN(orderId)) {
            setHighlightOrderId(orderId);
            console.log('📦 Highlighting order:', orderId);
            
            // Show notification if payment was successful
            if (paymentStatus === 'success' && !hasShownPaymentNotification) {
              setHasShownPaymentNotification(true);
              // Expand the order automatically
              setExpandedOrders(prev => new Set(prev).add(orderId));
              // Show notification
              toast({
                variant: "success",
                title: "✅ Pembayaran Berhasil!",
                description: `Pesanan #${orderId} Anda berhasil dibayar dan sedang diproses.`,
              });
            }
            
            // Scroll to highlighted order after orders are loaded
            const scrollToOrder = () => {
              const element = document.getElementById(`order-${orderId}`);
              if (element) {
                console.log('📍 Scrolling to order:', orderId);
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                console.log('⚠️ Order element not found, retrying...');
                setTimeout(scrollToOrder, 500);
              }
            };
            
            // Wait a bit for DOM to render
            setTimeout(scrollToOrder, 800);
            
            // Clean up URL parameters after showing notification
            if (paymentStatus) {
              setTimeout(() => {
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
              }, 3000);
            }
          }
        }
      });
    } catch (e) {
      router.push('/login?redirect=/pesanan');
    }
  }, [router, searchParams]);

  // Auto-refresh orders every 10 seconds if there are pending orders
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const hasPendingOrders = orders.some(order => order.status === 'pending');
    if (!hasPendingOrders) return;
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing orders...');
      fetchOrders();
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [orders, isAuthenticated]);

  // Fetch tracking for paid orders with trackingId
  const fetchTracking = async (orderId: number, trackingId: string) => {
    if (loadingTracking[orderId] || trackingData[orderId]) return;
    
    setLoadingTracking(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch(`/api/delivery/biteship/tracking?trackingId=${trackingId}`);
      if (res.ok) {
        const data = await res.json();
        setTrackingData(prev => ({ ...prev, [orderId]: data }));
      } else {
        console.error('Failed to fetch tracking:', res.statusText);
      }
    } catch (error) {
      console.error('Error fetching tracking:', error);
    } finally {
      setLoadingTracking(prev => ({ ...prev, [orderId]: false }));
    }
  };

  // Auto-fetch tracking for paid orders with trackingId
  useEffect(() => {
    orders.forEach(order => {
      if (order.status === 'paid' && order.trackingId && !trackingData[order.id] && !loadingTracking[order.id]) {
        fetchTracking(order.id, order.trackingId);
      }
    });
  }, [orders]);

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
          return filtered;
        } else {
          const ordersData = Array.isArray(data) ? data : [];
          setOrders(ordersData);
          return ordersData;
        }
      } else {
        console.error('❌ Failed to fetch orders:', res.status, res.statusText);
        let errorData: any = {};
        try {
          const text = await res.text();
          if (text) {
            errorData = JSON.parse(text);
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }
        console.error('Error details:', errorData);
        
        // Show error toast to user
        if (res.status === 500) {
          toast({
            variant: "error",
            title: "❌ Gagal Memuat Pesanan",
            description: errorData.error || "Terjadi kesalahan saat memuat data pesanan. Silakan refresh halaman.",
          });
        }
        
        return [];
      }
    } catch (error: any) {
      console.error('❌ Error fetching orders:', error);
      toast({
        variant: "error",
        title: "❌ Gagal Memuat Pesanan",
        description: error.message || "Terjadi kesalahan saat memuat data pesanan. Silakan refresh halaman.",
      });
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
          <div className="space-y-3">
            {orders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const itemsCount = order.items.length;
              const itemsSummary = order.items.slice(0, 2).map(item => item.product.name).join(', ');
              const moreItems = itemsCount > 2 ? ` +${itemsCount - 2} item lainnya` : '';
              
              return (
                <Card 
                  key={order.id}
                  id={`order-${order.id}`}
                  className={`border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                    highlightOrderId === order.id ? 'ring-2 ring-[#ffd700] bg-[#ffd700]/5' : ''
                  }`}
                  onClick={() => {
                    setExpandedOrders(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(order.id)) {
                        newSet.delete(order.id);
                      } else {
                        newSet.add(order.id);
                      }
                      return newSet;
                    });
                  }}
                >
                  <CardContent className="p-4">
                    {/* Compact Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-bold text-gray-900">Pesanan #{order.id}</h3>
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(order.createdAt).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total</p>
                          <p className="text-lg font-bold text-[#ffd700]">
                            {formatRupiah(order.totalHarga)}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Compact Summary */}
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Package className="h-3.5 w-3.5" />
                          {itemsCount} item
                        </span>
                        <span className="flex items-center gap-1">
                          {order.deliveryMethod === 'delivery' ? (
                            <>
                              <Truck className="h-3.5 w-3.5" />
                              Pengiriman
                            </>
                          ) : (
                            <>
                              <MapPin className="h-3.5 w-3.5" />
                              Ambil Sendiri
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        {/* Order Items */}
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2 text-sm">Item Pesanan:</h4>
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                <div>
                                  <p className="font-medium text-gray-900">{item.product.name}</p>
                                  <p className="text-xs text-gray-600">
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
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Metode Pengiriman</p>
                            <p className="text-sm font-medium text-gray-900">
                              {order.deliveryMethod === 'delivery' ? 'Pengiriman' : 'Ambil Sendiri'}
                            </p>
                            {order.deliveryMethod === 'delivery' && order.shippingFee && (
                              <p className="text-xs text-gray-600 mt-1">
                                Ongkir: {formatRupiah(order.shippingFee)}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Total Pembayaran</p>
                            <p className="text-lg font-bold text-[#ffd700]">
                              {formatRupiah(order.totalHarga)}
                            </p>
                          </div>
                        </div>

                        {/* Tracking Info - Only for paid orders with trackingId */}
                        {order.status === 'paid' && order.trackingId && (
                          <div className="pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                                <Navigation className="h-4 w-4 text-[#ffd700]" />
                                Tracking Pengiriman
                              </h4>
                              {!trackingData[order.id] && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchTracking(order.id, order.trackingId!);
                                  }}
                                  disabled={loadingTracking[order.id]}
                                  className="text-xs"
                                >
                                  {loadingTracking[order.id] ? (
                                    <>
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Memuat...
                                    </>
                                  ) : (
                                    <>
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Refresh
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>

                            {loadingTracking[order.id] && !trackingData[order.id] && (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-[#ffd700]" />
                                <span className="ml-2 text-sm text-gray-600">Memuat tracking...</span>
                              </div>
                            )}

                            {trackingData[order.id] && (
                              <div className="space-y-3">
                                {/* Tracking Status */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-blue-900">Status:</span>
                                    <span className="text-sm font-semibold text-blue-700 capitalize">
                                      {trackingData[order.id].status}
                                    </span>
                                  </div>
                                  {trackingData[order.id].waybill_id && (
                                    <div className="mt-2 flex items-center justify-between">
                                      <span className="text-xs text-blue-700">Waybill ID:</span>
                                      <span className="text-xs font-mono text-blue-900">
                                        {trackingData[order.id].waybill_id}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Courier Info */}
                                {trackingData[order.id].courier && (
                                  <div className="bg-gray-50 rounded-lg p-3">
                                    <h5 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                                      <Truck className="h-4 w-4 text-[#ffd700]" />
                                      Informasi Kurir
                                    </h5>
                                    <div className="space-y-1 text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-600 w-20">Kurir:</span>
                                        <span className="font-medium text-gray-900 capitalize">
                                          {trackingData[order.id].courier.company}
                                        </span>
                                      </div>
                                      {trackingData[order.id].courier.driver_name && (
                                        <div className="flex items-center gap-2">
                                          <User className="h-3 w-3 text-gray-400" />
                                          <span className="text-gray-600 w-20">Driver:</span>
                                          <span className="font-medium text-gray-900">
                                            {trackingData[order.id].courier.driver_name}
                                          </span>
                                        </div>
                                      )}
                                      {trackingData[order.id].courier.driver_phone && (
                                        <div className="flex items-center gap-2">
                                          <Phone className="h-3 w-3 text-gray-400" />
                                          <span className="text-gray-600 w-20">Telepon:</span>
                                          <a
                                            href={`tel:${trackingData[order.id].courier.driver_phone}`}
                                            className="font-medium text-blue-600 hover:text-blue-800"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            {trackingData[order.id].courier.driver_phone}
                                          </a>
                                        </div>
                                      )}
                                      {trackingData[order.id].courier.driver_plate_number && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-600 w-20">Plat:</span>
                                          <span className="font-medium text-gray-900">
                                            {trackingData[order.id].courier.driver_plate_number}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Tracking History */}
                                {trackingData[order.id].history && trackingData[order.id].history.length > 0 && (
                                  <div>
                                    <h5 className="font-semibold text-gray-900 mb-2 text-sm">Riwayat Pengiriman</h5>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                      {trackingData[order.id].history.map((history: any, index: number) => (
                                        <div
                                          key={index}
                                          className="flex gap-3 pb-2 border-l-2 border-gray-200 pl-3 relative"
                                        >
                                          <div className="absolute -left-2 top-0 w-3 h-3 bg-[#ffd700] rounded-full border-2 border-white"></div>
                                          <div className="flex-1">
                                            <p className="text-xs font-medium text-gray-900">{history.note}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                              <span className="text-xs text-gray-500">
                                                {new Date(history.updated_at).toLocaleString('id-ID')}
                                              </span>
                                              <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded capitalize">
                                                {history.status}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Tracking Link */}
                                {trackingData[order.id].link && (
                                  <div className="pt-2">
                                    <a
                                      href={trackingData[order.id].link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Navigation className="h-3 w-3" />
                                      Buka tracking di website kurir
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}

                            {!loadingTracking[order.id] && !trackingData[order.id] && (
                              <div className="text-center py-3">
                                <p className="text-xs text-gray-600 mb-2">Tracking belum tersedia</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchTracking(order.id, order.trackingId!);
                                  }}
                                  className="text-xs"
                                >
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  Muat Tracking
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Expired Info */}
                        {order.expiredAt && order.status === 'pending' && (
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-xs text-red-600">
                              ⏰ Kedaluwarsa: {formatDate(order.expiredAt)}
                            </p>
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
