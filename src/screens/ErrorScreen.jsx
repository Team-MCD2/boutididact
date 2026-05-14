import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

const STAGE_LABELS = {
  provision_local_products: 'Synchronisation des produits',
  create: 'Création de la vente',
  add_items: 'Ajout des articles',
  payment: 'Enregistrement du paiement',
  close: 'Clôture de la vente',
};

export default function ErrorScreen({ error, onRetry, onCancel }) {
  const stage = error?.stage ? STAGE_LABELS[error.stage] || error.stage : null;
  const hbDetails = error?.hiboutik?.details;
  const detailsList =
    hbDetails && typeof hbDetails === 'object' && !Array.isArray(hbDetails)
      ? Object.entries(hbDetails).map(([k, v]) => `${k} : ${v}`)
      : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-red-50 via-white to-rose-50 flex flex-col items-center justify-center px-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="w-32 h-32 rounded-full bg-red-500 text-white flex items-center justify-center shadow-2xl shadow-red-500/40"
      >
        <AlertCircle size={72} />
      </motion.div>

      <h1 className="mt-8 text-5xl font-black text-gray-900 text-center">
        Oups, une erreur est survenue
      </h1>
      <p className="mt-4 text-xl text-gray-600 max-w-2xl text-center">
        {error?.message || 'Le paiement n’a pas pu être finalisé. Aucune somme n’a été débitée.'}
      </p>

      {(stage || error?.code || detailsList) && (
        <div className="mt-6 px-6 py-4 rounded-2xl bg-white border border-red-100 shadow-sm max-w-2xl w-full text-sm">
          {stage && (
            <p className="text-gray-700">
              <span className="font-bold">Étape :</span> {stage}
            </p>
          )}
          {error?.code && (
            <p className="text-gray-500 font-mono mt-1">
              <span className="font-bold not-italic">code :</span> {error.code}
            </p>
          )}
          {error?.hiboutik?.status && (
            <p className="text-gray-500 font-mono">
              <span className="font-bold">Boutididact HTTP :</span> {error.hiboutik.status}
            </p>
          )}
          {detailsList && detailsList.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-gray-700 space-y-0.5">
              {detailsList.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-10 flex gap-4">
        <button
          onClick={onRetry}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 active:scale-95 transition shadow-xl"
        >
          <RefreshCw size={22} />
          Réessayer
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold text-lg hover:bg-gray-50 active:scale-95 transition"
        >
          <Home size={22} />
          Retour à l’accueil
        </button>
      </div>
    </motion.div>
  );
}
