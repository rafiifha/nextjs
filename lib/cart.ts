'use client';

export interface CartItem {
  productId: number;
  variantId?: number; // ID varian harga
  product: {
    id: number;
    name: string;
    category?: {
      id: number;
      name: string;
      priceTypes: string[];
    };
    variants?: Array<{
      id: number;
      priceType: string;
      price: number | null;
      stock: number | null;
      length?: number | null;
      width?: number | null;
      height?: number | null;
      weight?: number | null;
    }>;
  };
  priceType: string; // 'dus', 'pak', 'item', 'bal', 'kg', etc.
  quantity: number;
  price: number | null;
}

const CART_STORAGE_PREFIX = 'tokonaning_cart_';

// Helper function to get current user ID
function getCurrentUserId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user?.id || null;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// Helper function to get cart storage key
function getCartStorageKey(userId: number | null): string {
  if (userId) {
    return `${CART_STORAGE_PREFIX}${userId}`;
  }
  // Fallback to guest cart if no user
  return `${CART_STORAGE_PREFIX}guest`;
}

export const cartService = {
  getCart(userId?: number | null): CartItem[] {
    if (typeof window === 'undefined') return [];
    const currentUserId = userId !== undefined ? userId : getCurrentUserId();
    const storageKey = getCartStorageKey(currentUserId);

    try {
      const cartStr = localStorage.getItem(storageKey);
      return cartStr ? JSON.parse(cartStr) : [];
    } catch (e) {
      return [];
    }
  },

  setCart(cart: CartItem[], userId?: number | null): void {
    if (typeof window === 'undefined') return;
    const currentUserId = userId !== undefined ? userId : getCurrentUserId();
    const storageKey = getCartStorageKey(currentUserId);

    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
      // Dispatch custom event untuk update UI
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  },

  addToCart(
    productId: number,
    product: CartItem['product'],
    variantId: number | undefined,
    priceType: string,
    price: number | null,
    quantity: number = 1,
    userId?: number | null
  ): CartItem[] {
    const cart = this.getCart(userId);

    const existingIndex = cart.findIndex(
      (item) => item.productId === productId && item.priceType === priceType
    );

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push({
        productId,
        variantId,
        product,
        priceType,
        quantity,
        price,
      });
    }

    this.setCart(cart, userId);
    return cart;
  },

  updateQuantity(productId: number, priceType: string, quantity: number, userId?: number | null): CartItem[] {
    const cart = this.getCart(userId);

    if (quantity <= 0) {
      return this.removeFromCart(productId, priceType, userId);
    }

    const item = cart.find(
      (item) => item.productId === productId && item.priceType === priceType
    );

    if (item) {
      item.quantity = quantity;
      this.setCart(cart, userId);
    }

    return cart;
  },

  removeFromCart(productId: number, priceType: string, userId?: number | null): CartItem[] {
    const cart = this.getCart(userId);
    const newCart = cart.filter(
      (item) => !(item.productId === productId && item.priceType === priceType)
    );
    this.setCart(newCart, userId);
    return newCart;
  },

  clearCart(userId?: number | null): void {
    this.setCart([], userId);
  },

  getCartCount(userId?: number | null): number {
    const cart = this.getCart(userId);
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  getCartTotal(userId?: number | null): number {
    const cart = this.getCart(userId);
    return cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  },

  // Migrate cart from old key to user-specific key (for existing users)
  migrateCartToUser(userId: number): void {
    if (typeof window === 'undefined') return;

    const guestKey = getCartStorageKey(null);
    const newKey = getCartStorageKey(userId);

    try {
      const guestCartStr = localStorage.getItem(guestKey);
      if (guestCartStr) {
        const guestCart = JSON.parse(guestCartStr);
        // Only migrate if new cart is empty
        const newCart = this.getCart(userId);
        if (newCart.length === 0 && guestCart.length > 0) {
          this.setCart(guestCart, userId);
        }
        // Always remove guest cart after login to avoid items showing up after logout
        localStorage.removeItem(guestKey);
      }
    } catch (e) {
      console.error('Error migrating cart:', e);
    }
  },
};
