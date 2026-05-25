import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Play, Square, Info, Volume2, VolumeX,
  Printer, Terminal, Sparkles, Bell,
} from 'lucide-react';
import {
  POLL_INTERVAL_MS,
  loadRelayState,
  saveRelayState,
  runRelayLoop,
  registerRelayServiceWorker,
  syncRelayToServiceWorker,
  showRelayNotification,
} from '../utils/relayEngine';

export default function WebRelayScreen({ onBack }) {
  const initial = loadRelayState();
  const [shopName, setShopName] = useState(initial.shopName);
  const [printerIp, setPrinterIp] = useState(initial.printerIp);
  const [printerPort, setPrinterPort] = useState(initial.printerPort || '9100');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [bgActive, setBgActive] = useState(false);
  const [notifOk, setNotifOk] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const [currentTicket, setCurrentTicket] = useState(null);

  const wakeLockRef = useRef(null);
  const abortRef = useRef(null);
  const resolvedBridgeRef = useRef({ current: '' });
  const lastHandledTicketIdRef = useRef(null);
  const lastFailedTicketRef = useRef({ id: null, at: 0 });
  const soundEnabledRef = useRef(soundEnabled);
  const configRef = useRef({ shopName, printerIp, printerPort, active: false });

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  useEffect(() => {
    configRef.current = { shopName, printerIp, printerPort, active: isRunning };
    saveRelayState({ shopName, printerIp, printerPort, active: isRunning });
    syncRelayToServiceWorker(configRef.current);
  }, [shopName, printerIp, printerPort, isRunning]);

  const addLog = useCallback((msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 60));
  }, []);

  useEffect(() => {
    registerRelayServiceWorker().then((reg) => {
      if (reg) addLog('Service Worker relais enregistre (PWA).');
    });
  }, [addLog]);

  const requestWakeLock = async () => {
    if (!('wakeLock' in navigator)) { setWakeLockActive(false); return; }
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setWakeLockActive(true);
    } catch { setWakeLockActive(false); }
  };

  const releaseWakeLock = async () => {
    if (!wakeLockRef.current) return;
    try {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockActive(false);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isRunning) requestWakeLock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      releaseWakeLock();
    };
  }, [isRunning]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMsg = (e) => {
      if (e.data?.type === 'TICKET') {
        const ticket = e.data.ticket;
        setCurrentTicket(ticket);
        addLog(`🎟️ TICKET (SW) : ${ticket.ticketId}`);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, [addLog]);

  const playChime = () => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* ignore */ }
  };

  const testPrinter = async () => {
    resolvedBridgeRef.current = { current: '' };
    const { printTicket, discoverLanBridge } = await import('../utils/relayEngine');
    addLog('Recherche du pont WiFi local...');
    const bridge = await discoverLanBridge(printerIp, configRef.current.bridgeUrl || '');
    if (bridge) {
      resolvedBridgeRef.current.current = bridge;
      addLog(`Pont trouve : ${bridge}`);
    } else {
      addLog('Aucun pont local — lancez print-server sur un PC du WiFi.');
    }
    const result = await printTicket(
      { ticketId: 'TEST', total: 0, payment: 'TEST', items: [{ name: 'Test', quantity: 1, price: 0 }] },
      configRef.current,
      resolvedBridgeRef.current,
    );
    addLog(result.ok ? `✅ Test OK (${result.method})` : `❌ Test : ${result.detail || result.reason}`);
  };

  const requestNotif = async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setNotifOk(p === 'granted');
    if (p === 'granted') addLog('Notifications autorisees — relais arriere-plan actif.');
  };

  useEffect(() => {
    if (!isRunning) {
      abortRef.current?.abort();
      abortRef.current = null;
      releaseWakeLock();
      setBgActive(false);
      showRelayNotification(shopName, false);
      return undefined;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    const config = { ...configRef.current, active: true };

    addLog(`Relais actif — ${printerIp}:${printerPort}`);
    import('../utils/relayEngine').then(({ discoverLanBridge }) => {
      discoverLanBridge(printerIp, configRef.current.bridgeUrl || '').then((bridge) => {
        if (bridge) {
          resolvedBridgeRef.current.current = bridge;
          addLog(`Pont WiFi detecte : ${bridge}`);
        } else {
          addLog('Pont WiFi absent — demarrez print-server sur le PC du magasin.');
        }
      });
    });
    addLog('Installez en PWA (ecran accueil) pour l\'arriere-plan.');
    requestWakeLock();
    showRelayNotification(shopName, true);

    const handlers = {
      resolvedBridgeRef: resolvedBridgeRef.current,
      onBackgroundReady: () => {
        setBgActive(true);
        addLog('Arriere-plan actif (Web Lock) — vous pouvez changer d\'app.');
      },
      onTicket: (ticket) => {
        const tid = ticket.ticketId || 'Inconnu';
        if (lastHandledTicketIdRef.current === tid) return;
        const failed = lastFailedTicketRef.current;
        if (failed.id === tid && Date.now() - failed.at < 15000) return;

        addLog(`🎟️ TICKET REÇU : ID ${tid}`);
        setCurrentTicket(ticket);
        playChime();
      },
      onPrintSuccess: (ticket, result) => {
        lastHandledTicketIdRef.current = ticket.ticketId;
        lastFailedTicketRef.current = { id: null, at: 0 };
        const via = result?.method ? ` via ${result.method}` : '';
        addLog(`✅ Ticket ${ticket.ticketId} imprime${via}.`);
      },
      onPrintFail: (ticket, result) => {
        lastFailedTicketRef.current = { id: ticket.ticketId, at: Date.now() };
        addLog(`❌ Impression echouee : ${result.detail || result.reason || 'erreur'}`);
        addLog('Nouvel essai automatique dans 15 s (ticket non perdu).');
      },
      onShopNotFound: () => {
        addLog('Boutique inconnue.');
        setIsRunning(false);
      },
      onError: (err) => addLog(`Erreur : ${err.message}`),
    };

    runRelayLoop(config, handlers, ac.signal).catch(() => {});

    return () => {
      ac.abort();
      releaseWakeLock();
    };
  }, [isRunning, addLog, printerIp, printerPort, shopName]);

  const toggleService = async () => {
    if (!shopName.trim() || !printerIp.trim()) {
      alert('Renseignez boutique et IP imprimante.');
      return;
    }

    if (isRunning) {
      setIsRunning(false);
      lastHandledTicketIdRef.current = null;
      syncRelayToServiceWorker({ ...configRef.current, active: false });
      addLog('Relais ARRETÉ');
      return;
    }

    if ('Notification' in window && Notification.permission === 'default') {
      await requestNotif();
    }

    try {
      const { CLOUD_URL } = await import('../utils/relayEngine');
      const res = await fetch(
        `${CLOUD_URL}/api/saas/check-shop?shopName=${encodeURIComponent(shopName.trim())}`
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        addLog(`❌ ${data.message || 'Boutique introuvable.'}`);
        return;
      }
      setShopName(data.name || shopName.trim());
      addLog(`✅ Boutique "${data.name || shopName}" connectee.`);
      lastHandledTicketIdRef.current = null;
      lastFailedTicketRef.current = { id: null, at: 0 };
      resolvedBridgeRef.current = { current: '' };
      setIsRunning(true);
    } catch (err) {
      addLog(`❌ Erreur : ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="border-b border-slate-900 px-6 py-4 flex items-center justify-between sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm">
          <ChevronLeft size={20} /> Retour
        </button>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-black text-amber-500 uppercase">
          <Sparkles size={12} /> Relais Web PWA
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <h2 className="text-xl font-black">Configuration</h2>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nom boutique</label>
              <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} disabled={isRunning}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm disabled:opacity-50" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Adresse imprimante (IP)</label>
              <input type="text" value={printerIp} onChange={(e) => setPrinterIp(e.target.value)} placeholder="192.168.1.26" disabled={isRunning}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm disabled:opacity-50" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Port</label>
              <input type="text" value={printerPort} onChange={(e) => setPrinterPort(e.target.value)} placeholder="9100" disabled={isRunning}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-center disabled:opacity-50" />
            </div>

            {!notifOk && (
              <button type="button" onClick={requestNotif}
                className="w-full py-3 rounded-xl border border-indigo-500/40 text-indigo-300 text-sm font-black flex items-center justify-center gap-2">
                <Bell size={16} /> Autoriser notifications (arriere-plan)
              </button>
            )}

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex gap-3">
              <Info size={18} className="text-indigo-400 shrink-0" />
              <p className="text-[11px] text-indigo-200 leading-relaxed">
                <strong>1.</strong> Sur un PC du WiFi : <code className="text-amber-300">node server.js</code> dans print-server.
                <br /><strong>2.</strong> Ajoutez cette page a l&apos;ecran d&apos;accueil (PWA).
                <br /><strong>3.</strong> Demarrez le relais — boutique + IP + port 9100.
              </p>
            </div>

            <button type="button" onClick={testPrinter} disabled={isRunning}
              className="w-full py-3 rounded-xl border border-slate-700 text-sm font-black disabled:opacity-50">
              Tester l&apos;impression
            </button>

            <button onClick={toggleService}
              className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 ${isRunning ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-950'}`}>
              {isRunning ? <><Square size={18} fill="currentColor" /> Arreter</> : <><Play size={18} fill="currentColor" /> Demarrer</>}
            </button>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <span className="text-[10px] font-black uppercase text-slate-500">Statut</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm font-black">{isRunning ? 'ACTIF' : 'INACTIF'}</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <span className="text-[10px] font-black uppercase text-slate-500">Arriere-plan</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${bgActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <span className="text-sm font-black">{bgActive ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <span className="text-[10px] font-black uppercase text-slate-500">Anti-veille</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${wakeLockActive ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <span className="text-sm font-black">{wakeLockActive ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <span className="text-[10px] font-black uppercase text-slate-500">Dernier ticket</span>
              <p className="text-sm font-black mt-2 truncate">{currentTicket?.ticketId || '—'}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 min-h-[320px]">
            <h2 className="text-lg font-black mb-4">Apercu ticket</h2>
            <AnimatePresence mode="wait">
              {currentTicket ? (
                <motion.div key={currentTicket.ticketId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="max-w-md mx-auto bg-white text-slate-900 rounded-2xl p-6">
                  <p className="font-black text-center text-lg mb-4">#{currentTicket.ticketId}</p>
                  {(currentTicket.items || []).map((it, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span>{it.quantity}x {it.name}</span>
                      <span>{(it.price * it.quantity).toFixed(2)} EUR</span>
                    </div>
                  ))}
                  <div className="border-t mt-3 pt-3 flex justify-between font-black">
                    <span>TOTAL</span>
                    <span>{Number(currentTicket.total || 0).toFixed(2)} EUR</span>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center text-slate-500 py-16">
                  <Printer size={40} className="mx-auto mb-3 opacity-40" />
                  En attente de commandes...
                </div>
              )}
            </AnimatePresence>

            <div className="mt-8 border-t border-slate-800 pt-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Terminal size={14} />
                <span className="text-xs font-black uppercase">Journal</span>
                <button type="button" onClick={() => setSoundEnabled(!soundEnabled)} className="ml-auto p-1.5 rounded-lg border border-slate-700">
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              </div>
              <div className="bg-slate-950 rounded-xl p-3 font-mono text-[10px] text-emerald-500 h-44 overflow-y-auto space-y-1">
                {logs.length === 0 ? <span className="text-slate-600">Pret.</span> : logs.map((log, i) => <div key={i}>{log}</div>)}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
