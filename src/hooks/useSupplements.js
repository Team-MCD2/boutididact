import { useState, useEffect } from 'react';

const STORAGE_KEY = 'boutididact_supplements';

export default function useSupplements() {
  const [supplements, setSupplements] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSupplements(JSON.parse(saved));
      } catch (e) {
        setSupplements([]);
      }
    }
  }, []);

  const add = (name, price) => {
    const newSupps = [...supplements, { id: Date.now().toString(), name, price: Number(price) }];
    setSupplements(newSupps);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSupps));
  };

  const remove = (id) => {
    const newSupps = supplements.filter((s) => s.id !== id);
    setSupplements(newSupps);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSupps));
  };

  return { supplements, add, remove };
}
