import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft, X,
  LayoutDashboard, Bird, Layers, Dna, Gift, Clock, ShieldCheck,
  Zap, Compass
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type TourStep = {
  id: string;
  title: string;
  subtitle: string;
  path: string;
  icon: any;
  badge: string;
  description: string;
  highlights: string[];
  visualSnippet?: React.ReactNode;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Mura Manager',
    subtitle: 'O mais avançado sistema de gestão de criatórios de elite',
    path: '/',
    icon: Sparkles,
    badge: 'Manual de Uso & Guia Rápido',
    description: 'Desenvolvido sob medida para criadores de alta performance. Gerencie plantel, árvore genealógica de 3 gerações, lotes de postura, chocadeiras e genéticas.',
    highlights: [
      'Controle completo de anilhas, raças e genealogia pedigree',
      'Gestão inteligente de postura, ovos e chocadeiras',
      'Previsão genética de cruzamentos e linhagens de combate'
    ],
    visualSnippet: (
      <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 border border-amber-500/30 rounded-2xl p-3.5 text-center space-y-1.5 my-2">
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400 text-black font-black flex items-center justify-center text-xs shadow-md">M</div>
          <span className="font-black text-white text-sm tracking-tight">MURA<span className="text-amber-400">MANAGER</span></span>
        </div>
        <p className="text-[11px] text-amber-200 font-bold">✨ Seu sistema de elite está pronto para uso!</p>
      </div>
    )
  },
  {
    id: 'dashboard',
    title: '1. Dashboard & Indicadores',
    subtitle: 'Métricas cruciais atualizadas em tempo real',
    path: '/',
    icon: LayoutDashboard,
    badge: 'Visão Geral do Criatório',
    description: 'No Dashboard você acompanha o total de aves ativas, taxa média de postura diária, eficiência de lotes e alertas sanitários automaticamente.',
    highlights: [
      'Cards de desempenho de postura e engorda',
      'Gráficos dinâmicos de produção semanal',
      'Notificações e alertas preventivos'
    ],
    visualSnippet: (
      <div className="grid grid-cols-3 gap-2 my-2">
        <div className="bg-white/5 border border-white/10 p-2 rounded-xl text-center">
          <p className="text-[9px] text-white/50 font-bold uppercase">Aves</p>
          <p className="text-xs font-black text-amber-400">Ativas</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-2 rounded-xl text-center">
          <p className="text-[9px] text-white/50 font-bold uppercase">Postura</p>
          <p className="text-xs font-black text-green-400">Diária</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-2 rounded-xl text-center">
          <p className="text-[9px] text-white/50 font-bold uppercase">Lotes</p>
          <p className="text-xs font-black text-blue-400">100% OK</p>
        </div>
      </div>
    )
  },
  {
    id: 'birds',
    title: '2. Aves & Árvore Genealógica',
    subtitle: 'Registro individual com anilha, foto e pedigree',
    path: '/birds',
    icon: Bird,
    badge: 'Genealogia & Pedigree',
    description: 'Cadastre galos e matrizes com foto real. Clique no perfil para visualizar a Árvore Genealógica interativa com conexões até bisavós (3 gerações acima)!',
    highlights: [
      'Filtro por raça, sexo e status na baia',
      'Árvore genealógica vetorial interativa até bisavós',
      'Identificação visual de reprodutores e externos'
    ],
    visualSnippet: (
      <div className="bg-black/40 border border-amber-400/30 rounded-2xl p-2.5 my-2 text-center">
        <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-1">🌳 Árvore Genealógica Integrada</p>
        <div className="flex justify-center gap-1.5 items-center text-[10px] text-white/70">
          <span className="px-1.5 py-0.5 rounded bg-white/10">Bisavós</span> →
          <span className="px-1.5 py-0.5 rounded bg-white/10">Avós</span> →
          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">Ave</span>
        </div>
      </div>
    )
  },
  {
    id: 'lots',
    title: '3. Controle de Lotes & Ovos',
    subtitle: 'Postura, Pintinhos/Chocadeira e Engorda',
    path: '/lots',
    icon: Layers,
    badge: 'Produção Completa',
    description: 'Crie lotes combinando aves selecionadas e quantidade sem anilha. Gerencie coletas diárias de ovos, envio para incubação na chocadeira e vendas com lucro calculado.',
    highlights: [
      'Abas organizadas: Postura ➔ Pintinhos ➔ Engorda',
      'Envio de ovos para a chocadeira em 1 clique',
      'Gráfico nativo de meta e produção por baia'
    ],
    visualSnippet: (
      <div className="flex gap-2 my-2">
        <div className="flex-1 bg-amber-500/10 border border-amber-500/30 p-1.5 rounded-xl text-center">
          <p className="text-[10px] text-amber-300 font-bold">🥚 Postura</p>
        </div>
        <div className="flex-1 bg-blue-500/10 border border-blue-500/30 p-1.5 rounded-xl text-center">
          <p className="text-[10px] text-blue-300 font-bold">🐣 Pintinhos</p>
        </div>
        <div className="flex-1 bg-orange-500/10 border border-orange-500/30 p-1.5 rounded-xl text-center">
          <p className="text-[10px] text-orange-300 font-bold">🥩 Engorda</p>
        </div>
      </div>
    )
  },
  {
    id: 'genetics',
    title: '4. Genética & Cruzamentos',
    subtitle: 'Previsão genotípica e planejamento de ninhadas',
    path: '/genetics',
    icon: Dna,
    badge: 'Linhagens de Sangue',
    description: 'Faça simulações de acasalamento entre reprodutores para prever porcentagem de consaguinidade, vigor híbrido e herança genotípica dos filhotes.',
    highlights: [
      'Calculadora de coeficientes genéticos',
      'Registro de casais e reprodutores de destaque',
      'Histórico de progênie e linhagens pura Mura'
    ],
    visualSnippet: (
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-2xl p-2.5 my-2 text-center">
        <p className="text-[11px] text-purple-200 font-bold">🧬 Simulação de Cruzamento Virtual</p>
        <p className="text-[10px] text-white/60 mt-0.5">Galo Padreador × Matriz Matriz ➔ Previsão de Linhagem</p>
      </div>
    )
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

  const step = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [isLast, onComplete]);

  const handlePrev = useCallback(() => {
    if (!isFirst) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [isFirst]);

  // Reset step to 0 when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isOpen]);

  // Navigate to step path on step change
  useEffect(() => {
    if (isOpen && step?.path) {
      navigate(step.path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStepIndex, isOpen, navigate, step?.path]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || !step) return null;

  return createPortal(
    <div className="fixed inset-0 z-[250] pointer-events-none select-none">
      {/* Light subtle backdrop (non-darkening, app behind is 100% bright and crisp) */}
      <div className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px] pointer-events-auto" onClick={onClose} />

      {/* Top Floating Spotlight Badge Pointer */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[260] hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0F172A]/90 border border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.35)] pointer-events-auto">
        <Compass size={14} className="text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
        <span className="text-xs font-bold text-white">Demonstrando: <strong className="text-amber-300">{step.title}</strong></span>
      </div>

      {/* Container do Card: Ancorado no canto inferior direito no desktop (sm:fixed sm:bottom-6 sm:right-8) e Bottom Sheet no mobile */}
      <div className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:right-8 sm:left-auto z-[260] w-full sm:max-w-md pointer-events-auto p-0 sm:p-0">
        <div className="bg-[#0F172A]/95 border-t sm:border border-amber-400/40 rounded-t-3xl sm:rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_25px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col animate-scale-up max-h-[82dvh]">
          
          {/* Top Header Bar */}
          <div className="px-5 pt-4 pb-3 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                <step.icon size={17} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">{step.badge}</span>
                <p className="text-[11px] text-white/50 font-bold">Passo {currentStepIndex + 1} de {TOUR_STEPS.length}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/5 h-1">
            <div
              className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 h-full transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
            />
          </div>

          {/* Content Body */}
          <div className="p-5 space-y-3.5 overflow-y-auto flex-1" key={step.id}>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">{step.title}</h3>
              <p className="text-xs text-amber-300/90 font-medium mt-0.5">{step.subtitle}</p>
            </div>

            <p className="text-xs text-white/75 leading-relaxed">
              {step.description}
            </p>

            {/* Visual Demonstrative Snippet */}
            {step.visualSnippet}

            {/* Highlights List */}
            <div className="space-y-1.5 pt-1">
              {step.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-white/85">
                  <CheckCircle2 size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Step Dots */}
          <div className="flex justify-center gap-1.5 py-1 bg-black/20">
            {TOUR_STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'w-5 bg-amber-400'
                    : 'w-1.5 bg-white/20 hover:bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Footer Navigation Controls */}
          <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3">
            {!isFirst ? (
              <button
                onClick={handlePrev}
                className="py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
              >
                <ChevronLeft size={15} /> Anterior
              </button>
            ) : (
              <button
                onClick={onClose}
                className="text-xs text-white/40 hover:text-white font-bold transition-colors px-2"
              >
                Pular Tutorial
              </button>
            )}

            <button
              onClick={handleNext}
              className="py-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] active:scale-95 flex items-center gap-1.5"
            >
              {isLast ? (
                <>Concluir Manual <Sparkles size={15}/></>
              ) : (
                <>Próximo <ChevronRight size={15}/></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Modal dos 7 Dias Grátis (Welcome Gift PRO) ──────────────────────────────
export function TrialWelcomeModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  // Strict non-overlap guard: Never render if not open
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div className="bg-gradient-to-b from-[#1E1B4B] via-[#0F172A] to-[#020617] border-2 border-amber-400/60 w-full max-w-md rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.35)] p-6 text-center space-y-5 animate-scale-up relative overflow-hidden">
        
        {/* Decorative Light Rays */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Badge Banner */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-wider">
          <Gift size={14} className="text-amber-400" /> Presente de Boas-Vindas Exclusivo
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h3 className="text-2xl font-black text-white tracking-tight">7 Dias Grátis Ativados!</h3>
          <p className="text-xs text-amber-300 font-bold">Sua conta ganhou acesso total ao Plano Elite PRO</p>
        </div>

        {/* Features Box */}
        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-left space-y-2.5 text-xs text-white/90">
          <div className="flex items-center gap-2.5">
            <Zap size={16} className="text-amber-400 shrink-0" />
            <span>Árvore Genealógica Completa (até 3 Gerações)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={16} className="text-amber-400 shrink-0" />
            <span>Gestão Ilimitada de Aves, Lotes e Chocadeiras</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-amber-400 shrink-0" />
            <span>Simulador Genético & Calculadora de Sangue</span>
          </div>
        </div>

        <p className="text-[11px] text-white/50">
          Nenhum cartão é necessário agora. Aproveite o melhor sistema para o seu criatório!
        </p>

        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-sm transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-95"
        >
          Começar a Usar Agora 🚀
        </button>
      </div>
    </div>,
    document.body
  );
}
