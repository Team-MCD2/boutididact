import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Mail, Lock, ChevronRight, Rocket, Check, ArrowLeft, Zap, Clock, Inbox, Trash2, AlertTriangle, Phone, Smartphone, Monitor, Download, Info, ExternalLink, X, MapPin, Plus, BrainCircuit, RefreshCw, Printer, Shield, Star, ArrowRight, PlayCircle } from 'lucide-react';
import logoUrl from '../assets/logo.svg';

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
        <IntegrationMarqueeSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ReviewsSection />
        <FaqSection />
        <CtaSection onPricing={() => { setErrorMsg(''); setMode('pricing'); }} />
      </main>

      {/* 3. Footer */}
      <Footer 
        onLogin={() => { setErrorMsg(''); setMode('login'); }} 
        onLegal={() => { setErrorMsg(''); setMode('legal'); }}
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

                {mode === 'waiting' && (
                  <WaitingPanel onContinue={() => { setErrorMsg(''); setMode('login'); }} />
                )}

                {mode === 'legal' && (
                  <div className="space-y-6 text-slate-800 text-left">
                    <div className="text-center">
                      <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
                        Réglementation
                      </span>
                      <h2 className="text-3xl font-black text-slate-900 mt-4">Mentions Légales</h2>
                      <p className="text-slate-500 mt-2">Dernière mise à jour : Mai 2026</p>
                    </div>
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 text-sm leading-relaxed custom-scrollbar font-medium">
                      <div>
                        <h3 className="font-extrabold text-slate-900 mb-1">1. Présentation du site</h3>
                        <p>En vertu de l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique, il est précisé aux utilisateurs du site <strong>Boutididact</strong> l'identité des différents intervenants dans le cadre de sa réalisation et de son suivi :</p>
                        <p className="mt-1"><strong>Éditeur et Propriétaire :</strong> Microdidact E.U.R.L., agence de développement web et logiciel.</p>
                        <p className="mt-1"><strong>Créateur & Webmaster :</strong> Microdidact (<a href="https://microdidact.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">microdidact.com</a>)</p>
                        <p className="mt-1"><strong>Hébergeur :</strong> Vercel Inc., 750 Broadway, Suite 2003, New York, NY 10003.</p>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 mb-1">2. Propriété intellectuelle</h3>
                        <p>Microdidact est propriétaire des droits de propriété intellectuelle ou détient les droits d'usage sur tous les éléments accessibles sur le site, notamment les textes, images, graphismes, logo, icônes, sons, logiciels.</p>
                        <p className="mt-1">Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, is interdite, sauf autorisation écrite préalable de Microdidact.</p>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 mb-1">3. Limitations de responsabilité</h3>
                        <p>Boutididact ne pourra être tenu responsable des dommages directs et indirects causés au matériel de l'utilisateur, lors de l'accès au site, et résultant soit de l'utilisation d'un matériel ne répondant pas aux spécifications indiquées, soit de l'apparition d'un bug ou d'une incompatibilité.</p>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 mb-1">4. Gestion des données personnelles & Cookies</h3>
                        <p>En France, les données personnelles sont notamment protégées par la loi n° 78-87 du 6 janvier 1978, la loi n° 2004-801 du 6 août 2004, l'article L. 226-13 du Code pénal et la Réglementation Européenne (RGPD).</p>
                        <p className="mt-1">À l'occasion de l'utilisation du site, peuvent être recueillies : l'URL des liens par l'intermédiaire desquels l'utilisateur a accédé au site, le fournisseur d'accès de l'utilisateur, l'adresse de protocole Internet (IP) de l'utilisateur.</p>
                      </div>
                    </div>
                  </div>
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm' : 'bg-transparent border-transparent'}`}>
      <div className={`max-w-7xl mx-auto px-6 flex items-center justify-between transition-all duration-300 ${isScrolled ? 'h-16' : 'h-24'}`}>
        <a href="#" className="flex items-center gap-3 group">
          <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
            <img src={logoUrl} alt="BOUTIDIDACT" className="w-full h-full object-contain" />
          </div>
          <span className="font-black text-2xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-indigo-900">
            BOUTIDIDACT
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#fonctionnalites" className="text-sm font-bold text-slate-600 hover:text-indigo-600 uppercase tracking-widest transition-colors">Fonctionnalités</a>
          <a href="#avis" className="text-sm font-bold text-slate-600 hover:text-indigo-600 uppercase tracking-widest transition-colors">Avis</a>
          <a href="#faq" className="text-sm font-bold text-slate-600 hover:text-indigo-600 uppercase tracking-widest transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={onLogin} className="hidden md:block px-5 py-2 text-sm font-black text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm rounded-xl transition-all">
            Espace Client
          </button>
          <button onClick={onPricing} className="px-5 py-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95">
            Activer ma borne
          </button>
        </div>
      </div>
    </header>
  );
}

