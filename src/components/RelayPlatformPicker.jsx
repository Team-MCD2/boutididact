import React from 'react';
import { Monitor, Smartphone, Download, ExternalLink } from 'lucide-react';

const PLATFORMS = [
  {
    id: 'android',
    title: 'Android (recommandé)',
    desc: 'Téléphone en cuisine — sans PC',
    icon: Smartphone,
    accent: 'border-emerald-500 bg-emerald-50',
    download: '/downloads/Boutididact-Print-Server.apk',
    downloadLabel: 'Télécharger l\'APK',
    steps: [
      'Installez l\'APK sur le téléphone du magasin',
      'Même WiFi que l\'imprimante',
      'Nom boutique + IP + clé relais → Démarrer',
    ],
  },
  {
    id: 'ios',
    title: 'iPad / iPhone',
    desc: 'Relais web dans Safari',
    icon: Smartphone,
    accent: 'border-amber-500 bg-amber-50',
    href: '/relais',
    hrefLabel: 'Ouvrir le relais web',
    steps: [
      'Ouvrez /relais sur l\'iPad',
      'Même WiFi que l\'imprimante',
      'Laissez l\'onglet ouvert en cuisine',
    ],
  },
  {
    id: 'win',
    title: 'PC Windows',
    desc: 'Ordinateur branché au réseau boutique',
    icon: Monitor,
    accent: 'border-indigo-500 bg-indigo-50',
    download: '/downloads/Boutididact-Print-Server.exe',
    downloadLabel: 'Télécharger .exe',
    steps: [
      'Installez sur le PC du magasin',
      'Nom boutique + IP imprimante',
      'Laissez l\'application ouverte',
    ],
  },
];

export default function RelayPlatformPicker({ shopName, selected, onSelect, relayKey }) {
  const active = PLATFORMS.find((p) => p.id === selected) || PLATFORMS[0];

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-gray-600">
        Comment imprimez-vous ? Choisissez <strong>un</strong> appareil sur le même WiFi que l&apos;imprimante.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PLATFORMS.map((p) => {
          const Icon = p.icon;
          const isOn = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p.id)}
              className={`text-left p-4 rounded-2xl border-2 transition-all ${
                isOn ? `${p.accent} ring-2 ring-offset-1 ring-indigo-400` : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
            >
              <Icon size={22} className={isOn ? 'text-indigo-700' : 'text-gray-500'} />
              <p className="font-black text-gray-900 mt-2 text-sm">{p.title}</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{p.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">
          Étapes — {active.title}
        </p>
        <ol className="space-y-2">
          {active.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-gray-700 font-medium">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs font-black shrink-0">
                {i + 1}
              </span>
              {s.replace('Nom boutique', shopName ? `« ${shopName} »` : 'Nom boutique')}
            </li>
          ))}
        </ol>
        {active.download && (
          <a
            href={active.download}
            download
            className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700"
          >
            <Download size={18} />
            {active.downloadLabel}
          </a>
        )}
        {active.href && (
          <a
            href={active.href}
            className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 text-slate-950 rounded-xl font-black text-sm hover:bg-amber-600"
          >
            <ExternalLink size={18} />
            {active.hrefLabel}
          </a>
        )}
        {relayKey && (
          <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <strong>Clé relais (recommandée)</strong> — collez dans l&apos;app après installation :
            <code className="block mt-1 text-[10px] break-all">{relayKey}</code>
          </p>
        )}
      </div>
    </div>
  );
}
