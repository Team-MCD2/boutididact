import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Receipt, Eye } from 'lucide-react';
import {
  DEFAULT_TICKET_TEMPLATE,
  mergeTicketTemplate,
  buildSampleTicket,
  buildTicketPreviewLines,
} from '../utils/ticketTemplate';

const API = import.meta.env.VITE_API_URL || '';
const SESSION_KEY = 'boutididact_session';
const SETTINGS_KEY = 'boutididact_settings';

export default function TicketCustomizeScreen({ onBack }) {
  const [session, setSession] = useState(null);
  const [shopFields, setShopFields] = useState({
    shopName: '',
    shopAddress: '',
    shopSiret: '',
    shopTva: '',
  });
  const [template, setTemplate] = useState({ ...DEFAULT_TICKET_TEMPLATE });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const sess = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      setSession(sess);
    } catch {
      setSession(null);
    }

    let settings = {};
    try {
      settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch { /* ignore */ }

    setShopFields({
      shopName: settings.shopName || sess?.shopName || '',
      shopAddress: settings.shopAddress || '',
      shopSiret: settings.shopSiret || '',
      shopTva: settings.shopTva || '',
    });
    setTemplate(mergeTicketTemplate(settings));

    if (sess?.shopId || sess?.shopName) {
      const q = sess.shopId
        ? `shopId=${encodeURIComponent(sess.shopId)}`
        : `shopName=${encodeURIComponent(sess.shopName)}`;
      const applyCloud = (cloud) => {
        if (!cloud) return;
        setShopFields({
          shopName: cloud.shopName || cloud.name || settings.shopName || sess.shopName || '',
          shopAddress: cloud.shopAddress || cloud.address || settings.shopAddress || '',
          shopSiret: cloud.shopSiret || cloud.siret || settings.shopSiret || '',
          shopTva: cloud.shopTva || cloud.tva || settings.shopTva || '',
        });
        setTemplate(mergeTicketTemplate(cloud));
      };

      fetch(`${API}/api/saas/ticket-template?${q}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok) {
            applyCloud({
              shopName: data.shop?.name,
              shopAddress: data.shop?.address,
              shopSiret: data.shop?.siret,
              shopTva: data.shop?.tva,
              ticketTemplate: data.ticketTemplate,
            });
            return;
          }
          return fetch(`${API}/api/saas/get-settings?${q}`).then((r2) => r2.json());
        })
        .then((fallback) => {
          if (fallback?.settings) applyCloud(fallback.settings);
        })
        .catch(() => { /* local only */ });
    }
  }, []);

  const previewTicket = useMemo(
    () =>
      buildSampleTicket({
        ...shopFields,
        ticketTemplate: template,
        shopFooter: template.footer,
      }),
    [shopFields, template],
  );

  const previewLines = useMemo(
    () => buildTicketPreviewLines(previewTicket),
    [previewTicket],
  );

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      let settings = {};
      try {
        settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      } catch { /* ignore */ }

      const next = {
        ...settings,
        ...shopFields,
        shopFooter: template.footer,
        ticketTemplate: { ...template },
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));

      if (session?.shopId || session?.shopName) {
        const res = await fetch(`${API}/api/saas/ticket-template`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopId: session.shopId,
            shopName: session.shopName,
            ticketTemplate: { ...template },
            shopFields: {
              shopName: next.shopName,
              shopAddress: next.shopAddress,
              shopSiret: next.shopSiret,
              shopTva: next.shopTva,
              shopFooter: template.footer,
            },
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || data.error || 'Erreur cloud');
        }
        const saveRes = await fetch(`${API}/api/saas/save-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shopId: session.shopId,
            shopName: session.shopName,
            settings: next,
            address: next.shopAddress,
            siret: next.shopSiret,
            tva: next.shopTva,
          }),
        });
        if (!saveRes.ok) {
          const data = await saveRes.json().catch(() => ({}));
          throw new Error(data.message || data.error || 'Erreur synchronisation réglages');
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message || 'Impossible d\'enregistrer');
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <p className="text-lg font-bold text-slate-800 mb-4">Connectez-vous pour personnaliser votre ticket.</p>
        <button
          type="button"
          onClick={() => { window.location.href = '/'; }}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 px-4 md:px-10 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 truncate flex items-center gap-2">
              <Receipt className="text-indigo-600 shrink-0" size={26} />
              Personnaliser le ticket
            </h1>
            <p className="text-xs text-slate-500 font-medium truncate">{session.shopName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-sm shrink-0"
        >
          <Save size={18} />
          {saving ? 'Enregistrement…' : saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">En-tête commerce</h2>
            <Field label="Nom affiché" value={shopFields.shopName} onChange={(v) => setShopFields({ ...shopFields, shopName: v })} />
            <Field label="Sous-titre (optionnel)" value={template.headerSubtitle} onChange={(v) => setTemplate({ ...template, headerSubtitle: v })} placeholder="ex: Restaurant — Snack" />
            <Field label="Adresse" value={shopFields.shopAddress} onChange={(v) => setShopFields({ ...shopFields, shopAddress: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="SIRET" value={shopFields.shopSiret} onChange={(v) => setShopFields({ ...shopFields, shopSiret: v })} />
              <Field label="N° TVA" value={shopFields.shopTva} onChange={(v) => setShopFields({ ...shopFields, shopTva: v })} />
            </div>
            <Toggle label="Afficher l'adresse" checked={template.showAddress} onChange={(v) => setTemplate({ ...template, showAddress: v })} />
            <Toggle label="Afficher le SIRET" checked={template.showSiret} onChange={(v) => setTemplate({ ...template, showSiret: v })} />
            <Toggle label="Afficher le n° TVA" checked={template.showTva} onChange={(v) => setTemplate({ ...template, showTva: v })} />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Corps & pied de ticket</h2>
            <Toggle label="Détail TVA sur le ticket" checked={template.showTaxDetail} onChange={(v) => setTemplate({ ...template, showTaxDetail: v })} />
            <Field
              label="Message de fin (pied de ticket)"
              value={template.footer}
              onChange={(v) => setTemplate({ ...template, footer: v })}
              placeholder="Merci de votre visite !"
              multiline
            />
            <Field
              label="Mention légale"
              value={template.legalLine}
              onChange={(v) => setTemplate({ ...template, legalLine: v })}
            />
            <Toggle label="Afficher la date d'édition" checked={template.showEditedAt} onChange={(v) => setTemplate({ ...template, showEditedAt: v })} />
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-100 rounded-xl p-4">{error}</p>
          )}
        </section>

        <section className="lg:sticky lg:top-24 h-fit">
          <div className="flex items-center gap-2 mb-4 text-slate-600">
            <Eye size={18} />
            <span className="text-sm font-black uppercase tracking-widest">Aperçu ticket thermique</span>
          </div>
          <motion.div
            layout
            className="bg-slate-900 rounded-2xl p-6 md:p-8 shadow-2xl"
          >
            <div className="bg-white text-slate-900 font-mono text-[11px] md:text-xs leading-relaxed p-5 md:p-6 rounded-sm shadow-inner max-w-[320px] mx-auto min-h-[420px]">
              {previewLines.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.cls === 'header'
                      ? 'font-black text-sm text-center mb-1'
                      : line.cls === 'subtitle'
                        ? 'text-center text-[10px] text-slate-600 mb-2'
                        : line.cls === 'total'
                          ? 'font-black text-right my-2'
                          : line.cls === 'footer'
                            ? 'text-center font-bold mt-2'
                            : line.cls === 'legal'
                              ? 'text-center text-[10px] text-slate-500'
                              : line.cls === 'line'
                                ? 'text-slate-400 my-1'
                                : line.cls === 'muted'
                                  ? 'text-slate-500'
                                  : line.cls === 'table-head'
                                    ? 'font-bold'
                                    : 'whitespace-pre'
                  }
                >
                  {line.text || '\u00A0'}
                </div>
              ))}
            </div>
            <p className="text-center text-slate-500 text-[10px] mt-4">Largeur 32 caractères — rendu proche de l&apos;imprimante</p>
          </motion.div>
        </section>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline }) {
  const cls =
    'w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400';
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">{label}</span>
      {multiline ? (
        <textarea rows={3} className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input type="text" className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-full transition relative ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-1 w-5 h-5 bg-white rounded-full transition ${checked ? 'left-6' : 'left-1'}`}
        />
      </button>
    </label>
  );
}
