'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { cartService } from '@/lib/cart';

export default function LoginPage() {
  const router = useRouter();
  const [redirectUrl] = useState(() => {
    if (typeof window === 'undefined') return '/';
    return new URLSearchParams(window.location.search).get('redirect') || '/';
  });
  const [loginType, setLoginType] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [loginType]: loginType === 'email' ? email : phone,
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
        router.push(redirectUrl);
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
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setLoginType('email')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginType === 'email'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setLoginType('phone')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginType === 'phone'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                WhatsApp
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {loginType === 'email' ? (
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="phone">Nomor WhatsApp</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="081234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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

            <div className="mt-6 text-center text-sm text-gray-600">
              Belum punya akun?{' '}
              <Link href="/register" className="text-[#ffd700] hover:underline font-medium">
                Daftar sekarang
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

