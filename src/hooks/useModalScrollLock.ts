import { useEffect } from 'react';

/**
 * Gerenciador centralizado de bloqueio de rolagem do fundo (Background Scroll Lock).
 * Utiliza contagem de referências para garantir que múltiplos modais empilhados
 * (ex: Modal de Assinatura abrindo Confirmação) nunca destravem o fundo precocemente.
 */
let activeLocksCount = 0;

export function lockBackgroundScroll(): void {
  if (typeof document === 'undefined') return;

  activeLocksCount++;

  if (activeLocksCount === 1) {
    // Bloqueia rolagem no body e html
    document.body.classList.add('modal-open-lock');
    document.documentElement.classList.add('modal-open-lock');

    // Bloqueia rolagem e interação no container de scroll principal do app
    const mainContainer = document.getElementById('main-scroll-container');
    if (mainContainer) {
      mainContainer.classList.add('main-scroll-locked');
      mainContainer.style.overflow = 'hidden';
      mainContainer.style.pointerEvents = 'none';
      mainContainer.style.touchAction = 'none';
    }
  }
}

export function unlockBackgroundScroll(): void {
  if (typeof document === 'undefined') return;

  activeLocksCount = Math.max(0, activeLocksCount - 1);

  if (activeLocksCount === 0) {
    document.body.classList.remove('modal-open-lock');
    document.documentElement.classList.remove('modal-open-lock');

    const mainContainer = document.getElementById('main-scroll-container');
    if (mainContainer) {
      mainContainer.classList.remove('main-scroll-locked');
      mainContainer.style.overflow = '';
      mainContainer.style.pointerEvents = '';
      mainContainer.style.touchAction = '';
    }
  }
}

/**
 * Hook React para travar a rolagem do fundo enquanto um modal estiver aberto.
 * Ao desmontar o componente, destrava automaticamente com segurança total.
 * 
 * @param isOpen booleano que indica se o modal está ativo/visível
 */
export function useModalScrollLock(isOpen: boolean = true): void {
  useEffect(() => {
    if (!isOpen) return;

    lockBackgroundScroll();

    return () => {
      unlockBackgroundScroll();
    };
  }, [isOpen]);
}
