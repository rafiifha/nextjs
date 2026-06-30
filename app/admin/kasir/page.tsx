'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { ShoppingCart, Plus, Minus, Trash2, Search, X, Loader2, Filter, Package, Box, TrendingDown, CheckCircle, CreditCard, Wallet, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface ProductVariant {
  id: number;
  priceType: string;
  price: number | null;
  stockOnline: number | null;
  stockOffline: number | null;
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
  const [customerName, setCustomerName] = useState('Pelanggan Umum');
  const [customerPhone, setCustomerPhone] = useState('081234567890');
  const [paymentMethod, setPaymentMethod] = useState('tunai');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [selectedVariantByProduct, setSelectedVariantByProduct] = useState<Record<number, number>>({});
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);


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
              (v: ProductVariant) => (v.stockOffline ?? 0) > 0 && v.price !== null && v.price !== undefined
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
      toast.error('Error', { description: 'Data produk tidak valid' });
      return;
    }

    if (!variant || !variant.id) {
      toast.error('Error', { description: 'Data varian tidak valid' });
      return;
    }

    if (!variant.price || variant.price <= 0) {
      toast.error('Error', { description: 'Harga produk tidak valid' });
      return;
    }

    const stockAvailable = variant.stockOffline ?? 0;
    if (stockAvailable <= 0) {
      toast.error('Error', { description: 'Stok tidak tersedia' });
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
          toast.error('Error', { description: `Stok tersedia hanya ${stockAvailable} unit` });
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
        toast.error('Error', { description: `Stok tersedia hanya ${stockAvailable} unit` });
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
          const stockAvailable = variant.stockOffline ?? 0;
          if (quantity > stockAvailable) {
            toast.error('Error', { description: `Stok tersedia hanya ${stockAvailable} unit` });
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
    const cashValue = cashReceived && cashReceived !== '' ? parseFloat(cashReceived.replace(/\./g, '')) : 0;
    if (isNaN(cashValue) || cashValue <= 0) return 0;
    return Math.max(0, cashValue - getTotalAfterDiscount());
  };

  const handleCheckout = async () => {
    if (!customerName || !customerPhone) {
      toast.error('Error', { description: 'Nama dan nomor whatsapp harus diisi' });
      return;
    }

    if (cart.length === 0) {
      toast.error('Error', { description: 'Keranjang masih kosong' });
      return;
    }

    if (!paymentMethod) {
      toast.error('Error', { description: 'Pilih metode pembayaran terlebih dahulu' });
      return;
    }

    // Validate cash payment
    if (paymentMethod === 'tunai') {
      const cashValue = cashReceived && cashReceived !== '' ? parseFloat(cashReceived.replace(/\./g, '')) : 0;
      if (isNaN(cashValue) || cashValue <= 0) {
        toast.error('Error', { description: 'Uang yang diterima harus diisi' });
        return;
      }

      if (getChange() < 0) {
        toast.error('Error', { description: `Uang tidak mencukupi! Kurang: ${formatRupiah(Math.abs(getChange()))}` });
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
          cashReceived: paymentMethod === 'tunai' ? (cashReceived && cashReceived !== '' ? parseFloat(cashReceived.replace(/\./g, '')) : 0) : null,
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
        toast.error('Error', { description: errorMessage });
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
          cashReceived: cashReceived && cashReceived !== '' ? parseFloat(cashReceived.replace(/\./g, '')) : 0,
          change: changeAmount,
          paymentMethod: 'Tunai',
          date: new Date().toLocaleString('id-ID'),
        });

        toast.success('Berhasil', { description: changeAmount > 0 ? `Pesanan berhasil dibuat! Kembalian: ${formatRupiah(changeAmount)}` : 'Pesanan berhasil dibuat!' });

        // Show receipt
        setShowReceipt(true);

        // Reset form
        setCart([]);
        setCustomerName('Pelanggan Umum');
        setCustomerPhone('081234567890');
        setPaymentMethod('tunai');
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
        toast.success('Berhasil', { description: 'Pesanan berhasil dibuat! Mengarahkan ke halaman pembayaran...' });

        setTimeout(() => {
          window.location.href = `/payment/instruction/${data.id}`;
        }, 1000);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error('Error', { description: error?.message || 'Terjadi kesalahan saat checkout' });
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-30px)] flex flex-col p-4 overflow-hidden">
      <div className="mb-3 flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-0.5">Kasir</h1>
          <p className="text-xs text-gray-600">Sistem kasir untuk transaksi langsung</p>
        </div>
        {cart.length > 0 && (
          <div className="flex items-center gap-2 bg-[#ffd700]/15 px-3 py-1.5 rounded-full">
            <ShoppingCart className="h-4 w-4 text-[#ffd700]" />
            <span className="text-sm font-bold text-gray-900">{cart.length} item</span>
            <span className="text-sm font-semibold text-[#b8960c]">{formatRupiah(getTotalAfterDiscount())}</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
        {/* === LEFT COLUMN: PRODUCT LIST === */}
        <div className="lg:col-span-2 h-full flex flex-col overflow-hidden">
          <Card className="border-gray-200 shadow-md h-full flex flex-col overflow-hidden bg-white">
            <CardHeader className="flex-shrink-0 pb-3">
              <CardTitle className="text-lg font-bold">Daftar Produk</CardTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Cari produk..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 h-9"
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
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Semua Kategori</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="min-h-0 overflow-y-auto px-4 pb-3 flex-1">
              {loading ? (
                <div className="text-center py-6 text-gray-600">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  Memuat produk...
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredProducts.map((product) => {
                    const availableVariants = product.variants.filter(v => (v.stockOffline ?? 0) > 0 && v.price !== null && v.price !== undefined);
                    return (
                      <div
                        key={product.id}
                        className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden bg-white"
                      >
                        <div className="bg-gradient-to-r from-[#ffd700]/10 to-[#ffd700]/5 px-3 py-2">
                          <p className="text-xs font-semibold text-gray-900 line-clamp-2 leading-tight">{product.name}</p>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mt-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
                            <Box className="h-2.5 w-2.5" />
                            {product.category.name}
                          </span>
                        </div>
                        <div className="px-2 py-1.5">
                          {availableVariants.length === 0 ? (
                            <p className="text-[10px] text-red-500 text-center py-1">Habis</p>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {availableVariants.map((variant) => (
                                <Button
                                  key={variant.id}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addToCart(product, variant, 1)}
                                  className="text-[10px] h-7 px-2 w-full bg-white hover:bg-amber-50/40 border-gray-200 hover:border-amber-300 text-gray-800 flex justify-between items-center transition-all duration-150"
                                >
                                  <span className="font-bold uppercase bg-gray-100 text-gray-700 px-1 py-0.5 rounded text-[9px]">{variant.priceType}</span>
                                  <span className="font-semibold text-gray-900">{formatRupiah(variant.price || 0)}</span>
                                  <span className="text-[9px] text-gray-500">s:{variant.stockOffline ?? 0}</span>
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-600 mb-3 text-sm">Produk tidak ditemukan</p>
                  {(searchQuery || selectedCategoryId) && (
                    <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setSelectedCategoryId(''); }}>
                      <X className="h-4 w-4 mr-2" /> Hapus Filter
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* === RIGHT COLUMN: SIDEBAR CART === */}
        <div className="lg:col-span-1 h-full flex flex-col overflow-hidden">
          <Card className="border-gray-200 shadow-md h-full flex flex-col overflow-hidden bg-white">
            <CardHeader className="flex-shrink-0 pb-2 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-md font-bold flex items-center gap-1.5 bg-[#ffd700] px-2 py-0.5 rounded shadow-sm text-black">
                  <ShoppingCart className="h-4 w-4" />
                  Belanjaan ({cart.length})
                </CardTitle>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-[10px] h-6 text-red-500 hover:text-red-700 hover:bg-red-50 px-2">
                    <Trash2 className="h-3 w-3 mr-1" /> Hapus Semua
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex-1 min-h-0 flex flex-col overflow-hidden p-3 bg-amber-50/10">
              {cart.length > 0 ? (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1 mb-1">
                  {cart.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded-md border border-amber-100 text-xs shadow-xs">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate leading-tight">{item.product.name}</p>
                        <p className="text-[10px] text-gray-500 capitalize mt-0.5">{item.priceType} • {formatRupiah(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                        <Button variant="outline" size="sm" onClick={() => updateCartQuantity(item.productId, item.priceType, item.quantity - 1)} className="h-5 w-5 p-0 bg-white">
                          <Minus className="h-2.5 w-2.5" />
                        </Button>
                        <span className="w-5 text-center text-xs font-semibold">{item.quantity}</span>
                        <Button variant="outline" size="sm" onClick={() => updateCartQuantity(item.productId, item.priceType, item.quantity + 1)} className="h-5 w-5 p-0 bg-white">
                          <Plus className="h-2.5 w-2.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.productId, item.priceType)} className="h-5 w-5 p-0 text-red-500">
                          <Trash2 className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                      <p className="text-xs font-bold text-gray-900 ml-2 whitespace-nowrap">{formatRupiah(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-xs text-gray-400">Pilih produk di kiri untuk berbelanja</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="flex-shrink-0 border-t-4 border-[#ffd700] bg-amber-50/10 p-3 shadow-md mt-3 mb-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* Col 1: Customer Identity */}
          <div className="border border-amber-200 rounded-md bg-white p-2.5 shadow-xs space-y-2.5">
            <div>
              <Label htmlFor="customerName" className="text-xs font-semibold text-gray-700">Nama</Label>
              <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-8 text-xs px-2 mt-0.5 bg-white" />
            </div>
            <div>
              <Label htmlFor="customerPhone" className="text-xs font-semibold text-gray-700">Nomor WhatsApp</Label>
              <Input id="customerPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-8 text-xs px-2 mt-0.5 bg-white" />
            </div>
          </div>

          {/* Col 2: Payment Details (Method + Cash/Discount) */}
          <div className="space-y-2.5">
            {/* Payment Method Select */}
            <div className="space-y-1 bg-white p-2 border border-gray-200 rounded-md shadow-xs">
              <Label className="text-xs font-bold text-gray-800">Metode Pembayaran</Label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm mt-0.5"
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  if (e.target.value !== 'tunai') { setCashReceived(''); setDiscount(''); }
                }}
              >
                <option value="">Pilih metode</option>
                <option value="tunai">💵 Tunai</option>
                <option value="qris">💳 QRIS</option>
                <option value="bca_va">🏦 BCA VA</option>
                <option value="bni_va">🏦 BNI VA</option>
                <option value="bri_va">🏦 BRI VA</option>
                <option value="cimb_niaga_va">🏦 CIMB Niaga VA</option>
                <option value="maybank_va">🏦 Maybank VA</option>
                <option value="permata_va">🏦 Permata VA</option>
                <option value="sampoerna_va">🏦 Sampoerna VA</option>
                <option value="bnc_va">🏦 BNC VA</option>
                <option value="atm_bersama_va">🏦 ATM Bersama VA</option>
                <option value="artha_graha_va">🏦 Artha Graha VA</option>
              </select>
            </div>

            {/* Cash Input & Discount / Message */}
            {paymentMethod === 'tunai' ? (
              <div className="space-y-2 bg-blue-50/50 p-2.5 rounded border border-blue-100">
                <div>
                  <Label htmlFor="cashReceived" className="text-xs font-bold text-gray-700 flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5 text-[#ffd700]" /> Uang Diterima <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cashReceived" type="text" value={cashReceived}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      const formattedValue = rawValue ? Number(rawValue).toLocaleString('id-ID') : '';
                      setCashReceived(formattedValue);
                    }}
                    placeholder="Jumlah uang"
                    className="h-9 text-base font-bold border-[#ffd700] mt-0.5 bg-white"
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <Button type="button" variant="outline" size="sm" onClick={() => setCashReceived(Number(getTotalAfterDiscount()).toLocaleString('id-ID'))} className="text-[10px] h-6 px-2 border-amber-300 hover:bg-amber-50 bg-white">Pas</Button>
                    {[100000, 500000, 1000000, 3000000, 5000000].filter((val) => val > getTotalAfterDiscount()).map((val) => (
                      <Button key={val} type="button" variant="outline" size="sm" onClick={() => setCashReceived(val.toLocaleString('id-ID'))} className="text-[10px] h-6 px-2 border-gray-200 hover:bg-gray-50 bg-white">
                        {val === 100000 ? '100rb' : val === 500000 ? '500rb' : val === 1000000 ? '1jt' : val === 3000000 ? '3jt' : '5jt'}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : paymentMethod && (
              <div className="text-xs text-gray-500 italic p-2 bg-gray-100/50 rounded border border-gray-200 text-center">
                Pembayaran non-tunai diproses via QRIS / VA.
              </div>
            )}
          </div>

          {/* Col 3: Summary & Process */}
          <div className="space-y-2">
            {/* Collapsible Discount (Cash Only) */}
            {paymentMethod === 'tunai' && (
              <div className="border border-blue-200 rounded bg-white p-1.5 shadow-xs">
                <button
                  type="button"
                  onClick={() => setShowDiscountDropdown(!showDiscountDropdown)}
                  className="flex items-center justify-between w-full text-xs font-bold text-blue-700 hover:text-blue-800 px-1"
                >
                  <span>Tambah Diskon</span>
                  {showDiscountDropdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showDiscountDropdown && (
                  <div className="mt-1 pt-1 border-t border-gray-100">
                    <Label htmlFor="discount" className="text-xs font-semibold text-gray-500">Diskon (Rp)</Label>
                    <Input id="discount" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" className="h-8 text-sm mt-0.5" />
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded border border-gray-200 p-2.5 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">{formatRupiah(getSubtotal())}</span>
              </div>
              {paymentMethod === 'tunai' && getDiscountAmount() > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Diskon:</span>
                  <span className="font-semibold text-red-600">-{formatRupiah(getDiscountAmount())}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5">
                <span className="font-bold text-gray-900">Total:</span>
                <span className="font-bold text-[#ffd700] text-base">{formatRupiah(getTotalAfterDiscount())}</span>
              </div>
              {paymentMethod === 'tunai' && cashReceived && parseFloat(cashReceived) > 0 && (
                <>
                  {getChange() > 0 ? (
                    <div className="flex justify-between bg-green-50 -mx-2 px-2 py-0.5 rounded">
                      <span className="font-semibold text-green-800 text-xs">Kembalian:</span>
                      <span className="font-bold text-green-700 text-xs">{formatRupiah(getChange())}</span>
                    </div>
                  ) : getChange() < 0 && (
                    <div className="bg-red-50 -mx-2 px-2 py-0.5 rounded">
                      <p className="text-xs text-red-700 font-medium">Kurang: {formatRupiah(Math.abs(getChange()))}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <Button
              onClick={handleCheckout}
              className="w-full h-9 text-sm font-bold"
              disabled={submitting || cart.length === 0 || !paymentMethod || (paymentMethod === 'tunai' && (getChange() < 0 || !cashReceived || parseFloat(cashReceived) <= 0))}
            >
              {submitting ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Memproses...</>) : (paymentMethod === 'tunai' ? 'Proses Tunai' : 'Proses Non-Tunai')}
            </Button>
          </div>
        </div>
      </Card>

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
                <p>Produk yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
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
