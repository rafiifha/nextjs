'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { 
  Package, 
  CheckCircle, 
  XCircle, 
  Send, 
  Clock, 
  Truck, 
  User, 
  Phone, 
  MapPin,
  ShoppingBag,
  Loader2
} from 'lucide-react';
import Pusher from 'pusher-js';

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

export default function AdminDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    // Initialize Pusher client
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap1';
    
    if (!pusherKey) return;

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    const channel = pusher.subscribe('toko-naning');

    const handleOrderCreated = (data: any) => {
      console.log('New order created:', data);
      fetchOrders();
    };

    const handleOrderUpdated = (data: any) => {
      console.log('Order updated:', data);
      fetchOrders();
      if (selectedOrder && selectedOrder.id === data.order.id) {
        setSelectedOrder(data.order);
      }
    };

    channel.bind('order-created', handleOrderCreated);
    channel.bind('order-updated', handleOrderUpdated);

    return () => {
      channel.unbind('order-created', handleOrderCreated);
      channel.unbind('order-updated', handleOrderUpdated);
      pusher.unsubscribe('toko-naning');
      pusher.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/pesanan');
      const data = await res.json();
      if (res.ok) {
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/pesanan/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (data.success) {
        fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.data);
        }
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Terjadi kesalahan saat mengupdate pesanan');
    }
  };

  const sendReceipt = async (order: Order) => {
    try {
      const res = await fetch('/api/pesanan/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await res.json();
      if (data.success) {
        alert('E-receipt berhasil dikirim ke WhatsApp!');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error sending receipt:', error);
      alert('Terjadi kesalahan saat mengirim e-receipt');
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paid':
        return 'bg-[#ffd700]/20 text-gray-900 border-[#ffd700]/30';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'delivered':
        return <Truck className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending', icon: Clock },
    { value: 'paid', label: 'Paid', icon: CheckCircle },
    { value: 'processing', label: 'Processing', icon: Package },
    { value: 'delivered', label: 'Delivered', icon: Truck },
    { value: 'cancelled', label: 'Cancelled', icon: XCircle },
  ];

  const filteredOrders = orders;
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    paid: orders.filter(o => o.status === 'paid').length,
    processing: orders.filter(o => o.status === 'processing').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6 pb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
                <div className="text-xs text-gray-600 font-medium">Total Pesanan</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6 pb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-700 mb-1">{stats.pending}</div>
                <div className="text-xs text-gray-600 font-medium">Pending</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6 pb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#ffd700] mb-1">{stats.paid}</div>
                <div className="text-xs text-gray-600 font-medium">Paid</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6 pb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-700 mb-1">{stats.processing}</div>
                <div className="text-xs text-gray-600 font-medium">Processing</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6 pb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-700 mb-1">{stats.delivered}</div>
                <div className="text-xs text-gray-600 font-medium">Delivered</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order List */}
          <div className="lg:col-span-2">
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">Daftar Pesanan</CardTitle>
                    <CardDescription className="mt-1.5 text-sm text-gray-700">
                      Pesanan real-time akan muncul di sini
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#ffd700]/10 rounded-lg">
                    <ShoppingBag className="h-5 w-5 text-[#ffd700]" />
                    <span className="font-bold text-gray-900">{orders.length}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mb-4" />
                    <p className="text-gray-600">Memuat pesanan...</p>
                  </div>
                ) : filteredOrders.length > 0 ? (
                  <div className="space-y-3">
                    {filteredOrders.map((order) => (
                    <Card
                      key={order.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                        selectedOrder?.id === order.id
                          ? 'border-[#ffd700] bg-[#ffd700]/10 shadow-md scale-[1.02]'
                          : 'border-gray-200 bg-white hover:border-[#ffd700]/50 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedOrder(order)}
                    >
                        <CardContent className="pt-4 pb-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-bold text-gray-900">Pesanan #{order.id}</h3>
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(
                                    order.status
                                  )}`}
                                >
                                  {getStatusIcon(order.status)}
                                  <span className="capitalize">{order.status}</span>
                                </span>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <User className="h-3.5 w-3.5" />
                                  <span>{order.customerName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5" />
                                  <span>{order.customerPhone}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{new Date(order.createdAt).toLocaleString('id-ID')}</span>
                                </div>
                                {order.deliveryMethod && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5" />
                                    <span className="capitalize">{order.deliveryMethod}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900 mb-1">
                                {formatRupiah(order.totalHarga)}
                              </div>
                              <div className="text-xs text-gray-700 font-medium">
                                {order.items.length} item{order.items.length > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
                    <p className="text-gray-600 font-medium mb-1">Belum ada pesanan</p>
                    <p className="text-sm text-gray-600">Pesanan akan muncul di sini saat ada yang memesan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Detail */}
          <div>
            {selectedOrder ? (
              <Card className="bg-white border-gray-200 shadow-lg sticky top-6">
                <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                  <CardTitle className="text-xl font-bold text-gray-900">Detail Pesanan</CardTitle>
                  <CardDescription className="mt-1.5 text-sm text-gray-700">
                    Pesanan #{selectedOrder.id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Customer Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Informasi Pelanggan
                    </h3>
                    <div className="space-y-2 text-sm bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 w-20">Nama:</span>
                        <span className="font-medium text-gray-900">{selectedOrder.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 w-20">Telepon:</span>
                        <span className="font-medium text-gray-900">{selectedOrder.customerPhone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 w-20">Pengiriman:</span>
                        <span className="font-medium text-gray-900 capitalize">
                          {selectedOrder.deliveryMethod || 'Pickup'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Item Pesanan
                    </h3>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-lg"
                        >
                          <div>
                            <span className="font-medium text-gray-900">{item.product.name}</span>
                            <span className="text-gray-600 ml-2">x {item.quantity}</span>
                          </div>
                          <span className="font-semibold text-gray-900">
                            {formatRupiah(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-gray-900">
                        {formatRupiah(selectedOrder.totalHarga - (selectedOrder.shippingFee || 0))}
                      </span>
                    </div>
                    {selectedOrder.shippingFee && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Ongkir:</span>
                        <span className="font-medium text-gray-900">
                          {formatRupiah(selectedOrder.shippingFee)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-[#ffd700]">{formatRupiah(selectedOrder.totalHarga)}</span>
                    </div>
                  </div>

                  {/* Update Status */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Update Status</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {statusOptions.map((status) => {
                        const Icon = status.icon;
                        return (
                          <Button
                            key={status.value}
                            variant={selectedOrder.status === status.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => updateOrderStatus(selectedOrder.id, status.value)}
                            className="text-xs justify-start gap-2"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {status.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Send Receipt */}
                  <Button
                    className="w-full gap-2"
                    variant="outline"
                    onClick={() => sendReceipt(selectedOrder)}
                  >
                    <Send className="h-4 w-4" />
                    Kirim WA E-Receipt
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border-gray-200 shadow-md">
                <CardContent className="pt-16 pb-16 text-center">
                  <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-gray-700 font-semibold mb-1.5">Pilih pesanan</p>
                  <p className="text-sm text-gray-600">Pilih pesanan untuk melihat detail</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
