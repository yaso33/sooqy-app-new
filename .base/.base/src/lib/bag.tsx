import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BagItem } from "./sooqy";

type BagCtx = {
  items: BagItem[];
  count: number;
  add: (item: BagItem) => void;
  setQty: (offerId: string, qty: number) => void;
  remove: (offerId: string) => void;
  clear: () => void;
};

const Ctx = createContext<BagCtx | null>(null);
const KEY = "sooqy:bag";

export function BagProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BagItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const persist = useCallback((next: BagItem[]) => {
    setItems(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const value = useMemo<BagCtx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      add: (item) => {
        const existing = items.find((i) => i.offerId === item.offerId);
        persist(
          existing
            ? items.map((i) => (i.offerId === item.offerId ? { ...i, quantity: Math.min(10, i.quantity + item.quantity), options: item.options } : i))
            : [...items, item],
        );
      },
      setQty: (offerId, qty) => persist(items.map((i) => (i.offerId === offerId ? { ...i, quantity: Math.max(1, Math.min(10, qty)) } : i))),
      remove: (offerId) => persist(items.filter((i) => i.offerId !== offerId)),
      clear: () => persist([]),
    }),
    [items, persist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBag() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useBag outside BagProvider");
  return v;
}
