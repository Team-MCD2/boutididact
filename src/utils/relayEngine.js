/**
 * Moteur relais — poll cloud + impression ESC/POS (meme logique APK).
 */
import {
  generateEscPosBytes,
  buildEposTextSoap,
  isPrivateIp,
  guessBridgeCandidates,
} from './escpos';

export const CLOUD_URL = 'https://boutididact-backendd.vercel.app';
export const POLL_INTERVAL_MS = 5000;
export const PRINT_RETRY_MS = 15000;
export const RELAY_STORAGE_KEY = 'boutididact_webrelay_state';

export async function lanFetch(url, options = {}) {
  try {
    return await fetch(url, { ...options, targetAddressSpace: 'private' });
  } catch {
    return fetch(url, options);
  }
}

function fetchWithTimeout(url, options = {}, ms = 2000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return lanFetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

export function loadRelayState() {
  try {
    const raw = localStorage.getItem(RELAY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    shopName: localStorage.getItem('boutididact_webrelay_shopName') || '',
    printerIp: localStorage.getItem('boutididact_webrelay_printerIp') || '192.168.1.26',
    printerPort: localStorage.getItem('boutididact_webrelay_printerPort') || '9100',
    bridgeUrl: localStorage.getItem('boutididact_webrelay_bridgeUrl') || '',
    active: false,
  };
}

export function saveRelayState(state) {
  localStorage.setItem(RELAY_STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem('boutididact_webrelay_shopName', state.shopName || '');
  localStorage.setItem('boutididact_webrelay_printerIp', state.printerIp || '');
  localStorage.setItem('boutididact_webrelay_printerPort', state.printerPort || '9100');
  localStorage.setItem('boutididact_webrelay_bridgeUrl', state.bridgeUrl || '');
}

function resolvePrinterTarget(ticket, config) {
  return {
    ip: String(ticket?.printer?.ip || config.printerIp || '').trim(),
    port: String(ticket?.printer?.port || config.printerPort || '9100').trim(),
  };
}

export async function getLocalLanIp() {
  if (typeof RTCPeerConnection === 'undefined') return null;
  return new Promise((resolve) => {
    let done = false;
    const finish = (ip) => {
      if (done) return;
      done = true;
      try { pc.close(); } catch { /* ignore */ }
      resolve(ip || null);
    };
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.createDataChannel('boutididact');
    pc.onicecandidate = (e) => {
      if (!e.candidate?.candidate) return;
      const m = /(\d+\.\d+\.\d+\.\d+)/.exec(e.candidate.candidate);
      const ip = m?.[1];
      if (ip && isPrivateIp(ip)) finish(ip);
    };
    pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => finish(null));
    setTimeout(() => finish(null), 2500);
  });
}

async function pingBridge(base) {
  const root = base.replace(/\/$/, '');
  for (const path of [`${root}/api/relay/ping`, `${root}/api/health/relay-ping`]) {
    try {
      const res = await fetchWithTimeout(path, { headers: { Accept: 'application/json' } }, 1800);
      if (!res.ok) continue;
      const data = await res.json().catch(() => ({}));
      if (data.ok) return root;
    } catch { /* suivant */ }
  }
  return null;
}

export async function discoverLanBridge(printerIp, knownBridge = '') {
  const tried = new Set();
  const queue = [];
  const push = (url) => {
    const base = String(url || '').replace(/\/$/, '');
    if (!base || tried.has(base)) return;
    tried.add(base);
    queue.push(base);
  };

  if (knownBridge) push(knownBridge);

  const localIp = await getLocalLanIp();
  if (localIp) push(`http://${localIp}:3001`);

  for (const c of guessBridgeCandidates(printerIp)) push(c);

  const batchSize = 12;
  for (let i = 0; i < queue.length; i += batchSize) {
    const batch = queue.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((b) => pingBridge(b)));
    const hit = results.find(Boolean);
    if (hit) return hit;
  }
  return null;
}

async function sendViaNativeTcp(ticket, ip, port) {
  const bytes = generateEscPosBytes(ticket);
  const payload = Array.from(bytes);
  const portNum = parseInt(port, 10) || 9100;

  if (window.BoutididactNative?.printEscPos) {
    await window.BoutididactNative.printEscPos(ip, portNum, payload);
    return true;
  }

  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'print_escpos',
      ip,
      port: portNum,
      bytes: payload,
    }));
    return true;
  }

  return false;
}

async function sendViaDirectTcpSocket(ticket, ip, port) {
  if (typeof TCPSocket === 'undefined') return false;
  const portNum = parseInt(port, 10) || 9100;
  const bytes = generateEscPosBytes(ticket);
  try {
    const socket = new TCPSocket(ip, { remotePort: portNum });
    const { readable, writable } = await socket.opened;
    const writer = writable.getWriter();
    await writer.write(bytes);
    await writer.close();
    await readable.cancel();
    socket.close();
    return true;
  } catch {
    return false;
  }
}

async function sendViaLanBridge(ticket, shopName, ip, port, bridgeBase) {
  const base = bridgeBase.replace(/\/$/, '');
  const res = await lanFetch(`${base}/api/saas/relay-print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopName, printerIp: ip, printerPort: port, ticket }),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && data.ok ? base : null;
}

async function findAndPrintViaBridge(ticket, shopName, ip, port, knownBridge = '') {
  const bridge = await discoverLanBridge(ip, knownBridge);
  if (!bridge) return null;
  const ok = await sendViaLanBridge(ticket, shopName, ip, port, bridge);
  return ok ? bridge : null;
}

async function postEpos(url, body) {
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
}

async function sendViaEpos(ticket, ip, port) {
  const p = String(port || '8043');
  const targets = [
    { protocol: 'https', port: p },
    ...(p !== '8043' ? [{ protocol: 'https', port: '8043' }] : []),
    { protocol: 'http', port: '80' },
  ];
  for (const { protocol, port: ep } of targets) {
    const url = `${protocol}://${ip}:${ep}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=15000`;
    try {
      if (await postEpos(url, buildEposTextSoap(ticket))) return true;
    } catch { /* suivant */ }
  }
  return false;
}

