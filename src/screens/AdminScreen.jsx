import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, X, RefreshCw, Maximize2, Power, Store, Printer, Database, Trash2, Plus, CreditCard, Wand2, Upload } from 'lucide-react';
import useSubscription from '../hooks/useSubscription';

const ADMIN_PIN = (import.meta.env.VITE_ADMIN_PIN || '1234').toString();

export default function AdminScreen({ health, supplements, onAddSupplement, onRemoveSupplement, onClose, onReload }) {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');

  const { isPremium, verify, isVerifying: isVerifyingSub } = useSubscription();
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppPrice, setNewSuppPrice] = useState('');

  const handleAddSupp = () => {
    if (newSuppName && newSuppPrice !== '') {
      const price = Number(newSuppPrice);
      if (price < 0) return alert('Le prix ne peut pas être négatif');
      onAddSupplement(newSuppName, price);
      setNewSuppName('');
      setNewSuppPrice('');
    }
  };

  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const [localProducts, setLocalProducts] = useState([]);
  const [localCategories, setLocalCategories] = useState([]);

  const loadLocalData = () => {
    const p = JSON.parse(localStorage.getItem('ai_products') || '[]');
    const c = JSON.parse(localStorage.getItem('ai_categories') || '[]');
    setLocalProducts(p);
    setLocalCategories(c);
  };

  useEffect(() => {
    if (unlocked) loadLocalData();
  }, [unlocked]);

  const handleDeleteProduct = (id) => {
    const updated = localProducts.filter(p => p.id !== id);
    localStorage.setItem('ai_products', JSON.stringify(updated));
    setLocalProducts(updated);
    onReload();
  };

  const handleDeleteCategory = (id) => {
    const updated = localCategories.filter(c => c.id !== id);
    localStorage.setItem('ai_categories', JSON.stringify(updated));
    setLocalCategories(updated);
    onReload();
  };

  const handleDeleteAllLocal = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer TOUT le catalogue local (produits et catégories) ? Cette action est irréversible.')) {
      localStorage.removeItem('ai_products');
      localStorage.removeItem('ai_categories');
      setLocalProducts([]);
      setLocalCategories([]);
      onReload();
    }
  };

  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Supprimer les ${selectedIds.size} produits sélectionnés ?`)) {
      const updated = localProducts.filter(p => !selectedIds.has(p.id));
      localStorage.setItem('ai_products', JSON.stringify(updated));
      setLocalProducts(updated);
      setSelectedIds(new Set());
      onReload();
    }
  };

  const handledSessionRef = React.useRef(null);

  // Vérification auto si on revient de Stripe
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');

    if (payment === 'success' && sessionId && handledSessionRef.current !== sessionId) {
      handledSessionRef.current = sessionId;
      verify(sessionId).then(ok => {
        if (ok) {
          // On nettoie l'URL pour éviter les doubles vérifs au rechargement
          const url = new URL(window.location.href);
          url.searchParams.delete('payment');
          url.searchParams.delete('session_id');
          window.history.replaceState({}, document.title, url.pathname + url.search);
          
          alert('Félicitations ! Votre abonnement Premium est activé.');
        }
      });
    }
  }, [verify]);
  
  const handleUploadMenu = async (e) => {
    if (!isPremium) {
      alert('Cette fonctionnalité est réservée aux abonnés Premium.');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/extract-menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, mimeType: file.type })
          });
          const data = await res.json();
          if (data.products) {
            let catSet = new Set();
            const newProducts = data.products.map((p, i) => {
              const catId = p.category ? p.category.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'divers';
              catSet.add(JSON.stringify({ id: catId, name: p.category || 'Divers' }));
              return {
                id: `ai-${Date.now()}-${i}`,
                categoryId: catId,
                name: p.name,
                price: Math.max(0, Number(p.price)),
                desc: p.desc || ''
              };
            });
            
            setExtractedData({ 
              products: newProducts, 
              categories: Array.from(catSet).map(s => JSON.parse(s)) 
            });
          } else {
            alert('Erreur IA: ' + (data.message || data.error || 'Inconnue'));
          }
        } catch (err) {
          alert('Erreur lors de la communication avec l\'IA.');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert('Erreur de lecture du fichier');
      setIsUploading(false);
    }
  };

  const handleSubscribe = async () => {
    if (isPremium) {
      alert('Vous êtes déjà abonné Premium !');
      return;
    }
    setIsSubscribing(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      console.log('Appel Stripe vers :', `${apiUrl}/api/saas/stripe-checkout`);
      
      const res = await fetch(`${apiUrl}/api/saas/stripe-checkout`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Serveur : ${res.status} - ${errorText}`);
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Erreur Stripe : ' + (data.message || data.error || 'Réponse invalide'));
      }
    } catch (error) {
      console.error('Erreur Stripe Detail:', error);
      alert('Impossible de joindre le service de paiement. Vérifiez que le serveur local tourne sur le bon port.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const submit = () => {
    if (pin === ADMIN_PIN) {
      setUnlocked(true);
      setError('');
    } else {
      setError('PIN incorrect');
      setTimeout(() => setError(''), 1500);
      setPin('');
    }
  };

  const press = (k) => {
    if (k === 'C') return setPin('');
    if (k === '<') return setPin((p) => p.slice(0, -1));
    if (pin.length >= 6) return;
    setPin((p) => p + k);
  };

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-700 text-white">
          <div className="flex items-center gap-3">
            <Lock size={22} />
            <h2 className="text-xl font-black">Panneau administrateur</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center"
          >
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {!unlocked ? (
          <div className="p-8">
            <p className="text-center text-gray-600 mb-4">
              Saisissez le code PIN pour accéder aux paramètres.
            </p>
            <div className="flex justify-center gap-3 my-6" aria-label="PIN">
              {[0, 1, 2, 3, 4, 5].slice(0, Math.max(4, pin.length || 4)).map((i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full border-2 ${
                    i < pin.length ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                  }`}
                />
              ))}
            </div>
            {error && (
              <p className="text-center text-red-600 font-bold text-sm mb-3">{error}</p>
            )}
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'].map((k) => (
                <button
                  key={k}
                  onClick={() => press(k)}
                  className="py-5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition text-2xl font-black text-gray-800"
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              onClick={submit}
              disabled={pin.length < 4}
              className="mt-5 w-full max-w-xs mx-auto block py-4 rounded-2xl bg-gray-900 text-white font-bold text-lg disabled:opacity-30"
            >
              Valider
            </button>
          </div>
        ) : (
          <div className="p-8 space-y-5">
            <Section title="État du système">
              <Status
                icon={<Database size={20} />}
                label="API Hiboutik"
                value={
                  health?.hiboutik?.reachable
                    ? `OK · compte ${health?.hiboutik?.account || ''}`
                    : health?.hiboutik?.configured
                      ? `Injoignable (${health?.hiboutik?.reason || 'erreur'})`
                      : 'Non configuré'
                }
                ok={health?.hiboutik?.reachable}
                warn={!health?.hiboutik?.reachable && health?.hiboutik?.configured}
              />
              <Status
                icon={<Printer size={20} />}
                label="Imprimante ESC/POS"
                value={
                  health?.printer
                    ? `${health.printer.ip}:${health.printer.port} — ${
                        health.printer.online ? 'en ligne' : 'hors ligne'
                      }`
                    : '—'
                }
                ok={health?.printer?.online}
              />
              <Status
                icon={<Store size={20} />}
                label="Commerce"
                value={health?.shop?.name || '—'}
                ok
              />
            </Section>

            <Section title="Actions">
              <div className="grid grid-cols-2 gap-3">
                <ActionButton icon={<RefreshCw size={18} />} label="Recharger le catalogue" onClick={onReload} />
                <ActionButton icon={<Maximize2 size={18} />} label="Plein écran" onClick={requestFullscreen} />
                <ActionButton
                  icon={<Power size={18} />}
                  label="Recharger l'application"
                  onClick={() => window.location.reload()}
                />
                <ActionButton icon={<X size={18} />} label="Fermer" onClick={onClose} variant="ghost" />
              </div>
            </Section>

            <div className="grid grid-cols-2 gap-6">
              <Section title="Abonnement">
                <div className={`bg-gradient-to-br ${isPremium ? 'from-emerald-50 to-white border-emerald-100' : 'from-indigo-50 to-white border-indigo-100'} rounded-2xl p-5 border flex flex-col items-center justify-center text-center h-full transition-all`}>
                  <div className={`w-12 h-12 ${isPremium ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'} rounded-full flex items-center justify-center mb-3`}>
                    <CreditCard size={24} />
                  </div>
                  <h4 className="font-black text-gray-900">{isPremium ? 'Abonnement Actif' : 'Passer à la version Pro'}</h4>
                  <p className="text-sm text-gray-500 mb-4">{isPremium ? 'Vous profitez de toutes les fonctionnalités.' : 'Logiciel de caisse illimité (49.99€/mois)'}</p>
                  {!isPremium ? (
                    <button 
                      onClick={handleSubscribe}
                      disabled={isSubscribing || isVerifyingSub}
                      className={`w-full py-3 ${isSubscribing || isVerifyingSub ? 'bg-gray-200 text-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2`}
                    >
                      {isSubscribing || isVerifyingSub ? <RefreshCw className="animate-spin" size={18} /> : 'S\'abonner'}
                    </button>
                  ) : (
                    <div className="w-full py-3 bg-emerald-100 text-emerald-700 rounded-xl font-bold flex items-center justify-center gap-2">
                      <Lock size={16} /> Premium
                    </div>
                  )}
                </div>
              </Section>

              <Section title="Intelligence Artificielle">
                <div className={`bg-gradient-to-br ${isPremium ? 'from-fuchsia-50 to-white border-fuchsia-100' : 'from-gray-50 to-white border-gray-200 grayscale'} rounded-2xl p-5 border flex flex-col items-center justify-center text-center h-full relative overflow-hidden transition-all`}>
                  {!isPremium && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <div className="bg-gray-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 shadow-xl">
                        <Lock size={10} /> Premium
                      </div>
                    </div>
                  )}
                  <div className={`w-12 h-12 ${isPremium ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-gray-100 text-gray-400'} rounded-full flex items-center justify-center mb-3`}>
                    <Wand2 size={24} />
                  </div>
                  <h4 className="font-black text-gray-900">Numériser une carte</h4>
                  <p className="text-sm text-gray-500 mb-4">Prenez en photo votre menu, l'IA créera vos produits.</p>
                  <label className={`w-full py-3 ${isUploading || !isPremium ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white cursor-pointer'} rounded-xl font-bold transition shadow-lg ${isPremium ? 'shadow-fuchsia-500/20' : ''} flex items-center justify-center gap-2`}>
                    <Upload size={18} />
                    {isUploading ? 'Analyse...' : 'Importer'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleUploadMenu} disabled={isUploading || !isPremium} />
                  </label>
                </div>
              </Section>
            </div>

            <Section title="Gestion des suppléments">
              <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nom (ex: Fromage)" 
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-100"
                    value={newSuppName}
                    onChange={(e) => setNewSuppName(e.target.value)}
                  />
                  <input 
                    type="number" 
                    placeholder="Prix (€)" 
                    step="0.5"
                    min="0"
                    className="w-24 px-3 py-2 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-100"
                    value={newSuppPrice}
                    onChange={(e) => setNewSuppPrice(e.target.value)}
                  />
                  <button 
                    onClick={handleAddSupp}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 transition"
                  >
                    <Plus size={16} /> Ajouter
                  </button>
                </div>
                {supplements.length > 0 && (
                  <div className="space-y-2 mt-4 max-h-40 overflow-y-auto custom-scrollbar">
                    {supplements.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200">
                        <span className="font-bold text-gray-800">{s.name} <span className="text-gray-400 font-normal">({Number(s.price).toFixed(2)} €)</span></span>
                        <button onClick={() => onRemoveSupplement(s.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {isPremium && (
              <Section title="Catalogue local (IA)">
                <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                  {/* Header avec suppression en masse */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase">Gestion du catalogue</h4>
                    <div className="flex gap-2">
                      {localProducts.length > 0 && (
                        <button 
                          onClick={() => {
                            if (selectedIds.size === localProducts.length) setSelectedIds(new Set());
                            else setSelectedIds(new Set(localProducts.map(p => p.id)));
                          }}
                          className="text-[10px] font-black text-indigo-500 uppercase hover:bg-indigo-50 px-2 py-1 rounded transition flex items-center gap-1"
                        >
                          {selectedIds.size === localProducts.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                        </button>
                      )}
                      {selectedIds.size > 0 && (
                        <button 
                          onClick={handleDeleteSelected}
                          className="text-[10px] font-black text-red-500 uppercase bg-red-50 px-2 py-1 rounded transition flex items-center gap-1 border border-red-100"
                        >
                          <Trash2 size={12} /> Supprimer la sélection ({selectedIds.size})
                        </button>
                      )}
                      {(localProducts.length > 0 || localCategories.length > 0) && (
                        <button 
                          onClick={handleDeleteAllLocal}
                          className="text-[10px] font-black text-gray-400 uppercase hover:bg-gray-100 px-2 py-1 rounded transition flex items-center gap-1"
                        >
                          <Trash2 size={12} /> Tout vider
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Formulaire ajout manuel */}
                  <div className="bg-white p-4 rounded-xl border border-dashed border-gray-300 space-y-3">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase">Ajout manuel</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <input id="manual_name" type="text" placeholder="Nom du produit" className="col-span-2 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                      <input id="manual_price" type="number" step="0.01" min="0" placeholder="Prix (€)" className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-100" />
                      <select id="manual_cat" className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-100">
                        <option value="divers">Divers</option>
                        {localCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <button 
                      onClick={() => {
                        const name = document.getElementById('manual_name').value;
                        const priceStr = document.getElementById('manual_price').value;
                        const price = Number(priceStr);
                        const cat = document.getElementById('manual_cat').value;
                        
                        if (!name || priceStr === '') return alert('Nom et prix requis');
                        if (price < 0) return alert('Le prix ne peut pas être négatif');
                        
                        const newProd = {
                          id: `manual-${Date.now()}`,
                          categoryId: cat,
                          name,
                          price,
                          desc: ''
                        };
                        const updated = [...localProducts, newProd];
                        localStorage.setItem('ai_products', JSON.stringify(updated));
                        setLocalProducts(updated);
                        onReload();
                        document.getElementById('manual_name').value = '';
                        document.getElementById('manual_price').value = '';
                      }}
                      className="w-full py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Ajouter au catalogue
                    </button>
                  </div>

                  {localProducts.length === 0 && localCategories.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Aucun produit ou catégorie créé par l'IA.</p>
                  ) : (
                    <div className="space-y-4">
                      {localCategories.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Catégories</h4>
                          <div className="flex flex-wrap gap-2">
                            {localCategories.map(c => (
                              <div key={c.id} className="bg-white px-3 py-1.5 rounded-full border border-gray-200 flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-700">{c.name}</span>
                                <button onClick={() => handleDeleteCategory(c.id)} className="text-red-400 hover:text-red-600 transition">
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {localProducts.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">Produits</h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            {localProducts.map(p => (
                              <div key={p.id} className={`flex justify-between items-center p-3 rounded-xl border transition-all ${selectedIds.has(p.id) ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    checked={selectedIds.has(p.id)}
                                    onChange={() => toggleSelect(p.id)}
                                  />
                                  <div className="min-w-0">
                                    <p className="font-bold text-gray-800 truncate">{p.name}</p>
                                    <p className="text-[10px] text-indigo-500 font-black uppercase">{p.categoryId} · {p.price.toFixed(2)} €</p>
                                  </div>
                                </div>
                                <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {extractedData && (
              <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-3xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl"
                >
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-fuchsia-600 text-white">
                    <h3 className="text-xl font-black">Résultat de l'analyse ({extractedData.products.length} articles)</h3>
                    <button onClick={() => setExtractedData(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {extractedData.products.map((p, i) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div>
                          <p className="font-bold text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400 uppercase font-black">{p.categoryId}</p>
                        </div>
                        <p className="font-black text-fuchsia-600">{p.price.toFixed(2)} €</p>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setExtractedData(null)}
                      className="py-4 bg-white border-2 border-gray-200 text-gray-500 rounded-2xl font-black hover:bg-gray-100 transition"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={() => {
                        const existingProd = JSON.parse(localStorage.getItem('ai_products') || '[]');
                        localStorage.setItem('ai_products', JSON.stringify([...existingProd, ...extractedData.products]));
                        
                        const existingCat = JSON.parse(localStorage.getItem('ai_categories') || '[]');
                        const mergedCats = Array.from(new Map([...existingCat, ...extractedData.categories].map(c => [c.id, c])).values());
                        localStorage.setItem('ai_categories', JSON.stringify(mergedCats));
                        
                        setLocalProducts([...existingProd, ...extractedData.products]);
                        setLocalCategories(mergedCats);

                        setExtractedData(null);
                        onReload();
                        alert('Catalogue mis à jour !');
                      }}
                      className="py-4 bg-fuchsia-600 text-white rounded-2xl font-black shadow-lg shadow-fuchsia-500/30 hover:bg-fuchsia-700 transition"
                    >
                      Ajouter tout
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            <p className="text-xs text-gray-400 text-center pt-2">
              v2.0 · BOUTIDIDACT borne · {new Date().toLocaleString('fr-FR')}
            </p>
          </div>
        )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Status({ icon, label, value, ok, warn }) {
  const tone = ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : warn ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-red-50 border-red-200 text-red-800';
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${tone}`}>
      <div className="opacity-80">{icon}</div>
      <div className="flex-1">
        <div className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</div>
        <div className="font-bold">{value}</div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, variant = 'solid' }) {
  const cls =
    variant === 'ghost'
      ? 'bg-gray-50 hover:bg-gray-100 text-gray-700'
      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm active:scale-95 transition ${cls}`}
    >
      {icon}
      {label}
    </button>
  );
}
