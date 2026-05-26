const SESSION_KEY = 'boutididact_session';

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function saveSessionToken(token, relaySecret) {
  const sess = getSession() || {};
  if (token) sess.token = token;
  if (relaySecret) sess.relaySecret = relaySecret;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess));
  if (relaySecret) {
    try {
      const raw = localStorage.getItem('boutididact_webrelay_state');
      const state = raw ? JSON.parse(raw) : {};
      state.relayKey = relaySecret;
      localStorage.setItem('boutididact_webrelay_state', JSON.stringify(state));
    } catch { /* ignore */ }
  }
}

/** En-têtes JSON + JWT boutique. */
export function authHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const sess = getSession();
  if (sess?.token) headers.Authorization = `Bearer ${sess.token}`;
  return headers;
}

/** Clé relais pour APK / service worker / poll cloud. */
export function relayHeaders(extra = {}) {
  const headers = { ...extra };
  const sess = getSession();
  const key = sess?.relaySecret
    || (() => {
      try {
        const raw = localStorage.getItem('boutididact_webrelay_state');
        return raw ? JSON.parse(raw).relayKey : '';
      } catch {
        return '';
      }
    })();
  if (key) headers['X-Relay-Key'] = key;
  return headers;
}

export function authAndRelayHeaders(extra = {}) {
  return { ...authHeaders(), ...relayHeaders(extra) };
}
