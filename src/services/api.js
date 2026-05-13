import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const client = axios.create({
  baseURL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ---- Multi-tenant Headers Interceptor ----
client.interceptors.request.use((config) => {
  try {
    const saved = localStorage.getItem('boutididact_settings');
    if (saved) {
      const s = JSON.parse(saved);
      
      // Hiboutik Auth
      if (s.hiboutikAccount) config.headers['X-Hiboutik-Account'] = s.hiboutikAccount;
      if (s.hiboutikUser) config.headers['X-Hiboutik-User'] = s.hiboutikUser;
      if (s.hiboutikApiKey) config.headers['X-Hiboutik-Api-Key'] = s.hiboutikApiKey;
      if (s.hiboutikStoreId) config.headers['X-Hiboutik-Store-Id'] = s.hiboutikStoreId;
      if (s.hiboutikVendorId) config.headers['X-Hiboutik-Vendor-Id'] = s.hiboutikVendorId;

      // Shop Mentions
      if (s.shopName) config.headers['X-Shop-Name'] = s.shopName;
      if (s.shopAddress) config.headers['X-Shop-Address'] = s.shopAddress;
      if (s.shopSiret) config.headers['X-Shop-Siret'] = s.shopSiret;
      if (s.shopTva) config.headers['X-Shop-Tva'] = s.shopTva;

      // Printer
      if (s.printerIp) config.headers['X-Printer-Ip'] = s.printerIp;
      if (s.printerPort) config.headers['X-Printer-Port'] = s.printerPort;
      // Le routage se fait désormais via le Mode Relais (Vercel -> PC)
      // pour éviter les problèmes de sécurité sur tablette.
    }
  } catch (e) {
    console.error('Erreur lecture headers multi-tenant:', e);
  }

  return config;
});

export const getHealth = async () => {
  const { data } = await client.get('/api/health');
  return data;
};

export const getHiboutikProducts = async () => {
  const { data } = await client.get('/api/hiboutik/products');
  return data;
};

export const getHiboutikCategories = async () => {
  const { data } = await client.get('/api/hiboutik/categories');
  return data;
};

export const checkout = async (payload) => {
  const { data, status } = await client.post('/api/checkout', payload, {
    validateStatus: (s) => s >= 200 && s < 300 || s === 207,
  });
  return { ...data, _status: status };
};

export default client;
