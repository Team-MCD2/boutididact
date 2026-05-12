import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, X, RefreshCw, Maximize2, Power, Store, Printer, Database, Trash2, Wand2, Upload } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

const getAdminPin = () => localStorage.getItem('boutididact_admin_pin') || '0000';

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
  onLogout,
}) {
  const [pin, setPin] = useState('');
  // Lors du premier setup (pas de creds Hiboutik), on saute le PIN pour permettre la config initiale.
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
      adminPin: getAdminPin(),
    };
  });

  const saveSettings = (newSettings) => {
    if (!isSetupComplete(newSettings)) {
      alert('Merci de renseigner Compte Hiboutik, Utilisateur API et Clé API.');
      return;
    }
    localStorage.setItem('boutididact_settings', JSON.stringify(newSettings));
    localStorage.setItem('boutididact_admin_pin', newSettings.adminPin || '0000');
    setSettings(newSettings);
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
    }
  };

  const handleDeleteAllLocal = () => {
    if (window.confirm('Supprimer TOUT le catalogue local (produits & catégories) ?')) {
      localStorage.removeItem('ai_products');
      localStorage.removeItem('ai_categories');
      setLocalProducts([]);
      setLocalCategories([]);
      onReload();
    }
  };

  const handleUploadMenu = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        try {
          const res = await fetch(`${API}/api/saas/extract-menu`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
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
      };
      reader.readAsDataURL(file);
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
      setSettings(prev => ({ ...prev, adminPin: pin }));
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

  // Statut système simplifié (uniquement : non connecté / système en ligne)
  const online = Boolean(health?.hiboutik?.reachable);

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

        <div className="flex-1 flex flex-col overflow-hidden">
          {!unlocked ? (
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <p className="text-center text-gray-600 mb-4 font-bold">
                {promptNewPin
                  ? 'Saisissez votre nouveau code (différent de 0000)'
                  : 'Saisissez votre code d\'accès (0000 par défaut)'}
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
              <div className="flex border-b border-gray-100 px-4 bg-gray-50">
                <TabButton active={activeTab === 'status'} onClick={() => setActiveTab('status')} label="État" icon={<Database size={16} />} />
                <TabButton active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} label="Catalogue" icon={<Store size={16} />} />
                <TabButton active={activeTab === 'actions'} onClick={() => setActiveTab('actions')} label="Actions" icon={<RefreshCw size={16} />} />
                <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Paramètres" icon={<Printer size={16} />} />
              </div>

              <div className="overflow-y-auto flex-1 p-8 space-y-6 custom-scrollbar">
                {activeTab === 'status' && (
                  <Section title="État du système">
                    <Status
                      icon={<Database size={20} />}
                      label="Connexion à Hiboutik"
                      value={online ? 'Système en ligne' : 'Non connecté'}
                      ok={online}
                    />
                    <Status
                      icon={<Printer size={20} />}
                      label="Imprimante"
                      value={health?.printer?.online ? 'En ligne' : 'Non connectée'}
                      ok={health?.printer?.online}
                    />
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
                        <div className="flex gap-2">
                          <input type="text" placeholder="Nom" className="flex-1 px-4 py-3 rounded-xl border border-gray-200" value={newSuppName} onChange={e => setNewSuppName(e.target.value)} />
                          <input type="number" placeholder="€" className="w-24 px-4 py-3 rounded-xl border border-gray-200" value={newSuppPrice} onChange={e => setNewSuppPrice(e.target.value)} />
                          <button onClick={handleAddSupp} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black">+</button>
                        </div>
                        {supplements.map(s => (
                          <div key={s.id} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
                            <span className="font-bold">{s.name} <span className="text-gray-400 font-normal">{s.price}€</span></span>
                            <button onClick={() => onRemoveSupplement(s.id)} className="text-red-500"><Trash2 size={18} /></button>
                          </div>
                        ))}
                      </div>
                    </Section>

                    {(localProducts.length > 0 || localCategories.length > 0) && (
                      <Section title="Produits locaux (IA)">
                        <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                          <p className="text-xs text-gray-500">{localProducts.length} produit(s), {localCategories.length} catégorie(s)</p>
                          <button onClick={handleDeleteAllLocal} className="w-full py-3 rounded-xl bg-red-50 text-red-700 font-bold border border-red-100 hover:bg-red-100">
                            Supprimer tout le catalogue local
                          </button>
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
                      label="Verrouiller la borne"
                      onClick={handleLockOut}
                      variant="ghost"
                    />
                  </div>
                )}

                {activeTab === 'settings' && (
                  <div className="space-y-8">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                      <h4 className="font-black text-amber-900 mb-2">Configuration Hiboutik</h4>
                      <p className="text-sm text-amber-800 leading-relaxed">
                        Renseignez les identifiants <strong>Hiboutik</strong> qui vous ont été envoyés par e-mail.
                        Une fois enregistrés, la borne redémarre et vous serez redirigé sur l'écran de connexion.
                      </p>
                    </div>

                    <Section title="Identifiants Hiboutik">
                      <div className="grid grid-cols-1 gap-4 bg-gray-50 p-6 rounded-2xl">
                        <SettingInput label="Compte Hiboutik" value={settings.hiboutikAccount} onChange={v => setSettings({ ...settings, hiboutikAccount: v })} placeholder="ex: ma-boutique" />
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

                    <Section title="Imprimante">
                      <div className="grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl">
                        <SettingInput label="Adresse IP" value={settings.printerIp} onChange={v => setSettings({ ...settings, printerIp: v })} placeholder="192.168.1.100" />
                        <SettingInput label="Port" value={settings.printerPort} onChange={v => setSettings({ ...settings, printerPort: v })} placeholder="9100" />
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
        <div className="fixed inset-0 z-[80] bg-black/60 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full text-center">
            <h3 className="text-xl font-black mb-3">Produits détectés ({extractedData.products.length})</h3>
            <p className="text-gray-500 text-sm mb-5">Confirmez l'ajout au catalogue local.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setExtractedData(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 font-bold"
              >Annuler</button>
              <button
                onClick={() => {
                  const existingP = JSON.parse(localStorage.getItem('ai_products') || '[]');
                  const existingC = JSON.parse(localStorage.getItem('ai_categories') || '[]');
                  const merged = [...existingP, ...extractedData.products];
                  const mergedC = Array.from(new Map([...existingC, ...extractedData.categories].map(c => [c.id, c])).values());
                  localStorage.setItem('ai_products', JSON.stringify(merged));
                  localStorage.setItem('ai_categories', JSON.stringify(mergedC));
                  setExtractedData(null);
                  onReload();
                }}
                className="flex-1 py-3 rounded-xl bg-fuchsia-600 text-white font-bold"
              >Ajouter</button>
            </div>
          </div>
        </div>
      )}
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
