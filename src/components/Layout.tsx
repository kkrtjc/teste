import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Egg, Dna, Activity, Settings, Beef, 
  Skull, Bird, ShieldCheck, Users, X, Trash2, Loader2 
} from 'lucide-react';
import { AddBirdModal } from './modals/AddBirdModal';
import { BirdProfileModal } from './modals/BirdProfileModal';
import { useAppContext } from '../lib/AppContext';
import { useAuth, ADMIN_CPF } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';
import localforage from 'localforage';

export function Layout() {
  const { farmSettings } = useAppContext();
  const navigate = useNavigate();
  const { cpf, isLocalMode } = useAuth();
  const isAdmin = cpf === ADMIN_CPF;

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [allowedCpfs, setAllowedCpfs] = useState<string[]>([]);
  const [newCpf, setNewCpf] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchAllowedCpfs = async () => {
    setModalLoading(true);
    setModalError('');
    try {
      if (isLocalMode) {
        const localAllowed = await localforage.getItem<string[]>('@mura-manager:local-allowed-cpfs') || [];
        setAllowedCpfs(localAllowed);
      } else {
        const { data, error } = await supabase!
          .from('allowed_cpfs')
          .select('cpf')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setAllowedCpfs(data.map((item: any) => item.cpf));
      }
    } catch (err: any) {
      console.error(err);
      setModalError('Erro ao buscar CPFs cadastrados.');
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminModalOpen) {
      fetchAllowedCpfs();
    }
  }, [isAdminModalOpen]);

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
    if (allowedCpfs.includes(cleanCpf)) {
      setModalError('Este CPF já está cadastrado.');
      return;
    }

    setActionLoading(true);
    setModalError('');
    try {
      if (isLocalMode) {
        const updatedList = [cleanCpf, ...allowedCpfs];
        await localforage.setItem('@mura-manager:local-allowed-cpfs', updatedList);
        setAllowedCpfs(updatedList);
        setNewCpf('');
      } else {
        const { error } = await supabase!
          .from('allowed_cpfs')
          .insert([{ cpf: cleanCpf }]);
          
        if (error) {
          if (error.code === '23505') {
            throw new Error('Este CPF já está cadastrado.');
          }
          throw error;
        }
        setAllowedCpfs([cleanCpf, ...allowedCpfs]);
        setNewCpf('');
      }
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Erro ao cadastrar CPF.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveCpf = async (cpfToRemove: string) => {
    const formattedCpf = cpfToRemove.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    if (!window.confirm(`Tem certeza que deseja revogar o acesso do CPF ${formattedCpf}?`)) {
      return;
    }

    setActionLoading(true);
    setModalError('');
    try {
      if (isLocalMode) {
        const updatedList = allowedCpfs.filter(c => c !== cpfToRemove);
        await localforage.setItem('@mura-manager:local-allowed-cpfs', updatedList);
        setAllowedCpfs(updatedList);
      } else {
        const { error } = await supabase!
          .from('allowed_cpfs')
          .delete()
          .eq('cpf', cpfToRemove);
          
        if (error) throw error;
        setAllowedCpfs(allowedCpfs.filter(c => c !== cpfToRemove));
      }
    } catch (err: any) {
      console.error(err);
      setModalError('Erro ao remover CPF.');
    } finally {
      setActionLoading(false);
    }
  };

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
          
          {/* Admin panel button if CPF is admin */}
          {isAdmin && (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="mr-3 p-2 bg-theme-primary/10 border border-theme-primary/30 hover:border-theme-primary text-theme-primary rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all hover:bg-theme-primary/20 active:scale-95 shrink-0 ml-auto"
              title="Cadastrar Clientes"
            >
              <Users size={14} />
              <span className="hidden sm:inline">Cadastrar Cliente</span>
            </button>
          )}

          {/* Profile photo → goes to settings */}
          <button
            onClick={() => navigate('/settings')}
            className={`w-10 h-10 rounded-full border-2 border-theme-border hover:border-theme-primary overflow-hidden shrink-0 transition-colors active:scale-95 ${!isAdmin ? 'ml-auto' : ''}`}
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

      {/* Admin CPF Registration Modal Portal */}
      {isAdminModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface border border-theme-border/80 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-theme-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-theme-primary" size={20} />
                <h3 className="font-black text-lg text-white">Cadastrar Clientes</h3>
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
                Adicione o CPF dos clientes para autorizar o acesso deles ao sistema. Apenas CPFs listados abaixo poderão fazer login.
              </p>
              
              {modalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold">
                  {modalError}
                </div>
              )}
              
              {/* Add CPF Form */}
              <form onSubmit={handleAddCpf} className="flex gap-2">
                <div className="relative flex-1">
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
                    className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors font-bold text-center tracking-wider"
                    placeholder="000.000.000-00"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary px-4 rounded-xl flex items-center justify-center font-black text-xs shrink-0 disabled:opacity-50 active:scale-95 transition-all"
                >
                  {actionLoading ? (
                    <Loader2 size={16} className="animate-spin text-black" />
                  ) : (
                    "Autorizar"
                  )}
                </button>
              </form>
              
              {/* CPFs List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  CPFs Autorizados ({allowedCpfs.length})
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
                  <div className="border border-theme-border rounded-xl overflow-hidden divide-y divide-theme-border max-h-[250px] overflow-y-auto">
                    {allowedCpfs.map((cpfItem) => (
                      <div key={cpfItem} className="p-3 bg-theme-base/20 flex items-center justify-between text-sm">
                        <span className="font-mono text-white font-bold">
                          {cpfItem.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                        </span>
                        <button
                          onClick={() => handleRemoveCpf(cpfItem)}
                          disabled={actionLoading}
                          className="text-red-400 hover:text-red-300 transition-colors p-1.5 hover:bg-red-500/10 rounded-lg disabled:opacity-50"
                          title="Revogar Acesso"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
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
    </div>
  );
}

