import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  CheckCircle2, 
  LayoutDashboard,
  Bird,
  Layers,
  Settings,
  ArrowDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface TourStep {
  targetId: string;
  title: string;
  description: string;
  badge?: string;
  path?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'nav-link-dashboard',
    title: 'Início (Painel Geral)',
    description: 'Acompanhe as métricas consolidadas do seu plantel em tempo real: total de aves, taxa de postura, chocadeiras ativas e indicadores zootécnicos.',
    badge: 'Passo 1 de 4',
    path: '/'
  },
  {
    targetId: 'nav-link-birds',
    title: 'Cadastro & Anilhamento Individual',
    description: 'Cadastre reprodutores, matrizes e frangos com anilha, foto, baia, data de nascimento e árvore genealógica completa até os bisavós.',
    badge: 'Passo 2 de 4',
    path: '/birds'
  },
  {
    targetId: 'nav-link-lots',
    title: 'Lotes de Postura & Gestão de Ovos',
    description: 'Acompanhe a produção diária de ovos por lote de postura, controle de estoque, transferências diretas para chocadeira e registro de vendas.',
    badge: 'Passo 3 de 4',
    path: '/lots'
  },
  {
    targetId: 'header-profile-button',
    title: 'Perfil & Configurações do Criatório',
    description: 'Personalize o nome da sua granja, insira a foto de capa do seu perfil e gerencie seu plano de assinatura de forma simples.',
    badge: 'Passo 4 de 4',
    path: '/settings'
  }
];

