import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Mail, Lock, CreditCard, ChevronRight, Rocket } from 'lucide-react';

export default function LandingScreen({ onSubscribe, isSubscribing }) {
  const [mode, setMode] = useState('welcome'); // 'welcome', 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleNext = () => {
    if (mode === 'welcome') setMode('signup');
    else {
      if (!form.name || !form.email || !form.password) {
        alert('Veuillez remplir tous les champs.');
        return;
      }
      onSubscribe(form);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl"
      >
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200">
            <Rocket size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">BOUTIDIDACT</h1>
          <p className="text-gray-500 font-medium">L'intelligence artificielle au service de votre point de vente.</p>
        </div>

        <motion.div 
          layout
          className="bg-gray-50 border border-gray-100 rounded-[2.5rem] p-10 shadow-sm"
        >
          {mode === 'welcome' ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-gray-800">Bienvenue sur votre nouvelle borne</h2>
              <p className="text-gray-600 leading-relaxed">
                Prêt à transformer votre commerce ? Inscrivez-vous en quelques secondes pour activer vos fonctionnalités intelligentes et votre connexion cloud.
              </p>
              <div className="space-y-4 pt-4">
                <Benefit icon={<Store size={18}/>} text="Gestion simplifiée de votre catalogue" />
                <Benefit icon={<Wand2 size={18}/>} text="Numérisation de carte par IA" />
                <Benefit icon={<CreditCard size={18}/>} text="Paiement Stripe sécurisé intégré" />
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <h2 className="text-2xl font-black text-gray-800">Créer mon compte boutique</h2>
              <div className="space-y-4">
                <Input 
                  icon={<Store size={20}/>} placeholder="Nom de votre boutique" 
                  value={form.name} onChange={v => setForm({...form, name: v})}
                />
                <Input 
                  icon={<Mail size={20}/>} placeholder="Email de connexion" type="email"
                  value={form.email} onChange={v => setForm({...form, email: v})}
                />
                <Input 
                  icon={<Lock size={20}/>} placeholder="Mot de passe" type="password"
                  value={form.password} onChange={v => setForm({...form, password: v})}
                />
              </div>
              <p className="text-xs text-gray-400 text-center px-4">
                En vous inscrivant, vous acceptez nos conditions générales d'utilisation et de vente.
              </p>
            </div>
          )}

          <button 
            onClick={handleNext}
            disabled={isSubscribing}
            className="w-full mt-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {isSubscribing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                {mode === 'welcome' ? 'Commencer l\'aventure' : 'Valider & Passer au paiement'}
                <ChevronRight size={22} />
              </>
          </button>

          <button 
            onClick={() => {
              localStorage.setItem('boutididact_setup_complete', 'true');
              window.location.reload();
            }}
            className="w-full mt-6 py-3 text-gray-400 hover:text-indigo-600 font-bold text-sm transition"
          >
            Déjà client ? Se connecter
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function Benefit({ icon, text }) {
  return (
    <div className="flex items-center gap-3 text-gray-700 font-bold">
      <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-indigo-600 shadow-sm">{icon}</div>
      <span>{text}</span>
    </div>
  );
}

function Input({ icon, placeholder, type = 'text', value, onChange }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
      <input 
        type={type} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
        className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 font-bold text-gray-700 transition"
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
