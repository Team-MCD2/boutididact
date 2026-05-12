import { useEffect, useReducer, useCallback } from 'react';
import { getHiboutikProducts, getHiboutikCategories, getHealth } from '../services/api';

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
    case 'idle':
      return { ...state, loading: false };
    default:
      return state;
  }
}

const getAIProducts = () => {
  try { return JSON.parse(localStorage.getItem('ai_products') || '[]'); } catch { return []; }
};
const getAICategories = () => {
  try { return JSON.parse(localStorage.getItem('ai_categories') || '[]'); } catch { return []; }
};

async function fetchCatalog() {
  let health = null;
  try {
    health = await getHealth();
  } catch {
    /* ignore */
  }

  const aiProducts = getAIProducts();
  const aiCategories = getAICategories();

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

    return { source: 'hiboutik', products, categories, health };
  } catch (e) {
    console.warn('[catalog] Hiboutik indisponible :', e.message);
    // Pas de fallback démo : on renvoie ce que l'utilisateur a localement (IA), sinon vide.
    return {
      source: aiProducts.length ? 'local' : 'offline',
      products: aiProducts,
      categories: aiCategories,
      health,
    };
  }
}

export default function useCatalog({ enabled = true } = {}) {
  const [state, dispatch] = useReducer(reducer, initial);

  const reload = useCallback(async () => {
    if (!enabled) {
      dispatch({ type: 'idle' });
      return;
    }
    dispatch({ type: 'loading' });
    try {
      const payload = await fetchCatalog();
      dispatch({ type: 'success', payload });
    } catch (e) {
      dispatch({ type: 'error', error: e });
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'idle' });
      return;
    }
    let alive = true;
    (async () => {
      const payload = await fetchCatalog();
      if (alive) dispatch({ type: 'success', payload });
    })();
    return () => {
      alive = false;
    };
  }, [enabled]);

  return { ...state, reload };
}
