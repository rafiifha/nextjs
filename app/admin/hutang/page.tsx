'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { Plus, Edit, Trash2, CreditCard, Search, Filter, Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface Debt {
  id: number;
  customerName: string;
  customerPhone: string;
  amount: number;
  paidAmount: number;
  status: string;
  dueDate: string | null;
  createdAt: string;
}

export default function ManajemenHutangPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    amount: '',
    dueDate: '',
  });

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    try {
      const res = await fetch('/api/hutang');
      if (res.ok) {
        const data = await res.json();
        setDebts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching debts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const debtData = {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      amount: parseInt(formData.amount),
      dueDate: formData.dueDate || null,
    };

    try {
      if (editingDebt) {
        const res = await fetch(`/api/hutang/${editingDebt.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(debtData),
        });

        if (res.ok) {
          alert('Data hutang berhasil diupdate');
          resetForm();
          fetchDebts();
        } else {
          alert('Gagal mengupdate data hutang');
        }
      } else {
        const res = await fetch('/api/hutang', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(debtData),
        });

        if (res.ok) {
          alert('Data hutang berhasil ditambahkan');
          resetForm();
          fetchDebts();
        } else {
          alert('Gagal menambahkan data hutang');
        }
      }
    } catch (error) {
      console.error('Error saving debt:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setFormData({
      customerName: debt.customerName,
      customerPhone: debt.customerPhone,
      amount: debt.amount.toString(),
      dueDate: debt.dueDate ? new Date(debt.dueDate).toISOString().split('T')[0] : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus data hutang ini?')) return;

    try {
      const res = await fetch(`/api/hutang/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Data hutang berhasil dihapus');
        fetchDebts();
      } else {
        alert('Gagal menghapus data hutang');
      }
    } catch (error) {
      console.error('Error deleting debt:', error);
      alert('Terjadi kesalahan');
    }
  };

  const handlePayment = async (id: number, paidAmount: number) => {
    const debt = debts.find((d) => d.id === id);
    if (!debt) return;

    const newPaidAmount = debt.paidAmount + paidAmount;
    const newStatus =
      newPaidAmount >= debt.amount ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

    try {
      const res = await fetch(`/api/hutang/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paidAmount: newPaidAmount,
          status: newStatus,
        }),
      });

      if (res.ok) {
        alert('Pembayaran berhasil dicatat');
        fetchDebts();
      } else {
        alert('Gagal mencatat pembayaran');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Terjadi kesalahan');
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      amount: '',
      dueDate: '',
    });
    setEditingDebt(null);
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'unpaid':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'partial':
        return <Clock className="h-4 w-4" />;
      case 'unpaid':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const filteredDebts = debts.filter((debt) => {
    const matchesSearch =
      debt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debt.customerPhone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: debts.reduce((sum, d) => sum + d.amount, 0),
    paid: debts.reduce((sum, d) => sum + d.paidAmount, 0),
    unpaid: debts.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0),
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Hutang</h1>
          <p className="text-gray-600">Kelola piutang pelanggan</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Hutang
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">{formatRupiah(stats.total)}</div>
              <div className="text-sm text-gray-600">Total Hutang</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{formatRupiah(stats.paid)}</div>
              <div className="text-sm text-gray-600">Sudah Dibayar</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-1">{formatRupiah(stats.unpaid)}</div>
              <div className="text-sm text-gray-600">Belum Dibayar</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card className="mb-6 border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle>{editingDebt ? 'Edit Hutang' : 'Tambah Hutang Baru'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName">Nama Pelanggan</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Nomor Telepon</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Jumlah Hutang</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Tanggal Jatuh Tempo</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit">{editingDebt ? 'Update' : 'Tambah'}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Daftar Hutang</CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Cari nama atau telepon..."
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
                <option value="unpaid">Belum Lunas</option>
                <option value="partial">Sebagian</option>
                <option value="paid">Lunas</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : filteredDebts.length > 0 ? (
            <div className="space-y-3">
              {filteredDebts.map((debt) => (
                <Card key={debt.id} className="border-gray-200">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-gray-900">{debt.customerName}</h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(
                              debt.status
                            )}`}
                          >
                            {getStatusIcon(debt.status)}
                            {debt.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{debt.customerPhone}</p>
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total:</span>
                            <span className="font-medium">{formatRupiah(debt.amount)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Dibayar:</span>
                            <span className="font-medium text-green-600">{formatRupiah(debt.paidAmount)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Sisa:</span>
                            <span className="font-medium text-red-600">{formatRupiah(debt.amount - debt.paidAmount)}</span>
                          </div>
                          {debt.dueDate && (
                            <div className="text-xs text-gray-500">
                              Jatuh tempo: {new Date(debt.dueDate).toLocaleDateString('id-ID')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(debt)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const amount = prompt('Masukkan jumlah pembayaran:');
                            if (amount) {
                              handlePayment(debt.id, parseInt(amount));
                            }
                          }}
                          disabled={debt.status === 'paid'}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Bayar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(debt.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Hapus
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-gray-200">
              <CardContent className="pt-16 pb-16 text-center">
                <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-1">Belum ada data hutang</p>
                <p className="text-sm text-gray-500">Klik tombol "Tambah Hutang" untuk menambahkan data pertama</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

