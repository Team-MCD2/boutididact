/* Service Worker relais — poll cloud en arriere-plan (PWA /relais installee) */
const CLOUD_URL = 'https://boutididact-backendd.vercel.app';
const POLL_MS = 5000;
const STORE = 'relay-config';

let config = { active: false, shopName: '', printerIp: '', printerPort: '9100' };
let pollTimer = null;
let lastTicketId = null;
let lastFail = { id: null, at: 0 };

function lanFetch(url, options = {}) {
  return fetch(url, { ...options, targetAddressSpace: 'private' });
}

function guessBridgeCandidates(printerIp) {
  const parts = String(printerIp || '').trim().split('.');
  if (parts.length !== 4) return [];
  const base = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const host = parseInt(parts[3], 10);
  const extras = [host, 1, 47, 100, 20, 50, 10, 2, 3];
  return [...new Set(extras.map((n) => `http://${base}.${n}:3001`))];
}

async function tryLanPrint(ticket, shopName, ip, port) {
  for (const base of guessBridgeCandidates(ip)) {
    try {
      const res = await lanFetch(`${base}/api/saas/relay-print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopName, printerIp: ip, printerPort: port, ticket }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) return true;
    } catch { /* suivant */ }
  }
  return false;
}

async function requeue(shopName, ticket) {
  try {
    await fetch(`${CLOUD_URL}/api/saas/push-ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName, ticketData: ticket }),
    });
  } catch { /* ignore */ }
}

async function notifyClients(msg) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((c) => c.postMessage(msg));
}

async function showNotif(title, body) {
  try {
    await self.registration.showNotification(title, {
      body,
      tag: 'boutididact-relay-ticket',
      icon: '/favicon.png',
      renotify: true,
    });
  } catch { /* ignore */ }
}

async function pollCloud() {
  if (!config.active || !config.shopName) return;

  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clients.length > 0) return;

  try {
    const url = `${CLOUD_URL}/api/saas/poll-ticket?shopName=${encodeURIComponent(config.shopName.trim())}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;

    const data = await res.json();
    if (!data?.ticket) return;

    const tid = data.ticket.ticketId || 'Inconnu';
    if (lastTicketId === tid) return;
    if (lastFail.id === tid && Date.now() - lastFail.at < 15000) return;

    await notifyClients({ type: 'TICKET', ticket: data.ticket });

    let printed = false;
    if (config.printerIp) {
      printed = await tryLanPrint(
        data.ticket,
        config.shopName.trim(),
        config.printerIp.trim(),
        config.printerPort || '9100',
      );
    }

    if (printed) {
      lastTicketId = tid;
      lastFail = { id: null, at: 0 };
      await showNotif('Ticket imprime', `#${tid}`);
    } else {
      lastFail = { id: tid, at: Date.now() };
      await requeue(config.shopName.trim(), data.ticket);
      await showNotif('Ticket recu', `#${tid} — ouvrez le relais pour imprimer`);
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

self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('message', (e) => {
  const msg = e.data;
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'RELAY_CONFIG') {
    config = { ...config, ...msg.config };
    lastTicketId = null;
    lastFail = { id: null, at: 0 };
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
