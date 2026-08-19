'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Truck, KeyRound, Phone, User, Trash2, RotateCcw, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  id: number;
  name: string;
  phone: string | null;
}

interface Courier {
  id: number;
  name: string;
  phone: string;
  isActive: boolean;
}

/**
 * Halaman Manajemen Pegawai.
 * Mengelola akun kasir (tambah, hapus, reset password) dan kurir (tambah, aktifkan/nonaktifkan).
 */
export default function PegawaiPage() {
  const [activeTab, setActiveTab] = useState<'kasir' | 'kurir'>('kasir');
  const [cashiers, setCashiers] = useState<Employee[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [cashierForm, setCashierForm] = useState({ name: '', phone: '', password: '' });
  const [courierForm, setCourierForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [courierTab, setCourierTab] = useState<'aktif' | 'nonaktif'>('aktif');

  // Mengambil token JWT dari localStorage untuk autentikasi API
  const getToken = () => localStorage.getItem('token');

  // Mengambil data kasir dan kurir secara paralel dari API
  const fetchData = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const [cashierRes, courierRes] = await Promise.all([
        fetch('/api/auth/employees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/delivery/couriers?all=true'),
      ]);

      if (cashierRes.ok) setCashiers(await cashierRes.json());
      if (courierRes.ok) setCouriers(await courierRes.json());
    } finally {
      setLoadingData(false);
    }
  };

  // Saat komponen dimuat, ambil data pegawai
  useEffect(() => {
    fetchData();
  }, []);

  // Membuat akun kasir baru melalui API
  const createCashier = async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(cashierForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal tambah kasir');
      setCashierForm({ name: '', phone: '', password: '' });
      await fetchData();
      toast.success('Kasir ditambahkan', { description: 'Akun kasir baru berhasil dibuat.' });
    } catch (error: any) {
      toast.error('Gagal tambah kasir', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Menghapus akun kasir berdasarkan ID
  const deleteCashier = async (id: number) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`/api/auth/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        toast.error('Gagal hapus kasir', { description: (await res.json()).error || 'Terjadi kesalahan' });
        return;
      }
      await fetchData();
      toast.success('Kasir dihapus', { description: 'Akun kasir berhasil dihapus.' });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // Membuka modal reset password kasir
  const openResetPasswordModal = (cashier: Employee) => {
    setResetTarget(cashier);
    setNewPassword('');
    setResetModalOpen(true);
  };

  // Mereset password kasir melalui API
  const resetPassword = async () => {
    const token = getToken();
    if (!token || !resetTarget) return;
    if (!newPassword.trim()) {
      toast.warning('Password kosong', { description: 'Isi password baru dulu.' });
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: resetTarget.id, newPassword }),
      });

      if (!res.ok) {
        toast.error('Gagal reset password', { description: (await res.json()).error || 'Terjadi kesalahan' });
        return;
      }
      setResetModalOpen(false);
      setResetTarget(null);
      setNewPassword('');
      toast.success('Password direset', { description: 'Password kasir berhasil diperbarui.' });
    } finally {
      setResetLoading(false);
    }
  };

  // Menambahkan kurir baru melalui API
  const createCourier = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/delivery/couriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courierForm),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Gagal tambah kurir');
      setCourierForm({ name: '', phone: '' });
      await fetchData();
      toast.success('Kurir ditambahkan', { description: 'Kurir baru berhasil masuk daftar.' });
    } catch (error: any) {
      toast.error('Gagal tambah kurir', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Mengaktifkan atau menonaktifkan kurir (soft delete)
  const toggleCourierStatus = async (id: number, activate: boolean) => {
    try {
      const res = await fetch(`/api/delivery/couriers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: activate }),
      });
      if (!res.ok) {
        toast.error(activate ? 'Gagal aktifkan kurir' : 'Gagal nonaktifkan kurir', {
          description: (await res.json()).error || 'Terjadi kesalahan',
        });
        return;
      }
      await fetchData();
      toast.success(activate ? 'Kurir diaktifkan' : 'Kurir dinonaktifkan', {
        description: activate
          ? 'Kurir berhasil diaktifkan kembali.'
          : 'Kurir berhasil dipindah dari daftar aktif.',
      });
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  // Memisahkan kurir aktif dan nonaktif untuk tampilan tab
  const activeCouriers = couriers.filter((c) => c.isActive);
  const inactiveCouriers = couriers.filter((c) => !c.isActive);

  const tabStyle = (key: 'kasir' | 'kurir') =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      activeTab === key
        ? 'bg-[#ffd700] text-gray-900 shadow-sm'
        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
    }`;

  const courierTabStyle = (key: 'aktif' | 'nonaktif') =>
    `rounded-md px-3 py-1.5 text-xs font-medium transition ${
      courierTab === key
        ? 'bg-gray-900 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Kelola Pegawai</h1>
        <p className="text-sm text-gray-600">Manajemen akun kasir dan data kurir pengiriman.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveTab('kasir')} className={tabStyle('kasir')}>Kasir</button>
        <button onClick={() => setActiveTab('kurir')} className={tabStyle('kurir')}>Kurir</button>
      </div>

      {activeTab === 'kasir' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#ffd700]" />
              Manajemen Kasir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-3">
              <div>
                <Label>Nama</Label>
                <Input value={cashierForm.name} onChange={(e) => setCashierForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>No. HP</Label>
                <Input value={cashierForm.phone} onChange={(e) => setCashierForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={cashierForm.password} onChange={(e) => setCashierForm((p) => ({ ...p, password: e.target.value }))} />
              </div>
            </div>
            <Button disabled={loading} onClick={createCashier}>Tambah Kasir</Button>

            {loadingData ? (
              <p className="text-sm text-gray-500">Memuat data kasir...</p>
            ) : (
              <div className="space-y-2">
                {cashiers.map((cashier) => (
                  <div key={cashier.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 p-3">
                    <div>
                      <p className="flex items-center gap-2 font-medium text-gray-900">
                        <User className="h-4 w-4 text-gray-500" />
                        {cashier.name}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-500" />
                        {cashier.phone || '-'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openResetPasswordModal(cashier)}>
                        <KeyRound className="mr-1 h-4 w-4" />
                        Reset Password
                      </Button>
                      {deleteConfirmId === cashier.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={() => deleteCashier(cashier.id)}>
                            Ya, Hapus
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                            Batal
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleteConfirmId(cashier.id)}>
                          <Trash2 className="mr-1 h-4 w-4" />
                          Hapus
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {cashiers.length === 0 && <p className="text-sm text-gray-500">Belum ada akun kasir.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#ffd700]" />
              Manajemen Kurir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-2">
              <div>
                <Label>Nama</Label>
                <Input value={courierForm.name} onChange={(e) => setCourierForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>No. HP</Label>
                <Input value={courierForm.phone} onChange={(e) => setCourierForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <Button disabled={loading} onClick={createCourier}>Tambah Kurir</Button>

            {/* Sub-tabs: Aktif / Nonaktif */}
            <div className="flex gap-2 border-b border-gray-200 pb-2">
              <button onClick={() => setCourierTab('aktif')} className={courierTabStyle('aktif')}>
                Aktif ({activeCouriers.length})
              </button>
              <button onClick={() => setCourierTab('nonaktif')} className={courierTabStyle('nonaktif')}>
                Nonaktif ({inactiveCouriers.length})
              </button>
            </div>

            {loadingData ? (
              <p className="text-sm text-gray-500">Memuat data kurir...</p>
            ) : courierTab === 'aktif' ? (
              <div className="space-y-2">
                {activeCouriers.map((courier) => (
                  <div key={courier.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 p-3">
                    <div>
                      <p className="flex items-center gap-2 font-medium text-gray-900">
                        <User className="h-4 w-4 text-gray-500" />
                        {courier.name}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-gray-500" />
                        {courier.phone}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => toggleCourierStatus(courier.id, false)}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Nonaktifkan
                    </Button>
                  </div>
                ))}
                {activeCouriers.length === 0 && <p className="text-sm text-gray-500">Belum ada kurir aktif.</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {inactiveCouriers.map((courier) => (
                  <div key={courier.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-opacity-50 border-gray-300 bg-gray-50 p-3">
                    <div>
                      <p className="flex items-center gap-2 font-medium text-gray-500">
                        <User className="h-4 w-4 text-gray-400" />
                        {courier.name}
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">Nonaktif</span>
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-gray-400">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {courier.phone}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 hover:bg-green-50 hover:text-green-700"
                      onClick={() => toggleCourierStatus(courier.id, true)}
                    >
                      <RotateCcw className="mr-1 h-4 w-4" />
                      Aktifkan Kembali
                    </Button>
                  </div>
                ))}
                {inactiveCouriers.length === 0 && <p className="text-sm text-gray-500">Tidak ada kurir nonaktif.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">Reset Password Kasir</h3>
            <p className="mt-1 text-sm text-gray-600">
              Kasir: <span className="font-medium text-gray-900">{resetTarget.name}</span>
            </p>
            <div className="mt-4 space-y-2">
              <Label>Password Baru</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResetModalOpen(false);
                  setResetTarget(null);
                  setNewPassword('');
                }}
              >
                Batal
              </Button>
              <Button disabled={resetLoading} onClick={resetPassword}>
                Simpan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
