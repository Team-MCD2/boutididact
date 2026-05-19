import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Play, Square, Info, Wifi, 
  Volume2, VolumeX, Printer, Terminal, Sparkles
} from 'lucide-react';

const CLOUD_URL = 'https://boutididact-backendd.vercel.app';
const POLL_INTERVAL_MS = 5000;

export default function WebRelayScreen({ onBack }) {
  const [shopName, setShopName] = useState(() => localStorage.getItem('boutididact_webrelay_shopName') || '');
  const [printerIp, setPrinterIp] = useState(() => localStorage.getItem('boutididact_webrelay_printerIp') || '192.168.1.100');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);

  const wakeLockRef = useRef(null);
  const isRunningRef = useRef(isRunning);
  const shopNameRef = useRef(shopName);
  const printerIpRef = useRef(printerIp);
  const soundEnabledRef = useRef(soundEnabled);

  // Sync refs to avoid stale closures in the poll interval
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { shopNameRef.current = shopName; }, [shopName]);
  useEffect(() => { printerIpRef.current = printerIp; }, [printerIp]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);


  // Save settings on changes
  useEffect(() => {
    localStorage.setItem('boutididact_webrelay_shopName', shopName);
  }, [shopName]);

  useEffect(() => {
    localStorage.setItem('boutididact_webrelay_printerIp', printerIp);
  }, [printerIp]);

  // Request Wake Lock to keep screen on (perfect for iOS/iPad)
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
        addLog("Anti-veille iOS/Safari activé avec succès.");
      } catch (err) {
        console.warn("Wake Lock failed:", err);
        setWakeLockActive(false);
      }
    } else {
      setWakeLockActive(false);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockActive(false);
        addLog("Anti-veille désactivé.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Re-request wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isRunning]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  };

  // Web Audio Synth Chime for iOS (does not need external file permissions)
  const playChime = () => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Beep 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0.08, ctx.currentTime);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.12);
      
      // Beep 2
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.08, ctx.currentTime);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.22);
      }, 120);
    } catch (e) {
      console.warn("Audio play failed (waiting for user interaction):", e);
    }
  };

  // The Main Web Polling Loop
  useEffect(() => {
    let intervalId = null;

    const poll = async () => {
      if (!isRunningRef.current) return;
      const currentShop = shopNameRef.current.trim();
      if (!currentShop) return;

      try {
        const url = `${CLOUD_URL}/api/saas/poll-ticket?shopName=${encodeURIComponent(currentShop)}`;
        const res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
        if (!res.ok) {
          if (res.status === 404) {
            addLog("Boutique inconnue sur le serveur.");
            setIsRunning(false);
          }
          return;
        }

        const data = await res.json();
        if (data && data.ticket) {
          addLog(`🎟️ TICKET REÇU : ID ${data.ticket.ticketId || 'Inconnu'}`);
          setCurrentTicket(data.ticket);
          playChime();
          
          // Print Action (Epson IP direct)
          sendEposPrint(data.ticket);
        }
      } catch (err) {
        addLog(`Erreur connexion serveur : ${err.message}`);
      }
    };

    if (isRunning) {
      addLog(`Démarrage du relais web pour "${shopName}"...`);
      requestWakeLock();
      poll(); // Immediate run
      intervalId = setInterval(poll, POLL_INTERVAL_MS);
    } else {
      releaseWakeLock();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning]);

  // Epson ePOS SOAP XML direct printing
  const sendEposPrint = async (ticket) => {
    const ip = printerIpRef.current.trim();
    addLog(`Envoi ePOS-Print direct à l'adresse IP ${ip}...`);
    
    // Construct EPSON ePOS XML print request
    let xml = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
<soapenv:Body>
<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
<text lang="fr"/>
<align align="center"/>
<text font="font_a" width="2" height="2">BOUTIDIDACT\n</text>
<text font="font_a">--------------------------------\n</text>
<text font="font_a">TICKET CLIENT\nID: ${ticket.ticketId}\n</text>
<text font="font_a">--------------------------------\n</text>
<align align="left"/>`;

    ticket.items.forEach(it => {
      xml += `<text font="font_a">${it.quantity}x ${it.name.padEnd(20)} ${(it.price * it.quantity).toFixed(2)}€\n</text>`;
    });

    xml += `<align align="center"/>
<text font="font_a">--------------------------------\n</text>
<text font="font_a" width="2" height="2">TOTAL: ${ticket.total.toFixed(2)}€\n</text>
<text font="font_a">Mode: ${ticket.payment || 'CB'}\n</text>
<text font="font_a">--------------------------------\n</text>
<cut type="feed"/>
</epos-print>
</soapenv:Body>
</soapenv:Envelope>`;

    try {
      const response = await fetch(`http://${ip}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=5000`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'SOAPAction': '""'
        },
        body: xml
      });
      if (response.ok) {
        addLog("Impression ePOS Epson réussie !");
      } else {
        addLog(`Erreur Epson ePOS : statut HTTP ${response.status}`);
      }
    } catch (err) {
      addLog(`Échec connexion ePOS (Vérifiez l'adresse IP et CORS) : ${err.message}`);
    }
  };

  const toggleService = async () => {
    if (!shopName.trim()) {
      alert("Veuillez renseigner le nom de la boutique.");
      return;
    }

    if (isRunning) {
      setIsRunning(false);
      addLog("Relais ARRETÉ");
    } else {
      addLog(`Vérification de la boutique "${shopName.trim()}"...`);
      try {
        const url = `${CLOUD_URL}/api/saas/check-shop?shopName=${encodeURIComponent(shopName.trim())}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (!res.ok || !data.ok) {
          addLog(`❌ Erreur : ${data.message || 'Boutique introuvable ou inactive.'}`);
          return;
        }

        const validName = data.name || shopName.trim();
        setShopName(validName);
        addLog(`✅ Boutique "${validName}" validée et connectée avec succès.`);
        setIsRunning(true);
      } catch (err) {
        addLog(`❌ Erreur réseau lors de la vérification : ${err.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-amber-500/10">
      
      {/* HEADER BAR */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors font-bold text-sm"
        >
          <ChevronLeft size={20} /> Retour Borne
        </button>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-black text-amber-500 uppercase tracking-widest">
          <Sparkles size={12} /> Solution iOS & iPad
        </div>
      </header>

      {/* DASHBOARD LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid lg:grid-cols-3 gap-6">
        
        {/* PANEL LEFT: CONTROLS */}
        <section className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col shadow-xl">
            <h2 className="text-xl font-black mb-6 text-slate-100">Configuration</h2>
            
            <div className="space-y-5 flex-1">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nom de la boutique</label>
                <input 
                  type="text" 
                  value={shopName} 
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="ex: Restaurant Le Gourmet"
                  disabled={isRunning}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Mode de fonctionnement</label>
                <div className="flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-black text-amber-500">
                  <Wifi size={18} />
                  <span>IMPRIMANTE EPSON IP DIRECTE</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Adresse IP Imprimante Epson</label>
                <input 
                  type="text" 
                  value={printerIp} 
                  onChange={(e) => setPrinterIp(e.target.value)}
                  placeholder="192.168.1.100"
                  disabled={isRunning}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-4">
                <span className="text-sm font-bold text-slate-300">Alerte sonore cuisine</span>
                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-2.5 rounded-xl border transition-all ${
                    soundEnabled ? 'border-amber-500/20 bg-amber-500/5 text-amber-500' : 'border-slate-800 text-slate-500'
                  }`}
                >
                  {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex gap-3">
                <Info size={20} className="text-amber-500 shrink-0" />
                <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                  <strong>Anti-mise en veille :</strong> Tant que ce relais web est actif, l'écran de votre iPad restera allumé automatiquement.
                </p>
              </div>
            </div>

            <button 
              onClick={toggleService}
              className={`w-full py-4 rounded-2xl font-black mt-6 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
                isRunning 
                  ? 'bg-red-500 hover:bg-red-650 text-white shadow-red-500/10' 
                  : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/10'
              }`}
            >
              {isRunning ? (
                <>
                  <Square size={20} fill="currentColor" />
                  Arrêter le relais
                </>
              ) : (
                <>
                  <Play size={20} fill="currentColor" />
                  Démarrer le relais
                </>
              )}
            </button>
          </div>
        </section>

        {/* PANEL MIDDLE: KITCHEN DISPLAY SYSTEM */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          
          {/* STATS STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Statut</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm font-black">{isRunning ? 'ACTIF (EN LIGNE)' : 'INACTIF'}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Anti-Veille iOS</span>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${wakeLockActive ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                <span className="text-sm font-black">{wakeLockActive ? 'VIGILANT' : 'ÉCO'}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col shadow-sm col-span-2 md:col-span-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">Dernier ticket</span>
              <span className="text-sm font-black truncate">{currentTicket ? `ID: ${currentTicket.ticketId}` : 'Aucun'}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex-1 flex flex-col shadow-xl">
            <h2 className="text-xl font-black mb-6 text-slate-100 flex items-center justify-between">
              <span>Aperçu du dernier ticket reçu</span>
            </h2>

            {/* TICKET DISPLAY AREA */}
            <div className="flex-1 flex items-center justify-center p-4">
              <AnimatePresence mode="wait">
                {currentTicket ? (
                  <motion.div 
                    key={currentTicket.ticketId}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-white text-slate-950 p-6 rounded-3xl shadow-2xl relative border-2 border-amber-500/30"
                  >
                    <div className="border-b-2 border-dashed border-slate-200 pb-4 mb-4 text-center">
                      <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Boutididact Ticket</h3>
                      <p className="text-xs text-slate-500 font-bold mt-1">ID Unique : {currentTicket.ticketId}</p>
                    </div>

                    <div className="space-y-4">
                      {currentTicket.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center">{it.quantity}</span>
                            <span className="font-extrabold text-sm text-slate-800">{it.name}</span>
                          </div>
                          <span className="font-bold text-sm text-slate-600">{(it.price * it.quantity).toFixed(2)} €</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t-2 border-dashed border-slate-200 pt-4 mt-6 space-y-2">
                      <div className="flex justify-between font-black text-lg text-slate-900">
                        <span>TOTAL</span>
                        <span>{currentTicket.total.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 font-extrabold uppercase tracking-wider">
                        <span>Paiement</span>
                        <span>{currentTicket.payment || 'Carte Bancaire'}</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center mx-auto text-slate-700">
                      <Printer size={32} />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">En attente de tickets de commande...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* TERMINAL LOGS */}
            <div className="border-t border-slate-800 pt-6 mt-6 flex flex-col h-44">
              <div className="flex items-center gap-2 mb-3 text-slate-400">
                <Terminal size={14} />
                <span className="text-xs font-black uppercase tracking-widest">Journal des actions (Relais)</span>
              </div>
              <div className="flex-1 bg-slate-950 rounded-2xl p-4 font-mono text-[10px] overflow-y-auto space-y-1.5 border border-slate-800 text-emerald-500 selection:bg-emerald-500/10">
                {logs.length === 0 ? (
                  <div className="text-slate-700 italic">Prêt. Appuyez sur démarrer...</div>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed">{log}</div>
                  ))
                )}
              </div>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
