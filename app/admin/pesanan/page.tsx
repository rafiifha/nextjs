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
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ITEMS_PER_PAGE = 10;

  // Mengambil daftar pesanan dari API dengan paginasi, pencarian, dan filter status
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

  // Saat komponen dimuat pertama kali, ambil data pesanan dan daftar kurir
  useEffect(() => {
    fetchOrders();
    fetchCouriers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mengambil daftar kurir aktif dari API untuk keperluan penugasan pengiriman
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

  // Memperbarui status pesanan melalui API PUT, lalu refresh data pesanan
  const updateOrderStatus = async (orderId: number, newStatus: string, courierId?: number) => {
    setActionLoading(newStatus);
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
        // Ambil data terbaru untuk memperbarui detail modal yang sedang terbuka
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
    } finally {
      setActionLoading(null);
    }
  };

  // Mengecek apakah pesanan ini adalah transaksi offline (pickup + tunai + tanpa ongkir)
  const isOfflineOrder = (order: Order) => {
    return order.deliveryMethod === 'pickup' && (!order.shippingFee || order.shippingFee === 0) && order.paymentMethod === 'tunai';
  };

  // Menerjemahkan status bahasa Inggris ke bahasa Indonesia untuk ditampilkan di UI
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

  // Mengembalikan class CSS warna badge sesuai status pesanan
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

  // Mengembalikan class CSS warna pill sesuai status pesanan
  const getStatusPill = (status: string) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (status === 'paid') return 'bg-green-100 text-green-700 border-green-300';
    if (status === 'processing') return 'bg-blue-100 text-blue-700 border-blue-300';
    if (status === 'shipped') return 'bg-orange-100 text-orange-700 border-orange-300';
    if (status === 'delivered') return 'bg-purple-100 text-purple-700 border-purple-300';
    if (status === 'cancelled') return 'bg-red-100 text-red-700 border-red-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  // Mencetak struk pesanan. Jika pesanan online berstatus 'paid', otomatis update ke 'processing' terlebih dahulu.
  const handlePrintOrder = async (order: Order) => {
    if (['cancelled', 'expired'].includes(order.status)) {
      toast.error('Tidak Dapat Mencetak Struk', {
        description: 'Pesanan yang telah dibatalkan tidak dapat dicetak struknya.',
      });
      return;
    }

    setActionLoading('print');
    let newStatus: string | null = null;
    
    // 1. Ambil di tempat (pickup) & bayar di tempat (tunai) -> otomatis jadi 'paid'
    if (order.deliveryMethod === 'pickup' && order.paymentMethod === 'tunai' && order.status === 'pending') {
      newStatus = 'paid';
    } 
    // 2. Pesanan lainnya yang sudah dibayar -> otomatis 'processing' (Diproses)
    else if (!isOfflineOrder(order) && order.status === 'paid') {
      newStatus = 'processing';
    }

    if (newStatus) {
      try {
        const res = await fetch(`/api/pesanan/${order.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
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
            order = updatedOrder; // Memperbarui data untuk struk jika diperlukan
          }
        }
      } catch (error) {
        console.error('Error updating status:', error);
      }
    }

    // Menyusun HTML struk belanja dari data item pesanan
    const itemsHtml = order.items.map(item => `
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;width:100%;gap:4px;">
        <div style="flex:1;">
          <div style="font-weight:600;word-break:break-word;">${item.product.name}</div>
          <div style="font-size:8px;color:#555;">${item.priceType.charAt(0).toUpperCase() + item.priceType.slice(1)} x ${item.quantity}</div>
        </div>
        <div style="text-align:right;font-weight:600;white-space:nowrap;align-self:flex-end;flex:0 0 auto;">Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</div>
      </div>
    `).join('');

    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const discountHtml = order.discount && order.discount > 0 ? `<div class="row"><span>Diskon:</span><span style="color:red;">-Rp ${order.discount.toLocaleString('id-ID')}</span></div>` : '';
    const shippingHtml = order.shippingFee && order.shippingFee > 0 ? `<div class="row"><span>Ongkir:</span><span>Rp ${order.shippingFee.toLocaleString('id-ID')}</span></div>` : '';
    const cashHtml = order.cashReceived && order.cashReceived > 0 ? `
      <div class="row"><span>Uang Diterima:</span><span>Rp ${order.cashReceived.toLocaleString('id-ID')}</span></div>
      ${order.change && order.change > 0 ? `<div class="row"><span>Kembalian:</span><span style="color:green;">Rp ${order.change.toLocaleString('id-ID')}</span></div>` : ''}
    ` : '';
    const deliveryHtml = order.deliveryMethod === 'delivery' ? `<div class="row"><span>Pengiriman:</span><span style="font-weight:600;">Delivery</span></div>` : '';
    const addressHtml = order.shippingAddress ? `<div class="row"><span>Alamat:</span><span style="font-weight:600;font-size:8px;">${order.shippingAddress}</span></div>` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          html, body { margin: 0; padding: 0; width: 58mm; background: #fff; }
          * { box-sizing: border-box; font-family: 'Arial', sans-serif; }
          body { font-size: 9px; padding: 2mm 4mm; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; width: 100%; }
          .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; width: 100%; gap: 2px; }
          .row > span:first-child { flex: 0 0 auto; }
          .row > span:last-child { flex: 1 1 auto; text-align: right; word-break: break-word; }
          .title { font-size: 13px; font-weight: bold; margin-bottom: 2px; }
          .small { font-size: 8px; color: #555; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; padding-top: 4px; border-top: 1px dashed #000; width: 100%; }
          .total-row > span:last-child { text-align: right; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title" style="font-size:14px;letter-spacing:0.5px;">TOKO NANING</div>
          <div class="small" style="margin-bottom:2px;font-size:7.5px;line-height:1.2;">Jl. Raya Cicalengka - Majalaya KM 1, Cikuya, Cicalengka</div>
          <div class="divider"></div>
          <div class="bold" style="font-size:10px;margin-bottom:2px;letter-spacing:0.5px;">STRUK PEMBELIAN</div>
          <div class="small">${new Date(order.createdAt).toLocaleString('id-ID')}</div>
        </div>
        <div class="divider"></div>
        <div class="row"><span>No. Pesanan:</span><span class="bold">#${order.id}</span></div>
        <div class="row"><span>Pelanggan:</span><span class="bold">${order.customerName}</span></div>
        <div class="row"><span>Telepon:</span><span class="bold">${order.customerPhone}</span></div>
        <div class="row"><span>Pembayaran:</span><span class="bold">${order.paymentMethod ? order.paymentMethod.replace('_va', ' VA').toUpperCase() : '-'}</span></div>
        <div class="row"><span>Status:</span><span class="bold">${getStatusIndonesian(order.status)}</span></div>
        ${deliveryHtml}
        ${addressHtml}
        <div class="divider"></div>
        ${itemsHtml}
        <div class="divider"></div>
        <div class="row"><span>Total Qty:</span><span class="bold">${totalItems} Item</span></div>
        <div class="row"><span>Subtotal:</span><span class="bold">Rp ${subtotal.toLocaleString('id-ID')}</span></div>
        ${discountHtml}
        ${shippingHtml}
        ${cashHtml}
        <div class="total-row"><span>Total:</span><span>Rp ${order.totalHarga.toLocaleString('id-ID')}</span></div>
        <div class="divider" style="margin-top:6px;"></div>
        <div class="center small" style="margin-top:4px;">
          <div>Produk yang sudah dibeli tidak dapat ditukar/dikembalikan</div>
          <div style="margin-top:3px;font-weight:bold;">Terima Kasih Atas Kunjungan Anda</div>
        </div>
      </body>
      </html>
    `;

    // Print via hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();

        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
            setActionLoading(null);
          }, 1000);
        }, 300);
      } else {
        setActionLoading(null);
      }
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
                    <div className="rounded-xl border border-green-200 bg-green-50/50 overflow-hidden text-sm">
                      <div className="divide-y divide-green-200/60">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 p-4">
                          <span className="text-gray-600 whitespace-nowrap">Metode Pembayaran</span>
                          <span className="font-medium text-gray-900 uppercase flex items-center gap-2 sm:text-right">
                            <CreditCard className="h-4 w-4 text-gray-500" />
                            {selectedOrder.paymentMethod ? selectedOrder.paymentMethod.replace('_va', ' Virtual Account') : '-'}
                          </span>
                        </div>

                        {selectedOrder.paymentNumber && (
                          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 sm:gap-4 p-4 bg-green-100/40">
                            <span className="text-gray-700 whitespace-nowrap font-medium">Nomor Pembayaran</span>
                            <div className="font-mono text-sm sm:text-base font-bold text-green-800 bg-white px-3 py-1.5 rounded-md border border-green-300 shadow-sm break-all sm:text-right max-w-full">
                              {selectedOrder.paymentNumber}
                            </div>
                          </div>
                        )}

                        {selectedOrder.shippingFee !== null && selectedOrder.shippingFee > 0 && (
                          <div className="flex justify-between gap-4 p-4">
                            <span className="text-gray-600">Ongkir</span>
                            <span className="font-medium text-gray-900 text-right">{formatRupiah(selectedOrder.shippingFee)}</span>
                          </div>
                        )}

                        {selectedOrder.deliveryMethod === 'delivery' && (
                          <>
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 p-4">
                              <span className="text-gray-600 whitespace-nowrap">Alamat Pengiriman</span>
                              <span className="font-medium text-gray-900 sm:text-right break-words">{selectedOrder.shippingAddress || '-'}</span>
                            </div>
                            <div className="flex justify-between gap-4 p-4">
                              <span className="text-gray-600">Zona</span>
                              <span className="font-medium text-gray-900 text-right">{selectedOrder.shippingZone || '-'}</span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 p-4">
                              <span className="text-gray-600 whitespace-nowrap">Catatan Kurir</span>
                              <span className="font-medium text-gray-900 sm:text-right break-words">{selectedOrder.shippingNotes || '-'}</span>
                            </div>
                          </>
                        )}

                        {selectedOrder.expiredAt && (
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 p-4">
                            <span className="text-gray-600 whitespace-nowrap">Batas Pembayaran</span>
                            <span className="font-medium text-red-600 sm:text-right">{new Date(selectedOrder.expiredAt).toLocaleString('id-ID')}</span>
                          </div>
                        )}
                      </div>
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
                  {( (isOfflineOrder(selectedOrder) && selectedOrder.status === 'pending') || (!isOfflineOrder(selectedOrder) && selectedOrder.status === 'paid') ) && (
                    <Button 
                      className="flex-1 bg-gray-900 text-white" 
                      onClick={() => handlePrintOrder(selectedOrder)}
                      disabled={actionLoading === 'print'}
                    >
                      {actionLoading === 'print' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                      {actionLoading === 'print' ? 'Mencetak...' : 'Cetak Struk'}
                    </Button>
                  )}
                  
                  {['pending', 'expired', 'cancelled'].includes(selectedOrder.status) && !isOfflineOrder(selectedOrder) && (
                    <Button
                      className={`flex-1 bg-green-600 text-white ${['expired', 'cancelled'].includes(selectedOrder.status) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={['expired', 'cancelled'].includes(selectedOrder.status) || actionLoading === 'paid'}
                      onClick={() => updateOrderStatus(selectedOrder.id, 'paid')}
                    >
                      {actionLoading === 'paid' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Set Sudah Dibayar
                    </Button>
                  )}
                  {selectedOrder.status === 'paid' && !isOfflineOrder(selectedOrder) && selectedOrder.deliveryMethod !== 'delivery' && (
                    <Button 
                      className="flex-1 bg-blue-600 text-white" 
                      onClick={() => updateOrderStatus(selectedOrder.id, 'processing')}
                      disabled={actionLoading === 'processing'}
                    >
                      {actionLoading === 'processing' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Set Diproses
                    </Button>
                  )}
                  {selectedOrder.status === 'processing' && selectedOrder.deliveryMethod === 'delivery' && (
                    <div className="w-full space-y-2">
                      <select
                        className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
                        value={selectedCourierId}
                        onChange={(e) => setSelectedCourierId(e.target.value)}
                        disabled={actionLoading === 'shipped'}
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
                        disabled={actionLoading === 'shipped'}
                        onClick={() => {
                          const courierId = Number(selectedCourierId || selectedOrder.courierId || 0);
                          if (!courierId) {
                            toast.warning('Kurir belum dipilih', { description: 'Pilih kurir sebelum ubah status pengiriman.' });
                            return;
                          }
                          updateOrderStatus(selectedOrder.id, 'shipped', courierId);
                        }}
                      >
                        {actionLoading === 'shipped' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Set Dalam Pengiriman
                      </Button>
                    </div>
                  )}
                  {selectedOrder.status === 'processing' && selectedOrder.deliveryMethod !== 'delivery' && !isOfflineOrder(selectedOrder) && (
                    <Button 
                      className="flex-1 bg-purple-600 text-white" 
                      onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                      disabled={actionLoading === 'delivered'}
                    >
                      {actionLoading === 'delivered' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Set Terkirim
                    </Button>
                  )}
                  {selectedOrder.status === 'shipped' && !isOfflineOrder(selectedOrder) && (
                    <Button 
                      className="flex-1 bg-purple-600 text-white" 
                      onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                      disabled={actionLoading === 'delivered'}
                    >
                      {actionLoading === 'delivered' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Set Terkirim
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
