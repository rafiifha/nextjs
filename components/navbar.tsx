'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingBag, LogIn, LogOut, User, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cartService } from '@/lib/cart';
import CartDrawer from '@/components/cart-drawer';
import { isTokenValid } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);

  useEffect(() => {
    // Load cart count function - use current user state
    const updateCartCount = () => {
      // Get user from localStorage directly to ensure we have latest data
      const userStr = localStorage.getItem('user');
      let userId: number | null = null;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          userId = user?.id || null;
        } catch (e) {
          // ignore
        }
      }
      const count = cartService.getCartCount(userId);
      setCartCount(count);
    };

    const loadUser = () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (userStr && isTokenValid(token)) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
        } catch (e) {
          setUser(null);
        }
      } else {
        if (token && !isTokenValid(token)) {
          // Clear expired token
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        setUser(null);
      }
      // Always update cart count after loading user
      updateCartCount();
    };

    // Load user on mount
    loadUser();

    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user' || e.key === 'token') {
        loadUser();
      }
    };

    // Listen for custom login event (when user logs in on same tab)
    const handleLogin = () => {
      loadUser();
    };

    // Listen for logout event
    const handleLogout = () => {
      setUser(null);
      setCartCount(0);
    };
    
    // Add event listeners
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLogin', handleLogin);
    window.addEventListener('userLogout', handleLogout);
    window.addEventListener('cartUpdated', updateCartCount);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLogin', handleLogin);
      window.removeEventListener('userLogout', handleLogout);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  const handleLogout = () => {
    // Get user ID before removing
    const userStr = localStorage.getItem('user');
    let userId: number | null = null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user?.id || null;
      } catch (e) {
        // ignore
      }
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Clear guest cart just in case, so user starts fresh after logout
    cartService.clearCart(null);
    
    // Don't clear user cart - it's saved per user, so it will be available when they login again
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('userLogout'));
    window.location.href = '/';
  };

  // Hide navbar on login, register, admin, kurir, and payment pages
  if (
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/kurir') ||
    pathname?.startsWith('/payment')
  ) {
    return null;
  }

  const isHome = pathname === '/';

  return (
    <nav className={`sticky top-0 z-50 ${isHome ? 'bg-white/90 backdrop-blur border-b border-gray-100' : 'bg-white border-b border-gray-200 shadow-sm'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between ${isHome ? 'h-18 py-3' : 'h-16'}`}>
          <Link href="/" className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-[#ffd700]" />
            <div>
              <div className="font-bold text-gray-900 text-base sm:text-lg">Toko Naning</div>
              <div className="text-[11px] text-gray-500">Toko Sembako</div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-5">
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

          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative"
              onClick={() => setCartDrawerOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Button>
            {user ? (
              <>

                <Link href="/profil">
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    Profil
                  </Button>
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin/dashboard">
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                )}
                {user.role === 'kasir' && (
                  <Link href="/admin/kasir">
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      Kasir
                    </Button>
                  </Link>
                )}
                {user.role === 'kurir' && (
                  <Link href="/kurir/pengiriman">
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      Kurir Panel
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
      
      {/* Cart Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </nav>
  );
}

