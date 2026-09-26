import { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  Bot
} from 'lucide-react';
import { type TabGuide, type AssistantStep } from '../../lib/assistantSteps';
import { useHaptics } from '../../hooks/useHaptics';

interface SmartAssistantModalProps {
  isOpen: boolean;
  activeGuide: TabGuide | null;
  currentStep: AssistantStep | null;
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="text-amber-300 font-black">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export const SmartAssistantModal = memo(function SmartAssistantModal({
  isOpen,
  activeGuide,
  currentStep,
  stepIndex,
  onNext,
  onPrev,
  onClose
}: SmartAssistantModalProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const { triggerLight, triggerSuccess } = useHaptics();

  // Encontra o elemento alvo suportando múltiplos seletores de fallback
  const findTargetElement = useCallback((): HTMLElement | null => {
    if (!currentStep) return null;
    const isMobile = window.innerWidth < 768;
    const targetIds = currentStep.targetId.split(',').map(s => s.trim().replace(/^#/, ''));

    for (const tid of targetIds) {
      let el: HTMLElement | null = null;
      if (isMobile) {
        el = document.getElementById(`mobile-${tid}`);
      }
      if (!el) {
        el = document.getElementById(tid);
      }
      if (!el) {
        el = document.querySelector(`#${tid}`) || document.querySelector(`[data-guide-id="${tid}"]`);
      }
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return el;
        }
      }
    }
    return null;
  }, [currentStep]);

  // Rola suavemente até o elemento em foco garantindo visibilidade total sem colisão com o card
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    // Aguarda montagem da view
    const timer = setTimeout(() => {
      const el = findTargetElement();
      if (el) {
        const rect = el.getBoundingClientRect();
        const screenHeight = window.innerHeight;
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
          // No mobile:
          // Se o elemento estiver abaixo do terço superior (rect.top > screenHeight * 0.40),
          // o card ficará no topo da tela. Portanto, rolamos para a parte inferior (block: 'end').
          // Se o elemento estiver no topo, o card ficará no rodapé, então rolamos para o topo (block: 'start').
          const placeCardAtTop = rect.top > (screenHeight * 0.40);
          el.scrollIntoView({
            behavior: 'smooth',
            block: placeCardAtTop ? 'end' : 'start',
            inline: 'nearest'
          });
        } else {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [isOpen, currentStep, findTargetElement]);

  // Monitora a posição do elemento com requestAnimationFrame e listeners passivos (elimina layout thrashing)
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    let rafId: number | null = null;
    let scheduled = false;

    const updateTarget = () => {
      scheduled = false;
      const el = findTargetElement();
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(prev => {
            if (!prev) return rect;
            // Previne re-render se as coordenadas não mudaram perceptivelmente
            if (
              Math.abs(prev.top - rect.top) < 1 &&
              Math.abs(prev.left - rect.left) < 1 &&
              Math.abs(prev.width - rect.width) < 1 &&
              Math.abs(prev.height - rect.height) < 1
            ) {
              return prev;
            }
            return rect;
          });
          return;
        }
      }
      setTargetRect(null);
    };

    const requestUpdate = () => {
      if (!scheduled) {
        scheduled = true;
        rafId = requestAnimationFrame(updateTarget);
      }
    };

    // Atualização inicial imediata
    updateTarget();

    // Listeners com passive: true para garantir 60+ FPS sem travar o scroll da thread principal
    window.addEventListener('resize', requestUpdate, { passive: true });
    window.addEventListener('scroll', requestUpdate, { passive: true, capture: true });

    // Observa redimensionamentos do elemento alvo caso ele mude dinamicamente de tamanho
    const el = findTargetElement();
    let resizeObserver: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      try {
        resizeObserver = new ResizeObserver(() => requestUpdate());
        resizeObserver.observe(el);
      } catch {}
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', requestUpdate);
      window.removeEventListener('scroll', requestUpdate, true);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [isOpen, currentStep, findTargetElement]);

  // Suporte a navegação por teclado (Acessibilidade & Desktop Power Users)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNext, onPrev, onClose]);

  if (!isOpen || !activeGuide || !currentStep) return null;

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const isLastStep = stepIndex === activeGuide.steps.length - 1;

  const handleNextClick = () => {
    if (isLastStep) {
      triggerSuccess();
    } else {
      triggerLight();
    }
    onNext();
  };

  const handlePrevClick = () => {
    triggerLight();
    onPrev();
  };

  // Cálculo de Posicionamento Fluido do Card para NUNCA tampar o elemento destacado
  const getFluidCardStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return isMobile 
        ? { position: 'fixed', bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 84px)', left: '12px', right: '12px', zIndex: 10002 }
        : { position: 'fixed', bottom: '32px', right: '32px', width: '400px', zIndex: 10002 };
    }

    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;

