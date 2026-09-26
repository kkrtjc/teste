import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  ASSISTANT_GUIDES, 
  getTabIdFromPath, 
  ADD_BIRD_FORM_GUIDE_STEP,
  type TabGuide, 
  type AssistantStep 
} from '../lib/assistantSteps';

const SEEN_TABS_STORAGE_PREFIX = '@mura-manager:assistant-seen-tabs:';

export interface UseSmartAssistantOptions {
  isBlocked?: boolean;
  isAddBirdModalOpen?: boolean;
  onCloseAddBirdModal?: () => void;
}

export function useSmartAssistant(options?: UseSmartAssistantOptions) {
  const isBlocked = Boolean(options?.isBlocked);
  const isAddBirdModalOpen = Boolean(options?.isAddBirdModalOpen);
  const location = useLocation();
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [formSubStep, setFormSubStep] = useState<AssistantStep | null>(null);

  const autoTriggerTimerRef = useRef<any>(null);
  const lastAutoTriggeredTabRef = useRef<string | null>(null);

  // Helper para ler abas já vistas pelo usuário atual
  const getSeenTabs = useCallback((): string[] => {
    try {
      const raw = localStorage.getItem(`${SEEN_TABS_STORAGE_PREFIX}${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  }, [userId]);

  // Marca uma aba como conhecida pelo usuário
  const markTabAsSeen = useCallback((tabId: string) => {
    try {
      const seen = getSeenTabs();
      if (!seen.includes(tabId)) {
        const updated = [...seen, tabId];
        localStorage.setItem(`${SEEN_TABS_STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
      }
    } catch {}
  }, [userId, getSeenTabs]);

  // Guia ativo atual
  const activeGuide: TabGuide | null = activeTabId ? ASSISTANT_GUIDES[activeTabId] || null : null;
  const currentStep: AssistantStep | null = formSubStep || (activeGuide ? activeGuide.steps[stepIndex] || null : null);

  // Fecha o modal e persiste o status de visualização
  const handleClose = useCallback(() => {
    if (formSubStep) {
      setFormSubStep(null);
    }
    if (activeTabId) {
      markTabAsSeen(activeTabId);
    }
    setIsOpen(false);
  }, [activeTabId, markTabAsSeen, formSubStep]);

  // Abre a assistente para uma aba específica (ou para a aba atual)
  const openAssistant = useCallback((forcedTabId?: string) => {
    const tabId = forcedTabId || getTabIdFromPath(location.pathname);
    if (!tabId || !ASSISTANT_GUIDES[tabId]) return;

    setActiveTabId(tabId);
    setStepIndex(0);
    setFormSubStep(null);
    setIsOpen(true);
  }, [location.pathname]);

  // Avança para o próximo passo da aba ou conclui sub-etapa de formulário
  const nextStep = useCallback(() => {
    if (formSubStep) {
      // Se estava no formulário, fechar o formulário e avançar para o passo 2 (Busca e Filtros)
      options?.onCloseAddBirdModal?.();
      setFormSubStep(null);
      setStepIndex(1);
      return;
    }

    if (!activeGuide) return;

    if (stepIndex < activeGuide.steps.length - 1) {
      setStepIndex(prev => prev + 1);
    } else {
      // Concluiu a aba!
      handleClose();
    }
  }, [formSubStep, activeGuide, stepIndex, handleClose, options]);

  // Volta para o passo anterior
  const prevStep = useCallback(() => {
    if (formSubStep) {
      // Se estava no formulário e voltou, fecha o formulário e volta para o passo 0 (botão cadastrar)
      options?.onCloseAddBirdModal?.();
      setFormSubStep(null);
      setStepIndex(0);
      return;
    }

    if (stepIndex > 0 && activeGuide) {
      setStepIndex(prev => prev - 1);
    }
  }, [formSubStep, activeGuide, stepIndex, options]);

  // ── REAÇÃO INTERATIVA: QUANDO O FORMULÁRIO DE CADASTRO É ABERTO OU FECHADO ──
  useEffect(() => {
    if (isAddBirdModalOpen) {
      // O usuário abriu o formulário de cadastro de ave
      setFormSubStep(ADD_BIRD_FORM_GUIDE_STEP);
      setIsOpen(true);
    } else {
      // O formulário foi fechado (via Cancelar, Salvar ou X)
      setFormSubStep(prev => {
        if (prev?.id === 'birds-add-form-guide') {
          // Avança automaticamente para o próximo passo (Passo 2: Busca e Filtros Rápidos)
          setStepIndex(1);
          return null;
        }
        return prev;
      });
    }
  }, [isAddBirdModalOpen]);

  // ── DETECTOR INTELIGENTE DE PRIMEIRA VISITA POR ABA ──
  // Quando o usuário navega para uma aba pela primeira vez, ativa a assistente visual automaticamente
  // NÃO dispara se houver modal de boas-vindas / teste grátis ativo (ordem estrita de exibição)
  useEffect(() => {
    clearTimeout(autoTriggerTimerRef.current);

    if (isBlocked && !isAddBirdModalOpen) return;

    // Checagem de segurança no DOM: se o popup de teste grátis estiver visível, aguarda
    if (typeof document !== 'undefined' && document.getElementById('trial-popup-overlay')) {
      return;
    }

    const currentTab = getTabIdFromPath(location.pathname);
    if (!currentTab || !ASSISTANT_GUIDES[currentTab]) return;

    // Se já foi disparado nesta sessão para essa aba ou já foi visto antes, não incomoda
    if (lastAutoTriggeredTabRef.current === currentTab) return;

    const seenTabs = getSeenTabs();
    if (seenTabs.includes(currentTab)) return;

    // Aguarda a renderização completa da tela (800ms) antes de mostrar
    autoTriggerTimerRef.current = setTimeout(() => {
      const checkTab = getTabIdFromPath(window.location.pathname);
      const isPopupInDOM = typeof document !== 'undefined' && Boolean(document.getElementById('trial-popup-overlay'));
      if (checkTab === currentTab && !isOpen && !isBlocked && !isPopupInDOM) {
        lastAutoTriggeredTabRef.current = currentTab;
        openAssistant(currentTab);
      }
    }, 800);

    return () => {
      clearTimeout(autoTriggerTimerRef.current);
    };
  }, [location.pathname, getSeenTabs, isOpen, openAssistant, isBlocked, isAddBirdModalOpen]);

  // Quando o popup de teste grátis for fechado pelo usuário, agora sim ativa a assistente!
  useEffect(() => {
    const handleTrialDismissed = () => {
      const currentTab = getTabIdFromPath(location.pathname);
      if (!currentTab || !ASSISTANT_GUIDES[currentTab]) return;
      const seenTabs = getSeenTabs();
      if (!seenTabs.includes(currentTab)) {
        setTimeout(() => {
          if (!isOpen) {
            lastAutoTriggeredTabRef.current = currentTab;
            openAssistant(currentTab);
          }
        }, 600);
      }
    };

    window.addEventListener('trial-popup-dismissed', handleTrialDismissed);
    return () => {
      window.removeEventListener('trial-popup-dismissed', handleTrialDismissed);
    };
  }, [location.pathname, getSeenTabs, isOpen, openAssistant]);

  // Permite abrir a assistente via evento customizado global de qualquer lugar do app
  useEffect(() => {
    const handleCustomOpen = (e: any) => {
      openAssistant(e.detail?.tabId);
    };
    window.addEventListener('open-smart-assistant', handleCustomOpen);
    return () => {
      window.removeEventListener('open-smart-assistant', handleCustomOpen);
    };
  }, [openAssistant]);

  return {
    isOpen,
    activeGuide,
    currentStep,
    stepIndex,
    isFormSubStep: Boolean(formSubStep),
    openAssistant,
    closeAssistant: handleClose,
    nextStep,
    prevStep,
    markTabAsSeen
  };
}
