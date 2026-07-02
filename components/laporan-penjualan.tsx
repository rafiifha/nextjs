'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/utils';
import { Download, Calendar, TrendingUp, Package, DollarSign, ShoppingCart, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Order {
  id: number;
  customerName: string;
  status: string;
  totalHarga: number;
  createdAt: string;
  items: Array<{
    product: { name: string };
    quantity: number;
    price: number;
  }>;
}

export default function LaporanPenjualan() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Set default date range (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
    
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/pesanan?limit=1000000', { headers });
      if (res.ok) {
        const result = await res.json();
        let ordersData = [];
        if (Array.isArray(result)) {
          ordersData = result;
        } else if (result && Array.isArray(result.data)) {
          ordersData = result.data;
        }
        setOrders(ordersData);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  console.log('--- LaporanPenjualan Render ---', { ordersCount: orders.length, startDate, endDate });

  const filteredOrders = orders.filter((order) => {
    if (!startDate || !endDate) return true;
    const orderDate = new Date(order.createdAt);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);
    return orderDate >= start && orderDate <= end;
  });

  // Calculate statistics
  const stats = {
    totalRevenue: filteredOrders.reduce((sum, o) => sum + o.totalHarga, 0),
    totalOrders: filteredOrders.length,
    itemsSold: filteredOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0),
    averageOrderValue: filteredOrders.length > 0 
      ? filteredOrders.reduce((sum, o) => sum + o.totalHarga, 0) / filteredOrders.length 
      : 0,
  };

  // Daily sales data
  const dailySales = filteredOrders.reduce((acc: any, order) => {
    const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
    const dateDisplay = new Date(order.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    if (!acc[dateKey]) {
      acc[dateKey] = { dateKey, date: dateDisplay, revenue: 0, orders: 0 };
    }
    acc[dateKey].revenue += order.totalHarga;
    acc[dateKey].orders += 1;
    return acc;
  }, {});

  const dailySalesArray = Object.values(dailySales).sort((a: any, b: any) => 
    (a as any).dateKey.localeCompare((b as any).dateKey)
  );

  // Status breakdown
  const statusBreakdown = filteredOrders.reduce((acc: any, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.entries(statusBreakdown).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  // Top products
  const productSales = filteredOrders.reduce((acc: any, order) => {
    order.items.forEach((item) => {
      const productName = item.product.name;
      if (!acc[productName]) {
        acc[productName] = { name: productName, quantity: 0, revenue: 0 };
      }
      acc[productName].quantity += item.quantity;
      acc[productName].revenue += item.price * item.quantity;
    });
    return acc;
  }, {});

  const topProducts = Object.values(productSales)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 5);

  const COLORS = ['#ffd700', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const handleDownload = () => {
    const csvData = [
      ['ID Pesanan', 'Nama Pelanggan', 'Status', 'Total', 'Tanggal'],
      ...filteredOrders.map((order) => [
        order.id,
        order.customerName,
        order.status,
        order.totalHarga,
        new Date(order.createdAt).toLocaleString('id-ID'),
      ]),
    ];

    const csvContent = csvData.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan-penjualan-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
          <p className="text-gray-600">Memuat laporan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Laporan Penjualan</h1>
          <p className="text-gray-600">Analisis dan visualisasi data penjualan</p>
        </div>
        <Button onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download CSV
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card className="mb-6 border-gray-200 shadow-md">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <span className="text-gray-600">s/d</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-gray-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pendapatan</p>
                <p className="text-2xl font-bold text-gray-900">{formatRupiah(stats.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-[#ffd700]" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pesanan</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Item Terjual</p>
                <p className="text-2xl font-bold text-gray-900">{stats.itemsSold}</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200 shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Rata-rata Pesanan</p>
                <p className="text-2xl font-bold text-gray-900">{formatRupiah(stats.averageOrderValue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Daily Sales Chart */}
        <Card className="border-gray-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <CardTitle className="text-xl font-bold">Penjualan Harian</CardTitle>
            <CardDescription className="mt-1.5 text-sm text-gray-700">Grafik pendapatan per hari</CardDescription>
          </CardHeader>
          <CardContent>
            {dailySalesArray.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySalesArray}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => formatRupiah(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#ffd700" strokeWidth={2} name="Pendapatan" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Tidak ada data penjualan
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card className="border-gray-200 shadow-md">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
            <CardTitle className="text-xl font-bold">Breakdown Status Pesanan</CardTitle>
            <CardDescription className="mt-1.5 text-sm text-gray-700">Distribusi pesanan berdasarkan status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Tidak ada data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="border-gray-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
          <CardTitle className="text-xl font-bold">Produk Terlaris</CardTitle>
          <CardDescription className="mt-1.5 text-sm text-gray-700">Top 5 produk berdasarkan pendapatan</CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.map((product: any, index) => (
                <div key={product.name} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#ffd700]/20 flex items-center justify-center font-bold text-[#ffd700]">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-600">{product.quantity} item terjual</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatRupiah(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Tidak ada data produk
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

