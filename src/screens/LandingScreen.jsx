import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Mail, Lock, ChevronRight, Rocket, Check, ArrowLeft, Zap, Clock, Inbox, Trash2, AlertTriangle, Phone, Smartphone, Monitor, Download, Info, ExternalLink, X, MapPin } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || '';

/**
 * Modes :
 *  - hero      : page d'accueil (Activer ma borne / Déjà client)
 *  - pricing   : tarif + démarrer
 *  - signup    : formulaire d'inscription -> Stripe
 *  - waiting   : après retour Stripe paid -> infos par mail
 *  - login     : connexion (nom boutique + mot de passe)
 */
export default function LandingScreen({ initialMode = 'hero', prefillShopName = '', onLoginSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', siret: '', tva: '', city: '', address: '' });
  const [loginForm, setLoginForm] = useState({ shopName: prefillShopName, password: '' });
  const [deleteForm, setDeleteForm] = useState({ shopName: '', email: '', password: '' });
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (prefillShopName) setLoginForm(f => ({ ...f, shopName: prefillShopName }));
  }, [prefillShopName]);

  const handleSignup = async () => {
    setErrorMsg('');
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setErrorMsg('Veuillez remplir tous les champs.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/saas/stripe-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boutiqueName: form.name.trim(),
          boutiqueEmail: form.email.trim(),
          boutiquePassword: form.password,
          boutiquePhone: form.phone.trim(),
          boutiqueSiret: form.siret.trim(),
          boutiqueTva: form.tva.trim(),
          boutiqueCity: form.city.trim(),
          boutiqueAddress: form.address.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || 'Erreur lors de la création.');
        if (data.error === 'email_already_exists' || data.error === 'shop_already_exists') {
          // Suggérer la connexion
          setLoginForm(f => ({ ...f, shopName: form.name }));
        }
        setSubmitting(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setErrorMsg('Réponse Stripe invalide.');
        setSubmitting(false);
      }
    } catch (e) {
      setErrorMsg('Erreur réseau. Vérifiez la configuration de VITE_API_URL.');
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setErrorMsg('');
    if (!deleteForm.shopName.trim() || !deleteForm.email.trim() || !deleteForm.password) {
      setErrorMsg('Renseignez le nom de la boutique, l\'email et le mot de passe.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/saas/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: deleteForm.shopName.trim(),
          email: deleteForm.email.trim(),
          password: deleteForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.message || 'Suppression impossible.');
        setSubmitting(false);
        return;
      }
      // Vider toutes les données locales rattachées à cette borne
      try {
        localStorage.removeItem('boutididact_settings');
        localStorage.removeItem('boutididact_admin_pin');
        localStorage.removeItem('ai_products');
        localStorage.removeItem('ai_categories');
        localStorage.removeItem('boutididact_supplements');
        sessionStorage.clear();
      } catch (e) { /* ignore */ }
      setDeleteSuccess(true);
      setSubmitting(false);
    } catch (e) {
      setErrorMsg('Erreur réseau lors de la suppression.');
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setErrorMsg('');
    if (!loginForm.shopName.trim() || !loginForm.password) {
      setErrorMsg('Veuillez renseigner vos identifiants.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/saas/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: loginForm.shopName.trim(),
          password: loginForm.password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.message || 'Identifiants invalides.');
        setSubmitting(false);
        return;
      }
      onLoginSuccess?.(data.shop);
    } catch (e) {
      setErrorMsg('Erreur réseau lors de la connexion.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-4 font-sans overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-fuchsia-500/10 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {mode === 'hero' && (
          <motion.div
            key="hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl text-center relative z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-fuchsia-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/20"
            >
              <Rocket size={48} className="text-white" />
            </motion.div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              BOUTIDIDACT
            </h1>

            <p className="text-base sm:text-xl md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto mb-10 md:mb-12 leading-relaxed px-4 md:px-0">
              L'intelligence artificielle qui transforme votre point de vente en une expérience{' '}
              <span className="text-indigo-400">futuriste</span> et <span className="text-fuchsia-400">automatisée</span>.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4 px-4 md:px-0">
              <button
                onClick={() => { setErrorMsg(''); setMode('pricing'); }}
                className="w-full md:w-auto group px-8 py-4 md:py-5 bg-white text-slate-950 rounded-2xl font-black text-base md:text-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-xl"
              >
                Activer ma borne
                <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => { setErrorMsg(''); setMode('login'); }}
                className="w-full md:w-auto px-8 py-4 md:py-5 bg-slate-800/50 text-white border border-slate-700 rounded-2xl font-black text-base md:text-lg transition-all hover:bg-slate-800 active:scale-95"
              >
                Déjà client
              </button>
            </div>

            <button
              onClick={() => {
                setErrorMsg('');
                setDeleteSuccess(false);
                setDeleteForm({ shopName: '', email: '', password: '' });
                setMode('delete');
              }}
              className="mt-8 md:mt-10 inline-flex items-center gap-2 text-slate-500 hover:text-red-400 text-xs md:text-sm font-bold transition-colors"
            >
              <Trash2 size={14} /> Supprimer ma boutique BOUTIDIDACT
            </button>
          </motion.div>
        )}

        {(mode === 'pricing' || mode === 'signup' || mode === 'login') && (
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-2xl relative z-10"
          >
            <button
              onClick={() => {
                setErrorMsg('');
                setMode(mode === 'signup' ? 'pricing' : 'hero');
              }}
              className="absolute -top-12 md:-top-16 left-4 md:left-0 flex items-center gap-2 text-slate-400 hover:text-white font-bold transition-colors"
            >
              <ArrowLeft size={20} />
              Retour
            </button>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl overflow-y-auto max-h-[80vh] md:max-h-none custom-scrollbar">
              {mode === 'pricing' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-500/20">
                      Tarification Unique
                    </span>
                    <h2 className="text-4xl font-black text-white mt-4">BOUTIDIDACT Pro</h2>
                    <p className="text-slate-400 mt-2">Tout ce dont vous avez besoin pour réussir.</p>
                  </div>

                  <div className="bg-slate-800/50 rounded-[2rem] p-8 border border-slate-700 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                      <Zap size={32} className="text-amber-400 opacity-20 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-5xl font-black text-white">49.90€</span>
                      <span className="text-slate-500 font-bold">/mois</span>
                    </div>

                    <div className="space-y-4 mb-8">
                      <PricingFeature text="Numérisation de carte par IA illimitée" />
                      <PricingFeature text="Synchronisation Cloud Boutididact" />
                      <PricingFeature text="Gestion des stocks en temps réel" />
                      <PricingFeature text="Paiement par carte sécurisé" />
                      <PricingFeature text="Support prioritaire 24/7" />
                    </div>

                    <button
                      onClick={() => setMode('signup')}
                      className="w-full py-5 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white rounded-2xl font-black text-xl transition-all hover:shadow-2xl hover:shadow-indigo-500/20 active:scale-[0.98]"
                    >
                      Démarrer maintenant
                    </button>
                  </div>
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h2 className="text-3xl font-black text-white">Créer mon compte</h2>
                    <p className="text-slate-400 mt-2">Votre boutique mérite le meilleur.</p>
                  </div>

                  <div className="space-y-4">
                    <DarkInput
                      icon={<Store size={20} />} placeholder="Nom de votre boutique"
                      value={form.name} onChange={v => setForm({ ...form, name: v })}
                    />
                    <DarkInput
                      icon={<Mail size={20} />} placeholder="Email de connexion" type="email"
                      value={form.email} onChange={v => setForm({ ...form, email: v })}
                    />
                    <DarkInput
                      icon={<Lock size={20} />} placeholder="Mot de passe souhaité" type="password"
                      value={form.password} onChange={v => setForm({ ...form, password: v })}
                    />
                    <DarkInput
                      icon={<MapPin size={20} />} placeholder="Adresse complète"
                      value={form.address} onChange={v => setForm({ ...form, address: v })}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DarkInput
                        icon={<Phone size={20} />} placeholder="Numéro de téléphone" type="tel"
                        value={form.phone} onChange={v => setForm({ ...form, phone: v })}
                      />
                      <DarkInput
                        icon={<MapPin size={20} />} placeholder="Ville"
                        value={form.city} onChange={v => setForm({ ...form, city: v })}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DarkInput
                        icon={<Inbox size={20} />} placeholder="SIRET (14 chiffres)"
                        value={form.siret} onChange={v => setForm({ ...form, siret: v })}
                        maxLength={14}
                      />
                      <DarkInput
                        icon={<Check size={20} />} placeholder="N° TVA (13 car.)"
                        value={form.tva} onChange={v => setForm({ ...form, tva: v })}
                        maxLength={13}
                      />
                    </div>

                    {errorMsg && <ErrorBox message={errorMsg} />}

                    <button
                      onClick={handleSignup}
                      disabled={submitting}
                      className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
                    >
                      {submitting ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-slate-950/30 border-t-slate-950 rounded-full" />
                      ) : (
                        <>Valider &amp; Payer <ChevronRight size={20} /></>
                      )}
                    </button>

                    <p className="text-center text-xs text-slate-500 pt-2">
                      Déjà inscrit ?{' '}
                      <button onClick={() => { setErrorMsg(''); setMode('login'); }} className="text-indigo-400 hover:text-indigo-300 font-black underline">
                        Connectez-vous
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h2 className="text-3xl font-black text-white">Ravi de vous revoir</h2>
                    <p className="text-slate-400 mt-2">Connectez-vous pour accéder à votre borne.</p>
                  </div>

                  <div className="space-y-4">
                    <DarkInput
                      icon={<Store size={20} />} placeholder="Nom de votre boutique"
                      value={loginForm.shopName} onChange={v => setLoginForm({ ...loginForm, shopName: v })}
                    />
                    <DarkInput
                      icon={<Lock size={20} />} placeholder="Mot de passe" type="password"
                      value={loginForm.password} onChange={v => setLoginForm({ ...loginForm, password: v })}
                    />

                    {errorMsg && <ErrorBox message={errorMsg} />}

                    <button
                      onClick={handleLogin}
                      disabled={submitting}
                      className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50 mt-4"
                    >
                      {submitting ? 'Connexion...' : 'Se connecter'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {mode === 'delete' && (
          <motion.div
            key="delete"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full max-w-2xl relative z-10"
          >
            <button
              onClick={() => { setErrorMsg(''); setDeleteSuccess(false); setMode('hero'); }}
              className="absolute -top-16 left-0 flex items-center gap-2 text-slate-400 hover:text-white font-bold transition-colors"
            >
              <ArrowLeft size={20} />
              Retour
            </button>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-red-500/30 rounded-[3rem] p-8 md:p-12 shadow-2xl">
              {deleteSuccess ? (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center">
                    <Check size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-white">Boutique supprimée</h2>
                  <p className="text-slate-400">
                    Votre boutique et votre abonnement BOUTIDIDACT ont été définitivement supprimés.
                  </p>
                  <button
                    onClick={() => { setErrorMsg(''); setDeleteSuccess(false); setMode('hero'); }}
                    className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Retour à l'accueil
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/30 text-red-400 rounded-3xl flex items-center justify-center mb-4">
                      <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-white">Supprimer ma boutique</h2>
                    <p className="text-slate-400 mt-2">
                      Cette action est <strong className="text-red-400">définitive</strong>. L'abonnement Stripe sera annulé et toutes les données locales seront effacées.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <DarkInput
                      icon={<Store size={20} />} placeholder="Nom de votre boutique"
                      value={deleteForm.shopName} onChange={v => setDeleteForm({ ...deleteForm, shopName: v })}
                    />
                    <DarkInput
                      icon={<Mail size={20} />} placeholder="Email associé à la boutique" type="email"
                      value={deleteForm.email} onChange={v => setDeleteForm({ ...deleteForm, email: v })}
                    />
                    <DarkInput
                      icon={<Lock size={20} />} placeholder="Mot de passe" type="password"
                      value={deleteForm.password} onChange={v => setDeleteForm({ ...deleteForm, password: v })}
                    />

                    {errorMsg && <ErrorBox message={errorMsg} />}

                    <button
                      onClick={handleDelete}
                      disabled={submitting}
                      className="w-full py-5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-lg transition-all active:scale-[0.98] disabled:opacity-50 mt-4 flex items-center justify-center gap-3"
                    >
                      {submitting ? 'Suppression...' : (<><Trash2 size={20} /> Supprimer définitivement</>)}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {mode === 'waiting' && (
          <WaitingPanel key="waiting" onContinue={() => { setErrorMsg(''); setMode('login'); }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function WaitingPanel({ onContinue }) {
  const [secs, setSecs] = useState(10);
  useEffect(() => {
    if (secs <= 0) {
      onContinue();
      return;
    }
    const t = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs, onContinue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="w-full max-w-xl relative z-10"
    >
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[3rem] p-10 md:p-14 shadow-2xl text-center">
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6"
        >
          <Inbox size={40} />
        </motion.div>
        <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Paiement confirmé !</h2>
        <p className="text-slate-400 leading-relaxed mb-8">
          Vos identifiants <strong className="text-white">Boutididact</strong> seront envoyés par e-mail dans les prochaines minutes.
          Une fois reçus, connectez-vous avec le <strong className="text-white">nom de votre boutique</strong> et le{' '}
          <strong className="text-white">mot de passe</strong> choisi à l'inscription, puis renseignez vos identifiants Boutididact dans les paramètres.
        </p>

        <button
          onClick={() => window.location.href = '/relay-guide'}
          className="w-full py-4 mb-4 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-2xl font-black text-sm border border-indigo-500/20 transition-all flex items-center justify-center gap-3"
        >
          <Download size={18} /> Installer le Relais d'Impression
        </button>

        <button
          onClick={onContinue}
          className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
        >
          Accéder à ma boutique <ChevronRight size={20} />
        </button>
        <p className="text-xs text-slate-500 mt-4 flex items-center justify-center gap-1.5">
          <Clock size={12} /> Redirection automatique dans {secs}s
        </p>
      </div>
    </motion.div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-bold">
      {message}
    </div>
  );
}

function PricingFeature({ text }) {
  return (
    <div className="flex items-center gap-3 text-slate-300">
      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
        <Check size={14} />
      </div>
      <span className="font-medium">{text}</span>
    </div>
  );
}

function DarkInput({ icon, placeholder, type = 'text', value, onChange, maxLength }) {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">{icon}</div>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={e => {
          const val = e.target.value;
          if (maxLength && val.length > maxLength) return;
          onChange(val);
        }}
        maxLength={maxLength}
        className="w-full pl-12 pr-4 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-white font-bold transition-all placeholder:text-slate-600"
      />
    </div>
  );
}

