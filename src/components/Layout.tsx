import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Layers, Settings, 
  Bird, ShieldCheck, Users, X, Trash2, Loader2,
  Bell, MessageSquare, HelpCircle, Egg
} from 'lucide-react';
import { AddBirdModal } from './modals/AddBirdModal';
import { BirdProfileModal } from './modals/BirdProfileModal';
import { TutorialModal } from './modals/TutorialModal';
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
};

export function Layout() {
  const { farmSettings, openTutorial, isAddBirdModalOpen, selectedBirdProfileId, isTutorialOpen } = useAppContext();
  const navigate = useNavigate();
  const { cpf, isLocalMode } = useAuth();
  const isAdmin = cpf === ADMIN_CPF;

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [allowedCpfs, setAllowedCpfs] = useState<AllowedCpf[]>([]);
  const [newCpf, setNewCpf] = useState('');
  const [newName, setNewName] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState('');

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
    if (isAdmin) {
      fetchAllowedCpfs();
    }
  }, [isAdmin]);

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
        expires_at: newExpiresAt ? new Date(newExpiresAt).toISOString() : undefined
      };

      if (isLocalMode) {
        const updatedList = [clientPayload, ...allowedCpfs];
        await localforage.setItem('@mura-manager:local-allowed-cpfs', updatedList);
        setAllowedCpfs(updatedList);
        setNewCpf('');
        setNewName('');
        setNewWhatsapp('');
        setNewExpiresAt('');
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
        setAllowedCpfs([clientPayload, ...allowedCpfs]);
        setNewCpf('');
        setNewName('');
        setNewWhatsapp('');
        setNewExpiresAt('');
      }
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Erro ao cadastrar cliente.');
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

  const expiringCount = expiringClients.length;

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
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
    <div className="flex h-[100dvh] w-full overflow-hidden bg-theme-base pb-[env(safe-area-inset-bottom)]">
      {isAddBirdModalOpen && <AddBirdModal />}
      {selectedBirdProfileId && <BirdProfileModal />}
      {isTutorialOpen && <TutorialModal />}
      
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
        <header className="h-16 border-b border-theme-border bg-theme-surface/90 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0 mt-[env(safe-area-inset-top)]">
          <div className="md:hidden flex items-center gap-2 mr-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-theme-primary to-orange-600 flex items-center justify-center font-black text-black text-xs">M</div>
          </div>
          <h1 className="font-bold text-lg truncate text-white">{farmSettings.name || 'Mura Manager'}</h1>
          
          {/* Help / Tutorial Trigger */}
          <button
            onClick={openTutorial}
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

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 z-10 relative pb-28 md:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Floating Bottom Navigation (Mobile Dock) */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
        <nav className="bg-theme-surface/95 border border-theme-border/50 rounded-2xl shadow-premium px-2 py-2">
          <div className="flex justify-around items-center h-14">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                id={`mobile-nav-link-${item.path === '/' ? 'dashboard' : item.path.replace('/', '')}`}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-full h-full gap-1 transition-all rounded-xl ${
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
                                ({c.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")})
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <label className="text-[10px] font-bold text-theme-text-muted uppercase">Data de Vencimento</label>
                      <input
                        type="date"
                        required
                        value={newExpiresAt}
                        onChange={(e) => setNewExpiresAt(e.target.value)}
                        className="w-full bg-theme-base border border-theme-border rounded-xl p-2.5 text-xs text-white focus:border-theme-primary outline-none transition-colors font-bold text-center text-theme-text-muted"
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
                                {client.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
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
    </div>
  );
}
