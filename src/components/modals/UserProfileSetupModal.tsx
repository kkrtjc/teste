import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, Mail, Shield, Camera, Check, Sparkles, Building2, Phone } from 'lucide-react';
import { useAppContext, type UserProfile } from '../../lib/AppContext';
import { useAuth } from '../../lib/AuthContext';

export function UserProfileSetupModal({
  isOpen,
  onClose,
  onComplete
}: {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}) {
  const { userProfile, updateUserProfile, isTourOpen } = useAppContext();
  const { user } = useAuth();

  const [nome, setNome] = useState(userProfile?.nome || '');
  const [email, setEmail] = useState('');
  const [nomeCriatorio, setNomeCriatorio] = useState(userProfile?.nomeCriatorio || '');
  const [telefone, setTelefone] = useState(userProfile?.telefone || '');
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(userProfile?.fotoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill email automatically from auth context, localStorage, or user object!
  useEffect(() => {
    if (isOpen) {
      const savedEmail = localStorage.getItem('mura_user_email') ||
                         localStorage.getItem('@mura-manager:user_email') ||
                         (user as any)?.email ||
                         '';
      setEmail(savedEmail);
      if (userProfile?.nome) setNome(userProfile.nome);
      if (userProfile?.nomeCriatorio) setNomeCriatorio(userProfile.nomeCriatorio);
    }
  }, [isOpen, user, userProfile]);

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
    if (!nome.trim() || !nomeCriatorio.trim()) return;

    updateUserProfile({
      nome: nome.trim(),
      email: email.trim(),
      nomeCriatorio: nomeCriatorio.trim(),
      fotoUrl: fotoUrl,
      telefone: telefone.trim() || undefined
    });

    onComplete();
  };

  // Enforce strict non-overlap guard: Never render if tour is active or modal is closed!
  if (!isOpen || isTourOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md overflow-y-auto overflow-x-hidden animate-fade-in select-none">
      <div className="bg-[#0F172A] border-2 border-amber-400/60 w-full max-w-md rounded-3xl shadow-[0_0_60px_rgba(245,158,11,0.3)] p-6 space-y-5 animate-scale-up relative overflow-x-hidden my-auto">
        
        {/* Header Banner */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-1">
            <Sparkles size={13} className="text-amber-400" /> Configuração do Criador
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">Complete seu Perfil</h3>
          <p className="text-xs text-white/60">Informe os dados do seu criatório para personalizar relatórios e pedigree</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Avatar Photo Upload */}
          <div className="flex flex-col items-center justify-center space-y-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-20 h-20 rounded-full bg-theme-surface border-2 border-dashed border-amber-400/50 hover:border-amber-400 flex items-center justify-center cursor-pointer overflow-hidden group transition-all shadow-lg"
            >
              {fotoUrl ? (
                <img src={fotoUrl} alt="Foto Perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-white/50 group-hover:text-amber-300 transition-colors">
                  <Camera size={22} />
                  <span className="text-[9px] font-bold mt-1 uppercase">Foto/Logo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            <p className="text-[10px] text-white/40">Clique para adicionar foto ou brasão do criatório</p>
          </div>

          {/* Nome Completo */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <User size={12} /> Seu Nome Completo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: João Paulo Silva"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-amber-400 outline-none transition-colors"
            />
          </div>

          {/* E-mail (Preenchido Automaticamente do Cadastro) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={12} /> E-mail de Cadastro
              </label>
              <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                Auto-preenchido
              </span>
            </div>
            <input
              type="email"
              readOnly
              value={email || (user as any)?.email || 'usuario@criatorio.com'}
              className="w-full bg-theme-base/60 border border-theme-border/60 rounded-xl p-3 text-sm text-white/70 focus:outline-none cursor-not-allowed"
            />
          </div>

          {/* Nome do Criatório */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={12} /> Nome do Criatório / Galio *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Criatório Galos Mura Pedigree"
              value={nomeCriatorio}
              onChange={e => setNomeCriatorio(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-amber-400 outline-none transition-colors"
            />
          </div>

          {/* Telefone / WhatsApp */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Phone size={12} /> WhatsApp / Telefone (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: (11) 99999-8888"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-amber-400 outline-none transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-black text-sm transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-95 flex items-center justify-center gap-2"
          >
            <Check size={18} /> Concluir Configuração do Criatório
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
