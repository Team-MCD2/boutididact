import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save, Receipt, Eye, Lock, ChevronDown, ChevronUp, ImagePlus } from 'lucide-react';
import {
  DEFAULT_TICKET_TEMPLATE,
  mergeTicketTemplate,
  buildSampleTicket,
} from '../utils/ticketTemplate';
import { mergeTicketLayout, renderLayoutPreview } from '../utils/ticketLayout';
import {
  blocksFromSettings,
  syncBlocksWithForm,
  buildLayoutFromBlocks,
} from '../utils/simpleTicketLayout';
import { DEFAULT_TICKET_BLOCKS } from '../utils/ticketLayout';
import TicketSectionsPanel from '../components/TicketSectionsPanel';
import { authHeaders } from '../services/authSession';

const API = import.meta.env.VITE_API_URL || '';
const SESSION_KEY = 'boutididact_session';
const SETTINGS_KEY = 'boutididact_settings';

function getAdminPin() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (s.adminPin) return s.adminPin;
  } catch { /* ignore */ }
  return localStorage.getItem('boutididact_admin_pin') || '0000';
}

function readLogoFromLayout(layout) {
  const logo = layout?.blocks?.find((b) => b.type === 'logo');
  return logo?.logoData || '';
}

export default function TicketCustomizeScreen({ onBack }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [logoData, setLogoData] = useState('');
  const [shopFields, setShopFields] = useState({
    shopName: '',
    shopAddress: '',
    shopSiret: '',
    shopTva: '',
  });
  const [template, setTemplate] = useState({ ...DEFAULT_TICKET_TEMPLATE });
  const [blocks, setBlocks] = useState(() => DEFAULT_TICKET_BLOCKS.map((b) => ({ ...b })));
  const [adminPin, setAdminPin] = useState('');
  const [adminPinConfirm, setAdminPinConfirm] = useState('');
  const [showPinSection, setShowPinSection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const layout = useMemo(
    () => buildLayoutFromBlocks(syncBlocksWithForm(blocks, { logoData, template })),
    [blocks, logoData, template],
  );

  useEffect(() => {
    let sess = null;
    try {
      sess = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      sess = null;
    }
    setSession(sess);

    let settings = {};
    try {
      settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch { /* ignore */ }

    const mergedLayout = mergeTicketLayout(settings);
    setShopFields({
      shopName: settings.shopName || sess?.shopName || '',
      shopAddress: settings.shopAddress || '',
      shopSiret: settings.shopSiret || '',
      shopTva: settings.shopTva || '',
    });
    setTemplate(mergeTicketTemplate(settings));
    setBlocks(blocksFromSettings(settings));
    setLogoData(readLogoFromLayout(mergedLayout));
    setAdminPin(settings.adminPin || getAdminPin());
    setAdminPinConfirm(settings.adminPin || getAdminPin());
    setReady(true);

    if (!sess?.shopId && !sess?.shopName) return;

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
      if (cloud.ticketLayout) {
        const cloudLayout = mergeTicketLayout(cloud);
        setBlocks(cloudLayout.blocks);
        setLogoData(readLogoFromLayout(cloudLayout));
      }
      if (cloud.adminPin) {
        setAdminPin(cloud.adminPin);
        setAdminPinConfirm(cloud.adminPin);
      }
    };

    fetch(`${API}/api/saas/ticket-template?${q}`, { headers: authHeaders({ Accept: 'application/json' }) })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          applyCloud({
            shopName: data.shop?.name,
            shopAddress: data.shop?.address,
            shopSiret: data.shop?.siret,
            shopTva: data.shop?.tva,
            ticketTemplate: data.ticketTemplate,
            ticketLayout: data.ticketLayout,
          });
          return null;
        }
        return fetch(`${API}/api/saas/get-settings?${q}`, { headers: authHeaders({ Accept: 'application/json' }) }).then((r2) => r2.json());
      })
      .then((fallback) => {
        if (fallback?.settings) applyCloud(fallback.settings);
      })
      .catch(() => { /* local */ });
  }, []);

  const previewTicket = useMemo(
    () =>
      buildSampleTicket({
        ...shopFields,
        ticketTemplate: template,
        ticketLayout: layout,
        shopFooter: template.footer,
      }),
    [shopFields, template, layout],
  );

  const previewElements = useMemo(
    () => renderLayoutPreview(previewTicket, layout),
    [previewTicket, layout],
  );

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 80000) {
      setError('Image trop lourde. Choisissez un logo simple (moins de 80 Ko).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoData(reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);

    const pin = String(adminPin || '').trim();
    const pinConfirm = String(adminPinConfirm || '').trim();
    if (pin.length < 4) {
      setError('Le code PIN doit contenir au moins 4 chiffres.');
      setSaving(false);
      return;
    }
    if (pin === '0000') {
      setError('Le code PIN 0000 est interdit.');
      setSaving(false);
      return;
    }
    if (pin !== pinConfirm) {
      setError('Les deux codes PIN ne correspondent pas.');
      setSaving(false);
      return;
    }

    try {
      let settings = {};
      try {
        settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      } catch { /* ignore */ }

      const next = {
        ...settings,
        ...shopFields,
        adminPin: pin,
        shopFooter: template.footer,
        ticketTemplate: { ...template },
        ticketLayout: layout,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      localStorage.setItem('boutididact_admin_pin', pin);

      if (session?.shopId || session?.shopName) {
        const res = await fetch(`${API}/api/saas/ticket-template`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            shopId: session.shopId,
            shopName: session.shopName,
            ticketTemplate: { ...template },
            ticketLayout: layout,
            shopFields: {
              shopName: next.shopName,
              shopAddress: next.shopAddress,
              shopSiret: next.shopSiret,
              shopTva: next.shopTva,
              shopFooter: template.footer,
            },
          }),
        });
        const putData = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(putData.message || putData.error || 'Erreur cloud');
        }
        if (putData.warning === 'logo_too_large_for_cloud') {
          setError('Logo trop volumineux pour le cloud. Réduisez l\'image (noir et blanc, petit format).');
        }

        const saveRes = await fetch(`${API}/api/saas/save-settings`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            shopId: session.shopId,
            shopName: session.shopName,
            settings: next,
          }),
        });
        if (!saveRes.ok) {
          const data = await saveRes.json().catch(() => ({}));
          throw new Error(data.message || data.error || 'Erreur synchronisation');
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

  if (!ready) {
    return (
      <div className="min-h-dvh bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600 font-medium">Chargement…</p>
      </div>
    );
  }

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
          >
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 truncate flex items-center gap-2">
              <Receipt className="text-indigo-600 shrink-0" size={26} />
              Votre ticket de caisse
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

      <p className="max-w-6xl mx-auto px-4 md:px-10 pt-4 text-sm text-slate-600">
        Remplissez les champs ci-dessous. L&apos;aperçu à droite se met à jour automatiquement.
      </p>

      <main className="max-w-6xl mx-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-5">
          <Section title="Logo (facultatif)">
            <div className="flex flex-wrap items-center gap-4">
              {logoData ? (
                <img src={logoData} alt="Logo" className="h-16 object-contain border border-slate-200 rounded-lg p-2 bg-white" />
              ) : (
                <div className="h-16 w-24 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                  Aucun logo
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold cursor-pointer hover:bg-indigo-700">
                <ImagePlus size={18} />
                {logoData ? 'Changer le logo' : 'Ajouter un logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
              </label>
              {logoData && (
                <button
                  type="button"
                  onClick={() => setLogoData('')}
                  className="text-sm text-red-600 font-medium hover:underline"
                >
                  Retirer
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">PNG ou JPG, fond clair de préférence.</p>
          </Section>

          <Section title="Votre commerce">
            <Field label="Nom affiché sur le ticket" value={shopFields.shopName} onChange={(v) => setShopFields({ ...shopFields, shopName: v })} />
            <Field label="Sous-titre (facultatif)" value={template.headerSubtitle} onChange={(v) => setTemplate({ ...template, headerSubtitle: v })} placeholder="Ex : Boulangerie artisanale" />
            <Field label="Adresse" value={shopFields.shopAddress} onChange={(v) => setShopFields({ ...shopFields, shopAddress: v })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="SIRET" value={shopFields.shopSiret} onChange={(v) => setShopFields({ ...shopFields, shopSiret: v })} />
              <Field label="N° TVA" value={shopFields.shopTva} onChange={(v) => setShopFields({ ...shopFields, shopTva: v })} />
            </div>
            <div className="pt-2 space-y-2 border-t border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Afficher sur le ticket</p>
              <Toggle label="Adresse" checked={template.showAddress !== false} onChange={(v) => setTemplate({ ...template, showAddress: v })} />
              <Toggle label="SIRET" checked={template.showSiret !== false} onChange={(v) => setTemplate({ ...template, showSiret: v })} />
              <Toggle label="N° TVA" checked={template.showTva !== false} onChange={(v) => setTemplate({ ...template, showTva: v })} />
              <Toggle label="Détail TVA" checked={template.showTaxDetail !== false} onChange={(v) => setTemplate({ ...template, showTaxDetail: v })} />
            </div>
          </Section>

          <Section title="Sections du ticket">
            <TicketSectionsPanel blocks={blocks} setBlocks={setBlocks} />
          </Section>

          <Section title="Message de fin">
            <Field
              label="Texte en bas du ticket"
              value={template.footer}
              onChange={(v) => setTemplate({ ...template, footer: v })}
              multiline
              placeholder="Merci de votre visite !"
            />
            <Field
              label="Mention légale"
              value={template.legalLine}
              onChange={(v) => setTemplate({ ...template, legalLine: v })}
              placeholder="Ticket non valable comme facture"
            />
          </Section>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPinSection(!showPinSection)}
              className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 text-sm font-black text-slate-700">
                <Lock size={16} className="text-amber-600" />
                Code PIN administrateur
              </span>
              {showPinSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {showPinSection && (
              <div className="px-6 pb-6 space-y-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 pt-3">
                  Ce code protège les paramètres de la borne (4 chiffres minimum).
                </p>
                <Field label="Nouveau PIN" value={adminPin} onChange={setAdminPin} type="password" inputMode="numeric" />
                <Field label="Confirmer le PIN" value={adminPinConfirm} onChange={setAdminPinConfirm} type="password" inputMode="numeric" />
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-100 rounded-xl p-4">{error}</p>
          )}
        </section>

        <section className="lg:sticky lg:top-24 h-fit">
          <div className="flex items-center gap-2 mb-4 text-slate-600">
            <Eye size={18} />
            <span className="text-sm font-black uppercase tracking-widest">Aperçu</span>
          </div>
          <div className="bg-slate-900 rounded-2xl p-6 md:p-8 shadow-2xl">
            <div className="bg-white text-slate-900 font-mono text-[11px] md:text-xs leading-relaxed p-5 md:p-6 rounded-sm shadow-inner max-w-[320px] mx-auto min-h-[420px]">
              {previewElements.map((el, i) => {
                if (el.kind === 'image') {
                  return (
                    <div key={i} className="flex justify-center my-2">
                      <img src={el.src} alt={el.alt} className="max-h-16 object-contain" />
                    </div>
                  );
                }
                return (
                  <div
                    key={i}
                    className={
                      el.cls === 'header' ? 'font-black text-sm text-center mb-1'
                        : el.cls === 'subtitle' ? 'text-center text-[10px] text-slate-600 mb-2'
                          : el.cls === 'total' ? 'font-black text-right my-2'
                            : el.cls === 'footer' ? 'text-center font-bold mt-2'
                              : el.cls === 'legal' ? 'text-center text-[10px] text-slate-500'
                                : el.cls === 'line' ? 'text-slate-400 my-1'
                                  : el.cls === 'muted' ? 'text-slate-500'
                                    : el.cls === 'table-head' ? 'font-bold'
                                      : 'whitespace-pre'
                    }
                  >
                    {el.text || '\u00A0'}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      <h2 className="text-base font-black text-slate-800">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', inputMode, multiline, placeholder }) {
  const cls = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-indigo-100';
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 mb-1.5 block">{label}</span>
      {multiline ? (
        <textarea rows={2} className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input type={type} inputMode={inputMode} className={cls} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 py-1.5 cursor-pointer">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition relative shrink-0 ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </label>
  );
}
