import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Banknote, ArrowLeft, Lock } from 'lucide-react';

export default function PaymentScreen({ totalAmount, onBack, onPay }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-gradient-to-br from-slate-50 to-indigo-50"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="px-10 py-6 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 transition"
          >
            <ArrowLeft size={22} />
            <span className="font-bold text-gray-700">Retour</span>
          </button>
          <h1 className="text-2xl font-black text-gray-900">Choisissez votre paiement</h1>
          <div className="w-32" />
        </header>

        {/* Total */}
        <div className="px-10 py-10 text-center">
          <p className="text-lg font-medium text-gray-500 uppercase tracking-widest">
            Montant à régler
          </p>
          <p className="text-7xl md:text-8xl font-black text-gray-900 mt-3">
            {Number(totalAmount).toFixed(2)} <span className="text-5xl">€</span>
          </p>
        </div>

        {/* Choix paiement */}
        <div className="flex-1 px-10 pb-10 grid md:grid-cols-2 gap-6">
          <PaymentCard
            icon={<CreditCard size={64} />}
            title="Carte Bancaire"
            subtitle="Sans contact, puce ou bande magnétique"
            color="from-indigo-500 to-blue-600"
            onClick={() => onPay('card')}
          />
          <PaymentCard
            icon={<Banknote size={64} />}
            title="Espèces"
            subtitle="Remettez le montant exact en caisse"
            color="from-emerald-500 to-teal-600"
            onClick={() => onPay('cash')}
          />
        </div>

        <footer className="px-10 py-5 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
          <Lock size={14} />
          Paiement sécurisé · BOUTIDIDACT
        </footer>
      </div>
    </motion.div>
  );
}

function PaymentCard({ icon, title, subtitle, color, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-3xl p-10 text-left text-white bg-gradient-to-br ${color} shadow-xl flex flex-col justify-between min-h-[280px]`}
    >
      <div className="absolute -top-10 -right-10 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10">{icon}</div>
      <div className="relative z-10 mt-6">
        <h3 className="text-3xl font-black">{title}</h3>
        <p className="mt-2 text-white/85">{subtitle}</p>
      </div>
    </motion.button>
  );
}
