import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Mail, Camera, Check, Sparkles, Building2, Phone, X } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { useAuth } from '../../lib/AuthContext';

export function UserProfileSetupModal({
  isOpen,
  onClose,
  onComplete
}: {
  isOpen: boolean;
  onClose?: () => void;
  onComplete: () => void;
}) {
  const { farmSettings, setFarmSettings } = useAppContext();
  
  let authUser: any = null;
  try {
    const auth = useAuth();
    authUser = auth?.user;
  } catch {
    authUser = null;
  }

  const [nome, setNome] = useState(farmSettings?.name || '');
  const [email, setEmail] = useState('');
  const [nomeCriatorio, setNomeCriatorio] = useState(farmSettings?.name || 'Criatório Galos Mura');
  const [telefone, setTelefone] = useState(farmSettings?.phone || '');
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(farmSettings?.photo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill email automatically from auth context, localStorage, or fallback
  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('mura_user_email') ||
                         localStorage.getItem('@mura-manager:user_email') ||
                         authUser?.email ||
                         '';
      setEmail(savedEmail);
      if (farmSettings?.name) setNomeCriatorio(farmSettings.name);
      if (farmSettings?.phone) setTelefone(farmSettings.phone);
    }
  }, [isOpen, authUser, farmSettings]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    } else {
      onComplete();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFarmSettings({
      ...farmSettings,
      name: nomeCriatorio.trim() || 'Criatório Galos Mura',
      photo: fotoUrl || farmSettings?.photo || '',
      email: email.trim() || authUser?.email || farmSettings?.email || '',
      phone: telefone.trim() || farmSettings?.phone || ''
    });
    if (nome.trim()) {
      localStorage.setItem('mura_user_name', nome.trim());
    }
    onComplete();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open-lock');
    } else {
      document.body.classList.remove('modal-open-lock');
    }
    return () => {
      document.body.classList.remove('modal-open-lock');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={handleDismiss}
    >
      <div 
        className="bg-theme-surface border border-theme-border/80 w-full max-w-lg rounded-3xl shadow-2xl relative my-auto animate-scale-up flex flex-col max-h-[92dvh] sm:max-h-[88vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Header Fixo */}
        <div className="p-5 pb-3 border-b border-theme-border/60 shrink-0 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-theme-primary/10 border border-theme-primary/30 text-theme-primary text-[11px] font-bold">
              <Sparkles size={13} />
              <span>Configuração Inicial do Perfil</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Seja bem-vindo ao Mura Manager!
            </h2>
            <p className="text-xs text-theme-text-muted">
              Personalize as informações da sua granja para um controle profissional completo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 hover:bg-white/10 rounded-full text-theme-text-muted hover:text-white transition-colors shrink-0"
            title="Pular por enquanto"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário com Scroll Interno Fluido */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain pr-2">
            
            {/* Avatar Upload */}
            <div className="flex flex-col items-center justify-center space-y-2 pb-1">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full border-2 border-theme-primary/40 bg-theme-base overflow-hidden flex items-center justify-center shadow-lg">
                  {fotoUrl ? (
                    <img src={fotoUrl} alt="Foto do Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🐓</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-theme-primary text-black rounded-full shadow-lg hover:scale-110 transition-transform font-bold"
                  title="Carregar Foto"
                >
                  <Camera size={14} />
                </button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <span className="text-[10px] text-theme-text-muted uppercase tracking-wider font-bold">
                Foto do Perfil / Logomarca
              </span>
            </div>

            {/* Nome do Responsável */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <User size={13} className="text-theme-primary" /> Nome do Criador *
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João Paulo"
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors font-medium"
              />
            </div>

            {/* Email (Auto-preenchido) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Mail size={13} className="text-theme-primary" /> E-mail de Cadastro
                </label>
                <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                  Auto-preenchido
                </span>
              </div>
              <input
                type="email"
                readOnly
                value={email || authUser?.email || 'usuario@criatorio.com'}
                className="w-full bg-theme-base/60 border border-theme-border/60 rounded-xl p-3 text-sm text-white/70 focus:outline-none cursor-not-allowed font-mono"
              />
            </div>

            {/* Nome do Criatório */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={13} className="text-theme-primary" /> Nome da Granja / Criatório *
              </label>
              <input
                type="text"
                required
                value={nomeCriatorio}
                onChange={(e) => setNomeCriatorio(e.target.value)}
                placeholder="Ex: Criatório Galos Mura"
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors font-medium"
              />
            </div>

            {/* Telefone / WhatsApp */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Phone size={13} className="text-theme-primary" /> Celular / WhatsApp
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors font-medium"
              />
            </div>
          </div>

          {/* Rodapé Fixo com Ações */}
          <div className="p-4 sm:p-5 border-t border-theme-border/60 bg-theme-surface flex gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 py-3 bg-theme-base border border-theme-border rounded-xl text-xs font-bold text-theme-text-muted hover:text-white transition-colors"
            >
              Preencher Depois
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
            >
              <Check size={16} />
              <span>Salvar Perfil</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
