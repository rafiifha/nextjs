'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/utils';
import { Search, Filter, Package, Loader2, Send, Clock, CheckCircle, XCircle, Truck, Printer, Eye } from 'lucide-react';

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  priceType: string;
  product: {
    id: number;
    name: string;
  };
  variant?: {
    id: number;
    priceType: string;
  } | null;
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
  updatedAt: string;
  items: OrderItem[];
}

export default function ManajemenPesananPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/pesanan');
      if (res.ok) {
        const data = await res.json();
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
          items: order.items?.map((item: any) => ({
            ...item,
            priceType: item.priceType || 'dus',
            variant: item.variant || null,
          })) || [],
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

      if (res.ok) {
        await fetchOrders();
        // Update selected order if it's the one being updated
        const updatedOrders = await fetch('/api/pesanan').then(r => r.json());
        const updatedOrder = updatedOrders.find((o: Order) => o.id === orderId);
        if (updatedOrder && selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal mengupdate status');
      }
    } catch (error: any) {
      console.error('Error updating order:', error);
      alert(error.message || 'Gagal mengupdate status pesanan');
    }
  };

  const sendReceipt = async (orderId: number) => {
    try {
      const res = await fetch('/api/pesanan/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      if (res.ok) {
        alert('E-receipt berhasil dikirim via WhatsApp');
      } else {
        alert('Gagal mengirim e-receipt');
      }
    } catch (error) {
      console.error('Error sending receipt:', error);
      alert('Gagal mengirim e-receipt');
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
            <h3>Detail Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Jenis</th>
                  <th>Qty</th>
                  <th>Harga</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>${item.product.name}</td>
                    <td>${item.priceType.charAt(0).toUpperCase() + item.priceType.slice(1)}</td>
                    <td>${item.quantity}</td>
                    <td>${formatRupiah(item.price)}</td>
                    <td>${formatRupiah(item.price * item.quantity)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h3>Ringkasan Pembayaran</h3>
            ${order.discount && order.discount > 0 ? `
            <div class="info-row">
              <span class="info-label">Subtotal:</span>
              <span class="info-value">${formatRupiah(order.totalHarga + order.discount)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Diskon:</span>
              <span class="info-value" style="color: red;">-${formatRupiah(order.discount)}</span>
            </div>
            ` : ''}
            ${order.shippingFee && order.shippingFee > 0 ? `
            <div class="info-row">
              <span class="info-label">Ongkir:</span>
              <span class="info-value">${formatRupiah(order.shippingFee)}</span>
            </div>
            ` : ''}
            <div class="info-row total-row">
              <span class="info-label">Total:</span>
              <span class="info-value">${formatRupiah(order.totalHarga + (order.shippingFee || 0))}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>Terima kasih atas kepercayaan Anda</p>
            <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          </div>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone.includes(searchQuery) ||
      order.id.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Pesanan</h1>
        <p className="text-gray-600">Kelola semua pesanan pelanggan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order List */}
        <div className="lg:col-span-2">
          <Card className="border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Daftar Pesanan</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Cari nama, telepon, atau ID pesanan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#ffd700]"
                  >
                    <option value="all">Semua Status</option>
                    <option value="pending">Menunggu Pembayaran</option>
                    <option value="paid">Sudah Dibayar</option>
                    <option value="processing">Diproses</option>
                    <option value="delivered">Terkirim</option>
                    <option value="cancelled">Dibatalkan</option>
                    <option value="expired">Kedaluwarsa</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
                  <p className="text-gray-600">Memuat pesanan...</p>
                </div>
              ) : filteredOrders.length > 0 ? (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <Card
                      key={order.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                        selectedOrder?.id === order.id
                          ? 'border-[#ffd700] bg-[#ffd700]/10'
                          : 'border-gray-200 hover:border-[#ffd700]/50'
                      }`}
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowDetailModal(true);
                      }}
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-gray-900">Pesanan #{order.id}</h3>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(
                                  order.status
                                )}`}
                              >
                                {getStatusIndonesian(order.status)}
                              </span>
                              {isOfflineOrder(order) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                                  Offline
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">{order.customerName}</p>
                            <p className="text-sm text-gray-600">{order.customerPhone}</p>
                            <div className="mt-2 flex items-center gap-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {formatRupiah(order.totalHarga)}
                              </div>
                              <div className="text-xs text-gray-700 font-medium">
                                {order.items.length} item{order.items.length > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-600">
                  Tidak ada pesanan ditemukan
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Detail Modal */}
        {showDetailModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6 border-b pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Detail Pesanan</h2>
                    <p className="text-sm text-gray-600 mt-1">Pesanan #{selectedOrder.id}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                {/* Informasi Pelanggan */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Informasi Pelanggan</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nama:</span>
                      <span className="font-medium text-gray-900">{selectedOrder.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Telepon:</span>
                      <span className="font-medium text-gray-900">{selectedOrder.customerPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Metode Pengiriman:</span>
                      <span className="font-medium text-gray-900">
                        {selectedOrder.deliveryMethod === 'delivery' ? 'Pengiriman' : 'Ambil di Toko'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                        {getStatusIndonesian(selectedOrder.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tanggal Pesanan:</span>
                      <span className="font-medium text-gray-900">{new Date(selectedOrder.createdAt).toLocaleString('id-ID')}</span>
                    </div>
                    {selectedOrder.updatedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Terakhir Diupdate:</span>
                        <span className="font-medium text-gray-900">{new Date(selectedOrder.updatedAt).toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {isOfflineOrder(selectedOrder) && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tipe:</span>
                        <span className="font-medium text-gray-900">Pesanan Offline (Kasir)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informasi Pembayaran (untuk offline) */}
                {isOfflineOrder(selectedOrder) && (selectedOrder.discount || selectedOrder.cashReceived || selectedOrder.change) && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Informasi Pembayaran</h3>
                    <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                      {selectedOrder.discount && selectedOrder.discount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Diskon:</span>
                          <span className="font-medium text-red-600">-{formatRupiah(selectedOrder.discount)}</span>
                        </div>
                      )}
                      {selectedOrder.cashReceived && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Uang Diterima:</span>
                          <span className="font-medium text-gray-900">{formatRupiah(selectedOrder.cashReceived)}</span>
                        </div>
                      )}
                      {selectedOrder.change && selectedOrder.change > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kembalian:</span>
                          <span className="font-medium text-green-600">{formatRupiah(selectedOrder.change)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Informasi Pengiriman (untuk online) */}
                {!isOfflineOrder(selectedOrder) && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Informasi Pengiriman</h3>
                    <div className="bg-green-50 rounded-lg p-4 space-y-2 text-sm">
                      {selectedOrder.shippingFee && selectedOrder.shippingFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ongkir:</span>
                          <span className="font-medium text-gray-900">{formatRupiah(selectedOrder.shippingFee)}</span>
                        </div>
                      )}
                      {selectedOrder.trackingId && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tracking ID:</span>
                          <span className="font-medium text-gray-900">{selectedOrder.trackingId}</span>
                        </div>
                      )}
                      {selectedOrder.waybillId && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Waybill ID:</span>
                          <span className="font-medium text-gray-900">{selectedOrder.waybillId}</span>
                        </div>
                      )}
                      {selectedOrder.expiredAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Batas Pembayaran:</span>
                          <span className="font-medium text-gray-900">{new Date(selectedOrder.expiredAt).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Detail Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="divide-y">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="p-4 flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{item.product.name}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {item.priceType.charAt(0).toUpperCase() + item.priceType.slice(1)} × {item.quantity}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatRupiah(item.price)} per unit
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{formatRupiah(item.price * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="mb-6 border-t pt-4">
                  <div className="space-y-2">
                    {selectedOrder.discount && selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-semibold">{formatRupiah(selectedOrder.totalHarga + selectedOrder.discount)}</span>
                      </div>
                    )}
                    {selectedOrder.discount && selectedOrder.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Diskon:</span>
                        <span className="font-semibold text-red-600">-{formatRupiah(selectedOrder.discount)}</span>
                      </div>
                    )}
                    {selectedOrder.shippingFee && selectedOrder.shippingFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Ongkir:</span>
                        <span className="font-semibold">{formatRupiah(selectedOrder.shippingFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-[#ffd700]">{formatRupiah(selectedOrder.totalHarga + (selectedOrder.shippingFee || 0))}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {!isOfflineOrder(selectedOrder) && (
                    <>
                      <Button
                        onClick={() => handlePrintOrder(selectedOrder)}
                        className="flex-1"
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Print Detail Pesanan
                      </Button>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-gray-900 mb-2 text-sm">Update Status</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {['paid', 'processing', 'delivered', 'cancelled'].map((status) => (
                            <Button
                              key={status}
                              variant={selectedOrder.status === status ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                updateOrderStatus(selectedOrder.id, status);
                                setShowDetailModal(false);
                              }}
                              className="text-xs"
                            >
                              {getStatusIndonesian(status)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  {isOfflineOrder(selectedOrder) && (
                    <Button
                      onClick={() => sendReceipt(selectedOrder.id)}
                      className="flex-1"
                      variant="outline"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Kirim E-Receipt via WA
                    </Button>
                  )}
                  <Button
                    onClick={() => setShowDetailModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Order Detail Sidebar (for quick view) */}
        <div className="lg:col-span-1">
          {selectedOrder ? (
            <Card className="border-gray-200 shadow-md sticky top-4">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <CardTitle className="text-xl font-bold">Pesanan #{selectedOrder.id}</CardTitle>
                <CardDescription className="mt-1.5 text-sm text-gray-700">
                  {isOfflineOrder(selectedOrder) ? 'Pesanan Offline' : 'Pesanan Online'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{selectedOrder.customerName}</p>
                  <p className="text-gray-600">{selectedOrder.customerPhone}</p>
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusIndonesian(selectedOrder.status)}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-[#ffd700]">{formatRupiah(selectedOrder.totalHarga + (selectedOrder.shippingFee || 0))}</span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowDetailModal(true)}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Lihat Detail Lengkap
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-gray-200 shadow-md">
              <CardContent className="pt-16 pb-16 text-center">
                <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-700 font-semibold mb-1.5">Pilih pesanan</p>
                <p className="text-sm text-gray-600">Pilih pesanan untuk melihat detail</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

