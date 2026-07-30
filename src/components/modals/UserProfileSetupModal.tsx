import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Mail, Camera, Check, Sparkles, Building2, Phone } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { useAuth } from '../../lib/AuthContext';

export function UserProfileSetupModal({
  isOpen,
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
  const [telefone, setTelefone] = useState('');
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFarmSettings({
      ...farmSettings,
      name: nomeCriatorio || 'Criatório Galos Mura',
      photo: fotoUrl || farmSettings?.photo
    });
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
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-hidden touch-none select-none"
      onTouchMove={e => e.preventDefault()}
    >
      <div 
        className="bg-theme-surface border border-theme-primary/40 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative my-auto animate-scale-up space-y-6 overflow-hidden"
        onTouchMove={e => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="text-center space-y-2 border-b border-theme-border/60 pb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-theme-primary/10 border border-theme-primary/30 text-theme-primary text-xs font-bold">
            <Sparkles size={14} />
            <span>Configuração Inicial do Perfil</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Seja bem-vindo ao Mura Manager!
          </h2>
          <p className="text-xs text-theme-text-muted">
            Personalize as informações da sua granja para um controle profissional completo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-theme-primary/40 bg-theme-base overflow-hidden flex items-center justify-center shadow-lg">
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Foto do Perfil" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🐓</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-theme-primary text-black rounded-full shadow-lg hover:scale-110 transition-transform font-bold"
                title="Carregar Foto"
              >
                <Camera size={16} />
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
              <User size={14} className="text-theme-primary" /> Nome do Criador
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
                <Mail size={14} className="text-theme-primary" /> E-mail de Cadastro
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
              <Building2 size={14} className="text-theme-primary" /> Nome da Granja / Criatório
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
              <Phone size={14} className="text-theme-primary" /> Celular / WhatsApp
            </label>
            <input
              type="text"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors font-medium"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl mt-4"
          >
            <Check size={18} />
            <span>Salvar Perfil & Continuar</span>
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
