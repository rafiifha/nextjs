'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingBag, LogOut } from 'lucide-react';
import { isTokenValid } from '@/lib/utils';

/**
 * Layout Kurir Panel - Simple, Clean, & Minimalis.
 */
export default function KurirLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr || !isTokenValid(token)) {
      if (token && !isTokenValid(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      if (userData.role !== 'kurir') {
        router.push('/');
        return;
      }
      setUser(userData);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('userLogout'));
    router.push('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/kurir/pengiriman" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#ffd700] text-gray-950 flex items-center justify-center font-bold text-sm">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm sm:text-base leading-tight">
                Toko Naning
              </div>
              <div className="text-xs text-gray-500 font-medium">Panel Kurir</div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs">
              <p className="font-semibold text-gray-900">{user.name}</p>
              <p className="text-gray-500 text-[11px]">{user.phone || 'Kurir'}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs h-8 px-2.5"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Keluar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>
    </div>
  );
}
