import { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, 
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

  // Rola suavemente até o elemento em foco quando o passo muda
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    // Aguarda montagem da view
    const timer = setTimeout(() => {
      const el = findTargetElement();
      if (el) {
        const rect = el.getBoundingClientRect();
        const screenHeight = window.innerHeight;
        const isOutOfView = rect.top < 70 || rect.bottom > screenHeight - 90;

        if (isOutOfView) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }
    }, 150);

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
        : { position: 'fixed', bottom: '32px', right: '32px', width: '420px', zIndex: 10002 };
    }

    const screenHeight = window.innerHeight;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;

    if (isMobile) {
      if (targetCenterY > screenHeight * 0.45) {
        // Elemento destacado está na metade inferior da tela -> Card fica no topo livre!
        return {
          position: 'fixed',
          top: 'calc(max(env(safe-area-inset-top, 0px), 16px) + 52px)',
          left: '12px',
          right: '12px',
          zIndex: 10002,
        };
      } else {
        // Elemento destacado está na metade superior da tela -> Card fica abaixo com folga segura da barra!
        return {
          position: 'fixed',
          bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 16px) + 84px)',
          left: '12px',
          right: '12px',
          zIndex: 10002,
        };
      }
    }

    // Desktop
    if (targetCenterX < 280) {
      // Elemento na barra lateral esquerda -> Posiciona à direita dele
      const topPos = Math.max(80, Math.min(targetRect.top - 20, screenHeight - 340));
      return {
        position: 'fixed',
        left: `${targetRect.right + 24}px`,
        top: `${topPos}px`,
        width: '420px',
        zIndex: 10002,
      };
    } else if (targetCenterY < 180) {
      // Elemento no topo -> Posiciona abaixo dele
      return {
        position: 'fixed',
        right: '32px',
        top: `${targetRect.bottom + 20}px`,
        width: '420px',
        zIndex: 10002,
      };
    } else {
      // Posição segura no canto inferior direito
      return {
        position: 'fixed',
        right: '32px',
        bottom: '32px',
        width: '420px',
        zIndex: 10002,
      };
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-auto">
      {/* ── Backdrop Escurecido que fecha com clique no fundo ── */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-[2px] transition-opacity duration-300 z-[10000]"
      />

      {/* ── Spotlight com Borda Pulsante Elegante & Recorte Translúcido ── */}
      {targetRect && (
        <div
          className="fixed z-[10001] border-2 border-amber-400 rounded-2xl pointer-events-none transition-all duration-300 assistant-spotlight-pulse"
          style={{
            left: Math.max(4, targetRect.left - 6),
            top: Math.max(4, targetRect.top - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: '0 0 0 9999px rgba(8, 10, 20, 0.72), 0 0 35px rgba(245, 158, 11, 0.9)',
          }}
        />
      )}

      {/* Top Banner de Contexto de IA */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[10002] bg-slate-900/95 border border-amber-500/50 px-4 py-1.5 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center gap-2 pointer-events-none animate-bounce-subtle">
        <Sparkles size={14} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
        <span className="text-[11px] font-black text-white tracking-wide">
          Instruções: <strong className="text-amber-400">{activeGuide.tabTitle}</strong>
        </span>
      </div>

      {/* ── Card Flutuante da Assistente Mura IA (Fala & Legenda na Tela) ── */}
      <div 
        style={getFluidCardStyle()}
        className="transition-all duration-400 ease-out animate-scale-up z-[10002]"
      >
        <div className="bg-[#0f111a]/95 border-2 border-amber-500/40 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-xl relative overflow-hidden flex flex-col gap-3.5">
          
          {/* Header da Assistente */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              {/* Avatar da IA com Brilho Pulsante */}
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-0.5 shadow-md shadow-amber-500/20 flex items-center justify-center">
                  <div className="w-full h-full bg-[#121420] rounded-[14px] flex items-center justify-center text-amber-400">
                    <Bot size={20} />
                  </div>
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-[#121420] rounded-full animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white tracking-tight">Mura IA</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Assistente
                  </span>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 block leading-tight">
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
            <div className="text-xs text-zinc-300 leading-relaxed font-normal bg-black/30 p-3 rounded-2xl border border-white/5 space-y-2">
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
