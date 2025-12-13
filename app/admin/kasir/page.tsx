'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { ShoppingCart, Plus, Minus, Trash2, Search, X } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  hargaDus: number;
  hargaPak: number;
  hargaRenceng: number;
  stock_online: number;
  stock_offline: number;
}

interface CartItem {
  productId: number;
  product: Product;
  priceType: 'dus' | 'pak' | 'renceng';
  quantity: number;
  price: number;
}

export default function KasirPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
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

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product, priceType: 'dus' | 'pak' | 'renceng', quantity: number = 1) => {
    const price = priceType === 'dus' ? product.hargaDus : priceType === 'pak' ? product.hargaPak : product.hargaRenceng;
    
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.productId === product.id && item.priceType === priceType
      );
      
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id && item.priceType === priceType
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      
      return [...prev, { productId: product.id, product, priceType, quantity, price }];
    });
  };

  const updateCartQuantity = (productId: number, priceType: 'dus' | 'pak' | 'renceng', quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, priceType);
      return;
    }
    
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.priceType === priceType
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeFromCart = (productId: number, priceType: 'dus' | 'pak' | 'renceng') => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.priceType === priceType))
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
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

    setSubmitting(true);

    try {
      const response = await fetch('/api/kasir', {
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Gagal membuat pesanan');
        return;
      }

      alert('Pesanan berhasil dibuat!');
      
      // Reset form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setSearchQuery('');
      
      // Refresh products
      fetchProducts();
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Terjadi kesalahan saat checkout');
    } finally {
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
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-600">Memuat produk...</div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">{product.name}</h3>
                          <div className="text-sm">
                            <p className="text-gray-600">
                              Stok Offline: <span className={product.stock_offline > 0 ? 'text-green-600 font-semibold' : 'text-red-600'}>{product.stock_offline}</span>
                            </p>
                            <p className="text-xs text-gray-400">
                              Stok Online: {product.stock_online}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addToCart(product, 'dus', 1)}
                          disabled={product.stock_offline === 0}
                          className="text-xs"
                        >
                          Dus
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addToCart(product, 'pak', 1)}
                          disabled={product.stock_offline === 0}
                          className="text-xs"
                        >
                          Pak
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addToCart(product, 'renceng', 1)}
                          disabled={product.stock_offline === 0}
                          className="text-xs"
                        >
                          Renceng
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-600">
                  Produk tidak ditemukan
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
                    placeholder="081234567890"
                  />
                </div>
              </div>

              {/* Cart Items */}
              <div className="border-t border-gray-200 pt-4">
                {cart.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cart.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border border-gray-200 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{item.product.name}</p>
                          <p className="text-xs text-gray-600">
                            {item.priceType === 'dus' ? 'Dus' : item.priceType === 'pak' ? 'Pak' : 'Renceng'} × {item.quantity}
                          </p>
                          <p className="text-xs font-medium text-gray-900">{formatRupiah(item.price * item.quantity)}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateCartQuantity(item.productId, item.priceType, item.quantity - 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
                          <Button
                            variant="ghost"
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
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600 text-sm">
                    Keranjang kosong
                  </div>
                )}
              </div>

              {/* Total */}
              {cart.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-[#ffd700]">{formatRupiah(getTotalPrice())}</span>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? 'Memproses...' : 'Checkout'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

