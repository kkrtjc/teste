import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { 
  ASSISTANT_GUIDES, 
  getTabIdFromPath, 
  type TabGuide, 
  type AssistantStep 
} from '../lib/assistantSteps';
import { 
  speakAssistant, 
  stopAssistantSpeech, 
  isVoiceMuted, 
  setVoiceMuted as saveVoiceMuted 
} from '../lib/assistantSpeech';

const SEEN_TABS_STORAGE_PREFIX = '@mura-manager:assistant-seen-tabs:';

export function useSmartAssistant(options?: { isBlocked?: boolean }) {
  const isBlocked = Boolean(options?.isBlocked);
  const location = useLocation();
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => isVoiceMuted());

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
  const currentStep: AssistantStep | null = activeGuide ? activeGuide.steps[stepIndex] || null : null;

  // Interrompe voz ao fechar ou desmontar
  const handleClose = useCallback(() => {
    stopAssistantSpeech();
    setIsSpeaking(false);
    if (activeTabId) {
      markTabAsSeen(activeTabId);
    }
    setIsOpen(false);
  }, [activeTabId, markTabAsSeen]);

  // Dispara a fala da assistente para o passo atual
  const speakCurrentStep = useCallback((step: AssistantStep | null) => {
    if (!step) {
      stopAssistantSpeech();
      setIsSpeaking(false);
      return;
    }

    if (isVoiceMuted()) {
      stopAssistantSpeech();
      setIsSpeaking(false);
      return;
    }

    speakAssistant(step.speechText, {
      onStart: () => setIsSpeaking(true),
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  }, []);

  // Abre manualmente a assistente para uma aba específica (ou para a aba atual)
  const openAssistant = useCallback((forcedTabId?: string) => {
    const tabId = forcedTabId || getTabIdFromPath(location.pathname);
    if (!tabId || !ASSISTANT_GUIDES[tabId]) return;

    stopAssistantSpeech();
    setActiveTabId(tabId);
    setStepIndex(0);
    setIsOpen(true);

    const firstStep = ASSISTANT_GUIDES[tabId].steps[0];
    // Aguarda abertura do modal antes de falar
    setTimeout(() => {
      speakCurrentStep(firstStep);
    }, 300);
  }, [location.pathname, speakCurrentStep]);

  // Avança para o próximo passo da aba
  const nextStep = useCallback(() => {
    if (!activeGuide) return;

    if (stepIndex < activeGuide.steps.length - 1) {
      const nextIndex = stepIndex + 1;
      setStepIndex(nextIndex);
      const next = activeGuide.steps[nextIndex];
      speakCurrentStep(next);
    } else {
      // Concluiu a aba!
      handleClose();
    }
  }, [activeGuide, stepIndex, speakCurrentStep, handleClose]);

  // Volta para o passo anterior
  const prevStep = useCallback(() => {
    if (stepIndex > 0 && activeGuide) {
      const prevIndex = stepIndex - 1;
      setStepIndex(prevIndex);
      const prev = activeGuide.steps[prevIndex];
      speakCurrentStep(prev);
    }
  }, [activeGuide, stepIndex, speakCurrentStep]);

  // Alterna o mudo da voz
  const toggleMute = useCallback(() => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    saveVoiceMuted(nextState);

    if (nextState) {
      stopAssistantSpeech();
      setIsSpeaking(false);
    } else if (currentStep) {
      speakCurrentStep(currentStep);
    }
  }, [isMuted, currentStep, speakCurrentStep]);

  // Repete a fala do passo atual
  const repeatSpeech = useCallback(() => {
    if (currentStep) {
      speakCurrentStep(currentStep);
    }
  }, [currentStep, speakCurrentStep]);

  // ── DETECTOR INTELIGENTE DE PRIMEIRA VISITA POR ABA ──
  // Quando o usuário navega para uma aba pela primeira vez, ativa a assistente automaticamente
  // NÃO dispara se houver modal de boas-vindas / teste grátis ativo (ordem estrita de exibição)
  useEffect(() => {
    clearTimeout(autoTriggerTimerRef.current);

    if (isBlocked) return;

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

    // Aguarda a renderização completa da tela (900ms) antes de mostrar
    autoTriggerTimerRef.current = setTimeout(() => {
      // Verifica novamente se a rota ainda é a mesma e nenhum popup abriu
      const checkTab = getTabIdFromPath(window.location.pathname);
      const isPopupInDOM = typeof document !== 'undefined' && Boolean(document.getElementById('trial-popup-overlay'));
      if (checkTab === currentTab && !isOpen && !isBlocked && !isPopupInDOM) {
        lastAutoTriggeredTabRef.current = currentTab;
        openAssistant(currentTab);
      }
    }, 900);

    return () => {
      clearTimeout(autoTriggerTimerRef.current);
    };
  }, [location.pathname, getSeenTabs, isOpen, openAssistant, isBlocked]);

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
        }, 700);
      }
    };

    window.addEventListener('trial-popup-dismissed', handleTrialDismissed);
    return () => {
      window.removeEventListener('trial-popup-dismissed', handleTrialDismissed);
    };
  }, [location.pathname, getSeenTabs, isOpen, openAssistant]);

  // Cancela voz ao trocar de página
  useEffect(() => {
    return () => {
      stopAssistantSpeech();
    };
  }, [location.pathname]);

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
    isSpeaking,
    isMuted,
    openAssistant,
    closeAssistant: handleClose,
    nextStep,
    prevStep,
    toggleMute,
    repeatSpeech,
    markTabAsSeen
  };
}
