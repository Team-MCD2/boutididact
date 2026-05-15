import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Store, User, Key, Send, Lock, ArrowLeft, CheckCircle, AlertCircle, 
  Users, Search, Edit3, Save, X, Phone, MapPin, FileText, Clock,
  RefreshCw, ChevronDown, ChevronUp, Building2, Eye, EyeOff,
  TrendingUp, Percent, Zap
} from 'lucide-react';
import { API_URL } from '../services/api';

export default function AdminSetupScreen({ onBack }) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('shops');
  
  const handleAuth = async (e) => {
    e.preventDefault();
    if (password.length >= 4) {
      setIsAuthenticated(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 p-10 rounded-3xl shadow-2xl max-w-md w-full"
        >
          <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-black text-center mb-2">Accès Super Admin</h1>
          <p className="text-slate-400 text-center text-sm mb-8">Panneau de gestion BOUTIDIDACT.</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe maître"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              autoFocus
            />
            <button className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-xl font-bold transition shadow-lg shadow-indigo-600/20 active:scale-95">
              Déverrouiller
            </button>
            <button type="button" onClick={onBack} className="w-full text-slate-500 font-medium text-sm hover:text-slate-300 transition">
              Retour à l'accueil
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-fuchsia-600 rounded-xl flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">BOUTIDIDACT</h1>
              <p className="text-xs text-slate-500 font-medium">Super Administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsAuthenticated(false)} 
              className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition flex items-center gap-2"
            >
              <Lock size={14} /> Verrouiller
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
          <TabPill active={activeTab === 'shops'} onClick={() => setActiveTab('shops')} icon={<Users size={16} />} label="Boutiques" />
          <TabPill active={activeTab === 'send'} onClick={() => setActiveTab('send')} icon={<Send size={16} />} label="Envoi Identifiants" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'shops' && <ShopsPanel key="shops" password={password} />}
          {activeTab === 'send' && <SendCredentialsPanel key="send" password={password} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ===== TAB PILL ===== */
function TabPill({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      {icon} {label}
    </button>
  );
}

/* ===== SHOPS PANEL ===== */
function ShopsPanel({ password }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/saas/list-shops?password=${encodeURIComponent(password)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Erreur');
      setShops(data.shops || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => { fetchShops(); }, [fetchShops]);

  const filtered = shops.filter(s => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.phone || '').includes(q);
  });

  const sortedShops = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const activeShops = shops.filter(s => s.paidAt);
  const mrr = activeShops.length * 49.90;
  const newThisMonth = shops.filter(s => {
    if (!s.createdAt) return false;
    const d = new Date(s.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const completionRate = shops.length > 0 
    ? Math.round((shops.filter(s => s.phone && s.address && s.city && s.siret && s.tva).length / shops.length) * 100) 
    : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="MRR" value={`${mrr.toFixed(2)}€`} icon={<TrendingUp size={16} />} color="emerald" />
        <StatCard label="Total Clients" value={shops.length} icon={<Users size={16} />} color="indigo" />
        <StatCard label="Actifs" value={activeShops.length} icon={<CheckCircle size={16} />} color="fuchsia" />
        <StatCard label="Nouveaux (Mois)" value={newThisMonth.length} icon={<Zap size={16} />} color="amber" />
        <StatCard label="Profils Complets" value={`${completionRate}%`} icon={<Percent size={16} />} color="blue" />
        <StatCard label="Sans Téléphone" value={shops.filter(s => !s.phone).length} icon={<AlertCircle size={16} />} color="red" />
      </div>

      {/* Search + Refresh */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition font-medium"
          />
        </div>
        <button 
          onClick={fetchShops} 
          disabled={loading}
          className="px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold text-sm flex items-center gap-2 transition active:scale-95 disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm font-bold mb-4 flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {loading && shops.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <RefreshCw size={32} className="animate-spin mx-auto mb-4 text-indigo-500" />
          <p className="font-bold">Chargement des boutiques...</p>
        </div>
      ) : sortedShops.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-bold">Aucune boutique trouvée</p>
          <p className="text-sm mt-1">Les clients apparaîtront ici après leur inscription.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedShops.map(shop => (
            <ShopCard 
              key={shop.id} 
              shop={shop} 
              expanded={expandedId === shop.id}
              onToggle={() => setExpandedId(expandedId === shop.id ? null : shop.id)}
              password={password}
              onUpdate={fetchShops}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ===== STAT CARD ===== */
function StatCard({ label, value, icon, color }) {
  const colors = {
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    fuchsia: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    red: 'bg-red-500/10 border-red-500/20 text-red-400',
  };
  return (
    <div className={`p-4 rounded-2xl border ${colors[color]} flex flex-col justify-between h-full`}>
      <div className="flex items-center justify-between mb-3 opacity-80">
        {icon}
      </div>
      <div>
        <div className="text-2xl sm:text-3xl font-black mb-1 leading-none">{value}</div>
        <div className="text-[10px] font-black uppercase tracking-widest opacity-70 leading-tight">{label}</div>
      </div>
    </div>
  );
}

/* ===== SHOP CARD ===== */
function ShopCard({ shop, expanded, onToggle, password, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    phone: shop.phone || '',
    email: shop.email || '',
    address: shop.address || '',
    city: shop.city || '',
    siret: shop.siret || '',
    tva: shop.tva || '',
    notes: shop.notes || '',
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/saas/update-shop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, shopId: shop.id, updates: form }),
      });
      if (!res.ok) throw new Error('Erreur de sauvegarde');
      setEditing(false);
      onUpdate();
    } catch (e) {
      alert('Erreur : ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-slate-700">
      {/* Summary row */}
      <button 
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 text-left transition-colors hover:bg-slate-800/50"
      >
        <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0 font-black text-sm">
          {shop.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-white truncate">{shop.name}</div>
          <div className="text-xs text-slate-500 truncate flex items-center gap-2">
            <Mail size={12} /> {shop.email || '—'}
            {shop.phone && <><Phone size={12} className="ml-2" /> {shop.phone}</>}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {shop.paidAt && (
            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">
              Actif
            </span>
          )}
          <span className="text-xs text-slate-500">{formatDate(shop.createdAt)}</span>
        </div>
        {expanded ? <ChevronUp size={18} className="text-slate-500 shrink-0" /> : <ChevronDown size={18} className="text-slate-500 shrink-0" />}
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Fiche client</h4>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition flex items-center gap-1">
                        <X size={14} /> Annuler
                      </button>
                      <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
                      >
                        <Save size={14} /> {saving ? 'Sauvegarde...' : 'Enregistrer'}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setEditing(true)} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition">
                      <Edit3 size={14} /> Modifier
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoField 
                  icon={<Mail size={14} />} label="Email" 
                  value={form.email} editing={editing}
                  onChange={v => setForm({...form, email: v})}
                />
                <InfoField 
                  icon={<Phone size={14} />} label="Téléphone" 
                  value={form.phone} editing={editing}
                  onChange={v => setForm({...form, phone: v})}
                />
                <InfoField 
                  icon={<MapPin size={14} />} label="Adresse" 
                  value={form.address} editing={editing}
                  onChange={v => setForm({...form, address: v})}
                />
                <InfoField 
                  icon={<Building2 size={14} />} label="Ville" 
                  value={form.city} editing={editing}
                  onChange={v => setForm({...form, city: v})}
                />
                <InfoField 
                  icon={<FileText size={14} />} label="SIRET" 
                  value={form.siret} editing={editing}
                  onChange={v => setForm({...form, siret: v})}
                />
                <InfoField 
                  icon={<Percent size={14} />} label="N° TVA" 
                  value={form.tva} editing={editing}
                  onChange={v => setForm({...form, tva: v})}
                />
                <InfoField 
                  icon={<Clock size={14} />} label="Inscrit le" 
                  value={formatDate(shop.createdAt)} editing={false}
                />
                <InfoField 
                  icon={<Zap size={14} />} label="Statut" 
                  value={shop.paidAt ? 'Abonnement Actif' : 'En attente paiement'} editing={false}
                />
              </div>

              {/* Notes */}
              <div className="mt-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Notes administrateur</label>
                {editing ? (
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    rows={3}
                    placeholder="Ajouter des notes sur ce client..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium text-sm resize-none"
                  />
                ) : (
                  <p className="text-sm text-slate-400 bg-slate-800/50 rounded-xl px-4 py-3 border border-slate-800 min-h-[60px]">
                    {form.notes || <span className="text-slate-600 italic">Aucune note</span>}
                  </p>
                )}
              </div>

              {/* Meta info */}
              <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
                <span className="px-2 py-1 bg-slate-800 rounded">ID: {shop.id}</span>
                {shop.paidAt && (
                  <>
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded">Début: {formatDate(shop.paidAt)}</span>
                    <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded">Fin/Renouv.: {formatDate(new Date(shop.paidAt).getTime() + 30*24*60*60*1000)}</span>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ===== INFO FIELD ===== */
function InfoField({ icon, label, value, editing, onChange }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">{icon} {label}</label>
      {editing && onChange ? (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
        />
      ) : (
        <p className="text-sm text-slate-300 font-medium px-3 py-2">{value || <span className="text-slate-600">—</span>}</p>
      )}
    </div>
  );
}

/* ===== SEND CREDENTIALS PANEL ===== */
function SendCredentialsPanel({ password }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    to: '',
    shopName: '',
    hiboutikAccount: '',
    hiboutikUser: '',
    hiboutikApiKey: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`${API_URL}/api/saas/send-setup-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de l\'envoi');

      setSuccess(true);
      setFormData({ to: '', shopName: '', hiboutikAccount: '', hiboutikUser: '', hiboutikApiKey: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0 }}
      className="max-w-2xl"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="bg-indigo-600 p-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Send size={20} />
            </div>
            <h2 className="text-xl font-black">Envoi des Identifiants</h2>
          </div>
          <p className="text-indigo-100 text-sm">Envoyez les accès Hiboutik à un client Boutididact par e-mail.</p>
        </div>

        <div className="p-8">
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm font-bold">
              <CheckCircle size={20} /> E-mail envoyé avec succès !
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold">
              <AlertCircle size={20} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AdminInput icon={<Mail size={16} />} label="E-mail du destinataire" type="email" required
              value={formData.to} onChange={v => setFormData({...formData, to: v})} placeholder="client@email.com" />
            
            <AdminInput icon={<Store size={16} />} label="Nom de la boutique" required
              value={formData.shopName} onChange={v => setFormData({...formData, shopName: v})} placeholder="Restaurant Le Gourmet" />

            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Identifiants API</h3>
              
              <div className="space-y-3">
                <AdminInput icon={<Store size={16} />} label="Compte Hiboutik" required
                  value={formData.hiboutikAccount} onChange={v => setFormData({...formData, hiboutikAccount: v})} placeholder="ma-boutique" />
                <AdminInput icon={<User size={16} />} label="Utilisateur API (Email)" required
                  value={formData.hiboutikUser} onChange={v => setFormData({...formData, hiboutikUser: v})} placeholder="admin@mail.com" />
                <AdminInput icon={<Key size={16} />} label="Clé API" required
                  value={formData.hiboutikApiKey} onChange={v => setFormData({...formData, hiboutikApiKey: v})} placeholder="AbCd1234..." />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white py-4 rounded-xl font-black transition-all active:scale-95 shadow-lg shadow-indigo-600/20 mt-4 flex items-center justify-center gap-3"
            >
              {loading ? (
                <><RefreshCw size={18} className="animate-spin" /> Envoi en cours...</>
              ) : (
                <><Send size={18} /> Envoyer les identifiants</>
              )}
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

/* ===== ADMIN INPUT ===== */
function AdminInput({ icon, label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>
        <input 
          required={required}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition font-medium text-sm"
        />
      </div>
    </div>
  );
}
