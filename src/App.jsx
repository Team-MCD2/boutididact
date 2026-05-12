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
    const sess = { shopName: shop?.name, email: shop?.email, loggedAt: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    setSession(sess);
    setSetupComplete(isSetupComplete());
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setAdminOpen(false);
    setScreen(STATES.IDLE);
    setLandingInitialMode('hero');
    setLandingPrefillName('');
  }, []);

  const catalog = useCatalog({ enabled: !!session && setupComplete });
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
        supplements={supplementsState.supplements}
        onAddSupplement={supplementsState.add}
        onRemoveSupplement={supplementsState.remove}
        onClose={() => { /* on bloque la fermeture tant que pas configuré */ }}
        onReload={() => {
          setSetupComplete(isSetupComplete());
          catalog.reload();
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
            supplements={supplementsState.supplements}
            onAddSupplement={supplementsState.add}
            onRemoveSupplement={supplementsState.remove}
            onClose={() => setAdminOpen(false)}
            onReload={() => {
              setSetupComplete(isSetupComplete());
              catalog.reload();
              setAdminOpen(false);
            }}
            onLogout={handleLogout}
          />
        )}
      </AnimatePresence>

      {catalog.loading && <LoadingScreen message="Initialisation du système..." />}
    </>
  );
}
