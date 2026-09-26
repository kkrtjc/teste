import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  Bot,
  Sparkles
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
  const cardRef = useRef<HTMLDivElement>(null);
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

    const timer = setTimeout(() => {
      const el = findTargetElement();
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const screenHeight = window.innerHeight;
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        // Se for o grid de métricas do plantel (que possui 3 linhas de cards no mobile),
        // rolamos para o topo ('start') para garantir que todos os 6 cards comecem no topo
        // e sobre espaço livre no rodapé para o card flutuante!
        if (currentStep.id === 'dashboard-stats') {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        } else if (rect.top > (screenHeight * 0.40)) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
            inline: 'nearest'
          });
        } else {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }
      } else {
        // No desktop: centraliza suavemente
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 140);

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

  // ── Cálculo Exato das Dimensões do Recorte / Spotlight (Sem cortes arbitrários de altura) ──
  const getSpotlightRect = useCallback(() => {
    if (!targetRect) return null;
    const pad = 6;

    const x = Math.max(2, targetRect.left - pad);
    const y = Math.max(2, targetRect.top - pad);
    const width = targetRect.width + pad * 2;
    const height = targetRect.height + pad * 2;

    return {
      x,
      y,
      width,
      height,
      bottom: y + height,
      right: x + width,
    };
  }, [targetRect]);

  if (!isOpen || !activeGuide || !currentStep) return null;

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const isFormSubStep = currentStep.id.includes('form-guide');
  const isLastStep = !isFormSubStep && stepIndex === activeGuide.steps.length - 1;
  const sRect = getSpotlightRect();

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

  // Dispara o clique no elemento real do DOM quando o usuário toca no elemento ou moldura
  const triggerTargetClick = () => {
    const el = findTargetElement();
    if (!el) return;
    triggerLight();
    const clickable = (el.tagName === 'BUTTON' || el.tagName === 'A' || typeof (el as any).onclick === 'function')
      ? el
      : (el.querySelector('button, a, [role="button"]') as HTMLElement) || el;
    clickable.click();
  };

  // Trata cliques no backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (!targetRect) {
      onClose();
      return;
    }
    const { clientX, clientY } = e;
    const isInside = (
      clientX >= targetRect.left &&
      clientX <= targetRect.right &&
      clientY >= targetRect.top &&
      clientY <= targetRect.bottom
    );
    if (isInside) {
      triggerTargetClick();
      return;
    }
    onClose();
  };

  // ── Cálculo Geométrico Rigoroso: ZERO SOBREPOSIÇÃO entre o Card e a Função Apresentada ──
  const getFluidCardStyle = (): React.CSSProperties => {
    const cardEl = cardRef.current;
    const cardHeight = cardEl ? cardEl.offsetHeight : (isMobile ? 210 : 225);
    const cardWidth = cardEl ? cardEl.offsetWidth : (isMobile ? window.innerWidth - 24 : 390);

    // Fallback padrão se ainda não localizou o elemento no DOM
    if (!sRect) {
      return isMobile 
        ? { position: 'fixed', bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 80px)', left: '12px', right: '12px', zIndex: 10002 }
        : { position: 'fixed', bottom: '32px', right: '32px', width: '390px', zIndex: 10002 };
    }

    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;

    if (isMobile) {
      // No Mobile:
      // O card ocupa a largura total (left: 12px, right: 12px).
      // Portanto, o card DEVE ficar ESTRITAMENTE ACIMA ou ABAIXO do elemento destacado.
      const safeBottomDock = 80; // Altura reservada da dock de navegação inferior
      const spaceBelow = (screenHeight - safeBottomDock) - sRect.bottom;
      const spaceAbove = sRect.y;

      // 1. Se cabe com folga abaixo do elemento destacado:
      if (spaceBelow >= cardHeight + 12) {
        return {
          position: 'fixed',
          top: `${sRect.bottom + 12}px`,
          left: '12px',
          right: '12px',
          zIndex: 10002,
        };
      }

      // 2. Se cabe com folga acima do elemento destacado:
      if (spaceAbove >= cardHeight + 12) {
        return {
          position: 'fixed',
          top: `${Math.max(12, sRect.y - cardHeight - 12)}px`,
          left: '12px',
          right: '12px',
          zIndex: 10002,
        };
      }

      // 3. Se o espaço for justo, escolhe o lado com maior espaço livre
      if (spaceBelow >= spaceAbove) {
        return {
          position: 'fixed',
          bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 80px)',
          left: '12px',
          right: '12px',
          zIndex: 10002,
        };
      } else {
        return {
          position: 'fixed',
          top: 'calc(max(env(safe-area-inset-top, 0px), 12px) + 10px)',
          left: '12px',
          right: '12px',
          zIndex: 10002,
        };
      }
    }

    // No Desktop / Tablet (screenWidth >= 768px):
    const spaceRight = screenWidth - sRect.right;
    const spaceLeft = sRect.x;
    const spaceBelow = screenHeight - sRect.bottom;
    const spaceAbove = sRect.y;

    // 1. Prioridade A: Lateral Direita (se houver pelo menos cardWidth + 24px livres à direita do elemento)
    if (spaceRight >= cardWidth + 24) {
      return {
        position: 'fixed',
        left: `${sRect.right + 16}px`,
        top: `${Math.max(20, Math.min(sRect.y, screenHeight - cardHeight - 20))}px`,
        width: '390px',
        zIndex: 10002,
      };
    }

    // 2. Prioridade B: Lateral Esquerda (se houver pelo menos cardWidth + 24px livres à esquerda do elemento)
    if (spaceLeft >= cardWidth + 24) {
      return {
        position: 'fixed',
        left: `${Math.max(20, sRect.x - cardWidth - 16)}px`,
        top: `${Math.max(20, Math.min(sRect.y, screenHeight - cardHeight - 20))}px`,
        width: '390px',
        zIndex: 10002,
      };
    }

    // 3. Prioridade C: O elemento é largo (ocupa a largura quase toda da tela).
    // Posiciona verticalmente (Abaixo ou Acima), garantindo ZERO colisão!
    if (spaceBelow >= cardHeight + 20) {
      return {
        position: 'fixed',
        top: `${sRect.bottom + 16}px`,
        left: `${Math.max(24, Math.min(sRect.x, screenWidth - cardWidth - 24))}px`,
        width: '390px',
        zIndex: 10002,
      };
    }

    if (spaceAbove >= cardHeight + 20) {
      return {
        position: 'fixed',
        top: `${Math.max(20, sRect.y - cardHeight - 16)}px`,
        left: `${Math.max(24, Math.min(sRect.x, screenWidth - cardWidth - 24))}px`,
        width: '390px',
        zIndex: 10002,
      };
    }

    // 4. Fallback seguro no desktop: ancorado no canto de maior respiro
    if (spaceBelow >= spaceAbove) {
      return {
        position: 'fixed',
        bottom: '24px',
        right: '32px',
        width: '390px',
        zIndex: 10002,
      };
    } else {
      return {
        position: 'fixed',
        top: '24px',
        right: '32px',
        width: '390px',
        zIndex: 10002,
      };
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-auto">
      {/* ── Backdrop Suavemente Opaco (Não muito escuro, não chama atenção, coloca o app em segundo plano elegante) ── */}
      <svg 
        className="fixed inset-0 w-full h-full z-[10000] pointer-events-auto select-none"
        style={{ width: '100vw', height: '100vh' }}
        onClick={handleBackdropClick}
      >
        <defs>
          <mask id="assistant-spotlight-cutout">
            {/* 1. Branco = fundo cobre a página */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* 2. Preto = furo 100% transparente sobre o elemento em foco */}
            {sRect && (
              <rect
                x={sRect.x}
                y={sRect.y}
                width={sRect.width}
                height={sRect.height}
                rx="20"
                ry="20"
                fill="black"
              />
            )}
          </mask>
        </defs>
        {/* Retângulo de véu suave: escurece o suficiente para dar foco ao recurso e ao card, sem ficar preto escuro */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(10, 14, 24, 0.52)"
          mask="url(#assistant-spotlight-cutout)"
          className="cursor-pointer"
        />
      </svg>

      {/* ── Moldura de Destaque Vibrante & Interativa em volta do Recorte ── */}
      {sRect && (
        <div
          className="fixed z-[10001] border-2 border-amber-400 rounded-2xl cursor-pointer pointer-events-auto transition-all duration-300 assistant-spotlight-pulse"
          style={{
            left: sRect.x,
            top: sRect.y,
            width: sRect.width,
            height: sRect.height,
            boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.5), 0 0 35px rgba(245, 158, 11, 0.85), inset 0 0 15px rgba(245, 158, 11, 0.12)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            triggerTargetClick();
          }}
        >
          {/* Badge flutuante sobre a moldura destacada */}
          <div className="absolute -top-3.5 left-3 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-black font-black text-[9px] tracking-wider uppercase shadow-lg flex items-center gap-1 select-none pointer-events-none">
            <Sparkles size={11} className="text-black" />
            <span>{isFormSubStep ? 'Formulário Aberto' : 'Toque para Explorar'}</span>
          </div>
        </div>
      )}

      {/* ── Card Flutuante de Instrução (Hiper Visível, Sobre o Fundo, Zero Sobreposição) ── */}
      <div 
        ref={cardRef}
        style={getFluidCardStyle()}
        className="transition-all duration-300 ease-out animate-scale-up z-[10002]"
      >
        <div className="bg-gradient-to-b from-[#181b2c] to-[#0f111d] border-2 border-amber-400/80 rounded-3xl p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95),_0_0_35px_rgba(245,158,11,0.22)] backdrop-blur-2xl relative overflow-hidden flex flex-col gap-3">
          
          {/* Glow decorativo de topo */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-90" />
          
          {/* Header do Card */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 shadow-md shadow-amber-500/30 flex items-center justify-center">
                  <div className="w-full h-full bg-[#10121d] rounded-[14px] flex items-center justify-center text-amber-400">
                    <Bot size={17} />
                  </div>
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#10121d] rounded-full animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-white tracking-tight">Mura IA</span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-300 border border-amber-500/40">
                    {activeGuide.tabTitle}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-400 block leading-tight mt-0.5">
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
            
            {/* Texto de Instrução Escrito na Tela com Alto Contraste e Legibilidade */}
            <div className="text-xs text-zinc-100 leading-relaxed font-normal bg-[#0b0d16]/90 p-3 rounded-2xl border border-amber-400/20 shadow-inner whitespace-pre-line">
              <p>{renderFormattedText(currentStep.description)}</p>
            </div>
          </div>

          {/* Rodapé com Navegação */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            {/* Marcadores de Etapa */}
            <div className="flex items-center gap-1.5">
              {isFormSubStep ? (
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <Sparkles size={12} />
                  <span>Explorando Formulário</span>
                </span>
              ) : (
                activeGuide.steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === stepIndex 
                        ? 'w-6 bg-gradient-to-r from-amber-400 to-orange-400 shadow-sm shadow-amber-500/60' 
                        : 'w-1.5 bg-zinc-700'
                    }`}
                  />
                ))
              )}
            </div>

            {/* Botões Voltar & Avançar */}
            <div className="flex items-center gap-2">
              {(stepIndex > 0 || isFormSubStep) && (
                <button
                  type="button"
                  onClick={handlePrevClick}
                  className="px-3 py-1.5 rounded-xl border border-white/15 text-xs font-bold text-zinc-200 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Voltar</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNextClick}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-black text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all shadow-lg shadow-amber-500/30 cursor-pointer"
              >
                <span>{isFormSubStep ? 'Continuar Instruções' : isLastStep ? 'Entendi, Concluir' : 'Avançar'}</span>
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
