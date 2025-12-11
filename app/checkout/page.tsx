'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Package, User, Phone, MapPin, Truck } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { cartService, CartItem as CartItemType } from '@/lib/cart';

// Dynamic import untuk MapPicker (client component)
const MapPicker = dynamic(() => import('@/components/map-picker'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
    </div>
  ),
});

interface Product {
  id: number;
  name: string;
  hargaDus: number;
  hargaPak: number;
  hargaRenceng: number;
  stok: number;
}

interface CartItem {
  productId: number;
  product: Product;
  priceType: 'dus' | 'pak' | 'renceng';
  quantity: number;
  price: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [shippingFee, setShippingFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'tunai' | 'midtrans'>('tunai');
  
  // Delivery info (for Biteship)
  const [destinationAddress, setDestinationAddress] = useState('');
  const [destinationPostalCode, setDestinationPostalCode] = useState('');
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationProvince, setDestinationProvince] = useState('');
  const [destinationLat, setDestinationLat] = useState<number | null>(null);
  const [destinationLng, setDestinationLng] = useState<number | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [shippingRates, setShippingRates] = useState<any[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<any>(null);
  const [checkingShipping, setCheckingShipping] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      router.push('/login?redirect=/checkout');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setCustomerName(userData.name || '');
      setCustomerPhone(userData.phone || userData.email || '');
      setIsAuthenticated(true);
      loadCartFromStorage();
      // Only fetch products if productId in URL (for adding product directly)
      const productId = searchParams?.get('productId');
      if (productId) {
        fetchProducts();
      } else {
        setLoading(false);
      }
    } catch (e) {
      router.push('/login?redirect=/checkout');
    }
  }, [router, searchParams]);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => {
      loadCartFromStorage();
    };
    
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const loadCartFromStorage = () => {
    const cartData = cartService.getCart();
    setCart(cartData);
    setCartLoaded(true);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/produk');
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
        
        // Add product from URL if exists and cart is empty
        const productId = searchParams?.get('productId');
        if (productId && cartLoaded && cart.length === 0) {
          const product = data.find((p: Product) => p.id === parseInt(productId));
          if (product && product.stok > 0) {
            const cartData = cartService.addToCart(product, 'dus', 1);
            setCart(cartData);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product, priceType: 'dus' | 'pak' | 'renceng', quantity: number = 1) => {
    const cartData = cartService.addToCart(product, priceType, quantity);
    setCart(cartData);
  };

  const updateCartQuantity = (productId: number, priceType: 'dus' | 'pak' | 'renceng', quantity: number) => {
    const cartData = cartService.updateQuantity(productId, priceType, quantity);
    setCart(cartData);
  };

  const removeFromCart = (productId: number, priceType: 'dus' | 'pak' | 'renceng') => {
    const cartData = cartService.removeFromCart(productId, priceType);
    setCart(cartData);
  };

  const getTotalPrice = () => {
    const itemsTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const finalShippingFee = deliveryMethod === 'delivery' && selectedShipping 
      ? selectedShipping.price 
      : 0;
    return itemsTotal + finalShippingFee;
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    setLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TokoNaning/1.0',
          },
        }
      );

      const data = await response.json();

      if (data && data.address) {
        const addr = data.address;
        
        // Extract address components
        const road = addr.road || '';
        const houseNumber = addr.house_number || '';
        const village = addr.village || addr.neighbourhood || '';
        const subdistrict = addr.suburb || addr.subdistrict || '';
        const city = addr.city || addr.town || addr.municipality || '';
        const province = addr.state || addr.province || '';
        const postalCode = addr.postcode || '';

        // Build full address
        let fullAddress = '';
        if (houseNumber) fullAddress += houseNumber + ' ';
        if (road) fullAddress += road;
        if (village) fullAddress += (fullAddress ? ', ' : '') + village;
        if (subdistrict) fullAddress += (fullAddress ? ', ' : '') + subdistrict;

        setDestinationAddress(fullAddress || data.display_name.split(',')[0]);
        setDestinationCity(city || '');
        setDestinationProvince(province || '');
        setDestinationPostalCode(postalCode || '');
        setDestinationLat(lat);
        setDestinationLng(lng);
      } else {
        // Fallback: use display_name
        setDestinationAddress(data.display_name || '');
        setDestinationLat(lat);
        setDestinationLng(lng);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      alert('Gagal mendapatkan alamat dari lokasi yang dipilih');
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    reverseGeocode(lat, lng);
  };

  const checkShippingRates = async () => {
    if (!destinationAddress) {
      alert('Pilih lokasi di peta terlebih dahulu');
      return;
    }

    if (!destinationPostalCode) {
      alert('Kode pos tidak ditemukan. Mohon isi manual atau pilih lokasi lain di peta');
      return;
    }

    setCheckingShipping(true);

    try {
      const requestBody: any = {
        couriers: 'jne,jnt,sicepat,anteraja,tiki',
        items: cart.map((item) => ({
          name: item.product.name,
          description: `${item.product.name} - ${item.priceType === 'dus' ? 'Dus' : item.priceType === 'pak' ? 'Pak' : 'Renceng'}`,
          value: item.price * item.quantity,
          length: 30,
          width: 20,
          height: 15,
          weight: Math.max(1000, item.quantity * 500),
          quantity: item.quantity,
        })),
      };

      // Use coordinates if available (more accurate), otherwise use postal code
      if (destinationLat && destinationLng) {
        requestBody.origin_postal_code = 10110;
        requestBody.destination_latitude = destinationLat;
        requestBody.destination_longitude = destinationLng;
      } else if (destinationPostalCode) {
        requestBody.origin_postal_code = 10110;
        requestBody.destination_postal_code = parseInt(destinationPostalCode);
      } else {
        alert('Lokasi tidak valid. Silakan pilih lokasi di peta');
        setCheckingShipping(false);
        return;
      }

      const response = await fetch('/api/delivery/biteship/shipping-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.success && data.pricing) {
        setShippingRates(data.pricing);
      } else {
        alert(data.error || data.message || 'Gagal mengambil data ongkir');
      }
    } catch (error) {
      console.error('Error checking shipping:', error);
      alert('Terjadi kesalahan saat cek ongkir');
    } finally {
      setCheckingShipping(false);
    }
  };

  const handleCheckout = async () => {
    if (!customerName || !customerPhone) {
      alert('Nama dan nomor telepon harus diisi');
      return;
    }

    if (cart.length === 0) {
      alert('Keranjang masih kosong');
      return;
    }

    // Validasi untuk delivery
    if (deliveryMethod === 'delivery') {
      if (!destinationAddress || !destinationPostalCode || !destinationCity || !destinationProvince) {
        alert('Lengkapi semua informasi pengiriman terlebih dahulu (alamat, kota, provinsi, kode pos)');
        return;
      }
      if (!selectedShipping) {
        alert('Pilih kurir dan layanan pengiriman terlebih dahulu');
        return;
      }
    }

    setSubmitting(true);

    try {
      // Create order in database
      const orderResponse = await fetch('/api/pesanan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
          deliveryMethod,
          shippingFee: deliveryMethod === 'delivery' && selectedShipping ? selectedShipping.price : 0,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        alert(orderData.error || 'Gagal membuat pesanan');
        return;
      }

      // If delivery, create Biteship order
      if (deliveryMethod === 'delivery' && selectedShipping) {
        try {
          // Prepare Biteship order data
          const biteshipOrderData: any = {
            origin_contact_name: 'Toko Naning',
            origin_contact_phone: '081234567890',
            origin_address: 'Jl. Raya Sembako No. 123, Jakarta',
            destination_contact_name: customerName,
            destination_contact_phone: customerPhone,
            destination_address: destinationAddress,
            courier_company: selectedShipping.courier_code,
            courier_type: selectedShipping.courier_service_code,
            delivery_type: 'now',
            items: cart.map((item) => ({
              name: item.product.name,
              description: `${item.product.name} - ${item.priceType === 'dus' ? 'Dus' : item.priceType === 'pak' ? 'Pak' : 'Renceng'}`,
              value: item.price * item.quantity,
              length: 30,
              width: 20,
              height: 15,
              weight: Math.max(1000, item.quantity * 500),
              quantity: item.quantity,
            })),
            reference_id: `ORDER-${orderData.id}`,
          };

          // Add origin postal code (always required)
          biteshipOrderData.origin_postal_code = 10110;

          // Add destination postal code or coordinate
          if (destinationPostalCode) {
            biteshipOrderData.destination_postal_code = parseInt(destinationPostalCode);
          }
          
          if (destinationLat && destinationLng) {
            biteshipOrderData.destination_coordinate = {
              latitude: destinationLat,
              longitude: destinationLng,
            };
          }

          // Add destination note if available
          if (destinationCity && destinationProvince) {
            biteshipOrderData.destination_note = `${destinationCity}, ${destinationProvince}`;
          }

          console.log('Creating Biteship order with data:', JSON.stringify(biteshipOrderData, null, 2));

          const biteshipOrderResponse = await fetch('/api/delivery/biteship/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(biteshipOrderData),
          });

          const biteshipOrder = await biteshipOrderResponse.json();
          
          if (biteshipOrderResponse.ok && biteshipOrder.success) {
            console.log('✅ Biteship order created successfully:', biteshipOrder);
            console.log('Tracking ID:', biteshipOrder.courier?.tracking_id);
            console.log('Waybill ID:', biteshipOrder.courier?.waybill_id);
            // Optionally save tracking_id to order in database
          } else {
            console.error('❌ Biteship order failed:', biteshipOrder);
            const errorMsg = biteshipOrder.error || biteshipOrder.message || 'Gagal membuat order pengiriman';
            console.error('Error details:', errorMsg);
            // Show warning but don't block the checkout flow
            alert(`Peringatan: ${errorMsg}. Pesanan tetap dibuat, silakan hubungi admin untuk pengiriman.`);
          }
        } catch (error: any) {
          console.error('❌ Error creating Biteship order:', error);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
          // Show warning but don't block the checkout flow
          alert('Peringatan: Gagal membuat order pengiriman. Pesanan tetap dibuat, silakan hubungi admin untuk pengiriman.');
        }
      }

      // Clear cart after successful order creation
      cartService.clearCart();
      
      // If payment method is tunai (only for pickup), just redirect
      if (paymentMethod === 'tunai' && deliveryMethod === 'pickup') {
        alert('Pesanan berhasil dibuat! Silakan lakukan pembayaran tunai saat pengambilan.');
        router.push('/pesanan');
        return;
      }

      // If payment method is midtrans OR delivery, get token and open Snap directly
      const tokenResponse = await fetch('/api/payment/midtrans/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.id,
          grossAmount: getTotalPrice(),
          customerName,
          customerPhone,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        alert('Gagal membuat payment token');
        return;
      }

      // Open Midtrans Snap directly - popup will appear automatically
      const openSnapPopup = () => {
        if (typeof window !== 'undefined' && (window as any).snap) {
          (window as any).snap.pay(tokenData.token, {
            onSuccess: (result: any) => {
              console.log('Payment success:', result);
            },
            onPending: (result: any) => {
              console.log('Payment pending:', result);
            },
            onError: (result: any) => {
              console.log('Payment error:', result);
            },
            onClose: () => {
              console.log('Payment popup closed by user');
            },
          });
        } else {
          setTimeout(() => {
            if (typeof window !== 'undefined' && (window as any).snap) {
              openSnapPopup();
            } else {
              alert('Gagal memuat halaman pembayaran. Silakan refresh halaman.');
            }
          }, 1000);
        }
      };

      openSnapPopup();
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Terjadi kesalahan saat checkout');
    } finally {
      setSubmitting(false);
    }
  };

  // Load Midtrans script
  useEffect(() => {
    if (isAuthenticated) {
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
    }
  }, [isAuthenticated]);

  if (loading || !cartLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // If cart is empty, show message
  if (cart.length === 0 && !searchParams?.get('productId')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-gray-200 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Keranjang Kosong</h2>
              <p className="text-gray-600 mb-6">
                Belum ada produk di keranjang. Pilih produk terlebih dahulu.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/produk')}
                  className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-gray-900"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Lihat Produk
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/keranjang')}
                  className="w-full"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Lihat Keranjang
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
            <p className="text-gray-600">Review pesanan Anda dan lengkapi informasi pengiriman</p>
          </div>
          <Link href="/produk">
            <Button variant="outline" size="sm">
              <Package className="h-4 w-4 mr-2" />
              Tambah Produk
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart */}
          <div className="lg:col-span-2">
            <Card className="border-gray-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Keranjang
                </CardTitle>
              </CardHeader>
              <CardContent>
                {cart.length > 0 ? (
                  <div className="space-y-3">
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.product.name}</p>
                          <p className="text-sm text-gray-600">
                            {item.priceType === 'dus' ? 'Dus' : item.priceType === 'pak' ? 'Pak' : 'Renceng'} - {formatRupiah(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.productId, item.priceType, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateCartQuantity(item.productId, item.priceType, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.productId, item.priceType)}
                            className="ml-2 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">
                    Keranjang kosong
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Checkout Form - sama seperti sebelumnya */}
          <div className="lg:col-span-1">
            <Card className="border-gray-200 shadow-md sticky top-4">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Informasi Pesanan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customerName">Nama Lengkap</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="customerPhone">Nomor Telepon / WhatsApp</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Metode Pengiriman</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant={deliveryMethod === 'pickup' ? 'default' : 'outline'}
                      onClick={() => {
                        setDeliveryMethod('pickup');
                        setShippingFee(0);
                        setShippingRates([]);
                        setSelectedShipping(null);
                        setDestinationAddress('');
                        setDestinationPostalCode('');
                        setDestinationCity('');
                        setDestinationProvince('');
                        setDestinationLat(null);
                        setDestinationLng(null);
                      }}
                      className="flex-1"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Ambil Sendiri
                    </Button>
                    <Button
                      type="button"
                      variant={deliveryMethod === 'delivery' ? 'default' : 'outline'}
                      onClick={() => {
                        setDeliveryMethod('delivery');
                        setPaymentMethod('midtrans');
                      }}
                      className="flex-1"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Antar
                    </Button>
                  </div>
                  
                  {deliveryMethod === 'pickup' && (
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-5 w-5 text-[#ffd700] mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 mb-1">Ambil Sendiri di Toko</p>
                          <p className="text-xs text-gray-600">
                            Anda akan mengambil pesanan langsung di toko. Tidak ada biaya pengiriman. 
                            Pembayaran dapat dilakukan tunai atau online.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {deliveryMethod === 'delivery' && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Truck className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900 mb-1">Pesanan Dikirim ke Alamat</p>
                          <p className="text-xs text-blue-700">
                            Pesanan akan dikirim ke alamat Anda. Mohon lengkapi informasi pengiriman di bawah. 
                            Pembayaran harus dilakukan melalui Payment Gateway.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {deliveryMethod === 'delivery' && (
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Truck className="h-5 w-5 text-[#ffd700]" />
                        Informasi Pengiriman
                      </h4>
                    </div>

                    <div>
                      <Label>Pilih Lokasi di Peta *</Label>
                      <p className="text-xs text-gray-500 mb-2">
                        Klik pada peta untuk memilih lokasi pengiriman. Alamat akan terisi otomatis.
                      </p>
                      <MapPicker
                        onLocationSelect={handleMapLocationSelect}
                        initialPosition={destinationLat && destinationLng ? [destinationLat, destinationLng] : undefined}
                      />
                      {loadingAddress && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Mengambil alamat...</span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="destinationAddress">Alamat Lengkap *</Label>
                      <Input
                        id="destinationAddress"
                        value={destinationAddress}
                        onChange={(e) => setDestinationAddress(e.target.value)}
                        placeholder="Alamat akan terisi otomatis setelah memilih lokasi di peta"
                        required
                        disabled={loadingAddress}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Anda dapat mengedit alamat secara manual jika perlu
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="destinationCity">Kota/Kabupaten *</Label>
                        <Input
                          id="destinationCity"
                          value={destinationCity}
                          onChange={(e) => setDestinationCity(e.target.value)}
                          placeholder="Jakarta"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="destinationProvince">Provinsi *</Label>
                        <Input
                          id="destinationProvince"
                          value={destinationProvince}
                          onChange={(e) => setDestinationProvince(e.target.value)}
                          placeholder="DKI Jakarta"
                          required
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="destinationPostalCode">Kode Pos *</Label>
                      <div className="flex gap-2">
                        <Input
                          id="destinationPostalCode"
                          value={destinationPostalCode}
                          onChange={(e) => setDestinationPostalCode(e.target.value)}
                          placeholder="10110"
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={checkShippingRates}
                          disabled={checkingShipping || !destinationAddress || !destinationPostalCode || !destinationCity || !destinationProvince}
                          className="whitespace-nowrap"
                        >
                          {checkingShipping ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Mengecek...
                            </>
                          ) : (
                            'Cek Ongkir'
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Klik "Cek Ongkir" untuk melihat pilihan kurir dan layanan
                      </p>
                    </div>
                    
                    {shippingRates.length > 0 && (
                      <div>
                        <Label>Pilih Kurir & Layanan Pengiriman *</Label>
                        <div className="space-y-2 mt-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                          {shippingRates.map((rate: any, index) => (
                            <div
                              key={index}
                              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                selectedShipping?.courier_code === rate.courier_code &&
                                selectedShipping?.courier_service_code === rate.courier_service_code
                                  ? 'border-[#ffd700] bg-[#ffd700]/10 shadow-md'
                                  : 'border-gray-200 hover:border-[#ffd700]/50 hover:bg-gray-50'
                              }`}
                              onClick={() => {
                                setSelectedShipping(rate);
                                setShippingFee(rate.price);
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="font-semibold text-sm text-gray-900">{rate.courier_name}</p>
                                    {selectedShipping?.courier_code === rate.courier_code &&
                                    selectedShipping?.courier_service_code === rate.courier_service_code && (
                                      <span className="text-xs bg-[#ffd700] text-gray-900 px-2 py-0.5 rounded font-medium">
                                        Dipilih
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 mb-1">{rate.courier_service_name}</p>
                                  <p className="text-xs text-gray-500 mb-1">Estimasi: {rate.duration}</p>
                                  {rate.description && (
                                    <p className="text-xs text-gray-400 italic">{rate.description}</p>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <p className="font-bold text-[#ffd700] text-lg">{formatRupiah(rate.price)}</p>
                                  {rate.shipping_fee_discount && rate.shipping_fee_discount > 0 && (
                                    <p className="text-xs text-green-600 line-through">
                                      {formatRupiah(rate.shipping_fee)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {!selectedShipping && (
                          <p className="text-xs text-red-600 mt-2">
                            * Pilih kurir dan layanan pengiriman terlebih dahulu
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {deliveryMethod === 'pickup' && (
                  <div>
                    <Label>Metode Pembayaran</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant={paymentMethod === 'tunai' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('tunai')}
                        className="flex-1"
                        disabled={submitting}
                      >
                        💵 Tunai
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === 'midtrans' ? 'default' : 'outline'}
                        onClick={async () => {
                          setPaymentMethod('midtrans');
                          setTimeout(() => {
                            handleCheckout();
                          }, 100);
                        }}
                        className="flex-1"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Memproses...
                          </>
                        ) : (
                          '💳 Online'
                        )}
                      </Button>
                    </div>
                    {paymentMethod === 'midtrans' && !submitting && (
                      <p className="text-xs text-blue-600 mt-2 font-medium">
                        ✓ Popup pembayaran akan muncul otomatis
                      </p>
                    )}
                  </div>
                )}
                {deliveryMethod === 'delivery' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium">
                      💳 Pembayaran akan dilakukan melalui Payment Gateway. Klik tombol Checkout untuk memulai pembayaran.
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatRupiah(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))}</span>
                  </div>
                  {deliveryMethod === 'delivery' && selectedShipping && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Ongkir:</span>
                      <span className="font-medium">{formatRupiah(selectedShipping.price)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                    <span>Total:</span>
                    <span className="text-[#ffd700]">{formatRupiah(getTotalPrice())}</span>
                  </div>
                </div>

                <Button
                  onClick={handleCheckout}
                  className="w-full"
                  disabled={submitting || cart.length === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Checkout'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

