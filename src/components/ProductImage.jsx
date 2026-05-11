import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Affiche l'image d'un produit Hiboutik via le BFF (proxy).
 * Si l'API retourne 204 (pas d'image), 502 ou si l'<img> échoue, on affiche
 * l'emoji de fallback à la place.
 */
export default function ProductImage({ productId, fallback, className = '', alt = '' }) {
  const [hasImage, setHasImage] = useState(null); // null = checking, true = display, false = fallback

  useEffect(() => {
    if (!productId || typeof productId !== 'number') {
      setHasImage(false);
      return;
    }
    let alive = true;
    (async () => {
      try {
        // HEAD/GET léger via fetch pour éviter d'attendre le binaire si 204
        const r = await fetch(`${API_URL}/api/hiboutik/products/${productId}/image`, {
          method: 'GET',
        });
        if (!alive) return;
        if (r.status === 200) setHasImage(true);
        else setHasImage(false);
      } catch {
        if (alive) setHasImage(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [productId]);

  if (hasImage === true) {
    return (
      <img
        src={`${API_URL}/api/hiboutik/products/${productId}/image`}
        alt={alt}
        loading="lazy"
        onError={() => setHasImage(false)}
        className={className}
      />
    );
  }
  return <span className={className}>{fallback}</span>;
}
