"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
};

type CartContextType = {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "barbearia-cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedCart = window.localStorage.getItem(STORAGE_KEY);
      if (storedCart) {
        setCart(JSON.parse(storedCart) as CartItem[]);
      }
    } catch {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Private mobile browsers can block storage access entirely.
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Keep the cart in memory if storage is unavailable.
    }
  }, [cart, hydrated]);

  const addToCart = useCallback(function addToCart(item: CartItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);

      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }

      return [...prev, item];
    });
  }, []);

  const removeFromCart = useCallback(function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback(function updateQuantity(
    productId: string,
    quantity: number
  ) {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.productId !== productId)
        : prev.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          )
    );
  }, []);

  const clearCart = useCallback(function clearCart() {
    setCart([]);
  }, []);

  const value = useMemo(
    () => ({
      cart,
      cartCount: cart.reduce((acc, item) => acc + item.quantity, 0),
      cartTotal: cart.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
      ),
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }),
    [addToCart, cart, clearCart, removeFromCart, updateQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart deve ser usado dentro de CartProvider");
  }

  return context;
}
