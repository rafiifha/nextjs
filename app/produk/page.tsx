'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { formatRupiah } from '@/lib/utils';
import { Package, Search, Loader2, Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { cartService } from '@/lib/cart';
import { toast } from 'sonner';

interface ProductVariant {
  id: number;
  priceType: string;
  price: number | null;
  stock?: number | null;
  stockOnline: number | null;
  stockOffline: number | null;
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
  image?: string | null;
  categoryId: number;
  category: Category;
  variants: ProductVariant[];
}

export default function ProdukPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [addingToCart, setAddingToCart] = useState<{ [key: string]: boolean }>({});
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<number, number>>({});
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const ITEMS_PER_PAGE = 12;

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
    fetchCategories();

    // Listen for cart updates
    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  useEffect(() => {
    fetchProducts(currentPage, searchQuery, selectedCategory);
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchProducts(1, searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  // Mengambil daftar kategori produk dari API
  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/kategori');
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Sinkronisasi data keranjang belanja lokal
  const loadCart = () => {
    const cartData = cartService.getCart();
    setCart(cartData);
  };

  // Menambahkan produk terpilih dengan tipe varian tertentu ke keranjang belanja local storage
  const handleAddToCart = async (product: Product, variant: ProductVariant) => {
    // Validasi harga
    if (!variant.price) {
      toast.error('Harga Belum Tersedia', { description: 'Produk ini belum memiliki harga. Silakan hubungi admin.' });
      return;
    }

    // Validasi stok
    const availStock = variant.stock ?? variant.stockOffline ?? variant.stockOnline ?? 0;
    const currentQtyInCart = cart.find(item => item.productId === product.id && item.priceType === variant.priceType)?.quantity || 0;
    if (currentQtyInCart >= availStock) {
      toast.error('Stok Tidak Cukup', { description: 'Jumlah di keranjang sudah mencapai batas stok yang tersedia.' });
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
          // abaikan
        }
      }

      // Masukkan item ke local storage cart
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

      // Kirim event update ke navbar agar jumlah cart ter-update secara real-time
      window.dispatchEvent(new Event('cartUpdated'));

      const priceTypeLabel = variant.priceType.charAt(0).toUpperCase() + variant.priceType.slice(1);
      toast.success('Produk Ditambahkan', { description: `${product.name} (${priceTypeLabel}) berhasil ditambahkan ke keranjang` });

      setTimeout(() => {
        setAddingToCart({ ...addingToCart, [key]: false });
      }, 1000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Gagal Menambahkan', { description: 'Gagal menambahkan produk ke keranjang. Silakan coba lagi' });
      setAddingToCart({ ...addingToCart, [key]: false });
    }
  };

  // Memeriksa apakah suatu item dengan varian tertentu sudah ada di keranjang belanja
  const isInCart = (productId: number, priceType: string) => {
    return cart.some(item => item.productId === productId && item.priceType === priceType);
  };

  // Mengambil daftar produk dari API server dengan query params (page, search, category)
  const fetchProducts = async (page: number, search: string, categoryId?: number | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(ITEMS_PER_PAGE) });
      if (search) params.set('search', search);
      if (categoryId) params.set('categoryId', String(categoryId));
      const res = await fetch(`/api/produk?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const productsData = Array.isArray(data.data) ? data.data : [];
        setProducts(productsData);
        setTotalPages(data.totalPages || 1);
        setTotalProducts(data.total || 0);
        
        // Inisialisasi varian aktif pertama yang memiliki stok & harga untuk setiap produk
        setSelectedVariantByProduct((prev) => {
          const next = { ...prev };
          for (const product of productsData) {
            if (next[product.id]) continue;
            const firstAvailable = product.variants.find(
              (v: ProductVariant) => ((v.stock ?? v.stockOffline ?? v.stockOnline ?? 0) > 0) && v.price !== null && v.price !== undefined
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

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

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

        {/* Search Bar + Category Filter */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {categories.length > 0 && (
            <select
              value={selectedCategory ?? ''}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:border-[#ffd700]"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mb-4" />
            <p className="text-gray-600">Memuat produk...</p>
          </div>
        ) : products.length > 0 ? (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Product Image / Gradient Fallback */}
                <div className="relative h-48 w-full bg-gray-100 flex-shrink-0">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      onClick={() => setSelectedFullImage(product.image || null)}
                      className="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-100 to-amber-200 flex items-center justify-center">
                      <Package className="h-12 w-12 text-amber-500/70" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4 flex-1 flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-gray-900">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                          {product.category.name}
                        </span>
                        {product.variants.some(v => (v.stock ?? v.stockOffline ?? v.stockOnline ?? 0) > 0) ? (
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
                  </div>

                  {(() => {
                    const availableVariants = product.variants.filter((v) => (v.stock ?? v.stockOffline ?? v.stockOnline ?? 0) > 0 && v.price !== null && v.price !== undefined);
                    const selectedVariantId = selectedVariantByProduct[product.id];
                    const selectedVariant = availableVariants.find((v) => v.id === selectedVariantId) || availableVariants[0];
                    const key = selectedVariant ? `${product.id}-${selectedVariant.priceType}` : `${product.id}-none`;
                    const currentCartItem = selectedVariant ? cart.find(item => item.productId === product.id && item.priceType === selectedVariant.priceType) : undefined;
                    const qtyInCart = currentCartItem ? currentCartItem.quantity : 0;
                    const stockLimit = selectedVariant ? (selectedVariant.stock ?? selectedVariant.stockOffline ?? selectedVariant.stockOnline ?? 0) : 0;
                    const inCart = qtyInCart > 0;
                    const isAdding = addingToCart[key];
                    const disabledAdd = !selectedVariant || isAdding || !selectedVariant.price || qtyInCart >= stockLimit;

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
                                {variant.priceType.toUpperCase()} - {formatRupiah(variant.price || 0)} (Stok: {variant.stock ?? variant.stockOffline ?? variant.stockOnline ?? 0})
                              </option>
                            ))
                          )}
                        </select>
                        {user && (
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
                        )}
                      </div>
                    );
                  })()}

                  <Link href="/checkout">
                    <Button
                      className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-gray-900"
                      disabled={cart.length === 0}
                    >
                      Checkout
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium border border-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>

              {getPageNumbers().map((pageNum, idx) =>
                pageNum === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm text-gray-500">
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum as number)}
                    className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[#ffd700] border-[#ffd700] text-gray-900'
                        : 'border-gray-200 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              )}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium border border-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-3">
            Menampilkan {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, totalProducts)} dari {totalProducts} produk
          </p>
          </>
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

      {/* Lightbox / Full-screen Image Modal */}
      {selectedFullImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setSelectedFullImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedFullImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors z-[10000]"
              title="Tutup"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedFullImage}
              alt="Full Preview"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
