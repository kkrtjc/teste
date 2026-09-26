import { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  RotateCcw,
  Bot
} from 'lucide-react';
import { type TabGuide, type AssistantStep } from '../../lib/assistantSteps';
import { useHaptics } from '../../hooks/useHaptics';

interface SmartAssistantModalProps {
  isOpen: boolean;
  activeGuide: TabGuide | null;
  currentStep: AssistantStep | null;
  stepIndex: number;
  isSpeaking: boolean;
  isMuted: boolean;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onToggleMute: () => void;
  onRepeatSpeech: () => void;
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
  isSpeaking,
  isMuted,
  onNext,
  onPrev,
  onClose,
  onToggleMute,
  onRepeatSpeech
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

  // Monitora a posição do elemento com ResizeObserver e scroll listener
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    const updateTarget = () => {
      const el = findTargetElement();
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setTargetRect(rect);
          return;
        }
      }
      setTargetRect(null);
    };

    updateTarget();
    const interval = setInterval(updateTarget, 100);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
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

      {/* ── Card Flutuante da Assistente Mura IA (Fala & Legenda na Tela) ── */}
      <div 
        style={getFluidCardStyle()}
        className="transition-all duration-400 ease-out animate-scale-up z-[10002]"
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

            {/* Controles de Áudio & Fechar */}
            <div className="flex items-center gap-1">
              {/* Efeito Visual de Onda de Áudio Quando a IA Fala */}
              {isSpeaking ? (
                <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/15 border border-amber-500/30 rounded-lg mr-1 animate-pulse" title="Mura IA falando">
                  <div className="w-1 bg-amber-400 rounded-full animate-sound-wave-1" />
                  <div className="w-1 bg-amber-400 rounded-full animate-sound-wave-2" />
                  <div className="w-1 bg-amber-400 rounded-full animate-sound-wave-3" />
                  <div className="w-1 bg-amber-400 rounded-full animate-sound-wave-4" />
                </div>
              ) : null}

              {/* Botão de Repetir Fala */}
              <button
                type="button"
                onClick={onRepeatSpeech}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Ouvir novamente"
              >
                <RotateCcw size={15} />
              </button>

              {/* Botão de Mudo / Som */}
              <button
                type="button"
                onClick={onToggleMute}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isMuted 
                    ? 'text-rose-400 hover:bg-rose-500/10' 
                    : 'text-amber-400 hover:bg-amber-400/10'
                }`}
                title={isMuted ? 'Ativar voz da assistente' : 'Silenciar voz'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              {/* Botão Fechar / Pular */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer ml-1"
                title="Fechar instruções"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Título do Passo */}
          <div className="space-y-1">
            <h3 className="font-black text-sm text-white flex items-center gap-1.5 leading-snug">
              <span className="text-amber-400">❖</span>
              <span>{currentStep.title}</span>
            </h3>
            
            {/* Texto Falado Escrito na Tela (Legenda) */}
            <div className="text-xs text-zinc-300 leading-relaxed font-normal bg-black/40 p-2.5 sm:p-3 rounded-xl border border-white/5 space-y-2">
              <p>{renderFormattedText(currentStep.description)}</p>

              {/* Botão amigável de desbloqueio de áudio em navegadores com bloqueio de autoplay */}
              {!isMuted && !isSpeaking && (
                <button
                  type="button"
                  onClick={onRepeatSpeech}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <Volume2 size={13} className="text-amber-400" />
                  <span>Ouvir explicação com voz</span>
                </button>
              )}
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
                <span>{isLastStep ? 'Concluir' : 'Avançar'}</span>
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