function IntegrationMarqueeSection() {
  const items = [
    { text: "Propulsé par l'IA", icon: <BrainCircuit size={20} /> },
    { text: "Intégration Caisse Native", icon: <Store size={20} /> },
    { text: "Paiements Sécurisés Stripe", icon: <Shield size={20} /> },
    { text: "Mode Relais Zero-Touch", icon: <Printer size={20} /> },
    { text: "Temps réel Cloud", icon: <RefreshCw size={20} /> },
  ];

  return (
    <div className="w-full bg-slate-900 text-white overflow-hidden py-4 flex relative border-y border-slate-800">
      <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none"></div>
      <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none"></div>
      <motion.div
        animate={{ x: [0, -1035] }}
        transition={{ ease: "linear", duration: 20, repeat: Infinity }}
        className="flex whitespace-nowrap"
      >
        {[...items, ...items, ...items].map((item, i) => (
          <div key={i} className="flex items-center gap-3 px-8 text-sm font-bold uppercase tracking-widest text-slate-300">
            <span className="text-indigo-400">{item.icon}</span>
            {item.text}
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 mx-6"></span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}


function HeroSection({ onPricing }) {
  return (
    <section className="relative pt-20 pb-32 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }} 
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1] }} 
          transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-fuchsia-500 blur-[120px] rounded-full" 
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -30 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.6 }}
          className="text-center lg:text-left"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-6 text-slate-900 leading-tight">
            Votre point de vente <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-fuchsia-600">
              automatisé par l'IA.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-650 font-medium mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
            Fini les files d'attente interminables. Découvrez la borne de commande intelligente, élégante et sans configuration qui révolutionne la restauration rapide.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <button
              onClick={onPricing}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3"
            >
              Créer ma boutique <ChevronRight size={20} />
            </button>
            <a
              href="#avis"
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-black text-lg transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95 flex items-center justify-center gap-3 shadow-sm"
            >
              <PlayCircle size={20} className="text-indigo-600" /> Voir les avis
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm font-bold text-slate-500">
            <div className="flex items-center gap-1.5"><Check size={16} className="text-emerald-500" /> Sans engagement</div>
            <div className="flex items-center gap-1.5"><Check size={16} className="text-emerald-500" /> Installation en 2 min</div>
          </div>
        </motion.div>

        <div className="relative mx-auto w-full max-w-lg lg:max-w-none perspective-1000">
          <motion.div
            initial={{ rotateY: 15, rotateX: 5, opacity: 0, scale: 0.9 }}
            animate={{ rotateY: -5, rotateX: 5, opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="relative rounded-[2.5rem] shadow-[0_30px_60px_-15px_rgba(79,70,229,0.3)] border-8 border-white overflow-hidden bg-slate-100 transform-gpu"
          >
            <img 
              src="/hero-mockup.png" 
              alt="Maquette de la borne Boutididact" 
              className="w-full h-auto object-cover"
            />
            
            {/* Flotting badges */}
            <motion.div 
              animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-6 right-6 px-4 py-2 bg-white/95 backdrop-blur-md rounded-full shadow-xl border border-white flex items-center gap-2 text-sm font-bold text-slate-800"
            >
              <Zap size={16} className="text-amber-500 fill-amber-500" /> Vitesse record
            </motion.div>
            
            <motion.div 
              animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-6 left-6 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full shadow-xl border border-emerald-400 flex items-center gap-2 text-sm font-bold"
            >
              <Check size={16} /> Commandes fluides
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { icon: <BrainCircuit size={28} />, title: "Extraction IA", desc: "Notre IA télécharge vos produits et génère automatiquement un catalogue visuel magnifique.", color: "indigo" },
    { icon: <RefreshCw size={28} />, title: "Synchronisation Live", desc: "Les prix et les stocks sont mis à jour en temps réel entre votre caisse et toutes vos bornes.", color: "fuchsia" },
    { icon: <Printer size={28} />, title: "Zero-Touch Print", desc: "Plus de galère de réseau. Le Relais Boutididact imprime vos tickets depuis n'importe où via le Cloud.", color: "emerald" },
    { icon: <Shield size={28} />, title: "Paiement Sécurisé", desc: "Intégration Stripe fluide pour des paiements par carte bancaire rapides, sans friction et 100% sécurisés.", color: "amber" },
  ];

  const colorStyles = {
    indigo: "bg-indigo-100 text-indigo-600 border-indigo-200",
    fuchsia: "bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200",
    emerald: "bg-emerald-100 text-emerald-600 border-emerald-200",
    amber: "bg-amber-100 text-amber-600 border-amber-200"
  };

  return (
    <section id="fonctionnalites" className="py-24 bg-white relative z-10 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-20"
        >
          <span className="px-4 py-1.5 bg-fuchsia-50 text-fuchsia-600 rounded-full text-xs font-black uppercase tracking-widest border border-fuchsia-100">
            Pourquoi nous choisir
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-4 mb-6">
            Une puissance technologique <br/> <span className="text-indigo-600">sans précédent.</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto font-medium">
            Oubliez les installations complexes de plusieurs jours. Boutididact est conçu pour fonctionner en quelques minutes.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-slate-50 border border-slate-200 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border mb-6 transition-transform group-hover:scale-110 ${colorStyles[f.color]}`}>
                {f.icon}
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-3">{f.title}</h3>
              <p className="text-slate-600 font-medium leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { num: "01", title: "Connectez votre caisse", desc: "Configurez les accès de votre caisse. Notre système se synchronise immédiatement." },
    { num: "02", title: "L'IA fait le reste", desc: "Elle classe vos produits, ajoute des images appétissantes et crée un menu magnifique." },
    { num: "03", title: "Encaissez en continu", desc: "Branchez votre borne. Les commandes et impressions arrivent toutes seules." }
  ];

  return (
    <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-slate-900"></div>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black mt-4 mb-4">Lancement en 3 étapes</h2>
          <p className="text-indigo-200 text-lg">Si simple que vous n'en reviendrez pas.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Ligne connectrice sur desktop */}
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0"></div>
          
          {steps.map((s, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative text-center"
            >
              <div className="w-24 h-24 mx-auto bg-slate-800 border-4 border-slate-900 rounded-full flex items-center justify-center mb-8 relative z-10 shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-indigo-400 to-fuchsia-400">{s.num}</span>
              </div>
              <h3 className="text-2xl font-black mb-4">{s.title}</h3>
              <p className="text-slate-400 font-medium leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewsSection() {
  const reviews = [
    { text: "L'installation a pris littéralement 2 minutes. L'IA a scanné tout mon menu. Mes clients adorent l'interface !", author: "Marc D.", source: "Restaurateur", rating: 5 },
    { text: "Nous avons réduit les files d'attente de moitié le midi. Le design est magnifique et le mode relais pour l'imprimante est magique.", author: "Sophie L.", source: "Gérante Food Truck", rating: 5 },
    { text: "Aucun paramétrage réseau compliqué. On branche, ça marche. Le support est ultra réactif. Le meilleur investissement de l'année.", author: "Thomas B.", source: "Snack Toulouse", rating: 5 },
  ];

  return (
    <section id="avis" className="py-24 bg-slate-50 border-y border-slate-100 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-widest border border-emerald-100">
            Avis Clients
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-4 mb-4">Ils ont franchi le pas</h2>
          <div className="flex items-center justify-center gap-2">
            <div className="flex text-amber-400">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-6 w-6 fill-amber-400 text-amber-400" />)}
            </div>
            <span className="font-bold text-slate-700">5.0 / 5</span>
          </div>
        </motion.div>

        <div className="flex overflow-x-auto gap-8 pb-8 snap-x snap-mandatory scroll-smooth custom-scrollbar-horizontal select-none">
          {reviews.map((r, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
              className="min-w-[280px] sm:min-w-[360px] md:min-w-[400px] flex-1 snap-start p-8 rounded-3xl bg-white border border-slate-200 hover:-translate-y-2 hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex text-amber-400 gap-0.5">
                  {[...Array(r.rating)].map((_, j) => <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-600">{r.source}</span>
              </div>
              <p className="text-slate-700 font-medium leading-relaxed mb-6">« {r.text} »</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white flex items-center justify-center font-black shadow-md">
                  {r.author.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">{r.author}</div>
                  <div className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <Check size={12} /> Client Vérifié
                  </div>
                </div>
              </div>
            </motion.div>
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
    { q: "Comment se passe l'intégration avec votre caisse ?", a: "Vous renseignez vos accès API de caisse et notre IA s'occupe de tout. Elle télécharge votre menu, vos prix, vos options, et assigne même des images automatiquement à vos produits." },
    { q: "Y a-t-il des frais d'installation ?", a: "Aucun. Vous vous inscrivez, vous payez l'abonnement mensuel de 49.90€ et vous avez accès à l'ensemble du système. Vous pouvez résilier en un clic." },
  ];

  return (
    <section id="faq" className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100">
            Questions fréquentes
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-4">Tout ce que vous devez savoir</h2>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((f, i) => (
            <motion.details 
              key={i} 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              className="group bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden transition-all hover:border-indigo-300 hover:shadow-md"
            >
              <summary className="flex cursor-pointer items-center justify-between p-6 font-bold text-lg text-slate-800">
                <span>{f.q}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm border border-slate-200 transition-transform group-open:rotate-45 group-open:bg-indigo-600 group-open:text-white group-open:border-indigo-600">
                  <Plus size={18} />
                </span>
              </summary>
              <div className="px-6 pb-6 pt-2 text-slate-600 leading-relaxed font-medium">
                {f.a}
              </div>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({ onPricing }) {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-fuchsia-700 rounded-[3rem] p-12 text-center text-white shadow-2xl shadow-indigo-600/30 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-400/20 blur-[80px] rounded-full"></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black mb-6">Prêt à transformer votre restaurant ?</h2>
            <p className="text-xl text-indigo-100 font-medium max-w-2xl mx-auto mb-10">
              Rejoignez des dizaines de restaurateurs qui ont déjà automatisé leurs prises de commandes et boosté leur chiffre d'affaires.
            </p>
            <button 
              onClick={onPricing}
              className="px-10 py-5 bg-white text-indigo-600 rounded-2xl font-black text-xl hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center justify-center gap-3 mx-auto"
            >
              Démarrer l'essai <ArrowRight size={24} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer({ onLogin, onLegal }) {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-12 border-b border-slate-800">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 flex items-center justify-center">
              <img src={logoUrl} alt="BOUTIDIDACT" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-2xl tracking-tight text-white">
              BOUTIDIDACT
            </span>
          </div>
          <p className="text-slate-400 font-medium max-w-sm mb-6 leading-relaxed">
            La solution de borne de commande ultra-moderne propulsée par l'intelligence artificielle pour la restauration rapide.
          </p>
        </div>

        <div>
          <h4 className="font-black uppercase tracking-widest text-white mb-6 text-sm">Navigation</h4>
          <ul className="space-y-4 font-medium">
            <li><a href="#fonctionnalites" className="hover:text-indigo-400 transition-colors">Fonctionnalités</a></li>
            <li><a href="#avis" className="hover:text-indigo-400 transition-colors">Avis Clients</a></li>
            <li><a href="#faq" className="hover:text-indigo-400 transition-colors">FAQ</a></li>
            <li><button onClick={onLogin} className="hover:text-indigo-400 transition-colors">Espace Client</button></li>
          </ul>
        </div>

        <div>
          <h4 className="font-black uppercase tracking-widest text-white mb-6 text-sm">Ressources</h4>
          <ul className="space-y-4 font-medium">
            <li><a href="/relay-guide" className="hover:text-indigo-400 transition-colors">Logiciel Relais (PC)</a></li>
            <li><button onClick={onLegal} className="hover:text-indigo-400 text-left transition-colors">Mentions Légales</button></li>
          </ul>
        </div>
      </div>

      <div className="py-8 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-500">
          <div>&copy; {new Date().getFullYear()} BOUTIDIDACT. Tous droits réservés.</div>
          <div className="flex items-center gap-2">
            Développée par 
            <a href="https://microdidact.com/" target="_blank" rel="noopener noreferrer" className="font-black text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 bg-indigo-900/30 px-3 py-1.5 rounded-lg">
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

