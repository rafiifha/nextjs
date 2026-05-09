'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { ShoppingCart, Plus, Minus, Trash2, Search, X, Loader2, Filter, Package, Box, TrendingDown, CheckCircle, CreditCard, Wallet, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface ProductVariant {
  id: number;
  priceType: string;
  price: number | null;
  stock: number | null;
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

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<number, number>>({});

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Pakasir does not use Snap popup, we redirect to instruction page

  // Removed Pakasir snap script loader (atau Midtrans yang sebelumnya)

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
            if (firstAvailable) next[product.id] = firstAvailable.id;
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
      toast.error('❌ Error', { description: 'Data produk tidak valid' });
      return;
    }

    if (!variant || !variant.id) {
      toast.error('❌ Error', { description: 'Data varian tidak valid' });
      return;
    }

    if (!variant.price || variant.price <= 0) {
      toast.error('❌ Error', { description: 'Harga produk tidak valid' });
      return;
    }

    const stockAvailable = variant.stock ?? 0;
    if (stockAvailable <= 0) {
      toast.error('❌ Error', { description: 'Stok tidak tersedia' });
      return;
    }

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.priceType === variant.priceType
      );

      if (existing) {
        const newQuantity = existing.quantity + quantity;
        // Check if new quantity exceeds available stock
        if (newQuantity > stockAvailable) {
          toast.error('❌ Error', { description: `Stok tersedia hanya ${stockAvailable} unit` });
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id && item.priceType === variant.priceType
            ? { ...item, quantity: newQuantity }
            : item
        );
      }

      // Check if quantity exceeds available stock
      if (quantity > stockAvailable) {
        toast.error('❌ Error', { description: `Stok tersedia hanya ${stockAvailable} unit` });
        return prev;
      }

      return [...prev, {
        productId: product.id,
        variantId: variant.id,
        product,
        priceType: variant.priceType,
        quantity,
        price: variant.price!
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
          const stockAvailable = variant.stock ?? 0;
          if (quantity > stockAvailable) {
            toast.error('❌ Error', { description: `Stok tersedia hanya ${stockAvailable} unit` });
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

  const getDiscountAmount = () => {
    const discountValue = discount && discount !== '' ? parseFloat(discount) : 0;
    return isNaN(discountValue) ? 0 : discountValue;
  };

  const getSubtotal = () => {
    return getTotalPrice();
  };

  const getTotalAfterDiscount = () => {
    return Math.max(0, getSubtotal() - getDiscountAmount());
  };

  const getChange = () => {
    const cashValue = cashReceived && cashReceived !== '' ? parseFloat(cashReceived) : 0;
    if (isNaN(cashValue) || cashValue <= 0) return 0;
    return Math.max(0, cashValue - getTotalAfterDiscount());
  };

  const handleCheckout = async () => {
    if (!customerName || !customerPhone) {
      toast.error('❌ Error', { description: 'Nama dan nomor whatsapp harus diisi' });
      return;
    }

    if (cart.length === 0) {
      toast.error('❌ Error', { description: 'Keranjang masih kosong' });
      return;
    }

    if (!paymentMethod) {
      toast.error('❌ Error', { description: 'Pilih metode pembayaran terlebih dahulu' });
      return;
    }

    // Validate cash payment
    if (paymentMethod === 'tunai') {
      const cashValue = cashReceived && cashReceived !== '' ? parseFloat(cashReceived) : 0;
      if (isNaN(cashValue) || cashValue <= 0) {
        toast.error('❌ Error', { description: 'Uang yang diterima harus diisi' });
        return;
      }

      if (getChange() < 0) {
        toast.error('❌ Error', { description: `Uang tidak mencukupi! Kurang: ${formatRupiah(Math.abs(getChange()))}` });
        return;
      }
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
          discount: paymentMethod === 'tunai' ? getDiscountAmount() : 0,
          cashReceived: paymentMethod === 'tunai' ? (cashReceived && cashReceived !== '' ? parseFloat(cashReceived) : 0) : null,
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
        toast.error('❌ Error', { description: errorMessage });
        setSubmitting(false);
        return;
      }

      // If payment method is tunai, order is already paid
      if (paymentMethod === 'tunai') {
        const changeAmount = getChange();

        // Set receipt data
        // Note: API returns order directly, not wrapped in { order: ... }
        setReceiptData({
          orderId: data.id,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          items: data.items,
          subtotal: getSubtotal(),
          discount: getDiscountAmount(),
          total: getTotalAfterDiscount(),
          cashReceived: cashReceived && cashReceived !== '' ? parseFloat(cashReceived) : 0,
          change: changeAmount,
          paymentMethod: 'Tunai',
          date: new Date().toLocaleString('id-ID'),
        });

        toast.success('✅ Berhasil', { description: changeAmount > 0 ? `Pesanan berhasil dibuat! Kembalian: ${formatRupiah(changeAmount)}` : 'Pesanan berhasil dibuat!' });

        // Show receipt
        setShowReceipt(true);

        // Reset form
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCashReceived('');
        setDiscount('');
        setSearchQuery('');

        // Refresh products
        fetchProducts();
        setSubmitting(false);
        return;
      }

      // If payment method is not tunai, redirect to instruction page
      if (paymentMethod !== 'tunai') {
        toast.success('✅ Berhasil', { description: 'Pesanan berhasil dibuat! Mengarahkan ke halaman pembayaran...' });

        setTimeout(() => {
          window.location.href = `/payment/instruction/${data.id}`;
        }, 1000);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error('❌ Error', { description: error?.message || 'Terjadi kesalahan saat checkout' });
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map((product) => {
                    const availableVariants = product.variants.filter(v => (v.stock ?? 0) > 0 && v.price !== null && v.price !== undefined);
                    const selectedVariantId = selectedVariantByProduct[product.id];
                    const selectedVariant = availableVariants.find(v => v.id === selectedVariantId) || availableVariants[0] || null;

                    return (
                      <Card
                        key={product.id}
                        className="border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                      >
                        <CardHeader className="bg-gradient-to-r from-[#ffd700]/10 to-[#ffd700]/5 py-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm font-semibold text-gray-900 line-clamp-2">
                                {product.name}
                              </CardTitle>
                              <div className="inline-flex items-center gap-1 px-2 py-0.5 mt-2 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                <Box className="h-3 w-3" />
                                {product.category.name}
                              </div>
                            </div>
                            <div className="ml-2 p-1.5 bg-[#ffd700]/20 rounded-lg">
                              <Package className="h-3.5 w-3.5 text-[#ffd700]" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-3">
                          <div className="space-y-2">
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
                              className="w-full h-8 text-xs"
                              disabled={!selectedVariant}
                              onClick={() => selectedVariant && addToCart(product, selectedVariant, 1)}
                            >
                              + Tambah
                            </Button>
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
                  <Label htmlFor="customerPhone">Nomor WhatsApp</Label>
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
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (e.target.value !== 'tunai') {
                        setCashReceived('');
                        setDiscount('');
                      }
                    }}
                  >
                    <option value="">Pilih metode pembayaran</option>
                    <option value="tunai">💵 Tunai</option>
                    <option value="qris">💳 QRIS</option>
                    <option value="bca_va">🏦 BCA Virtual Account</option>
                    <option value="bni_va">🏦 BNI Virtual Account</option>
                    <option value="bri_va">🏦 BRI Virtual Account</option>
                    <option value="cimb_niaga_va">🏦 CIMB Niaga VA</option>
                    <option value="maybank_va">🏦 Maybank VA</option>
                    <option value="permata_va">🏦 Permata VA</option>
                    <option value="sampoerna_va">🏦 Sampoerna VA</option>
                    <option value="bnc_va">🏦 BNC VA</option>
                    <option value="atm_bersama_va">🏦 ATM Bersama VA</option>
                    <option value="artha_graha_va">🏦 Artha Graha VA</option>
                  </select>
                  {paymentMethod !== 'tunai' && (
                    <p className="mt-2 text-xs text-gray-600">
                      Pembayaran non-tunai: setelah pesanan dibuat, kasir diarahkan ke halaman instruksi bayar.
                    </p>
                  )}
                </div>
              )}

              {/* Summary & Payment */}
              <div className="border-t border-gray-200 pt-4 space-y-4">
                {/* Ringkasan Pembayaran */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Ringkasan Pembayaran</h4>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="text-sm font-semibold text-gray-900">{formatRupiah(getSubtotal())}</span>
                  </div>

                  {paymentMethod === 'tunai' && getDiscountAmount() > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Diskon:</span>
                      <span className="text-sm font-semibold text-red-600">-{formatRupiah(getDiscountAmount())}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-[#ffd700]">{formatRupiah(getTotalAfterDiscount())}</span>
                    </div>
                  </div>
                </div>

                {/* Input Pembayaran Tunai */}
                {paymentMethod === 'tunai' && (
                  <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Pembayaran Tunai</h4>

                    {/* Uang Diterima - Prominent */}
                    <div className="space-y-2">
                      <Label htmlFor="cashReceived" className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-[#ffd700]" />
                        Uang Diterima (Rp) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="cashReceived"
                        type="number"
                        min="0"
                        value={cashReceived}
                        onChange={(e) => setCashReceived(e.target.value)}
                        placeholder="Masukkan jumlah uang"
                        className="w-full text-lg font-semibold py-3 border-2 border-[#ffd700] focus:border-[#ffd700] focus:ring-2 focus:ring-[#ffd700]/20"
                        autoFocus
                      />
                    </div>

                    {/* Diskon - Optional, smaller */}
                    <div className="space-y-1.5">
                      <Label htmlFor="discount" className="text-xs font-medium text-gray-600 flex items-center gap-1">
                        Diskon (Rp) <span className="text-gray-400 text-[10px]">(Opsional)</span>
                      </Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        placeholder="0"
                        className="w-full text-sm"
                      />
                    </div>

                    {/* Kembalian Display */}
                    {cashReceived && parseFloat(cashReceived) > 0 && (
                      <>
                        {getChange() > 0 ? (
                          <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-green-900">Kembalian:</span>
                              <span className="text-base font-bold text-green-700">{formatRupiah(getChange())}</span>
                            </div>
                          </div>
                        ) : getChange() < 0 && (
                          <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                            <p className="text-sm text-red-700 font-medium">
                              Uang tidak mencukupi! Kurang: {formatRupiah(Math.abs(getChange()))}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Checkout Button */}
                <Button
                  onClick={handleCheckout}
                  className="w-full"
                  disabled={
                    submitting ||
                    cart.length === 0 ||
                    !paymentMethod ||
                    (paymentMethod === 'tunai' && (getChange() < 0 || !cashReceived || parseFloat(cashReceived) <= 0))
                  }
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

      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" id="receipt">
            <div className="p-6">
              {/* Receipt Header */}
              <div className="text-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">STRUK PEMBELIAN</h2>
                <p className="text-sm text-gray-600">Terima Kasih Atas Kunjungan Anda</p>
                <p className="text-xs text-gray-500 mt-2">{receiptData.date}</p>
              </div>

              {/* Order Info */}
              <div className="mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">No. Pesanan:</span>
                  <span className="font-semibold">#{receiptData.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pelanggan:</span>
                  <span className="font-semibold">{receiptData.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Telepon:</span>
                  <span className="font-semibold">{receiptData.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pembayaran:</span>
                  <span className="font-semibold">{receiptData.paymentMethod}</span>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-b py-4 my-4">
                <div className="space-y-3">
                  {receiptData.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.product.name}</p>
                        <p className="text-gray-600 text-xs">
                          {item.priceType.charAt(0).toUpperCase() + item.priceType.slice(1)} x {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatRupiah(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold">{formatRupiah(receiptData.subtotal)}</span>
                </div>
                {receiptData.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Diskon:</span>
                    <span className="font-semibold text-red-600">-{formatRupiah(receiptData.discount)}</span>
                  </div>
                )}
                {receiptData.cashReceived && receiptData.cashReceived > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uang Diterima:</span>
                      <span className="font-semibold">{formatRupiah(receiptData.cashReceived)}</span>
                    </div>
                    {receiptData.change && receiptData.change > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Kembalian:</span>
                        <span className="font-semibold text-green-600">{formatRupiah(receiptData.change)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between pt-2 border-t font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-[#ffd700]">{formatRupiah(receiptData.total)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-xs text-gray-500 border-t pt-4 mt-4">
                <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
                <p className="mt-2">Terima Kasih</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 print:hidden">
                <Button
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button
                  onClick={() => {
                    setShowReceipt(false);
                    setReceiptData(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt, #receipt * {
            visibility: visible;
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            box-shadow: none;
            border: none;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
