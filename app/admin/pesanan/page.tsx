'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/utils';
import { Search, Filter, Package, Loader2, XCircle, Printer, Phone, User, Calendar, Wallet, Truck, CreditCard, FileText } from 'lucide-react';
import { toast } from 'sonner';

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
  paymentMethod: string | null;
  paymentNumber: string | null;
  expiredAt: string | null;
  shippingAddress?: string | null;
  shippingZone?: number | null;
  shippingNotes?: string | null;
  courierId?: number | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

interface Courier {
  id: number;
  name: string;
  phone: string;
}

export default function ManajemenPesananPage() {

  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ITEMS_PER_PAGE = 10;

  const fetchOrders = useCallback(async (page?: number, search?: string, status?: string) => {
    try {
      setLoading(true);
      const p = page ?? currentPage;
      const s = search ?? searchQuery;
      const st = status ?? statusFilter;
      const params = new URLSearchParams({
        page: String(p),
        limit: String(ITEMS_PER_PAGE),
        search: s,
        status: st,
      });
      const res = await fetch(`/api/pesanan?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          const normalizedOrders = data.orders.map((order: any) => ({
            ...order,
            discount: order.discount || null,
            cashReceived: order.cashReceived || null,
            change: order.change || null,
            paymentMethod: order.paymentMethod || null,
            paymentNumber: order.paymentNumber || null,
            expiredAt: order.expiredAt || null,
            items: order.items?.map((item: any) => ({
              ...item,
              priceType: item.priceType || 'dus',
              variant: item.variant || null,
            })) || [],
          }));
          setOrders(normalizedOrders);
          setTotalPages(data.totalPages || 1);
          setTotalOrders(data.total || 0);
          setCurrentPage(data.page || 1);
        } else {
          // Fallback for non-paginated response (e.g. customer endpoint)
          const ordersData = Array.isArray(data) ? data : [];
          setOrders(ordersData);
          setTotalPages(1);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter]);

  useEffect(() => {
    fetchOrders();
    fetchCouriers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCouriers = async () => {
    try {
      const res = await fetch('/api/delivery/couriers');
      if (res.ok) {
        const data = await res.json();
        setCouriers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching couriers:', error);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string, courierId?: number) => {
    try {
      const body: Record<string, any> = { status: newStatus };
      if (courierId) body.courierId = courierId;
      const res = await fetch(`/api/pesanan/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchOrders();
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: String(ITEMS_PER_PAGE),
          search: searchQuery,
          status: statusFilter,
        });
        const updatedRes = await fetch(`/api/pesanan?${params}`);
        const updatedData = await updatedRes.json();
        const updatedOrders = updatedData.orders || updatedData;
        const updatedOrder = updatedOrders.find((o: Order) => o.id === orderId);
        if (updatedOrder && selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(updatedOrder);
        }
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal mengupdate status');
      }
    } catch (error: any) {
      toast.error('Gagal update status', { description: error.message || 'Gagal mengupdate status pesanan' });
    }
  };

  const isOfflineOrder = (order: Order) => {
    return order.deliveryMethod === 'pickup' && (!order.shippingFee || order.shippingFee === 0) && order.paymentMethod === 'tunai';
  };

  const getStatusIndonesian = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Menunggu Pembayaran',
      'paid': 'Sudah Dibayar',
      'processing': 'Diproses',
      'shipped': 'Dalam Pengiriman',
      'delivered': 'Terkirim',
      'cancelled': 'Dibatalkan',
      'expired': 'Dibatalkan (Tidak Dibayar)',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'paid': return 'bg-green-100 text-green-700 border-green-300';
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'shipped': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'delivered': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
      case 'expired': return 'bg-red-50 text-red-750 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusPill = (status: string) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (status === 'paid') return 'bg-green-100 text-green-700 border-green-300';
    if (status === 'processing') return 'bg-blue-100 text-blue-700 border-blue-300';
    if (status === 'shipped') return 'bg-orange-100 text-orange-700 border-orange-300';
    if (status === 'delivered') return 'bg-purple-100 text-purple-700 border-purple-300';
    if (status === 'cancelled') return 'bg-red-100 text-red-700 border-red-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const handlePrintOrder = async (order: Order) => {
    if (!isOfflineOrder(order) && order.status === 'paid') {
      try {
        const res = await fetch(`/api/pesanan/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'processing' }),
        });

        if (res.ok) {
          await fetchOrders();
          const params = new URLSearchParams({
            page: String(currentPage),
            limit: String(ITEMS_PER_PAGE),
            search: searchQuery,
            status: statusFilter,
          });
          const updatedRes = await fetch(`/api/pesanan?${params}`);
          const updatedData = await updatedRes.json();
          const updatedOrders = updatedData.orders || updatedData;
          const updatedOrder = updatedOrders.find((o: Order) => o.id === order.id);
          if (updatedOrder) {
            setSelectedOrder(updatedOrder);
            order = updatedOrder;
          }
        }
      } catch (error) {
        console.error('Error updating status:', error);
      }
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Detail Pesanan #${order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #333; }
            .section { margin-bottom: 25px; }
            .section h3 { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; color: #333; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
            .info-label { font-weight: 600; color: #666; }
            .info-value { color: #333; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .items-table th { background-color: #f5f5f5; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; }
            .items-table td { padding: 12px; border-bottom: 1px solid #eee; }
            .total-row { font-weight: bold; font-size: 18px; background-color: #f9f9f9; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
            @media print { body { padding: 0; } }
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
            <div class="info-row"><span class="info-label">Nama:</span><span class="info-value">${order.customerName}</span></div>
            <div class="info-row"><span class="info-label">Telepon:</span><span class="info-value">${order.customerPhone}</span></div>
            <div class="info-row"><span class="info-label">Metode Pengiriman:</span><span class="info-value">${order.deliveryMethod === 'delivery' ? 'Pengiriman' : 'Ambil di Toko'}</span></div>
            <div class="info-row"><span class="info-label">Status:</span><span class="info-value">${getStatusIndonesian(order.status)}</span></div>
            <div class="info-row"><span class="info-label">Pembayaran:</span><span class="info-value uppercase">${order.paymentMethod ? order.paymentMethod.replace('_va', ' Virtual Account') : '-'}</span></div>
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
            <div class="info-row"><span class="info-label">Subtotal:</span><span class="info-value">${formatRupiah(order.totalHarga + order.discount)}</span></div>
            <div class="info-row"><span class="info-label">Diskon:</span><span class="info-value" style="color: red;">-${formatRupiah(order.discount)}</span></div>
            ` : ''}
            ${order.shippingFee && order.shippingFee > 0 ? `
            <div class="info-row"><span class="info-label">Ongkir:</span><span class="info-value">${formatRupiah(order.shippingFee)}</span></div>
            ` : ''}
            <div class="info-row total-row">
              <span class="info-label">Total:</span>
              <span class="info-value">${formatRupiah(order.totalHarga)}</span>
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
    
    setTimeout(() => { printWindow.print(); }, 250);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    fetchOrders(1, value, statusFilter);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
    fetchOrders(1, searchQuery, value);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    fetchOrders(page, searchQuery, statusFilter);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Pesanan</h1>
        <p className="text-gray-600">Kelola semua pesanan pelanggan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Daftar Pesanan</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input placeholder="Cari nama, telepon, atau ID pesanan..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10" />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <select value={statusFilter} onChange={(e) => handleStatusChange(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#ffd700]">
                    <option value="all">Semua Status</option>
                    <option value="pending">Menunggu Pembayaran</option>
                    <option value="paid">Sudah Dibayar</option>
                    <option value="processing">Diproses</option>
                    <option value="shipped">Dalam Pengiriman</option>
                    <option value="delivered">Terkirim</option>
                    <option value="expired">Dibatalkan (Tidak Dibayar)</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
                  <p className="text-sm text-gray-500">Memuat data pesanan...</p>
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card
                      key={order.id}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md border ${
                        selectedOrder?.id === order.id
                          ? 'border-[#ffd700] bg-[#ffd700]/10 shadow-sm'
                          : 'border-gray-200 hover:border-[#ffd700]/50'
                      }`}
                      onClick={() => {
                        setSelectedOrder(order);
                        setSelectedCourierId(order.courierId ? String(order.courierId) : '');
                        setShowDetailModal(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 text-base">Pesanan #{order.id}</h3>
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                                {getStatusIndonesian(order.status)}
                              </span>
                              {isOfflineOrder(order) && (
                                <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold border border-gray-200">
                                  Offline
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 font-medium">{order.customerName}</p>
                            <p className="text-sm text-gray-500">{order.customerPhone}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                              <span>{new Date(order.createdAt).toLocaleString('id-ID')}</span>
                              <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                              <span>{order.deliveryMethod === 'delivery' ? 'Pengiriman' : 'Pickup'}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Total</p>
                            <p className="text-base font-bold text-gray-900">
                              {formatRupiah(order.totalHarga)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Halaman {currentPage} dari {totalPages} ({totalOrders} pesanan)
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Previous
                        </button>
                        {getPageNumbers().map((pageNum, idx) =>
                          pageNum === '...' ? (
                            <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm text-gray-500">...</span>
                          ) : (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum as number)}
                              className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-[#ffd700] border-[#ffd700] text-gray-900 font-bold'
                                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        )}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">Tidak ada pesanan ditemukan</div>
              )}
            </CardContent>
          </Card>
        </div>

        {showDetailModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowDetailModal(false); setSelectedCourierId(''); }}>
            <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-100" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex justify-between items-start mb-6 border-b border-gray-200 pb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Detail Pesanan</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="text-sm text-gray-600">Pesanan #{selectedOrder.id}</p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusPill(selectedOrder.status)}`}>
                        {getStatusIndonesian(selectedOrder.status)}
                      </span>
                      {isOfflineOrder(selectedOrder) && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-200">
                          Offline
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowDetailModal(false); setSelectedCourierId(''); }}
                    className="rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Informasi Pelanggan</h3>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                    <div className="grid gap-2 md:grid-cols-2">
                      <p className="flex items-center gap-2 text-gray-700"><User className="h-4 w-4 text-gray-500" /> {selectedOrder.customerName}</p>
                      <p className="flex items-center gap-2 text-gray-700"><Phone className="h-4 w-4 text-gray-500" /> {selectedOrder.customerPhone}</p>
                      <p className="flex items-center gap-2 text-gray-700"><Truck className="h-4 w-4 text-gray-500" /> {selectedOrder.deliveryMethod === 'delivery' ? 'Pengiriman' : 'Ambil di Toko'}</p>
                      <p className="flex items-center gap-2 text-gray-700"><Calendar className="h-4 w-4 text-gray-500" /> {new Date(selectedOrder.createdAt).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>

                {isOfflineOrder(selectedOrder) && (selectedOrder.discount || selectedOrder.cashReceived || selectedOrder.change) && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Informasi Pembayaran Kasir</h3>
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2 text-sm">
                      {selectedOrder.discount && selectedOrder.discount > 0 && <div className="flex justify-between"><span className="text-gray-600">Diskon:</span><span className="font-medium text-red-600">-{formatRupiah(selectedOrder.discount)}</span></div>}
                      {selectedOrder.cashReceived && <div className="flex justify-between"><span className="text-gray-600">Uang Diterima:</span><span className="font-medium text-gray-900">{formatRupiah(selectedOrder.cashReceived)}</span></div>}
                      {selectedOrder.change && selectedOrder.change > 0 && <div className="flex justify-between"><span className="text-gray-600">Kembalian:</span><span className="font-medium text-green-600">{formatRupiah(selectedOrder.change)}</span></div>}
                    </div>
                  </div>
                )}

                {!isOfflineOrder(selectedOrder) && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Informasi Pengiriman & Pembayaran Online</h3>
                    <div className="rounded-xl border border-green-100 bg-green-50 p-4 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-600">Metode Pembayaran:</span><span className="font-medium text-gray-900 uppercase flex items-center gap-2"><CreditCard className="h-4 w-4 text-gray-500" />{selectedOrder.paymentMethod ? selectedOrder.paymentMethod.replace('_va', ' Virtual Account') : '-'}</span></div>
                      {selectedOrder.paymentNumber && <div className="flex justify-between"><span className="text-gray-600">Nomor Pembayaran (VA/QRIS):</span><span className="font-medium text-gray-900">{selectedOrder.paymentNumber}</span></div>}
                      {selectedOrder.shippingFee && selectedOrder.shippingFee > 0 && <div className="flex justify-between"><span className="text-gray-600">Ongkir:</span><span className="font-medium text-gray-900">{formatRupiah(selectedOrder.shippingFee)}</span></div>}
                      {selectedOrder.deliveryMethod === 'delivery' && <div className="flex justify-between"><span className="text-gray-600">Alamat Pengiriman:</span><span className="font-medium text-gray-900">{selectedOrder.shippingAddress || '-'}</span></div>}
                      {selectedOrder.deliveryMethod === 'delivery' && <div className="flex justify-between"><span className="text-gray-600">Zona:</span><span className="font-medium text-gray-900">{selectedOrder.shippingZone || '-'}</span></div>}
                      {selectedOrder.deliveryMethod === 'delivery' && <div className="flex justify-between"><span className="text-gray-600">Catatan Kurir:</span><span className="font-medium text-gray-900">{selectedOrder.shippingNotes || '-'}</span></div>}
                      {selectedOrder.expiredAt && <div className="flex justify-between"><span className="text-gray-600">Batas Pembayaran:</span><span className="font-medium text-gray-900">{new Date(selectedOrder.expiredAt).toLocaleString('id-ID')}</span></div>}
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-600" />
                    Daftar Item
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 text-gray-700">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Produk</th>
                          <th className="px-4 py-3 font-semibold">Jenis</th>
                          <th className="px-4 py-3 font-semibold text-center">Qty</th>
                          <th className="px-4 py-3 font-semibold text-right">Harga</th>
                          <th className="px-4 py-3 font-semibold text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedOrder.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{item.product.name}</td>
                            <td className="px-4 py-3 capitalize">{item.priceType}</td>
                            <td className="px-4 py-3 text-center">{item.quantity}</td>
                            <td className="px-4 py-3 text-right">{formatRupiah(item.price)}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{formatRupiah(item.price * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-2"><Wallet className="h-4 w-4 text-gray-500" />Subtotal Items:</span>
                    <span className="font-medium text-gray-900">{formatRupiah(selectedOrder.totalHarga - (selectedOrder.shippingFee || 0))}</span>
                  </div>
                  {selectedOrder.discount && selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Diskon:</span>
                      <span className="font-medium text-red-600">-{formatRupiah(selectedOrder.discount)}</span>
                    </div>
                  )}
                  {selectedOrder.shippingFee && selectedOrder.shippingFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ongkos Kirim:</span>
                      <span className="font-medium text-gray-900">{formatRupiah(selectedOrder.shippingFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                    <span className="text-gray-900">Total Keseluruhan:</span>
                    <span className="text-[#ffd700]">{formatRupiah(selectedOrder.totalHarga)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button className="flex-1 bg-gray-900 text-white" onClick={() => handlePrintOrder(selectedOrder)}><Printer className="h-4 w-4 mr-2" />Cetak Resi</Button>
                  
                  {['pending', 'expired', 'cancelled'].includes(selectedOrder.status) && (
                    <Button
                      className={`flex-1 bg-green-600 text-white ${['expired', 'cancelled'].includes(selectedOrder.status) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={['expired', 'cancelled'].includes(selectedOrder.status)}
                      onClick={() => updateOrderStatus(selectedOrder.id, 'paid')}
                    >
                      Set Sudah Dibayar
                    </Button>
                  )}
                  {selectedOrder.status === 'paid' && <Button className="flex-1 bg-blue-600 text-white" onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}>Set Diproses</Button>}
                  {selectedOrder.status === 'processing' && selectedOrder.deliveryMethod === 'delivery' && (
                    <div className="w-full space-y-2">
                      <select
                        className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                        value={selectedCourierId}
                        onChange={(e) => setSelectedCourierId(e.target.value)}
                      >
                        <option value="">Pilih kurir pengiriman</option>
                        {couriers.map((courier) => (
                          <option key={courier.id} value={courier.id}>
                            {courier.name} - {courier.phone}
                          </option>
                        ))}
                      </select>
                      <Button
                        className="w-full bg-orange-600 text-white"
                        onClick={() => {
                          const courierId = Number(selectedCourierId || selectedOrder.courierId || 0);
                          if (!courierId) {
                            toast.warning('Kurir belum dipilih', { description: 'Pilih kurir sebelum ubah status pengiriman.' });
                            return;
                          }
                          updateOrderStatus(selectedOrder.id, 'shipped', courierId);
                        }}
                      >
                        Set Dalam Pengiriman
                      </Button>
                    </div>
                  )}
                  {selectedOrder.status === 'processing' && selectedOrder.deliveryMethod !== 'delivery' && (
                    <Button className="flex-1 bg-purple-600 text-white" onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}>
                      Set Terkirim
                    </Button>
                  )}
                  {selectedOrder.status === 'shipped' && <Button className="flex-1 bg-purple-600 text-white" onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}>Set Terkirim</Button>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
