import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Receipt, AlertTriangle, Home } from 'lucide-react';

export default function SuccessScreen({ result, onDone, autoCloseMs = 8000 }) {
  const [count, setCount] = useState(Math.ceil(autoCloseMs / 1000));

  useEffect(() => {
    const id = setInterval(() => setCount((c) => Math.max(0, c - 1)), 1000);
    const t = setTimeout(onDone, autoCloseMs);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, [autoCloseMs, onDone]);

  const printed = result?.printed !== false;
  const warnings = result?.warnings || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center px-8"
    >
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-28 h-28 md:w-40 md:h-40 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-emerald-500/40"
      >
        <CheckCircle2 size={window.innerWidth < 768 ? 64 : 96} strokeWidth={2.5} />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 md:mt-10 text-4xl md:text-7xl font-black text-gray-900 text-center"
      >
        Merci !
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-3 md:mt-4 text-lg md:text-2xl text-gray-600 max-w-2xl text-center"
      >
        Votre commande a été enregistrée avec succès.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-6 md:mt-8 bg-white rounded-2xl md:rounded-3xl shadow-xl border border-gray-100 px-6 md:px-8 py-5 md:py-6 flex flex-col items-center gap-2 w-full max-w-xs md:min-w-[320px]"
      >
        <div className="flex items-center gap-2 text-gray-500 uppercase tracking-widest text-xs font-bold">
          <Receipt size={14} /> Ticket
        </div>
        <div className="text-3xl font-black text-gray-900">
          {result?.ticketId || '—'}
        </div>
        {result?.saleId && (
          <div className="text-sm text-gray-500">
            Vente Boutididact <span className="font-bold text-gray-700">#{result.saleId}</span>
          </div>
        )}
        {!printed && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-sm font-bold">
            <AlertTriangle size={16} />
            Ticket non imprimé — un opérateur va vous le remettre
          </div>
        )}
        {warnings?.length > 0 && printed && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs">
            <AlertTriangle size={14} />
            {warnings.map((w) => w.code).join(', ')}
          </div>
        )}
      </motion.div>

      <button
        onClick={onDone}
        className="mt-8 md:mt-10 flex items-center gap-3 px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl bg-gray-900 text-white font-bold text-base md:text-lg hover:bg-black active:scale-95 transition shadow-xl"
      >
        <Home size={20} className="md:w-[22px] md:h-[22px]" />
        Nouvelle commande
        <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs md:text-sm">{count}s</span>
      </button>
    </motion.div>
  );
}
