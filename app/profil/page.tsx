'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Phone, Lock } from 'lucide-react';

export default function ProfilPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login?redirect=/profil');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setFormData(prev => ({
        ...prev,
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
      }));
      setLoading(false);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({ variant: 'error', title: 'Error', description: 'Nama tidak boleh kosong' });
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast({ variant: 'error', title: 'Error', description: 'Password dan Konfirmasi Password tidak cocok' });
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        id: user.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        ...(formData.password ? { password: formData.password } : {})
      };

      const res = await fetch('/api/user/profil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memperbarui profil');
      }

      // Update local storage
      localStorage.setItem('user', JSON.stringify(data));
      window.dispatchEvent(new Event('userLogin')); // To update navbar

      toast({
        variant: 'success',
        title: 'Berhasil',
        description: 'Profil berhasil diperbarui'
      });
      
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));

    } catch (error: any) {
      toast({
        variant: 'error',
        title: 'Gagal',
        description: error.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ffd700]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <User className="h-6 w-6 text-[#ffd700]" />
              Edit Profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Nama Lengkap</Label>
                  <div className="relative mt-1">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Email</Label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10"
                      placeholder="opsional"
                    />
                  </div>
                </div>

                <div>
                  <Label>Nomor WhatsApp</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10"
                      placeholder="opsional"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Ubah Password (kosongkan jika tidak ingin diubah)</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Password Baru</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          name="password"
                          type="password"
                          value={formData.password}
                          onChange={handleChange}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Konfirmasi Password Baru</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          name="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-[#ffd700] hover:bg-[#e6c200] text-black"
                  disabled={submitting}
                >
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                  ) : (
                    'Simpan Profil'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
