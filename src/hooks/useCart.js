import { useCallback, useMemo, useState } from 'react';

export default function useCart() {
  const [items, setItems] = useState([]);

  const add = useCallback((product) => {
    setItems((prev) => {
      const existing = prev.find((it) => it.id === product.id);
      if (existing) {
        return prev.map((it) =>
          it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const update = useCallback((id, delta) => {
    setItems((prev) =>
      prev
        .map((it) => (it.id === id ? { ...it, quantity: it.quantity + delta } : it))
        .filter((it) => it.quantity > 0)
    );
  }, []);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const totals = useMemo(() => {
    const totalAmount = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const totalItems = items.reduce((s, it) => s + it.quantity, 0);
    return {
      totalAmount: Number(totalAmount.toFixed(2)),
      totalItems,
    };
  }, [items]);

  return { items, add, update, remove, clear, ...totals };
}
