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

import useCatalog from './hooks/useCatalog';
import useCart from './hooks/useCart';
import useSupplements from './hooks/useSupplements';
import useIdleTimeout from './hooks/useIdleTimeout';
import { checkout } from './services/api';

import LandingScreen from './screens/LandingScreen.jsx';

const STATES = {
  IDLE: 'idle',
  MENU: 'menu',
  PAYMENT: 'payment',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
};

const IDLE_MS = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS || 60000);

export default function App() {
  const [setupComplete, setSetupComplete] = useState(() => {
    return localStorage.getItem('boutididact_setup_complete') === 'true';
  });
  const [isSubscribing, setIsSubscribing] = useState(false);

  const [screen, setScreen] = useState(STATES.IDLE);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);

  // Détection du retour de paiement
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      // Le paiement est passé, on autorise l'accès à la configuration
      localStorage.setItem('boutididact_setup_complete', 'true');
      setSetupComplete(true);
      setAdminOpen(true); // Ouvrir direct l'admin pour la config API
    }
  }, []);

  const catalog = useCatalog();
  const cart = useCart();
  const supplementsState = useSupplements();

  const handleSubscribe = async (form) => {
    setIsSubscribing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/stripe-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          boutiqueName: form.name, 
          boutiqueEmail: form.email,
          boutiquePassword: form.password // This will be passed to metadata
        })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert('Erreur: ' + (data.message || 'Impossible de créer la session.'));
    } catch (e) {
      alert('Erreur réseau.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const goIdle = useCallback(() => {
    cart.clear();
    setResult(null);
    setError(null);
    setScreen(STATES.IDLE);
  }, [cart]);

  // ... (rest of useEffect and functions)
  
  // Inactivité : retour idle uniquement depuis MENU/PAYMENT/ERROR
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
      if (catalog.source === 'fallback') payload.skipHiboutik = true;
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

  if (!setupComplete) {
    return <LandingScreen onSubscribe={handleSubscribe} isSubscribing={isSubscribing} />;
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
            supplements={supplementsState.supplements}
            onAddSupplement={supplementsState.add}
            onRemoveSupplement={supplementsState.remove}
            onClose={() => setAdminOpen(false)}
            onReload={() => {
              catalog.reload();
              setAdminOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {catalog.loading && <LoadingScreen message="Initialisation du système..." />}
    </>
  );
}
