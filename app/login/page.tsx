'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { cartService } from '@/lib/cart';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [redirectUrl] = useState(() => {
    if (typeof window === 'undefined') return '/';
    return new URLSearchParams(window.location.search).get('redirect') || '/';
  });
  const [successMessage] = useState(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('registered') === 'true' ? 'Registrasi berhasil! Silakan login dengan akun baru Anda.' : '';
  });
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('registered') === 'true') {
      toast.success('Registrasi Berhasil!', {
        description: 'Silakan login dengan akun baru Anda.',
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identifier,
          phone: identifier,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show user-friendly error message
        let errorMessage = data.error || 'Login gagal';
        
        // Handle specific error cases
        if (errorMessage.includes('database') || errorMessage.includes('database server')) {
          errorMessage = 'Tidak dapat terhubung ke database. Silakan coba lagi nanti.';
        } else if (errorMessage.includes('Email/Phone atau password salah')) {
          errorMessage = 'Email/Phone atau password salah. Silakan coba lagi.';
        }
        
        setError(errorMessage);
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Migrate cart from old key to user-specific key if needed
      if (data.user?.id) {
        cartService.migrateCartToUser(data.user.id);
      }

      // Dispatch custom event to notify Navbar
      window.dispatchEvent(new Event('userLogin'));
      
      // Also dispatch cartUpdated to refresh cart count
      window.dispatchEvent(new Event('cartUpdated'));

      if (data.user.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (data.user.role === 'kasir') {
        router.push('/admin/kasir');
      } else {
        router.push(redirectUrl !== '/' ? redirectUrl : '/produk');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      // Handle network errors
      if (err.message?.includes('fetch') || err.message?.includes('network')) {
        setError('Tidak dapat terhubung ke server. Pastikan server berjalan dan coba lagi.');
      } else {
        setError(err.message || 'Terjadi kesalahan saat login. Pastikan server berjalan.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#ffd700] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">Kembali ke Beranda</span>
        </Link>

        <Card className="border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Masuk ke Akun</CardTitle>
            <CardDescription className="text-gray-600">
              Masuk untuk melanjutkan ke Toko Naning
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <div className="p-3 mb-2 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="identifier">Email / Nomor WhatsApp</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="nama@email.com atau 0812..."
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              <div className="text-sm text-gray-600">
                Belum punya akun?{' '}
                <Link href="/register" className="text-[#ffd700] hover:underline font-medium">
                  Daftar sekarang
                </Link>
              </div>
              <div className="text-sm">
                <Link href="/lupa-password" className="text-gray-500 hover:text-[#ffd700] hover:underline">
                  Lupa Password?
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

