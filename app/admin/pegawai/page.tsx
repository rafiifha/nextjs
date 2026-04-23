'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Truck, KeyRound, Phone, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: number;
  name: string;
  phone: string | null;
}

interface Courier {
  id: number;
  name: string;
  phone: string;
}

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
  const { toast } = useToast();

  const getToken = () => localStorage.getItem('token');

  const fetchData = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const [cashierRes, courierRes] = await Promise.all([
        fetch('/api/auth/employees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/delivery/couriers'),
      ]);

      if (cashierRes.ok) setCashiers(await cashierRes.json());
      if (courierRes.ok) setCouriers(await courierRes.json());
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      toast({ variant: 'success', title: 'Kasir ditambahkan', description: 'Akun kasir baru berhasil dibuat.' });
    } catch (error: any) {
      toast({ variant: 'error', title: 'Gagal tambah kasir', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const openResetPasswordModal = (cashier: Employee) => {
    setResetTarget(cashier);
    setNewPassword('');
    setResetModalOpen(true);
  };

  const resetPassword = async () => {
    const token = getToken();
    if (!token || !resetTarget) return;
    if (!newPassword.trim()) {
      toast({ variant: 'warning', title: 'Password kosong', description: 'Isi password baru dulu.' });
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
        toast({ variant: 'error', title: 'Gagal reset password', description: (await res.json()).error || 'Terjadi kesalahan' });
        return;
      }
      setResetModalOpen(false);
      setResetTarget(null);
      setNewPassword('');
      toast({ variant: 'success', title: 'Password direset', description: 'Password kasir berhasil diperbarui.' });
    } finally {
      setResetLoading(false);
    }
  };

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
      toast({ variant: 'success', title: 'Kurir ditambahkan', description: 'Kurir baru berhasil masuk daftar.' });
    } catch (error: any) {
      toast({ variant: 'error', title: 'Gagal tambah kurir', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const deactivateCourier = async (id: number) => {
    const res = await fetch(`/api/delivery/couriers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast({ variant: 'error', title: 'Gagal nonaktifkan kurir', description: (await res.json()).error || 'Terjadi kesalahan' });
      return;
    }
    await fetchData();
    toast({ variant: 'success', title: 'Kurir dinonaktifkan', description: 'Kurir berhasil dipindah dari daftar aktif.' });
  };

  const tabStyle = (key: 'kasir' | 'kurir') =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      activeTab === key
        ? 'bg-[#ffd700] text-gray-900 shadow-sm'
        : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
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
                    <Button variant="outline" onClick={() => openResetPasswordModal(cashier)}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Reset Password
                    </Button>
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

            {loadingData ? (
              <p className="text-sm text-gray-500">Memuat data kurir...</p>
            ) : (
              <div className="space-y-2">
                {couriers.map((courier) => (
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
                    <Button variant="outline" onClick={() => deactivateCourier(courier.id)}>Nonaktifkan</Button>
                  </div>
                ))}
                {couriers.length === 0 && <p className="text-sm text-gray-500">Belum ada kurir aktif.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
