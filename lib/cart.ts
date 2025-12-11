'use client';

export interface CartItem {
  productId: number;
  product: {
    id: number;
    name: string;
    hargaDus: number;
    hargaPak: number;
    hargaRenceng: number;
    stok: number;
  };
  priceType: 'dus' | 'pak' | 'renceng';
  quantity: number;
  price: number;
}

const CART_STORAGE_KEY = 'tokonaning_cart';

export const cartService = {
  getCart(): CartItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const cartStr = localStorage.getItem(CART_STORAGE_KEY);
      return cartStr ? JSON.parse(cartStr) : [];
    } catch (e) {
      return [];
    }
  },

  setCart(cart: CartItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      // Dispatch custom event untuk update UI
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  },

  addToCart(product: CartItem['product'], priceType: 'dus' | 'pak' | 'renceng', quantity: number = 1): CartItem[] {
    const cart = this.getCart();
    const price = priceType === 'dus' ? product.hargaDus : priceType === 'pak' ? product.hargaPak : product.hargaRenceng;
    
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && item.priceType === priceType
    );
    
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        productId: product.id,
        product,
        priceType,
        quantity,
        price,
      });
    }
    
    this.setCart(cart);
    return cart;
  },

  updateQuantity(productId: number, priceType: 'dus' | 'pak' | 'renceng', quantity: number): CartItem[] {
    const cart = this.getCart();
    
    if (quantity <= 0) {
      return this.removeFromCart(productId, priceType);
    }
    
    const item = cart.find(
      (item) => item.productId === productId && item.priceType === priceType
    );
    
    if (item) {
      item.quantity = quantity;
      this.setCart(cart);
    }
    
    return cart;
  },

  removeFromCart(productId: number, priceType: 'dus' | 'pak' | 'renceng'): CartItem[] {
    const cart = this.getCart();
    const newCart = cart.filter(
      (item) => !(item.productId === productId && item.priceType === priceType)
    );
    this.setCart(newCart);
    return newCart;
  },

  clearCart(): void {
    this.setCart([]);
  },

  getCartCount(): number {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  getCartTotal(): number {
    const cart = this.getCart();
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
};

