import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'boutididact_is_premium';

export default function useSubscription() {
  const [isPremium, setIsPremium] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Synchroniser avec le serveur au démarrage
    const checkStatus = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${apiUrl}/api/saas/status`);
        const data = await res.json();
        if (data.isPremium) {
          localStorage.setItem(STORAGE_KEY, 'true');
          setIsPremium(true);
        } else {
          localStorage.setItem(STORAGE_KEY, 'false');
          setIsPremium(false);
        }
      } catch (e) {
        console.error('Erreur sync status:', e);
      }
    };
    checkStatus();
  }, []);

  const verify = useCallback(async (sessionId) => {
    setIsVerifying(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/saas/verify-subscription?session_id=${sessionId}`);
      const data = await res.json();
      
      if (data.status === 'premium') {
        localStorage.setItem(STORAGE_KEY, 'true');
        setIsPremium(true);
        return true;
      }
    } catch (e) {
      console.error('Erreur verification subscription:', e);
    } finally {
      setIsVerifying(false);
    }
    return false;
  }, []);

  const setPremiumManually = (val) => {
    localStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
    setIsPremium(val);
  };

  return { isPremium, isVerifying, verify, setPremiumManually };
}
