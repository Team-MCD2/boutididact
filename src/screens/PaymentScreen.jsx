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
        <header className="px-4 md:px-10 py-4 md:py-6 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm">
          <button
            onClick={onBack}
            className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-3 rounded-xl md:rounded-2xl bg-white border border-gray-200 hover:bg-gray-50 active:scale-95 transition"
          >
            <ArrowLeft size={20} className="md:w-[22px] md:h-[22px]" />
            <span className="font-bold text-gray-700 text-sm md:text-base">Retour</span>
          </button>
          <h1 className="text-lg md:text-2xl font-black text-gray-900 text-center">Paiement</h1>
          <div className="w-20 md:w-32" />
        </header>

        {/* Total */}
        <div className="px-4 md:px-10 py-6 md:py-10 text-center">
          <p className="text-xs md:text-lg font-medium text-gray-500 uppercase tracking-widest">
            Montant à régler
          </p>
          <p className="text-5xl md:text-8xl font-black text-gray-900 mt-2 md:mt-3">
            {Number(totalAmount).toFixed(2)} <span className="text-3xl md:text-5xl">€</span>
          </p>
        </div>

        {/* Choix paiement */}
        <div className="flex-1 px-4 md:px-10 pb-6 md:pb-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 overflow-y-auto">
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
      className={`relative overflow-hidden rounded-2xl md:rounded-3xl p-6 md:p-10 text-left text-white bg-gradient-to-br ${color} shadow-xl flex flex-col justify-between min-h-[160px] md:min-h-[280px]`}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 md:w-56 md:h-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10">
        {React.cloneElement(icon, { size: window.innerWidth < 768 ? 40 : 64 })}
      </div>
      <div className="relative z-10 mt-4 md:mt-6">
        <h3 className="text-xl md:text-3xl font-black">{title}</h3>
        <p className="mt-1 md:mt-2 text-sm md:text-base text-white/85">{subtitle}</p>
      </div>
    </motion.button>
  );
}