export async function printTicket(ticket, config, resolvedBridgeRef = { current: '' }) {
  const { ip, port } = resolvePrinterTarget(ticket, config);
  const shopName = String(config.shopName || '').trim();
  if (!ip) return { ok: false, reason: 'missing_ip', detail: 'IP imprimante manquante' };

  const portNum = parseInt(port, 10) || 9100;
  const knownBridge = resolvedBridgeRef.current || config.bridgeUrl || '';

  if (portNum === 9100 || port === '9100') {
    if (await sendViaNativeTcp(ticket, ip, port)) {
      return { ok: true, method: 'native_tcp' };
    }
    if (await sendViaDirectTcpSocket(ticket, ip, port)) {
      return { ok: true, method: 'direct_tcp' };
    }
    if (isPrivateIp(ip)) {
      const bridge = await findAndPrintViaBridge(
        ticket, shopName, ip, port, knownBridge,
      );
      if (bridge) {
        resolvedBridgeRef.current = bridge;
        return { ok: true, method: 'lan_bridge', detail: bridge };
      }
    }
    if (!isPrivateIp(ip)) {
      try {
        const res = await fetch(`${CLOUD_URL}/api/saas/relay-print`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopName, printerIp: ip, printerPort: port, ticket }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) return { ok: true, method: 'cloud' };
      } catch { /* ignore */ }
    }
    return {
      ok: false,
      reason: 'tcp_failed',
      detail: isPrivateIp(ip)
        ? 'Imprimante locale : un PC du WiFi doit lancer print-server (node server.js).'
        : 'Imprimante injoignable.',
    };
  }

  if (await sendViaEpos(ticket, ip, port)) return { ok: true, method: 'epos' };
  return { ok: false, reason: 'epos_failed', detail: 'ePOS / AirPrint echoue' };
}

/** Vide la file apres impression reussie */
export async function consumeTicket(shopName) {
  try {
    const res = await fetch(`${CLOUD_URL}/api/saas/ack-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName }),
    });
    if (res.ok) return true;
  } catch { /* fallback */ }

  try {
    const res = await fetch(
      `${CLOUD_URL}/api/saas/poll-ticket?shopName=${encodeURIComponent(shopName)}`,
      { headers: { Accept: 'application/json' } },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function pollOnce(config, handlers = {}) {
  const shopName = String(config.shopName || '').trim();
  if (!shopName) return null;

  const url = `${CLOUD_URL}/api/saas/poll-ticket?shopName=${encodeURIComponent(shopName)}&peek=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    if (res.status === 404) handlers.onShopNotFound?.();
    return null;
  }

  const data = await res.json();
  if (!data?.ticket) return null;

  const tid = data.ticket.ticketId || 'Inconnu';
  const peekState = handlers.peekState || (handlers.peekState = { lastId: null, notified: false });

  if (tid !== peekState.lastId) {
    peekState.lastId = tid;
    peekState.notified = false;
  }

  if (!peekState.notified) {
    handlers.onTicket?.(data.ticket);
    peekState.notified = true;
  }

  const printResult = await printTicket(
    data.ticket,
    config,
    handlers.resolvedBridgeRef || { current: '' },
  );

  if (printResult.ok) {
    await consumeTicket(shopName);
    peekState.lastId = null;
    peekState.notified = false;
    handlers.onPrintSuccess?.(data.ticket, printResult);
  } else {
    handlers.onPrintFail?.(data.ticket, printResult);
  }

  return data.ticket;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runRelayLoop(config, handlers, signal) {
  const tick = async () => {
    if (signal?.aborted || !config.active) return;
    try {
      await pollOnce(config, handlers);
    } catch (err) {
      handlers.onError?.(err);
    }
    if (!signal?.aborted && config.active) {
      await sleep(POLL_INTERVAL_MS);
      await tick();
    }
  };

  if (navigator.locks?.request) {
    await navigator.locks.request('boutididact-relay', { mode: 'exclusive' }, async () => {
      handlers.onBackgroundReady?.();
      await tick();
    });
  } else {
    handlers.onBackgroundReady?.();
    await tick();
  }
}

export async function registerRelayServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/relay-sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
}

export function syncRelayToServiceWorker(config) {
  if (!navigator.serviceWorker?.controller) return;
  navigator.serviceWorker.controller.postMessage({
    type: 'RELAY_CONFIG',
    config: {
      shopName: config.shopName,
      printerIp: config.printerIp,
      printerPort: config.printerPort,
      bridgeUrl: config.bridgeUrl,
      active: config.active,
    },
  });
}

export async function showRelayNotification(shopName, active) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') {
    try { await Notification.requestPermission(); } catch { return; }
  }
  if (Notification.permission !== 'granted') return;

  const reg = await navigator.serviceWorker?.ready?.catch(() => null);
  const title = active ? 'Relais BOUTIDIDACT actif' : 'Relais arrete';
  const body = active ? `Boutique : ${shopName}` : '';

  if (reg?.showNotification) {
    await reg.showNotification(title, {
      body,
      tag: 'boutididact-relay',
      renotify: true,
      icon: '/favicon.png',
      badge: '/favicon.png',
      silent: true,
    });
  } else {
    new Notification(title, { body, tag: 'boutididact-relay', silent: true });
  }
}
