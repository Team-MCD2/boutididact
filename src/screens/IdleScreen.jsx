import React from 'react';
import { motion } from 'framer-motion';
import { Hand, Sparkles } from 'lucide-react';
import logoUrl from '../assets/logo.svg';

export default function IdleScreen({ onStart, health }) {
  const online = health?.ok;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onStart}
      className="fixed inset-0 z-50 cursor-pointer select-none"
    >
      {/* Fond animé */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600" />
      <div className="absolute inset-0 opacity-30">
        <motion.div
          className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-white/20 rounded-full blur-3xl"
          animate={{ x: [0, 80, 0], y: [0, 60, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 w-[40rem] h-[40rem] bg-pink-300/30 rounded-full blur-3xl"
          animate={{ x: [0, -80, 0], y: [0, -40, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Contenu */}
      <div className="relative h-full w-full flex flex-col items-center justify-center text-white px-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring' }}
          className="w-44 h-44 rounded-3xl bg-white/95 shadow-2xl shadow-black/20 flex items-center justify-center p-5 mb-10"
        >
          <img src={logoUrl} alt="BOUTIDIDACT" className="w-full h-full object-contain" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-7xl md:text-8xl font-black tracking-tight"
        >
          BOUTIDIDACT
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-2xl md:text-3xl font-light text-white/85 flex items-center gap-3"
        >
          <Sparkles size={28} /> Commande &amp; Encaissement en libre-service
        </motion.p>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-16 flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="w-32 h-32 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-2xl"
          >
            <Hand size={56} />
          </motion.div>
          <p className="text-3xl md:text-4xl font-bold uppercase tracking-widest">
            Touchez pour commencer
          </p>
        </motion.div>

        {/* Indicateur état */}
        <div className="absolute bottom-8 right-8 flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-3 rounded-full border border-white/20">
          <span
            className={`w-3 h-3 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-amber-300'}`}
          />
          <span className="text-sm font-semibold">
            {online ? 'Système en ligne' : 'Mode dégradé'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
