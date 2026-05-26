import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Smartphone, Download, Info, ChevronLeft, Zap, CheckCircle, ExternalLink } from 'lucide-react';

export default function RelayGuideScreen({ onBack }) {
  const [platform, setPlatform] = useState('win'); // 'win', 'android', 'ios'

  const guides = {
    win: {
      title: 'Windows',
      icon: <Monitor size={24} />,
      link: '/downloads/Boutididact-Print-Server.exe',
      steps: [
        { t: 'Téléchargement', d: 'Téléchargez le fichier .exe sur l\'ordinateur relié à l\'imprimante.' },
        { t: 'Bypass Sécurité', d: 'Si Windows bloque l\'installation, cliquez sur "Informations complémentaires" puis "Exécuter quand même".' },
        { t: 'Configuration', d: 'Lancez l\'appli, entrez votre nom de boutique et l\'adresse IP locale de votre imprimante.' },
        { t: 'Actif', d: 'Laissez l\'application ouverte (ou réduite) pour que les tickets sortent.' }
      ]
    },
    android: {
      title: 'Android (APK)',
      icon: <Smartphone size={24} />,
      link: '/downloads/Boutididact-Print-Server.apk',
      altLink: '/relais',
      steps: [
        { t: 'Telecharger l\'APK', d: 'Installez Boutididact Print sur le telephone du magasin (bouton ci-dessous).' },
        { t: 'Autoriser l\'installation', d: 'Si Android bloque : Parametres > Securite > Autoriser les sources inconnues pour Chrome ou Fichiers.' },
        { t: 'Configuration', d: 'Nom boutique + IP imprimante + port 9100. Meme WiFi que l\'imprimante (ex: 192.168.1.26).' },
        { t: 'Demarrage', d: 'Demarrez le relais et laissez l\'application ouverte en cuisine (notification persistante).' },
      ],
    },
    ios: {
      title: 'iPhone / iPad',
      icon: <Smartphone size={24} />,
      link: '/relais',
      steps: [
        { t: 'Relais web', d: 'Ouvrez https://boutididactt.vercel.app/relais sur l\'iPad ou iPhone.' },
        { t: 'Configuration simple', d: 'Nom boutique, IP imprimante, port (9100 thermique / 8043 Epson).' },
        { t: 'Meme WiFi', d: 'Telephone et imprimante sur le meme reseau local.' },
        { t: 'Demarrage', d: 'Ajoutez a l\'ecran d\'accueil Safari, puis demarrez le relais.' }
      ]
    }
  };

  const g = guides[platform];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 text-slate-900 p-6 md:p-12 font-sans selection:bg-indigo-500/10">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-8 font-bold text-sm group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Retour
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-slate-900">Installation du <span className="text-indigo-650">Relais d'Impression</span></h1>
            <p className="text-slate-600 text-lg max-w-2xl font-medium leading-relaxed">
              Pour que vos tickets s'impriment automatiquement, vous devez installer notre petit logiciel de relais sur un appareil connecté à votre réseau local.
            </p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 px-4 py-2 rounded-full flex items-center gap-2 h-fit shrink-0">
            <Zap size={16} className="text-indigo-600" />
            <span className="text-xs font-black uppercase tracking-widest text-indigo-700">Indispensable pour l'auto-print</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex p-1.5 bg-white border border-slate-200 rounded-2xl mb-8 w-fit shadow-sm">
          {Object.keys(guides).map(p => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-black transition-all ${
                platform === p ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {guides[p].icon} {guides[p].title}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <motion.div 
            key={platform}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            {g.steps.map((s, i) => (
              <div key={i} className="flex gap-6 group">
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-sm font-black text-slate-500 group-hover:border-indigo-500 group-hover:text-indigo-650 transition-all shadow-sm">
                  {i + 1}
                </div>
                <div className="pt-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{s.t}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm font-medium">{s.d}</p>
                </div>
              </div>
            ))}

            {g.link && (
              g.link.startsWith('/relais') ? (
                <a 
                  href={g.link}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-amber-500/15"
                >
                  <ExternalLink size={20} /> Ouvrir le Relais Web
                </a>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <a 
                    href={g.link} download
                    className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-750 text-white font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-600/15"
                  >
                    <Download size={20} /> Telecharger l&apos;APK
                  </a>
                  {g.altLink && (
                    <a 
                      href={g.altLink}
                      className="inline-flex items-center gap-3 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-95 border border-slate-200"
                    >
                      <ExternalLink size={20} /> Relais web (alternative)
                    </a>
                  )}
                </div>
              )
            )}
          </motion.div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 sticky top-12 shadow-sm">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Pourquoi c'est important ?</h4>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="p-2 h-fit bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600"><CheckCircle size={20} /></div>
                <p className="text-sm text-slate-600 leading-relaxed"><span className="text-slate-900 font-extrabold">Impression Instantanée :</span> Vos tickets sortent dès que le client a fini de commander.</p>
              </div>
              <div className="flex gap-4">
                <div className="p-2 h-fit bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600"><CheckCircle size={20} /></div>
                <p className="text-sm text-slate-600 leading-relaxed"><span className="text-slate-900 font-extrabold">Zéro Configuration :</span> Une fois l'IP de l'imprimante saisie, tout est automatisé.</p>
              </div>
              <div className="flex gap-4">
                <div className="p-2 h-fit bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600"><CheckCircle size={20} /></div>
                <p className="text-sm text-slate-600 leading-relaxed"><span className="text-slate-900 font-extrabold">Mode Relais :</span> Le logiciel fait le pont entre le Cloud et votre imprimante locale.</p>
              </div>
            </div>

            <div className="mt-10 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
              <Info size={24} className="text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                Si vous rencontrez une alerte de sécurité lors de l'installation, ne vous inquiétez pas. Nos logiciels sont auto-signés, c'est pourquoi les systèmes demandent une confirmation manuelle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
