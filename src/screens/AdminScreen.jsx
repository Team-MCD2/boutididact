import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, X, RefreshCw, Maximize2, Power, Store, Printer, Database } from 'lucide-react';

const ADMIN_PIN = (import.meta.env.VITE_ADMIN_PIN || '1234').toString();

export default function AdminScreen({ health, onClose, onReload }) {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    if (pin === ADMIN_PIN) {
      setUnlocked(true);
      setError('');
    } else {
      setError('PIN incorrect');
      setTimeout(() => setError(''), 1500);
      setPin('');
    }
  };

  const press = (k) => {
    if (k === 'C') return setPin('');
    if (k === '<') return setPin((p) => p.slice(0, -1));
    if (pin.length >= 6) return;
    setPin((p) => p + k);
  };

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-700 text-white">
          <div className="flex items-center gap-3">
            <Lock size={22} />
            <h2 className="text-xl font-black">Panneau administrateur</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center"
          >
            <X size={22} />
          </button>
        </div>

        {!unlocked ? (
          <div className="p-8">
            <p className="text-center text-gray-600 mb-4">
              Saisissez le code PIN pour accéder aux paramètres.
            </p>
            <div className="flex justify-center gap-3 my-6" aria-label="PIN">
              {[0, 1, 2, 3, 4, 5].slice(0, Math.max(4, pin.length || 4)).map((i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full border-2 ${
                    i < pin.length ? 'bg-gray-900 border-gray-900' : 'border-gray-300'
                  }`}
                />
              ))}
            </div>
            {error && (
              <p className="text-center text-red-600 font-bold text-sm mb-3">{error}</p>
            )}
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '<'].map((k) => (
                <button
                  key={k}
                  onClick={() => press(k)}
                  className="py-5 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition text-2xl font-black text-gray-800"
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              onClick={submit}
              disabled={pin.length < 4}
              className="mt-5 w-full max-w-xs mx-auto block py-4 rounded-2xl bg-gray-900 text-white font-bold text-lg disabled:opacity-30"
            >
              Valider
            </button>
          </div>
        ) : (
          <div className="p-8 space-y-5">
            <Section title="État du système">
              <Status
                icon={<Database size={20} />}
                label="API Hiboutik"
                value={
                  health?.hiboutik?.reachable
                    ? `OK · compte ${health?.hiboutik?.account || ''}`
                    : health?.hiboutik?.configured
                      ? `Injoignable (${health?.hiboutik?.reason || 'erreur'})`
                      : 'Non configuré'
                }
                ok={health?.hiboutik?.reachable}
                warn={!health?.hiboutik?.reachable && health?.hiboutik?.configured}
              />
              <Status
                icon={<Printer size={20} />}
                label="Imprimante ESC/POS"
                value={
                  health?.printer
                    ? `${health.printer.ip}:${health.printer.port} — ${
                        health.printer.online ? 'en ligne' : 'hors ligne'
                      }`
                    : '—'
                }
                ok={health?.printer?.online}
              />
              <Status
                icon={<Store size={20} />}
                label="Commerce"
                value={health?.shop?.name || '—'}
                ok
              />
            </Section>

            <Section title="Actions">
              <div className="grid grid-cols-2 gap-3">
                <ActionButton icon={<RefreshCw size={18} />} label="Recharger le catalogue" onClick={onReload} />
                <ActionButton icon={<Maximize2 size={18} />} label="Plein écran" onClick={requestFullscreen} />
                <ActionButton
                  icon={<Power size={18} />}
                  label="Recharger l'application"
                  onClick={() => window.location.reload()}
                />
                <ActionButton icon={<X size={18} />} label="Fermer" onClick={onClose} variant="ghost" />
              </div>
            </Section>

            <p className="text-xs text-gray-400 text-center pt-2">
              v2.0 · BOUTIDIDACT borne · {new Date().toLocaleString('fr-FR')}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Status({ icon, label, value, ok, warn }) {
  const tone = ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : warn ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-red-50 border-red-200 text-red-800';
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${tone}`}>
      <div className="opacity-80">{icon}</div>
      <div className="flex-1">
        <div className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</div>
        <div className="font-bold">{value}</div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, variant = 'solid' }) {
  const cls =
    variant === 'ghost'
      ? 'bg-gray-50 hover:bg-gray-100 text-gray-700'
      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm active:scale-95 transition ${cls}`}
    >
      {icon}
      {label}
    </button>
  );
}
