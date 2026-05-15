import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import IdleScreen from './screens/IdleScreen';
import MenuScreen from './screens/MenuScreen';
import PaymentScreen from './screens/PaymentScreen';
import ProcessingScreen from './screens/ProcessingScreen';
import SuccessScreen from './screens/SuccessScreen';
import ErrorScreen from './screens/ErrorScreen';
import AdminScreen from './screens/AdminScreen';
import LoadingScreen from './components/LoadingScreen';
import LandingScreen from './screens/LandingScreen.jsx';
import AdminSetupScreen from './screens/AdminSetupScreen.jsx';
import RelayGuideScreen from './screens/RelayGuideScreen.jsx';

import useCatalog from './hooks/useCatalog';
import useCart from './hooks/useCart';
import useSupplements from './hooks/useSupplements';
import useIdleTimeout from './hooks/useIdleTimeout';
import { checkout } from './services/api';

const STATES = {
  IDLE: 'idle',
  MENU: 'menu',
  PAYMENT: 'payment',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
};

const IDLE_MS = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS || 60000);
const API = import.meta.env.VITE_API_URL || '';

const SESSION_KEY = 'boutididact_session';

const isSetupComplete = () => {
  try {
    const s = JSON.parse(localStorage.getItem('boutididact_settings') || '{}');
    return Boolean(s.hiboutikAccount && s.hiboutikUser && s.hiboutikApiKey);
  } catch {
    return false;
  }
};

