'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingBag, LogIn, LogOut, User, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cartService } from '@/lib/cart';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        // ignore
      }
    }

    // Load cart count
    const updateCartCount = () => {
      setCartCount(cartService.getCartCount());
    };
    
    updateCartCount();
    window.addEventListener('cartUpdated', updateCartCount);
    
    return () => window.removeEventListener('cartUpdated', updateCartCount);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  // Hide navbar on login, register, admin, payment, and checkout pages
  if (pathname?.startsWith('/login') || pathname?.startsWith('/register') || pathname?.startsWith('/admin') || pathname?.startsWith('/payment') || pathname?.startsWith('/checkout')) {
    return null;
  }
  
  // Hide navbar on keranjang page too
  if (pathname?.startsWith('/keranjang')) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-[#ffd700]" />
            <div>
              <div className="font-bold text-gray-900 text-lg">Toko Naning</div>
              <div className="text-xs text-gray-500">Grosir Sembako Terpercaya</div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                pathname === '/' ? 'text-[#ffd700]' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Beranda
            </Link>
            <Link
              href="/produk"
              className={`text-sm font-medium transition-colors ${
                pathname === '/produk' ? 'text-[#ffd700]' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Produk
            </Link>
            <Link
              href="/pesanan"
              className={`text-sm font-medium transition-colors ${
                pathname === '/pesanan' ? 'text-[#ffd700]' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pesanan
            </Link>
            <Link
              href="/checkout"
              className={`text-sm font-medium transition-colors ${
                pathname === '/checkout' ? 'text-[#ffd700]' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Checkout
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/keranjang" className="relative">
              <Button variant="ghost" size="sm" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Button>
            </Link>
            {user ? (
              <>
                {user.role === 'admin' && (
                  <Link href="/admin/dashboard">
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Keluar
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  <LogIn className="h-4 w-4 mr-2" />
                  Masuk
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

