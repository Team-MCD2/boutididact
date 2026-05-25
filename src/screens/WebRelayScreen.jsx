import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Play, Square, Info, Volume2, VolumeX,
  Printer, Terminal, Sparkles,
} from 'lucide-react';
import {
  generateEscPosBytes,
  buildEposTextSoap,
  isPrivateIp,
  guessBridgeCandidates,
} from '../utils/escpos';

const CLOUD_URL = 'https://boutididact-backendd.vercel.app';
const POLL_INTERVAL_MS = 5000;
const PRINT_RETRY_MS = 15000;
const DEFAULT_PORT = '9100';

const lanFetch = (url, options = {}) =>
  fetch(url, { ...options, targetAddressSpace: 'private' });

export default function WebRelayScreen({ onBack }) {
  const [shopName, setShopName] = useState(
    () => localStorage.getItem('boutididact_webrelay_shopName') || ''
  );
  const [printerIp, setPrinterIp] = useState(
    () => localStorage.getItem('boutididact_webrelay_printerIp') || '192.168.1.26'
  );
  const [printerPort, setPrinterPort] = useState(
    () => localStorage.getItem('boutididact_webrelay_printerPort') || DEFAULT_PORT
  );
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);

  const wakeLockRef = useRef(null);
  const isRunningRef = useRef(isRunning);
  const shopNameRef = useRef(shopName);
  const printerIpRef = useRef(printerIp);
  const printerPortRef = useRef(printerPort);
  const soundEnabledRef = useRef(soundEnabled);
  const lastHandledTicketIdRef = useRef(null);
  const lastFailedTicketRef = useRef({ id: null, at: 0 });
  const resolvedBridgeRef = useRef('');

  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { shopNameRef.current = shopName; }, [shopName]);
  useEffect(() => { printerIpRef.current = printerIp; }, [printerIp]);
  useEffect(() => { printerPortRef.current = printerPort; }, [printerPort]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  useEffect(() => { localStorage.setItem('boutididact_webrelay_shopName', shopName); }, [shopName]);
  useEffect(() => { localStorage.setItem('boutididact_webrelay_printerIp', printerIp); }, [printerIp]);
  useEffect(() => { localStorage.setItem('boutididact_webrelay_printerPort', printerPort); }, [printerPort]);

  const addLog = useCallback((msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 60));
  }, []);

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

  /** TCP direct — meme logique que l'APK (telephone → imprimante sur le WiFi) */
  const sendViaNativeTcp = async (ticket, ip, port) => {
    const bytes = generateEscPosBytes(ticket);
    const payload = Array.from(bytes);
    const portNum = parseInt(port, 10) || 9100;

    if (window.BoutididactNative?.printEscPos) {
      try {
        await window.BoutididactNative.printEscPos(ip, portNum, payload);
        addLog(`✅ Impression TCP directe OK (${ip}:${portNum})`);
        return true;
      } catch (err) {
        addLog(`Native : ${err.message}`);
      }
    }

    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'print_escpos',
        ip,
        port: portNum,
        bytes: payload,
      }));
      addLog(`✅ Envoi TCP via application native (${ip}:${portNum})`);
      return true;
    }

    return false;
  };

  const sendViaLanBridge = async (ticket, ip, port, bridgeBase) => {
    const base = bridgeBase.replace(/\/$/, '');
    try {
      const res = await lanFetch(`${base}/api/saas/relay-print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shopNameRef.current.trim(),
          printerIp: ip,
          printerPort: port,
          ticket,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        addLog(`✅ Impression OK via relais local (${ip}:${port})`);
        resolvedBridgeRef.current = base;
        return true;
      }
    } catch { /* suivant */ }
    return false;
  };

  const findLanBridge = async (printerIp) => {
    if (resolvedBridgeRef.current) return resolvedBridgeRef.current;
    for (const candidate of guessBridgeCandidates(printerIp)) {
      try {
        const res = await lanFetch(`${candidate}/api/health`, {
          signal: AbortSignal.timeout(1500),
        });
        if (res.ok) {
          resolvedBridgeRef.current = candidate;
          return candidate;
        }
      } catch { /* suivant */ }
    }
    return null;
  };

  const postEpos = async (url, body) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
        SOAPAction: '""',
      },
      body,
    });
    const text = await res.text();
    return res.ok && !/success="false"/i.test(text);
  };

  const sendViaEpos = async (ticket, ip, port) => {
    const p = String(port || '8043');
    const targets = [
      { protocol: 'https', port: p },
      ...(p !== '8043' ? [{ protocol: 'https', port: '8043' }] : []),
      { protocol: 'http', port: '80' },
    ];

    for (const { protocol, port: ep } of targets) {
      const url = `${protocol}://${ip}:${ep}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=15000`;
      try {
        if (await postEpos(url, buildEposTextSoap(ticket))) {
          addLog(`✅ Impression ePOS OK (${protocol}:${ep})`);
          return true;
        }
      } catch { /* suivant */ }
    }
    return false;
  };

  const sendViaAirPrint = (ticket) => {
    addLog('Impression AirPrint...');
    try {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:absolute;width:0;height:0;border:none';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`<!DOCTYPE html><html><head><style>
        @page{size:80mm auto;margin:0}body{font-family:monospace;width:72mm;margin:0;padding:4mm;font-size:13px}
        .row{display:flex;justify-content:space-between}.center{text-align:center}.bold{font-weight:bold}
      </style></head><body>
        <div class="center bold">BOUTIDIDACT</div>
        <div class="center">#${ticket.ticketId || 'N/A'}</div>
        ${(ticket.items || []).map((it) => `<div class="row"><span>${it.quantity}x ${it.name}</span><span>${(it.price * it.quantity).toFixed(2)} EUR</span></div>`).join('')}
        <div class="row bold"><span>TOTAL</span><span>${Number(ticket.total || 0).toFixed(2)} EUR</span></div>
        <script>window.onload=function(){window.print();setTimeout(function(){window.parent.document.body.removeChild(window.frameElement)},800)}</script>
      </body></html>`);
      doc.close();
      addLog('✅ Dialogue AirPrint ouvert');
      return true;
    } catch (err) {
      addLog(`AirPrint : ${err.message}`);
      return false;
    }
  };

  const sendViaCloud = async (ticket, ip, port) => {
    try {
      const res = await fetch(`${CLOUD_URL}/api/saas/relay-print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shopNameRef.current.trim(),
          printerIp: ip,
          printerPort: port,
          ticket,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        addLog(`✅ Impression cloud OK (${ip}:${port})`);
        return true;
      }
    } catch { /* ignore */ }
    return false;
  };

  const requeueTicket = async (ticket) => {
    try {
      await fetch(`${CLOUD_URL}/api/saas/push-ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: shopNameRef.current.trim(),
          ticketData: ticket,
        }),
      });
    } catch { /* ignore */ }
  };

  const sendPrint = async (ticket) => {
    const ip = printerIpRef.current.trim();
    const port = String(printerPortRef.current.trim() || DEFAULT_PORT);
    if (!ip) {
      addLog('❌ IP imprimante manquante.');
      return false;
    }

    addLog(`Impression → ${ip}:${port}...`);

    const portNum = parseInt(port, 10) || 9100;

    if (portNum === 9100 || port === '9100') {
      if (await sendViaNativeTcp(ticket, ip, port)) return true;

      if (isPrivateIp(ip)) {
        const bridge = await findLanBridge(ip);
        if (bridge && await sendViaLanBridge(ticket, ip, port, bridge)) return true;
      }

      if (!isPrivateIp(ip) && await sendViaCloud(ticket, ip, port)) return true;

      addLog('❌ Connexion imprimante impossible.');
      addLog('Telephone et imprimante sur le meme WiFi ?');
      addLog('Sur Android : utilisez l\'application APK (impression directe port 9100).');
      return false;
    }

    if (await sendViaEpos(ticket, ip, port)) return true;
    if (sendViaAirPrint(ticket)) return true;

    addLog('❌ Impression echouee — verifiez IP et port.');
    return false;
  };

  const testPrinter = async () => {
    resolvedBridgeRef.current = '';
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
          if (res.status === 404) { addLog('Boutique inconnue.'); setIsRunning(false); }
          return;
        }

        const data = await res.json();
        if (!data?.ticket) return;

        const tid = data.ticket.ticketId || 'Inconnu';
        if (lastHandledTicketIdRef.current === tid) return;

        const failed = lastFailedTicketRef.current;
        if (failed.id === tid && Date.now() - failed.at < PRINT_RETRY_MS) return;

        addLog(`🎟️ TICKET REÇU : ID ${tid}`);
        setCurrentTicket(data.ticket);
        playChime();

        const ok = await sendPrint(data.ticket);
        if (ok) {
          lastHandledTicketIdRef.current = tid;
          lastFailedTicketRef.current = { id: null, at: 0 };
        } else {
          lastFailedTicketRef.current = { id: tid, at: Date.now() };
          await requeueTicket(data.ticket);
          addLog(`⚠️ Ticket ${tid} remis en file — nouvel essai bientot.`);
        }
      } catch (err) {
        addLog(`Erreur cloud : ${err.message}`);
      }
    };

    if (isRunning) {
      addLog(`Relais actif — ${printerIp}:${printerPort}`);
      requestWakeLock();
      poll();
      intervalId = setInterval(poll, POLL_INTERVAL_MS);
    } else {
      releaseWakeLock();
    }

    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isRunning, addLog, printerIp, printerPort]);

  const toggleService = async () => {
    if (!shopName.trim() || !printerIp.trim()) {
      alert('Renseignez boutique et IP imprimante.');
      return;
    }

    if (isRunning) {
      setIsRunning(false);
      lastHandledTicketIdRef.current = null;
      lastFailedTicketRef.current = { id: null, at: 0 };
      addLog('Relais ARRETÉ');
      return;
    }

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
      lastHandledTicketIdRef.current = null;
      lastFailedTicketRef.current = { id: null, at: 0 };
      resolvedBridgeRef.current = '';
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
          <Sparkles size={12} /> Relais Impression
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
              <p className="text-[10px] text-slate-500 mt-2">Port standard thermique : <strong>9100</strong></p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex gap-3">
              <Info size={18} className="text-slate-400 shrink-0" />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Meme WiFi pour le telephone et l&apos;imprimante. Renseignez uniquement l&apos;IP et le port — comme avec l&apos;APK.
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
