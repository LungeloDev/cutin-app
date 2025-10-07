// context/cart-context.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type CartItem = {
  id: string;           // menu item id
  name: string;
  price: number;
  qty: number;
};

type CartState = {
  merchantId: string | null;
  merchantName: string | null;
  items: CartItem[];
};

type CartContextType = {
  cart: CartState;
  addItem: (merchant: { id: string; shopName?: string | null }, item: Omit<CartItem, "qty">) => void;
  removeItem: (id: string) => void;
  changeQty: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  totalQty: number;
};

const CartContext = createContext<CartContextType | null>(null);
const STORAGE_KEY = "@cutin_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>({
    merchantId: null,
    merchantName: null,
    items: [],
  });

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setCart(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cart)).catch(() => {});
  }, [cart]);

  const clearCart = () =>
    setCart({ merchantId: null, merchantName: null, items: [] });

  const addItem = (
    merchant: { id: string; shopName?: string | null },
    item: Omit<CartItem, "qty">
  ) => {
    // enforce single-merchant cart
    if (cart.merchantId && cart.merchantId !== merchant.id) {
      Alert.alert(
        "Start a new cart?",
        "Your cart has items from another restaurant. Clear cart to add from this one?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear & Add",
            style: "destructive",
            onPress: () =>
              setCart({
                merchantId: merchant.id,
                merchantName: merchant.shopName ?? null,
                items: [{ ...item, qty: 1 }],
              }),
          },
        ]
      );
      return;
    }

    setCart((prev) => {
      const exists = prev.items.find((i) => i.id === item.id);
      if (exists) {
        return {
          ...prev,
          merchantId: prev.merchantId ?? merchant.id,
          merchantName: prev.merchantName ?? merchant.shopName ?? null,
          items: prev.items.map((i) =>
            i.id === item.id ? { ...i, qty: i.qty + 1 } : i
          ),
        };
      }
      return {
        ...prev,
        merchantId: prev.merchantId ?? merchant.id,
        merchantName: prev.merchantName ?? merchant.shopName ?? null,
        items: [...prev.items, { ...item, qty: 1 }],
      };
    });
  };

  const removeItem = (id: string) =>
    setCart((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));

  const changeQty = (id: string, qty: number) =>
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.id === id ? { ...i, qty: Math.max(1, qty) } : i)),
    }));

  const totals = useMemo(() => {
    const total = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const totalQty = cart.items.reduce((sum, i) => sum + i.qty, 0);
    return { total, totalQty };
  }, [cart.items]);

  const value: CartContextType = {
    cart,
    addItem,
    removeItem,
    changeQty,
    clearCart,
    total: totals.total,
    totalQty: totals.totalQty,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
