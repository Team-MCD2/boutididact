import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, X, RefreshCw, Maximize2, Power, Store, Printer, Database, Trash2, Plus, CreditCard, Wand2, Upload, Rocket } from 'lucide-react';
import useSubscription from '../hooks/useSubscription';

const getAdminPin = () => localStorage.getItem('boutididact_admin_pin') || import.meta.env.VITE_ADMIN_PIN || '0000';

export default function AdminScreen({ health, supplements, onAddSupplement, onRemoveSupplement, onClose, onReload }) {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('boutididact_settings');
      if (!saved) return 'settings';
      const s = JSON.parse(saved);
      if (!s.hiboutikAccount || !s.hiboutikApiKey) return 'settings';
      return 'status';
    } catch (e) {
      return 'settings';
    }
  });

  const { isPremium, verify, isVerifying: isVerifyingSub } = useSubscription();
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppPrice, setNewSuppPrice] = useState('');

  // Signup form state
  const [boutiqueName, setBoutiqueName] = useState('');
  const [boutiqueEmail, setBoutiqueEmail] = useState('');

  // Settings state (overrides)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('boutididact_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      hiboutikAccount: '',
      hiboutikUser: '',
      hiboutikApiKey: '',
      shopName: '',
      shopAddress: '',
      shopSiret: '',
      shopTva: '',
      printerIp: '',
      printerPort: '9100',
      hiboutikStoreId: '1',
      hiboutikVendorId: '1',
      adminPin: getAdminPin()
    };
  });

  const saveSettings = (newSettings) => {
    localStorage.setItem('boutididact_settings', JSON.stringify(newSettings));
    localStorage.setItem('boutididact_admin_pin', newSettings.adminPin);
    localStorage.setItem('boutididact_setup_complete', 'true'); // Finaliser le setup
    setSettings(newSettings);
    alert('Paramètres enregistrés ! Redémarrage de la borne...');
    window.location.reload();
  };

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
    try {
      const p = JSON.parse(localStorage.getItem('ai_products') || '[]');
      const c = JSON.parse(localStorage.getItem('ai_categories') || '[]');
      setLocalProducts(Array.isArray(p) ? p : []);
      setLocalCategories(Array.isArray(c) ? c : []);
    } catch (e) {
      console.error('Erreur chargement local:', e);
      setLocalProducts([]);
      setLocalCategories([]);
    }
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
          const url = new URL(window.location.href);
          url.searchParams.delete('payment');
          url.searchParams.delete('session_id');
          window.history.replaceState({}, document.title, url.pathname + url.search);
          alert('Félicitations ! Vos accès sont en cours de génération. Vous recevrez un e-mail sous peu.');
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
    if (!boutiqueName || !boutiqueEmail) {
      alert('Veuillez renseigner le nom et l\'email de votre boutique.');
      return;
    }
    setIsSubscribing(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/saas/stripe-checkout`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutiqueName, boutiqueEmail })
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Erreur Stripe : ' + (data.message || data.error || 'Réponse invalide'));
      }
    } catch (error) {
      alert('Impossible de joindre le service de paiement.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const [promptNewPin, setPromptNewPin] = useState(false);

  const submit = () => {
    const currentPin = getAdminPin();
    
    if (!promptNewPin) {
      if (pin === currentPin) {
        // Si c'est le code par défaut (0000) et qu'on vient de se connecter
        if (currentPin === '0000') {
          setPromptNewPin(true);
          setPin('');
          return;
        }
        setUnlocked(true);
        setError('');
      } else {
        setError('PIN incorrect');
        setTimeout(() => setError(''), 1500);
        setPin('');
      }
    } else {
      // Enregistrement du nouveau PIN
      if (pin.length < 4) {
        setError('Le code doit faire au moins 4 chiffres');
        return;
      }
      if (pin === '0000') {
        setError('Le nouveau code doit être différent de 0000');
        setPin('');
        return;
      }
      localStorage.setItem('boutididact_admin_pin', pin);
      setSettings(prev => ({ ...prev, adminPin: pin }));
      setUnlocked(true);
      setPromptNewPin(false);
      setError('');
      alert('Nouveau code PIN enregistré !');
    }
  };

  const press = (k) => {
    if (k === 'C') return setPin('');
    if (k === '<') return setPin((p) => p.slice(0, -1));
    if (pin.length >= 4) return;
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

        <div className="flex-1 flex flex-col overflow-hidden">
          {!unlocked ? (
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <p className="text-center text-gray-600 mb-4 font-bold">
                {promptNewPin ? 'Saisissez votre nouveau code (différent de 0000)' : 'Saisissez votre code d\'accès (0000 par défaut)'}
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
            <>
              {/* Navigation Tabs */}
              <div className="flex border-b border-gray-100 px-4 bg-gray-50">
                <TabButton active={activeTab === 'status'} onClick={() => setActiveTab('status')} label="État" icon={<Database size={16}/>} />
                <TabButton active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} label="Catalogue" icon={<Store size={16}/>} />
                <TabButton active={activeTab === 'actions'} onClick={() => setActiveTab('actions')} label="Actions" icon={<RefreshCw size={16}/>} />
                <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Paramètres" icon={<Printer size={16}/>} />
              </div>

              <div className="overflow-y-auto flex-1 p-8 space-y-6 custom-scrollbar">
                {activeTab === 'status' && (
                  <>
                    <Section title="État du système">
                      <Status
                        icon={<Database size={20} />}
                        label="Système Cloud"
                        value={health?.hiboutik?.reachable ? 'Connecté' : 'Hors-ligne'}
                        ok={health?.hiboutik?.reachable}
                      />
                      <Status
                        icon={<Printer size={20} />}
                        label="Imprimante"
                        value={health?.printer?.online ? 'En ligne' : 'Déconnectée'}
                        ok={health?.printer?.online}
                      />
                    </Section>

                    <Section title="Mon Compte">
                      <div className={`bg-gradient-to-br ${isPremium ? 'from-emerald-50 to-white' : 'from-indigo-50 to-white'} rounded-2xl p-6 border flex flex-col items-center text-center`}>
                        <div className={`w-14 h-14 ${isPremium ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'} rounded-full flex items-center justify-center mb-4`}>
                          <CreditCard size={28} />
                        </div>
                        <h4 className="text-lg font-black text-gray-900">{isPremium ? 'Abonnement Premium Actif' : 'Activer BOUTIDIDACT Pro'}</h4>
                        <p className="text-sm text-gray-500 mb-6 max-w-sm">
                          {isPremium 
                            ? 'Toutes les fonctionnalités sont débloquées. Vos factures sont disponibles sur votre email.' 
                            : 'Gérez votre boutique sans limite, profitez de l\'IA et du support prioritaire pour 49.90€/mois.'}
                        </p>
                        
                        {!isPremium ? (
                          <div className="w-full max-w-sm space-y-3">
                            <input 
                              type="text" placeholder="Nom de la boutique" 
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-100"
                              value={boutiqueName} onChange={e => setBoutiqueName(e.target.value)}
                            />
                            <input 
                              type="email" placeholder="Email de contact" 
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-100"
                              value={boutiqueEmail} onChange={e => setBoutiqueEmail(e.target.value)}
                            />
                            <button 
                              onClick={handleSubscribe}
                              disabled={isSubscribing}
                              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                            >
                              {isSubscribing ? <RefreshCw className="animate-spin" size={20} /> : 'S\'inscrire & Payer'}
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm('Avez-vous déjà payé votre abonnement ?')) {
                                  localStorage.setItem('boutididact_is_premium', 'true');
                                  window.location.reload();
                                }
                              }}
                              className="w-full py-2 text-gray-400 hover:text-indigo-600 font-bold text-xs transition"
                            >
                              Déjà abonné ? Activer manuellement
                            </button>
                          </div>
                        ) : (
                          <div className="px-6 py-2 bg-emerald-100 text-emerald-700 rounded-full font-black text-sm flex items-center gap-2">
                            <Lock size={14} /> Membre Premium
                          </div>
                        )}
                      </div>
                    </Section>
                  </>
                )}

                {activeTab === 'catalog' && (
                  <div className="space-y-6">
                    <Section title="Intelligence Artificielle">
                      <div className={`bg-gradient-to-br ${isPremium ? 'from-fuchsia-50 to-white' : 'from-gray-50 to-white grayscale'} rounded-2xl p-6 border flex flex-col items-center text-center relative overflow-hidden`}>
                        {!isPremium && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center"><Lock className="text-gray-400" /></div>}
                        <div className="w-14 h-14 bg-fuchsia-100 text-fuchsia-600 rounded-full flex items-center justify-center mb-4"><Wand2 size={28}/></div>
                        <h4 className="text-lg font-black text-gray-900">Numériser votre carte</h4>
                        <p className="text-sm text-gray-500 mb-6">Prenez une photo de votre menu papier, l'IA s'occupe de tout.</p>
                        <label className={`w-full max-w-xs py-4 ${isUploading || !isPremium ? 'bg-gray-200' : 'bg-fuchsia-600 hover:bg-fuchsia-700'} text-white rounded-2xl font-black transition cursor-pointer flex items-center justify-center gap-2`}>
                          <Upload size={20} /> {isUploading ? 'Analyse...' : 'Prendre une photo'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadMenu} disabled={isUploading || !isPremium} />
                        </label>
                      </div>
                    </Section>

                    <Section title="Suppléments">
                      <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                        <div className="flex gap-2">
                          <input type="text" placeholder="Nom" className="flex-1 px-4 py-3 rounded-xl border border-gray-200" value={newSuppName} onChange={e => setNewSuppName(e.target.value)} />
                          <input type="number" placeholder="€" className="w-24 px-4 py-3 rounded-xl border border-gray-200" value={newSuppPrice} onChange={e => setNewSuppPrice(e.target.value)} />
                          <button onClick={handleAddSupp} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black">+</button>
                        </div>
                        {supplements.map(s => (
                          <div key={s.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
                            <span className="font-bold">{s.name} <span className="text-gray-400 font-normal">{s.price}€</span></span>
                            <button onClick={() => onRemoveSupplement(s.id)} className="text-red-500"><Trash2 size={18}/></button>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {isPremium && (
                      <Section title="Produits locaux">
                        <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                           {/* (Reste de la logique de catalogue local ici...) */}
                           <p className="text-xs text-gray-400 text-center italic">Utilisez la suppression en masse pour gérer votre inventaire local.</p>
                        </div>
                      </Section>
                    )}
                  </div>
                )}

                {activeTab === 'actions' && (
                  <div className="grid grid-cols-2 gap-4">
                    <ActionButton icon={<RefreshCw size={20} />} label="Mettre à jour le catalogue" onClick={onReload} />
                    <ActionButton icon={<Maximize2 size={20} />} label="Plein écran" onClick={requestFullscreen} />
                    <ActionButton icon={<Power size={20} />} label="Redémarrer l'application" onClick={() => window.location.reload()} />
                    <ActionButton 
                      icon={<Lock size={20} />} 
                      label="Déconnexion / Verrouiller" 
                      onClick={() => {
                        if (window.confirm('Voulez-vous verrouiller la borne et retourner à l\'écran d\'accueil ?')) {
                          localStorage.removeItem('boutididact_setup_complete');
                          window.location.reload();
                        }
                      }} 
                      variant="ghost" 
                    />
                    <ActionButton icon={<Trash2 size={20} />} label="Vider le cache" onClick={() => { localStorage.clear(); window.location.reload(); }} variant="ghost" />
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-8">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                      <div className="flex gap-3 mb-3">
                        <Rocket size={20} className="text-amber-600" />
                        <h4 className="font-black text-amber-900">Configuration de votre Borne BOUTIDIDACT</h4>
                      </div>
                      <p className="text-sm text-amber-800 leading-relaxed">
                        Bienvenue ! Pour activer votre borne, vous devez renseigner vos identifiants <strong>Boutididact API</strong> ci-dessous. 
                        Ces informations vous ont été envoyées par e-mail après validation de votre paiement.
                      </p>
                      <ul className="mt-3 space-y-1 text-xs text-amber-700 list-disc list-inside font-medium">
                        <li>Le <strong>Compte</strong> identifie votre boutique sur nos serveurs.</li>
                        <li>L'<strong>Utilisateur</strong> est votre email de gestion.</li>
                        <li>La <strong>Clé API</strong> sécurise vos transactions.</li>
                      </ul>
                    </div>

                    <Section title="Boutididact API (Hiboutik)">
                      <div className="grid grid-cols-1 gap-4 bg-gray-50 p-6 rounded-2xl">
                        <SettingInput label="Compte Boutididact" value={settings.hiboutikAccount} onChange={v => setSettings({...settings, hiboutikAccount: v})} placeholder="Ex: ma-boutique" />
                        <SettingInput label="Utilisateur API" value={settings.hiboutikUser} onChange={v => setSettings({...settings, hiboutikUser: v})} placeholder="Ex: admin@mail.com" />
                        <SettingInput label="Clé API Boutididact" value={settings.hiboutikApiKey} onChange={v => setSettings({...settings, hiboutikApiKey: v})} placeholder="Clé fournie par e-mail" type="password" />
                        <div className="grid grid-cols-2 gap-4">
                          <SettingInput label="ID Boutique" value={settings.hiboutikStoreId} onChange={v => setSettings({...settings, hiboutikStoreId: v})} placeholder="1" />
                          <SettingInput label="ID Vendeur" value={settings.hiboutikVendorId} onChange={v => setSettings({...settings, hiboutikVendorId: v})} placeholder="1" />
                        </div>
                      </div>
                    </Section>

                    <Section title="Configuration du Ticket">
                      <div className="grid grid-cols-1 gap-4 bg-gray-50 p-6 rounded-2xl">
                        <SettingInput label="Nom du commerce" value={settings.shopName} onChange={v => setSettings({...settings, shopName: v})} />
                        <SettingInput label="Adresse" value={settings.shopAddress} onChange={v => setSettings({...settings, shopAddress: v})} />
                        <div className="grid grid-cols-2 gap-4">
                          <SettingInput label="SIRET" value={settings.shopSiret} onChange={v => setSettings({...settings, shopSiret: v})} maxLength={14} />
                          <SettingInput label="TVA" value={settings.shopTva} onChange={v => setSettings({...settings, shopTva: v})} maxLength={13} />
                        </div>
                      </div>
                    </Section>

                    <Section title="Imprimante">
                      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl">
                        <SettingInput label="Adresse IP" value={settings.printerIp} onChange={v => setSettings({...settings, printerIp: v})} placeholder="Ex: 192.168.1.100" />
                        <SettingInput label="Port" value={settings.printerPort} onChange={v => setSettings({...settings, printerPort: v})} placeholder="9100" />
                      </div>
                    </Section>

                    <Section title="Sécurité">
                      <div className="bg-gray-50 p-6 rounded-2xl">
                        <SettingInput label="Code PIN Administrateur" value={settings.adminPin} onChange={v => setSettings({...settings, adminPin: v})} placeholder="0000" maxLength={4} />
                      </div>
                    </Section>

                    <button 
                      onClick={() => saveSettings(settings)}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl"
                    >
                      Enregistrer les modifications
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {/* Reste du modal extractedData... */}
    </motion.div>
  );
}

function TabButton({ active, onClick, label, icon }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${active ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
    >
      {icon}
      {label}
    </button>
  );
}

function SettingInput({ label, value, onChange, placeholder, type = 'text', maxLength }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">{label}</label>
      <input 
        type={type} value={value} 
        onChange={e => {
          const val = e.target.value;
          if (maxLength && val.length > maxLength) return;
          onChange(val);
        }} 
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-gray-700"
      />
    </div>
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
