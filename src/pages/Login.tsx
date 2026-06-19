import { useState } from 'react';
import { Activity, LogIn } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import gamecockSilhouette from '../assets/gamefowl_silhouette.png';

export function Login() {
  const { signIn, isLocalMode } = useAuth();

  const [cpfInput, setCpfInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCPF = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfInput(formatCPF(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cpfInput.replace(/\D/g, '');
    if (!clean) { setErrorMsg('Por favor, preencha o CPF.'); return; }
    if (clean.length !== 11) { setErrorMsg('O CPF deve ter 11 dígitos.'); return; }
    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await signIn(cpfInput);
      if (error) setErrorMsg(error.message || 'CPF não cadastrado ou acesso negado.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-96 h-96 bg-theme-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xs z-10 flex flex-col items-center gap-8">

        {/* Rooster image (static) */}
        <img
          src={gamecockSilhouette}
          alt="Galo Malaio"
          className="w-52 h-52 object-contain select-none pointer-events-none"
          style={{ filter: 'brightness(0)' }}
        />

        {/* Form */}
        <div className="w-full space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400
                            text-xs rounded-xl font-bold text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="text"
              required
              autoFocus
              value={cpfInput}
              onChange={handleCpfChange}
              className="w-full bg-transparent border-b-2 border-theme-border/60
                         focus:border-theme-primary outline-none transition-colors
                         tracking-widest text-center font-bold text-2xl py-3 text-white
                         placeholder-theme-text-muted/30"
              placeholder="000.000.000-00"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl flex items-center
                         justify-center gap-2 font-black text-base shadow-lg
                         transition-all active:scale-95 disabled:opacity-50
                         disabled:cursor-not-allowed"
            >
              {loading
                ? <Activity size={18} className="animate-spin text-black" />
                : <><LogIn size={18} /> Entrar no Criatório</>
              }
            </button>
          </form>

          {isLocalMode && (
            <div className="p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg
                            text-orange-300/50 text-[10px] text-center">
              Modo Local · Admin: 14477751630
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
