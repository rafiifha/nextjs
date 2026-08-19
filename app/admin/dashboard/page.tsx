'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LaporanPenjualan from '@/components/laporan-penjualan';

/**
 * Halaman Dashboard Admin.
 * Menampilkan komponen Laporan Penjualan yang berisi ringkasan statistik dan grafik penjualan.
 * Memerlukan autentikasi (token JWT) sebelum dapat diakses.
 */
export default function AdminDashboard() {
  const router = useRouter();

  // Mengecek autentikasi: jika tidak ada token JWT di localStorage, redirect ke halaman login
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto">
        {/* Komponen laporan penjualan yang menampilkan statistik dan grafik */}
        <LaporanPenjualan />
      </div>
    </div>
  );
}
