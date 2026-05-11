import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import IdleScreen from './screens/IdleScreen';
import MenuScreen from './screens/MenuScreen';
import PaymentScreen from './screens/PaymentScreen';
import ProcessingScreen from './screens/ProcessingScreen';
import SuccessScreen from './screens/SuccessScreen';
import ErrorScreen from './screens/ErrorScreen';
import AdminScreen from './screens/AdminScreen';

import useCatalog from './hooks/useCatalog';
import useCart from './hooks/useCart';
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

export default function App() {
  const [screen, setScreen] = useState(STATES.IDLE);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [adminOpen, setAdminOpen] = useState(false);

  const catalog = useCatalog();
  const cart = useCart();

  const goIdle = useCallback(() => {
    cart.clear();
    setResult(null);
    setError(null);
    setScreen(STATES.IDLE);
  }, [cart]);

  // Inactivité : retour idle uniquement depuis MENU/PAYMENT/ERROR
  const idleEnabled = [STATES.MENU, STATES.PAYMENT, STATES.ERROR].includes(screen);
  useIdleTimeout({ enabled: idleEnabled, delay: IDLE_MS, onIdle: goIdle });

  // Empêcher zoom/pinch et menu contextuel en mode borne
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('gesturestart', prevent);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('gesturestart', prevent);
    };
  }, []);

  // Confirmer la commande
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
      // Sécurité : si on est en mode fallback, on passe skipHiboutik (le BFF refusera si offline non autorisé)
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
        message:
          data.message ||
          e.message ||
          'Erreur inconnue lors du traitement de la commande.',
      });
      setScreen(STATES.ERROR);
    }
  };

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
            onClose={() => setAdminOpen(false)}
            onReload={() => {
              catalog.reload();
              setAdminOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Splash de chargement initial */}
      {catalog.loading && screen === STATES.IDLE && null}
    </>
  );
}
