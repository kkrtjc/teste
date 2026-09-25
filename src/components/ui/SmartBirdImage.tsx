import React, { useState, useEffect } from 'react';
import { getSyncCachedImage, getCachedBirdImage } from '../../lib/birdImageCache';

interface SmartBirdImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  gender?: 'Macho' | 'Fêmea' | string;
  className?: string;
  fallbackClassName?: string;
}

export const SmartBirdImage = React.memo(function SmartBirdImage({
  src,
  alt = 'Foto da ave',
  gender,
  className = 'w-full h-full object-cover',
  fallbackClassName,
  ...props
}: SmartBirdImageProps) {
  // 1. Tenta carregar síncrono da memória RAM do celular (0ms absoluto)
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() => {
    if (!src) return null;
    return getSyncCachedImage(src) || src;
  });
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      setResolvedSrc(null);
      return;
    }

    setHasError(false);

    // Se já é base64 local, usa imediatamente
    if (src.startsWith('data:')) {
      setResolvedSrc(src);
      return;
    }

    let isMounted = true;
    // Consulta o cache local do celular (IndexedDB) ou baixa e armazena em background
    getCachedBirdImage(src).then(cached => {
      if (isMounted && cached) {
        setResolvedSrc(cached);
      }
    }).catch(() => {
      // Se falhar o cache, mantém a URL original
      if (isMounted) setResolvedSrc(src);
    });

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!resolvedSrc || hasError) {
    return (
      <span className={fallbackClassName || "text-5xl group-hover:scale-105 transition-transform duration-300 select-none opacity-40"}>
        {gender === 'Macho' ? '🐓' : '🐔'}
      </span>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
      className={className}
      {...props}
    />
  );
});
