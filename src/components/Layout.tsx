import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Dna, Activity, Settings, LogOut, Beef, Skull, Bird, Layers, HelpCircle, Sparkles, BookOpen, Gift } from 'lucide-react';
import { AddBirdModal } from './modals/AddBirdModal';
import { BirdProfileModal } from './modals/BirdProfileModal';
import { OnboardingTour, TrialWelcomeModal } from './modals/OnboardingTour';
import { UserProfileSetupModal } from './modals/UserProfileSetupModal';
import { useAppContext } from '../lib/AppContext';

export function Layout() {
  const {
    isTourOpen, isTrialModalOpen, startTour, closeTour, finishTour, closeTrialModal,
    userProfile, isProfileSetupOpen, closeProfileSetup, finishProfileSetup, openProfileSetup
  } = useAppContext();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Bird, label: 'Aves & Raças', path: '/birds' },
    { icon: Layers, label: 'Controle de Lotes', path: '/lots' },
    { icon: Dna, label: 'Genética & Cruza', path: '/genetics' },
    { icon: Beef, label: 'Produção de Corte', path: '/meat' },
    { icon: Activity, label: 'Saúde & Vacinas', path: '/health' },
    { icon: Skull, label: 'Baixas & Descartes', path: '/losses' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-theme-base">
      <AddBirdModal />
      <BirdProfileModal />

      {/* Tutorial Guiado (Manual), Formulário do Perfil & Modal 7 Dias Grátis */}
      <OnboardingTour
        isOpen={isTourOpen}
        onClose={closeTour}
        onComplete={finishTour}
      />
      <UserProfileSetupModal
        isOpen={isProfileSetupOpen}
        onClose={closeProfileSetup}
        onComplete={finishProfileSetup}
      />
      <TrialWelcomeModal
        isOpen={isTrialModalOpen}
        onClose={closeTrialModal}
      />

      {/* Sidebar Principal */}
      <aside className="w-64 border-r border-theme-border bg-theme-surface/30 backdrop-blur-md flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-theme-primary to-orange-600 flex items-center justify-center font-black text-black">M</div>
            <span className="font-bold text-xl tracking-tight text-white">MURA<span className="text-theme-primary">MANAGER</span></span>
          </div>
          <p className="text-[10px] text-theme-text-muted uppercase tracking-widest mt-1 font-bold">Elite Poultry System</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
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

        {/* Botão de abrir tutorial na sidebar */}
        <div className="px-4 py-2">
          <button
            onClick={startTour}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 border border-amber-500/40 hover:border-amber-400 rounded-xl text-xs font-bold text-amber-300 transition-all flex items-center justify-center gap-2 group"
          >
            <BookOpen size={15} className="text-amber-400 group-hover:scale-110 transition-transform"/>
            Manual & Tutorial
          </button>
        </div>

        <div className="p-4 border-t border-theme-border">
          <button className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-xl text-theme-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all font-medium text-sm">
            <LogOut size={18} />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Glow effect on top right */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-theme-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        <header className="h-16 border-b border-theme-border bg-theme-surface/50 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-lg text-white">Visão Geral</h1>
            {/* Badge 7 Dias Grátis */}
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              <Gift size={12} className="text-amber-400" /> 7d de Trial Elite PRO
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={startTour}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-border text-xs font-bold text-amber-300 transition-all"
            >
              <HelpCircle size={14} className="text-amber-400"/>
              <span className="hidden sm:inline">Manual de Uso</span>
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white">{userProfile?.nomeCriatorio || 'Criatório Galos Mura'}</p>
              <p className="text-xs text-amber-400 font-bold flex items-center gap-1 justify-end">
                <Sparkles size={11}/> Plano Elite PRO
              </p>
            </div>
            <div
              onClick={openProfileSetup}
              title="Clique para editar o perfil do criatório"
              className="w-10 h-10 rounded-full bg-theme-surface-hover border border-theme-border overflow-hidden cursor-pointer hover:border-amber-400 transition-colors shadow-md"
            >
              <img
                src={userProfile?.fotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.nome || 'Joao Paulo')}&background=F59E0B&color=000`}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 z-10 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
