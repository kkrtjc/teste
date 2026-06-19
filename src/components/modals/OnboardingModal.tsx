import { useState, useRef } from 'react';
import { Camera, Save, Phone, Mail, Home, Bird } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { compressImage } from '../../lib/imageCompression';

export function OnboardingModal() {
  const { updateFarmSettings } = useAppContext();

  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [photo, setPhoto]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Phone mask ── */
  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2)  return `(${d}`;
    if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    return v;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setPhone(formatPhone(e.target.value));

  /* ── Photo upload ── */
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 600, 600, 0.75);
      setPhoto(compressed);
    } catch {
      console.error('Erro ao comprimir foto');
    }
  };

  /* ── Validate & save ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim())  errs.name  = 'Informe o nome do criatório.';
    if (!email.trim()) errs.email = 'Informe um e-mail de contato.';
    if (!phone.trim()) errs.phone = 'Informe um telefone.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    await updateFarmSettings({ name: name.trim(), email: email.trim(), phone, photo });
    setLoading(false);
  };

  return (
    /* Full-screen, non-dismissable overlay */
    <div className="fixed inset-0 z-[9999] bg-theme-base/95 backdrop-blur-sm
                    flex items-center justify-center p-4 overflow-y-auto">

      {/* Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px]
                      bg-theme-primary/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-theme-surface border border-theme-border/40
                      rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-theme-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Bird size={28} className="text-theme-primary" />
          </div>
          <h1 className="text-2xl font-black text-white">Bem-vindo ao Mura Manager!</h1>
          <p className="text-sm text-theme-text-muted">
            Configure seu criatório antes de começar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Photo upload */}
          <div className="flex flex-col items-center gap-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full border-2 border-dashed border-theme-border/60
                         hover:border-theme-primary cursor-pointer transition-all overflow-hidden
                         flex items-center justify-center bg-theme-surface-2 relative group"
            >
              {photo ? (
                <img src={photo} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <Camera size={28} className="text-theme-text-muted group-hover:text-theme-primary transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100
                              transition-opacity flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <span className="text-xs text-theme-text-muted">
              {photo ? 'Clique para trocar a foto' : 'Foto do criatório (opcional)'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Nome do criatório */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Home size={12} /> Nome do Criatório
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
              placeholder="Ex: Criatório do João"
              className={`w-full bg-theme-surface-2 border rounded-xl px-4 py-3 text-white text-sm
                          outline-none transition-colors placeholder-theme-text-muted/40
                          ${errors.name
                            ? 'border-red-500/60 focus:border-red-500'
                            : 'border-theme-border/50 focus:border-theme-primary'}`}
            />
            {errors.name && <p className="text-red-400 text-xs">{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={12} /> E-mail de Contato
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
              placeholder="seuemail@exemplo.com"
              className={`w-full bg-theme-surface-2 border rounded-xl px-4 py-3 text-white text-sm
                          outline-none transition-colors placeholder-theme-text-muted/40
                          ${errors.email
                            ? 'border-red-500/60 focus:border-red-500'
                            : 'border-theme-border/50 focus:border-theme-primary'}`}
            />
            {errors.email && <p className="text-red-400 text-xs">{errors.email}</p>}
          </div>

          {/* Telefone */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Phone size={12} /> Telefone / WhatsApp
            </label>
            <input
              type="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              className={`w-full bg-theme-surface-2 border rounded-xl px-4 py-3 text-white text-sm
                          outline-none transition-colors placeholder-theme-text-muted/40
                          ${errors.phone
                            ? 'border-red-500/60 focus:border-red-500'
                            : 'border-theme-border/50 focus:border-theme-primary'}`}
            />
            {errors.phone && <p className="text-red-400 text-xs">{errors.phone}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3.5 rounded-xl font-black text-base
                       flex items-center justify-center gap-2 shadow-lg
                       transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? <span className="animate-spin w-5 h-5 border-2 border-black/30 border-t-black rounded-full" />
              : <><Save size={18} /> Salvar e Começar</>
            }
          </button>
        </form>
      </div>
    </div>
  );
}
