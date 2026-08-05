'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { ShoppingCart, Plus, Minus, Trash2, Search, X, Loader2, Filter, Package, Box, TrendingDown, CheckCircle, CreditCard, Wallet, Printer, ChevronDown, ChevronUp, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

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
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showDigitalPaymentModal, setShowDigitalPaymentModal] = useState(false);
  const [digitalPaymentData, setDigitalPaymentData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!showDigitalPaymentModal || !digitalPaymentData?.orderId) return;
    if (digitalPaymentData.status === 'paid' || digitalPaymentData.status === 'processing') return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pesanan/${digitalPaymentData.orderId}?t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (res.ok && isSubscribed) {
          const data = await res.json();
          if (data.status === 'paid' || data.status === 'processing') {
            setDigitalPaymentData((prev: any) => ({
              ...prev,
              status: data.status,
              items: data.items,
              createdAt: data.createdAt,
            }));
            toast.success('Pembayaran Terkonfirmasi!', {
              description: 'Pesanan telah dibayar dan lunas.',
            });
            clearInterval(interval);
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 5000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [showDigitalPaymentModal, digitalPaymentData]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Disalin', { description: 'Nomor pembayaran berhasil disalin.' });
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper: print receipt via hidden iframe (no popup, no preview)
  const printReceipt = (data: any) => {
    const itemsHtml = (data.items || []).map((item: any) => `
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <div style="flex:1;padding-right:4px;">
          <div style="font-weight:600;">${item.product?.name || item.name || '-'}</div>
          <div style="font-size:8px;color:#555;">${(item.priceType || '').charAt(0).toUpperCase() + (item.priceType || '').slice(1)} x ${item.quantity}</div>
        </div>
        <div style="text-align:right;font-weight:600;white-space:nowrap;align-self:flex-end;">Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</div>
      </div>
    `).join('');

    const totalItems = (data.items || []).reduce((sum: number, item: any) => sum + item.quantity, 0);
    const discountHtml = data.discount > 0 ? `<div style="display:flex;justify-content:space-between;"><span>Diskon:</span><span style="color:red;">-Rp ${data.discount.toLocaleString('id-ID')}</span></div>` : '';
    const cashHtml = data.cashReceived && data.cashReceived > 0 ? `
      <div style="display:flex;justify-content:space-between;"><span>Uang Diterima:</span><span>Rp ${data.cashReceived.toLocaleString('id-ID')}</span></div>
      ${data.change && data.change > 0 ? `<div style="display:flex;justify-content:space-between;"><span>Kembalian:</span><span style="color:green;">Rp ${data.change.toLocaleString('id-ID')}</span></div>` : ''}
    ` : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          html, body { margin: 0; padding: 0; height: auto; overflow: hidden; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: 48mm; font-family: 'Arial', sans-serif; font-size: 9px; padding: 1mm; color: #000; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 4px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
          .title { font-size: 13px; font-weight: bold; margin-bottom: 2px; }
          .small { font-size: 8px; color: #555; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 11px; padding-top: 4px; border-top: 1px dashed #000; }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="title" style="font-size:14px;letter-spacing:0.5px;">TOKO NANING</div>
          <div class="small" style="margin-bottom:2px;font-size:7.5px;line-height:1.2;">Jl. Raya Cicalengka - Majalaya KM 1, Cikuya, Cicalengka</div>
          <div class="divider"></div>
          <div class="bold" style="font-size:10px;margin-bottom:2px;letter-spacing:0.5px;">STRUK PEMBELIAN</div>
          <div class="small">${data.date}</div>
        </div>
        <div class="divider"></div>
        <div class="row"><span>No. Pesanan:</span><span class="bold">#${data.orderId}</span></div>
        <div class="row"><span>Pelanggan:</span><span class="bold">${data.customerName}</span></div>
        <div class="row"><span>Telepon:</span><span class="bold">${data.customerPhone}</span></div>
        <div class="row"><span>Pembayaran:</span><span class="bold">${data.paymentMethod}</span></div>
        <div class="divider"></div>
        ${itemsHtml}
        <div class="divider"></div>
        <div class="row"><span>Total Qty:</span><span class="bold">${totalItems} Item</span></div>
        <div class="row"><span>Subtotal:</span><span class="bold">Rp ${data.subtotal.toLocaleString('id-ID')}</span></div>
        ${discountHtml}
        ${cashHtml}
        <div class="total-row"><span>Total:</span><span>Rp ${data.total.toLocaleString('id-ID')}</span></div>
        <div class="divider" style="margin-top:6px;"></div>
        <div class="center small" style="margin-top:4px;">
          <div>Produk yang sudah dibeli tidak dapat ditukar/dikembalikan</div>
          <div style="margin-top:3px;font-weight:bold;">Terima Kasih Atas Kunjungan Anda</div>
        </div>
      </body>
      </html>
    `;

    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.overflow = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      // Wait for iframe to render, then print
      setTimeout(() => {
        iframe.contentWindow?.print();
        // Remove iframe after print dialog closes
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 300);
    }
  };

  const handleShowReceiptForOrder = (orderObj: any) => {
    const subtotal = orderObj.items ? orderObj.items.reduce((sum: number, item: any) => sum + item.price * item.quantity, 0) : orderObj.totalHarga || orderObj.total;
    setReceiptData({
      orderId: orderObj.id || orderObj.orderId,
      customerName: orderObj.customerName,
      customerPhone: orderObj.customerPhone,
      items: orderObj.items || [],
      subtotal: subtotal,
      discount: orderObj.discount || 0,
      total: orderObj.totalHarga || orderObj.total,
      cashReceived: orderObj.cashReceived || 0,
      change: orderObj.change || 0,
      paymentMethod: orderObj.paymentMethod ? orderObj.paymentMethod.replace('_va', ' VA').toUpperCase() : 'VA',
      date: orderObj.createdAt ? new Date(orderObj.createdAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID'),
    });
    setShowReceipt(true);
  };


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

  const getCashValue = () => {
    const cashValue = cashReceived && cashReceived !== '' ? parseFloat(cashReceived.replace(/\./g, '')) : 0;
    return isNaN(cashValue) ? 0 : cashValue;
  };

  const getChange = () => {
    const cashValue = getCashValue();
    if (cashValue <= 0) return 0;
    return cashValue - getTotalAfterDiscount();
  };

  const handleNewTransaction = () => {
    setCart([]);
    setCustomerName('Pelanggan Umum');
    setCustomerPhone('081234567890');
    setPaymentMethod('tunai');
    setCashReceived('');
    setDiscount('');
    setSearchQuery('');
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
      const cashValue = getCashValue();
      if (cashValue <= 0) {
        toast.error('Error', { description: 'Uang yang diterima harus diisi' });
        return;
      }

      const totalToPay = getTotalAfterDiscount();
      if (cashValue < totalToPay) {
        toast.error('Error', { description: `Uang tidak mencukupi! Kurang: ${formatRupiah(totalToPay - cashValue)}` });
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

      // If payment method is tunai, order is already paid — langsung print
      if (paymentMethod === 'tunai') {
        const changeAmount = getChange();

        // Set receipt data for print
        const newReceiptData = {
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
        };

        toast.success('Berhasil', { description: changeAmount > 0 ? `Pesanan berhasil dibuat! Kembalian: ${formatRupiah(changeAmount)}` : 'Pesanan berhasil dibuat!' });

        // Langsung print via popup window (no preview modal)
        printReceipt(newReceiptData);

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

      // If payment method is not tunai, show digital payment modal
      if (paymentMethod !== 'tunai') {
        toast.success('Berhasil', { description: 'Pesanan berhasil dibuat! Silakan bayar.' });
        setDigitalPaymentData({
          orderId: data.id,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          paymentMethod: data.paymentMethod,
          paymentNumber: data.paymentNumber,
          paymentFee: data.paymentFee || 0,
          totalHarga: data.totalHarga,
          status: data.status,
          expiredAt: data.expiredAt,
          items: data.items,
          createdAt: data.createdAt,
        });
        setShowDigitalPaymentModal(true);

        // Reset form immediately
        setCart([]);
        setCustomerName('Pelanggan Umum');
        setCustomerPhone('081234567890');
        setPaymentMethod('tunai');
        setCashReceived('');
        setDiscount('');
        setSearchQuery('');

        // Refresh products
        fetchProducts();
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error('Error', { description: error?.message || 'Terjadi kesalahan saat checkout' });
      setSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-30px)] flex flex-col p-3 overflow-hidden bg-gray-50">
      {/* === HEADER BAR === */}
      <div className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-wide text-gray-900">Kasir</h1>
          <span className="text-xs text-gray-500">
            {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* === TOP INFO ROW: Customer + Payment === */}
      <div className="flex-shrink-0 bg-amber-50 border border-amber-200 rounded-t-lg border-b-0 px-4 py-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Pelanggan</label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-8 text-xs bg-white border-gray-300 mt-0.5" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">No. WhatsApp</label>
            <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="h-8 text-xs bg-white border-gray-300 mt-0.5" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">Metode Bayar</label>
            <select
              className="flex h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-xs mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                if (e.target.value !== 'tunai') { setCashReceived(''); setDiscount(''); }
              }}
            >
              <option value="">Pilih metode</option>
              <option value="tunai">Tunai</option>
              <option value="qris">QRIS</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-300 px-2.5 py-1.5 rounded text-xs font-bold text-amber-800">
                <ShoppingCart className="h-3.5 w-3.5" />
                {cart.length} item
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === SEARCH BAR (like "Kode Barang" in reference) === */}
      <div className="flex-shrink-0 bg-white border-x border-amber-200 px-4 py-2">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-700 whitespace-nowrap">Cari Barang:</label>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Ketik nama produk lalu pilih varian harga..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              className="pl-10 pr-10 h-9 text-sm border-gray-300 focus:border-[#ffd700]"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setShowSearchResults(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                {loading ? (
                  <div className="text-center py-4 text-gray-500 text-xs"><Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />Memuat...</div>
                ) : filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
                    const availableVariants = product.variants.filter(v => (v.stockOffline ?? 0) > 0 && v.price !== null && v.price !== undefined);
                    return (
                      <div key={product.id} className="border-b border-gray-100 last:border-b-0">
                        <div className="px-3 py-1.5 bg-gray-50 flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-900">{product.name}</span>
                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{product.category.name}</span>
                        </div>
                        {availableVariants.length === 0 ? (
                          <div className="px-3 py-1.5 text-[10px] text-red-500">Stok habis</div>
                        ) : (
                          <div className="px-2 py-1 flex flex-wrap gap-1">
                            {availableVariants.map((variant) => (
                              <button
                                key={variant.id}
                                onClick={() => {
                                  addToCart(product, variant, 1);
                                  setSearchQuery('');
                                  setShowSearchResults(false);
                                }}
                                className="flex items-center gap-2 px-2.5 py-1.5 text-xs border border-gray-200 rounded hover:bg-amber-50 hover:border-amber-300 transition-colors"
                              >
                                <span className="font-bold uppercase text-[10px] bg-gray-100 text-gray-700 px-1 py-0.5 rounded">{variant.priceType}</span>
                                <span className="font-semibold text-gray-900">{formatRupiah(variant.price || 0)}</span>
                                <span className="text-[9px] text-gray-400">stk:{variant.stockOffline ?? 0}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-gray-500 text-xs">Produk &quot;{searchQuery}&quot; tidak ditemukan</div>
                )}
              </div>
            )}
          </div>
          {cart.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setCart([])} className="text-xs h-9 text-red-600 border-red-200 hover:bg-red-50 whitespace-nowrap">
              <Trash2 className="h-3 w-3 mr-1" /> Hapus Semua
            </Button>
          )}
        </div>
      </div>

      {/* === CART TABLE (main area, like the reference table) === */}
      <div className="flex-1 min-h-0 border-x border-amber-200 bg-white overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="flex-shrink-0 bg-gray-100 text-gray-700 border-y border-amber-200 text-[11px] font-bold uppercase tracking-wider">
          <div className="grid grid-cols-12 gap-0">
            <div className="col-span-1 px-3 py-2 text-center">No</div>
            <div className="col-span-4 px-3 py-2">Nama Produk</div>
            <div className="col-span-2 px-3 py-2 text-center">Varian</div>
            <div className="col-span-2 px-3 py-2 text-right">Harga</div>
            <div className="col-span-1 px-3 py-2 text-center">Qty</div>
            <div className="col-span-1 px-3 py-2 text-right">Total</div>
            <div className="col-span-1 px-3 py-2 text-center">Aksi</div>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {cart.length > 0 ? (
            cart.map((item, index) => (
              <div key={index} className={`grid grid-cols-12 gap-0 text-xs border-b border-gray-100 items-center ${index % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'} hover:bg-amber-50/50 transition-colors`}>
                <div className="col-span-1 px-3 py-2 text-center text-gray-500 font-mono">{index + 1}</div>
                <div className="col-span-4 px-3 py-2 font-semibold text-gray-900 truncate">{item.product.name}</div>
                <div className="col-span-2 px-3 py-2 text-center">
                  <span className="inline-block uppercase text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{item.priceType}</span>
                </div>
                <div className="col-span-2 px-3 py-2 text-right font-mono text-gray-700">{formatRupiah(item.price)}</div>
                <div className="col-span-1 px-1 py-2 flex items-center justify-center gap-0.5">
                  <button onClick={() => updateCartQuantity(item.productId, item.priceType, item.quantity - 1)} className="h-5 w-5 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600">
                    <Minus className="h-2.5 w-2.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.productId, item.priceType, item.quantity + 1)} className="h-5 w-5 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-gray-600">
                    <Plus className="h-2.5 w-2.5" />
                  </button>
                </div>
                <div className="col-span-1 px-3 py-2 text-right font-bold font-mono text-gray-900">{formatRupiah(item.price * item.quantity)}</div>
                <div className="col-span-1 px-3 py-2 text-center">
                  <button onClick={() => removeFromCart(item.productId, item.priceType)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
              <ShoppingCart className="h-12 w-12 mb-3 text-gray-300" />
              <p className="text-sm font-medium">Belum ada barang</p>
              <p className="text-xs mt-1">Cari dan pilih produk di kolom pencarian di atas</p>
            </div>
          )}
        </div>
      </div>

      {/* === BOTTOM SUMMARY BAR (like reference bottom) === */}
      <div className="flex-shrink-0 bg-gradient-to-r from-amber-50 to-gray-50 border border-amber-200 border-t-4 border-t-[#ffd700] rounded-b-lg px-4 py-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Col 1: Summary numbers */}
          <div className="space-y-1 text-sm font-mono">
            <div className="flex justify-between">
              <span className="text-gray-600 font-sans text-xs font-semibold">SubTotal</span>
              <span className="font-semibold">{formatRupiah(getSubtotal())}</span>
            </div>
            {paymentMethod === 'tunai' && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-600 font-sans text-xs font-semibold">Diskon</span>
                <Input
                  type="text" min="0" value={discount} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); setDiscount(v); }} placeholder="0"
                  className="h-6 w-28 text-xs text-right bg-white border-gray-300 px-1.5"
                />
              </div>
            )}
            {paymentMethod === 'tunai' && getDiscountAmount() > 0 && (
              <div className="flex justify-between text-red-600">
                <span className="font-sans text-xs font-semibold">Potongan</span>
                <span className="font-semibold">-{formatRupiah(getDiscountAmount())}</span>
              </div>
            )}
          </div>

          {/* Col 2: Grand Total + Cash */}
          <div className="space-y-1">
            {/* GRAND TOTAL - BIG */}
            <div className="bg-white border-2 border-[#ffd700] rounded-lg px-4 py-2 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800">GrandTotal</span>
              <span className="text-3xl font-extrabold text-[#b8960c] tracking-tight">{formatRupiah(getTotalAfterDiscount())}</span>
            </div>

            {paymentMethod === 'tunai' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700 whitespace-nowrap">Tunai:</span>
                <Input
                  type="text" value={cashReceived}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    const formattedValue = rawValue ? Number(rawValue).toLocaleString('id-ID') : '';
                    setCashReceived(formattedValue);
                  }}
                  placeholder="Jumlah uang"
                  className="h-8 text-base font-bold bg-white border-[#ffd700] flex-1"
                />
                <div className="flex gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCashReceived(Number(getTotalAfterDiscount()).toLocaleString('id-ID'))} className="text-[10px] h-7 px-2 border-amber-300 hover:bg-amber-50 bg-white font-bold">Pas</Button>
                  {[100000, 500000, 1000000].filter((val) => val > getTotalAfterDiscount()).slice(0, 2).map((val) => (
                    <Button key={val} type="button" variant="outline" size="sm" onClick={() => setCashReceived(val.toLocaleString('id-ID'))} className="text-[10px] h-7 px-2 border-gray-200 hover:bg-gray-50 bg-white">
                      {val === 100000 ? '100rb' : val === 500000 ? '500rb' : '1jt'}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {paymentMethod === 'tunai' && getCashValue() > 0 && (
              <div className={`flex items-center justify-between px-3 py-1 rounded text-sm font-bold font-mono ${getChange() >= 0 ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                <span className="font-sans text-xs font-bold">Kembali</span>
                <span className="text-lg">{getChange() >= 0 ? formatRupiah(getChange()) : `-${formatRupiah(Math.abs(getChange()))}`}</span>
              </div>
            )}

            {paymentMethod && paymentMethod !== 'tunai' && (
              <div className="text-xs text-gray-500 italic bg-gray-50 rounded border border-gray-200 text-center px-2 py-1.5">
                Pembayaran non-tunai diproses via QRIS / VA
              </div>
            )}
          </div>

          {/* Col 3: Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleCheckout}
              className="w-full h-10 text-sm font-bold bg-[#ffd700] hover:bg-[#e6c200] text-black"
              disabled={submitting || cart.length === 0 || !paymentMethod || (paymentMethod === 'tunai' && (getCashValue() <= 0 || getCashValue() < getTotalAfterDiscount()))}
            >
              {submitting ? (<><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Memproses...</>) : (<><CheckCircle className="h-4 w-4 mr-1.5" /> {paymentMethod === 'tunai' ? 'Proses Tunai' : 'Proses Pembayaran'}</>)}
            </Button>
            <Button variant="outline" onClick={handleNewTransaction} className="w-full h-8 text-xs font-semibold border-gray-300 text-gray-700 hover:bg-gray-50">
              <Plus className="h-3.5 w-3.5 mr-1" /> Transaksi Baru
            </Button>
          </div>
        </div>
      </div>

      {/* === RECEIPT MODAL (for manual view from digital payment) === */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="text-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">STRUK PEMBELIAN</h2>
                <p className="text-sm text-gray-600">Terima Kasih Atas Kunjungan Anda</p>
                <p className="text-xs text-gray-500 mt-2">{receiptData.date}</p>
              </div>
              <div className="mb-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-600">No. Pesanan:</span><span className="font-semibold">#{receiptData.orderId}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Pelanggan:</span><span className="font-semibold">{receiptData.customerName}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Telepon:</span><span className="font-semibold">{receiptData.customerPhone}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Pembayaran:</span><span className="font-semibold">{receiptData.paymentMethod}</span></div>
              </div>
              <div className="border-t border-b py-4 my-4">
                <div className="space-y-3">
                  {receiptData.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.product.name}</p>
                        <p className="text-gray-600 text-xs">{item.priceType.charAt(0).toUpperCase() + item.priceType.slice(1)} x {item.quantity}</p>
                      </div>
                      <div className="text-right"><p className="font-semibold text-gray-900">{formatRupiah(item.price * item.quantity)}</p></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span className="font-semibold">{formatRupiah(receiptData.subtotal)}</span></div>
                {receiptData.discount > 0 && (
                  <div className="flex justify-between"><span className="text-gray-600">Diskon:</span><span className="font-semibold text-red-600">-{formatRupiah(receiptData.discount)}</span></div>
                )}
                {receiptData.cashReceived && receiptData.cashReceived > 0 && (
                  <>
                    <div className="flex justify-between"><span className="text-gray-600">Uang Diterima:</span><span className="font-semibold">{formatRupiah(receiptData.cashReceived)}</span></div>
                    {receiptData.change && receiptData.change > 0 && (
                      <div className="flex justify-between"><span className="text-gray-600">Kembalian:</span><span className="font-semibold text-green-600">{formatRupiah(receiptData.change)}</span></div>
                    )}
                  </>
                )}
                <div className="flex justify-between pt-2 border-t font-bold text-lg"><span>Total:</span><span className="text-[#b8960c]">{formatRupiah(receiptData.total)}</span></div>
              </div>
              <div className="text-center text-xs text-gray-500 border-t pt-4 mt-4">
                <p>Produk yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
                <p className="mt-2">Terima Kasih</p>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={() => printReceipt(receiptData)} className="flex-1"><Printer className="h-4 w-4 mr-2" /> Print</Button>
                <Button onClick={() => { setShowReceipt(false); setReceiptData(null); }} variant="outline" className="flex-1">Tutup</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === DIGITAL PAYMENT POPUP MODAL === */}
      {showDigitalPaymentModal && digitalPaymentData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border-t-4 border-t-[#ffd700]">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="text-center border-b pb-4">
                <h3 className="text-xl font-bold text-gray-900">Pembayaran Digital</h3>
                <p className="text-xs text-gray-500 mt-1">Metode: {digitalPaymentData.paymentMethod.replace('_va', ' VA').toUpperCase()}</p>
                <p className="text-xs text-gray-500">Order ID: #{digitalPaymentData.orderId}</p>
              </div>

              {/* Status */}
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                {digitalPaymentData.status === 'paid' || digitalPaymentData.status === 'processing' ? (
                  <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-green-800">Pembayaran Lunas!</h4>
                      <p className="text-xs text-gray-500">Transaksi telah berhasil diverifikasi.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-[#b8960c]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700">Menunggu Pembayaran...</h4>
                      <p className="text-[11px] text-gray-400">Status diperbarui otomatis setiap 5 detik</p>
                    </div>
                  </>
                )}
              </div>

              {/* Payment Details */}
              <div className="bg-gray-50 border rounded-xl p-4 space-y-3 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-600">Total Tagihan</span>
                  <span className="text-gray-900 font-bold">{formatRupiah(digitalPaymentData.totalHarga + digitalPaymentData.paymentFee)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Harga Belanjaan</span>
                  <span>{formatRupiah(digitalPaymentData.totalHarga)}</span>
                </div>
                {digitalPaymentData.paymentFee > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Biaya Layanan</span>
                    <span>{formatRupiah(digitalPaymentData.paymentFee)}</span>
                  </div>
                )}
                
                {digitalPaymentData.status !== 'paid' && digitalPaymentData.status !== 'processing' && (
                  <div className="border-t pt-3 space-y-3">
                    {digitalPaymentData.paymentMethod === 'qris' ? (
                      <div className="text-center space-y-2">
                        <p className="font-semibold text-gray-700">Scan QRIS Code di bawah ini:</p>
                        <div className="bg-white p-3 rounded-lg inline-block border mx-auto">
                          <QRCodeSVG value={digitalPaymentData.paymentNumber} size={180} />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-semibold text-gray-700 text-center">Nomor Virtual Account:</p>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-lg font-bold tracking-wider font-mono text-amber-800 bg-amber-50 px-3 py-1 rounded border border-amber-200">
                            {digitalPaymentData.paymentNumber}
                          </span>
                          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handleCopy(digitalPaymentData.paymentNumber)}>
                            {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-500" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                {digitalPaymentData.status === 'paid' || digitalPaymentData.status === 'processing' ? (
                  <>
                    <Button onClick={() => handleShowReceiptForOrder(digitalPaymentData)} className="flex-1 bg-[#ffd700] hover:bg-[#e6c200] text-black font-bold text-xs h-9">
                      <Printer className="h-4 w-4 mr-1.5" /> Cetak Struk
                    </Button>
                    <Button onClick={() => { setShowDigitalPaymentModal(false); setDigitalPaymentData(null); }} variant="outline" className="flex-1 text-xs h-9">
                      Tutup
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1 text-xs h-9"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/pesanan/${digitalPaymentData.orderId}?t=${Date.now()}`, {
                            cache: 'no-store'
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setDigitalPaymentData((prev: any) => ({
                              ...prev,
                              status: data.status,
                              items: data.items,
                              createdAt: data.createdAt,
                            }));
                            if (data.status === 'paid' || data.status === 'processing') {
                              toast.success('Pembayaran Terkonfirmasi!');
                            } else {
                              toast.info('Status masih pending.');
                            }
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" strokeWidth={2.5} /> Cek Status
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowDigitalPaymentModal(false);
                        setDigitalPaymentData(null);
                      }}
                      className="flex-1 text-xs h-9 text-gray-500 hover:text-gray-700"
                    >
                      Batal / Tutup
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
