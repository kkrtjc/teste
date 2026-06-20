import { useState, useRef } from 'react';
import { Camera, CheckCircle2, Phone, Mail, Building2, ArrowRight } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { compressImage } from '../../lib/imageCompression';

export function OnboardingModal() {
  const { updateFarmSettings } = useAppContext();

  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [phone,   setPhone]   = useState('');
  const [photo,   setPhoto]   = useState('');
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Máscaras ── */
  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2)  return `(${d}`;
    if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  /* ── Foto ── */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPhoto(await compressImage(file, 600, 600, 0.8));
    } catch { /* ignore */ }
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim())  errs.name  = 'Obrigatório';
    if (!email.trim()) errs.email = 'Obrigatório';
    if (!phone.trim()) errs.phone = 'Obrigatório';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    await updateFarmSettings({ name: name.trim(), email: email.trim(), phone, photo });
    setLoading(false);
  };

  /* ── Classe base dos inputs ── */
  const inputCls = (field: string) =>
    `w-full rounded-xl px-4 py-3.5 text-sm font-medium outline-none transition-all
     bg-white/[0.06] border text-white placeholder-white/30
     ${errors[field]
       ? 'border-red-400/70 focus:border-red-400 focus:ring-2 focus:ring-red-400/20'
       : 'border-white/10 focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/15'}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
         style={{ background: 'rgba(8,8,14,0.97)', backdropFilter: 'blur(12px)' }}>

      {/* Glow decorativo */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[600px] h-[600px] rounded-full"
           style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)' }} />

      <div className="relative w-full max-w-md rounded-2xl overflow-hidden"
           style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)' }}>

        {/* Barra dourada no topo */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)' }} />

        <div className="p-7 space-y-7">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.05))',
                          border: '1px solid rgba(245,158,11,0.3)' }}>
              <span className="text-3xl">🐓</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Bem-vindo ao Mura Manager!
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Configure seu criatório para começar a usar o sistema.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Foto */}
            <div className="flex items-center gap-4 p-4 rounded-xl"
                 style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative flex-shrink-0 w-16 h-16 rounded-2xl cursor-pointer overflow-hidden group transition-all"
                style={{ background: photo ? 'transparent' : 'rgba(245,158,11,0.1)',
                         border: photo ? 'none' : '2px dashed rgba(245,158,11,0.4)' }}
              >
                {photo
                  ? <img src={photo} className="w-full h-full object-cover" alt="foto" />
                  : <div className="w-full h-full flex items-center justify-center">
                      <Camera size={22} style={{ color: 'rgba(245,158,11,0.8)' }} />
                    </div>
                }
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                                transition-opacity flex items-center justify-center rounded-2xl">
                  <Camera size={18} className="text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {photo ? 'Foto adicionada ✓' : 'Foto do criatório'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Opcional — clique para {photo ? 'trocar' : 'adicionar'}
                </p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*"
                     className="hidden" onChange={handlePhotoUpload} />
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                     style={{ color: 'rgba(255,255,255,0.5)' }}>
                <Building2 size={11} />
                Nome do Criatório
                <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="text"
                value={name}
                autoFocus
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                placeholder="Ex: Criatório do João"
                className={inputCls('name')}
              />
              {errors.name && (
                <p className="text-xs font-medium" style={{ color: '#f87171' }}>
                  ⚠ {errors.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                     style={{ color: 'rgba(255,255,255,0.5)' }}>
                <Mail size={11} />
                E-mail de contato
                <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                placeholder="seuemail@exemplo.com"
                className={inputCls('email')}
              />
              {errors.email && (
                <p className="text-xs font-medium" style={{ color: '#f87171' }}>
                  ⚠ {errors.email}
                </p>
              )}
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                     style={{ color: 'rgba(255,255,255,0.5)' }}>
                <Phone size={11} />
                Telefone / WhatsApp
                <span style={{ color: '#f87171' }}>*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => { setPhone(formatPhone(e.target.value)); setErrors(p => ({ ...p, phone: '' })); }}
                placeholder="(00) 00000-0000"
                className={inputCls('phone')}
              />
              {errors.phone && (
                <p className="text-xs font-medium" style={{ color: '#f87171' }}>
                  ⚠ {errors.phone}
                </p>
              )}
            </div>

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl font-black text-sm tracking-wide
                         flex items-center justify-center gap-2.5 transition-all
                         active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: loading
                         ? 'rgba(245,158,11,0.5)'
                         : 'linear-gradient(135deg, #f59e0b, #d97706)',
                       color: '#000',
                       boxShadow: loading ? 'none' : '0 8px 24px rgba(245,158,11,0.35)' }}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Salvar e Começar
                  <ArrowRight size={15} />
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
