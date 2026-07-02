'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function LupaPasswordPage() {
  const [showOtp, setShowOtp] = useState(false);
  const [success, setSuccess] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Submit form → kirim OTP
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier) { setError('Nomor WhatsApp harus diisi'); return; }
    if (newPassword.length < 6) { setError('Password baru minimal 6 karakter'); return; }
    if (newPassword !== confirmPassword) { setError('Password tidak cocok'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: identifier, type: 'forgot_password' }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal mengirim OTP'); return; }

      setShowOtp(true);
      setCountdown(60);
      setOtpCode('');
    } catch {
      setError('Terjadi kesalahan. Cek koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  // Verifikasi OTP → reset password
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otpCode.length !== 6) { setError('Masukkan 6 digit kode OTP'); return; }

    setLoading(true);
    try {
      // 1. Verify OTP
      const verifyRes = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: identifier, code: otpCode, type: 'forgot_password' }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) { setError(verifyData.error || 'Verifikasi gagal'); return; }

      // 2. Reset password
      const resetRes = await fetch('/api/auth/lupa-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, newPassword }),
      });
      const resetData = await resetRes.json();
      if (!resetRes.ok) { setError(resetData.error || 'Gagal mereset password'); return; }

      setSuccess(true);
    } catch {
      setError('Terjadi kesalahan. Cek koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: identifier, type: 'forgot_password' }),
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
          href="/login"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-[#ffd700] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">Kembali ke Login</span>
        </Link>

        <Card className="border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Lupa Password</CardTitle>
            <CardDescription className="text-gray-600">
              {success ? 'Password berhasil diubah' : 'Masukkan nomor WhatsApp dan password baru Anda'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              /* Sukses */
              <div className="text-center py-4 space-y-4">
                <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
                <h3 className="text-lg font-bold text-gray-900">Password Berhasil Diubah!</h3>
                <p className="text-gray-600 text-sm">Silakan login dengan password baru Anda.</p>
                <Link href="/login">
                  <Button className="w-full mt-2 bg-[#ffd700] text-black hover:bg-[#e6c200]">
                    Login Sekarang
                  </Button>
                </Link>
              </div>
            ) : !showOtp ? (
              /* Form utama */
              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div>
                  <Label htmlFor="identifier">Nomor WhatsApp</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="081234567890"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                  <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Ulangi password baru"
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

                <Button type="submit" className="w-full bg-[#ffd700] text-black hover:bg-[#e6c200]" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim kode verifikasi...</> : 'Lanjutkan'}
                </Button>
              </form>
            ) : (
              /* Verifikasi OTP */
              <form onSubmit={handleVerifyAndReset} className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm text-center">
                  Kode verifikasi telah dikirim ke WhatsApp <strong>{identifier}</strong>
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

                <Button type="submit" className="w-full bg-[#ffd700] text-black hover:bg-[#e6c200]" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Memproses...</> : 'Verifikasi & Ubah Password'}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
