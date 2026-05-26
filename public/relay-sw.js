/* Service Worker relais — backup si l'onglet est ferme */
const CLOUD_URL = 'https://boutididact-backendd.vercel.app';
const POLL_MS = 5000;

let config = { active: false, shopName: '', printerIp: '', printerPort: '9100', bridgeUrl: '', relayKey: '' };

function relayHeaders(extra = {}) {
  const h = { ...extra };
  if (config.relayKey) h['X-Relay-Key'] = config.relayKey;
  return h;
}
let pollTimer = null;
let lastFail = { id: null, at: 0 };
let cachedBridge = '';
let peekState = { lastId: null, notified: false };

function lanFetch(url, options = {}) {
  return fetch(url, { ...options, targetAddressSpace: 'private' }).catch(() => fetch(url, options));
}

function fetchWithTimeout(url, options = {}, ms = 1800) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return lanFetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

function guessBridgeCandidates(printerIp) {
  const parts = String(printerIp || '').trim().split('.');
  if (parts.length !== 4) return [];
  const base = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const host = parseInt(parts[3], 10);
  const extras = new Set([host, 1, 2, 3, 10, 20, 47, 50, 100, 254]);
  for (let i = 1; i <= 40; i++) extras.add(i);
  return [...extras].map((n) => `http://${base}.${n}:3001`);
}

async function pingBridge(base) {
  const root = base.replace(/\/$/, '');
  for (const path of [`${root}/api/relay/ping`, `${root}/api/health/relay-ping`]) {
    try {
      const res = await fetchWithTimeout(path, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json().catch(() => ({}));
      if (data.ok) return root;
    } catch { /* suivant */ }
  }
  return null;
}

async function discoverBridge(printerIp) {
  const tried = new Set();
  const queue = [];
  const push = (url) => {
    const base = String(url || '').replace(/\/$/, '');
    if (!base || tried.has(base)) return;
    tried.add(base);
    queue.push(base);
  };

  if (cachedBridge) push(cachedBridge);
  if (config.bridgeUrl) push(config.bridgeUrl);

  for (const c of guessBridgeCandidates(printerIp)) push(c);

  for (let i = 0; i < queue.length; i += 12) {
    const batch = queue.slice(i, i + 12);
    const results = await Promise.all(batch.map((b) => pingBridge(b)));
    const hit = results.find(Boolean);
    if (hit) {
      cachedBridge = hit;
      return hit;
    }
  }
  return null;
}

async function tryLanPrint(ticket, shopName, ip, port) {
  const bridge = await discoverBridge(ip);
  if (!bridge) return false;
  try {
    const res = await lanFetch(`${bridge}/api/saas/relay-print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName, printerIp: ip, printerPort: port, ticket }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.ok;
  } catch {
    return false;
  }
}

async function consumeTicket(shopName) {
  try {
    const res = await fetch(`${CLOUD_URL}/api/saas/ack-ticket`, {
      method: 'POST',
      headers: relayHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ shopName }),
    });
    if (res.ok) return;
  } catch { /* ignore */ }
  await fetch(`${CLOUD_URL}/api/saas/poll-ticket?shopName=${encodeURIComponent(shopName)}`);
}

async function pollCloud() {
  if (!config.active || !config.shopName) return;

  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clients.length > 0) return;

  try {
    const url = `${CLOUD_URL}/api/saas/poll-ticket?shopName=${encodeURIComponent(config.shopName.trim())}&peek=1`;
    const res = await fetch(url, { headers: relayHeaders({ Accept: 'application/json' }) });
    if (!res.ok) return;

    const data = await res.json();
    if (!data?.ticket) return;

    const tid = data.ticket.ticketId || 'Inconnu';
    if (lastFail.id === tid && Date.now() - lastFail.at < 15000) return;

    const ip = (data.ticket.printer?.ip || config.printerIp || '').trim();
    const port = data.ticket.printer?.port || config.printerPort || '9100';

    const printed = ip && await tryLanPrint(data.ticket, config.shopName.trim(), ip, port);

    if (printed) {
      await consumeTicket(config.shopName.trim());
      lastFail = { id: null, at: 0 };
      peekState = { lastId: null, notified: false };
      await self.registration.showNotification('Ticket imprime', { body: `#${tid}`, tag: 'boutididact-relay-ticket' });
    } else {
      lastFail = { id: tid, at: Date.now() };
      if (tid !== peekState.lastId) {
        peekState = { lastId: tid, notified: true };
        await self.registration.showNotification('Ticket en attente', {
          body: `#${tid} — demarrez print-server sur le WiFi`,
          tag: 'boutididact-relay-ticket',
        });
      }
    }
  } catch { /* ignore */ }
}

function schedulePoll() {
  if (pollTimer) clearTimeout(pollTimer);
  if (!config.active) return;
  pollTimer = setTimeout(async () => {
    await pollCloud();
    schedulePoll();
  }, POLL_MS);
}

self.addEventListener('install', (e) => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'RELAY_CONFIG') {
    config = { ...config, ...msg.config };
    cachedBridge = config.bridgeUrl || cachedBridge;
    lastFail = { id: null, at: 0 };
    peekState = { lastId: null, notified: false };
    schedulePoll();
  }
  if (msg.type === 'RELAY_STOP') {
    config.active = false;
    if (pollTimer) clearTimeout(pollTimer);
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return self.clients.openWindow('/relais');
    }),
  );
});
