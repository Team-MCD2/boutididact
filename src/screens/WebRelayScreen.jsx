import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, Play, Square, Info, Wifi, 
  Volume2, VolumeX, Printer, Terminal, Sparkles, ExternalLink, Lock
} from 'lucide-react';

const CLOUD_URL = 'https://boutididact-backendd.vercel.app';
const POLL_INTERVAL_MS = 5000;
const MODE_PORTS = { epos_https: '8043', epos_http: '80' };
const RAW_TCP_PORT = '9100';
const EPOS_DEVID = 'local_printer';

function stripAccents(str) {
  return String(str ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeXml(str) {
  return stripAccents(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function eposLine(text, extraAttrs = '') {
  return `<text lang="fr"${extraAttrs}>${escapeXml(text)}&#10;</text>`;
}

function buildEposXml(ticket) {
  const shopName = escapeXml((ticket.shop?.name || 'BOUTIDIDACT').toUpperCase());
  const lines = [
    '<align align="center"/>',
    `<text dw="true" dh="true" lang="fr">${shopName}&#10;</text>`,
    eposLine('--------------------------------'),
    eposLine(`TICKET : ${ticket.ticketId || 'N/A'}`),
    eposLine('--------------------------------'),
    '<align align="left"/>',
  ];

  (ticket.items || []).forEach((it) => {
    const qty = Number(it.quantity) || 1;
    const total = (Number(it.price || 0) * qty).toFixed(2);
    lines.push(eposLine(`${qty}x ${it.name}  ${total} EUR`));
  });

  lines.push(
    '<align align="center"/>',
    eposLine('--------------------------------'),
    `<text dw="true" dh="true" lang="fr">TOTAL: ${Number(ticket.total || 0).toFixed(2)} EUR&#10;</text>`,
    eposLine(`Paiement : ${ticket.payment || 'CB'}`),
    eposLine('--------------------------------'),
    '<feed line="3"/>',
    '<cut type="feed"/>',
  );

  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
<soapenv:Body>
<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
${lines.join('\n')}
</epos-print>
</soapenv:Body>
</soapenv:Envelope>`;
}

function buildEposTestXml() {
  return buildEposXml({
    ticketId: 'TEST',
    total: 0,
    payment: 'TEST',
    items: [{ name: 'Connexion OK', quantity: 1, price: 0 }],
  });
}

function isChromeOrAndroid() {
  const ua = navigator.userAgent || '';
  return /Android/i.test(ua) || /Chrome/i.test(ua) && !/Edg/i.test(ua);
}

function normalizePortForMode(mode, port) {
  const p = String(port || '').trim();
  if (p === RAW_TCP_PORT) return MODE_PORTS[mode] || '8043';
  if (!p && mode in MODE_PORTS) return MODE_PORTS[mode];
  return p || MODE_PORTS[mode] || '8043';
}

export default function WebRelayScreen({ onBack }) {
  const [shopName, setShopName] = useState(() => localStorage.getItem('boutididact_webrelay_shopName') || '');
  const [printerIp, setPrinterIp] = useState(() => localStorage.getItem('boutididact_webrelay_printerIp') || '192.168.1.100');
  const initialMode = (() => {
    const saved = localStorage.getItem('boutididact_webrelay_printMode');
    if (saved) return saved;
    return isChromeOrAndroid() ? 'epos_https' : 'epos_https';
  })();
  const [printMode, setPrintMode] = useState(initialMode);
  const [printerPort, setPrinterPort] = useState(() => {
    const savedPort = localStorage.getItem('boutididact_webrelay_printerPort') || '';
    const savedMode = localStorage.getItem('boutididact_webrelay_printMode') || initialMode;
    return normalizePortForMode(savedMode, savedPort);
  });
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
  const printModeRef = useRef(printMode);
  const soundEnabledRef = useRef(soundEnabled);

  // Sync refs to avoid stale closures in the poll interval
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { shopNameRef.current = shopName; }, [shopName]);
  useEffect(() => { printerIpRef.current = printerIp; }, [printerIp]);
  useEffect(() => { printerPortRef.current = printerPort; }, [printerPort]);
  useEffect(() => { printModeRef.current = printMode; }, [printMode]);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  // Save settings on changes
  useEffect(() => {
    localStorage.setItem('boutididact_webrelay_shopName', shopName);
  }, [shopName]);

  useEffect(() => {
    localStorage.setItem('boutididact_webrelay_printerIp', printerIp);
  }, [printerIp]);

  useEffect(() => {
    localStorage.setItem('boutididact_webrelay_printerPort', printerPort);
  }, [printerPort]);

  useEffect(() => {
    localStorage.setItem('boutididact_webrelay_printMode', printMode);
  }, [printMode]);

  const selectPrintMode = (mode) => {
    setPrintMode(mode);
    if (mode === 'epos_https' || mode === 'epos_http') {
      setPrinterPort((prev) => normalizePortForMode(mode, prev));
    }
  };

  const portWarning = (printMode === 'epos_https' || printMode === 'epos_http') && String(printerPort).trim() === RAW_TCP_PORT
    ? `Le port ${RAW_TCP_PORT} est réservé au relais Windows/APK (TCP brut). En relais web Chrome, utilisez le port ${MODE_PORTS[printMode]} (ePOS).`
    : null;

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

  // Web Audio Synth Chime for iOS
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
          
          // Print Action selector
          if (printModeRef.current === 'epos_https' || printModeRef.current === 'epos_http') {
            sendEposPrint(data.ticket);
          } else {
            printViaBrowser(data.ticket);
          }
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

  // Dynamic Browser-based AirPrint (Highly stable on iOS/Safari)
  const printViaBrowser = (ticket) => {
    addLog("Déclenchement automatique de l'impression AirPrint...");
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(`
        <html>
          <head>
            <style>
              @page {
                size: 80mm auto;
                margin: 0;
              }
              body {
                font-family: 'Courier New', Courier, monospace;
                width: 72mm;
                margin: 0;
                padding: 4mm;
                background-color: #fff;
                color: #000;
                font-size: 13px;
                line-height: 1.35;
              }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 8px 0; }
              .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
              .item-name { flex: 1; padding-right: 8px; }
              .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 8px; }
            </style>
          </head>
          <body>
            <div class="center">
              <h2 style="margin: 0 0 4px 0; font-size: 18px;">BOUTIDIDACT</h2>
              <div class="bold">TICKET COMMANDE</div>
              <div>ID: ${ticket.ticketId}</div>
              <div class="divider"></div>
            </div>
            
            <div>
              ${ticket.items.map(it => `
                <div class="item-row">
                  <span class="item-name"><span class="bold">${it.quantity}x</span> ${it.name}</span>
                  <span class="right">${(it.price * it.quantity).toFixed(2)}€</span>
                </div>
              `).join('')}
            </div>
            
            <div class="divider"></div>
            
            <div class="total-row">
              <span>TOTAL</span>
              <span>${ticket.total.toFixed(2)}€</span>
            </div>
            <div class="item-row" style="margin-top: 4px;">
              <span>Mode:</span>
              <span class="right">${ticket.payment || 'CB'}</span>
            </div>
            
            <div class="divider"></div>
            <div class="center" style="margin-top: 12px; font-size: 10px; color: #555;">
              Merci de votre confiance !
            </div>
            
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() {
                  window.parent.document.body.removeChild(window.frameElement);
                }, 1000);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();
      addLog("Dialogue AirPrint ouvert avec succès.");
    } catch (e) {
      addLog(`❌ Échec de l'impression AirPrint : ${e.message}`);
    }
  };

  // Epson ePOS SOAP XML direct printing
  const sendEposPrint = async (ticket) => {
    const ip = printerIpRef.current.trim();
    const mode = printModeRef.current;
    let port = printerPortRef.current.trim();
    const isHttps = mode === 'epos_https';

    if (port === RAW_TCP_PORT) {
      addLog(`❌ Port ${RAW_TCP_PORT} incompatible avec le relais web Chrome.`);
      addLog(`👉 Passez en mode "Epson HTTPS" avec le port ${MODE_PORTS.epos_https}, ou utilisez le relais Windows (.exe).`);
      return;
    }

    port = normalizePortForMode(mode, port);
    
    // Choose custom port, or default 8043 (HTTPS) / 80 (HTTP)
    const portString = port ? `:${port}` : (isHttps ? ':8043' : '');
    const protocol = isHttps ? 'https' : 'http';
    const targetUrl = `${protocol}://${ip}${portString}/cgi-bin/epos/service.cgi?devid=${EPOS_DEVID}&timeout=10000`;
    
    addLog(`Envoi ePOS (${protocol.toUpperCase()}) vers ${targetUrl}...`);
    
    const xml = buildEposXml(ticket);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'SOAPAction': '""',
        },
        body: xml,
      });
      const responseText = await response.text();
      if (response.ok && /success="true"/i.test(responseText)) {
        addLog('Impression ePOS Epson reussie !');
      } else if (response.ok && /success="false"/i.test(responseText)) {
        addLog('❌ Imprimante ePOS a refuse le ticket (format ou devid incorrect).');
        addLog('👉 Verifiez que c\'est une Epson compatible ePOS. Sinon utilisez le relais Windows (.exe).');
      } else if (response.ok) {
        addLog('Impression envoyee (reponse imprimante ambigue).');
      } else {
        addLog(`Erreur Epson ePOS : statut HTTP ${response.status}`);
      }
    } catch (err) {
      addLog(`❌ Échec connexion ePOS (${protocol.toUpperCase()})`);
      if (port === RAW_TCP_PORT || !port) {
        addLog(`👉 Le port ${RAW_TCP_PORT} ne fonctionne pas dans Chrome. Utilisez Epson HTTPS port ${MODE_PORTS.epos_https}.`);
      } else if (isHttps) {
        addLog(`👉 Autorisez le certificat SSL de l'imprimante (bouton ci-dessous), puis vérifiez le port ${MODE_PORTS.epos_https}.`);
      } else {
        addLog(`👉 Sur Chrome, le mode HTTP est souvent bloqué. Utilisez "Epson HTTPS" port ${MODE_PORTS.epos_https}.`);
      }
    }
  };

  const testPrinter = async () => {
    const ip = printerIp.trim();
    const mode = printMode;
    const port = normalizePortForMode(mode, printerPort.trim());

    if (!ip) {
      alert('Renseignez l\'adresse IP de l\'imprimante.');
      return;
    }
    if ((mode === 'epos_https' || mode === 'epos_http') && port === RAW_TCP_PORT) {
      alert(`Le port ${RAW_TCP_PORT} est pour le relais Windows/APK uniquement.\n\nEn relais web Chrome, mettez le port ${MODE_PORTS.epos_https} (Epson HTTPS).`);
      return;
    }
    if (mode === 'airprint') {
      addLog('Test AirPrint : utilisez « Ré-imprimer » sur un ticket reçu.');
      return;
    }

    addLog(`Test connexion imprimante (${mode}, port ${port})...`);
    const protocol = mode === 'epos_https' ? 'https' : 'http';
    const targetUrl = `${protocol}://${ip}:${port}/cgi-bin/epos/service.cgi?devid=${EPOS_DEVID}&timeout=10000`;
    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'SOAPAction': '""',
        },
        body: buildEposTestXml(),
      });
      const body = await res.text();
      if (res.ok && /success="true"/i.test(body)) {
        addLog('✅ Imprimante ePOS joignable — ticket test imprime !');
      } else if (res.ok) {
        addLog('⚠️ Imprimante repond mais le ticket test a peut-etre echoue — verifiez le papier.');
      } else {
        addLog(`⚠️ Imprimante répond mais erreur HTTP ${res.status}`);
      }
    } catch (err) {
      addLog(`❌ Imprimante injoignable sur ${targetUrl}`);
      if (mode === 'epos_https') {
        addLog('👉 Cliquez « Autoriser le Certificat », acceptez l\'avertissement Chrome, puis retestez.');
      } else {
        addLog(`👉 Passez en Epson HTTPS, port ${MODE_PORTS.epos_https}.`);
      }
    }
  };

  const toggleService = async () => {
    if (!shopName.trim()) {
      alert("Veuillez renseigner le nom de la boutique.");
      return;
    }

    if (!isRunning && (printMode === 'epos_https' || printMode === 'epos_http')) {
      if (String(printerPort).trim() === RAW_TCP_PORT) {
        alert(`Le port ${RAW_TCP_PORT} ne fonctionne pas dans Chrome.\n\nUtilisez le mode « Epson HTTPS » avec le port ${MODE_PORTS.epos_https}.\n\nLe port ${RAW_TCP_PORT} est réservé au relais Windows (.exe).`);
        setPrintMode('epos_https');
        setPrinterPort(MODE_PORTS.epos_https);
        return;
      }
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
          <Sparkles size={12} /> Relais Web (Chrome, Android, iOS)
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
                <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                  <button 
                    onClick={() => selectPrintMode('epos_https')}
                    disabled={isRunning}
                    className={`py-2 px-1 rounded-xl font-black text-[10px] transition-all text-center leading-tight ${
                      printMode === 'epos_https' 
                        ? 'bg-amber-500 text-slate-950 shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Epson HTTPS
                  </button>
                  <button 
                    onClick={() => selectPrintMode('epos_http')}
                    disabled={isRunning}
                    className={`py-2 px-1 rounded-xl font-black text-[10px] transition-all text-center leading-tight ${
                      printMode === 'epos_http' 
                        ? 'bg-amber-500 text-slate-950 shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Epson HTTP
                  </button>
                  <button 
                    onClick={() => selectPrintMode('airprint')}
                    disabled={isRunning}
                    className={`py-2 px-1 rounded-xl font-black text-[10px] transition-all text-center leading-tight ${
                      printMode === 'airprint' 
                        ? 'bg-amber-500 text-slate-950 shadow-md' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    AirPrint
                  </button>
                </div>
              </div>

              {(printMode === 'epos_https' || printMode === 'epos_http') && (
                <div className="space-y-4 border-t border-slate-800/50 pt-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Adresse IP Imprimante</label>
                      <input 
                        type="text" 
                        value={printerIp} 
                        onChange={(e) => setPrinterIp(e.target.value)}
                        placeholder="192.168.1.100"
                        disabled={isRunning}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all disabled:opacity-50"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Port</label>
                      <input 
                        type="text" 
                        value={printerPort} 
                        onChange={(e) => setPrinterPort(e.target.value)}
                        placeholder={printMode === 'epos_https' ? '8043' : '80'}
                        disabled={isRunning}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all text-center disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {portWarning && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex gap-3">
                      <Info size={20} className="text-red-400 shrink-0" />
                      <p className="text-[11px] text-red-300 leading-relaxed font-semibold">{portWarning}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={testPrinter}
                    disabled={isRunning}
                    className="w-full py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-black text-xs transition disabled:opacity-50"
                  >
                    Tester la connexion imprimante
                  </button>

                  {printMode === 'epos_https' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                      <div className="flex gap-2">
                        <Lock size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-xs font-black uppercase tracking-wider text-amber-500">Procédure Sécurité SSL</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                        Chrome et Safari nécessitent d'accepter une fois le certificat SSL auto-signé de votre imprimante Epson :
                      </p>
                      <ol className="text-[11px] text-slate-400 space-y-1.5 list-decimal pl-4 font-semibold">
                        <li>Cliquez sur le bouton ci-dessous pour ouvrir la page de l'imprimante dans un nouvel onglet.</li>
                        <li>Acceptez l'avertissement de sécurité (<strong>"Avancé"</strong> puis <strong>"Continuer"</strong> sur Chrome, ou <strong>"Visiter ce site"</strong> sur Safari).</li>
                        <li>Revenez sur cette page de Relais et lancez le service !</li>
                      </ol>
                      
                      <a 
                        href={`https://${printerIp.trim()}:${printerPort.trim()}/cgi-bin/epos/service.cgi?devid=${EPOS_DEVID}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 bg-amber-500 text-slate-950 hover:bg-amber-600 rounded-xl font-black text-xs transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/10"
                      >
                        1. Autoriser le Certificat <ExternalLink size={14} />
                      </a>
                    </div>
                  )}

                  {printMode === 'epos_http' && (
                    <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex gap-3">
                      <Info size={20} className="text-red-400 shrink-0" />
                      <p className="text-[11px] text-red-300 leading-relaxed font-semibold">
                        <strong>Chrome / Android :</strong> le mode HTTP est souvent bloqué depuis une page HTTPS. Préférez <strong>Epson HTTPS</strong> port <strong>{MODE_PORTS.epos_https}</strong>.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {printMode === 'airprint' && (
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex gap-3 border-t border-slate-800/50 pt-4">
                  <Info size={20} className="text-indigo-400 shrink-0" />
                  <p className="text-[11px] text-indigo-300 leading-relaxed font-semibold">
                    <strong>Mode AirPrint Actif :</strong> Ouvre automatiquement l'invite d'impression iOS native configurée pour ticket de cuisine. 100% compatible et sécurisé sans contrainte de réseau HTTPS !
                  </p>
                </div>
              )}

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
                <Info size={20} className="text-slate-400 shrink-0" />
                <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                  <strong>Caracteres bizarres ?</strong> Votre imprimante n'est peut-etre pas Epson ePOS. Le relais web Chrome ne convient qu'aux Epson (port {MODE_PORTS.epos_https}). Pour Star/Bixolon/autre → relais Windows (.exe) port {RAW_TCP_PORT}.
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
              {currentTicket && (
                <button 
                  onClick={() => printViaBrowser(currentTicket)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all"
                >
                  <Printer size={14} /> Ré-imprimer (AirPrint)
                </button>
              )}
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
