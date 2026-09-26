import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * AutoUpdater - Registra o Service Worker e gerencia o cache offline em segundo plano.
 * NUNCA força recarregamento abrupto de página (window.location.reload) enquanto o usuário
 * estiver navegando, digitando seu CPF ou preenchendo formulários na aplicação.
 */
export function AutoUpdater() {
  useRegisterSW({
    onNeedRefresh() {
      // Quando há uma nova versão disponível, NÃO recarrega a página automaticamente.
      // O novo SW fica pronto e a atualização entra em vigor de forma transparente na próxima sessão.
      console.info('[PWA] Nova versão pronta em background.');
    },
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
