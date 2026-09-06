import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Layers, Settings, 
  Bird, ShieldCheck, Users, X, Trash2, Loader2,
  Bell, MessageSquare, HelpCircle, Egg, Download, Share2, Sparkles, Copy, CheckCircle2
} from 'lucide-react';
import { AddBirdModal } from './modals/AddBirdModal';
import { BirdProfileModal } from './modals/BirdProfileModal';
import { OnboardingTour } from './modals/OnboardingTour';
import { UserProfileSetupModal } from './modals/UserProfileSetupModal';
import { PWAInstallGuideModal } from './modals/PWAInstallGuideModal';
import { useAppContext } from '../lib/AppContext';
import { useAuth, ADMIN_CPF } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';
import localforage from 'localforage';

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
}

export function Layout({ showUpgradeModal = false, onUpgradeModalClose }: LayoutProps) {
  const { farmSettings, openTutorial, isAddBirdModalOpen, selectedBirdProfileId, isTourOpen, isProfileSetupOpen, startTour, closeTour, finishProfileSetup } = useAppContext();
  const navigate = useNavigate();
  const { isLocalMode, triggerWebhookPayment, isAdmin } = useAuth();

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState<'monthly' | 'yearly'>('yearly');
  const [copiedPixUpgrade, setCopiedPixUpgrade] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Abre o modal de upgrade quando acionado pelo TrialPopupModal (via App.tsx)
  useEffect(() => {
    if (showUpgradeModal) {
      setIsUpgradeModalOpen(true);
    }
  }, [showUpgradeModal]);

  const handleUpgradeModalClose = () => {
    setIsUpgradeModalOpen(false);
    onUpgradeModalClose?.();
  };

  const [allowedCpfs, setAllowedCpfs] = useState<AllowedCpf[]>([]);
  const [newCpf, setNewCpf] = useState('');
  const [newName, setNewName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Estados para gerenciamento de atalho de PWA (Instalação rápida)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isPwaGuideOpen, setIsPwaGuideOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
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
    // Detecta se já está rodando no modo aplicativo atalho (standalone)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Exibe se não instalado e usuário não fechou nas últimas 7 dias
      const closedAt = localStorage.getItem('@mura-manager:install-banner-closed');
      const isRecentlyClosed = closedAt && (Date.now() - Number(closedAt)) < 7 * 24 * 60 * 60 * 1000;
      if (!isStandaloneMode && !isRecentlyClosed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Detecta dispositivo iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const closedAt = localStorage.getItem('@mura-manager:install-banner-closed');
    const isRecentlyClosed = closedAt && (Date.now() - Number(closedAt)) < 7 * 24 * 60 * 60 * 1000;
    if (ios && !isStandaloneMode && !isRecentlyClosed) {
      setShowInstallBanner(true);
    }

    const handleOpenAdmin = () => setIsAdminModalOpen(true);
    window.addEventListener('open-admin-modal', handleOpenAdmin);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('open-admin-modal', handleOpenAdmin);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Escolha do prompt de instalação: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleCloseInstallBanner = () => {
    setShowInstallBanner(false);
    // Guarda o timestamp atual; o banner reaparecerá após 7 dias
    localStorage.setItem('@mura-manager:install-banner-closed', String(Date.now()));
  };

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

  const handleAddCpf = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = newCpf.replace(/\D/g, '');
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
    if (!newExpiresAt) {
      setModalError('A data de vencimento é obrigatória.');
      return;
    }

    setActionLoading(true);
    setModalError('');
    try {
      const clientPayload = {
        cpf: cleanCpf,
        nome: newName.trim() || undefined,
        whatsapp: newWhatsapp.replace(/\D/g, '') || undefined,
        expires_at: newExpiresAt ? new Date(newExpiresAt).toISOString() : undefined,
        senha: newPassword.trim() || undefined,
        email: `${cleanCpf}@mura.com`
      };

      if (isLocalMode) {
        const updatedList = [clientPayload, ...allowedCpfs];
        await localforage.setItem('@mura-manager:local-allowed-cpfs', updatedList);
        setAllowedCpfs(updatedList);
        setNewCpf('');
        setNewName('');
        setNewWhatsapp('');
        setNewExpiresAt('');
        setNewPassword('');
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

        const clientPass = newPassword.trim() || `mura-${cleanCpf}-secure`;
        await supabase!.auth.signUp({ email: clientPayload.email, password: clientPass }).catch(() => {});

        setAllowedCpfs([clientPayload, ...allowedCpfs]);
        setNewCpf('');
        setNewName('');
        setNewWhatsapp('');
        setNewExpiresAt('');
        setNewPassword('');
      }
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Erro ao cadastrar cliente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveCpf = async (cpfToRemove: string) => {
    const formattedCpf = formatCPF(cpfToRemove);
    if (!window.confirm(`Tem certeza que deseja revogar o acesso do CPF ${formattedCpf}?`)) {
      return;
    }

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
      setModalError('Erro ao remover CPF.');
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
      const scrollableContent = target?.closest('.modal-scrollable-content');
      if (!scrollableContent) {
        if (e.cancelable) e.preventDefault();
      }
    };

    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove);
    };
  }, [isAnyModalActive]);

  // Garante que qualquer redirecionamento, navegação por atalho ou troca de aba abra no TOPO da página
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search, (location as any).state]);

  const expiringCount = expiringClients.length;

  const navItems = [
    { icon: LayoutDashboard, label: 'Início', path: '/' },
    { icon: Bird, label: 'Aves & Raças', path: '/birds' },
    { icon: Layers, label: 'Lotes', path: '/lots' },
    { icon: Egg, label: 'Ovos', path: '/eggs' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  // Mobile bottom nav: first 4 items (no settings — access via profile photo)
  const mobileNavItems = [
    navItems[0], // Dashboard
    navItems[1], // Aves & Raças
    navItems[2], // Lotes
    navItems[3], // Ovos
  ];

  return (
    <div className="flex items-center justify-center h-[100dvh] w-full overflow-hidden bg-[#121218] p-2.5 sm:p-4 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)] pl-[max(env(safe-area-inset-left),12px)] pr-[max(env(safe-area-inset-right),12px)] box-border">
      {/* Container Interno Protegido e Perfeitamente Centralizado */}
      <div className="flex flex-1 w-full h-full max-w-7xl rounded-2xl sm:rounded-3xl overflow-hidden bg-theme-base shadow-2xl relative min-w-0">
        {isAddBirdModalOpen && <AddBirdModal />}
        {selectedBirdProfileId && <BirdProfileModal />}
        {isTourOpen && <OnboardingTour isOpen={true} onClose={closeTour || (() => {})} onComplete={closeTour || (() => {})} />}
        {isProfileSetupOpen && <UserProfileSetupModal isOpen={true} onComplete={finishProfileSetup || (() => {})} />}
      
      {/* Sidebar (Desktop) */}
      <aside className="w-64 border-r border-theme-border bg-theme-surface hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-theme-primary to-orange-600 flex items-center justify-center font-black text-black">M</div>
            <span className="font-bold text-xl tracking-tight text-white">MURA<span className="text-theme-primary">MANAGER</span></span>
          </div>
          <p className="text-[10px] text-theme-text-muted uppercase tracking-widest mt-1 font-bold">Elite Poultry System</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
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
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-theme-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Header */}
        <header className="h-16 border-b border-theme-border bg-theme-surface/90 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
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
          
          {/* Help / Tutorial Trigger */}
          <button
            onClick={startTour || openTutorial}
            className="p-2 hover:bg-white/5 text-theme-text-muted hover:text-white rounded-xl transition-all active:scale-95 shrink-0 ml-auto mr-2 flex items-center gap-1.5 text-xs font-bold"
            title="Tutorial de Uso"
          >
            <HelpCircle size={18} />
            <span className="hidden sm:inline">Ajuda</span>
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

        <div ref={mainScrollRef} className="flex-1 overflow-y-auto smooth-scroll overflow-x-hidden p-4 sm:p-6 z-10 relative pb-24 md:pb-6 gpu-accelerated">
          {showInstallBanner && (
            <div className="mb-4 bg-theme-surface border border-theme-primary/30 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 animate-fade-in relative overflow-hidden backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center shrink-0">
                  <Download size={20} className="animate-bounce" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm text-white">Instalar Mura Manager</p>
                  {isIOS ? (
                    <p className="text-xs text-theme-text-muted mt-0.5 leading-relaxed">
                      Toque em <Share2 className="inline-block text-theme-primary mx-1" size={14} /> e selecione <strong className="text-white">Adicionar à Tela de Início</strong> no seu Safari.
                    </p>
                  ) : (
                    <p className="text-xs text-theme-text-muted mt-0.5">
                      Instale o atalho na tela inicial para usar offline e em tela cheia.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!isIOS && deferredPrompt ? (
                  <button 
                    onClick={handleInstallClick}
                    className="bg-theme-primary hover:bg-amber-400 text-black font-extrabold text-xs px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                  >
                    <Download size={14} />
                    <span>Instalar (1 Clique)</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsPwaGuideOpen(true)}
                    className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <span>Como Salvar</span>
                  </button>
                )}
                <button 
                  onClick={handleCloseInstallBanner}
                  className="p-2 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  title="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Floating Bottom Navigation (Mobile Dock) */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 touch-manipulation">
        <nav className="bg-theme-surface/85 backdrop-blur-xl border border-theme-border/60 rounded-2xl shadow-2xl px-2 py-2">
          <div className="flex justify-around items-center h-14">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                id={`mobile-nav-link-${item.path === '/' ? 'dashboard' : item.path.replace('/', '')}`}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full h-full gap-1 transition-all rounded-xl active:scale-95 touch-manipulation ${
                    isActive ? 'text-theme-primary' : 'text-theme-text-muted hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className={isActive ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] scale-105' : ''} />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 animate-fade-in">
          <div className="bg-theme-surface border border-theme-border/80 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-theme-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-theme-primary" size={20} />
                <h3 className="font-black text-lg text-white font-serif">Controle de Assinaturas</h3>
              </div>
              <button 
                onClick={() => setIsAdminModalOpen(false)}
                className="text-theme-text-muted hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
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
                <form onSubmit={handleAddCpf} className="space-y-3 bg-theme-base/30 p-4 border border-theme-border rounded-xl">
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
                    disabled={actionLoading}
                    className="btn-primary w-full py-2.5 rounded-xl flex items-center justify-center font-black text-xs gap-2 disabled:opacity-50 active:scale-95 transition-all mt-1"
                  >
                    {actionLoading ? (
                      <Loader2 size={16} className="animate-spin text-black" />
                    ) : (
                      <>
                        <Users size={14} />
                        <span>Autorizar e Cadastrar Cliente</span>
                      </>
                    )}
                  </button>
                </form>
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
                                {client.nome || 'Sem Nome'}
                              </span>
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

      {/* MODAL DE UPGRADE / LIBERAÇÃO AUTOMÁTICA DENTRO DO APP */}
      {isUpgradeModalOpen && createPortal(
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-theme-surface border border-theme-border rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5 animate-scale-up overflow-hidden">
            <div className="flex items-center justify-between border-b border-theme-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Garantir Acesso Continuado</h3>
                  <p className="text-[10px] text-theme-text-muted">Ativação 100% automática e instantânea</p>
                </div>
              </div>
              <button 
                onClick={handleUpgradeModalClose}
                className="p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Plan Selector */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => setUpgradePlan('monthly')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  upgradePlan === 'monthly' ? 'border-amber-500 bg-amber-500/10' : 'border-theme-border bg-theme-base/40'
                }`}
              >
                <p className="font-bold text-xs text-white">Plano Mensal</p>
                <p className="text-lg font-black text-amber-400 mt-1">R$ 19,90<span className="text-[9px] text-theme-text-muted font-normal">/mês</span></p>
              </div>

              <div 
                onClick={() => setUpgradePlan('yearly')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all relative overflow-hidden ${
                  upgradePlan === 'yearly' ? 'border-amber-500 bg-amber-500/10' : 'border-theme-border bg-theme-base/40'
                }`}
              >
                <span className="absolute top-0 right-0 bg-amber-500 text-black text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg">Promo</span>
                <p className="font-bold text-xs text-white">Plano Anual</p>
                <p className="text-lg font-black text-emerald-400 mt-1">R$ 199,90<span className="text-[9px] text-theme-text-muted font-normal">/ano</span></p>
              </div>
            </div>

            {/* Pix key copy */}
            <div className="bg-theme-base/60 border border-theme-border p-3.5 rounded-2xl space-y-2 text-center">
              <p className="text-[11px] font-bold text-white">Chave Pix para Pagamento</p>
              <div className="flex items-center justify-between bg-theme-surface border border-theme-border rounded-xl px-3 py-1.5 text-xs">
                <span className="font-mono text-white text-[11px] truncate">mura.manager.pay@gmail.com</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('mura.manager.pay@gmail.com');
                    setCopiedPixUpgrade(true);
                    setTimeout(() => setCopiedPixUpgrade(false), 2500);
                  }}
                  className="p-1 text-amber-400 font-bold text-[10px] flex items-center gap-1 hover:text-white"
                >
                  {copiedPixUpgrade ? <CheckCircle2 size={12}/> : <Copy size={12}/>}
                  <span>{copiedPixUpgrade ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            {/* Webhook Status Listener */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs">
                <Loader2 size={14} className="animate-spin" />
                <span>Aguardando confirmação via Webhook...</span>
              </div>
              <p className="text-[10px] text-theme-text-muted">
                Escutando a aprovação do gateway em tempo real.
              </p>
            </div>

            {/* Simulated Webhook Button */}
            <button
              onClick={async () => {
                setUpgradeLoading(true);
                const { error } = await triggerWebhookPayment(upgradePlan);
                setUpgradeLoading(false);
                if (!error) {
                  setIsUpgradeModalOpen(false);
                } else {
                  alert('Erro ao acionar simulador de Webhook.');
                }
              }}
              disabled={upgradeLoading}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {upgradeLoading ? <Loader2 size={16} className="animate-spin text-black" /> : <><Sparkles size={16} /> Simular Liberação por Webhook (Teste)</>}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Interativo de Instruções PWA */}
      <PWAInstallGuideModal
        isOpen={isPwaGuideOpen}
        onClose={() => setIsPwaGuideOpen(false)}
      />
    </div>
  );
}
