'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { toast } from 'sonner';
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
import LaporanPenjualan from '@/components/laporan-penjualan';

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
      toast.success('🆕 Pesanan Baru!', { description: `Pesanan #${data.order.id} dari ${data.order.customerName} - Total: ${formatRupiah(data.order.totalHarga)}` });
      fetchOrders();
    };

    const handleOrderUpdated = (data: any) => {
      console.log('Order updated:', data);
      // Show notification for order update
      toast.info('🔄 Pesanan Diperbarui', { description: `Status pesanan #${data.order.id} berubah menjadi ${getStatusIndonesian(data.order.status)}` });
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
        toast.success('✅ Status Diperbarui', { description: `Status pesanan #${orderId} berhasil diubah menjadi ${getStatusIndonesian(newStatus)}` });
      } else {
        throw new Error('Data pesanan tidak ditemukan dalam response');
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error('❌ Gagal', { description: error.message || 'Terjadi kesalahan saat mengupdate pesanan' });
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
        toast.success('E-receipt terkirim', { description: 'E-receipt berhasil dikirim ke WhatsApp pelanggan.' });
      } else {
        toast.error('Gagal kirim e-receipt', { description: data.error || 'Terjadi kesalahan' });
      }
    } catch (error) {
      console.error('Error sending receipt:', error);
      toast.error('Gagal kirim e-receipt', { description: 'Terjadi kesalahan saat mengirim e-receipt' });
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
        toast.error('❌ Gagal', { description: 'Gagal mengambil data tracking' });
      }
    } catch (error) {
      console.error('Error fetching tracking:', error);
      toast.error('❌ Error', { description: 'Terjadi kesalahan saat mengambil data tracking' });
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



      </div>
      
      {/* Laporan Penjualan Section */}
      <div className="mt-8 border-t border-gray-200 pt-8">
        <LaporanPenjualan />
      </div>
    </div>
  );
}
