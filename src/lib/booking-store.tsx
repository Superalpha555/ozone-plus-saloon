import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Service } from "./catalog";

type CartItem = { service: Service; qty: number };

type BookingContextValue = {
  items: CartItem[];
  add: (service: Service) => void;
  remove: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  count: number;
  subtotal: number;
  duration: number;
};

const BookingContext = createContext<BookingContextValue | null>(null);

const STORAGE_KEY = "ozoneplus.cart.v1";

export function BookingProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const restored = parsed.filter(
        (i): i is CartItem =>
          !!i && typeof i === "object" && "service" in i && "qty" in i &&
          !!(i as CartItem).service?.id && Number((i as CartItem).qty) > 0,
      );
      if (restored.length) setItems(restored);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items]);

  const add = useCallback((service: Service) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.service.id === service.id);
      if (existing)
        return prev.map((i) => (i.service.id === service.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { service, qty: 1 }];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) =>
      prev
        .map((i) => (i.service.id === id ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<BookingContextValue>(() => {
    const subtotal = items.reduce((sum, i) => sum + i.service.price * i.qty, 0);
    const duration = items.reduce((sum, i) => sum + i.service.duration * i.qty, 0);
    return {
      items,
      add,
      remove,
      clear,
      has: (id: string) => items.some((i) => i.service.id === id),
      count: items.reduce((sum, i) => sum + i.qty, 0),
      subtotal,
      duration,
    };
  }, [items, add, remove, clear]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside BookingProvider");
  return ctx;
}
