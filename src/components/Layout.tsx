import { useState, useEffect, useRef, memo, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Layers, Settings as SettingsIcon, 
  Bird, ShieldCheck, Users, X, Trash2, Loader2,
  Bell, MessageSquare, Egg, Sparkles, RefreshCw,
  Zap, Store, ArrowLeft, Lock
} from 'lucide-react';
import { ConfirmDialog } from './modals/ConfirmDialog';
import { SmartAssistantModal } from './assistant/SmartAssistantModal';
import { useSmartAssistant } from '../hooks/useSmartAssistant';

// Code-splitting dos modais pesados para alívio de memória e boot instantâneo
const AddBirdModal = lazy(() => import('./modals/AddBirdModal').then(m => ({ default: m.AddBirdModal })));
const BirdProfileModal = lazy(() => import('./modals/BirdProfileModal').then(m => ({ default: m.BirdProfileModal })));
const UserProfileSetupModal = lazy(() => import('./modals/UserProfileSetupModal').then(m => ({ default: m.UserProfileSetupModal })));
const PWAInstallGuideModal = lazy(() => import('./modals/PWAInstallGuideModal').then(m => ({ default: m.PWAInstallGuideModal })));

// Code-splitting e carregamento otimizado das páginas principais (Padrão Linear.app)
const Dashboard = lazy(() => import('../pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Birds = lazy(() => import('../pages/Birds').then(m => ({ default: m.Birds })));
const Vitrine = lazy(() => import('../pages/Vitrine').then(m => ({ default: m.Vitrine })));
const Lots = lazy(() => import('../pages/Lots').then(m => ({ default: m.Lots })));
const Eggs = lazy(() => import('../pages/Eggs').then(m => ({ default: m.Eggs })));
const Settings = lazy(() => import('../pages/Settings').then(m => ({ default: m.Settings })));

// Prefetch em background durante idle para garantir transição imediata (0ms)
if (typeof window !== 'undefined') {
  const prefetchPages = () => {
    import('../pages/Dashboard');
    import('../pages/Birds');
    import('../pages/Lots');
    import('../pages/Eggs');
    import('../pages/Vitrine');
    import('../pages/Settings');
  };
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(prefetchPages, { timeout: 2500 });
  } else {
    setTimeout(prefetchPages, 1000);
  }
}

function TabLoadingFallback() {
  return (
    <div className="space-y-4 animate-fade-in p-2 sm:p-4 max-w-7xl mx-auto">
      <div className="h-8 w-48 bg-white/5 rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="h-36 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-36 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-36 bg-white/5 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
import { useAppContext } from '../lib/AppContext';
import { useAuth, ADMIN_CPF, type SubscriptionPlan } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';
import localforage from 'localforage';
import { useHaptics } from '../hooks/useHaptics';
import { LandingCheckoutModal } from './LandingCheckoutModal';
import { RenewalModal } from './modals/RenewalModal';

export type AllowedCpf = {
  cpf: string;
  nome?: string;
  whatsapp?: string;
  expires_at?: string;
  created_at?: string;
  senha?: string;
  email?: string;
};

export const formatCPF = (cpf: string) => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

interface LayoutProps {
  showUpgradeModal?: boolean;
  onUpgradeModalClose?: () => void;
  isTrialPopupOpen?: boolean;
}

const AdminAddClientForm = memo(function AdminAddClientForm({
  onAdd,
  loading
}: {
  onAdd: (client: { cpf: string; nome: string; whatsapp: string; expires_at: string; password?: string }) => Promise<void>;
  loading: boolean;
}) {
  const [newCpf, setNewCpf] = useState('');
  const [newName, setNewName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [planType, setPlanType] = useState<SubscriptionPlan>('pro_monthly');
  const [newExpiresAt, setNewExpiresAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [newPassword, setNewPassword] = useState('');

  const handlePlanChange = (selected: SubscriptionPlan) => {
    setPlanType(selected);
    const d = new Date();
    d.setDate(d.getDate() + (selected === 'yearly' ? 365 : 30));
    setNewExpiresAt(d.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const planTag = planType === 'monthly' ? '[COMUM]' : planType === 'pro_monthly' ? '[COMPLETO]' : '[ANUAL]';
    const cleanBase = newName.replace(/\[(COMUM|COMPLETO|ANUAL|PRO)\]/gi, '').trim();
    await onAdd({
      cpf: newCpf,
      nome: `${cleanBase} ${planTag}`.trim(),
      whatsapp: newWhatsapp,
      expires_at: newExpiresAt,
      password: newPassword,
    });
    setNewCpf('');
    setNewName('');
    setNewWhatsapp('');
    setNewExpiresAt('');
    setNewPassword('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-theme-base/30 p-4 border border-theme-border rounded-xl">
      {/* Seletor de Plano Autorizado */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-theme-text-muted uppercase">Plano Autorizado</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handlePlanChange('monthly')}
            className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
              planType === 'monthly'
                ? 'bg-blue-500/20 border-blue-500 text-white font-bold'
                : 'bg-theme-base border-theme-border text-theme-text-muted hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">Mensal Comum</span>
              <span className="text-[10px] text-blue-400 font-mono">R$ 39,90</span>
            </div>
            <p className="text-[10px] opacity-75 mt-0.5">Aves & Vitrine</p>
          </button>

          <button
            type="button"
            onClick={() => handlePlanChange('pro_monthly')}
            className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
              planType === 'pro_monthly'
                ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                : 'bg-theme-base border-theme-border text-theme-text-muted hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">Mensal Completo</span>
              <span className="text-[10px] text-emerald-400 font-mono">R$ 59,80</span>
            </div>
            <p className="text-[10px] opacity-75 mt-0.5">+ Lotes & Ovos</p>
          </button>

          <button
            type="button"
            onClick={() => handlePlanChange('yearly')}
            className={`p-2 rounded-xl text-left border text-xs transition-all cursor-pointer ${
              planType === 'yearly'
                ? 'bg-amber-500/20 border-amber-500 text-white font-bold'
                : 'bg-theme-base border-theme-border text-theme-text-muted hover:text-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">Anual Completo</span>
              <span className="text-[10px] text-amber-400 font-mono">R$ 567,90</span>
            </div>
            <p className="text-[10px] opacity-75 mt-0.5">Tudo Liberado (1 ano)</p>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-theme-text-muted uppercase">CPF do Cliente</label>
          <input
            type="text"
            required
            value={newCpf}
            onChange={(e) => {
              const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
              if (clean.length <= 3) setNewCpf(clean);
              else if (clean.length <= 6) setNewCpf(`${clean.slice(0, 3)}.${clean.slice(3)}`);
              else if (clean.length <= 9) setNewCpf(`${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`);
              else setNewCpf(`${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`);
            }}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-2.5 text-xs text-white focus:border-theme-primary outline-none transition-colors font-bold text-center tracking-wider"
            placeholder="000.000.000-00"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-theme-text-muted uppercase">Nome Completo</label>
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-2.5 text-xs text-white focus:border-theme-primary outline-none transition-colors font-bold"
            placeholder="Ex: João da Silva"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-theme-text-muted uppercase">WhatsApp / Celular</label>
          <input
            type="text"
            required
            value={newWhatsapp}
            onChange={(e) => {
              const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
              if (clean.length <= 2) setNewWhatsapp(clean);
              else if (clean.length <= 7) setNewWhatsapp(`(${clean.slice(0, 2)}) ${clean.slice(2)}`);
              else setNewWhatsapp(`(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`);
            }}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-2.5 text-xs text-white focus:border-theme-primary outline-none transition-colors font-bold text-center"
            placeholder="(00) 00000-0000"
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-theme-text-muted uppercase">Data Vencimento</label>
          <input
            type="date"
            required
            value={newExpiresAt}
            onChange={(e) => setNewExpiresAt(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-2.5 text-xs text-white focus:border-theme-primary outline-none transition-colors font-bold text-center text-theme-text-muted"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-theme-text-muted uppercase">Senha (Opcional)</label>
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-2.5 text-xs text-white focus:border-theme-primary outline-none transition-colors font-bold"
            placeholder="Ex: 123456"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2.5 rounded-xl flex items-center justify-center font-black text-xs gap-2 disabled:opacity-50 active:scale-95 transition-all mt-1 cursor-pointer"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin text-black" />
        ) : (
          <>
            <Users size={14} />
            <span>Autorizar e Cadastrar Cliente</span>
          </>
        )}
      </button>
    </form>
  );
});

export function Layout({ showUpgradeModal = false, onUpgradeModalClose, isTrialPopupOpen = false }: LayoutProps) {
  const { 
    farmSettings, isAddBirdModalOpen, selectedBirdProfileId, closeModals,
    isTourOpen, isProfileSetupOpen, closeTour, finishProfileSetup, showToast,
    isUpgradeModalOpen: globalIsUpgradeModalOpen, selectedUpgradePlan: globalSelectedUpgradePlan,
    closeUpgradeModal: globalCloseUpgradeModal
  } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { triggerLight } = useHaptics();
  const { isLocalMode, isAdmin, trialInfo, cpf, hasModuleAccess, user, activateSubscription, isExpired } = useAuth();

  const isBlocked = isTrialPopupOpen || showUpgradeModal || isProfileSetupOpen || globalIsUpgradeModalOpen;

  const {
    isOpen: isAssistantOpen,
    activeGuide,
    currentStep,
    stepIndex,
    isSpeaking,
    isMuted,
    openAssistant,
    closeAssistant,
    nextStep,
    prevStep,
    toggleMute,
    repeatSpeech
  } = useSmartAssistant({ isBlocked });

  // Redireciona qualquer chamada legada de startTour para a assistente inteligente
  useEffect(() => {
    if (isTourOpen) {
      closeTour?.();
      openAssistant();
    }
  }, [isTourOpen, closeTour, openAssistant]);

  const isInitialMenu = location.pathname === '/' || location.pathname === '';

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<SubscriptionPlan>('yearly');
  const [hideTrialBanner, setHideTrialBanner] = useState(false);
  const [hideRenewalBanner, setHideRenewalBanner] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);

  const isPaidCustomer = Boolean((trialInfo?.isPaid || (!trialInfo?.isTrial && trialInfo?.expiresAt)) && !isAdmin);
  const needsRenewal = isPaidCustomer && ((trialInfo?.remainingDays ?? 999) <= 10 || isExpired);

  const currentTrialDay = Math.max(1, Math.min(7, 7 - (trialInfo?.remainingDays ?? 7) + 1));

  // Abre o modal de upgrade quando acionado pelo TrialPopupModal (via App.tsx)
  useEffect(() => {
    if (showUpgradeModal) {
      setIsUpgradeModalOpen(true);
    }
  }, [showUpgradeModal]);

  const handleUpgradeModalClose = () => {
    setIsUpgradeModalOpen(false);
    globalCloseUpgradeModal();
    onUpgradeModalClose?.();
  };

  const handleGoBack = () => {
    triggerLight();
    if (selectedBirdProfileId || isAddBirdModalOpen) {
      closeModals();
      return;
    }
    if (isAdminModalOpen) {
      setIsAdminModalOpen(false);
      return;
    }
    if (effectiveUpgradeModalOpen) {
      handleUpgradeModalClose();
      return;
    }
    if (isRenewalModalOpen) {
      setIsRenewalModalOpen(false);
      return;
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const effectiveUpgradeModalOpen = isUpgradeModalOpen || globalIsUpgradeModalOpen;
  const effectiveUpgradePlan = globalIsUpgradeModalOpen ? globalSelectedUpgradePlan : selectedUpgradePlan;

  const [allowedCpfs, setAllowedCpfs] = useState<AllowedCpf[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [revokeCpfConfirm, setRevokeCpfConfirm] = useState<string | null>(null);

  const [isPwaGuideOpen, setIsPwaGuideOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleOpenAdmin = () => setIsAdminModalOpen(true);
    window.addEventListener('open-admin-modal', handleOpenAdmin);

    return () => {
      window.removeEventListener('open-admin-modal', handleOpenAdmin);
    };
  }, []);

  const fetchAllowedCpfs = async () => {
    setModalLoading(true);
    setModalError('');
    try {
      if (isLocalMode) {
        const localAllowed = await localforage.getItem<AllowedCpf[]>('@mura-manager:local-allowed-cpfs') || [];
        setAllowedCpfs(localAllowed);
      } else {
        const { data, error } = await supabase!
          .from('allowed_cpfs')
          .select('cpf, nome, whatsapp, expires_at')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setAllowedCpfs(data || []);
      }
    } catch (err: any) {
      console.error(err);
      setModalError('Erro ao buscar CPFs cadastrados.');
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && (isAdminModalOpen || allowedCpfs.length === 0)) {
      fetchAllowedCpfs();
    }
  }, [isAdmin, isAdminModalOpen]);

  const handleAddCpf = async (clientData: { cpf: string; nome: string; whatsapp: string; expires_at: string; password?: string }) => {
    const cleanCpf = clientData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setModalError('O CPF deve ter exatamente 11 dígitos.');
      return;
    }
    if (cleanCpf === ADMIN_CPF) {
      setModalError('O CPF do administrador já possui acesso total.');
      return;
    }
    if (allowedCpfs.some(c => c.cpf === cleanCpf)) {
      setModalError('Este CPF já está cadastrado.');
      return;
    }
    if (!clientData.expires_at) {
      setModalError('A data de vencimento é obrigatória.');
      return;
    }

    setActionLoading(true);
    setModalError('');
    try {
      const clientPayload = {
        cpf: cleanCpf,
        nome: clientData.nome.trim() || undefined,
        whatsapp: clientData.whatsapp.replace(/\D/g, '') || undefined,
        expires_at: clientData.expires_at ? new Date(clientData.expires_at).toISOString() : undefined,
        senha: clientData.password?.trim() || undefined,
        email: `${cleanCpf}@mura.com`
      };

      if (isLocalMode) {
        const updatedList = [clientPayload, ...allowedCpfs];
        await localforage.setItem('@mura-manager:local-allowed-cpfs', updatedList);
        setAllowedCpfs(updatedList);
      } else {
        const { error } = await supabase!
          .from('allowed_cpfs')
          .insert([clientPayload]);
          
        if (error) {
          if (error.code === '23505') {
            throw new Error('Este CPF já está cadastrado.');
          }
          throw error;
        }

        const clientPass = clientData.password?.trim() || `mura-${cleanCpf}-secure`;
        await supabase!.auth.signUp({ email: clientPayload.email, password: clientPass }).catch(() => {});

        setAllowedCpfs([clientPayload, ...allowedCpfs]);
      }
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Erro ao cadastrar cliente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveCpf = (cpfToRemove: string) => {
    setRevokeCpfConfirm(cpfToRemove);
  };

  const executeRemoveCpf = async () => {
    if (!revokeCpfConfirm) return;
    const cpfToRemove = revokeCpfConfirm;
    setRevokeCpfConfirm(null);

    setActionLoading(true);
    setModalError('');
    try {
      if (isLocalMode) {
        const updatedList = allowedCpfs.filter(c => c.cpf !== cpfToRemove);
        await localforage.setItem('@mura-manager:local-allowed-cpfs', updatedList);
        setAllowedCpfs(updatedList);
      } else {
        const { error } = await supabase!
          .from('allowed_cpfs')
          .delete()
          .eq('cpf', cpfToRemove);
          
        if (error) throw error;
        setAllowedCpfs(allowedCpfs.filter(c => c.cpf !== cpfToRemove));
      }
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Erro ao remover CPF.');
    } finally {
      setActionLoading(false);
    }
  };

  const getDaysRemaining = (expiryDateStr?: string) => {
    if (!expiryDateStr) return null;
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    expiry.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getWhatsappLink = (phone: string, name?: string, days?: number) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const msgDaysStr = days === 0 ? 'hoje' : days === 1 ? 'amanhã' : `em ${days} dias`;
    const message = encodeURIComponent(
      `Olá ${name || ''}, aqui é da administração do Mura Manager. Lembramos que seu prazo de acesso vence ${msgDaysStr}. Por favor, realize a renovação para manter o seu sistema funcionando normalmente.`
    );
    return `https://wa.me/55${cleanPhone}?text=${message}`;
  };

  const expiringClients = allowedCpfs.filter(c => {
    const days = getDaysRemaining(c.expires_at);
    return days !== null && days <= 3;
  });

  const mainScrollRef = useRef<HTMLDivElement>(null);

  const isAnyModalActive = isAddBirdModalOpen || !!selectedBirdProfileId || isTourOpen || isProfileSetupOpen || isAdminModalOpen;

  useEffect(() => {
    if (isAnyModalActive) {
      document.body.classList.add('modal-open-lock');
      if (mainScrollRef.current) {
        mainScrollRef.current.style.overflow = 'hidden';
      }
    } else {
      document.body.classList.remove('modal-open-lock');
      if (mainScrollRef.current) {
        mainScrollRef.current.style.overflow = '';
      }
    }
    return () => {
      document.body.classList.remove('modal-open-lock');
      if (mainScrollRef.current) {
        mainScrollRef.current.style.overflow = '';
      }
    };
  }, [isAnyModalActive]);

  useEffect(() => {
    if (!isAnyModalActive) return;

    const handleGlobalTouchMove = (e: TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Permite rolagem livre dentro de qualquer modal, overlay, formulário ou elemento rolável
      const isInteractiveOrModal = target.closest(
        '.modal-scrollable-content, .overflow-y-auto, .overflow-auto, [role="dialog"], .fixed, form, input, select, textarea, button'
      );
      if (isInteractiveOrModal) return;

      if (e.cancelable) e.preventDefault();
    };

    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove);
    };
  }, [isAnyModalActive]);

  // ── 🌟 ARQUITETURA KEEP-ALIVE (Padrão Linear.app: 0ms de latência e preservação de estado/scroll) ──
  const getTabKey = (pathname: string): 'dashboard' | 'birds' | 'vitrine' | 'lots' | 'eggs' | 'settings' | 'other' => {
    const clean = pathname.replace(/^\//, '').split('/')[0].toLowerCase();
    if (!clean || clean === 'dashboard') return 'dashboard';
    if (clean === 'birds') return 'birds';
    if (clean === 'vitrine') return 'vitrine';
    if (clean === 'lots') return 'lots';
    if (clean === 'eggs') return 'eggs';
    if (clean === 'settings') return 'settings';
    return 'other';
  };

  const activeTabKey = getTabKey(location.pathname);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([activeTabKey]));
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const lastActiveTabRef = useRef(activeTabKey);

  useEffect(() => {
    if (activeTabKey !== 'other') {
      setVisitedTabs(prev => {
        if (prev.has(activeTabKey)) return prev;
        const next = new Set(prev);
        next.add(activeTabKey);
        return next;
      });
    }

    const prevTab = lastActiveTabRef.current;
    if (mainScrollRef.current && prevTab !== activeTabKey) {
      scrollPositionsRef.current[prevTab] = mainScrollRef.current.scrollTop;
      const restored = scrollPositionsRef.current[activeTabKey] || 0;
      mainScrollRef.current.scrollTop = restored;
      lastActiveTabRef.current = activeTabKey;
    }
  }, [activeTabKey]);

  const expiringCount = expiringClients.length;

  const canAccessLots = hasModuleAccess('lots');

  const navItems = [
    { icon: LayoutDashboard, label: 'Início', path: '/', locked: false },
    { icon: Bird, label: 'Aves & Raças', path: '/birds', locked: false },
    { icon: Store, label: 'Vitrine', path: '/vitrine', locked: false },
    { icon: Layers, label: 'Lotes', path: '/lots', locked: !canAccessLots },
    { icon: Egg, label: 'Ovos', path: '/eggs', locked: !canAccessLots },
    { icon: SettingsIcon, label: 'Configurações', path: '/settings', locked: false },
  ];

  // Mobile bottom nav: first 5 items (no settings — access via profile photo)
  const mobileNavItems = [
    navItems[0], // Dashboard
    navItems[1], // Aves & Raças
    navItems[2], // Vitrine
    navItems[3], // Lotes
    navItems[4], // Ovos
  ];

  return (
    <div className="flex items-center justify-center h-[100dvh] w-full overflow-hidden bg-[#121218] p-2.5 sm:p-4 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)] pl-[max(env(safe-area-inset-left),12px)] pr-[max(env(safe-area-inset-right),12px)] box-border">
      {/* Container Interno Protegido e Perfeitamente Centralizado */}
      <div className="flex flex-1 w-full h-full max-w-7xl rounded-2xl sm:rounded-3xl overflow-hidden bg-theme-base shadow-2xl relative min-w-0">
        <Suspense fallback={null}>
          {isAddBirdModalOpen && <AddBirdModal />}
          {selectedBirdProfileId && <BirdProfileModal />}
          {isProfileSetupOpen && <UserProfileSetupModal isOpen={true} onComplete={finishProfileSetup || (() => {})} />}
        </Suspense>

        {/* ── Assistente Inteligente Mura IA (Contextual por Aba com Voz & Texto) ── */}
        <SmartAssistantModal
          isOpen={isAssistantOpen}
          activeGuide={activeGuide}
          currentStep={currentStep}
          stepIndex={stepIndex}
          isSpeaking={isSpeaking}
          isMuted={isMuted}
          onNext={nextStep}
          onPrev={prevStep}
          onClose={closeAssistant}
          onToggleMute={toggleMute}
          onRepeatSpeech={repeatSpeech}
        />
      
      {/* Sidebar (Desktop) */}
      <aside className="w-64 border-r border-theme-border bg-theme-surface hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-theme-primary to-orange-600 flex items-center justify-center font-black text-black">M</div>
            <span className="font-bold text-xl tracking-tight text-white">MURA<span className="text-theme-primary">MANAGER</span></span>
          </div>
          <p className="text-[10px] text-theme-text-muted uppercase tracking-widest mt-1 font-bold">Elite Poultry System</p>
        </div>

        <nav id="nav-main-menu" className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              id={`nav-link-${item.path === '/' ? 'dashboard' : item.path.replace('/', '')}`}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-sm ${
                  isActive
                    ? 'bg-theme-primary/10 text-theme-primary shadow-[inset_2px_0_0_#F59E0B]'
                    : 'text-theme-text-muted hover:text-white hover:bg-theme-surface-hover'
                }`
              }
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.locked && (
                <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Lock size={9} />
                  <span>PRO</span>
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-theme-primary/5 rounded-full blur-[80px] pointer-events-none hidden md:block" />
        
        {/* Header */}
        <header className="h-16 border-b border-theme-border bg-theme-surface/90 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {!isInitialMenu && (
              <button
                type="button"
                onClick={handleGoBack}
                className="w-9 h-9 rounded-full bg-theme-base/90 hover:bg-theme-surface-hover border border-theme-border/80 hover:border-amber-500/60 text-zinc-300 hover:text-white shadow-lg shadow-black/30 flex items-center justify-center transition-all active:scale-90 cursor-pointer shrink-0 group animate-fade-in"
                title="Voltar para a aba anterior"
                aria-label="Voltar para a aba anterior"
              >
                <ArrowLeft size={18} className="text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}
            <h1 className="font-bold text-lg truncate text-white hidden md:block">{farmSettings.name || 'Mura Manager'}</h1>
            {/* Connection Status Badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider transition-all duration-300 shrink-0 ${
              isOnline 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{isOnline ? 'Sincronizado' : 'Modo Offline'}</span>
            </div>
          </div>
          
          {/* Assistente Inteligente Mura IA Trigger */}
          <button
            id="header-assistant-button"
            onClick={() => {
              triggerLight();
              openAssistant();
            }}
            className="p-2 hover:bg-amber-500/10 text-amber-400 hover:text-amber-300 border border-amber-500/25 hover:border-amber-500/50 rounded-xl transition-all active:scale-95 shrink-0 ml-auto mr-2 flex items-center gap-1.5 text-xs font-black shadow-sm shadow-amber-500/10 cursor-pointer"
            title="Abrir Assistente Inteligente Mura IA (Explicação das ferramentas desta aba)"
          >
            <Sparkles size={16} className="text-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Assistente IA</span>
          </button>

          {/* Admin panel button if CPF is admin */}
          {isAdmin && (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="mr-3 p-2 bg-theme-primary/10 border border-theme-primary/30 hover:border-theme-primary text-theme-primary rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all hover:bg-theme-primary/20 active:scale-95 shrink-0 relative"
              title="Cadastrar Clientes"
            >
              <Users size={14} />
              <span className="hidden sm:inline">Cadastrar Cliente</span>
              {expiringCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-black font-black text-[9px] w-[18px] h-[18px] rounded-full flex items-center justify-center animate-pulse border border-theme-base shadow-lg shadow-orange-500/20">
                  {expiringCount}
                </span>
              )}
            </button>
          )}

          {/* Profile photo → goes to settings */}
          <button
            id="header-profile-button"
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full border-2 border-theme-border hover:border-theme-primary overflow-hidden shrink-0 transition-colors active:scale-95"
            title="Configurações do Criatório"
          >
            {farmSettings.photo ? (
              <img src={farmSettings.photo} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-theme-surface-hover flex items-center justify-center text-lg">🐓</div>
            )}
          </button>
        </header>

        {/* ── AVISO INTELIGENTE DE RENOVAÇÃO (PARA CLIENTES PAGANTES PRÓXIMOS DO VENCIMENTO OU VENCIDOS) ── */}
        {needsRenewal && !hideRenewalBanner && (
          <div className={`border-b px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-xs z-20 shrink-0 animate-fade-in ${
            isExpired 
              ? 'bg-gradient-to-r from-red-500/20 via-[#1a1215] to-red-500/10 border-red-500/30' 
              : (trialInfo?.remainingDays ?? 0) <= 3 
              ? 'bg-gradient-to-r from-orange-500/20 via-[#1a1512] to-orange-500/10 border-orange-500/30' 
              : 'bg-gradient-to-r from-amber-500/15 via-[#16161f] to-amber-500/10 border-amber-500/25'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                isExpired 
                  ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}>
                <RefreshCw size={13} className="animate-spin" style={{ animationDuration: '10s' }} />
              </div>
              <p 
                onClick={() => setIsRenewalModalOpen(true)}
                className="text-white text-xs leading-tight cursor-pointer hover:text-amber-200 transition-colors"
                title="Clique para renovar sua assinatura"
              >
                {isExpired ? (
                  <span>
                    <span className="font-black text-red-400">Sua assinatura está vencida!</span>{' '}
                    <span className="text-theme-text-muted">Renove agora para manter o acesso às informações do seu criatório.</span>
                  </span>
                ) : (trialInfo?.remainingDays ?? 0) === 0 ? (
                  <span>
                    <span className="font-black text-red-400">Sua assinatura vence HOJE!</span>{' '}
                    <span className="text-theme-text-muted">Deseja renovar agora e continuar com tudo liberado?</span>
                  </span>
                ) : (trialInfo?.remainingDays ?? 0) === 1 ? (
                  <span>
                    <span className="font-black text-orange-400">Sua assinatura vence amanhã!</span>{' '}
                    <span className="text-theme-text-muted">Deseja renovar com antecedência?</span>
                  </span>
                ) : (
                  <span>
                    Sua assinatura <span className="font-black text-amber-400">vai vencer em {trialInfo?.remainingDays} dias</span>.{' '}
                    <span className="text-theme-text-muted">Deseja renovar?</span>
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsRenewalModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl font-black text-[10px] sm:text-[11px] uppercase tracking-wider active:scale-95 transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isExpired 
                    ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20' 
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/10'
                }`}
              >
                <Zap size={11} />
                <span>Renovar Agora</span>
              </button>
              <button
                onClick={() => setHideRenewalBanner(true)}
                className="p-1 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                title="Ocultar aviso"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── AVISO INTELIGENTE DE TRIAL (DISCRETO, ELEGANTE E IMPECÁVEL COM LINKS CLICÁVEIS) ── */}
        {!needsRenewal && trialInfo?.isTrial && !isAdmin && !hideTrialBanner && (
          <div className="bg-gradient-to-r from-amber-500/15 via-[#16161f] to-amber-500/10 border-b border-amber-500/25 px-3 sm:px-4 py-2 flex items-center justify-between gap-3 text-xs z-20 shrink-0 animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Sparkles size={13} />
              </div>
              <p 
                onClick={() => {
                  setSelectedUpgradePlan('yearly');
                  setIsUpgradeModalOpen(true);
                }}
                className="text-white text-xs leading-tight cursor-pointer hover:text-amber-200 transition-colors"
                title="Clique para ver os planos"
              >
                {currentTrialDay >= 7 ? (
                  <span>
                    <span className="font-black text-amber-400">Último dia de teste gratuito!</span>{' '}
                    <span className="text-theme-text-muted">Ative agora e garanta acesso às informações do seu criatório.</span>
                  </span>
                ) : (
                  <span>
                    Você está no <span className="font-black text-amber-400">{currentTrialDay}º dia de teste</span>.{' '}
                    <span className="text-theme-text-muted">Ative agora e garanta acesso às informações do seu criatório.</span>
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setSelectedUpgradePlan('yearly');
                  setIsUpgradeModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] sm:text-[11px] uppercase tracking-wider active:scale-95 transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Zap size={11} />
                <span>Ver Planos</span>
              </button>
              <button
                onClick={() => setHideTrialBanner(true)}
                className="p-1 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                title="Ocultar aviso"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div ref={mainScrollRef} className="flex-1 overflow-y-auto smooth-scroll overflow-x-hidden p-4 sm:p-6 z-10 relative pb-24 md:pb-6 gpu-accelerated">
          {/* 🌟 ARQUITETURA KEEP-ALIVE (0ms DE TROCA DE ABAS / SEM REMOUNT DESTRUTIVO) */}
          <Suspense fallback={<TabLoadingFallback />}>
            {visitedTabs.has('dashboard') && (
              <div key="tab-view-dashboard" style={{ display: activeTabKey === 'dashboard' ? 'block' : 'none' }}>
                <Dashboard />
              </div>
            )}
            {visitedTabs.has('birds') && (
              <div key="tab-view-birds" style={{ display: activeTabKey === 'birds' ? 'block' : 'none' }}>
                <Birds />
              </div>
            )}
            {visitedTabs.has('vitrine') && (
              <div key="tab-view-vitrine" style={{ display: activeTabKey === 'vitrine' ? 'block' : 'none' }}>
                <Vitrine />
              </div>
            )}
            {visitedTabs.has('lots') && (
              <div key="tab-view-lots" style={{ display: activeTabKey === 'lots' ? 'block' : 'none' }}>
                <Lots />
              </div>
            )}
            {visitedTabs.has('eggs') && (
              <div key="tab-view-eggs" style={{ display: activeTabKey === 'eggs' ? 'block' : 'none' }}>
                <Eggs />
              </div>
            )}
            {visitedTabs.has('settings') && (
              <div key="tab-view-settings" style={{ display: activeTabKey === 'settings' ? 'block' : 'none' }}>
                <Settings />
              </div>
            )}
            {activeTabKey === 'other' && <Outlet />}
          </Suspense>
        </div>
      </main>

      {/* Floating Bottom Navigation (Mobile Dock) */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 touch-manipulation">
        <nav id="mobile-nav-main-menu" className="bg-[#121218] border border-theme-border/60 rounded-2xl shadow-xl px-2 py-2">
          <div className="flex justify-around items-center h-14">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={triggerLight}
                id={`mobile-nav-link-${item.path === '/' ? 'dashboard' : item.path.replace('/', '')}`}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full h-full gap-1 transition-all rounded-xl active:scale-95 touch-manipulation relative ${
                    isActive ? 'text-theme-primary' : 'text-theme-text-muted hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <item.icon size={18} className={isActive ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] scale-105' : ''} />
                      {item.locked && (
                        <span className="absolute -top-1.5 -right-2 w-3.5 h-3.5 rounded-full bg-amber-500 text-black flex items-center justify-center shadow font-bold">
                          <Lock size={8} />
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] font-black tracking-wide truncate px-1 max-w-full text-center">
                      {item.label.split(' ')[0]}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
      </div>

      {/* Admin CPF Registration Modal Portal */}
      {isAdminModalOpen && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 animate-fade-in"
          onClick={() => setIsAdminModalOpen(false)}
          onTouchMove={e => {
            if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
          }}
        >
          <div 
            className="bg-theme-surface border border-theme-border/80 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up"
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-theme-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-theme-primary" size={20} />
                <h3 className="font-black text-lg text-white font-serif">Controle de Assinaturas</h3>
              </div>
              <button 
                onClick={() => setIsAdminModalOpen(false)}
                className="text-theme-text-muted hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 min-h-0 modal-scrollable-content touch-pan-y">
              <p className="text-xs text-theme-text-muted leading-relaxed">
                Cadastre novos clientes autorizados, defina o prazo de vencimento da mensalidade e receba alertas automáticos de vencimento.
              </p>
              
              {modalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold">
                  {modalError}
                </div>
              )}

              {/* Expiry Notifications Banner */}
              {expiringClients.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                    <Bell size={14} className="animate-bounce" />
                    <span>Alertas de Vencimento (≤ 3 dias ou expirados)</span>
                  </div>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {expiringClients.map(c => {
                      const days = getDaysRemaining(c.expires_at);
                      const isExpired = days !== null && days < 0;
                      return (
                        <div 
                          key={c.cpf} 
                          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all ${
                            isExpired 
                              ? 'bg-red-500/10 border-red-500/20 text-red-300' 
                              : 'bg-orange-500/10 border-orange-500/20 text-orange-300'
                          }`}
                        >
                          <div className="space-y-1">
                            <p className="font-bold flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                              {c.nome || 'Cliente Sem Nome'} 
                              <span className="text-[10px] opacity-75 font-mono">
                                ({formatCPF(c.cpf)})
                              </span>
                            </p>
                            <p className="text-[10px] opacity-80 pl-3">
                              {isExpired 
                                ? `VENCIDO há ${Math.abs(days!)} ${Math.abs(days!) === 1 ? 'dia' : 'dias'}` 
                                : days === 0 
                                ? 'Vence HOJE!' 
                                : days === 1 
                                ? 'Vence amanhã!' 
                                : `Vence em ${days} dias`
                              } ({c.expires_at ? new Date(c.expires_at).toLocaleDateString('pt-BR') : ''})
                            </p>
                          </div>
                          {c.whatsapp && (
                            <a
                              href={getWhatsappLink(c.whatsapp, c.nome, days!)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold text-[10px] shrink-0 border transition-all active:scale-95 ${
                                isExpired
                                  ? 'bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-white'
                                  : 'bg-orange-500/20 border-orange-500/30 hover:bg-orange-500/30 text-white'
                              }`}
                            >
                              <MessageSquare size={12} />
                              <span>Notificar WhatsApp</span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Add Client Form */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  Cadastrar Novo Cliente
                </h4>
                <AdminAddClientForm onAdd={handleAddCpf} loading={actionLoading} />
              </div>
              
              {/* CPFs List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  Lista de Clientes Cadastrados ({allowedCpfs.length})
                </h4>
                
                {modalLoading ? (
                  <div className="py-8 flex justify-center items-center">
                    <Loader2 size={24} className="animate-spin text-theme-primary" />
                  </div>
                ) : allowedCpfs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-theme-text-muted border border-dashed border-theme-border rounded-xl">
                    Nenhum cliente cadastrado ainda.
                  </div>
                ) : (
                  <div className="border border-theme-border rounded-xl overflow-hidden divide-y divide-theme-border max-h-[220px] overflow-y-auto pr-1">
                    {allowedCpfs.map((client) => {
                      const days = getDaysRemaining(client.expires_at);
                      const isExpired = days !== null && days < 0;
                      return (
                        <div key={client.cpf} className="p-3 bg-theme-base/20 flex items-center justify-between text-xs gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white truncate max-w-[150px]" title={client.nome}>
                                {(client.nome || 'Sem Nome').replace(/\[(COMUM|COMPLETO|ANUAL|PRO)\]/gi, '').trim() || 'Sem Nome'}
                              </span>
                              {client.nome?.toUpperCase().includes('[COMUM]') ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                  Comum
                                </span>
                              ) : client.nome?.toUpperCase().includes('[COMPLETO]') || client.nome?.toUpperCase().includes('[PRO]') ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  Completo
                                </span>
                              ) : client.nome?.toUpperCase().includes('[ANUAL]') || (days !== null && days > 60) ? (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                  Anual
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-zinc-500/20 text-zinc-300 border border-zinc-500/30">
                                  Mensal
                                </span>
                              )}
                              <span className="font-mono text-[10px] text-theme-text-muted">
                                {formatCPF(client.cpf)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-theme-text-muted flex-wrap">
                              {client.whatsapp && (
                                <span>WhatsApp: {client.whatsapp.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}</span>
                              )}
                              {client.expires_at && (
                                <span className={isExpired ? 'text-red-400 font-bold' : days !== null && days <= 3 ? 'text-orange-400 font-bold' : 'text-green-400'}>
                                  Vencimento: {new Date(client.expires_at).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveCpf(client.cpf)}
                            disabled={actionLoading}
                            className="text-red-400 hover:text-red-300 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg disabled:opacity-50 shrink-0"
                            title="Revogar Acesso"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-theme-border bg-theme-base/20 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(false)}
                className="px-4 py-2 bg-theme-base hover:bg-theme-surface-hover border border-theme-border hover:border-theme-primary text-white rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* CHECKOUT OFICIAL DENTRO DO APP (IDÊNTICO À PÁGINA INICIAL) */}
      <LandingCheckoutModal
        isOpen={effectiveUpgradeModalOpen}
        onClose={handleUpgradeModalClose}
        initialPlan={effectiveUpgradePlan}
        currentUser={{
          cpf,
          nome: farmSettings.name,
          email: user?.email,
          whatsapp: farmSettings.phone,
        }}
        onSuccess={async () => {
          await activateSubscription(effectiveUpgradePlan);
          showToast('Assinatura ativada com sucesso! Seu criatório está liberado.', 'success');
        }}
      />

      {/* MODAL DE RENOVAÇÃO SIMPLIFICADA COM UPSELL INTELIGENTE */}
      <RenewalModal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        currentPlan={trialInfo?.planType || 'monthly'}
        daysRemaining={trialInfo?.remainingDays ?? 0}
        currentUser={{
          cpf,
          nome: farmSettings.name,
          email: user?.email,
          whatsapp: farmSettings.phone,
        }}
        onRenewSuccess={async (renewedPlan) => {
          await activateSubscription(renewedPlan);
          showToast('Assinatura renovada com sucesso! Seu criatório está ativo.', 'success');
        }}
      />

      {/* Modal Interativo de Instruções PWA */}
      <Suspense fallback={null}>
        <PWAInstallGuideModal
          isOpen={isPwaGuideOpen}
          onClose={() => setIsPwaGuideOpen(false)}
        />
      </Suspense>

      {/* Confirmação de Revogação de Acesso */}
      <ConfirmDialog
        isOpen={Boolean(revokeCpfConfirm)}
        title="Revogar Acesso do Cliente?"
        message={`Tem certeza que deseja revogar o acesso do CPF ${revokeCpfConfirm ? formatCPF(revokeCpfConfirm) : ''}? O cliente perderá o acesso à plataforma imediatamente.`}
        confirmLabel="Revogar Acesso"
        confirmVariant="danger"
        onConfirm={executeRemoveCpf}
        onCancel={() => setRevokeCpfConfirm(null)}
      />
    </div>
  );
}
