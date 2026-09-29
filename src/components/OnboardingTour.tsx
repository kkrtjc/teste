import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, LayoutDashboard, Bird, Store, Layers, Egg } from 'lucide-react';

// ── Definição dos passos do tour guiado ──────────────────────────────────────
const TOUR_STEPS = [
  {
    tabId: 'mobile-nav-link-dashboard',
    label: 'Início',
    Icon: LayoutDashboard,
    title: 'Aba Início',
    description:
      'Aqui você encontra um resumo completo do seu plantel — total de aves, lotes ativos, ovos coletados e muito mais. É o seu painel de controle principal.',
  },
  {
    tabId: 'mobile-nav-link-birds',
    label: 'Aves & Raças',
    Icon: Bird,
    title: 'Aves & Raças',
    description:
      'Aqui você cadastra suas aves e raças com informações detalhadas como peso, idade, genealogia e fotos em alta definição. Mantenha o controle completo do seu plantel.',
  },
  {
    tabId: 'mobile-nav-link-vitrine',
    label: 'Vitrine',
    Icon: Store,
    title: 'Vitrine Digital',
    description:
      'Esta é sua Vitrine Digital. Adicione aves que deseja vender e compartilhe seu link personalizado diretamente com seus clientes pelo WhatsApp — de forma profissional.',
  },
  {
    tabId: 'mobile-nav-link-lots',
    label: 'Lotes',
    Icon: Layers,
    title: 'Gestão de Lotes',
    description:
      'Aqui você gerencia seus Lotes de Engorda e Postura com controle de pesagem por baia, histórico completo e alertas automáticos de prazo.',
  },
  {
    tabId: 'mobile-nav-link-eggs',
    label: 'Ovos',
    Icon: Egg,
    title: 'Controle de Ovos',
    description:
      'Acompanhe sua produção de ovos diariamente — coleta por baia, gestão de chocadeiras e histórico de postura tudo num só lugar.',
  },
] as const;

const ONBOARDING_KEY = '@mura-manager:onboarding-done-v2';

interface TabRect {
  cx: number;
  cy: number;
  navBottom: number;
}

interface OnboardingTourProps {
  /** Chamado quando o tour avança de passo para alternar a aba ativa */
  onNavigateToTab: (path: string) => void;
  /** Quando true (ex: popup de teste grátis ou checkout ativo), o tour NUNCA é exibido */
  isBlocked?: boolean;
}

const TAB_PATHS = ['/', '/birds', '/vitrine', '/lots', '/eggs'];

