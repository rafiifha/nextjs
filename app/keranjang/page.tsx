'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRupiah } from '@/lib/utils';
import { cartService, CartItem } from '@/lib/cart';
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Package, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function KeranjangPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCart();
    
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
    setLoading(false);
  };

  const updateQuantity = (productId: number, priceType: 'dus' | 'pak' | 'renceng', quantity: number) => {
    const newCart = cartService.updateQuantity(productId, priceType, quantity);
    setCart(newCart);
  };

  const removeFromCart = (productId: number, priceType: 'dus' | 'pak' | 'renceng') => {
    const newCart = cartService.removeFromCart(productId, priceType);
    setCart(newCart);
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Keranjang masih kosong');
      return;
    }
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#ffd700] mx-auto mb-4" />
          <p className="text-gray-600">Memuat keranjang...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Keranjang Belanja</h1>
          <p className="text-gray-600">Review dan kelola produk yang ingin Anda beli</p>
        </div>

        {cart.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.map((item, index) => (
                <Card key={index} className="border-gray-200 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{item.product.name}</h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Varian:</span>
                            <span className="px-2 py-1 bg-[#ffd700]/20 text-gray-900 rounded text-sm font-medium">
                              {item.priceType === 'dus' ? 'Dus' : item.priceType === 'pak' ? 'Pak' : 'Renceng'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Harga:</span>
                            <span className="font-semibold text-gray-900">{formatRupiah(item.price)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Stok tersedia:</span>
                            <span className={`text-sm font-medium ${item.product.stok > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.product.stok}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col items-end gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600 mb-1">Subtotal</p>
                          <p className="text-xl font-bold text-[#ffd700]">
                            {formatRupiah(item.price * item.quantity)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.productId, item.priceType, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-medium text-gray-900">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.productId, item.priceType, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stok}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.productId, item.priceType)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <Card className="border-gray-200 shadow-md sticky top-4">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Ringkasan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Item:</span>
                      <span className="font-medium text-gray-900">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)} item
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                      <span>Total Harga:</span>
                      <span className="text-[#ffd700]">{formatRupiah(getTotalPrice())}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <Button
                      onClick={handleCheckout}
                      className="w-full bg-[#ffd700] hover:bg-[#e6c200] text-gray-900 font-semibold"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Lanjut ke Checkout
                    </Button>
                    <Link href="/produk" className="block">
                      <Button
                        variant="outline"
                        className="w-full"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Lanjut Belanja
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="border-gray-200 shadow-md">
            <CardContent className="pt-12 pb-12">
              <div className="text-center">
                <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Keranjang Kosong</h3>
                <p className="text-gray-600 mb-6">
                  Belum ada produk di keranjang Anda. Mulai belanja sekarang!
                </p>
                <Link href="/produk">
                  <Button className="bg-[#ffd700] hover:bg-[#e6c200] text-gray-900">
                    <Package className="h-4 w-4 mr-2" />
                    Lihat Produk
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

