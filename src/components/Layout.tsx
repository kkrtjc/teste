import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Egg, Dna, Activity, Settings, Beef, Skull, Bird } from 'lucide-react';
import { AddBirdModal } from './modals/AddBirdModal';
import { BirdProfileModal } from './modals/BirdProfileModal';
import { useAppContext } from '../lib/AppContext';

export function Layout() {
  const { farmSettings } = useAppContext();
  const navigate = useNavigate();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Bird, label: 'Aves & Raças', path: '/birds' },
    { icon: Dna, label: 'Genética & Cruza', path: '/genetics' },
    { icon: Beef, label: 'Engorda', path: '/meat' },
    { icon: Egg, label: 'Postura & Chocadeira', path: '/eggs' },
    { icon: Activity, label: 'Saúde & Vacinas', path: '/health' },
    { icon: Skull, label: 'Baixas & Descartes', path: '/losses' },
    { icon: Settings, label: 'Configurações', path: '/settings' },
  ];

  // Mobile bottom nav: first 5 items (no settings — access via profile photo)
  const mobileNavItems = [
    navItems[0], // Dashboard
    navItems[1], // Aves
    navItems[2], // Genética
    navItems[3], // Engorda
    navItems[4], // Postura
  ];

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-theme-base pb-[env(safe-area-inset-bottom)]">
      <AddBirdModal />
      <BirdProfileModal />
      
      {/* Sidebar (Desktop) */}
      <aside className="w-64 border-r border-theme-border bg-theme-surface/30 backdrop-blur-md hidden md:flex flex-col">
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
        <header className="h-16 border-b border-theme-border bg-theme-surface/50 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-10 shrink-0 mt-[env(safe-area-inset-top)]">
          <div className="md:hidden flex items-center gap-2 mr-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-theme-primary to-orange-600 flex items-center justify-center font-black text-black text-xs">M</div>
          </div>
          <h1 className="font-bold text-lg truncate text-white">{farmSettings.name || 'Mura Manager'}</h1>
          
          {/* Profile photo → goes to settings */}
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full border-2 border-theme-border hover:border-theme-primary overflow-hidden shrink-0 ml-auto transition-colors active:scale-95"
            title="Configurações do Criatório"
          >
            {farmSettings.photo ? (
              <img src={farmSettings.photo} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-theme-surface-hover flex items-center justify-center text-lg">🐓</div>
            )}
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 z-10 relative pb-20 md:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-theme-surface/90 backdrop-blur-lg border-t border-theme-border z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16 px-2">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                  isActive ? 'text-theme-primary' : 'text-theme-text-muted hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={isActive ? 'drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' : ''} />
                  <span className="text-[9px] font-bold truncate px-1 max-w-full text-center">
                    {item.label.split(' ')[0]}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

