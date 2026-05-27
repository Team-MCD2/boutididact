import { authHeaders } from '../services/authSession';

const SETTINGS_KEY = 'boutididact_settings';

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  } catch {
    return {};
  }
}

export function isHiboutikConfigured(settings) {
  return Boolean(
    settings?.hiboutikAccount?.trim()
      && settings?.hiboutikUser?.trim()
      && settings?.hiboutikApiKey?.trim(),
  );
}

const WIZARD_PREFIX = 'boutididact_wizard_done_';

export function isWizardDone(shopId) {
  if (!shopId) return true;
  return localStorage.getItem(`${WIZARD_PREFIX}${shopId}`) === '1';
}

export function markWizardDone(shopId) {
  if (shopId) localStorage.setItem(`${WIZARD_PREFIX}${shopId}`, '1');
}

export function resetWizardDone(shopId) {
  if (shopId) localStorage.removeItem(`${WIZARD_PREFIX}${shopId}`);
}

/**
 * @returns {{ level: 'ready'|'warning'|'blocked', title: string, subtitle: string, items: { id: string, label: string, ok: boolean, hint?: string }[] }}
 */
export function computeReadiness({ settings: rawSettings, health, session } = {}) {
  const settings = rawSettings || loadSettings();
  const hiboutikConfigured = isHiboutikConfigured(settings);
  const hiboutikOnline = Boolean(health?.hiboutik?.reachable);
  const relayMode = settings.isRelayMode !== false;
  const printerIp = (settings.printerIp || '').trim();
  const directPrinterOk = Boolean(health?.printer?.online);

  const items = [
    {
      id: 'hiboutik-creds',
      label: 'Identifiants Hiboutik',
      ok: hiboutikConfigured,
      hint: hiboutikConfigured ? undefined : 'Admin → Réglages',
    },
    {
      id: 'hiboutik-live',
      label: 'Catalogue Hiboutik',
      ok: hiboutikOnline,
      hint: hiboutikOnline ? undefined : 'Vérifiez compte, utilisateur et clé API',
    },
    {
      id: 'printer-ip',
      label: relayMode ? 'IP imprimante (pour le relais)' : 'IP imprimante',
      ok: Boolean(printerIp),
      hint: printerIp ? undefined : 'Ex. 192.168.1.26 — même WiFi que le téléphone relais',
    },
  ];

  if (!relayMode) {
    items.push({
      id: 'printer-direct',
      label: 'Imprimante joignable',
      ok: directPrinterOk,
      hint: directPrinterOk ? undefined : 'Mode direct : imprimante sur le même réseau que la borne',
    });
  } else {
    items.push({
      id: 'relay',
      label: 'Relais d\'impression (APK)',
      ok: true,
      hint: 'Démarrez l\'APK sur le téléphone du magasin après installation',
    });
  }

  const blocked = !hiboutikConfigured;
  const warning = !blocked && (!hiboutikOnline || !printerIp || (!relayMode && !directPrinterOk));
  const allCoreOk = hiboutikConfigured && hiboutikOnline && printerIp && (relayMode || directPrinterOk);

  let level = 'ready';
  let title = 'Prêt à vendre';
  let subtitle = session?.shopName
    ? `${session.shopName} — borne opérationnelle`
    : 'Vous pouvez accueillir des clients';

  if (blocked) {
    level = 'blocked';
    title = 'Configuration requise';
    subtitle = 'Complétez l\'installation avant d\'ouvrir la borne';
  } else if (warning) {
    level = 'warning';
    title = 'Presque prêt';
    subtitle = 'Corrigez les points ci-dessous pour éviter les erreurs à la caisse';
  } else if (!allCoreOk) {
    level = 'warning';
    title = 'Presque prêt';
    subtitle = 'Vérifiez les derniers réglages';
  }

  return { level, title, subtitle, items };
}

export async function saveSettingsLocalAndCloud(settings, session) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  if (settings.adminPin) {
    localStorage.setItem('boutididact_admin_pin', settings.adminPin);
  }
  const API = import.meta.env.VITE_API_URL || '';
  if ((session?.shopId || session?.shopName) && API) {
    await fetch(`${API}/api/saas/save-settings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        shopId: session.shopId,
        shopName: session.shopName,
        settings,
        address: settings.shopAddress,
        siret: settings.shopSiret,
        tva: settings.shopTva,
      }),
    });
  }
}
