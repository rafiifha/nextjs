'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Package, MapPin, Truck, Search } from 'lucide-react';
import { cartService } from '@/lib/cart';
import { isTokenValid } from '@/lib/utils';
import { toast } from 'sonner';

const MapPicker = dynamic(() => import('@/components/map-picker'), { ssr: false });

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface Product {
  id: number;
  name: string;
  category?: { id: number; name: string; priceTypes: string[] };
  variants?: Array<{
    id: number;
    priceType: string;
    price: number | null;
    stockOnline: number | null;
    stockOffline: number | null;
  }>;
}

interface CartItem {
  productId: number;
  variantId?: number;
  product: Product;
  priceType: string;
  quantity: number;
  price: number | null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Delivery info
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [shippingFee, setShippingFee] = useState(0);
  const [destinationAddress, setDestinationAddress] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');
  const [shippingLat, setShippingLat] = useState<number | null>(null);
  const [shippingLng, setShippingLng] = useState<number | null>(null);
  const [shippingDistance, setShippingDistance] = useState<number | null>(null);
  const [shippingZone, setShippingZone] = useState<number | null>(null);
  const [deliveryOutOfRange, setDeliveryOutOfRange] = useState(false);

  // Address search
  const [addressQuery, setAddressQuery] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [flyToPosition, setFlyToPosition] = useState<[number, number] | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedQuery = useDebounce(addressQuery, 500);