export function OnboardingTour({
  isOpen,
  onClose,
  onComplete
}: {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Navigate to path on step change
  useEffect(() => {
    if (isOpen && currentStep?.path) {
      navigate(currentStep.path);
    }
  }, [isOpen, currentStepIndex, currentStep, navigate]);

  // Track target element bounding rect fluidly
  useEffect(() => {
    if (!isOpen) return;

    const updateTarget = () => {
      const isMobile = window.innerWidth < 768;
      const targetId = currentStep.targetId;
      
      let el: HTMLElement | null = null;

      if (isMobile) {
        // Try mobile specific ID first (e.g. mobile-nav-link-dashboard)
        el = document.getElementById(`mobile-${targetId}`);
      }

      if (!el) {
        el = document.getElementById(targetId);
      }
      if (!el) {
        el = document.querySelector(`#${targetId}`) || document.querySelector(`[id*="${targetId}"]`);
      }

      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
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
  }, [isOpen, currentStepIndex, currentStep]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  // Fluid Dynamic Card Positioning Math
  const getFluidCardStyle = (): React.CSSProperties => {
    const isMobile = window.innerWidth < 768;

    if (!targetRect) {
      return isMobile 
        ? { position: 'fixed', top: '64px', left: '12px', right: '12px', zIndex: 10001 }
        : { position: 'fixed', bottom: '32px', right: '32px', width: '420px', zIndex: 10001 };
    }

    const screenHeight = window.innerHeight;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;

    // Mobile viewport guarantees
    if (isMobile) {
      if (targetCenterY > screenHeight * 0.4) {
        // Target is in bottom navigation bar or lower screen area
        // -> Put card at VERY TOP (below top badge), leaving bottom navbar 100% visible!
        return {
          position: 'fixed',
          top: '64px',
          left: '12px',
          right: '12px',
          zIndex: 10001,
        };
      } else {
        // Target is in header or top screen area
        // -> Put card near bottom with clearance above bottom navbar (bottom: 96px)
        return {
          position: 'fixed',
          bottom: '96px',
          left: '12px',
          right: '12px',
          zIndex: 10001,
        };
      }
    }

    // Desktop viewport guarantees
    if (targetCenterX < 300) {
      // Target is on left sidebar -> Position card to the right of sidebar
      const topPos = Math.max(80, Math.min(targetRect.top - 20, screenHeight - 340));
      return {
        position: 'fixed',
        left: `${targetRect.right + 24}px`,
        top: `${topPos}px`,
        width: '420px',
        zIndex: 10001,
      };
    } else if (targetCenterY < 140) {
      // Target is in header -> Position card under header
      return {
        position: 'fixed',
        right: '32px',
        top: `${targetRect.bottom + 16}px`,
        width: '420px',
        zIndex: 10001,
      };
    } else {
      // Target is in main content area -> Position card safely in bottom-right
      return {
        position: 'fixed',
        right: '32px',
        bottom: '32px',
        width: '420px',
        zIndex: 10001,
      };
    }
  };

  const isMobile = window.innerWidth < 768;
  const isTargetAtBottomOnMobile = isMobile && targetRect && (targetRect.top + targetRect.height / 2 > window.innerHeight * 0.4);

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-auto">
      {/* ── Crystal Clear Cutout Spotlight Overlay (Hole Punch Effect) ── */}
      {/* The highlighted target element stays 100% crisp, bright and un-blurred */}
      {targetRect ? (
        <div
          onClick={onClose}
          className="fixed z-[10000] border-2 border-amber-400 rounded-2xl pointer-events-auto cursor-pointer transition-all duration-300 animate-pulse"
          style={{
            left: targetRect.left - 6,
            top: targetRect.top - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            boxShadow: '0 0 0 9999px rgba(8, 12, 24, 0.45), 0 0 30px rgba(245, 158, 11, 0.9)',
          }}
        />
      ) : (
        <div 
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/45 transition-opacity duration-300"
        />
      )}

      {/* Spotlight Top Badge Banner */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[10001] bg-theme-surface/95 border border-theme-primary/40 px-4 py-1 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce-subtle pointer-events-none">
        <Sparkles size={14} className="text-theme-primary" />
        <span className="text-[11px] font-bold text-white tracking-wide">
          Demonstrando: <strong className="text-theme-primary">{currentStep.title}</strong>
        </span>
      </div>

      {/* Fluid Dynamic Tour Glass Card */}
      <div 
        style={getFluidCardStyle()}
        className="transition-all duration-500 ease-out animate-scale-up z-[10001]"
      >
        <div className="bg-theme-surface/95 border border-theme-primary/40 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden flex flex-col gap-3">
          
          {/* Top Line & Progress Badge */}
          <div className="flex items-center justify-between border-b border-theme-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-theme-primary/10 border border-theme-primary/30 flex items-center justify-center text-theme-primary">
                {currentStepIndex === 0 && <LayoutDashboard size={18} />}
                {currentStepIndex === 1 && <Bird size={18} />}
                {currentStepIndex === 2 && <Layers size={18} />}
                {currentStepIndex === 3 && <Settings size={18} />}
              </div>
              <div>
                <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest block">
                  {currentStep.badge}
                </span>
                <h3 className="font-extrabold text-sm text-white leading-tight">
                  {currentStep.title}
                </h3>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              title="Pular apresentação"
            >
              <X size={18} />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-theme-text-muted leading-relaxed font-medium">
            {currentStep.description}
          </p>

          {/* Mobile Down Arrow Indicator when pointing to Bottom Bar */}
          {isTargetAtBottomOnMobile && (
            <div className="flex items-center justify-center gap-1 text-[10px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-xl py-1 px-2 animate-bounce">
              <ArrowDown size={12} />
              <span>Veja o ícone destacado na barra inferior abaixo 👇</span>
            </div>
          )}

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-theme-border/40">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex 
                      ? 'w-6 bg-theme-primary' 
                      : 'w-1.5 bg-theme-border hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-xl border border-theme-border text-xs font-bold text-theme-text-muted hover:text-white hover:bg-white/5 transition-all flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  <span>Voltar</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="btn-primary px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all shadow-lg"
              >
                <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Concluir' : 'Avançar'}</span>
                {currentStepIndex === TOUR_STEPS.length - 1 ? <CheckCircle2 size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
