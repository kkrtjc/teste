import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * AutoUpdater - Registra o Service Worker e aplica atualizações automaticamente.
 * Quando uma nova versão do app é publicada, o SW atualiza em background
 * e a próxima navegação do usuário carrega a versão nova sem interrupção.
 */
export function AutoUpdater() {
  const { updateServiceWorker } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return;
      // Check for updates every 60 seconds
      setInterval(() => {
        registration.update().catch(() => {});
      }, 60 * 1000);
    },
    onNeedRefresh() {
      // Auto-apply update silently on next page focus
      updateServiceWorker(false);
    },
    onOfflineReady() {
      console.info('[PWA] App pronto para uso offline.');
    },
  });

  // Apply update when user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateServiceWorker(false).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [updateServiceWorker]);

  return null;
}
