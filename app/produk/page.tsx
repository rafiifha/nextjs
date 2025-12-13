'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/utils';
import { Package, ShoppingCart, Search, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import { cartService } from '@/lib/cart';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: number;
  name: string;
  hargaDus: number;
  hargaPak: number;
  hargaRenceng: number;
  stock_online: number;
  stock_offline: number;
}

export default function ProdukPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [addingToCart, setAddingToCart] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        // ignore
      }
    }
    loadCart();
    fetchProducts();
    
    // Listen for cart updates
    const handleCartUpdate = () => {
      loadCart();
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const loadCart = () => {
    const cartData = cartService.getCart();
    setCart(cartData);
  };

  const handleAddToCart = async (product: Product, priceType: 'dus' | 'pak' | 'renceng') => {
    const key = `${product.id}-${priceType}`;
    setAddingToCart({ ...addingToCart, [key]: true });
    
    try {
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
      
      cartService.addToCart(product.id, product, priceType, 1, userId);
      loadCart();
      
      // Show success notification
      const priceTypeLabel = priceType === 'dus' ? 'Dus' : priceType === 'pak' ? 'Pak' : 'Renceng';
      toast({
        variant: "success",
        title: "✅ Produk Ditambahkan",
        description: `${product.name} (${priceTypeLabel}) berhasil ditambahkan ke keranjang`,
      });
      
      // Show success feedback
      setTimeout(() => {
        setAddingToCart({ ...addingToCart, [key]: false });
      }, 1000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        variant: "error",
        title: "❌ Gagal Menambahkan",
        description: "Gagal menambahkan produk ke keranjang. Silakan coba lagi",
      });
      setAddingToCart({ ...addingToCart, [key]: false });
    }
  };

  const isInCart = (productId: number, priceType: 'dus' | 'pak' | 'renceng') => {
    return cart.some(item => item.productId === productId && item.priceType === priceType);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/produk');
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isAdmin = user?.role === 'admin';

  // Admin view - redirect to admin produk page
  if (isAdmin) {
    router.push('/admin/produk');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Katalog Produk</h1>
          <p className="text-gray-600">Pilih produk yang ingin Anda pesan</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mb-4" />
            <p className="text-gray-600">Memuat produk...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{product.name}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            product.stok > 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {product.stok > 0 ? `Stok: ${product.stok}` : 'Stok Habis'}
                        </span>
                      </div>
                    </div>
                    <Package className="h-8 w-8 text-[#ffd700]" />
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm text-gray-600">Dus:</span>
                        <span className="font-semibold text-gray-900 ml-2">
                          {formatRupiah(product.hargaDus)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={isInCart(product.id, 'dus') ? 'default' : 'outline'}
                        onClick={() => handleAddToCart(product, 'dus')}
                        disabled={product.stok === 0 || addingToCart[`${product.id}-dus`]}
                        className="h-7 px-3 text-xs"
                      >
                        {addingToCart[`${product.id}-dus`] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isInCart(product.id, 'dus') ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Di Keranjang
                          </>
                        ) : (
                          '+ Dus'
                        )}
                      </Button>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm text-gray-600">Pak:</span>
                        <span className="font-semibold text-gray-900 ml-2">
                          {formatRupiah(product.hargaPak)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={isInCart(product.id, 'pak') ? 'default' : 'outline'}
                        onClick={() => handleAddToCart(product, 'pak')}
                        disabled={product.stock_online === 0 || addingToCart[`${product.id}-pak`]}
                        className="h-7 px-3 text-xs"
                      >
                        {addingToCart[`${product.id}-pak`] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isInCart(product.id, 'pak') ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Di Keranjang
                          </>
                        ) : (
                          '+ Pak'
                        )}
                      </Button>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm text-gray-600">Renceng:</span>
                        <span className="font-semibold text-gray-900 ml-2">
                          {formatRupiah(product.hargaRenceng)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={isInCart(product.id, 'renceng') ? 'default' : 'outline'}
                        onClick={() => handleAddToCart(product, 'renceng')}
                        disabled={product.stock_online === 0 || addingToCart[`${product.id}-renceng`]}
                        className="h-7 px-3 text-xs"
                      >
                        {addingToCart[`${product.id}-renceng`] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : isInCart(product.id, 'renceng') ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Di Keranjang
                          </>
                        ) : (
                          '+ Renceng'
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href="/keranjang" className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled={cart.length === 0}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Keranjang ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                      </Button>
                    </Link>
                    <Link href="/checkout" className="flex-1">
                      <Button
                        className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-gray-900"
                        disabled={cart.length === 0}
                      >
                        Checkout
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-gray-200">
            <CardContent className="pt-16 pb-16 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-4">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <p className="text-gray-700 font-semibold mb-1.5">
                {searchQuery ? 'Produk tidak ditemukan' : 'Belum ada produk'}
              </p>
              <p className="text-sm text-gray-600">
                {searchQuery
                  ? 'Coba cari dengan kata kunci lain'
                  : 'Produk akan muncul di sini setelah ditambahkan'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

