import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { authHeaders } from '../services/authSession';

const API = import.meta.env.VITE_API_URL || '';

export default function PrintTestButton({ ip, port, isRelayMode, shopName, className = '' }) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const runTest = async () => {
    if (!isRelayMode && !ip?.trim()) {
      setResult({ ok: false, message: 'Saisissez l\'IP de l\'imprimante dans les réglages.' });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      if (isRelayMode) {
        if (!shopName) {
          setResult({ ok: false, message: 'Connectez-vous à la borne pour lancer le test.' });
          return;
        }
        const res = await fetch(`${API}/api/saas/test-print`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ shopName }),
        });
        const data = await res.json();
        if (data.ok) {
          setResult({
            ok: true,
            message:
              'Ticket test envoyé au cloud.\n\nSi l\'APK Boutididact Print est démarré (même WiFi que l\'imprimante), le ticket doit sortir sous 10 secondes.',
          });
        } else {
          setResult({ ok: false, message: data.message || data.error || 'Échec de l\'envoi du test.' });
        }
      } else {
        const res = await fetch(`${API}/api/health`, {
          headers: {
            'X-Printer-Ip': ip,
            'X-Printer-Port': port || '9100',
          },
        });
        const data = await res.json();
        if (data.printer?.online) {
          setResult({
            ok: true,
            message: `Imprimante joignable sur ${data.printer.ip}:${data.printer.port}.`,
          });
        } else {
          setResult({
            ok: false,
            message: `Imprimante injoignable sur ${data.printer?.ip || ip}:${data.printer?.port || port || 9100}. Activez le mode relais si vous êtes sur tablette.`,
          });
        }
      }
    } catch (e) {
      setResult({ ok: false, message: `Erreur réseau : ${e.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={runTest}
        disabled={testing}
        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition active:scale-95 ${
          testing
            ? 'bg-gray-200 text-gray-400'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
        }`}
      >
        <Printer size={18} />
        {testing ? 'Envoi du test…' : 'Imprimer un ticket test'}
      </button>
      {result && (
        <div
          className={`p-4 rounded-xl text-sm font-medium whitespace-pre-line leading-relaxed ${
            result.ok
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