  // Auto-search when typing address
  useEffect(() => {
    if (debouncedQuery.length < 3 || deliveryMethod !== 'delivery') {
      setAddressSuggestions([]);
      return;
    }
    const searchAddress = async () => {
      setSearchingAddress(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}&countrycodes=id&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setAddressSuggestions(data);
          setShowSuggestions(data.length > 0);
        }
      } catch {
        // silent fail
      } finally {
        setSearchingAddress(false);
      }
    };
    searchAddress();
  }, [debouncedQuery, deliveryMethod]);

  const selectAddressSuggestion = async (suggestion: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    setAddressQuery(suggestion.display_name);
    setDestinationAddress(suggestion.display_name);
    setShippingLat(lat);
    setShippingLng(lng);
    setFlyToPosition([lat, lng]);
    setShowSuggestions(false);
    setAddressSuggestions([]);

    // Calculate delivery fee
    try {
      const res = await fetch('/api/delivery/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeliveryOutOfRange(true);
        setShippingDistance(null);
        setShippingZone(null);
        setShippingFee(0);
        toast.error('Lokasi Di Luar Jangkauan', { description: data.error || 'Maksimal 10km' });
        return;
      }
      setDeliveryOutOfRange(false);
      setShippingDistance(data.distanceKm);
      setShippingZone(data.zone);
      setShippingFee(data.shippingFee);
    } catch {
      toast.error('Gagal', { description: 'Coba pilih lokasi lagi.' });
    }
  };

  // Payment info
  const [paymentMethod, setPaymentMethod] = useState<string>('tunai');

  const PAKASIR_METHODS = [
    { id: 'qris', name: 'QRIS' },
  ];

  const DEFAULT_NON_TUNAI_METHOD = PAKASIR_METHODS[0]?.id || 'qris';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr || !isTokenValid(token)) {
      if (token && !isTokenValid(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      router.push('/login?redirect=/checkout');
      return;
    }
    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setCustomerName(userData.name || '');
      setCustomerPhone((userData.phone || '').toString().trim());
      setIsAuthenticated(true);
      loadCartFromStorage();
      const productIdParam = new URLSearchParams(window.location.search).get('productId');
      const parsedProductId = productIdParam ? Number(productIdParam) : null;
      setSelectedProductId(parsedProductId && Number.isFinite(parsedProductId) ? parsedProductId : null);
      if (productIdParam) fetchProducts(parsedProductId || undefined);
      else setLoading(false);
    } catch (e) {
      router.push('/login?redirect=/checkout');
    }
  }, [router]);

  useEffect(() => {
    const handleCartUpdate = () => loadCartFromStorage();
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const loadCartFromStorage = () => {
    const cartData = cartService.getCart();
    setCart(cartData);
    setCartLoaded(true);
  };

  const fetchProducts = async (forcedProductId?: number) => {
    try {
      const res = await fetch('/api/produk');
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
        const productId = forcedProductId ?? selectedProductId;
        if (productId && cartLoaded && cart.length === 0) {
          const product = data.find((p: Product) => p.id === Number(productId));
          if (product && product.variants) {
            const variantDus = product.variants.find((v: any) => v.priceType === 'dus');
            if (variantDus && (variantDus.stockOnline ?? 0) > 0) {
              setCart(cartService.addToCart(product.id, product, variantDus.id, 'dus', variantDus.price, 1));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCartQuantity = (productId: number, priceType: string, quantity: number) => {
    setCart(cartService.updateQuantity(productId, priceType, quantity));
  };

  const removeFromCart = (productId: number, priceType: string) => {
    setCart(cartService.removeFromCart(productId, priceType));
  };

  const getItemsTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  };

  const getTotalPrice = () => {
    return getItemsTotal() + (deliveryMethod === 'delivery' ? shippingFee : 0);
  };

  const handleCheckout = async () => {
    if (!customerName || !customerPhone) {
      toast.warning('Data Belum Lengkap', { description: 'Nama dan nomor whatsapp harus diisi' });
      return;
    }
    if (cart.length === 0) {
      toast.warning('Keranjang Kosong', { description: 'Tambahkan produk terlebih dahulu' });
      return;
    }
    if (deliveryMethod === 'delivery' && !destinationAddress) {
      toast.warning('Alamat Kosong', { description: 'Lengkapi alamat pengiriman' });
      return;
    }
    if (deliveryMethod === 'delivery' && (!shippingLat || !shippingLng)) {
      toast.warning('Lokasi Belum Dipilih', { description: 'Pilih titik pengiriman di peta' });
      return;
    }
    if (deliveryMethod === 'delivery' && deliveryOutOfRange) {
      toast.warning('Di Luar Jangkauan', { description: 'Lokasi di luar radius 10km' });
      return;
    }
    if (deliveryMethod === 'delivery' && paymentMethod === 'tunai') {
      toast.warning('Metode Tidak Valid', { description: 'Pesanan antar wajib pembayaran non-tunai.' });
      return;
    }

    setSubmitting(true);

    try {
      const orderPayload = {
        customerName,
        customerPhone,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || null,
          priceType: item.priceType,
          quantity: item.quantity,
          price: item.price,
        })),
        deliveryMethod,
        shippingFee: deliveryMethod === 'delivery' ? shippingFee : 0,
        paymentMethod,
        shippingAddress: deliveryMethod === 'delivery' ? destinationAddress : null,
        shippingLat: deliveryMethod === 'delivery' ? shippingLat : null,
        shippingLng: deliveryMethod === 'delivery' ? shippingLng : null,
        shippingDistance: deliveryMethod === 'delivery' ? shippingDistance : null,
        shippingZone: deliveryMethod === 'delivery' ? shippingZone : null,
        shippingNotes: deliveryMethod === 'delivery' ? shippingNotes : null,
      };

      const orderResponse = await fetch('/api/pesanan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        const errorDesc = orderData.details && Array.isArray(orderData.details)
          ? orderData.details.join(', ')
          : (orderData.error || 'Terjadi kesalahan');
        toast.error('Gagal Membuat Pesanan', { description: errorDesc });
        setSubmitting(false);
        return;
      }

      cartService.clearCart();

      if (paymentMethod === 'tunai') {
        toast.success('Pesanan Berhasil', { description: 'Silakan lakukan pembayaran tunai saat ambil pesanan.' });
        router.push('/pesanan');
      } else {
        // Redirect to Pakasir instruction page
        router.push(`/payment/instruction/${orderData.id}`);
      }
    } catch (error: any) {
      toast.error('Terjadi Kesalahan', { description: error.message });
      setSubmitting(false);
    }
  };

  if (loading || !cartLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
      </div>
    );
  }

  if (cart.length === 0 && !selectedProductId) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Card className="max-w-md w-full shadow-lg p-8 text-center">
          <ShoppingCart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold mb-4">Keranjang Kosong</h2>
          <Button onClick={() => router.push('/produk')} className="w-full bg-[#ffd700] text-black">Lihat Produk</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Checkout</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-xl">Keranjang</CardTitle></CardHeader>
              <CardContent>
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{item.priceType} - {formatRupiah(item.price || 0)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => updateCartQuantity(item.productId, item.priceType, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                      <span className="font-medium w-6 text-center">{item.quantity}</span>
                      <Button variant="outline" size="sm" onClick={() => updateCartQuantity(item.productId, item.priceType, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => removeFromCart(item.productId, item.priceType)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="shadow-md sticky top-4">
              <CardHeader><CardTitle className="text-xl">Informasi Pesanan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nama Lengkap</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                </div>
                <div>
                  <Label>Nomor WhatsApp</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
                </div>
                <div>
                  <Label>Metode Pembelian</Label>
                  <div className="flex gap-2 mt-2">
                    <Button type="button" variant={deliveryMethod === 'pickup' ? 'default' : 'outline'} onClick={() => { setDeliveryMethod('pickup'); setShippingFee(0); setPaymentMethod('tunai'); }} className="flex-1">
                      <MapPin className="h-4 w-4 mr-2" /> Ambil Sendiri
                    </Button>
                    <Button type="button" variant={deliveryMethod === 'delivery' ? 'default' : 'outline'} onClick={() => { setDeliveryMethod('delivery'); setShippingFee(0); if (paymentMethod === 'tunai') setPaymentMethod(DEFAULT_NON_TUNAI_METHOD); }} className="flex-1">
                      <Truck className="h-4 w-4 mr-2" /> Antar
                    </Button>
                  </div>
                </div>

                {deliveryMethod === 'delivery' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                      <strong>Informasi:</strong> Pengiriman pesanan hanya akan dilakukan pada pukul <strong>11:00 - 15:00</strong> dan maksimal jarak pengiriman <strong>10 KM</strong> dari lokasi toko.
                    </div>
                    <div>
                      <Label>Cari Alamat</Label>
                      <div className="relative mt-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            value={addressQuery}
                            onChange={(e) => {
                              setAddressQuery(e.target.value);
                              setShowSuggestions(true);
                            }}
                            onFocus={() => { if (addressSuggestions.length > 0) setShowSuggestions(true); }}
                            placeholder="Ketik alamat, contoh: Jl. Merdeka No 1..."
                            className="pl-10 pr-8"
                          />
                          {searchingAddress && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                          )}
                        </div>
                        {showSuggestions && addressSuggestions.length > 0 && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {addressSuggestions.map((item, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50 border-b border-gray-100 last:border-0 transition-colors"
                                onClick={() => selectAddressSuggestion(item)}
                              >
                                <MapPin className="inline h-3 w-3 mr-1 text-amber-600" />
                                {item.display_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Ketik minimal 3 huruf, pilih dari saran, peta otomatis pindah ke lokasi</p>
                    </div>
                    <div>
                      <Label>Pilih Lokasi di Peta</Label>
                      <MapPicker
                        onLocationSelect={async (lat, lng) => {
                          setShippingLat(lat);
                          setShippingLng(lng);
                          setShowSuggestions(false);
                          setAddressSuggestions([]);
                          try {
                            const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                            if (geoRes.ok) {
                              const geoData = await geoRes.json();
                              if (geoData && geoData.display_name) {
                                setDestinationAddress(geoData.display_name);
                                setAddressQuery(geoData.display_name);
                              }
                            }
                            const res = await fetch('/api/delivery/calculate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ lat, lng }),
                            });
                            const data = await res.json();
                            if (!res.ok) {
                              setDeliveryOutOfRange(true);
                              setShippingDistance(null);
                              setShippingZone(null);
                              setShippingFee(0);
                              toast.error('Lokasi Di Luar Jangkauan', { description: data.error || 'Maksimal 10km' });
                              return;
                            }
                            setDeliveryOutOfRange(false);
                            setShippingDistance(data.distanceKm);
                            setShippingZone(data.zone);
                            setShippingFee(data.shippingFee);
                          } catch (error) {
                            toast.error('Gagal', { description: 'Coba pilih lokasi lagi.' });
                          }
                        }}
                        initialPosition={shippingLat && shippingLng ? [shippingLat, shippingLng] : undefined}
                        flyToPosition={flyToPosition}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {deliveryOutOfRange
                          ? 'Lokasi di luar jangkauan 10km'
                          : shippingZone
                            ? `Zona ${shippingZone} • Jarak ${shippingDistance}km • Ongkir ${formatRupiah(shippingFee)}`
                            : 'Cari alamat di atas atau klik peta langsung'}
                      </p>
                    </div>
                    <div>
                      <Label>Alamat Lengkap</Label>
                      <Input value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} placeholder="Jl. Raya No 1..." className="mt-1" required />
                    </div>
                    <div>
                      <Label>Catatan Kurir</Label>
                      <Input value={shippingNotes} onChange={(e) => setShippingNotes(e.target.value)} placeholder="Contoh: taruh di pagar" />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200">
                  <Label>Metode Pembayaran</Label>
                  <select
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-2"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    {deliveryMethod === 'pickup' && <option value="tunai">Tunai (Bayar di Toko)</option>}
                    {PAKASIR_METHODS.map((method) => (
                      <option key={method.id} value={method.id}>💳 {method.name}</option>
                    ))}
                  </select>
                  {deliveryMethod === 'delivery' && (
                    <p className="mt-1 text-xs text-amber-700">Pesanan antar hanya menerima pembayaran non-tunai.</p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Subtotal:</span><span className="font-medium">{formatRupiah(getItemsTotal())}</span></div>
                  {deliveryMethod === 'delivery' && <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Ongkir:</span><span className="font-medium">{formatRupiah(shippingFee)}</span></div>}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200"><span>Total:</span><span className="text-[#ffd700]">{formatRupiah(getTotalPrice())}</span></div>
                </div>

                <Button onClick={handleCheckout} className="w-full mt-4" disabled={submitting || cart.length === 0 || deliveryOutOfRange}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Selesaikan Pesanan'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
