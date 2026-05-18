import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Mail, Lock, ChevronRight, Rocket, Check, ArrowLeft, Zap, Clock, Inbox, Trash2, AlertTriangle, Phone, Smartphone, Monitor, Download, Info, ExternalLink, X, MapPin, Plus } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/10 flex flex-col relative overflow-x-hidden">
      
      {/* 1. Header */}
      <Header 
        onLogin={() => { setErrorMsg(''); setMode('login'); }} 
        onPricing={() => { setErrorMsg(''); setMode('pricing'); }} 
      />

      {/* 2. Vitrine Content */}
      <main className="flex-1">
        <HeroSection onPricing={() => { setErrorMsg(''); setMode('pricing'); }} />
        <ReviewsSection />
        <FaqSection />
      </main>

      {/* 3. Footer */}
      <Footer 
        onLogin={() => { setErrorMsg(''); setMode('login'); }} 
        onDelete={() => { 
          setErrorMsg(''); 
          setDeleteSuccess(false); 
          setDeleteForm({ shopName: '', email: '', password: '' }); 
          setMode('delete'); 
        }} 
      />

      {/* 4. Auth Modals Overlay */}
      <AnimatePresence>
        {mode !== 'hero' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md overflow-y-auto custom-scrollbar"
          >
            <motion.div
              key={mode}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl relative my-auto"
            >
              <button
                onClick={() => { setErrorMsg(''); setMode(mode === 'signup' ? 'pricing' : 'hero'); }}
                className="absolute -top-12 md:-top-16 left-0 flex items-center gap-2 text-white hover:text-indigo-200 font-bold transition-colors"
              >
                <ArrowLeft size={20} />
                Retour
              </button>

              <div className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-2xl">
                
                {mode === 'pricing' && (
                  <div className="space-y-8">
                    <div className="text-center">
                      <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
                        Tarification Unique
                      </span>
                      <h2 className="text-4xl font-black text-slate-900 mt-4">BOUTIDIDACT Pro</h2>
                      <p className="text-slate-650 mt-2">Tout ce dont vous avez besoin pour réussir.</p>
                    </div>

                    <div className="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-200 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4">
                        <Zap size={32} className="text-amber-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-baseline gap-2 mb-6">
                        <span className="text-5xl font-black text-slate-900">49.90€</span>
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
                      <h2 className="text-3xl font-black text-slate-900">Créer mon compte</h2>
                      <p className="text-slate-600 mt-2">Votre boutique mérite le meilleur.</p>
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
                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg transition-all hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-4 flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20"
                      >
                        {submitting ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />
                        ) : (
                          <>Valider &amp; Payer <ChevronRight size={20} /></>
                        )}
                      </button>

                      <p className="text-center text-xs text-slate-500 pt-2 font-semibold">
                        Déjà inscrit ?{' '}
                        <button onClick={() => { setErrorMsg(''); setMode('login'); }} className="text-indigo-600 hover:text-indigo-800 font-black underline">
                          Connectez-vous
                        </button>
                      </p>
                    </div>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="space-y-8">
                    <div className="text-center">
                      <h2 className="text-3xl font-black text-slate-900">Ravi de vous revoir</h2>
                      <p className="text-slate-600 mt-2">Connectez-vous pour accéder à votre borne.</p>
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

                {mode === 'delete' && (
                  <div className="space-y-8">
                    {deleteSuccess ? (
                      <div className="text-center space-y-6">
                        <div className="w-20 h-20 mx-auto bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-3xl flex items-center justify-center">
                          <Check size={40} />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900">Boutique supprimée</h2>
                        <p className="text-slate-650">
                          Votre boutique et votre abonnement BOUTIDIDACT ont été définitivement supprimés.
                        </p>
                        <button
                          onClick={() => { setErrorMsg(''); setDeleteSuccess(false); setMode('hero'); }}
                          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg transition-all hover:bg-slate-800 active:scale-[0.98]"
                        >
                          Retour à l'accueil
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto bg-red-50 border border-red-200 text-red-500 rounded-3xl flex items-center justify-center mb-4">
                            <AlertTriangle size={32} />
                          </div>
                          <h2 className="text-3xl font-black text-slate-900">Supprimer ma boutique</h2>
                          <p className="text-slate-600 mt-2">
                            Cette action est <strong className="text-red-600 font-extrabold">définitive</strong>. L'abonnement Stripe sera annulé et toutes les données locales seront effacées.
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
                )}

                {mode === 'waiting' && (
                  <WaitingPanel onContinue={() => { setErrorMsg(''); setMode('login'); }} />
                )}
                
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// VITRINE COMPONENTS
// ==========================================

function Header({ onLogin, onPricing }) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Rocket size={20} className="text-white" />
          </div>
          <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-900">
            BOUTIDIDACT
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#fonctionnalites" className="text-sm font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors">Fonctionnalités</a>
          <a href="#avis" className="text-sm font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors">Avis</a>
          <a href="#faq" className="text-sm font-bold text-slate-500 hover:text-indigo-600 uppercase tracking-widest transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={onLogin} className="hidden md:block px-5 py-2.5 text-sm font-black text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
            Espace Client
          </button>
          <button onClick={onPricing} className="px-5 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95">
            Activer ma borne
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroSection({ onPricing }) {
  return (
    <section className="relative pt-20 pb-32 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-fuchsia-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-6 text-slate-900 leading-tight">
            Votre point de vente <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600">
              automatisé par l'IA.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 font-medium mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
            Fini les files d'attente interminables. Découvrez la borne de commande intelligente, élégante et sans configuration qui révolutionne la restauration.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <button
              onClick={onPricing}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3"
            >
              Créer ma boutique <ChevronRight size={20} />
            </button>
            <a
              href="#avis"
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-black text-lg transition-all hover:bg-slate-50 active:scale-95 flex items-center justify-center gap-3"
            >
              Voir les avis
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm font-bold text-slate-500">
            <div className="flex items-center gap-1.5"><Check size={16} className="text-emerald-500" /> Sans engagement</div>
            <div className="flex items-center gap-1.5"><Check size={16} className="text-emerald-500" /> Installation en 2 min</div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:max-w-none perspective-1000">
          <motion.div
            initial={{ rotateY: 15, rotateX: 5, opacity: 0, scale: 0.9 }}
            animate={{ rotateY: -5, rotateX: 5, opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="relative rounded-[2.5rem] shadow-2xl shadow-indigo-900/20 border-8 border-white overflow-hidden bg-slate-100 transform-gpu"
          >
            <img 
              src="/hero-mockup.png" 
              alt="Maquette de la borne Boutididact" 
              className="w-full h-auto object-cover"
            />
            {/* Absolute overlay items to mimic UI interaction feeling */}
            <div className="absolute top-6 right-6 px-4 py-2 bg-white/90 backdrop-blur rounded-full shadow-lg border border-white/20 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Zap size={16} className="text-amber-500" /> Numérisation IA
            </div>
            <div className="absolute bottom-6 left-6 px-4 py-2 bg-emerald-500 text-white rounded-full shadow-lg flex items-center gap-2 text-sm font-bold">
              <Check size={16} /> Impression instantanée
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ReviewsSection() {
  const reviews = [
    { text: "L'installation a pris littéralement 2 minutes. L'IA a scanné tout mon menu Hiboutik automatiquement. Mes clients adorent l'interface !", author: "Marc D.", source: "Restaurateur", rating: 5 },
    { text: "Nous avons réduit les files d'attente de moitié le midi. Le design est magnifique et le mode relais pour l'imprimante est magique.", author: "Sophie L.", source: "Gérante Food Truck", rating: 5 },
    { text: "Aucun paramétrage réseau compliqué. On branche, ça marche. Le support est ultra réactif. Le meilleur investissement de l'année.", author: "Thomas B.", source: "Snack Toulouse", rating: 5 },
  ];

  return (
    <section id="avis" className="py-24 bg-white border-y border-slate-100 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
            Avis Clients
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-4 mb-4">Ils ont franchi le pas</h2>
          <div className="flex items-center justify-center gap-2">
            <div className="flex text-amber-400">
              {[1,2,3,4,5].map(i => <svg key={i} className="h-6 w-6 fill-current" viewBox="0 0 20 20"><path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.2 1 5.9L10 15l-5.3 2.8 1-5.9L1.4 7.7l5.9-.9z"/></svg>)}
            </div>
            <span className="font-bold text-slate-700">5.0 / 5</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {reviews.map((r, i) => (
            <div key={i} className="p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex text-amber-400">
                  {[...Array(r.rating)].map((_, j) => <svg key={j} className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.2 1 5.9L10 15l-5.3 2.8 1-5.9L1.4 7.7l5.9-.9z"/></svg>)}
                </div>
                <span className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-500">{r.source}</span>
              </div>
              <p className="text-slate-700 font-medium leading-relaxed mb-6">« {r.text} »</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                  {r.author.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{r.author}</div>
                  <div className="text-xs text-slate-500 font-medium">Achat Vérifié</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  const faqs = [
    { q: "Qu'est-ce que le Mode Relais ?", a: "C'est une exclusivité Boutididact. Vous n'avez pas besoin de relier vos tablettes à votre imprimante de cuisine en local. Le logiciel s'installe sur n'importe quel ordinateur et récupère les commandes du Cloud instantanément." },
    { q: "Puis-je utiliser mes propres tablettes ?", a: "Absolument. Boutididact tourne sur le web (PWA). Un simple iPad ou une tablette Android récente suffit pour transformer votre comptoir en borne de commande professionnelle." },
    { q: "Comment se passe l'intégration avec Hiboutik ?", a: "Vous renseignez vos accès API Hiboutik et notre IA s'occupe de tout. Elle télécharge votre menu, vos prix, vos options, et assigne même des images automatiquement à vos produits." },
    { q: "Y a-t-il des frais d'installation ?", a: "Aucun. Vous vous inscrivez, vous payez l'abonnement mensuel de 49.90€ et vous avez accès à l'ensemble du système. Vous pouvez résilier en un clic." },
  ];

  return (
    <section id="faq" className="py-24 bg-slate-50">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
            Questions fréquentes
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-4">FAQ</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((f, i) => (
            <details key={i} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden transition-all hover:border-indigo-200">
              <summary className="flex cursor-pointer items-center justify-between p-6 font-bold text-lg text-slate-800">
                <span>{f.q}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-transform group-open:rotate-45">
                  <Plus size={18} />
                </span>
              </summary>
              <div className="px-6 pb-6 pt-2 text-slate-600 leading-relaxed font-medium">
                {f.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({ onLogin, onDelete }) {
  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-fuchsia-600 rounded-lg flex items-center justify-center">
              <Rocket size={16} className="text-white" />
            </div>
            <span className="font-black text-xl tracking-tight text-slate-900">
              BOUTIDIDACT
            </span>
          </div>
          <p className="text-slate-500 font-medium max-w-sm mb-6 leading-relaxed">
            La solution de borne de commande ultra-moderne propulsée par l'intelligence artificielle pour la restauration rapide.
          </p>
        </div>

        <div>
          <h4 className="font-black uppercase tracking-widest text-slate-900 mb-4 text-sm">Navigation</h4>
          <ul className="space-y-3 text-slate-500 font-medium">
            <li><a href="#fonctionnalites" className="hover:text-indigo-600 transition-colors">Fonctionnalités</a></li>
            <li><a href="#avis" className="hover:text-indigo-600 transition-colors">Avis Clients</a></li>
            <li><a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a></li>
            <li><button onClick={onLogin} className="hover:text-indigo-600 transition-colors">Se connecter</button></li>
          </ul>
        </div>

        <div>
          <h4 className="font-black uppercase tracking-widest text-slate-900 mb-4 text-sm">Mentions</h4>
          <ul className="space-y-3 text-slate-500 font-medium">
            <li><a href="/relay-guide" className="hover:text-indigo-600 transition-colors">Télécharger le relais</a></li>
            <li><button onClick={onDelete} className="hover:text-red-500 transition-colors">Supprimer mon compte</button></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-100 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-500">
          <div>&copy; {new Date().getFullYear()} BOUTIDIDACT. Tous droits réservés.</div>
          <div className="flex items-center gap-2">
            Développée par 
            <a href="https://microdidact.com/" target="_blank" rel="noopener noreferrer" className="font-black text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
              Microdidact <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ==========================================
// HELPERS & MODALS
// ==========================================

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
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <Inbox size={40} />
      </div>
      <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">Paiement confirmé !</h2>
      <p className="text-slate-650 leading-relaxed mb-8">
        Vos identifiants <strong className="text-slate-900 font-extrabold">Boutididact</strong> seront envoyés par e-mail dans les prochaines minutes.
        Une fois reçus, connectez-vous avec le <strong className="text-slate-900 font-extrabold">nom de votre boutique</strong> et le{' '}
        <strong className="text-slate-900 font-extrabold">mot de passe</strong> choisi à l'inscription.
      </p>

      <button
        onClick={() => window.location.href = '/relay-guide'}
        className="w-full py-4 mb-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl font-black text-sm border border-indigo-200 transition-all flex items-center justify-center gap-3"
      >
        <Download size={18} /> Installer le Relais d'Impression
      </button>

      <button
        onClick={onContinue}
        className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20"
      >
        Accéder à ma boutique <ChevronRight size={20} />
      </button>
      <p className="text-xs text-slate-500 mt-4 flex items-center justify-center gap-1.5 font-semibold">
        <Clock size={12} /> Redirection automatique dans {secs}s
      </p>
    </div>
  );
}

function ErrorBox({ message }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-650 text-sm font-bold">
      {message}
    </div>
  );
}

function PricingFeature({ text }) {
  return (
    <div className="flex items-center gap-3 text-slate-700">
      <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
        <Check size={14} />
      </div>
      <span className="font-medium">{text}</span>
    </div>
  );
}

function DarkInput({ icon, placeholder, type = 'text', value, onChange, maxLength }) {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">{icon}</div>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={e => {
          const val = e.target.value;
          if (maxLength && val.length > maxLength) return;
          onChange(val);
        }}
        maxLength={maxLength}
        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-900 font-bold transition-all placeholder:text-slate-400"
      />
    </div>
  );
}

