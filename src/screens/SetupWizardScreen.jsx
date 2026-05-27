import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Store,
  Printer,
  Zap,
  CheckCircle,
  Copy,
  Key,
} from 'lucide-react';
import RelayPlatformPicker from '../components/RelayPlatformPicker';
import PrintTestButton from '../components/PrintTestButton';
import {
  loadSettings,
  isHiboutikConfigured,
  markWizardDone,
  saveSettingsLocalAndCloud,
} from '../utils/readiness';
import { getSession } from '../services/authSession';

const STEPS = [
  { id: 'hiboutik', title: 'Votre compte', icon: Store },
  { id: 'printer', title: 'Imprimante', icon: Printer },
  { id: 'relay', title: 'Relais', icon: Zap },
  { id: 'test', title: 'Test', icon: CheckCircle },
];

export default function SetupWizardScreen({ session, onComplete, onSkip }) {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState(() => {
    const s = loadSettings();
    return {
      hiboutikAccount: s.hiboutikAccount || '',
      hiboutikUser: s.hiboutikUser || '',
      hiboutikApiKey: s.hiboutikApiKey || '',
      hiboutikStoreId: s.hiboutikStoreId || '1',
      hiboutikVendorId: s.hiboutikVendorId || '1',
      printerIp: s.printerIp || '',
      printerPort: s.printerPort || '9100',
      isRelayMode: s.isRelayMode !== false,
      shopName: s.shopName || session?.shopName || '',
      ...s,
    };
  });
  const [relayPlatform, setRelayPlatform] = useState('android');
  const [saving, setSaving] = useState(false);
  const [keyMsg, setKeyMsg] = useState('');

  const relayKey = getSession()?.relaySecret || '';

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      await saveSettingsLocalAndCloud(settings, session);
    } finally {
      setSaving(false);
    }
  }, [settings, session]);

  const finish = async () => {
    await persist();
    markWizardDone(session?.shopId);
    onComplete?.();
  };

  const next = async () => {
    if (step === 0 && !isHiboutikConfigured(settings)) {
      alert('Renseignez le compte, l\'utilisateur API et la clé API (voir e-mail d\'accueil).');
      return;
    }
    if (step === 1 && !settings.printerIp?.trim()) {
      alert('Indiquez l\'IP de l\'imprimante (ex. 192.168.1.26).');
      return;
    }
    if (step < STEPS.length - 1) {
      await persist();
      setStep((s) => s + 1);
    } else {
      await finish();
    }
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  const copyKey = () => {
    if (!relayKey) return;
    navigator.clipboard?.writeText(relayKey);
    setKeyMsg('Clé copiée — collez-la dans l\'APK.');
    setTimeout(() => setKeyMsg(''), 4000);
  };

  const StepIcon = STEPS[step].icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="shrink-0 px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-800 text-white">
          <div>
            <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Première installation</p>
            <h2 className="text-xl font-black flex items-center gap-2 mt-1">
              <StepIcon size={22} />
              {STEPS[step].title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center"
            title="Passer pour l'instant"
          >
            <X size={22} />
          </button>
        </div>

        <div className="shrink-0 flex gap-1 px-6 pt-4">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
            >
              {step === 0 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    Identifiants Boutididact envoyés par e-mail lors de votre inscription.
                  </p>
                  <WizardField
                    label="Compte Boutididact"
                    value={settings.hiboutikAccount}
                    onChange={(v) =>
                      setSettings({
                        ...settings,
                        hiboutikAccount: v.trim().replace(/\.hiboutik\.com$/i, ''),
                      })
                    }
                    placeholder="ma-boutique"
                  />
                  <WizardField
                    label="Utilisateur API"
                    value={settings.hiboutikUser}
                    onChange={(v) => setSettings({ ...settings, hiboutikUser: v })}
                    placeholder="admin@mail.com"
                  />
                  <WizardField
                    label="Clé API"
                    type="password"
                    value={settings.hiboutikApiKey}
                    onChange={(v) => setSettings({ ...settings, hiboutikApiKey: v })}
                  />
                  <p className="text-xs text-gray-500 font-medium">
                    Besoin d&apos;aide ? Contactez le support Boutididact (réponse sous 24 h).
                  </p>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    L&apos;imprimante et le <strong>téléphone relais</strong> doivent être sur le{' '}
                    <strong>même WiFi</strong>. Port thermique habituel : 9100.
                  </p>
                  <WizardField
                    label="IP de l'imprimante"
                    value={settings.printerIp}
                    onChange={(v) => setSettings({ ...settings, printerIp: v.trim() })}
                    placeholder="192.168.1.26"
                  />
                  <WizardField
                    label="Port"
                    value={settings.printerPort}
                    onChange={(v) => setSettings({ ...settings, printerPort: v.trim() })}
                    placeholder="9100"
                  />
                  <div className="p-4 bg-indigo-50 rounded-2xl text-xs text-indigo-900 font-medium leading-relaxed">
                    Le mode relais cloud est activé : la borne envoie les tickets au cloud, l&apos;APK Android les imprime localement.
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  {relayKey && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-sm font-black text-slate-800">
                        <Key size={16} className="text-indigo-600" />
                        Code de sécurité relais (recommandé)
                      </div>
                      <code className="block text-[11px] break-all bg-white border rounded-lg p-2">
                        {relayKey}
                      </code>
                      <button
                        type="button"
                        onClick={copyKey}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-700"
                      >
                        <Copy size={14} /> Copier pour l&apos;APK
                      </button>
                      {keyMsg && <p className="text-xs text-emerald-700 font-medium">{keyMsg}</p>}
                    </div>
                  )}
                  <RelayPlatformPicker
                    shopName={session?.shopName}
                    selected={relayPlatform}
                    onSelect={setRelayPlatform}
                    relayKey={relayKey}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    Démarrez l&apos;APK (ou le relais choisi) puis lancez un ticket test. S&apos;il sort, vous êtes prêt à vendre.
                  </p>
                  <PrintTestButton
                    ip={settings.printerIp}
                    port={settings.printerPort}
                    isRelayMode={settings.isRelayMode !== false}
                    shopName={session?.shopName}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="shrink-0 p-6 border-t border-gray-100 flex gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={back}
              className="flex items-center justify-center gap-1 px-4 py-3 rounded-2xl border border-gray-200 font-bold text-gray-700"
            >
              <ChevronLeft size={18} /> Retour
            </button>
          ) : (
            <button
              type="button"
              onClick={onSkip}
              className="px-4 py-3 rounded-2xl text-sm font-bold text-gray-500"
            >
              Plus tard
            </button>
          )}
          <button
            type="button"
            onClick={next}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-900 text-white font-black disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : step === STEPS.length - 1 ? 'Terminer' : 'Continuer'}
            {step < STEPS.length - 1 && <ChevronRight size={18} />}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function WizardField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-black text-gray-500 uppercase tracking-wider">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-200"
      />
    </label>
  );
}
