import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Activity,
  ArrowLeft,
  ChevronRight,
  Search,
  Settings,
  XCircle,
} from 'lucide-react';
import logoUrl from '../assets/logo.svg';
import useLongPress from '../hooks/useLongPress';
import ProductImage from '../components/ProductImage';

const EMOJI_BY_NAME = (name = '') => {
  const n = name.toLowerCase();
  if (/burger|cheese|smash|bacon/.test(n)) return '🍔';
  if (/chicken|poulet/.test(n)) return '🍗';
  if (/frite|fries/.test(n)) return '🍟';
  if (/onion/.test(n)) return '🧅';
  if (/coca|soda|cola/.test(n)) return '🥤';
  if (/tea|jus/.test(n)) return '🧃';
  if (/eau|water/.test(n)) return '💧';
  if (/glace|ice/.test(n)) return '🍨';
  if (/cheesecake|tart|gateau/.test(n)) return '🍰';
  if (/tiramisu/.test(n)) return '🍮';
  if (/pizza/.test(n)) return '🍕';
  if (/salade|salad/.test(n)) return '🥗';
  return '🍽️';
};

export default function MenuScreen({
  products,
  categories,
  cart,
  onAdd,
  onUpdate,
  onClear,
  onCancel,
  onCheckout,
  onAdmin,
  source,
}) {
  const [activeCat, setActiveCat] = useState('all');
  const [query, setQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const allCategories = useMemo(
    () => [{ id: 'all', name: 'Tout' }, ...(categories || [])],
    [categories]
  );

  const filtered = useMemo(() => {
    let list = activeCat === 'all' ? products : products.filter((p) => p.categoryId === activeCat);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCat, query]);

  const totalAmount = cart.items.reduce((s, it) => s + it.price * it.quantity, 0);
  const totalItems = cart.items.reduce((s, it) => s + it.quantity, 0);

  const adminPress = useLongPress(onAdmin, 3000);

  return (
    <div className="flex h-screen w-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 overflow-hidden">
      {/* ========== ZONE GAUCHE ========== */}
      <div className="flex-1 min-w-0 flex flex-col h-full">
        {/* Header */}
        <header className="px-10 py-6 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-5">
            <button
              onClick={onCancel}
              className="w-14 h-14 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 transition flex items-center justify-center shadow-sm"
              aria-label="Retour"
            >
              <ArrowLeft size={26} className="text-gray-700" />
            </button>
            <div
              {...adminPress}
              className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md border border-gray-100 p-2 select-none"
            >
              <img src={logoUrl} alt="" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight leading-none">
                BOUTIDIDACT
              </h1>
              <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.25em] mt-1">
                Borne — Choisissez vos produits
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {source === 'fallback' && (
              <span className="px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-bold border border-amber-200">
                Mode démo
              </span>
            )}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-emerald-700 text-sm">
                {source === 'hiboutik' ? 'Hiboutik en ligne' : 'Système prêt'}
              </span>
            </div>
            <button
              onClick={onAdmin}
              className="w-12 h-12 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
              aria-label="Admin"
              title="Admin (PIN)"
            >
              <Settings size={20} />
            </button>
          </div>
        </header>

        {/* Recherche + catégories */}
        <div className="px-10 py-5 flex flex-col gap-4 border-b border-gray-100 bg-white/40">
          <div className="relative">
            <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white border border-gray-200 text-lg font-medium focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {allCategories.map((cat) => {
              const active = activeCat === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-base whitespace-nowrap transition-all active:scale-95
                    ${active
                      ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20 scale-105'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'}`}
                >
                  {cat.id === 'all' && <Activity size={18} />}
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Grille produits */}
        <div className="flex-1 overflow-y-auto px-10 py-6">
          {filtered.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3">
              <p className="text-2xl font-bold">Aucun produit</p>
              <p>Ajustez votre recherche ou changez de catégorie.</p>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-2 lg:grid-cols-3 gap-5">
              <AnimatePresence>
                {filtered.map((p) => {
                  const inCart = cart.items.find((it) => it.id === p.id);
                  return (
                    <motion.button
                      key={p.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onAdd(p)}
                      className="relative bg-white rounded-3xl p-6 text-left border border-gray-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 transition-all flex flex-col min-h-[220px] group overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-50 rounded-bl-full -z-0 group-hover:scale-110 transition" />
                      <div className="z-10 mb-3 h-20 flex items-center justify-center">
                        <ProductImage
                          productId={typeof p.productId === 'number' ? p.productId : null}
                          fallback={p.emoji || EMOJI_BY_NAME(p.name)}
                          alt={p.name}
                          className="text-6xl drop-shadow max-h-20 max-w-full object-contain"
                        />
                      </div>
                      <div className="mt-auto z-10">
                        <h3 className="text-xl font-bold text-gray-900 leading-tight line-clamp-2">
                          {p.name}
                        </h3>
                        {p.desc && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.desc}</p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-2xl font-black text-indigo-600">
                            {Number(p.price).toFixed(2)} €
                          </span>
                          <div
                            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all
                              ${inCart
                                ? 'bg-emerald-500 text-white scale-100'
                                : 'bg-gray-900 text-white scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100'}`}
                          >
                            {inCart ? (
                              <span className="text-sm font-black">{inCart.quantity}</span>
                            ) : (
                              <Plus size={20} />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* ========== PANIER DROITE ========== */}
      <aside className="w-[420px] xl:w-[460px] shrink-0 bg-white border-l border-gray-200 shadow-2xl flex flex-col">

        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-3 min-w-0">
              <span className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <ShoppingBag size={20} />
              </span>
              <span className="truncate">Ma commande</span>
            </h2>
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-black whitespace-nowrap shrink-0">
              {totalItems} {totalItems > 1 ? 'articles' : 'article'}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/40">
          <AnimatePresence>
            {cart.items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 py-20"
              >
                <div className="w-28 h-28 bg-gray-100 rounded-full flex items-center justify-center">
                  <ShoppingBag size={56} className="text-gray-300" />
                </div>
                <p className="font-bold text-xl">Votre panier est vide</p>
                <p className="text-sm">Touchez un produit pour l&apos;ajouter.</p>
              </motion.div>
            ) : (
              cart.items.map((it) => (
                <motion.div
                  key={it.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20, scale: 0.9 }}
                  className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3"
                >
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                    <ProductImage
                      productId={typeof it.productId === 'number' ? it.productId : null}
                      fallback={it.emoji || EMOJI_BY_NAME(it.name)}
                      alt={it.name}
                      className="text-2xl max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 truncate">{it.name}</h4>
                    <p className="text-indigo-600 font-bold">
                      {(it.price * it.quantity).toFixed(2)} €
                    </p>
                  </div>
                  <div className="flex items-center bg-gray-100 rounded-full p-1 border border-gray-200">
                    <button
                      onClick={() => onUpdate(it.id, -1)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-700 hover:text-red-500 active:scale-90 transition"
                    >
                      {it.quantity === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
                    </button>
                    <span className="w-9 text-center font-black text-gray-900">
                      {it.quantity}
                    </span>
                    <button
                      onClick={() => onUpdate(it.id, +1)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-700 hover:text-emerald-600 active:scale-90 transition"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Pied panier */}
        <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-medium text-gray-500">Total à payer</span>
            <span className="text-4xl font-black text-gray-900 border-b-4 border-emerald-400 pb-1">
              {totalAmount.toFixed(2)} €
            </span>
          </div>

          <button
            onClick={() => cart.items.length > 0 && onCheckout()}
            disabled={cart.items.length === 0}
            className={`w-full py-6 rounded-2xl flex items-center justify-center gap-3 text-xl font-black text-white transition-all active:scale-95
              ${cart.items.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-2xl hover:shadow-emerald-500/30'}`}
          >
            <span>Passer au paiement</span>
            <ChevronRight size={26} />
          </button>

          <button
            onClick={() => cart.items.length > 0 && setConfirmClear(true)}
            disabled={cart.items.length === 0}
            className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition active:scale-95
              ${cart.items.length === 0
                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'}`}
          >
            <XCircle size={18} />
            Vider le panier
          </button>
        </div>
      </aside>

      {/* ========== Dialog confirmation vider panier ========== */}
      <AnimatePresence>
        {confirmClear && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setConfirmClear(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 text-center">
                Vider le panier ?
              </h3>
              <p className="text-gray-500 text-center mt-2">
                Tous les articles seront supprimés. Cette action est irréversible.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  onClick={() => setConfirmClear(false)}
                  className="py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold active:scale-95 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    onClear?.();
                    setConfirmClear(false);
                  }}
                  className="py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold active:scale-95 transition"
                >
                  Tout vider
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
