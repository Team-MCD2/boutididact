import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Mail, Lock, CreditCard, ChevronRight, Rocket, Check, ArrowLeft, ShieldCheck, Zap, Star } from 'lucide-react';

export default function LandingScreen({ onSubscribe, isSubscribing }) {
  const [mode, setMode] = useState('hero'); // 'hero', 'pricing', 'signup', 'login'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });

  const handleSignup = () => {
    if (!form.name || !form.email || !form.password) {
      alert('Veuillez remplir tous les champs.');
      return;
    }
    onSubscribe(form);
  };

  const handleLogin = () => {
    // Dans cette architecture, le "login" client déjà payé 
    // redirige vers le setup admin (en passant setup_complete à true)
    if (!loginForm.email || !loginForm.password) {
      alert('Veuillez renseigner vos identifiants.');
      return;
    }
    // Simulation de vérification / Passage au setup
    localStorage.setItem('boutididact_setup_complete', 'true');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-4 font-sans overflow-hidden">
      {/* Background Decor */}
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
              transition={{ type: "spring", damping: 12 }}
              className="w-24 h-24 bg-gradient-to-tr from-indigo-600 to-fuchsia-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/20"
            >
              <Rocket size={48} className="text-white" />
            </motion.div>
            
            <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">
              BOUTIDIDACT
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
              L'intelligence artificielle qui transforme votre point de vente en une expérience <span className="text-indigo-400">futuriste</span> et <span className="text-fuchsia-400">automatisée</span>.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setMode('pricing')}
                className="group px-8 py-5 bg-white text-slate-950 rounded-2xl font-black text-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-3 shadow-xl"
              >
                Activer ma borne
                <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button 
                onClick={() => setMode('login')}
                className="px-8 py-5 bg-slate-800/50 text-white border border-slate-700 rounded-2xl font-black text-lg transition-all hover:bg-slate-800 active:scale-95"
              >
                Déjà client
              </button>
            </div>
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
              onClick={() => setMode(mode === 'signup' ? 'pricing' : 'hero')}
              className="absolute -top-16 left-0 flex items-center gap-2 text-slate-400 hover:text-white font-bold transition-colors"
            >
              <ArrowLeft size={20} />
              Retour
            </button>

            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl">
              {mode === 'pricing' && (
                <div className="space-y-8">
                  <div className="text-center">
                    <span className="px-4 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-500/20">Tarification Unique</span>
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
                      <PricingFeature text="Synchronisation Cloud Hiboutik" />
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
                      icon={<Store size={20}/>} placeholder="Nom de votre boutique" 
                      value={form.name} onChange={v => setForm({...form, name: v})}
                    />
                    <DarkInput 
                      icon={<Mail size={20}/>} placeholder="Email de connexion" type="email"
                      value={form.email} onChange={v => setForm({...form, email: v})}
                    />
                    <DarkInput 
                      icon={<Lock size={20}/>} placeholder="Mot de passe" type="password"
                      value={form.password} onChange={v => setForm({...form, password: v})}
                    />
                    
                    <button 
                      onClick={handleSignup}
                      disabled={isSubscribing}
                      className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] mt-4 flex items-center justify-center gap-3"
                    >
                      {isSubscribing ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-slate-950/30 border-t-slate-950 rounded-full" />
                      ) : (
                        <>Valider & Payer <ChevronRight size={20}/></>
                      )}
                    </button>
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
                      icon={<Mail size={20}/>} placeholder="Email de votre boutique" type="email"
                      value={loginForm.email} onChange={v => setLoginForm({...loginForm, email: v})}
                    />
                    <DarkInput 
                      icon={<Lock size={20}/>} placeholder="Mot de passe / PIN" type="password"
                      value={loginForm.password} onChange={v => setLoginForm({...loginForm, password: v})}
                    />
                    
                    <button 
                      onClick={handleLogin}
                      className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg transition-all hover:bg-indigo-700 active:scale-[0.98] mt-4"
                    >
                      Se connecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

function Wand2({ size, className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.21 1.21 0 0 0 1.72 0L21.64 5.36a1.21 1.21 0 0 0 0-1.72Z"/>
      <path d="m14 7 3 3"/>
      <path d="M5 6v4"/>
      <path d="M19 14v4"/>
      <path d="M10 2v2"/>
      <path d="M7 8H3"/>
      <path d="M21 16h-4"/>
      <path d="M11 3H9"/>
    </svg>
  );
}

