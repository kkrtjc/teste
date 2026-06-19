import { useState } from 'react';
import { Mail, Lock, Activity, LogIn, UserPlus, AlertTriangle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export function Login() {
  const { signIn, signUp, isLocalMode } = useAuth();
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const action = isRegistering ? signUp : signIn;
      const { error } = await action(email, password);
      
      if (error) {
        setErrorMsg(error.message || 'Erro ao realizar operação. Verifique seus dados.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-base flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow overlay */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-theme-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 flex flex-col gap-6">
        
        {/* Logo Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 justify-center mb-2 animate-fade-in">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-theme-primary to-orange-600 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-orange-500/10">M</div>
            <span className="font-bold text-2xl tracking-tight text-white">MURA<span className="text-theme-primary">MANAGER</span></span>
          </div>
          <p className="text-[10px] text-theme-text-muted uppercase tracking-widest font-black">Elite Poultry System</p>
        </div>

        {/* Local Test Mode Banner */}
        {isLocalMode && (
          <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl flex gap-3 text-orange-200 text-xs animate-pulse">
            <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <p className="font-bold text-orange-300">Modo de Teste Local Ativo</p>
              <p className="leading-relaxed">O Supabase não foi configurado no arquivo `.env`. Digite <strong>qualquer e-mail e senha (mínimo de 6 letras)</strong> para entrar e testar de forma offline local.</p>
            </div>
          </div>
        )}

        {/* Login Form Card */}
        <div className="premium-card p-6 border border-theme-border/50 bg-theme-surface/50 backdrop-blur-md space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-white">
              {isRegistering ? 'Criar Nova Conta' : 'Acessar Criatório'}
            </h2>
            <p className="text-xs text-theme-text-muted font-medium">
              {isRegistering ? 'Preencha os dados abaixo para se cadastrar' : 'Insira seus dados para sincronizar na nuvem'}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2">
                <Mail size={12} /> E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                placeholder="seuemail@exemplo.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-2">
                <Lock size={12} /> Senha
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 font-black text-base shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Activity size={18} className="animate-spin text-black" />
              ) : isRegistering ? (
                <>
                  <UserPlus size={18} /> Cadastrar e Entrar
                </>
              ) : (
                <>
                  <LogIn size={18} /> Entrar no painel
                </>
              )}
            </button>
          </form>

          {/* Toggle Registering vs Login */}
          <div className="text-center pt-2 border-t border-theme-border/30">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMsg('');
              }}
              className="text-xs font-bold text-theme-primary hover:text-orange-400 transition-colors"
            >
              {isRegistering ? 'Já possui conta? Faça Login' : 'Ainda não tem conta? Cadastre-se'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
