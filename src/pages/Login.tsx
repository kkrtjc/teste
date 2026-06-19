import { useState, useEffect } from 'react';
import { Activity, LogIn } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import gamecockSilhouette from '../assets/gamefowl_silhouette.png';

export function Login() {
  const { signIn, isLocalMode } = useAuth();
  
  const [cpfInput, setCpfInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [animationPhase, setAnimationPhase] = useState<'walking' | 'flapping' | 'idle'>('walking');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // 1. A caminhada dura 2.2s
    const walkTimeout = setTimeout(() => {
      setAnimationPhase('flapping');
    }, 2200);

    // 2. A batida de asas dura 1.6s (total de 3.8s)
    const flapTimeout = setTimeout(() => {
      setAnimationPhase('idle');
      setShowForm(true);
    }, 3800);

    return () => {
      clearTimeout(walkTimeout);
      clearTimeout(flapTimeout);
    };
  }, []);

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 11);
    if (limited.length <= 3) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 3)}.${limited.slice(3)}`;
    if (limited.length <= 9) return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6)}`;
    return `${limited.slice(0, 3)}.${limited.slice(3, 6)}.${limited.slice(6, 9)}-${limited.slice(9)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfInput(formatCPF(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = cpfInput.replace(/\D/g, '');
    if (!cleanCpf) {
      setErrorMsg('Por favor, preencha o campo de CPF.');
      return;
    }
    if (cleanCpf.length !== 11) {
      setErrorMsg('O CPF deve conter exatamente 11 dígitos.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const { error } = await signIn(cpfInput);
      
      if (error) {
        setErrorMsg(error.message || 'Erro ao realizar login. Verifique se seu CPF foi cadastrado pelo administrador.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* CSS Keyframes for Silhouette Walk and Flap */}
      <style>{`
        .gamecock-walk {
          animation: walkIn 2.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .gamecock-flap {
          animation: wingFlap 1.6s ease-in-out forwards;
        }
        .gamecock-idle {
          animation: proudBreath 3s ease-in-out infinite;
        }
        .form-fade-in {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes walkIn {
          0% {
            transform: translateX(-120px) translateY(0px) rotate(-4deg);
            opacity: 0;
          }
          15% { transform: translateX(-95px) translateY(-8px) rotate(2deg); opacity: 0.3; }
          35% { transform: translateX(-70px) translateY(0px) rotate(-3deg); opacity: 0.6; }
          55% { transform: translateX(-45px) translateY(-8px) rotate(2deg); opacity: 0.8; }
          75% { transform: translateX(-20px) translateY(0px) rotate(-2deg); opacity: 0.9; }
          90% { transform: translateX(-5px) translateY(-4px) rotate(1deg); opacity: 0.98; }
          100% {
            transform: translateX(0) translateY(0) rotate(0);
            opacity: 1;
          }
        }

        @keyframes wingFlap {
          0%, 100% {
            transform: scale(1) translateY(0);
            filter: brightness(0) drop-shadow(0 0 0 rgba(245, 158, 11, 0));
          }
          15% {
            transform: scale(1.18, 0.96) translateY(-14px);
            filter: brightness(0) drop-shadow(0 0 20px rgba(245, 158, 11, 0.35));
          }
          30% {
            transform: scale(0.93, 1.07) translateY(5px);
            filter: brightness(0) drop-shadow(0 0 5px rgba(245, 158, 11, 0.15));
          }
          45% {
            transform: scale(1.22, 0.94) translateY(-18px);
            filter: brightness(0) drop-shadow(0 0 30px rgba(245, 158, 11, 0.55));
          }
          60% {
            transform: scale(0.93, 1.07) translateY(5px);
            filter: brightness(0) drop-shadow(0 0 5px rgba(245, 158, 11, 0.15));
          }
          75% {
            transform: scale(1.24, 0.95) translateY(-22px);
            filter: brightness(0) drop-shadow(0 0 35px rgba(245, 158, 11, 0.65));
          }
          90% {
            transform: scale(1.05, 1.02) translateY(-4px);
            filter: brightness(0) drop-shadow(0 0 15px rgba(245, 158, 11, 0.25));
          }
        }

        @keyframes proudBreath {
          0%, 100% {
            transform: scale(1) translateY(0);
            filter: brightness(0) drop-shadow(0 0 10px rgba(245, 158, 11, 0.08));
          }
          50% {
            transform: scale(1.02, 1.03) translateY(-2px);
            filter: brightness(0) drop-shadow(0 0 18px rgba(245, 158, 11, 0.22));
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
            filter: blur(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
      `}</style>

      {/* Background glow overlay */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-theme-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm z-10 flex flex-col items-center gap-6">
        
        {/* Imposing Malay Gamefowl Silhouette */}
        <div className="relative h-64 w-64 flex items-center justify-center select-none pointer-events-none mb-4">
          <img 
            src={gamecockSilhouette} 
            alt="Malay Gamefowl Silhouette" 
            className={`h-56 object-contain select-none pointer-events-none transition-all ${
              animationPhase === 'walking' 
                ? 'gamecock-walk' 
                : animationPhase === 'flapping' 
                ? 'gamecock-flap' 
                : 'gamecock-idle'
            }`}
            style={{ filter: 'brightness(0)' }}
          />
        </div>

        {/* Form elements (Galo e campo do CPF apenas) */}
        <div className={`w-full space-y-6 transition-all ${showForm ? 'form-fade-in' : 'opacity-0 pointer-events-none'}`}>
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1 text-center">
              <input
                type="text"
                required
                value={cpfInput}
                onChange={handleCpfChange}
                className="w-full bg-transparent border-b-2 border-theme-border/60 focus:border-theme-primary outline-none transition-colors tracking-widest text-center font-bold text-2xl py-3 text-white placeholder-theme-text-muted/30"
                placeholder="000.000.000-00"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 font-black text-base shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Activity size={18} className="animate-spin text-black" />
              ) : (
                <>
                  <LogIn size={18} /> Entrar no Criatório
                </>
              )}
            </button>
          </form>

          {isLocalMode && (
            <div className="p-3 bg-orange-500/5 border border-orange-500/10 rounded-xl text-orange-300/60 text-[10px] text-center mt-4">
              Modo Local: Digite qualquer CPF de 11 dígitos. Admin: 14477751630.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

