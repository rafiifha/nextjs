'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [showOtp, setShowOtp] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    // We will do a simple check without isTokenValid here since we can't easily import it, or wait we can import it.
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (user.role === 'kasir') {
          router.push('/admin/kasir');
        } else if (user.role === 'kurir') {
          router.push('/kurir/pengiriman');
        } else {
          router.push('/produk');
        }
      } catch (e) {
        // abaikan error parsing
      }
    }
  }, [router]);

  // Meng-update hitung mundur waktu tunggu kirim ulang OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Langkah 1: Kirim kode OTP WhatsApp ke nomor pembeli untuk divalidasi
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validasi form awal
    if (!name) { setError('Nama harus diisi'); return; }
    if (!phone) { setError('Nomor WhatsApp harus diisi'); return; }
    if (password.length < 6) { setError('Password minimal 6 karakter'); return; }
    if (password !== confirmPassword) { setError('Password tidak cocok'); return; }

    setLoading(true);
    try {
      // Mengirim request ke API OTP send
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type: 'register' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal mengirim OTP'); return; }

      // Jika berhasil, tampilkan input kode OTP dan nyalakan timer 60 detik
      setShowOtp(true);
      setCountdown(60);
      setOtpCode('');
    } catch {
      setError('Terjadi kesalahan. Cek koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  // Langkah 2: Verifikasi kode OTP WhatsApp dan lakukan registrasi akun ke database
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otpCode.length !== 6) { setError('Masukkan 6 digit kode OTP'); return; }

    setLoading(true);
    try {
      // 1. Kirim request verifikasi OTP ke server
      const verifyRes = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otpCode, type: 'register' }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) { setError(verifyData.error || 'Verifikasi gagal'); return; }

      // 2. Jika OTP valid, buat akun baru di database dengan request register
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, ...(email && { email }), password }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) { setError(regData.error || 'Registrasi gagal'); return; }

      // Redirect ke halaman login dengan query params registered=true
      router.push('/login?registered=true');
    } catch {
      setError('Terjadi kesalahan saat registrasi.');
    } finally {
      setLoading(false);
    }
  };

  // Mengirim ulang kode OTP WhatsApp jika waktu hitung mundur telah habis
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type: 'register' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal mengirim ulang'); return; }
      setCountdown(60);
      setOtpCode('');
    } catch {
      setError('Terjadi kesalahan.');
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
            <CardTitle className="text-2xl font-bold text-gray-900">Daftar Akun Baru</CardTitle>
            <CardDescription className="text-gray-600">
              Buat akun untuk mulai berbelanja di Toko Naning
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showOtp ? (
              /* Form utama */
              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <Input id="name" type="text" placeholder="Nama lengkap" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div>
                  <Label htmlFor="phone">Nomor WhatsApp</Label>
                  <Input id="phone" type="tel" placeholder="081234567890" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>

                <div>
                  <Label htmlFor="email">Email <span className="text-gray-400 font-normal text-xs">(opsional)</span></Label>
                  <Input id="email" type="email" placeholder="nama@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
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

                <div>
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Ulangi password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim kode verifikasi...</> : 'Daftar'}
                </Button>
              </form>
            ) : (
              /* Verifikasi OTP */
              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm text-center">
                  Kode verifikasi telah dikirim ke WhatsApp <strong>{phone}</strong>
                </div>

                <div>
                  <Label htmlFor="otp">Kode Verifikasi</Label>
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="Masukkan 6 digit kode"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-lg tracking-[0.5em] font-mono"
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">{error}</div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memverifikasi...</> : 'Verifikasi & Daftar'}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={() => { setShowOtp(false); setError(''); }} className="text-gray-500 hover:text-gray-700">
                    ← Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || loading}
                    className={`font-medium ${countdown > 0 ? 'text-gray-400' : 'text-[#ffd700] hover:underline'}`}
                  >
                    {countdown > 0 ? `Kirim ulang (${countdown}s)` : 'Kirim ulang'}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-gray-600">
              Sudah punya akun?{' '}
              <Link href="/login" className="text-[#ffd700] hover:underline font-medium">Masuk sekarang</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
