'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatRupiah } from '@/lib/utils';
import { cartService, CartItem } from '@/lib/cart';
import { ShoppingCart, Plus, Minus, Trash2, X, Package, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadCart();
    }

    // Listen for cart updates
    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [isOpen]);

  const loadCart = () => {
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
    const cartData = cartService.getCart(userId);
    setCart(cartData);
    setLoading(false);
  };

  const updateQuantity = (productId: number, priceType: string, quantity: number) => {
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
    const newCart = cartService.updateQuantity(productId, priceType, quantity, userId);
    setCart(newCart);
    window.dispatchEvent(new Event('cartUpdated'));

    if (quantity === 0) {
      toast.info('Produk Dihapus', { description: 'Produk telah dihapus dari keranjang' });
    } else {
      toast.success('Jumlah Diperbarui', { description: `Jumlah produk telah diubah menjadi ${quantity}` });
    }
  };

  const removeFromCart = (productId: number, priceType: string) => {
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
    const newCart = cartService.removeFromCart(productId, priceType, userId);
    setCart(newCart);
    window.dispatchEvent(new Event('cartUpdated'));

    toast.info('Produk Dihapus', { description: 'Produk telah dihapus dari keranjang' });
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.warning('Keranjang masih kosong');
      return;
    }
    onClose();
    router.push('/checkout');
  };

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-[100dvh] w-full max-w-md bg-white shadow-xl z-[70] transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full max-h-[100dvh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-[#ffd700]" />
              <h2 className="text-xl font-bold text-gray-900">Keranjang Belanja</h2>
              {cart.length > 0 && (
                <span className="bg-[#ffd700] text-gray-900 text-xs font-bold px-2 py-1 rounded-full">
                  {cart.length}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Cart Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-600">Memuat keranjang...</p>
                </div>
              </div>
            ) : cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="p-4 bg-gray-100 rounded-full w-fit mb-4">
                  <ShoppingCart className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Keranjang Kosong</h3>
                <p className="text-gray-600 text-center mb-6">
                  Belum ada produk di keranjang Anda
                </p>
                <Button onClick={onClose} variant="outline">
                  Lanjut Belanja
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    {/* Product Image Thumbnail */}
                    <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center border border-gray-200">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">{item.product.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="capitalize">{item.priceType}</span> - {item.price ? formatRupiah(item.price) : 'Belum ada harga'}
                      </p>
                      {item.product.variants && item.variantId && (
                        <p className="text-xs text-gray-500">
                          Stok: {item.product.variants.find(v => v.id === item.variantId)?.stockOnline || 0}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.productId, item.priceType, item.quantity - 1)}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-10 text-center font-medium text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.productId, item.priceType, item.quantity + 1)}
                          disabled={
                            item.product.variants && item.variantId
                              ? item.quantity >= (item.product.variants.find(v => v.id === item.variantId)?.stockOnline || 0)
                              : false
                          }
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.productId, item.priceType)}
                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <p className="text-sm font-semibold text-gray-900">
                        {item.price ? formatRupiah(item.price * item.quantity) : 'Belum ada harga'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Total and Checkout */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold text-gray-900">Total:</span>
                <span className="text-xl font-bold text-[#ffd700]">{formatRupiah(getTotalPrice())}</span>
              </div>
              <Button onClick={handleCheckout} className="w-full" size="lg">
                Lanjut ke Checkout
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}


