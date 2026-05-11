import { useEffect, useRef } from 'react';

/**
 * Déclenche `onIdle` après `delay` ms sans interaction utilisateur.
 *  Activé uniquement quand `enabled` est true.
 */
export default function useIdleTimeout({ enabled, delay = 60_000, onIdle }) {
  const timer = useRef(null);

  useEffect(() => {
    if (!enabled) {
      if (timer.current) clearTimeout(timer.current);
      return;
    }

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => onIdle && onIdle(), delay);
    };

    const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'click'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, delay, onIdle]);
}
