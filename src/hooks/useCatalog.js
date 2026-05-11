import { useEffect, useReducer, useCallback } from 'react';
import { getHiboutikProducts, getHiboutikCategories, getHealth } from '../services/api';
import { FALLBACK_PRODUCTS, FALLBACK_CATEGORIES } from '../data/fallbackProducts';

const EMOJIS = ['🍔', '🧀', '🥓', '🍗', '🍟', '🧅', '🥤', '🧃', '💧', '🍮', '🍰', '🍨', '🌮', '🌯', '🥗', '🍕'];
const emojiFor = (id) => EMOJIS[Math.abs(Number(id) || 0) % EMOJIS.length];

const initial = {
  loading: true,
  source: null,
  products: [],
  categories: [],
  health: null,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'loading':
      return { ...state, loading: true, error: null };
    case 'success':
      return {
        ...state,
        loading: false,
        source: action.payload.source,
        products: action.payload.products,
        categories: action.payload.categories,
        health: action.payload.health ?? state.health,
        error: null,
      };
    case 'health':
      return { ...state, health: action.payload };
    case 'error':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}

async function fetchCatalog() {
  let health = null;
  try {
    health = await getHealth();
  } catch {
    /* ignore */
  }

  const fallbackPayload = {
    source: 'fallback',
    products: FALLBACK_PRODUCTS,
    categories: FALLBACK_CATEGORIES,
    health,
  };

  try {
    const [pRes, cRes] = await Promise.all([
      getHiboutikProducts(),
      getHiboutikCategories(),
    ]);
    const products = (pRes.items || []).map((p) => ({
      id: p.id,
      productId: p.id,
      categoryId: p.categoryId,
      name: p.name,
      price: p.priceWithTax || p.price,
      taxRate: p.taxRate,
      stock: p.stock,
      emoji: emojiFor(p.id),
      desc: '',
    }));
    const categories = (cRes.items || []).map((c) => ({
      id: c.id,
      name: c.name,
    }));
    if (!products.length) return fallbackPayload;
    return { source: 'hiboutik', products, categories, health };
  } catch (e) {
    console.warn('[catalog] fallback :', e.message);
    return fallbackPayload;
  }
}

export default function useCatalog() {
  const [state, dispatch] = useReducer(reducer, initial);

  const reload = useCallback(async () => {
    dispatch({ type: 'loading' });
    try {
      const payload = await fetchCatalog();
      dispatch({ type: 'success', payload });
    } catch (e) {
      dispatch({ type: 'error', error: e });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const payload = await fetchCatalog();
      if (alive) dispatch({ type: 'success', payload });
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { ...state, reload };
}
