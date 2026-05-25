/**
 * Moteur relais — meme logique que l'APK (poll cloud + impression ESC/POS).
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

export const lanFetch = (url, options = {}) =>
  fetch(url, { ...options, targetAddressSpace: 'private' });

export function loadRelayState() {
  try {
    const raw = localStorage.getItem(RELAY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    shopName: localStorage.getItem('boutididact_webrelay_shopName') || '',
    printerIp: localStorage.getItem('boutididact_webrelay_printerIp') || '192.168.1.26',
    printerPort: localStorage.getItem('boutididact_webrelay_printerPort') || '9100',
    active: false,
  };
}

export function saveRelayState(state) {
  localStorage.setItem(RELAY_STORAGE_KEY, JSON.stringify(state));
  localStorage.setItem('boutididact_webrelay_shopName', state.shopName || '');
  localStorage.setItem('boutididact_webrelay_printerIp', state.printerIp || '');
  localStorage.setItem('boutididact_webrelay_printerPort', state.printerPort || '9100');
}

export async function requeueTicket(shopName, ticket) {
  await fetch(`${CLOUD_URL}/api/saas/push-ticket`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopName, ticketData: ticket }),
  });
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

async function sendViaLanBridge(ticket, shopName, ip, port, bridgeBase) {
  const base = bridgeBase.replace(/\/$/, '');
  const res = await lanFetch(`${base}/api/saas/relay-print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shopName, printerIp: ip, printerPort: port, ticket }),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && data.ok;
}

async function findLanBridge(printerIp, resolvedBridge = '') {
  if (resolvedBridge) return resolvedBridge;
  for (const candidate of guessBridgeCandidates(printerIp)) {
    try {
      const res = await lanFetch(`${candidate}/api/health`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) return candidate;
    } catch { /* suivant */ }
  }
  return null;
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

export async function printTicket(ticket, { shopName, printerIp, printerPort }, resolvedBridgeRef = { current: '' }) {
  const ip = String(printerIp || '').trim();
  const port = String(printerPort || '9100').trim();
  if (!ip) return { ok: false, reason: 'missing_ip' };

  const portNum = parseInt(port, 10) || 9100;

  if (portNum === 9100 || port === '9100') {
    if (await sendViaNativeTcp(ticket, ip, port)) {
      return { ok: true, method: 'native_tcp' };
    }
    if (isPrivateIp(ip)) {
      const bridge = await findLanBridge(ip, resolvedBridgeRef.current);
      if (bridge && await sendViaLanBridge(ticket, shopName, ip, port, bridge)) {
        resolvedBridgeRef.current = bridge;
        return { ok: true, method: 'lan_bridge' };
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
    return { ok: false, reason: 'tcp_failed' };
  }

  if (await sendViaEpos(ticket, ip, port)) return { ok: true, method: 'epos' };
  return { ok: false, reason: 'epos_failed' };
}

export async function pollOnce(config, handlers = {}) {
  const shopName = String(config.shopName || '').trim();
  if (!shopName) return null;

  const url = `${CLOUD_URL}/api/saas/poll-ticket?shopName=${encodeURIComponent(shopName)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    if (res.status === 404) handlers.onShopNotFound?.();
    return null;
  }

  const data = await res.json();
  if (!data?.ticket) return null;

  handlers.onTicket?.(data.ticket);
  const printResult = await printTicket(data.ticket, config, handlers.resolvedBridgeRef || { current: '' });

  if (printResult.ok) {
    handlers.onPrintSuccess?.(data.ticket, printResult);
  } else {
    await requeueTicket(shopName, data.ticket);
    handlers.onPrintFail?.(data.ticket, printResult);
  }

  return data.ticket;
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Boucle relais — Web Locks garde le poll actif meme en arriere-plan (PWA installee) */
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
    await navigator.locks.request(
      'boutididact-relay',
      { mode: 'exclusive' },
      async () => {
        handlers.onBackgroundReady?.();
        await tick();
      },
    );
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