export default function App() {
  // Auth session (boutique connectée)
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  });
  const [activeTab, setActiveTab] = useState('shops'); // 'shops', 'relay'
  const [setupComplete, setSetupComplete] = useState(isSetupComplete);

  // Mode initial du LandingScreen (en cas de retour Stripe)
  const [landingInitialMode, setLandingInitialMode] = useState('hero');
  const [landingPrefillName, setLandingPrefillName] = useState('');

  // Kiosque
  const [screen, setScreen] = useState(STATES.IDLE);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);

  // ---- Retour Stripe ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');
    if (payment === 'success' && sessionId) {
      (async () => {
        try {
          const res = await fetch(`${API}/api/saas/verify-subscription?session_id=${sessionId}`);
          const data = await res.json();
          if (data.status === 'paid') {
            setLandingPrefillName(data.shop?.name || '');
            setLandingInitialMode('waiting');
          }
        } catch (e) {
          console.error('verify-subscription:', e);
        } finally {
          const url = new URL(window.location.href);
          url.searchParams.delete('payment');
          url.searchParams.delete('session_id');
          window.history.replaceState({}, document.title, url.pathname + url.search);
        }
      })();
    } else if (payment === 'cancelled') {
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  }, []);

  // ---- Force ouverture admin si connecté mais pas configuré ----
  useEffect(() => {
    if (session && !setupComplete) {
      setAdminOpen(true);
    }
  }, [session, setupComplete]);

  const handleLoginSuccess = useCallback((shop) => {
    const sess = { shopId: shop?.id, shopName: shop?.name, email: shop?.email, loggedAt: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    
    // Récupération des réglages existants ou création par défaut
    let currentSettings = {};
    try {
      currentSettings = JSON.parse(localStorage.getItem('boutididact_settings') || '{}');
    } catch (e) {}

    // Fusion intelligente : on ne laisse pas le Cloud vider nos accès Hiboutik locaux s'ils existent déjà
    const cloudSettings = shop?.settings || {};
    const newSettings = {
      ...currentSettings,
      ...cloudSettings,
      // On protège les accès Hiboutik : priorité au local s'ils sont remplis et que le cloud est vide
      hiboutikAccount: cloudSettings.hiboutikAccount || currentSettings.hiboutikAccount || '',
      hiboutikUser: cloudSettings.hiboutikUser || currentSettings.hiboutikUser || '',
      hiboutikApiKey: cloudSettings.hiboutikApiKey || currentSettings.hiboutikApiKey || '',
      // Priorité aux données de la fiche client Cloud pour les infos légales
      shopName: shop?.name || cloudSettings.shopName || currentSettings.shopName || '',
      shopAddress: shop?.address || cloudSettings.shopAddress || currentSettings.shopAddress || '',
      shopSiret: shop?.siret || cloudSettings.shopSiret || currentSettings.shopSiret || '',
      shopTva: shop?.tva || cloudSettings.shopTva || currentSettings.shopTva || '',
    };

    localStorage.setItem('boutididact_settings', JSON.stringify(newSettings));
    
    // SYNC PIN dédié
    if (newSettings.adminPin) {
      localStorage.setItem('boutididact_admin_pin', newSettings.adminPin);
    }
    
    setSession(sess);
    setSetupComplete(isSetupComplete());
  }, []);

  const handleLogout = useCallback(() => {
    // Clear session
    sessionStorage.removeItem(SESSION_KEY);
    // Reset state
    setSession(null);
    setAdminOpen(false);
    setScreen(STATES.IDLE);
    setLandingInitialMode('hero');
    setLandingPrefillName('');
  }, []);

  const catalog = useCatalog({ enabled: !!session && setupComplete, shopId: session?.shopId, shopName: session?.shopName || '' });
  const cart = useCart();
  const supplementsState = useSupplements();

  const goIdle = useCallback(() => {
    cart.clear();
    setResult(null);
    setError(null);
    setScreen(STATES.IDLE);
  }, [cart]);

  const idleEnabled = [STATES.MENU, STATES.PAYMENT, STATES.ERROR].includes(screen);
  useIdleTimeout({ enabled: idleEnabled, delay: IDLE_MS, onIdle: goIdle });

  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('gesturestart', prevent);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('gesturestart', prevent);
    };
  }, []);

  const handleCheckout = async () => {
    setScreen(STATES.PROCESSING);
    setError(null);
    try {
      const payload = {
        paymentMethod,
        items: cart.items.map((it) => ({
          productId: it.productId ?? it.id,
          name: it.name,
          price: Number(it.price),
          quantity: Number(it.quantity),
          taxRate: Number(it.taxRate || 0),
        })),
      };
      const data = await checkout(payload);
      // FIX: Quand Hiboutik provisionne des produits locaux, on les RETIRE du catalogue AI
      // (ils existent désormais dans Hiboutik et seront chargés via l'API).
      // Cela évite la duplication "Commander" dans la carte.
      if (data?.idMapping && Object.keys(data.idMapping).length > 0) {
        try {
          const stored = JSON.parse(localStorage.getItem('ai_products') || '[]');
          const mappedLocalIds = new Set(Object.keys(data.idMapping));
          const cleaned = stored.filter(p => !mappedLocalIds.has(String(p.id)));
          localStorage.setItem('ai_products', JSON.stringify(cleaned));
          catalog.reload();
          catalog.pushToCloud();
        } catch (e) { /* ignore */ }
      }
      setResult(data);
      setScreen(STATES.SUCCESS);
    } catch (e) {
      const data = e.response?.data || {};
      setError({
        code: data.error || 'unknown_error',
        stage: data.stage || null,
        hiboutik: data.hiboutik || null,
        message: data.message || e.message || 'Erreur inconnue lors du traitement.',
      });
      setScreen(STATES.ERROR);
    }
  };

  // ---- Routes Spéciales ----
  if (window.location.pathname === '/admin-setup') {
    return <AdminSetupScreen onBack={() => { window.location.href = '/'; }} />;
  }
  if (window.location.pathname === '/relay-guide') {
    return <RelayGuideScreen onBack={() => { window.location.href = '/'; }} />;
  }

  // ---- Rendus selon état d'auth ----
  if (!session) {
    return (
      <LandingScreen
        initialMode={landingInitialMode}
        prefillShopName={landingPrefillName}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Connecté mais pas encore de paramètres Hiboutik : on force l'admin
  if (!setupComplete) {
    return (
      <AdminScreen
        key="admin-setup"
        health={catalog.health}
        session={session}
        forceSettings
        loading={catalog.loading}
        supplements={supplementsState.supplements}
        onAddSupplement={supplementsState.add}
        onRemoveSupplement={supplementsState.remove}
        onClose={() => { /* on bloque la fermeture tant que pas configuré */ }}
        onReload={async () => {
          setSetupComplete(isSetupComplete());
          await catalog.reload();
          supplementsState.reload();
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {screen === STATES.IDLE && (
          <IdleScreen
            key="idle"
            health={catalog.health}
            onStart={() => setScreen(STATES.MENU)}
          />
        )}
      </AnimatePresence>

      {screen === STATES.MENU && (
        <MenuScreen
          products={catalog.products}
          categories={catalog.categories}
          source={catalog.source}
          health={catalog.health}
          cart={cart}
          supplements={supplementsState.supplements}
          onAdd={cart.add}
          onUpdate={cart.update}
          onClear={cart.clear}
          onCancel={goIdle}
          onCheckout={() => setScreen(STATES.PAYMENT)}
          onAdmin={() => setAdminOpen(true)}
        />
      )}

      <AnimatePresence>
        {screen === STATES.PAYMENT && (
          <PaymentScreen
            key="payment"
            totalAmount={cart.totalAmount}
            onBack={() => setScreen(STATES.MENU)}
            onPay={(method) => {
              setPaymentMethod(method);
              handleCheckout();
            }}
          />
        )}

        {screen === STATES.PROCESSING && (
          <ProcessingScreen key="processing" paymentMethod={paymentMethod} />
        )}

        {screen === STATES.SUCCESS && (
          <SuccessScreen key="success" result={result} onDone={goIdle} />
        )}

        {screen === STATES.ERROR && (
          <ErrorScreen
            key="error"
            error={error}
            onRetry={() => setScreen(STATES.PAYMENT)}
            onCancel={goIdle}
          />
        )}

        {adminOpen && (
          <AdminScreen
            key="admin"
            health={catalog.health}
            session={session}
            loading={catalog.loading}
            supplements={supplementsState.supplements}
            onAddSupplement={supplementsState.add}
            onRemoveSupplement={supplementsState.remove}
            onClose={() => setAdminOpen(false)}
            onReload={async () => {
              setSetupComplete(isSetupComplete());
              await catalog.reload();
              supplementsState.reload();
            }}
            onCatalogChange={async () => {
              setSetupComplete(isSetupComplete());
              await catalog.reload();
              supplementsState.reload();
              catalog.pushToCloud();
            }}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>

      {catalog.loading && catalog.products.length === 0 && <LoadingScreen message="Initialisation du système..." />}
    </>
  );
}
