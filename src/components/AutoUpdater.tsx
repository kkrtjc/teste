import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * AutoUpdater - Registra o Service Worker e gerencia o cache offline em segundo plano.
 * NUNCA força recarregamento abrupto de página (window.location.reload) enquanto o usuário
 * estiver navegando, digitando seu CPF ou preenchendo formulários na aplicação.
 */
export function AutoUpdater() {
  useRegisterSW({
    onRegistered(registration) {
      if (!registration) return;
      // Verifica atualizações silenciosamente a cada 30 minutos em background
      const timer = setInterval(() => {
        registration.update().catch(() => {});
      }, 30 * 60 * 1000);
      return () => clearInterval(timer);
    },
    onOfflineReady() {
      console.info('[PWA] Recursos armazenados para uso offline.');
    },
  });

  return null;
}
