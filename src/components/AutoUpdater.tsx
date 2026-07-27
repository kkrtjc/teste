import { useEffect } from 'react';

export function AutoUpdater() {
  useEffect(() => {
    try {
      // Service Worker Cleanup (Prevent stale mobile PWA caches)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          for (const registration of registrations) {
            registration.unregister();
          }
        }).catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, []);

  return null;
}