    if (isMobile) {
      // No mobile:
      // Se o elemento estiver abaixo de 40% da tela, o card fica no topo livre
      if (targetCenterY > screenHeight * 0.40) {
        return {
          position: 'fixed',
          top: 'calc(max(env(safe-area-inset-top, 0px), 12px) + 12px)',
          left: '12px',
          right: '12px',
          zIndex: 10002,
        };
      } else {
        // Se o elemento estiver na metade superior, o card fica no rodapé (acima da dock)
        return {
          position: 'fixed',
          bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 84px)',
          left: '12px',
          right: '12px',
          zIndex: 10002,
        };
      }
    }

    // Desktop:
    // Analisa a posição do elemento para garantir 0% de sobreposição
    const isTargetOnRight = targetCenterX > (screenWidth / 2);
    const isTargetOnBottom = targetCenterY > (screenHeight / 2);

    if (isTargetOnRight) {
      // Elemento no lado direito -> posiciona o card no lado esquerdo
      return {
        position: 'fixed',
        left: screenWidth > 960 ? '280px' : '32px',
        top: isTargetOnBottom ? '80px' : `${Math.max(80, Math.min(targetRect.bottom + 20, screenHeight - 320))}px`,
        width: '400px',
        zIndex: 10002,
      };
    } else {
      // Elemento no lado esquerdo -> posiciona o card no lado direito
      const verticalPos = isTargetOnBottom ? { top: '80px' } : { bottom: '32px' };
      return {
        position: 'fixed',
        right: '32px',
        ...verticalPos,
        width: '400px',
        zIndex: 10002,
      };
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-auto">
      {/* ── Backdrop Escurecido com RECORTE TRANSPARENTE 100% NÍTIDO no Alvo (SVG Cutout Mask) ── */}
      {/* O furo recortado tem 0% de opacidade e 0px de blur, permitindo leitura cristalina de todas as opções */}
      <svg 
        className="fixed inset-0 w-full h-full z-[10000] pointer-events-auto select-none"
        style={{ width: '100vw', height: '100vh' }}
        onClick={onClose}
      >
        <defs>
          <mask id="assistant-spotlight-cutout">
            {/* 1. Tudo Branco = fundo escuro cobre a página inteira */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* 2. Recorte Preto = 100% TRANSPARENTE (furo perfeito sem NENHUMA opacidade sobre o elemento) */}
            {targetRect && (
              <rect
                x={Math.max(2, targetRect.left - 6)}
                y={Math.max(2, targetRect.top - 6)}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Retângulo escurecido cobrindo a tela inteira EXCETO o furo do recorte */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(5, 7, 15, 0.78)"
          mask="url(#assistant-spotlight-cutout)"
          className="cursor-pointer"
        />
      </svg>

      {/* ── Borda Pulsante Elegante em volta do Recorte ── */}
      {targetRect && (
        <div
          className="fixed z-[10001] border-2 border-amber-400 rounded-2xl pointer-events-none transition-all duration-300 assistant-spotlight-pulse"
          style={{
            left: Math.max(2, targetRect.left - 6),
            top: Math.max(2, targetRect.top - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: '0 0 25px rgba(245, 158, 11, 0.85), inset 0 0 15px rgba(245, 158, 11, 0.15)',
          }}
        />
      )}

      {/* ── Card Flutuante da Assistente Mura IA (Visual & Instruções na Tela) ── */}
      <div 
        style={getFluidCardStyle()}
        className="transition-all duration-300 ease-out animate-scale-up z-[10002]"
      >
        <div className="bg-[#0f111a]/98 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-xl relative overflow-hidden flex flex-col gap-3">
          
          {/* Header da Assistente */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2.5">
              {/* Avatar da IA com Brilho Pulsante */}
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center">
                  <div className="w-full h-full bg-[#121420] rounded-[14px] flex items-center justify-center text-amber-400">
                    <Bot size={18} />
                  </div>
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#121420] rounded-full animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-white tracking-tight">Mura IA</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {activeGuide.tabTitle}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-400/90 block leading-tight mt-0.5">
                  {currentStep.badge}
                </span>
              </div>
            </div>

            {/* Botão Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Fechar instruções"
            >
              <X size={18} />
            </button>
          </div>

          {/* Título do Passo */}
          <div className="space-y-1">
            <h3 className="font-black text-sm text-white flex items-center gap-1.5 leading-snug">
              <span className="text-amber-400">❖</span>
              <span>{currentStep.title}</span>
            </h3>
            
            {/* Texto de Instrução Escrito na Tela com Alto Contraste */}
            <div className="text-xs text-zinc-200 leading-relaxed font-normal bg-black/50 p-3 rounded-xl border border-white/10">
              <p>{renderFormattedText(currentStep.description)}</p>
            </div>
          </div>

          {/* Rodapé com Navegação */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            {/* Marcadores de Etapa */}
            <div className="flex items-center gap-1.5">
              {activeGuide.steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === stepIndex 
                      ? 'w-6 bg-gradient-to-r from-amber-400 to-orange-400 shadow-sm shadow-amber-500/50' 
                      : 'w-1.5 bg-zinc-700'
                  }`}
                />
              ))}
            </div>

            {/* Botões Voltar & Avançar */}
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrevClick}
                  className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Voltar</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNextClick}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <span>{isLastStep ? 'Entendi, Concluir' : 'Avançar'}</span>
                {isLastStep ? <CheckCircle2 size={15} /> : <ChevronRight size={15} />}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
});
