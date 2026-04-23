'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Menu,
  X,
  LogOut,
  ShoppingBag,
  MessageSquare,
  Users
} from 'lucide-react';
import { cartService } from '@/lib/cart';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      if (userData.role !== 'admin' && userData.role !== 'kasir') {
        router.push('/');
        return;
      }
      setUser(userData);
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    // Get user ID before removing
    let userId: number | null = null;
    if (user?.id) {
      userId = user.id;
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Don't clear cart - it's saved per user, so it will be available when they login again
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('userLogout'));
    router.push('/');
  };

  const adminMenuItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/produk', label: 'Manajemen Produk', icon: Package },
    { href: '/admin/permintaan-barang', label: 'Permintaan Barang', icon: MessageSquare },
    { href: '/admin/laporan', label: 'Laporan Penjualan', icon: BarChart3 },
    { href: '/admin/pegawai', label: 'Kelola Pegawai', icon: Users },
  ];

  const kasirMenuItems = [
    { href: '/admin/kasir', label: 'Kasir', icon: ShoppingCart },
    { href: '/admin/pesanan', label: 'Manajemen Pesanan', icon: FileText },
  ];

  const isKasir = user?.role === 'kasir';
  const panelText = isKasir ? 'Kasir Panel' : 'Admin Panel';
  const menuItems = isKasir ? kasirMenuItems : adminMenuItems;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 h-16">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-[#ffd700]" />
            <div>
              <div className="font-bold text-gray-900 text-lg">Toko Naning</div>
              <div className="text-xs text-gray-500 font-medium">{panelText}</div>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:transition-none`}
        >
          <div className="h-full flex flex-col">
            {/* Logo - Desktop */}
            <div className="hidden lg:flex items-center gap-2 px-6 py-4 border-b border-gray-200">
              <ShoppingBag className="h-6 w-6 text-[#ffd700]" />
              <div>
                <div className="font-bold text-gray-900 text-lg">Toko Naning</div>
                <div className="text-xs text-gray-600 font-medium">{panelText}</div>
              </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#ffd700] text-gray-900 font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-200">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Keluar
              </Button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}

