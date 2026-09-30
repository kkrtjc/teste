import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, LayoutDashboard, Bird, Store, Layers, Egg, Check } from 'lucide-react';

// ── Definição dos passos do tour guiado ──────────────────────────────────────
interface TourStep {
  key: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    key: 'dashboard',
    label: 'Início',
    Icon: LayoutDashboard,
    title: 'Aba Início',
    description:
      'Aqui você encontra um resumo visual completo do seu plantel — total de aves, lotes ativos, ovos coletados e métricas diárias. É o seu centro de comando principal.',
  },
  {
    key: 'birds',
    label: 'Aves & Raças',
    Icon: Bird,
    title: 'Aves & Raças',
    description:
      'Aqui você cadastra e gerencia suas aves com anilha, raça, fotos em alta definição, histórico de vacinas e árvore genealógica completa do seu plantel.',
  },
  {
    key: 'vitrine',
    label: 'Vitrine Digital',
    Icon: Store,
    title: 'Vitrine Digital',
    description:
      'Esta é sua vitrine pública exclusiva. Selecione as aves disponíveis para venda e compartilhe seu catálogo profissional direto com clientes pelo WhatsApp.',
  },
  {
    key: 'lots',
    label: 'Gestão de Lotes',
    Icon: Layers,
    title: 'Gestão de Lotes',
    description:
      'Controle seus lotes de postura e corte por baia. Acompanhe a evolução de peso, consumo de ração e receba alertas automáticos de manejo periódicos.',
  },
  {
    key: 'eggs',
    label: 'Controle de Ovos',
    Icon: Egg,
    title: 'Controle de Ovos',
    description:
      'Monitore sua produção diária de ovos, taxa de postura calculada automaticamente por baia, estoque atual e histórico de perdas ou vendas.',
  },
];

const ONBOARDING_KEY = '@mura-manager:onboarding-done-v2';

interface TargetGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  cx: number;
  cy: number;
  isDesktop: boolean;
}

interface OnboardingTourProps {
  /** Chamado ao avançar/voltar no tour para alternar visualmente a aba ativa */
  onNavigateToTab: (path: string) => void;
  /** Bloqueia exibição enquanto houver popups de trial, modais ou carregamentos */
  isBlocked?: boolean;
}

const TAB_PATHS = ['/', '/birds', '/vitrine', '/lots', '/eggs'];

