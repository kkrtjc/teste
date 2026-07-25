import { useEffect } from 'react';

declare const __APP_BUILD_TIME__: number;

export function AutoUpdater() {
  useEffect(() => {
    // Save current build version to localStorage
    const currentBuild = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : Date.now();
    const storedBuild = localStorage.getItem('@mura-manager:last_build_time');

    if (storedBuild && Number(storedBuild) !== currentBuild) {
      console.log('✨ Nova versão detectada! Atualizando app...');
    }
    localStorage.setItem('@mura-manager:last_build_time', String(currentBuild));

    // Service Worker Cleanup (Prevent stale mobile PWA caches)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }

    // Function to check server for new build
    const checkForUpdates = async () => {
      try {
        const res = await fetch(`/?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        if (!res.ok) return;
        const html = await res.text();
        
        // Find main script bundle hash in fetched HTML
        const scriptMatch = html.match(/src="\/assets\/index-[^"]+\.js"/);
        const currentScript = Array.from(document.querySelectorAll('script'))
          .map(s => s.getAttribute('src'))
          .find(src => src && src.includes('/assets/index-'));

        if (scriptMatch && currentScript && scriptMatch[0] !== `src="${currentScript}"`) {
          console.warn('🚀 Novo deploy encontrado no servidor! Recarregando...');
          // Clear caches & reload
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
          }
          window.location.reload();
        }
      } catch {
        // Ignore network errors silently during polling
      }
    };

    // Check on tab focus / visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    window.addEventListener('focus', checkForUpdates);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Poll every 30 seconds
    const interval = setInterval(checkForUpdates, 30000);

    return () => {
      window.removeEventListener('focus', checkForUpdates);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  return null;
}
