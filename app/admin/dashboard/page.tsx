'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LaporanPenjualan from '@/components/laporan-penjualan';

export default function AdminDashboard() {
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto">
        <LaporanPenjualan />
      </div>
    </div>
  );
}
