import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { computeTotals, type CouponRule } from "./pricing";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  color: string | null;
  unitPrice: number;
  regularPrice: number;
  quantity: number;
  /** null = made to order, no limit */
  maxQty: number | null;
};

type CartState = { lines: CartLine[]; coupon: CouponRule | null; note: string };

type CartContextValue = CartState & {
  hydrated: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  count: number;
  totals: { subtotal: number; discount: number; total: number };
  addItem: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  applyCoupon: (coupon: CouponRule | null) => void;
  setNote: (note: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "warmstitch-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

function clampQty(q: number, max: number | null) {
  const upper = max == null ? 20 : Math.min(max, 20);
  return Math.max(1, Math.min(Math.floor(q), upper));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>({ lines: [], coupon: null, note: "" });
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CartState>;
        setState({
          lines: Array.isArray(parsed.lines) ? parsed.lines : [],
          coupon: parsed.coupon ?? null,
          note: typeof parsed.note === "string" ? parsed.note : "",
        });
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const addItem = useCallback((line: Omit<CartLine, "key">) => {
    const key = `${line.productId}::${line.color ?? ""}`;
    setState((s) => {
      const existing = s.lines.find((l) => l.key === key);
      const lines = existing
        ? s.lines.map((l) =>
            l.key === key ? { ...l, ...line, key, quantity: clampQty(l.quantity + line.quantity, line.maxQty) } : l,
          )
        : [...s.lines, { ...line, key, quantity: clampQty(line.quantity, line.maxQty) }];
      return { ...s, lines };
    });
    setOpen(true);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setState((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: clampQty(quantity, l.maxQty) } : l)),
    }));
  }, []);

  const removeItem = useCallback((key: string) => {
    setState((s) => ({ ...s, lines: s.lines.filter((l) => l.key !== key) }));
  }, []);

  const applyCoupon = useCallback((coupon: CouponRule | null) => setState((s) => ({ ...s, coupon })), []);
  const setNote = useCallback((note: string) => setState((s) => ({ ...s, note: note.slice(0, 1000) })), []);
  const clear = useCallback(() => setState({ lines: [], coupon: null, note: "" }), []);

  const value = useMemo<CartContextValue>(() => {
    const count = state.lines.reduce((n, l) => n + l.quantity, 0);
    const totals = computeTotals(state.lines, state.coupon);
    return {
      ...state,
      hydrated,
      open,
      setOpen,
      count,
      totals,
      addItem,
      setQuantity,
      removeItem,
      applyCoupon,
      setNote,
      clear,
    };
  }, [state, hydrated, open, addItem, setQuantity, removeItem, applyCoupon, setNote, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
