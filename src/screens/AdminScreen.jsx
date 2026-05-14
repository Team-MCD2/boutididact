import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, X, RefreshCw, Maximize2, Power, Store, Printer, Database, Trash2, Wand2, Upload, Plus, Search, Edit3, Save, FolderTree, Zap, Info, Cloud } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const getAdminPin = () => {
  try {
    const s = JSON.parse(localStorage.getItem('boutididact_settings') || '{}');
    if (s.adminPin) return s.adminPin;
  } catch (e) {}
  return localStorage.getItem('boutididact_admin_pin') || '0000';
};

const isSetupComplete = (s) =>
  Boolean(s?.hiboutikAccount && s?.hiboutikUser && s?.hiboutikApiKey);

export default function AdminScreen({
  health,
  session,
  forceSettings = false,
  supplements,
  onAddSupplement,
  onRemoveSupplement,
  onClose,
  onReload,
  onCatalogChange,
  onLogout,
  loading = false,
}) {
  const refreshCatalog = onCatalogChange || onReload;
  const [pin, setPin] = useState('');
  // Lors du premier setup (pas de creds Boutididact), on saute le PIN pour permettre la config initiale.
  const [unlocked, setUnlocked] = useState(forceSettings);
  const [pinError, setPinError] = useState('');
  const [promptNewPin, setPromptNewPin] = useState(false);

  const [activeTab, setActiveTab] = useState(forceSettings ? 'settings' : 'status');

  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppPrice, setNewSuppPrice] = useState('');

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('boutididact_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) { /* ignore */ }
    return {
      hiboutikAccount: '',
      hiboutikUser: '',
      hiboutikApiKey: '',
      shopName: session?.shopName || '',
      shopAddress: '',
      shopSiret: '',
      shopTva: '',
      printerIp: '',
      printerPort: '9100',
      hiboutikStoreId: '1',
      hiboutikVendorId: '1',
      localServerUrl: 'http://localhost:3001',
      adminPin: getAdminPin(),
    };
  });

  const saveSettings = async (newSettings) => {
    if (!isSetupComplete(newSettings)) {
      alert('Merci de renseigner Compte Boutididact, Utilisateur API et Clé API.');
      return;
    }
    
    localStorage.setItem('boutididact_settings', JSON.stringify(newSettings));
    localStorage.setItem('boutididact_admin_pin', newSettings.adminPin || '0000');
    setSettings(newSettings);

    // Persistance Cloud (Vercel/Stripe) pour que les réglages suivent le compte sur tous les appareils
    if (session?.shopName) {
      try {
        await fetch(`${API}/api/saas/save-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopName: session.shopName, settings: newSettings }),
        });
      } catch (e) {
        console.error('Erreur sauvegarde cloud:', e);
        // On continue quand même car c'est sauvé en local
      }
    }

    alert('Paramètres enregistrés. Redémarrage de la borne...');
    // Le client veut un redémarrage qui renvoie sur la page de connexion.
    // On vide la session et on recharge.
    sessionStorage.removeItem('boutididact_session');
    window.location.reload();
  };

  const [isUploading, setIsUploading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const [localProducts, setLocalProducts] = useState([]);
  const [localCategories, setLocalCategories] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const loadLocalData = () => {
    try {
      const p = JSON.parse(localStorage.getItem('ai_products') || '[]');
      const c = JSON.parse(localStorage.getItem('ai_categories') || '[]');
      setLocalProducts(Array.isArray(p) ? p : []);
      setLocalCategories(Array.isArray(c) ? c : []);
    } catch (e) {
      setLocalProducts([]);
      setLocalCategories([]);
    }
  };

  useEffect(() => {
    if (unlocked) loadLocalData();
  }, [unlocked]);

  const handleAddSupp = () => {
    if (newSuppName && newSuppPrice !== '') {
      const price = Number(newSuppPrice);
      if (price < 0) return alert('Le prix ne peut pas être négatif');
      onAddSupplement(newSuppName, price);
      setNewSuppName('');
      setNewSuppPrice('');
      refreshCatalog?.();
    }
  };

  const handleDeleteAllLocal = () => {
    if (window.confirm('Supprimer TOUT le catalogue (produits & catégories) ?')) {
      localStorage.removeItem('ai_products');
      localStorage.removeItem('ai_categories');
      setLocalProducts([]);
      setLocalCategories([]);
      refreshCatalog?.();
    }
  };

  const persistProducts = (products) => {
    localStorage.setItem('ai_products', JSON.stringify(products));
    setLocalProducts(products);
    refreshCatalog?.();
  };
  const persistCategories = (categories) => {
    localStorage.setItem('ai_categories', JSON.stringify(categories));
    setLocalCategories(categories);
    refreshCatalog?.();
  };

  const upsertProduct = (product) => {
    const idx = localProducts.findIndex(p => p.id === product.id);
    let next;
    if (idx >= 0) {
      next = [...localProducts];
      next[idx] = product;
    } else {
      next = [...localProducts, product];
    }
    persistProducts(next);
  };

  const deleteProduct = (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    persistProducts(localProducts.filter(p => p.id !== id));
  };

  const upsertCategory = (cat) => {
    const idx = localCategories.findIndex(c => c.id === cat.id);
    let next;
    if (idx >= 0) {
      next = [...localCategories];
      next[idx] = cat;
    } else {
      next = [...localCategories, cat];
    }
    persistCategories(next);
  };

  const deleteCategory = (id) => {
    const usedBy = localProducts.filter(p => p.categoryId === id).length;
    if (usedBy > 0) {
      return alert(`Impossible : ${usedBy} produit(s) utilisent cette catégorie.`);
    }
    if (!window.confirm('Supprimer cette catégorie ?')) return;
    persistCategories(localCategories.filter(c => c.id !== id));
  };

  const handleUploadMenu = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const resizeImage = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX = 1600;
            if (width > height) {
              if (width > MAX) { height *= MAX / width; width = MAX; }
            } else {
              if (height > MAX) { width *= MAX / height; height = MAX; }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });

      const base64 = await resizeImage(file);
      try {
        const res = await fetch(`${API}/api/saas/extract-menu`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' }),
        });
        const data = await res.json();
        if (data.products) {
          const catSet = new Set();
          const newProducts = data.products.map((p, i) => {
            const catId = p.category ? p.category.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'divers';
            catSet.add(JSON.stringify({ id: catId, name: p.category || 'Divers' }));
            return {
              id: `ai-${Date.now()}-${i}`,
              categoryId: catId,
              name: p.name,
              price: Math.max(0, Number(p.price)),
              desc: p.desc || '',
              composition: p.composition || '',
            };
          });
          setExtractedData({
            products: newProducts,
            categories: Array.from(catSet).map(s => JSON.parse(s)),
          });
        } else {
          alert('Erreur IA : ' + (data.message || data.error || 'Inconnue'));
        }
      } catch (err) {
        alert('Erreur lors de la communication avec l\'IA.');
      } finally {
        setIsUploading(false);
      }
    } catch (error) {
      alert('Erreur de lecture du fichier');
      setIsUploading(false);
    }
  };

  const submitPin = () => {
    const currentPin = getAdminPin();
    if (!promptNewPin) {
      if (pin === currentPin) {
        if (currentPin === '0000') {
          setPromptNewPin(true);
          setPin('');
          return;
        }
        setUnlocked(true);
        setPinError('');
      } else {
        setPinError('Code incorrect');
        setTimeout(() => setPinError(''), 1500);
        setPin('');
      }
    } else {
      if (pin.length < 4) {
        setPinError('Le code doit faire au moins 4 chiffres');
        return;
      }
      if (pin === '0000') {
        setPinError('Le nouveau code doit être différent de 0000');
        setPin('');
        return;
      }
      localStorage.setItem('boutididact_admin_pin', pin);
      const nextSettings = { ...settings, adminPin: pin };
      localStorage.setItem('boutididact_settings', JSON.stringify(nextSettings));
      setSettings(nextSettings);

      // Persistance Cloud immédiate pour le PIN
      if (session?.shopName) {
        fetch(`${API}/api/saas/save-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopName: session.shopName, settings: nextSettings }),
        }).catch(e => console.error('Erreur sync cloud PIN:', e));
      }

      setUnlocked(true);
      setPromptNewPin(false);
      setPinError('');
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

  const handleLockOut = () => {
    if (window.confirm('Verrouiller la borne ?')) {
      onLogout?.();
    }
  };

  // Statut système simplifié
  const online = Boolean(health?.hiboutik?.reachable);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6"
    >
      <motion.div
        initial={window.innerWidth < 768 ? { y: '100%' } : { y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-t-[2.5rem] md:rounded-3xl shadow-2xl w-full max-w-3xl md:max-w-2xl flex flex-col h-[95vh] md:h-auto md:max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-700 text-white">
          <div className="flex items-center gap-3">
            <Lock size={22} />
            <div>
              <h2 className="text-xl font-black leading-tight">Panneau administrateur</h2>
              {session?.shopName && <p className="text-xs text-white/60 font-medium">Boutique : {session.shopName}</p>}
            </div>
          </div>
          {!forceSettings && (
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center"
            >
              <X size={22} />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {!unlocked ? (
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
              <p className="text-center text-gray-600 mb-4 font-bold">
                {promptNewPin
                  ? 'Saisissez votre nouveau code (différent de 0000)'
                  : getAdminPin() === '0000'
                    ? 'Saisissez votre code d\'accès (0000 par défaut)'
                    : 'Saisissez votre code d\'accès'}
              </p>
              <div className="flex justify-center gap-3 my-6" aria-label="PIN">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-5 h-5 rounded-full border-2 ${
                      i < pin.length ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                    }`}
                  />
                ))}
              </div>
              {pinError && <p className="text-center text-red-600 font-bold text-sm mb-3">{pinError}</p>}
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
                onClick={submitPin}
                disabled={pin.length < 4}
                className="mt-5 w-full max-w-xs mx-auto block py-4 rounded-2xl bg-gray-900 text-white font-bold text-lg disabled:opacity-30"
              >
                Valider
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="shrink-0 flex border-b border-gray-100 px-2 md:px-4 bg-gray-50 overflow-x-auto no-scrollbar">
                <TabButton active={activeTab === 'status'} onClick={() => setActiveTab('status')} label="État" icon={<Database size={16} />} />
                <TabButton active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} label="Menu" icon={<Store size={16} />} />
                <TabButton active={activeTab === 'actions'} onClick={() => setActiveTab('actions')} label="Actions" icon={<RefreshCw size={16} />} />
                <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Réglages" icon={<Printer size={16} />} />
              </div>

              <div className="overflow-y-auto flex-1 p-4 md:p-8 space-y-6 custom-scrollbar">
                {activeTab === 'status' && (
                  <Section title="État du système">
                    <Status
                      icon={<Database size={20} />}
                      label="Connexion à Boutididact"
                      value={online ? 'Système en ligne' : 'Non connecté'}
                      ok={online}
                    />
                    {!settings.localServerUrl ? (
                      <Status
                        icon={<Cloud size={20} />}
                        label="Imprimante (Mode Relais)"
                        value="En ligne"
                        ok={true}
                      />
                    ) : (
                      <Status
                        icon={<Printer size={20} />}
                        label="Imprimante (Mode Direct)"
                        value={health?.printer?.online ? 'En ligne' : 'Non connecté'}
                        ok={health?.printer?.online}
                      />
                    )}
                  </Section>
                )}

                {activeTab === 'catalog' && (
                  <div className="space-y-6">
                    <Section title="Numérisation IA (optionnel)">
                      <div className="bg-gradient-to-br from-fuchsia-50 to-white rounded-2xl p-6 border flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-fuchsia-100 text-fuchsia-600 rounded-full flex items-center justify-center mb-4"><Wand2 size={28} /></div>
                        <h4 className="text-lg font-black text-gray-900">Numériser une carte papier</h4>
                        <p className="text-sm text-gray-500 mb-6">Importez une photo, l'IA extrait les produits.</p>
                        <label className={`w-full max-w-xs py-4 ${isUploading ? 'bg-gray-200' : 'bg-fuchsia-600 hover:bg-fuchsia-700'} text-white rounded-2xl font-black transition cursor-pointer flex items-center justify-center gap-2`}>
                          <Upload size={20} /> {isUploading ? 'Analyse...' : 'Importer une photo'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleUploadMenu} disabled={isUploading} />
                        </label>
                      </div>
                    </Section>

                    <Section title="Suppléments">
                      <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input type="text" placeholder="Nom du supplément" className="flex-1 px-4 py-3 rounded-xl border border-gray-200" value={newSuppName} onChange={e => setNewSuppName(e.target.value)} />
                          <div className="flex gap-2">
                            <input type="number" placeholder="€" className="flex-1 sm:w-24 px-4 py-3 rounded-xl border border-gray-200" value={newSuppPrice} onChange={e => setNewSuppPrice(e.target.value)} />
                            <button onClick={handleAddSupp} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black shrink-0">+</button>
                          </div>
                        </div>
                        {supplements.map(s => (
                          <div key={s.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
                            <span className="font-bold">{s.name} <span className="text-gray-400 font-normal">{s.price}€</span></span>
                            <button onClick={() => { onRemoveSupplement(s.id); refreshCatalog?.(); }} className="text-red-500"><Trash2 size={18} /></button>
                          </div>
                        ))}
                      </div>
                    </Section>

                    <Section title={`Catégories (${localCategories.length})`}>
                      <CategoriesManager
                        categories={localCategories}
                        productsCount={localProducts}
                        onSave={upsertCategory}
                        onDelete={deleteCategory}
                      />
                    </Section>

                    <Section title={`Produits (${localProducts.length})`}>
                      <ProductsManager
                        products={localProducts}
                        categories={localCategories}
                        onSave={upsertProduct}
                        onDelete={deleteProduct}
                      />
                      {localProducts.length > 0 && (
                        <button
                          onClick={handleDeleteAllLocal}
                          className="mt-4 w-full py-3 rounded-xl bg-red-50 text-red-700 font-bold border border-red-100 hover:bg-red-100"
                        >
                          Supprimer tout le catalogue
                        </button>
                      )}
                    </Section>
                  </div>
                )}

                {activeTab === 'actions' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    <ActionButton 
                      icon={<RefreshCw size={20} className={loading ? 'animate-spin' : ''} />} 
                      label={loading ? 'Mise à jour...' : 'Mise à jour catalogue'} 
                      onClick={onReload} 
                      disabled={loading}
                    />
                    <ActionButton icon={<Maximize2 size={20} />} label="Plein écran" onClick={requestFullscreen} />
                    <ActionButton icon={<Power size={20} />} label="Redémarrer l'app" onClick={() => window.location.reload()} />
                    <ActionButton
                      icon={<Lock size={20} />}
                      label="Verrouiller la borne"
                      onClick={handleLockOut}
                      variant="ghost"
                    />
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-8">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                      <h4 className="font-black text-amber-900 mb-2">Configuration Boutididact</h4>
                      <p className="text-sm text-amber-800 leading-relaxed">
                        Renseignez les identifiants <strong>Boutididact</strong> qui vous ont été envoyés par e-mail.
                        Une fois enregistrés, la borne redémarre et vous serez redirigé sur l'écran de connexion.
                      </p>
                    </div>

                    <Section title="Identifiants Boutididact">
                      <div className="grid grid-cols-1 gap-4 bg-gray-50 p-6 rounded-2xl">
                        <SettingInput 
                          label="Compte Boutididact" 
                          value={settings.hiboutikAccount} 
                          onChange={v => setSettings({ ...settings, hiboutikAccount: v.trim().replace(/\.hiboutik\.com$/i, '') })} 
                          placeholder="ex: ma-boutique" 
                        />
                        <SettingInput label="Utilisateur API" value={settings.hiboutikUser} onChange={v => setSettings({ ...settings, hiboutikUser: v })} placeholder="ex: admin@mail.com" />
                        <SettingInput label="Clé API" value={settings.hiboutikApiKey} onChange={v => setSettings({ ...settings, hiboutikApiKey: v })} placeholder="Clé fournie par e-mail" type="password" />
                        <div className="grid grid-cols-2 gap-4">
                          <SettingInput label="ID Boutique" value={settings.hiboutikStoreId} onChange={v => setSettings({ ...settings, hiboutikStoreId: v })} placeholder="1" />
                          <SettingInput label="ID Vendeur" value={settings.hiboutikVendorId} onChange={v => setSettings({ ...settings, hiboutikVendorId: v })} placeholder="1" />
                        </div>
                      </div>
                    </Section>

                    <Section title="Configuration du ticket">
                      <div className="grid grid-cols-1 gap-4 bg-gray-50 p-6 rounded-2xl">
                        <SettingInput label="Nom du commerce" value={settings.shopName} onChange={v => setSettings({ ...settings, shopName: v })} />
                        <SettingInput label="Adresse" value={settings.shopAddress} onChange={v => setSettings({ ...settings, shopAddress: v })} />
                        <div className="grid grid-cols-2 gap-4">
                          <SettingInput label="SIRET" value={settings.shopSiret} onChange={v => setSettings({ ...settings, shopSiret: v })} maxLength={14} />
                          <SettingInput label="TVA" value={settings.shopTva} onChange={v => setSettings({ ...settings, shopTva: v })} maxLength={13} />
                        </div>
                      </div>
                    </Section>

                    <Section title="Serveur Local & Imprimante">
                      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 mb-8 text-white shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                              <Cloud size={32} className="text-amber-300" />
                            </div>
                            <h4 className="text-2xl font-black italic tracking-tight uppercase">Mode Relais (Cloud)</h4>
                          </div>
                          <p className="text-indigo-100 leading-relaxed mb-6">
                            Pour imprimer depuis une tablette (Sunmi, iPad, etc.), laissez l'URL ci-dessous <strong>vide</strong>. 
                            Le ticket sera envoyé sur le Cloud et récupéré par votre PC.
                          </p>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3 p-4 bg-black/20 rounded-2xl border border-white/10">
                              <Info size={20} className="shrink-0 mt-1" />
                              <p className="text-xs text-indigo-100">
                                1. Lancez <strong>Boutididact-Print-Server.exe</strong> sur le PC relié à l'imprimante.<br/>
                                2. Configurez-le avec le nom : <strong className="text-white">{session?.shopName}</strong><br/>
                                3. Vérifiez que l'URL Cloud dans le .exe correspond à votre déploiement Vercel.
                              </p>
                            </div>
                            
                            <a
                              href="/downloads/Boutididact-Print-Server.exe"
                              download
                              className="mt-6 w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black transition-all border border-white/10 shadow-lg"
                            >
                              <Zap size={24} className="text-amber-300" />
                              Télécharger le Relais (Windows)
                            </a>
                          </div>
                        </div>
                        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                      </div>

                      <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm space-y-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SettingInput 
                              label="IP de l'Imprimante Thermique" 
                              value={settings.printerIp} 
                              onChange={v => setSettings({ ...settings, printerIp: v.trim() })} 
                              placeholder="192.168.1.26" 
                            />
                            <SettingInput 
                              label="Port" 
                              value={settings.printerPort} 
                              onChange={v => setSettings({ ...settings, printerPort: v.trim() })} 
                              placeholder="9100" 
                            />
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-50">
                          <PrinterTestButton ip={settings.printerIp} port={settings.printerPort} localServerUrl={''} />
                        </div>
                      </div>
                    </Section>

                    <button
                      onClick={() => saveSettings(settings)}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black shadow-xl"
                    >
                      Enregistrer &amp; redémarrer
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>

      {extractedData && (
        <ExtractedPreviewModal
          data={extractedData}
          onCancel={() => setExtractedData(null)}
          onConfirm={(finalProducts) => {
            const usedCatIds = new Set(finalProducts.map(p => p.categoryId));
            const finalCategories = extractedData.categories.filter(c => usedCatIds.has(c.id));
            const existingP = JSON.parse(localStorage.getItem('ai_products') || '[]');
            const existingC = JSON.parse(localStorage.getItem('ai_categories') || '[]');
            const merged = [...existingP, ...finalProducts];
            const mergedC = Array.from(new Map([...existingC, ...finalCategories].map(c => [c.id, c])).values());
            localStorage.setItem('ai_products', JSON.stringify(merged));
            localStorage.setItem('ai_categories', JSON.stringify(mergedC));
            setExtractedData(null);
            refreshCatalog?.();
          }}
        />
      )}
    </motion.div>
  );
}

function ExtractedPreviewModal({ data, onCancel, onConfirm }) {
  const initialSet = new Set(data.products.map(p => p.id));
  const [keptIds, setKeptIds] = useState(initialSet);
  const [edits, setEdits] = useState({}); // { [id]: { name?, price? } }

  const toggle = (id) => {
    setKeptIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const setField = (id, field, value) => {
    setEdits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
  };

  const grouped = data.products.reduce((acc, p) => {
    const cat = data.categories.find(c => c.id === p.categoryId);
    const key = cat?.name || 'Divers';
    (acc[key] = acc[key] || []).push(p);
    return acc;
  }, {});

  const finalList = data.products
    .filter(p => keptIds.has(p.id))
    .map(p => ({
      ...p,
      name: edits[p.id]?.name ?? p.name,
      price: Math.max(0, Number(edits[p.id]?.price ?? p.price) || 0),
    }));

  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-xl font-black text-gray-900">
            Produits détectés <span className="text-fuchsia-600">({keptIds.size}/{data.products.length})</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Vérifiez chaque produit, modifiez si nécessaire, décochez ceux à exclure puis confirmez.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 custom-scrollbar">
          {Object.entries(grouped).map(([catName, items]) => (
            <div key={catName}>
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2 sticky top-0 bg-white py-1">{catName}</h4>
              <div className="space-y-2">
                {items.map(p => {
                  const kept = keptIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className={`rounded-2xl border p-3 transition ${kept ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={kept}
                          onChange={() => toggle(p.id)}
                          className="w-5 h-5 accent-fuchsia-600 shrink-0"
                        />
                        <input
                          type="text"
                          value={edits[p.id]?.name ?? p.name}
                          onChange={e => setField(p.id, 'name', e.target.value)}
                          disabled={!kept}
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold text-gray-800 outline-none focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-400 disabled:opacity-50"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            step="0.1"
                            value={edits[p.id]?.price ?? p.price}
                            onChange={e => setField(p.id, 'price', e.target.value)}
                            disabled={!kept}
                            className="w-20 px-3 py-2 rounded-xl border border-gray-200 bg-white font-bold text-right text-gray-800 outline-none focus:ring-2 focus:ring-fuchsia-100 focus:border-fuchsia-400 disabled:opacity-50"
                          />
                          <span className="text-gray-400 font-bold">€</span>
                        </div>
                      </div>
                      {p.desc && (
                        <p className="ml-8 mt-1.5 text-xs text-gray-500 italic">{p.desc}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {data.products.length === 0 && (
            <p className="text-center text-gray-500 py-8">Aucun produit détecté sur l'image.</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 bg-gray-50">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-white border border-gray-200 font-black text-gray-700 hover:bg-gray-100"
          >Annuler</button>
          <button
            onClick={() => onConfirm(finalList)}
            disabled={keptIds.size === 0}
            className="flex-1 py-3 rounded-2xl bg-fuchsia-600 text-white font-black hover:bg-fuchsia-700 disabled:opacity-40"
          >Ajouter {keptIds.size} produit{keptIds.size > 1 ? 's' : ''}</button>
        </div>
      </div>
    </div>
  );
}

function CategoriesManager({ categories, productsCount, onSave, onDelete }) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cat-${Date.now()}`;
    if (categories.some(c => c.id === id)) {
      return alert('Une catégorie avec ce nom existe déjà.');
    }
    onSave({ id, name });
    setNewName('');
  };

  const startEdit = (cat) => { setEditingId(cat.id); setEditName(cat.name); };
  const cancelEdit = () => { setEditingId(null); setEditName(''); };
  const saveEdit = (cat) => {
    const name = editName.trim();
    if (!name) return;
    onSave({ ...cat, name });
    cancelEdit();
  };

  return (
    <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text" placeholder="Nouvelle catégorie"
          value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button onClick={handleAdd} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black flex items-center justify-center gap-1 shrink-0">
          <Plus size={18} /> Ajouter
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-4">Aucune catégorie. Ajoute-en une ci-dessus.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
          {categories.map(cat => {
            const count = productsCount.filter(p => p.categoryId === cat.id).length;
            const isEditing = editingId === cat.id;
            return (
              <div key={cat.id} className="flex items-center gap-2 bg-white p-3 rounded-xl border border-gray-100">
                <FolderTree size={16} className="text-indigo-400 shrink-0" />
                {isEditing ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveEdit(cat);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="flex-1 px-3 py-2 rounded-lg border border-indigo-200 outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-gray-800"
                  />
                ) : (
                  <span className="flex-1 font-bold text-gray-800 truncate">{cat.name}</span>
                )}
                <span className="text-xs text-gray-400 shrink-0">{count} produit{count > 1 ? 's' : ''}</span>
                {isEditing ? (
                  <>
                    <button onClick={() => saveEdit(cat)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Enregistrer"><Save size={16} /></button>
                    <button onClick={cancelEdit} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg" title="Annuler"><X size={16} /></button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(cat)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Renommer"><Edit3 size={16} /></button>
                    <button onClick={() => onDelete(cat.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 size={16} /></button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductsManager({ products, categories, onSave, onDelete }) {
  const [query, setQuery] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: '', price: '', categoryId: '', desc: '', composition: '' });
  const [creating, setCreating] = useState(false);

  const filtered = products.filter(p => {
    const matchQ = !query || p.name.toLowerCase().includes(query.toLowerCase());
    const matchC = filterCat === 'all' || p.categoryId === filterCat;
    return matchQ && matchC;
  });

  const startCreate = () => {
    if (categories.length === 0) {
      return alert('Crée au moins une catégorie avant d\'ajouter un produit.');
    }
    setCreating(true);
    setEditingId(null);
    setDraft({ name: '', price: '', categoryId: categories[0].id, desc: '', composition: '' });
  };

  const startEdit = (p) => {
    setCreating(false);
    setEditingId(p.id);
    setDraft({
      name: p.name,
      price: String(p.price ?? ''),
      categoryId: p.categoryId || categories[0]?.id || '',
      desc: p.desc || '',
      composition: p.composition || '',
    });
  };

  const cancel = () => { setCreating(false); setEditingId(null); };

  const save = () => {
    const name = draft.name.trim();
    const price = Number(draft.price);
    if (!name) return alert('Nom requis.');
    if (Number.isNaN(price) || price < 0) return alert('Prix invalide.');
    if (!draft.categoryId) return alert('Catégorie requise.');

    if (creating) {
      onSave({
        id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        categoryId: draft.categoryId,
        name, price, desc: draft.desc.trim(),
        composition: draft.composition.trim(),
      });
    } else if (editingId) {
      const existing = products.find(p => p.id === editingId);
      onSave({ ...existing, name, price, categoryId: draft.categoryId, desc: draft.desc.trim(), composition: draft.composition.trim() });
    }
    cancel();
  };

  const isEditingRow = (id) => editingId === id && !creating;

  return (
    <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
      {/* Toolbar : recherche, filtre, +nouveau */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Rechercher un produit..."
            value={query} onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-3 rounded-xl border border-gray-200 bg-white font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-4 py-3 rounded-xl border border-gray-200 bg-white font-bold text-gray-800"
        >
          <option value="all">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          onClick={startCreate}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black flex items-center gap-1"
        >
          <Plus size={18} /> Nouveau
        </button>
      </div>

      {/* Formulaire d'ajout/édition (modal inline en haut) */}
      {(creating || editingId) && (
        <ProductForm
          draft={draft}
          setDraft={setDraft}
          categories={categories}
          onCancel={cancel}
          onSave={save}
          isCreating={creating}
        />
      )}

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">
          {products.length === 0 ? 'Aucun produit. Ajoute-en un ou importe une carte.' : 'Aucun résultat.'}
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
          {filtered.map(p => {
            if (isEditingRow(p.id)) return null;
            const cat = categories.find(c => c.id === p.categoryId);
            return (
              <div key={p.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 truncate">{p.name}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    <span>{cat?.name || '—'}</span>
                    {p.desc && <span className="truncate">· {p.desc}</span>}
                  </div>
                  {p.composition && (
                    <div className="text-[10px] text-emerald-500 font-bold mt-0.5 truncate">
                      🧾 {p.composition}
                    </div>
                  )}
                </div>
                <div className="font-black text-indigo-600 text-right shrink-0 tabular-nums">
                  {Number(p.price).toFixed(2)}€
                </div>
                <button onClick={() => startEdit(p)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Modifier"><Edit3 size={16} /></button>
                <button onClick={() => onDelete(p.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Supprimer"><Trash2 size={16} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProductForm({ draft, setDraft, categories, onCancel, onSave, isCreating }) {
  return (
    <div className="bg-white border-2 border-indigo-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-black text-indigo-700 text-sm uppercase tracking-wider">
          {isCreating ? 'Nouveau produit' : 'Modifier produit'}
        </h4>
        <button onClick={onCancel} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
      </div>
      <div className="flex gap-2">
        <input
          type="text" placeholder="Nom"
          value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
          className="flex-[2] min-w-0 px-3 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <div className="flex-[1] min-w-0 flex items-center gap-1">
          <input
            type="number" step="0.1" placeholder="Prix"
            value={draft.price} onChange={e => setDraft({ ...draft, price: e.target.value })}
            className="w-full min-w-0 px-3 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-right text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <span className="text-gray-400 font-bold">€</span>
        </div>
      </div>
      <select
        value={draft.categoryId} onChange={e => setDraft({ ...draft, categoryId: e.target.value })}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-800"
      >
        <option value="">— Choisir une catégorie —</option>
        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input
        type="text" placeholder="Description (optionnel)"
        value={draft.desc} onChange={e => setDraft({ ...draft, desc: e.target.value })}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
      />
      <div className="space-y-1">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider ml-1">Composition / Ingrédients</label>
        <input
          type="text" placeholder="ex: Salade, Tomate, Oignon, Steak, Fromage"
          value={draft.composition} onChange={e => setDraft({ ...draft, composition: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <p className="text-[10px] text-gray-400 ml-1">Séparez les ingrédients par des virgules. Le client pourra retirer ceux qu'il ne veut pas.</p>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl bg-gray-100 font-bold text-gray-700 hover:bg-gray-200">Annuler</button>
        <button onClick={onSave} className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 flex items-center gap-1">
          <Save size={16} /> Enregistrer
        </button>
      </div>
    </div>
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

function Status({ icon, label, value, ok }) {
  const tone = ok
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
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

function ActionButton({ icon, label, onClick, variant = 'solid', disabled = false }) {
  const cls =
    variant === 'ghost'
      ? 'bg-gray-50 hover:bg-gray-100 text-gray-700'
      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm active:scale-95 transition ${cls} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

function PrinterTestButton({ ip, port, localServerUrl }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const testPrinter = async () => {
    if (!ip) {
      setResult({ ok: false, message: 'Veuillez d\'abord saisir une adresse IP.' });
      return;
    }
    const isRelayMode = !localServerUrl || localServerUrl.includes('vercel.app');
    const targetUrl = localServerUrl || ''; // Utilise la base par défaut (Vercel) si vide
    setTesting(true);
    setResult(null);
    try {
      const url = isRelayMode ? `${API}/api/health` : `${targetUrl}/api/health`;
      const res = await fetch(url, {
        headers: {
          'X-Printer-Ip': ip,
          'X-Printer-Port': port || '9100',
        },
      });
      const data = await res.json();
      
      if (isRelayMode) {
        // En mode relais, on vérifie juste si Boutididact est OK. 
        // L'imprimante est testée par le .exe en local.
        setResult({ ok: true, message: `✅ Mode RELAIS Actif (Cloud).\nL'imprimante sera pilotée par votre serveur local via Internet.` });
      } else if (data.printer?.online) {
        setResult({ ok: true, message: `✅ Imprimante joignable sur ${data.printer.ip}:${data.printer.port}` });
      } else {
        setResult({
          ok: false,
          message: `❌ Imprimante injoignable sur ${data.printer?.ip || ip}:${data.printer?.port || port || 9100}. Vérifiez :\n• L'IP est correcte\n• L'imprimante est allumée et connectée au même réseau\n• Le port ${port || 9100} est ouvert\n• Le pare-feu Windows ne bloque pas la connexion`,
        });
      }
    } catch (e) {
      setResult({ ok: false, message: `Erreur de communication avec le serveur : ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={testPrinter}
        disabled={testing}
        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition active:scale-95 ${
          testing ? 'bg-gray-200 text-gray-400' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200'
        }`}
      >
        <Printer size={18} />
        {testing ? 'Test en cours...' : 'Tester la connexion'}
      </button>
      {result && (
        <div className={`p-4 rounded-xl text-sm font-bold whitespace-pre-line ${
          result.ok
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {result.message}
        </div>
      )}
    </div>
  );
}
