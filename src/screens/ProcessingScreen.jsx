import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, CreditCard, Receipt, Database } from 'lucide-react';

const STEPS = [
  { key: 'sale', label: 'Enregistrement Hiboutik', icon: Database },
  { key: 'payment', label: 'Validation du paiement', icon: CreditCard },
  { key: 'print', label: 'Impression du ticket', icon: Receipt },
];

export default function ProcessingScreen({ paymentMethod }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 text-white flex flex-col items-center justify-center"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 size={96} strokeWidth={2} />
      </motion.div>

      <h1 className="mt-10 text-5xl md:text-6xl font-black tracking-tight">
        Traitement en cours…
      </h1>
      <p className="mt-4 text-xl text-white/85 max-w-xl text-center">
        {paymentMethod === 'cash'
          ? 'Préparez le montant exact, votre ticket est en cours d’édition.'
          : 'Suivez les instructions du terminal de paiement.'}
      </p>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl px-6">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15 }}
              className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20 flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon size={22} />
              </div>
              <span className="font-bold">{s.label}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
