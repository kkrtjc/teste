/**
 * Hook de Micro-Feedback Haptico (Vibracao tatil nativa no mobile)
 * Ativa respostas tateis sutis ao tocar em botoes de salvar, confirmar acoes,
 * excluir itens ou navegar entre abas.
 * Nao causa erro em desktops ou sistemas sem suporte a navigator.vibrate.
 */
export function useHaptics() {
  const vibrate = (pattern: number | number[]) => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignora silenciosamente em navegadores sem suporte
    }
  };

  return {
    /** Toque sutil para troca de aba ou selecao leve */
    triggerLight: () => vibrate(10),
    /** Toque medio para cliques em botoes principais */
    triggerMedium: () => vibrate(20),
    /** Toque forte para acoes de impacto ou alteracoes criticas */
    triggerHeavy: () => vibrate(35),
    /** Padrao de sucesso ao concluir gravacao / salvamento */
    triggerSuccess: () => vibrate([15, 30, 20]),
    /** Padrao de alerta */
    triggerWarning: () => vibrate([20, 30, 20]),
    /** Padrao duplo de erro */
    triggerError: () => vibrate([15, 50, 20]),
  };
}
