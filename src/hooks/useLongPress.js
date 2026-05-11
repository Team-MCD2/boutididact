import { useCallback, useRef } from 'react';

/**
 * Attache un handler "appui long" (3 s par défaut) à un élément.
 *  Utilisé pour révéler le panneau admin caché via le logo.
 */
export default function useLongPress(callback, ms = 3000) {
  const timer = useRef(null);

  const start = useCallback(() => {
    timer.current = setTimeout(() => callback && callback(), ms);
  }, [callback, ms]);

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  };
}
