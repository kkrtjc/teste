import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import localforage from 'localforage';

export const ADMIN_CPF = '14477751630';

type AuthContextType = {
  user: User | { id: string; email: string } | null;
  cpf: string;
  session: Session | { access_token: string } | null;
  loading: boolean;
  isLocalMode: boolean;
  signIn: (identifier: string, password?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(() => {
    if (!isSupabaseConfigured) return true; // Será rápido (lê do localforage no useEffect)
    
    // Se estiver online com Supabase, verifica se há token salvo de antemão
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          return true; // Existe token, aguarda verificação/refresh
        }
      }
    } catch (e) {
      console.error('Erro ao ler localStorage:', e);
    }
    return false; // Nenhum token encontrado, não precisa carregar/esperar
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Modo Local/Offline Fallback: recupera sessão local mockada se houver
      async function checkLocalSession() {
        try {
          const localSession: any = await localforage.getItem('@mura-manager:local-session');
          if (localSession) {
            setUser(localSession.user);
            setSession(localSession.session);
          }
        } catch (err) {
          console.error('Erro ao ler sessão local:', err);
        } finally {
          setLoading(false);
        }
      }
      checkLocalSession();
      return;
    }

    // Modo Online com Supabase
    // Adiciona um timeout de segurança (ex: 1.5 segundos) para garantir que a tela de login
    // apareça mesmo se o Supabase estiver fora do ar ou com latência altíssima na rede.
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 1500);

    // 1. Pega a sessão atual de forma assíncrona
    supabase!.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(err => {
      console.error('Erro ao buscar sessão do Supabase:', err);
      setLoading(false);
    });

    // 2. Escuta mudanças no estado de login/logout
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const signIn = async (identifier: string, passwordInput?: string) => {
    const isEmail = identifier.includes('@');
    const cleanId = isEmail ? identifier.trim() : identifier.replace(/\D/g, '');

    if (!isEmail && cleanId.length !== 11) {
      return { error: { message: 'Por favor, insira um CPF válido com 11 dígitos ou um e-mail válido.' } };
    }

    const isAdmin = cleanId === ADMIN_CPF;

    // ══════════════════════════════════════════════════════
    // ADMIN: tenta Supabase primeiro; qualquer falha → bypass
    // local. Admin NUNCA fica bloqueado.
    // ══════════════════════════════════════════════════════
    if (isAdmin) {
      if (isSupabaseConfigured) {
        const email    = `${ADMIN_CPF}@mura.com`;
        const password = passwordInput || `mura-${ADMIN_CPF}-secure`;

        try {
          // Tenta login real
          const { data, error } = await supabase!.auth.signInWithPassword({ email, password });

          if (!error && data.session) {
            // Sucesso com Supabase real
            setSession(data.session);
            setUser(data.user);
            return { error: null };
          }

          // Login falhou → tenta criar conta se for a primeira vez e sem senha manual
          if (error && !passwordInput) {
            const { data: signUpData } = await supabase!.auth.signUp({ email, password });
            if (signUpData?.session) {
              setSession(signUpData.session);
              setUser(signUpData.user);
              return { error: null };
            }
          }
        } catch {
          // Supabase inacessível → continua para bypass local
        }
      }

      // Fallback: sessão local para admin (funciona offline ou com Supabase indisponível)
      const adminSession = {
        session: { access_token: `admin-local-${Date.now()}` },
        user:    { id: `admin-${ADMIN_CPF}`, email: `${ADMIN_CPF}@mura.com` },
      };
      await localforage.setItem('@mura-manager:local-session', adminSession);
      setUser(adminSession.user);
      setSession(adminSession.session);
      return { error: null };
    }

    // ══════════════════════════════════════════════════════
    // MODO LOCAL (sem Supabase)
    // ══════════════════════════════════════════════════════
    if (!isSupabaseConfigured) {
      const localAllowedList =
        (await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs')) || [];
      const localData = localAllowedList.find(
        (item) => item.cpf === cleanId || item.email === cleanId
      );

      if (!localData) {
        return { error: { message: 'Este usuário não está cadastrado no sistema local.' } };
      }
      if (localData.expires_at && new Date(localData.expires_at) < new Date()) {
        return { error: { message: 'Seu acesso expirou. Entre em contato com o administrador para renovar.' } };
      }
      if (passwordInput && localData.senha && localData.senha !== passwordInput) {
        return { error: { message: 'Senha incorreta.' } };
      }

      const mockSession = {
        session: { access_token: 'mock-token' },
        user:    { id: `local-${localData.cpf}`, email: localData.email || `${localData.cpf}@mura.com` },
      };
      await localforage.setItem('@mura-manager:local-session', mockSession);
      setUser(mockSession.user);
      setSession(mockSession.session);
      return { error: null };
    }

    // ══════════════════════════════════════════════════════
    // MODO ONLINE — usuário não-admin
    // ══════════════════════════════════════════════════════
    let resolvedEmail = '';
    let targetCpf = '';

    if (isEmail) {
      resolvedEmail = cleanId;
      const { data: allowedData, error: allowedError } = await supabase!
        .from('allowed_cpfs')
        .select('cpf, expires_at, email')
        .eq('email', cleanId)
        .maybeSingle();

      if (allowedError) {
        return { error: { message: 'Erro ao verificar permissão do e-mail. Tente novamente.' } };
      }
      if (!allowedData) {
        return { error: { message: 'Este e-mail não está cadastrado. Realize a assinatura na página inicial.' } };
      }
      if (allowedData.expires_at && new Date(allowedData.expires_at) < new Date()) {
        return { error: { message: 'Seu acesso expirou. Por favor, regularize sua assinatura.' } };
      }
      targetCpf = allowedData.cpf;
    } else {
      const { data: allowedData, error: allowedError } = await supabase!
        .from('allowed_cpfs')
        .select('cpf, expires_at, email')
        .eq('cpf', cleanId)
        .maybeSingle();

      if (allowedError) {
        return { error: { message: 'Erro ao verificar permissão do CPF. Tente novamente.' } };
      }
      if (!allowedData) {
        return { error: { message: 'Este CPF não está cadastrado. Realize a assinatura na página inicial.' } };
      }
      if (allowedData.expires_at && new Date(allowedData.expires_at) < new Date()) {
        return { error: { message: 'Seu acesso expirou. Por favor, regularize sua assinatura.' } };
      }
      resolvedEmail = allowedData.email || `${cleanId}@mura.com`;
      targetCpf = allowedData.cpf;
    }

    const password = passwordInput || `mura-${targetCpf || cleanId}-secure`;

    try {
      const { data, error } = await supabase!.auth.signInWithPassword({ email: resolvedEmail, password });

      if (!error && data.session) {
        setSession(data.session);
        setUser(data.user);
        return { error: null };
      }

      // Se for login por CPF tradicional sem senha e falhou no primeiro login, tenta criar conta
      if (error && !passwordInput) {
        const { data: signUpData, error: signUpError } = await supabase!.auth.signUp({ email: resolvedEmail, password });
        if (signUpError) {
          return { error: signUpError };
        }
        if (signUpData?.session) {
          setSession(signUpData.session);
          setUser(signUpData.user);
          return { error: null };
        }

        // Tentativa final após signup
        const { data: retry, error: retryErr } = await supabase!.auth.signInWithPassword({ email: resolvedEmail, password });
        if (retryErr) {
          return { error: { message: 'Conta criada, mas confirme o e-mail antes de entrar.' } };
        }
        setSession(retry.session);
        setUser(retry.user);
        return { error: null };
      }

      return { error: error || { message: 'Dados de acesso incorretos.' } };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      await localforage.removeItem('@mura-manager:local-session');
      setUser(null);
      setSession(null);
      return;
    }

    await supabase!.auth.signOut();
  };

  const getCpf = () => {
    if (!user || !user.email) return '';
    return user.email.split('@')[0];
  };

  // Verifica se o CPF logado continua na lista de CPFs autorizados.
  // Caso tenha sido removido pelo administrador ou expirado, realiza o logout imediatamente.
  useEffect(() => {
    if (!user) return;

    const cleanCpf = getCpf();
    if (!cleanCpf) return;

    // CPF de administrador é permanente e não precisa ser validado
    if (cleanCpf === ADMIN_CPF) return;

    async function checkCurrentCpfAccess() {
      try {
        if (!isSupabaseConfigured) {
          // Validação local em segundo plano
          const localAllowedList = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
          const localData = localAllowedList.find(item => item.cpf === cleanCpf);
          if (!localData) {
            alert('Acesso revogado: Seu CPF não está mais cadastrado no sistema.');
            signOut();
          } else if (localData.expires_at && new Date(localData.expires_at) < new Date()) {
            alert('Acesso expirado: Seu prazo de renovação venceu. Entre em contato com o administrador.');
            signOut();
          }
          return;
        }

        // Validação online no Supabase
        const { data, error } = await supabase!
          .from('allowed_cpfs')
          .select('cpf, expires_at')
          .eq('cpf', cleanCpf)
          .maybeSingle();

        if (error) {
          console.error('Erro ao validar acesso do CPF ativo:', error);
          return;
        }

        // Se o CPF não estiver mais na lista de autorizados, ou se estiver vencido, desloga na hora
        if (!data) {
          alert('Acesso revogado: Seu CPF não está mais cadastrado como cliente autorizado.');
          signOut();
        } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
          alert('Acesso expirado: Seu prazo de renovação venceu. Entre em contato com o administrador.');
          signOut();
        }
      } catch (err) {
        console.error('Erro de conexão ao validar CPF:', err);
      }
    }

    // Executa no carregamento do app/sessão
    checkCurrentCpfAccess();

    // Executa periodicamente a cada 5 minutos
    const interval = setInterval(checkCurrentCpfAccess, 300000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      cpf: getCpf(),
      session,
      loading,
      isLocalMode: !isSupabaseConfigured,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
