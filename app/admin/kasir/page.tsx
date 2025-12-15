'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { ShoppingCart, Plus, Minus, Trash2, Search, X, Loader2, Filter, Package, Box, TrendingDown, CheckCircle, CreditCard, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductVariant {
  id: number;
  priceType: string;
  price: number | null;
  stock_online: number | null;
  stock_offline: number | null;
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

interface CartItem {
  productId: number;
  variantId?: number;
  product: Product;
  priceType: string;
  quantity: number;
  price: number;
}

export default function KasirPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'non-tunai'>('tunai');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Handle payment redirect from Midtrans
  useEffect(() => {
    const paymentStatus = searchParams?.get('payment');
    const orderId = searchParams?.get('orderId');
    
    // Check if redirected from Midtrans with order_id parameter (from example.com)
    const midtransOrderId = searchParams?.get('order_id');
    const midtransStatus = searchParams?.get('transaction_status');
    const midtransStatusCode = searchParams?.get('status_code');
    
    if (midtransOrderId && midtransStatusCode === '200') {
      // Extract actual order ID from Midtrans order_id format: ORDER-{id}-{timestamp}
      const orderIdMatch = midtransOrderId.match(/ORDER-(\d+)-/);
      const actualOrderId = orderIdMatch ? orderIdMatch[1] : null;
      
      if (actualOrderId) {
        // Redirect to kasir page with proper parameters
        const redirectUrl = `${window.location.origin}/admin/kasir?payment=success&orderId=${actualOrderId}`;
        console.log('Redirecting from example.com to:', redirectUrl);
        window.location.replace(redirectUrl);
        return;
      }
    }
    
    if (paymentStatus && orderId) {
      if (paymentStatus === 'success') {
        toast({
          title: '✅ Pembayaran Berhasil',
          description: `Pesanan #${orderId} berhasil dibayar!`,
        });
        // Reset form
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setSearchQuery('');
        fetchProducts();
        // Remove query params from URL
        window.history.replaceState({}, '', '/admin/kasir');
      } else if (paymentStatus === 'pending') {
        toast({
          title: '⏳ Pembayaran Pending',
          description: 'Menunggu konfirmasi pembayaran',
        });
        // Remove query params from URL
        window.history.replaceState({}, '', '/admin/kasir');
      } else if (paymentStatus === 'failed') {
        toast({
          variant: 'error',
          title: '❌ Pembayaran Gagal',
          description: 'Silakan coba lagi atau gunakan metode pembayaran lain',
        });
        // Remove query params from URL
        window.history.replaceState({}, '', '/admin/kasir');
      }
    }
  }, [searchParams, toast]);

  // Load Midtrans script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
    script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '');
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

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

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategoryId || product.categoryId === parseInt(selectedCategoryId);
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product, variant: ProductVariant, quantity: number = 1) => {
    // Validate data before adding to cart
    if (!product || !product.id) {
      toast({
        title: '❌ Error',
        description: 'Data produk tidak valid',
        variant: 'error',
      });
      return;
    }

    if (!variant || !variant.id) {
      toast({
        title: '❌ Error',
        description: 'Data varian tidak valid',
        variant: 'error',
      });
      return;
    }

    if (!variant.price || variant.price <= 0) {
      toast({
        title: '❌ Error',
        description: 'Harga produk tidak valid',
        variant: 'error',
      });
      return;
    }

    const stockOffline = variant.stock_offline ?? 0;
    if (stockOffline <= 0) {
      toast({
        title: '❌ Error',
        description: 'Stok offline tidak tersedia',
        variant: 'error',
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.priceType === variant.priceType
      );
      
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        // Check if new quantity exceeds available stock
        if (newQuantity > stockOffline) {
          toast({
            title: '❌ Error',
            description: `Stok offline tersedia hanya ${stockOffline} unit`,
            variant: 'error',
          });
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id && item.priceType === variant.priceType
            ? { ...item, quantity: newQuantity }
            : item
        );
      }
      
      // Check if quantity exceeds available stock
      if (quantity > stockOffline) {
        toast({
          title: '❌ Error',
          description: `Stok offline tersedia hanya ${stockOffline} unit`,
          variant: 'error',
        });
        return prev;
      }
      
      return [...prev, { 
        productId: product.id, 
        variantId: variant.id,
        product, 
        priceType: variant.priceType, 
        quantity, 
        price: variant.price 
      }];
    });
  };

  const updateCartQuantity = (productId: number, priceType: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, priceType);
      return;
    }
    
    setCart((prev) => {
      const item = prev.find(
        (i) => i.productId === productId && i.priceType === priceType
      );
      
      if (!item) return prev;
      
      // Find the variant to check stock
      const product = products.find(p => p.id === productId);
      if (product) {
        const variant = product.variants.find(v => v.priceType === priceType);
        if (variant) {
          const stockOffline = variant.stock_offline ?? 0;
          if (quantity > stockOffline) {
            toast({
              title: '❌ Error',
              description: `Stok offline tersedia hanya ${stockOffline} unit`,
              variant: 'error',
            });
            return prev;
          }
        }
      }
      
      return prev.map((item) =>
        item.productId === productId && item.priceType === priceType
          ? { ...item, quantity }
          : item
      );
    });
  };

  const removeFromCart = (productId: number, priceType: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.priceType === priceType))
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (!customerName || !customerPhone) {
      toast({
        title: '❌ Error',
        description: 'Nama dan nomor telepon harus diisi',
        variant: 'error',
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: '❌ Error',
        description: 'Keranjang masih kosong',
        variant: 'error',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create order first
      const response = await fetch('/api/kasir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          paymentMethod: paymentMethod,
          items: cart.map((item) => {
            // Ensure all required fields are present and valid
            if (!item.productId || !item.priceType || !item.quantity || !item.price) {
              console.error('Invalid cart item:', item);
            }
            return {
              productId: item.productId,
              variantId: item.variantId || null,
              priceType: item.priceType,
              quantity: item.quantity,
              price: item.price,
            };
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = data.error || 'Gagal membuat pesanan';
        if (data.details && Array.isArray(data.details)) {
          errorMessage += ': ' + data.details.join(', ');
        }
        toast({
          title: '❌ Error',
          description: errorMessage,
          variant: 'error',
        });
        setSubmitting(false);
        return;
      }

      // If payment method is tunai, order is already paid
      if (paymentMethod === 'tunai') {
        toast({
          title: '✅ Berhasil',
          description: 'Pesanan berhasil dibuat!',
        });
        
        // Reset form
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setSearchQuery('');
        
        // Refresh products
        fetchProducts();
        setSubmitting(false);
        return;
      }

      // If payment method is non-tunai, generate Midtrans token
      if (paymentMethod === 'non-tunai') {
        const totalPrice = getTotalPrice();
        
        // Get current base URL - ensure it's a full URL
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        
        // Construct full redirect URLs
        // Use payment/redirect page as intermediate to handle Midtrans redirect properly
        // This page will extract order_id from Midtrans format and redirect to kasir page
        const finishUrl = `${baseUrl}/payment/redirect`;
        const unfinishUrl = `${baseUrl}/payment/redirect`;
        const errorUrl = `${baseUrl}/payment/redirect`;
        
        console.log('🔗 Sending redirect URLs to API:');
        console.log('  - Base URL:', baseUrl);
        console.log('  - Finish URL:', finishUrl);
        console.log('  - Unfinish URL:', unfinishUrl);
        console.log('  - Error URL:', errorUrl);
        
        // Generate Midtrans token
        const tokenResponse = await fetch('/api/payment/midtrans/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: data.id,
            grossAmount: totalPrice,
            customerName,
            customerPhone,
            finishRedirectUrl: finishUrl,
            unfinishRedirectUrl: unfinishUrl,
            errorRedirectUrl: errorUrl,
          }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          toast({
            variant: 'error',
            title: '❌ Gagal Membuat Payment Token',
            description: tokenData.error || 'Silakan coba lagi atau hubungi admin',
          });
          setSubmitting(false);
          return;
        }

        // Open Midtrans Snap popup
        const openSnapPopup = () => {
          if (typeof window !== 'undefined' && (window as any).snap) {
            (window as any).snap.pay(tokenData.token, {
              onSuccess: (result: any) => {
                console.log('Payment success:', result);
                
                // Redirect manually to kasir page with success status
                const currentOrigin = window.location.origin;
                const redirectUrl = `${currentOrigin}/admin/kasir?payment=success&orderId=${data.id}`;
                console.log('Redirecting to:', redirectUrl);
                
                // Show toast first
                toast({
                  title: '✅ Pembayaran Berhasil',
                  description: 'Pesanan berhasil dibayar! Mengarahkan ke halaman kasir...',
                });
                
                // Redirect after short delay
                setTimeout(() => {
                  window.location.href = redirectUrl;
                }, 1000);
              },
              onPending: (result: any) => {
                console.log('Payment pending:', result);
                
                // Redirect manually to kasir page with pending status
                const currentOrigin = window.location.origin;
                const redirectUrl = `${currentOrigin}/admin/kasir?payment=pending&orderId=${data.id}`;
                console.log('Redirecting to:', redirectUrl);
                
                toast({
                  title: '⏳ Pembayaran Pending',
                  description: 'Menunggu konfirmasi pembayaran. Mengarahkan ke halaman kasir...',
                });
                
                setTimeout(() => {
                  window.location.href = redirectUrl;
                }, 1000);
              },
              onError: (result: any) => {
                console.log('Payment error:', result);
                
                // Redirect manually to kasir page with failed status
                const currentOrigin = window.location.origin;
                const redirectUrl = `${currentOrigin}/admin/kasir?payment=failed&orderId=${data.id}`;
                console.log('Redirecting to:', redirectUrl);
                
                toast({
                  variant: 'error',
                  title: '❌ Pembayaran Gagal',
                  description: 'Silakan coba lagi. Mengarahkan ke halaman kasir...',
                });
                
                setTimeout(() => {
                  window.location.href = redirectUrl;
                }, 1000);
              },
              onClose: () => {
                console.log('Payment popup closed by user');
                setSubmitting(false);
              },
            });
          } else {
            setTimeout(() => {
              if (typeof window !== 'undefined' && (window as any).snap) {
                openSnapPopup();
              } else {
                toast({
                  variant: 'error',
                  title: '❌ Gagal Memuat Halaman Pembayaran',
                  description: 'Silakan refresh halaman atau coba lagi',
                });
                setSubmitting(false);
              }
            }, 1000);
          }
        };

        openSnapPopup();
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: '❌ Error',
        description: error?.message || 'Terjadi kesalahan saat checkout',
        variant: 'error',
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Kasir</h1>
        <p className="text-gray-600">Sistem kasir untuk transaksi langsung</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product List */}
        <div className="lg:col-span-2">
          <Card className="border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Daftar Produk</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Cari produk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Semua Kategori</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-600">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Memuat produk...
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => {
                    const availableVariants = product.variants.filter(v => (v.stock_offline ?? 0) > 0 && v.price !== null && v.price !== undefined);
                    
                    return (
                      <Card
                        key={product.id}
                        className="border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden"
                      >
                        <CardHeader className="bg-gradient-to-r from-[#ffd700]/10 to-[#ffd700]/5 pb-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-bold text-gray-900 mb-2 line-clamp-2">
                                {product.name}
                              </CardTitle>
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                <Box className="h-3 w-3" />
                                {product.category.name}
                              </div>
                            </div>
                            <div className="ml-2 p-2 bg-[#ffd700]/20 rounded-lg">
                              <Package className="h-4 w-4 text-[#ffd700]" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          {/* Variants List */}
                          <div className="space-y-2.5 mb-4">
                            {product.variants.map((variant) => {
                              const hasStock = (variant.stock_offline ?? 0) > 0;
                              const hasPrice = variant.price !== null && variant.price !== undefined;
                              const isAvailable = hasStock && hasPrice;
                              
                              return (
                                <div
                                  key={variant.id}
                                  className={`border rounded-lg p-3 transition-colors ${
                                    isAvailable
                                      ? 'border-gray-200 bg-white hover:border-[#ffd700]/50'
                                      : 'border-gray-100 bg-gray-50 opacity-60'
                                  }`}
                                >
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-800 capitalize text-sm">
                                        {variant.priceType}
                                      </span>
                                      {hasPrice && (
                                        <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">
                                          Ada Harga
                                        </span>
                                      )}
                                      {hasStock && (
                                        <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3" />
                                          Tersedia
                                        </span>
                                      )}
                                    </div>
                                    {hasPrice ? (
                                      <span className="font-bold text-[#ffd700] text-sm">
                                        {formatRupiah(variant.price!)}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">Belum ada harga</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 px-2 py-1 rounded text-xs">
                                    <TrendingDown className={`h-3 w-3 ${hasStock ? 'text-gray-600' : 'text-red-500'}`} />
                                    <span className={`font-medium ${hasStock ? 'text-gray-700' : 'text-red-600'}`}>
                                      Stok: {variant.stock_offline !== null && variant.stock_offline !== undefined ? variant.stock_offline : '-'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Add to Cart Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                            {product.variants.map((variant) => {
                              const hasStock = (variant.stock_offline ?? 0) > 0;
                              const hasPrice = variant.price !== null && variant.price !== undefined;
                              const isAvailable = hasStock && hasPrice;
                              
                              return (
                                <Button
                                  key={variant.id}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addToCart(product, variant, 1)}
                                  disabled={!isAvailable}
                                  className={`text-xs transition-all ${
                                    isAvailable
                                      ? 'hover:bg-[#ffd700]/10 hover:border-[#ffd700] hover:text-[#ffd700]'
                                      : 'opacity-50 cursor-not-allowed'
                                  }`}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  {variant.priceType.charAt(0).toUpperCase() + variant.priceType.slice(1)}
                                </Button>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Produk tidak ditemukan</p>
                  {(searchQuery || selectedCategoryId) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategoryId('');
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Hapus Filter
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart & Checkout */}
        <div className="lg:col-span-1">
          <Card className="border-gray-200 shadow-md sticky top-4">
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Keranjang
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Info */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="customerName">Nama Pelanggan</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama pelanggan"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Nomor Telepon</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>

              {/* Cart Items */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Item ({cart.length})</h3>
                {cart.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-xs text-gray-600 capitalize">{item.priceType}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.productId, item.priceType, item.quantity - 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.productId, item.priceType, item.quantity + 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.productId, item.priceType)}
                            className="h-6 w-6 p-0 text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 ml-2">
                          {formatRupiah(item.price * item.quantity)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Keranjang kosong</p>
                )}
              </div>

              {/* Payment Method */}
              {cart.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <Label className="text-sm font-semibold text-gray-900 mb-3 block">Metode Pembayaran</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('tunai')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        paymentMethod === 'tunai'
                          ? 'border-[#ffd700] bg-[#ffd700]/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Wallet className="h-4 w-4" />
                      <span className="text-sm font-medium">Tunai</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('non-tunai')}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        paymentMethod === 'non-tunai'
                          ? 'border-[#ffd700] bg-[#ffd700]/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm font-medium">Non-Tunai</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-[#ffd700]">{formatRupiah(getTotalPrice())}</span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full"
                  disabled={submitting || cart.length === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    paymentMethod === 'tunai' ? 'Proses Transaksi Tunai' : 'Proses Transaksi Non-Tunai'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
