'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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
  Loader2,
  Printer,
  Navigation,
  RefreshCw
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
  discount: number | null;
  cashReceived: number | null;
  change: number | null;
  deliveryMethod: string | null;
  shippingFee: number | null;
  trackingId: string | null;
  waybillId: string | null;
  biteshipOrderId: string | null;
  expiredAt: string | null;
  createdAt: string;
  items: OrderItem[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingData, setTrackingData] = useState<{ [key: number]: any }>({});
  const [loadingTracking, setLoadingTracking] = useState<{ [key: number]: boolean }>({});

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
      // Show notification for new order
      toast({
        variant: "success",
        title: "🆕 Pesanan Baru!",
        description: `Pesanan #${data.order.id} dari ${data.order.customerName} - Total: ${formatRupiah(data.order.totalHarga)}`,
      });
      fetchOrders();
    };

    const handleOrderUpdated = (data: any) => {
      console.log('Order updated:', data);
      // Show notification for order update
      toast({
        variant: "info",
        title: "🔄 Pesanan Diperbarui",
        description: `Status pesanan #${data.order.id} berubah menjadi ${getStatusIndonesian(data.order.status)}`,
      });
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
        const ordersData = Array.isArray(data) ? data : [];
        // Ensure all orders have required fields with defaults
        const normalizedOrders = ordersData.map((order: any) => ({
          ...order,
          discount: order.discount || null,
          cashReceived: order.cashReceived || null,
          change: order.change || null,
          trackingId: order.trackingId || null,
          waybillId: order.waybillId || null,
          biteshipOrderId: order.biteshipOrderId || null,
          expiredAt: order.expiredAt || null,
        }));
        setOrders(normalizedOrders);
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
      
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengupdate status pesanan');
      }

      // Handle both response formats: { success: true, data: ... } or direct order object
      const orderData = data.success ? data.data : data;
      
      if (orderData) {
        await fetchOrders();
        // Update selected order
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(orderData);
        }
        toast({
          variant: "success",
          title: "✅ Status Diperbarui",
          description: `Status pesanan #${orderId} berhasil diubah menjadi ${getStatusIndonesian(newStatus)}`,
        });
      } else {
        throw new Error('Data pesanan tidak ditemukan dalam response');
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        variant: "error",
        title: "❌ Gagal",
        description: error.message || 'Terjadi kesalahan saat mengupdate pesanan',
      });
    }
  };

  const handlePrintOrder = async (order: Order) => {
    // Update status to 'processing' if it's online order and status is 'paid'
    if (!isOfflineOrder(order) && order.status === 'paid') {
      try {
        const res = await fetch(`/api/pesanan/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'processing' }),
        });

        if (res.ok) {
          // Refresh orders
          await fetchOrders();
          // Update selected order
          const updatedOrders = await fetch('/api/pesanan').then(r => r.json());
          const updatedOrder = updatedOrders.find((o: Order) => o.id === order.id);
          if (updatedOrder) {
            setSelectedOrder(updatedOrder);
            // Use updated order for print
            order = updatedOrder;
          }
        }
      } catch (error) {
        console.error('Error updating status:', error);
      }
    }
    
    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Detail Pesanan #${order.id}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              color: #333;
            }
            .section {
              margin-bottom: 25px;
            }
            .section h3 {
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
              margin-bottom: 15px;
              color: #333;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .info-label {
              font-weight: 600;
              color: #666;
            }
            .info-value {
              color: #333;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .items-table th {
              background-color: #f5f5f5;
              padding: 12px;
              text-align: left;
              border-bottom: 2px solid #ddd;
            }
            .items-table td {
              padding: 12px;
              border-bottom: 1px solid #eee;
            }
            .total-row {
              font-weight: bold;
              font-size: 18px;
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DETAIL PESANAN</h1>
            <p>Pesanan #${order.id}</p>
            <p>${new Date(order.createdAt).toLocaleString('id-ID')}</p>
          </div>
          
          <div class="section">
            <h3>Informasi Pelanggan</h3>
            <div class="info-row">
              <span class="info-label">Nama:</span>
              <span class="info-value">${order.customerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Telepon:</span>
              <span class="info-value">${order.customerPhone}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Metode Pengiriman:</span>
              <span class="info-value">${order.deliveryMethod === 'delivery' ? 'Pengiriman' : 'Ambil di Toko'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status:</span>
              <span class="info-value">${getStatusIndonesian(order.status)}</span>
            </div>
            ${order.trackingId ? `
            <div class="info-row">
              <span class="info-label">Tracking ID:</span>
              <span class="info-value">${order.trackingId}</span>
            </div>
            ` : ''}
            ${order.waybillId ? `
            <div class="info-row">
              <span class="info-label">Waybill ID:</span>
              <span class="info-value">${order.waybillId}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="section">
            <h3>Item Pesanan</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Jumlah</th>
                  <th>Harga Satuan</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.product.name}</td>
                    <td>${item.quantity}</td>
                    <td>${formatRupiah(item.price)}</td>
                    <td>${formatRupiah(item.price * item.quantity)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h3>Rincian Pembayaran</h3>
            <div class="info-row">
              <span class="info-label">Subtotal:</span>
              <span class="info-value">${formatRupiah(order.totalHarga - (order.shippingFee || 0) - (order.discount || 0))}</span>
            </div>
            ${order.shippingFee ? `
            <div class="info-row">
              <span class="info-label">Ongkir:</span>
              <span class="info-value">${formatRupiah(order.shippingFee)}</span>
            </div>
            ` : ''}
            ${order.discount ? `
            <div class="info-row">
              <span class="info-label">Diskon:</span>
              <span class="info-value">-${formatRupiah(order.discount)}</span>
            </div>
            ` : ''}
            <div class="info-row total-row">
              <span class="info-label">Total:</span>
              <span class="info-value">${formatRupiah(order.totalHarga)}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Terima kasih atas kepercayaan Anda!</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
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
        toast({
          variant: 'success',
          title: 'E-receipt terkirim',
          description: 'E-receipt berhasil dikirim ke WhatsApp pelanggan.',
        });
      } else {
        toast({
          variant: 'error',
          title: 'Gagal kirim e-receipt',
          description: data.error || 'Terjadi kesalahan',
        });
      }
    } catch (error) {
      console.error('Error sending receipt:', error);
      toast({
        variant: 'error',
        title: 'Gagal kirim e-receipt',
        description: 'Terjadi kesalahan saat mengirim e-receipt',
      });
    }
  };

  // Fetch tracking for orders with trackingId
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
        toast({
          variant: "error",
          title: "❌ Gagal",
          description: 'Gagal mengambil data tracking',
        });
      }
    } catch (error) {
      console.error('Error fetching tracking:', error);
      toast({
        variant: "error",
        title: "❌ Error",
        description: 'Terjadi kesalahan saat mengambil data tracking',
      });
    } finally {
      setLoadingTracking(prev => ({ ...prev, [orderId]: false }));
    }
  };


  // Check if order is from offline (kasir)
  const isOfflineOrder = (order: Order) => {
    return order.deliveryMethod === 'pickup' && (!order.shippingFee || order.shippingFee === 0);
  };

  // Get status in Indonesian
  const getStatusIndonesian = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Menunggu Pembayaran',
      'paid': 'Sudah Dibayar',
      'processing': 'Diproses',
      'delivered': 'Terkirim',
      'cancelled': 'Dibatalkan',
      'expired': 'Kedaluwarsa',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'paid':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'processing':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'delivered':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'expired':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
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
    { value: 'paid', label: 'Sudah Dibayar', icon: CheckCircle },
    { value: 'processing', label: 'Diproses', icon: Package },
    { value: 'delivered', label: 'Terkirim', icon: Truck },
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
                <div className="text-xs text-gray-600 font-medium">Menunggu Pembayaran</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6 pb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-[#ffd700] mb-1">{stats.paid}</div>
                <div className="text-xs text-gray-600 font-medium">Sudah Dibayar</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6 pb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-700 mb-1">{stats.processing}</div>
                <div className="text-xs text-gray-600 font-medium">Diproses</div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardContent className="pt-6 pb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-700 mb-1">{stats.delivered}</div>
                <div className="text-xs text-gray-600 font-medium">Terkirim</div>
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
                                  <span>{getStatusIndonesian(order.status)}</span>
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
                        <span className="text-gray-600 w-24">Nama:</span>
                        <span className="font-medium text-gray-900">{selectedOrder.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 w-24">Telepon:</span>
                        <span className="font-medium text-gray-900">{selectedOrder.customerPhone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 w-24">Metode:</span>
                        <span className="font-medium text-gray-900">
                          {selectedOrder.deliveryMethod === 'delivery' ? 'Pengiriman' : 'Ambil di Toko'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 w-24">Status:</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                          {getStatusIcon(selectedOrder.status)}
                          {getStatusIndonesian(selectedOrder.status)}
                        </span>
                      </div>
                      {selectedOrder.expiredAt && selectedOrder.status === 'pending' && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 w-24">Kedaluwarsa:</span>
                          <span className="font-medium text-red-600">
                            {new Date(selectedOrder.expiredAt).toLocaleString('id-ID')}
                          </span>
                        </div>
                      )}
                      {!isOfflineOrder(selectedOrder) && selectedOrder.trackingId && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 w-24">Tracking ID:</span>
                          <span className="font-medium text-gray-900">{selectedOrder.trackingId}</span>
                        </div>
                      )}
                      {!isOfflineOrder(selectedOrder) && selectedOrder.waybillId && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 w-24">Waybill ID:</span>
                          <span className="font-medium text-gray-900">{selectedOrder.waybillId}</span>
                        </div>
                      )}
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
                        {formatRupiah(selectedOrder.totalHarga - (selectedOrder.shippingFee || 0) - (selectedOrder.discount || 0))}
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
                    {selectedOrder.discount && selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Diskon:</span>
                        <span className="font-medium text-red-600">
                          -{formatRupiah(selectedOrder.discount)}
                        </span>
                      </div>
                    )}
                    {isOfflineOrder(selectedOrder) && selectedOrder.cashReceived && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Uang Diterima:</span>
                        <span className="font-medium text-gray-900">
                          {formatRupiah(selectedOrder.cashReceived)}
                        </span>
                      </div>
                    )}
                    {isOfflineOrder(selectedOrder) && selectedOrder.change && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Kembalian:</span>
                        <span className="font-medium text-gray-900">
                          {formatRupiah(selectedOrder.change)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-[#ffd700]">{formatRupiah(selectedOrder.totalHarga)}</span>
                    </div>
                  </div>

                  {/* Tracking Info - For orders with trackingId */}
                  {!isOfflineOrder(selectedOrder) && selectedOrder.trackingId && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <Navigation className="h-4 w-4 text-[#ffd700]" />
                          Tracking Pengiriman
                        </h3>
                        {!trackingData[selectedOrder.id] && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchTracking(selectedOrder.id, selectedOrder.trackingId!)}
                            disabled={loadingTracking[selectedOrder.id]}
                            className="text-xs"
                          >
                            {loadingTracking[selectedOrder.id] ? (
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

                      {loadingTracking[selectedOrder.id] && !trackingData[selectedOrder.id] && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-[#ffd700]" />
                          <span className="ml-2 text-sm text-gray-600">Memuat tracking...</span>
                        </div>
                      )}

                      {trackingData[selectedOrder.id] && (
                        <div className="space-y-4">
                          {/* Tracking Status */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-900">Status:</span>
                              <span className="text-sm font-semibold text-blue-700 capitalize">
                                {trackingData[selectedOrder.id].status}
                              </span>
                            </div>
                            {trackingData[selectedOrder.id].waybill_id && (
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-xs text-blue-700">Waybill ID:</span>
                                <span className="text-xs font-mono text-blue-900">
                                  {trackingData[selectedOrder.id].waybill_id}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Courier Info */}
                          {trackingData[selectedOrder.id].courier && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <h5 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                                <Truck className="h-4 w-4 text-[#ffd700]" />
                                Informasi Kurir
                              </h5>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-600 w-20">Kurir:</span>
                                  <span className="font-medium text-gray-900 capitalize">
                                    {trackingData[selectedOrder.id].courier.company}
                                  </span>
                                </div>
                                {trackingData[selectedOrder.id].courier.driver_name && (
                                  <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 text-gray-400" />
                                    <span className="text-gray-600 w-20">Driver:</span>
                                    <span className="font-medium text-gray-900">
                                      {trackingData[selectedOrder.id].courier.driver_name}
                                    </span>
                                  </div>
                                )}
                                {trackingData[selectedOrder.id].courier.driver_phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span className="text-gray-600 w-20">Telepon:</span>
                                    <a
                                      href={`tel:${trackingData[selectedOrder.id].courier.driver_phone}`}
                                      className="font-medium text-blue-600 hover:text-blue-800"
                                    >
                                      {trackingData[selectedOrder.id].courier.driver_phone}
                                    </a>
                                  </div>
                                )}
                                {trackingData[selectedOrder.id].courier.driver_plate_number && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-600 w-20">Plat:</span>
                                    <span className="font-medium text-gray-900">
                                      {trackingData[selectedOrder.id].courier.driver_plate_number}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Tracking History */}
                          {trackingData[selectedOrder.id].history && trackingData[selectedOrder.id].history.length > 0 && (
                            <div>
                              <h5 className="font-semibold text-gray-900 mb-3 text-sm">Riwayat Pengiriman</h5>
                              <div className="space-y-3 max-h-60 overflow-y-auto">
                                {trackingData[selectedOrder.id].history.map((history: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex gap-3 pb-3 border-l-2 border-gray-200 pl-4 relative"
                                  >
                                    <div className="absolute -left-2 top-0 w-4 h-4 bg-[#ffd700] rounded-full border-2 border-white"></div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">{history.note}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-500">
                                          {new Date(history.updated_at).toLocaleString('id-ID')}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded capitalize">
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
                          {trackingData[selectedOrder.id].link && (
                            <div className="pt-2">
                              <a
                                href={trackingData[selectedOrder.id].link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <Navigation className="h-4 w-4" />
                                Buka tracking di website kurir
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {!loadingTracking[selectedOrder.id] && !trackingData[selectedOrder.id] && (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-600 mb-2">Tracking belum tersedia</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => fetchTracking(selectedOrder.id, selectedOrder.trackingId!)}
                            className="text-xs"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Muat Tracking
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Update Status - Only for online orders */}
                  {!isOfflineOrder(selectedOrder) && (
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
                              disabled={selectedOrder.status === status.value}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {status.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Print Detail Pesanan - Only for online orders */}
                  {!isOfflineOrder(selectedOrder) && (
                    <Button
                      className="w-full gap-2"
                      variant="outline"
                      onClick={() => handlePrintOrder(selectedOrder)}
                    >
                      <Printer className="h-4 w-4" />
                      Print Detail Pesanan
                    </Button>
                  )}

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