export function OnboardingTour({ onNavigateToTab, isBlocked = false }: OnboardingTourProps) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tabRect, setTabRect] = useState<TabRect | null>(null);
  const [entering, setEntering] = useState(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const pendingRef = useRef(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const scheduleShow = useCallback((delay = 800) => {
    if (isDone()) return;
    if (showTimerRef.current) clearTimeout(showTimerRef.current);

    showTimerRef.current = setTimeout(() => {
      if (isDone()) return;
      if (isBlocked || isTrialPopupInDOM()) {
        pendingRef.current = true;
        return;
      }
      setVisible(true);
    }, delay);
  }, [isBlocked]);

  // Se for bloqueado ou se o popup de trial estiver ativo, fecha o tour imediatamente
  useEffect(() => {
    if (isBlocked || isTrialPopupInDOM()) {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (visible) setVisible(false);
      pendingRef.current = true;
    }
  }, [isBlocked, visible]);

  // Ao montar: só agenda se não houver NENHUM bloqueio ou popup de trial
  useEffect(() => {
    if (isDone()) return;

    if (isBlocked || isTrialPopupInDOM()) {
      pendingRef.current = true;
    } else {
      scheduleShow(1200);
    }

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando isBlocked transitar de true para false, inicia o tour após o delay
  const prevBlockedRef = useRef(isBlocked);
  useEffect(() => {
    const wasBlocked = prevBlockedRef.current;
    prevBlockedRef.current = isBlocked;

    if (isBlocked) {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (visible) setVisible(false);
      pendingRef.current = true;
    } else if (wasBlocked && !isBlocked && pendingRef.current && !isDone()) {
      pendingRef.current = false;
      scheduleShow(800);
    }
  }, [isBlocked, visible, scheduleShow]);

  // Ouve o evento de dispensa do aviso de teste grátis
  useEffect(() => {
    const handleTrialDismissed = () => {
      if (isDone()) return;
      pendingRef.current = true;
      scheduleShow(800);
    };

    window.addEventListener('trial-popup-dismissed', handleTrialDismissed);
    return () => {
      window.removeEventListener('trial-popup-dismissed', handleTrialDismissed);
    };
  }, [scheduleShow]);

  // Mede a posição do ícone da aba correspondente
  const measureTab = useCallback((index: number) => {
    const step = TOUR_STEPS[index];
    const el = document.getElementById(step.tabId);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const navEl = el.closest('nav');
    const navRect = navEl ? navEl.getBoundingClientRect() : rect;

    setTabRect({
      cx: rect.left + rect.width / 2,
      cy: navRect.top,
      navBottom: navRect.bottom,
    });
  }, []);

  // Recalcula medição ao alterar passo ou redimensionar tela
  useEffect(() => {
    if (!visible) return;
    measureTab(stepIndex);

    const navEl = document.getElementById('mobile-nav-main-menu');
    if (navEl && 'ResizeObserver' in window) {
      resizeObserverRef.current?.disconnect();
      const ro = new ResizeObserver(() => measureTab(stepIndex));
      ro.observe(navEl);
      resizeObserverRef.current = ro;
    }

    return () => resizeObserverRef.current?.disconnect();
  }, [visible, stepIndex, measureTab]);

  // Navega visualmente para a aba correspondente a cada passo
  useEffect(() => {
    if (!visible) return;
    onNavigateToTab(TAB_PATHS[stepIndex]);
  }, [visible, stepIndex, onNavigateToTab]);

  const goToStep = (next: number) => {
    setEntering(true);
    setTimeout(() => {
      setStepIndex(next);
      setEntering(false);
    }, 180);
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

  // Trava de segurança absoluta: se estiver bloqueado ou se o popup de trial estiver no DOM, NUNCA renderiza
  if (!visible || isBlocked || isTrialPopupInDOM()) return null;

  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const StepIcon = step.Icon;

  const navTop = tabRect?.cy ?? window.innerHeight * 0.85;
  const cardBottom = window.innerHeight - navTop + 16;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] pointer-events-auto"
      onTouchMove={(e) => e.preventDefault()}
      style={{ touchAction: 'none' }}
      aria-modal="true"
      role="dialog"
      aria-label={`Tour de apresentação — ${step.title}`}
    >
      {/* Backdrop escuro com bloqueio total de cliques no restante do app */}
      <div
        className="absolute inset-0 bg-black/75"
        style={{ backdropFilter: 'blur(1px)', WebkitBackdropFilter: 'blur(1px)' }}
      />

      {/* Anel luminoso pulsante sobre o ícone da aba */}
      {tabRect && (
        <>
          <div
            className="absolute onboarding-tab-ring pointer-events-none"
            style={{
              left: tabRect.cx - 28,
              top: tabRect.cy + 8,
              width: 56,
              height: 56,
              borderRadius: '50%',
              zIndex: 100001,
            }}
          />

          {/* Setinha animada apontando para o ícone */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: tabRect.cx - 12,
              top: tabRect.cy - 36,
              zIndex: 100002,
            }}
          >
            <div className="onboarding-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 4 L12 18 M6 12 L12 18 L18 12"
                  stroke="#F59E0B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </>
      )}

      {/* Card explicativo flutuando acima da barra de navegação */}
      <div
        className="absolute pointer-events-auto"
        style={{
          bottom: cardBottom,
          zIndex: 100003,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 480,
        }}
      >
        <div
          className={`onboarding-card bg-[#18181f] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden ${
            entering ? 'onboarding-card-exit' : 'onboarding-card-enter'
          }`}
        >
          <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <StepIcon size={18} className="text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/70">
                    {stepIndex + 1} de {TOUR_STEPS.length}
                  </p>
                  <h3 className="font-black text-white text-base leading-tight">{step.title}</h3>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors shrink-0 active:scale-90"
                aria-label="Fechar tour"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 mb-3">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: i === stepIndex ? 20 : 6,
                    height: 6,
                    backgroundColor: i === stepIndex ? '#F59E0B' : 'rgba(245,158,11,0.25)',
                  }}
                />
              ))}
            </div>

            <p className="text-sm text-white/75 leading-relaxed mb-4">{step.description}</p>

            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  onClick={() => goToStep(stepIndex - 1)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 text-sm font-bold transition-all active:scale-95"
                >
                  Voltar
                </button>
              )}

              <button
                onClick={handleNext}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm transition-all active:scale-95 shadow-lg shadow-amber-500/20"
              >
                {isLast ? (
                  <span>Começar a usar ✓</span>
                ) : (
                  <>
                    <span>Próximo</span>
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
