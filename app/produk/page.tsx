'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/utils';
import { Package, ShoppingCart, Search, Loader2, Check } from 'lucide-react';
import Link from 'next/link';
import { cartService } from '@/lib/cart';
import { useToast } from '@/hooks/use-toast';

interface ProductVariant {
  id: number;
  priceType: string;
  price: number | null;
  stock: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
}

interface Category {
  id: number;
  name: string;
  priceTypes: string[];
}

interface Product {
  id: number;
  name: string;
  categoryId: number;
  category: Category;
  variants: ProductVariant[];
}

export default function ProdukPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [addingToCart, setAddingToCart] = useState<{ [key: string]: boolean }>({});
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<number, number>>({});

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

  const handleAddToCart = async (product: Product, variant: ProductVariant) => {
    if (!variant.price) {
      toast({
        title: "⚠️ Harga Belum Tersedia",
        description: "Produk ini belum memiliki harga. Silakan hubungi admin.",
        variant: 'error',
      });
      return;
    }

    const key = `${product.id}-${variant.priceType}`;
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

      cartService.addToCart(
        product.id,
        product,
        variant.id,
        variant.priceType,
        variant.price,
        1,
        userId
      );
      loadCart();

      // Show success notification
      const priceTypeLabel = variant.priceType.charAt(0).toUpperCase() + variant.priceType.slice(1);
      toast({
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
        title: "❌ Gagal Menambahkan",
        description: "Gagal menambahkan produk ke keranjang. Silakan coba lagi",
        variant: 'error',
      });
      setAddingToCart({ ...addingToCart, [key]: false });
    }
  };

  const isInCart = (productId: number, priceType: string) => {
    return cart.some(item => item.productId === productId && item.priceType === priceType);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/produk');
      if (res.ok) {
        const data = await res.json();
        const productsData = Array.isArray(data) ? data : [];
        setProducts(productsData);
        setSelectedVariantByProduct((prev) => {
          const next = { ...prev };
          for (const product of productsData) {
            if (next[product.id]) continue;
            const firstAvailable = product.variants.find(
              (v: ProductVariant) => (v.stock ?? 0) > 0 && v.price !== null && v.price !== undefined
            );
            if (firstAvailable) {
              next[product.id] = firstAvailable.id;
            }
          }
          return next;
        });
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          {product.category.name}
                        </span>
                        {product.variants.some(v => (v.stock ?? 0) > 0) ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                            Tersedia
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                            Stok Habis
                          </span>
                        )}
                      </div>
                    </div>
                    <Package className="h-6 w-6 text-[#ffd700]" />
                  </div>

                  {(() => {
                    const availableVariants = product.variants.filter((v) => (v.stock ?? 0) > 0 && v.price !== null && v.price !== undefined);
                    const selectedVariantId = selectedVariantByProduct[product.id];
                    const selectedVariant = availableVariants.find((v) => v.id === selectedVariantId) || availableVariants[0];
                    const key = selectedVariant ? `${product.id}-${selectedVariant.priceType}` : `${product.id}-none`;
                    const inCart = selectedVariant ? isInCart(product.id, selectedVariant.priceType) : false;
                    const isAdding = addingToCart[key];
                    const disabledAdd = !selectedVariant || isAdding || !selectedVariant.price;

                    return (
                      <div className="mb-4 space-y-2">
                        <select
                          className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 text-sm"
                          value={selectedVariant?.id || ''}
                          onChange={(e) =>
                            setSelectedVariantByProduct((prev) => ({
                              ...prev,
                              [product.id]: Number(e.target.value),
                            }))
                          }
                          disabled={availableVariants.length === 0}
                        >
                          {availableVariants.length === 0 ? (
                            <option value="">Varian tidak tersedia</option>
                          ) : (
                            availableVariants.map((variant) => (
                              <option key={variant.id} value={variant.id}>
                                {variant.priceType.toUpperCase()} - {formatRupiah(variant.price || 0)} (Stok: {variant.stock ?? 0})
                              </option>
                            ))
                          )}
                        </select>
                        <Button
                          size="sm"
                          variant={inCart ? 'default' : 'outline'}
                          onClick={() => selectedVariant && handleAddToCart(product, selectedVariant)}
                          disabled={disabledAdd}
                          className="h-8 w-full text-xs"
                        >
                          {isAdding ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : inCart ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Di Keranjang
                            </>
                          ) : (
                            '+ Tambah ke Keranjang'
                          )}
                        </Button>
                      </div>
                    );
                  })()}

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
