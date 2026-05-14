import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Store, User, Key, Send, Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { API_URL } from '../services/api';

export default function AdminSetupScreen({ onBack }) {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  const handleAuth = (e) => {
    e.preventDefault();
    if (password === '0000' || password.length >= 4) { // On laisse le backend vérifier réellement
      setIsAuthenticated(true);
      setError(null);
    } else {
      setError('Mot de passe trop court.');
    }
  };

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
          <h1 className="text-2xl font-black text-center mb-2">Accès Administrateur</h1>
          <p className="text-slate-400 text-center text-sm mb-8">Veuillez saisir le mot de passe maître pour continuer.</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-5 py-4 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 border border-gray-100 max-w-2xl w-full overflow-hidden flex flex-col md:flex-row"
      >
        <div className="bg-indigo-600 p-10 text-white md:w-1/3 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
              <Send size={24} />
            </div>
            <h2 className="text-2xl font-black leading-tight mb-4">Envoi des Identifiants</h2>
            <p className="text-indigo-100 text-sm">Utilisez ce formulaire pour envoyer les accès Hiboutik à vos clients Boutididact.</p>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="flex items-center gap-2 text-indigo-200 hover:text-white transition text-sm font-bold">
            <ArrowLeft size={18} /> Déconnexion
          </button>
        </div>

        <div className="p-10 flex-1">
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm font-bold">
              <CheckCircle size={20} /> E-mail envoyé avec succès !
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-bold">
              <AlertCircle size={20} /> {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">E-mail du destinataire</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  required
                  type="email"
                  value={formData.to}
                  onChange={e => setFormData({ ...formData, to: e.target.value })}
                  placeholder="client@email.com"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nom de la boutique</label>
              <div className="relative">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  required
                  value={formData.shopName}
                  onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                  placeholder="Restaurant Le Gourmet"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 mt-6">
              <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Identifiants API</h3>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Compte Hiboutik</label>
                <input 
                  required
                  value={formData.hiboutikAccount}
                  onChange={e => setFormData({ ...formData, hiboutikAccount: e.target.value })}
                  placeholder="ma-boutique"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Utilisateur API (Email)</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    required
                    value={formData.hiboutikUser}
                    onChange={e => setFormData({ ...formData, hiboutikUser: e.target.value })}
                    placeholder="admin@mail.com"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Clé API</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    required
                    value={formData.hiboutikApiKey}
                    onChange={e => setFormData({ ...formData, hiboutikApiKey: e.target.value })}
                    placeholder="AbCd1234..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-xl shadow-indigo-600/20 mt-6 flex items-center justify-center gap-3"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer les identifiants'}
              {!loading && <Send size={20} />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
