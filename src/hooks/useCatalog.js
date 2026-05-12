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

const getAIProducts = () => {
  const saved = localStorage.getItem('ai_products');
  return saved ? JSON.parse(saved) : [];
};

const getAICategories = () => {
  const saved = localStorage.getItem('ai_categories');
  return saved ? JSON.parse(saved) : [];
};

async function fetchCatalog() {
  let health = null;
  let isPremiumUser = false;
  try {
    const [hRes, sRes] = await Promise.all([
      getHealth(),
      fetch(`${import.meta.env.VITE_API_URL}/api/saas/status`).then(r => r.json())
    ]);
    health = hRes;
    isPremiumUser = sRes.isPremium;
  } catch {
    /* ignore */
  }

  const aiProducts = isPremiumUser ? getAIProducts() : [];
  const aiCategories = isPremiumUser ? getAICategories() : [];

  const fallbackPayload = {
    source: 'fallback',
    products: FALLBACK_PRODUCTS,
    categories: FALLBACK_CATEGORIES,
    health,
  };

  if (aiProducts.length > 0) {
    fallbackPayload.products = [...FALLBACK_PRODUCTS, ...aiProducts];
    fallbackPayload.categories = Array.from(new Map([...FALLBACK_CATEGORIES, ...aiCategories].map(c => [c.id, c])).values());
  }

  try {
    const [pRes, cRes] = await Promise.all([
      getHiboutikProducts(),
      getHiboutikCategories(),
    ]);
    let products = (pRes.items || []).map((p) => ({
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
    let categories = (cRes.items || []).map((c) => ({
      id: c.id,
      name: c.name,
    }));

    if (aiProducts.length > 0) {
      products = [...products, ...aiProducts];
      categories = Array.from(new Map([...categories, ...aiCategories].map(c => [c.id, c])).values());
    }

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