export function OnboardingTour({ onNavigateToTab, isBlocked = false }: OnboardingTourProps) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetGeo, setTargetGeo] = useState<TargetGeometry | null>(null);
  const [entering, setEntering] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const isDone = () => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const isTrialPopupInDOM = () => {
    return typeof document !== 'undefined' && Boolean(document.getElementById('trial-popup-overlay'));
  };

  // ── Medição precisa e responsiva do elemento alvo (Desktop ou Mobile) ─────
  const measureTarget = useCallback((index: number) => {
    if (typeof window === 'undefined') return;

    const step = TOUR_STEPS[index];
    if (!step) return;

    const isDesktop = window.innerWidth >= 768;

    // Procura o elemento prioritário (sidebar no PC, dock no Mobile)
    let el: HTMLElement | null = null;
    if (isDesktop) {
      const desktopEl = document.getElementById(`nav-link-${step.key}`);
      if (desktopEl && desktopEl.offsetParent !== null) {
        el = desktopEl;
      }
    }

    if (!el) {
      const mobileEl = document.getElementById(`mobile-nav-link-${step.key}`);
      if (mobileEl && mobileEl.offsetParent !== null) {
        el = mobileEl;
      }
    }

    // Fallback genérico caso a classe de ocultar ainda esteja transicionando
    if (!el) {
      el = document.getElementById(`nav-link-${step.key}`) ||
           document.getElementById(`mobile-nav-link-${step.key}`);
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      // Se tiver tamanho real medido
      if (rect.width > 0 && rect.height > 0) {
        setTargetGeo({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          right: rect.right,
          bottom: rect.bottom,
          cx: rect.left + rect.width / 2,
          cy: rect.top + rect.height / 2,
          isDesktop,
        });
        return;
      }
    }

    // Coordenadas de contingência suaves para nunca quebrar o layout
    if (isDesktop) {
      const fallbackY = 120 + index * 48;
      setTargetGeo({
        left: 16,
        top: fallbackY,
        width: 220,
        height: 44,
        right: 236,
        bottom: fallbackY + 44,
        cx: 126,
        cy: fallbackY + 22,
        isDesktop: true,
      });
    } else {
      const dockWidth = Math.min(window.innerWidth - 32, 480);
      const startX = (window.innerWidth - dockWidth) / 2;
      const tabWidth = dockWidth / 5;
      const tabLeft = startX + index * tabWidth;
      const tabTop = window.innerHeight - 76;
      setTargetGeo({
        left: tabLeft + 4,
        top: tabTop,
        width: tabWidth - 8,
        height: 52,
        right: tabLeft + tabWidth - 4,
        bottom: tabTop + 52,
        cx: tabLeft + tabWidth / 2,
        cy: tabTop + 26,
        isDesktop: false,
      });
    }
  }, []);

  // ── Agendador da exibição do tour ─────────────────────────────────────────
  const scheduleShow = useCallback((delay = 800) => {
    if (isDone()) return;
    if (showTimerRef.current) clearTimeout(showTimerRef.current);

    showTimerRef.current = setTimeout(() => {
      if (isDone()) return;
      if (isBlocked || isTrialPopupInDOM()) return;
      setVisible(true);
    }, delay);
  }, [isBlocked]);

  // Se bloqueado, fecha imediatamente
  useEffect(() => {
    if (isBlocked || isTrialPopupInDOM()) {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (visible) setVisible(false);
    }
  }, [isBlocked, visible]);

  // Montagem inicial: aguarda 1200ms se não houver popups de boas-vindas
  useEffect(() => {
    if (isDone()) return;

    if (!isBlocked && !isTrialPopupInDOM()) {
      scheduleShow(1200);
    }

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando isBlocked transita de true para false
  const prevBlockedRef = useRef(isBlocked);
  useEffect(() => {
    const wasBlocked = prevBlockedRef.current;
    prevBlockedRef.current = isBlocked;

    if (wasBlocked && !isBlocked && !isDone()) {
      scheduleShow(800);
    }
  }, [isBlocked, scheduleShow]);

  // Ouve evento global quando o card de teste grátis é fechado pelo usuário
  useEffect(() => {
    const handleTrialDismissed = () => {
      if (isDone()) return;
      scheduleShow(700);
    };

    window.addEventListener('trial-popup-dismissed', handleTrialDismissed);
    return () => {
      window.removeEventListener('trial-popup-dismissed', handleTrialDismissed);
    };
  }, [scheduleShow]);

  // ── Sincronização ao trocar de passo ou redimensionar janela ───────────────
  useEffect(() => {
    if (!visible) return;

    measureTarget(stepIndex);
    onNavigateToTab(TAB_PATHS[stepIndex]);

    const handleResizeOrScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        measureTarget(stepIndex);
      });
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('orientationchange', handleResizeOrScroll);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('orientationchange', handleResizeOrScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, stepIndex, measureTarget, onNavigateToTab]);

  const goToStep = (next: number) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {}

    setEntering(true);
    setTimeout(() => {
      setStepIndex(next);
      setEntering(false);
    }, 160);
  };

  const handleNext = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      goToStep(stepIndex + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setVisible(false);
  };

  // Trava de segurança: se bloqueado ou popup no DOM, NUNCA renderiza
  if (!visible || isBlocked || isTrialPopupInDOM()) return null;

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const StepIcon = step.Icon;
  const isDesktop = targetGeo ? targetGeo.isDesktop : (typeof window !== 'undefined' && window.innerWidth >= 768);

  // ── Cálculo do Spotlight Cutout (Hole no Overlay) ──────────────────────────
  const padX = isDesktop ? 6 : 8;
  const padY = isDesktop ? 4 : 6;
  const cutX = targetGeo ? targetGeo.left - padX : 0;
  const cutY = targetGeo ? targetGeo.top - padY : 0;
  const cutW = targetGeo ? targetGeo.width + padX * 2 : 0;
  const cutH = targetGeo ? targetGeo.height + padY * 2 : 0;
  const cutRadius = isDesktop ? 12 : 16;

  // ── Posicionamento inteligente do Card ────────────────────────────────────
  let cardStyle: React.CSSProperties = {};
  if (isDesktop) {
    const cardWidth = 420;
    const leftPos = targetGeo ? targetGeo.right + 24 : 280;
    const clampedLeft = Math.max(20, Math.min(window.innerWidth - cardWidth - 24, leftPos));
    const targetCenterY = targetGeo ? targetGeo.cy : 160;
    const clampedTop = Math.max(24, Math.min(window.innerHeight - 340, targetCenterY - 60));

    cardStyle = {
      position: 'fixed',
      left: clampedLeft,
      top: clampedTop,
      width: cardWidth,
      zIndex: 100003,
    };
  } else {
    // Mobile: centralizado horizontalmente, flutuando acima da barra de abas
    const cardWidth = Math.min(460, window.innerWidth - 32);
    const bottomPos = targetGeo ? Math.max(86, window.innerHeight - targetGeo.top + 16) : 96;

    cardStyle = {
      position: 'fixed',
      left: '50%',
      transform: 'translateX(-50%)',
      bottom: bottomPos,
      width: cardWidth,
      maxWidth: 'calc(100vw - 32px)',
      zIndex: 100003,
    };
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99990] pointer-events-auto touch-manipulation select-none"
      onTouchMove={(e) => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
      aria-modal="true"
      role="dialog"
      aria-label={`Tour de apresentação: ${step.title}`}
    >
      {/* ── SPOTLIGHT SVG MASK: Penumbra suave que deixa a aba 100% ILUMINADA e CLARA ── */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 99991 }}
        aria-hidden="true"
      >
        <defs>
          <mask id="onboarding-spotlight-mask">
            {/* O fundo branco renderiza a penumbra suave na tela */}
            <rect width="100%" height="100%" fill="white" />
            {/* O recorte preto deixa o ícone da aba 100% limpo, nítido e transparente */}
            {targetGeo && (
              <rect
                x={cutX}
                y={cutY}
                width={cutW}
                height={cutH}
                rx={cutRadius}
                fill="black"
                style={{ transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            )}
          </mask>
        </defs>

        {/* Fundo suave semi-transparente (52% de opacidade) — NADA de tela preta opaca */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(10, 11, 16, 0.52)"
          mask="url(#onboarding-spotlight-mask)"
        />
      </svg>

      {/* ── MOLDURA PULSANTE DOURADA AO REDOR DO RECORTE ILUMINADO ── */}
      {targetGeo && (
        <div
          className="fixed pointer-events-none onboarding-tab-ring"
          style={{
            left: cutX,
            top: cutY,
            width: cutW,
            height: cutH,
            borderRadius: cutRadius,
            zIndex: 99992,
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      )}

      {/* ── SETINHA DIRECIONAL ANIMADA COM GLOW DOURADO ── */}
      {targetGeo && (
        <div
          className="fixed pointer-events-none"
          style={{
            zIndex: 99993,
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            ...(isDesktop
              ? {
                  left: targetGeo.right + 10,
                  top: targetGeo.cy - 12,
                }
              : {
                  left: targetGeo.cx - 12,
                  top: targetGeo.top - 36,
                }),
          }}
        >
          {isDesktop ? (
            // Seta para a esquerda apontando na sidebar
            <div className="onboarding-arrow-left">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 12 L6 12 M12 6 L6 12 L12 18"
                  stroke="#F59E0B"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : (
            // Seta para baixo apontando no dock inferior
            <div className="onboarding-arrow-down">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4 L12 18 M6 12 L12 18 L18 12"
                  stroke="#F59E0B"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* ── CARD DE APRESENTAÇÃO PREMIUM ── */}
      <div style={cardStyle}>
        <div
          className={`relative bg-[#151722]/95 backdrop-blur-xl border border-amber-500/35 rounded-2xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.85),0_0_30px_rgba(245,158,11,0.18)] overflow-hidden ${
            entering ? 'onboarding-card-exit' : 'onboarding-card-enter'
          }`}
        >
          {/* Filete superior luminoso em gradiente dourado */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

          {/* Indicador pointer lateral no PC */}
          {isDesktop && (
            <div
              className="hidden md:block absolute -left-2 top-8 w-4 h-4 bg-[#151722] border-l border-b border-amber-500/40 rotate-45"
              style={{ zIndex: 1 }}
            />
          )}

          <div className="p-4 sm:p-5">
            {/* Header: Ícone da aba + título + fechar */}
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
                  <StepIcon size={20} className="text-amber-400" />
                </div>
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px] font-black uppercase tracking-wider text-amber-400">
                    Passo {stepIndex + 1} de {TOUR_STEPS.length}
                  </span>
                  <h3 className="font-black text-white text-base sm:text-lg leading-tight mt-1 truncate">
                    {step.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-90"
                title="Pular apresentação"
                aria-label="Pular apresentação"
              >
                <X size={16} />
              </button>
            </div>

            {/* Barra de progresso dos passos com pílulas animadas */}
            <div className="flex items-center gap-1.5 my-3">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === stepIndex ? 28 : 8,
                    backgroundColor: i === stepIndex ? '#F59E0B' : 'rgba(245,158,11,0.2)',
                  }}
                />
              ))}
            </div>

            {/* Descrição em tipografia confortável e legível */}
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
              {step.description}
            </p>

            {/* Botões de Ação */}
            <div className="flex items-center gap-2 pt-1 border-t border-white/5">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => goToStep(stepIndex - 1)}
                  className="flex items-center gap-1 px-3.5 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  <span>Voltar</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs sm:text-sm transition-all active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer"
              >
                {isLast ? (
                  <>
                    <Check size={16} className="stroke-[3]" />
                    <span>Concluir e Usar</span>
                  </>
                ) : (
                  <>
                    <span>Avançar</span>
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
