import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, Egg, Dna, Activity, Settings, LogOut, Beef, Skull, Bird } from 'lucide-react';
import { AddBirdModal } from './modals/AddBirdModal';
import { BirdProfileModal } from './modals/BirdProfileModal';

export function Layout() {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Bird, label: 'Aves & Raças', path: '/birds' },
    { icon: Dna, label: 'Genética & Cruza', path: '/genetics' },
    { icon: Beef, label: 'Produção de Corte', path: '/meat' },
    { icon: Egg, label: 'Postura & Chocadeira', path: '/eggs' },
    { icon: Activity, label: 'Saúde & Vacinas', path: '/health' },
    { icon: Skull, label: 'Baixas & Descartes', path: '/losses' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-theme-base pb-[env(safe-area-inset-bottom)]">
      <AddBirdModal />
      <BirdProfileModal />
      
      {/* Sidebar Principal (Desktop) */}
      <aside className="w-64 border-r border-theme-border bg-theme-surface/30 backdrop-blur-md hidden md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-theme-primary to-orange-600 flex items-center justify-center font-black text-black">M</div>
            <span className="font-bold text-xl tracking-tight text-white">MURA<span className="text-theme-primary">MANAGER</span></span>
          </div>
          <p className="text-[10px] text-theme-text-muted uppercase tracking-widest mt-1 font-bold">Elite Poultry System</p>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
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

        <div className="p-4 border-t border-theme-border">
          <button className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-xl text-theme-text-muted hover:text-red-400 hover:bg-red-400/10 transition-all font-medium text-sm">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Glow effect on top right */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-theme-primary/5 rounded-full blur-[100px] pointer-events-none" />
        
        <header className="h-16 border-b border-theme-border bg-theme-surface/50 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-10 shrink-0 mt-[env(safe-area-inset-top)]">
          <div className="md:hidden flex items-center gap-2 mr-2">
             <div className="w-6 h-6 rounded bg-gradient-to-br from-theme-primary to-orange-600 flex items-center justify-center font-black text-black text-xs">M</div>
          </div>
          <h1 className="font-bold text-lg truncate">Visão Geral</h1>
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white">Criatório Galos Mura</p>
              <p className="text-xs text-theme-text-muted">Plano Elite PRO</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-theme-surface-hover border border-theme-border overflow-hidden shrink-0">
              <img src="https://ui-avatars.com/api/?name=Joao+Paulo&background=F59E0B&color=000" alt="Avatar" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 z-10 relative pb-20 md:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-theme-surface/90 backdrop-blur-lg border-t border-theme-border z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16 px-2">
          {menuItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive ? 'text-theme-primary' : 'text-theme-text-muted hover:text-white'
                }`
              }
            >
              <item.icon size={20} className={({ isActive }: any) => isActive ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : ''} />
              <span className="text-[9px] font-bold truncate px-1 max-w-full text-center">
                {item.label.split(' ')[0]}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
