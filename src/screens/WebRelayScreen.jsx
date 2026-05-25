import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Play, Square, Info, Volume2, VolumeX,
  Printer, Terminal, Sparkles, ExternalLink, Lock,
} from 'lucide-react';
import {
  generateEscPosBytes,
  escPosToHex,
  buildEposEscPosSoap,
  buildEposTextSoap,
  isPrivateIp,
} from '../utils/escpos';

const CLOUD_URL = 'https://boutididact-backendd.vercel.app';
const POLL_INTERVAL_MS = 5000;
const PRINTER_PORT = '9100';
const EPOS_PORT = '8043';
const EPOS_DEVIDS = ['local_printer', 'localprinter'];

export default function WebRelayScreen({ onBack }) {
  const [shopName, setShopName] = useState(
    () => localStorage.getItem('boutididact_webrelay_shopName') || ''
  );
  const [printerIp, setPrinterIp] = useState(
    () => localStorage.getItem('boutididact_webrelay_printerIp') || '192.168.1.26'
  );
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [certAccepted, setCertAccepted] = useState(false);

  const wakeLockRef = useRef(null);
  const isRunningRef = useRef(isRunning);
  const shopNameRef = useRef(shopName);
  const printerIpRef = useRef(printerIp);
  const soundEnabledRef = useRef(soundEnabled);
  const lastPrintedTicketIdRef = useRef(null);

  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { shopNameRef.current = shopName; }, [shopName]);
  useEffect(() => { printerIpRef.current = printerIp; }, [printerIp]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('boutididact_webrelay_shopName', shopName);
  }, [shopName]);
  useEffect(() => {
    localStorage.setItem('boutididact_webrelay_printerIp', printerIp);
  }, [printerIp]);
  useEffect(() => {
    localStorage.setItem('boutididact_webrelay_printerPort', PRINTER_PORT);
  }, []);

  const addLog = useCallback((msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  const requestWakeLock = async () => {
    if (!('wakeLock' in navigator)) {
      setWakeLockActive(false);
      return;
    }
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setWakeLockActive(true);
      addLog('Anti-veille active.');
    } catch {
      setWakeLockActive(false);
    }
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

  /** Impression directe depuis le telephone (WiFi local) via ePOS HTTPS */
  const sendDirectFromPhone = async (ticket, ip) => {
    const hex = escPosToHex(generateEscPosBytes(ticket));
    const payloads = [
      buildEposEscPosSoap(hex),
      buildEposTextSoap(ticket),
    ];

    for (const devid of EPOS_DEVIDS) {
      const url = `https://${ip}:${EPOS_PORT}/cgi-bin/epos/service.cgi?devid=${devid}&timeout=15000`;
      for (const body of payloads) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'text/xml; charset=utf-8',
              'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
              'SOAPAction': '""',
            },
            body,
          });
          const text = await res.text();
          if (res.ok && !/success="false"/i.test(text)) {
            addLog(`✅ Impression directe OK (${ip}:${PRINTER_PORT} via WiFi)`);
            return true;
          }
        } catch {
          /* essai suivant */
        }
      }
    }
    return false;
  };

  /** Impression via cloud (imprimante IP publique ou routeur avec redirection port 9100) */
  const sendViaCloud = async (ticket, ip) => {
    try {
      const res = await fetch(`${CLOUD_URL}/api/saas/relay-print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shopNameRef.current.trim(),
          printerIp: ip,
          printerPort: PRINTER_PORT,
          ticket,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        addLog(`✅ Impression cloud OK (${ip}:${PRINTER_PORT})`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const sendPrint = async (ticket) => {
    const ip = printerIpRef.current.trim();
    if (!ip) {
      addLog('❌ IP imprimante manquante.');
      return false;
    }

    addLog(`Impression ticket → ${ip}:${PRINTER_PORT}...`);

    if (isPrivateIp(ip)) {
      addLog('WiFi local : envoi direct depuis le telephone...');
      const direct = await sendDirectFromPhone(ticket, ip);
      if (direct) return true;

      addLog('❌ Impression directe echouee.');
      if (!certAccepted) {
        addLog('👉 Acceptez le certificat SSL de l\'imprimante (bouton ci-dessous), puis retestez.');
      } else {
        addLog('👉 Verifiez que le telephone est sur le MEME WiFi que l\'imprimante.');
        addLog('👉 Imprimante Epson recommandee (ePOS). Autres marques : IP publique + redirection port 9100.');
      }
      return false;
    }

    addLog('IP publique : envoi via cloud...');
    const cloud = await sendViaCloud(ticket, ip);
    if (cloud) return true;

    addLog('❌ Cloud injoignable ou imprimante inaccessible.');
    return false;
  };

  const testPrinter = async () => {
    await sendPrint({
      ticketId: 'TEST',
      total: 0,
      payment: 'TEST',
      items: [{ name: 'Test Boutididact', quantity: 1, price: 0 }],
    });
  };

  useEffect(() => {
    let intervalId = null;

    const poll = async () => {
      if (!isRunningRef.current) return;
      const currentShop = shopNameRef.current.trim();
      if (!currentShop) return;

      try {
        const url = `${CLOUD_URL}/api/saas/poll-ticket?shopName=${encodeURIComponent(currentShop)}`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) {
          if (res.status === 404) {
            addLog('Boutique inconnue.');
            setIsRunning(false);
          }
          return;
        }

        const data = await res.json();
        if (!data?.ticket) return;

        const tid = data.ticket.ticketId || 'Inconnu';
        if (lastPrintedTicketIdRef.current === tid) return;
        lastPrintedTicketIdRef.current = tid;

        addLog(`🎟️ TICKET REÇU : ID ${tid}`);
        setCurrentTicket(data.ticket);
        playChime();
        await sendPrint(data.ticket);
      } catch (err) {
        addLog(`Erreur cloud : ${err.message}`);
      }
    };

    if (isRunning) {
      addLog(`Relais Chrome actif — port ${PRINTER_PORT} — autonome (telephone/PC)`);
      requestWakeLock();
      poll();
      intervalId = setInterval(poll, POLL_INTERVAL_MS);
    } else {
      releaseWakeLock();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, addLog]);

  const toggleService = async () => {
    if (!shopName.trim()) {
      alert('Renseignez le nom de la boutique.');
      return;
    }
    if (!printerIp.trim()) {
      alert('Renseignez l\'IP de l\'imprimante.');
      return;
    }

    if (isRunning) {
      setIsRunning(false);
      lastPrintedTicketIdRef.current = null;
      addLog('Relais ARRETÉ');
      return;
    }

    addLog(`Verification boutique "${shopName.trim()}"...`);
    try {
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
      lastPrintedTicketIdRef.current = null;
      setIsRunning(true);
    } catch (err) {
      addLog(`❌ Erreur reseau : ${err.message}`);
    }
  };

  const certUrl = `https://${printerIp.trim()}:${EPOS_PORT}/cgi-bin/epos/service.cgi?devid=local_printer`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      <header className="border-b border-slate-900 px-6 py-4 flex items-center justify-between sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm">
          <ChevronLeft size={20} /> Retour
        </button>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-black text-amber-500 uppercase">
          <Sparkles size={12} /> Relais Chrome / Mobile
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <h2 className="text-xl font-black">Configuration</h2>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Nom boutique</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                disabled={isRunning}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">IP imprimante (WiFi)</label>
              <input
                type="text"
                value={printerIp}
                onChange={(e) => setPrinterIp(e.target.value)}
                placeholder="192.168.1.26"
                disabled={isRunning}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Port impression</label>
              <input
                type="text"
                value={PRINTER_PORT}
                readOnly
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-center opacity-70"
              />
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
              <div className="flex gap-2 items-center">
                <Lock size={16} className="text-amber-500" />
                <span className="text-xs font-black text-amber-500 uppercase">Certificat SSL (1 fois)</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Sur telephone : ouvrez le lien, acceptez le certificat (<strong>Avance / Continuer</strong>), revenez ici.
              </p>
              <a
                href={certUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setCertAccepted(true)}
                className="flex items-center justify-center gap-2 w-full py-3 bg-amber-500 text-slate-950 rounded-xl font-black text-xs"
              >
                Autoriser certificat imprimante <ExternalLink size={14} />
              </a>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex gap-3">
              <Info size={18} className="text-slate-400 shrink-0" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                <strong>100% autonome</strong> — fonctionne sur telephone Android/iPhone via Chrome/Safari.
                Aucun .exe, aucun PC. Le telephone envoie le ticket ESC/POS port {PRINTER_PORT} via le WiFi local.
              </p>
            </div>

            <button
              type="button"
              onClick={testPrinter}
              disabled={isRunning}
              className="w-full py-3 rounded-xl border border-slate-700 text-sm font-black disabled:opacity-50"
            >
              Tester l&apos;impression
            </button>

            <button
              onClick={toggleService}
              className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-3 ${
                isRunning ? 'bg-red-500 text-white' : 'bg-amber-500 text-slate-950'
              }`}
            >
              {isRunning ? <><Square size={18} fill="currentColor" /> Arreter</> : <><Play size={18} fill="currentColor" /> Demarrer</>}
            </button>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
              <span className="text-[10px] font-black uppercase text-slate-500">Statut</span>
              <div className="flex items-center gap-2 mt-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-sm font-black">{isRunning ? 'ACTIF' : 'INACTIF'}</span>
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
                <motion.div
                  key={currentTicket.ticketId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-md mx-auto bg-white text-slate-900 rounded-2xl p-6"
                >
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
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="ml-auto p-1.5 rounded-lg border border-slate-700"
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              </div>
              <div className="bg-slate-950 rounded-xl p-3 font-mono text-[10px] text-emerald-500 h-36 overflow-y-auto space-y-1">
                {logs.length === 0 ? (
                  <span className="text-slate-600">Pret.</span>
                ) : (
                  logs.map((log, i) => <div key={i}>{log}</div>)
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
