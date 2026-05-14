import { useEffect, useReducer, useCallback } from 'react';
import { getHiboutikProducts, getHiboutikCategories, getHealth } from '../services/api';

const API = import.meta.env.VITE_API_URL || '';

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

/**
 * Fetch cloud catalog and merge with local.
 * Returns true if cloud data was found and merged.
 */
async function syncFromCloud(shopName) {
  if (!shopName) return false;
  try {
    const res = await fetch(`${API}/api/saas/get-catalog?shopName=${encodeURIComponent(shopName)}`);
    if (!res.ok) return false;
    const data = await res.json();
    const cloudProducts = data.products || [];
    const cloudCategories = data.categories || [];
    if (cloudProducts.length === 0 && cloudCategories.length === 0) return false;

    // Merge cloud into local (cloud wins for same IDs)
    const localProducts = getAIProducts();
    const localCategories = getAICategories();

    const productMap = new Map();
    // Local first, then cloud overwrites
    localProducts.forEach(p => productMap.set(p.id, p));
    cloudProducts.forEach(p => productMap.set(p.id, p));
    const mergedProducts = Array.from(productMap.values());

    const catMap = new Map();
    localCategories.forEach(c => catMap.set(c.id, c));
    cloudCategories.forEach(c => catMap.set(c.id, c));
    const mergedCategories = Array.from(catMap.values());

    localStorage.setItem('ai_products', JSON.stringify(mergedProducts));
    localStorage.setItem('ai_categories', JSON.stringify(mergedCategories));
    console.log(`[catalog] Cloud sync: ${cloudProducts.length} produits cloud, ${mergedProducts.length} total fusionné`);
    return true;
  } catch (e) {
    console.warn('[catalog] Cloud sync failed:', e.message);
    return false;
  }
}

/**
 * Push local AI catalog to cloud for cross-device sync.
 */
async function syncToCloud(shopName) {
  if (!shopName) return;
  try {
    const products = getAIProducts();
    const categories = getAICategories();
    await fetch(`${API}/api/saas/save-catalog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName, products, categories }),
    });
    console.log(`[catalog] Cloud push: ${products.length} produits envoyés`);
  } catch (e) {
    console.warn('[catalog] Cloud push failed:', e.message);
  }
}

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
    let products = (pRes.items || [])
      .filter((p) => !p.name.includes('(Sans ') && !p.name.includes(' + ')) // Masque les anciens résidus du bug
      .map((p) => ({
        id: p.id,
        productId: p.id,
        categoryId: p.categoryId,
        name: p.name,
        price: p.priceWithTax || p.price,
        taxRate: p.taxRate,
        stock: p.stock,
        emoji: null,
        desc: '',
      }));
    let categories = (cRes.items || []).map((c) => ({
      id: c.id,
      name: c.name,
    }));

    if (aiProducts.length > 0) {
      // FIX: Deduplicate — remove AI products whose ID already exists in Hiboutik
      // (happens after checkout provisions local products into Hiboutik)
      const hiboutikIds = new Set(products.map(p => String(p.id)));
      const uniqueAiProducts = aiProducts.filter(p => !hiboutikIds.has(String(p.id)));
      products = [...products, ...uniqueAiProducts];
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

export default function useCatalog({ enabled = true, shopName = '' } = {}) {
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

  // Sync TO cloud whenever catalog changes (debounced via caller)
  const pushToCloud = useCallback(() => {
    if (shopName) syncToCloud(shopName);
  }, [shopName]);

  useEffect(() => {
    if (!enabled) {
      dispatch({ type: 'idle' });
      return;
    }
    let alive = true;
    (async () => {
      // Step 1: Sync FROM cloud (merge any products uploaded from another device)
      if (shopName) {
        await syncFromCloud(shopName);
      }
      // Step 2: Fetch and merge with Hiboutik
      const payload = await fetchCatalog();
      if (alive) dispatch({ type: 'success', payload });
    })();
    return () => {
      alive = false;
    };
  }, [enabled, shopName]);

  return { ...state, reload, pushToCloud };
}
