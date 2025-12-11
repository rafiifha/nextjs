'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/utils';
import { Search, Filter, Package, Loader2, Send, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';

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

export default function ManajemenPesananPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/pesanan');
      if (res.ok) {
        const data = await res.json();
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

      if (res.ok) {
        await fetchOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        alert('Status pesanan berhasil diupdate');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Gagal mengupdate status pesanan');
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
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
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
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
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
                      onClick={() => setSelectedOrder(order)}
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
                                {order.status}
                              </span>
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

        {/* Order Detail */}
        <div className="lg:col-span-1">
          {selectedOrder ? (
            <Card className="border-gray-200 shadow-md sticky top-4">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                <CardTitle className="text-xl font-bold">Detail Pesanan</CardTitle>
                <CardDescription className="mt-1.5 text-sm text-gray-700">Pesanan #{selectedOrder.id}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Informasi Pelanggan</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Nama:</span> {selectedOrder.customerName}</p>
                    <p><span className="font-medium">Telepon:</span> {selectedOrder.customerPhone}</p>
                    <p><span className="font-medium">Metode:</span> {selectedOrder.deliveryMethod || 'Pickup'}</p>
                    <p><span className="font-medium">Tanggal:</span> {new Date(selectedOrder.createdAt).toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.product.name} × {item.quantity}</span>
                        <span className="font-medium">{formatRupiah(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-[#ffd700]">{formatRupiah(selectedOrder.totalHarga)}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Update Status</h4>
                  <div className="space-y-2">
                    {['pending', 'paid', 'processing', 'delivered', 'cancelled'].map((status) => (
                      <Button
                        key={status}
                        variant={selectedOrder.status === status ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        className="w-full justify-start"
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => sendReceipt(selectedOrder.id)}
                  className="w-full"
                  variant="outline"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Kirim E-Receipt via WA
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

