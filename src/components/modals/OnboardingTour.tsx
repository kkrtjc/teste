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
  Settings
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
    title: 'Painel de Controle (Dashboard)',
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
  const navigate = useNavigate();

  const currentStep = TOUR_STEPS[currentStepIndex];

  useEffect(() => {
    if (isOpen && currentStep?.path) {
      navigate(currentStep.path);
    }
  }, [isOpen, currentStepIndex, currentStep, navigate]);

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

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-auto">
      {/* Light Glass Backdrop: Keeps the underlying app bright, visible and crisp */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px] transition-opacity duration-300"
      />

      {/* Spotlight Top Badge Banner */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[10000] bg-theme-surface/90 border border-theme-primary/40 px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce-subtle pointer-events-none">
        <Sparkles size={14} className="text-theme-primary" />
        <span className="text-xs font-bold text-white tracking-wide">
          Demonstrando: <strong className="text-theme-primary">{currentStep.title}</strong>
        </span>
      </div>

      {/* Floating Bottom Right Tour Glass Card */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:bottom-6 sm:max-w-md z-[10000] animate-scale-up">
        <div className="bg-theme-surface/95 border border-theme-primary/40 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl relative overflow-hidden flex flex-col gap-4">
          
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
