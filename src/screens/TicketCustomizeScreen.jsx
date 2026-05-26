import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Save, Receipt, Eye, Lock, LayoutTemplate } from 'lucide-react';
import TicketBlockEditor from '../components/TicketBlockEditor';
import {
  DEFAULT_TICKET_TEMPLATE,
  mergeTicketTemplate,
  buildSampleTicket,
} from '../utils/ticketTemplate';
import {
  mergeTicketLayout,
  renderLayoutPreview,
} from '../utils/ticketLayout';

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

export default function TicketCustomizeScreen({ onBack }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('layout');
  const [shopFields, setShopFields] = useState({
    shopName: '',
    shopAddress: '',
    shopSiret: '',
    shopTva: '',
  });
  const [template, setTemplate] = useState({ ...DEFAULT_TICKET_TEMPLATE });
  const [layout, setLayout] = useState(() => mergeTicketLayout({}));
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinConfirm, setAdminPinConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

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

    setShopFields({
      shopName: settings.shopName || sess?.shopName || '',
      shopAddress: settings.shopAddress || '',
      shopSiret: settings.shopSiret || '',
      shopTva: settings.shopTva || '',
    });
    setTemplate(mergeTicketTemplate(settings));
    const mergedLayout = mergeTicketLayout(settings);
    setLayout(mergedLayout);
    setSelectedBlockId(mergedLayout.blocks[0]?.id || null);
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
        const l = mergeTicketLayout(cloud);
        setLayout(l);
        setSelectedBlockId(l.blocks[0]?.id || null);
      }
      if (cloud.adminPin) {
        setAdminPin(cloud.adminPin);
        setAdminPinConfirm(cloud.adminPin);
      }
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
            ticketLayout: data.ticketLayout,
          });
          return null;
        }
        return fetch(`${API}/api/saas/get-settings?${q}`).then((r2) => r2.json());
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

  const setBlocks = (blocks) => setLayout({ ...layout, blocks });

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
          headers: { 'Content-Type': 'application/json' },
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

      <div className="max-w-6xl mx-auto px-4 md:px-10 pt-4 flex gap-2 border-b border-slate-200">
        <TabBtn active={tab === 'layout'} onClick={() => setTab('layout')} icon={LayoutTemplate} label="Mise en page" />
        <TabBtn active={tab === 'options'} onClick={() => setTab('options')} icon={Lock} label="Options & PIN" />
      </div>

      <main className="max-w-6xl mx-auto p-4 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-6">
          {tab === 'layout' ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <TicketBlockEditor
                blocks={layout.blocks}
                setBlocks={setBlocks}
                selectedId={selectedBlockId}
                setSelectedId={setSelectedBlockId}
              />
            </div>
          ) : (
            <>
              <OptionsCard title="Code PIN admin" icon={Lock}>
                <Field label="Nouveau PIN" value={adminPin} onChange={setAdminPin} type="password" inputMode="numeric" />
                <Field label="Confirmer" value={adminPinConfirm} onChange={setAdminPinConfirm} type="password" inputMode="numeric" />
              </OptionsCard>
              <OptionsCard title="Infos commerce (sections ticket)">
                <Field label="Nom" value={shopFields.shopName} onChange={(v) => setShopFields({ ...shopFields, shopName: v })} />
                <Field label="Sous-titre" value={template.headerSubtitle} onChange={(v) => setTemplate({ ...template, headerSubtitle: v })} />
                <Field label="Adresse" value={shopFields.shopAddress} onChange={(v) => setShopFields({ ...shopFields, shopAddress: v })} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="SIRET" value={shopFields.shopSiret} onChange={(v) => setShopFields({ ...shopFields, shopSiret: v })} />
                  <Field label="TVA" value={shopFields.shopTva} onChange={(v) => setShopFields({ ...shopFields, shopTva: v })} />
                </div>
                <Toggle label="Afficher adresse" checked={template.showAddress} onChange={(v) => setTemplate({ ...template, showAddress: v })} />
                <Toggle label="Afficher SIRET" checked={template.showSiret} onChange={(v) => setTemplate({ ...template, showSiret: v })} />
                <Toggle label="Afficher TVA" checked={template.showTva} onChange={(v) => setTemplate({ ...template, showTva: v })} />
                <Toggle label="Détail TVA" checked={template.showTaxDetail} onChange={(v) => setTemplate({ ...template, showTaxDetail: v })} />
              </OptionsCard>
              <OptionsCard title="Pied de ticket">
                <Field label="Message de fin" value={template.footer} onChange={(v) => setTemplate({ ...template, footer: v })} multiline />
                <Field label="Mention légale" value={template.legalLine} onChange={(v) => setTemplate({ ...template, legalLine: v })} />
                <Toggle label="Date d'édition" checked={template.showEditedAt} onChange={(v) => setTemplate({ ...template, showEditedAt: v })} />
              </OptionsCard>
            </>
          )}
          {error && (
            <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-100 rounded-xl p-4">{error}</p>
          )}
        </section>

        <section className="lg:sticky lg:top-24 h-fit">
          <div className="flex items-center gap-2 mb-4 text-slate-600">
            <Eye size={18} />
            <span className="text-sm font-black uppercase tracking-widest">Aperçu en direct</span>
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
                if (el.kind === 'qrcode') {
                  return (
                    <div key={i} className="flex flex-col items-center my-3 gap-1">
                      <div className="w-24 h-24 bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-[8px] text-center p-1">
                        QR
                      </div>
                      <span className="text-[9px] text-slate-500 break-all text-center max-w-full">{el.label}</span>
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

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition ${
        active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function OptionsCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
        {Icon && <Icon size={16} className="text-amber-600" />}
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', inputMode, multiline }) {
  const cls = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-indigo-100';
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">{label}</span>
      {multiline ? (
        <textarea rows={3} className={cls} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} inputMode={inputMode} className={cls} value={value} onChange={(e) => onChange(e.target.value)} />
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
        <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </label>
  );
}
