import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import localforage from 'localforage';

export const ADMIN_CPF = import.meta.env.VITE_ADMIN_CPF || '14477751630';

type AuthContextType = {
  user: User | { id: string; email: string } | null;
  cpf: string;
  session: Session | { access_token: string } | null;
  loading: boolean;
  isLocalMode: boolean;
  isExpired: boolean;
  signIn: (identifier: string, password?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [isExpired, setIsExpired] = useState(false);
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
        const password = passwordInput || `mura2026`;

        try {
          // Tenta login real
          const { data, error } = await supabase!.auth.signInWithPassword({ email, password });

          if (!error && data.session) {
            // Sucesso com Supabase real
            setSession(data.session);
            setUser(data.user);
            return { error: null };
          }

          // Se falhou login real, tenta criar conta (caso tenha sido deletado do Auth para resetar senha)
          const { data: signUpData, error: signUpError } = await supabase!.auth.signUp({ email, password });
          if (!signUpError && signUpData?.session) {
            setSession(signUpData.session);
            setUser(signUpData.user);
            return { error: null };
          }
        } catch {
          // Supabase inacessível → continua para bypass local
        }
      }

      // Fallback: sessão local para admin (funciona offline ou com Supabase indisponível)
      // Permite login com a senha 'mura2026' ou bypass caso esteja offline
      if (!passwordInput || passwordInput === 'mura2026') {
        const adminSession = {
          session: { access_token: `admin-local-${Date.now()}` },
          user:    { id: `admin-${ADMIN_CPF}`, email: `${ADMIN_CPF}@mura.com` },
        };
        await localforage.setItem('@mura-manager:local-session', adminSession);
        setUser(adminSession.user);
        setSession(adminSession.session);
        return { error: null };
      } else {
        return { error: { message: 'Senha incorreta para a conta de administrador.' } };
      }
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
        // Autocadastro de trial de 7 dias grátis para e-mail
        const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const generatedCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();
        const clientPayload = {
          cpf: generatedCpf,
          nome: cleanId.split('@')[0],
          whatsapp: '',
          expires_at: trialExpiresAt,
          email: cleanId
        };

        const { error: insertError } = await supabase!
          .from('allowed_cpfs')
          .insert([clientPayload]);
          
        if (insertError) {
          return { error: { message: 'Erro ao criar conta de testes. Tente novamente.' } };
        }
        targetCpf = clientPayload.cpf;
      } else {
        targetCpf = allowedData.cpf;
        resolvedEmail = allowedData.email || cleanId;
      }
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
        // Autocadastro de trial de 7 dias grátis para CPF
        const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const clientPayload = {
          cpf: cleanId,
          nome: 'Novo Criador',
          whatsapp: '',
          expires_at: trialExpiresAt,
          email: `${cleanId}@mura.com`
        };

        const { error: insertError } = await supabase!
          .from('allowed_cpfs')
          .insert([clientPayload]);
          
        if (insertError) {
          return { error: { message: 'Erro ao criar conta de testes. Tente novamente.' } };
        }
        resolvedEmail = clientPayload.email;
        targetCpf = clientPayload.cpf;
      } else {
        resolvedEmail = allowedData.email || `${cleanId}@mura.com`;
        targetCpf = allowedData.cpf;
      }
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
            alert('Acesso revogado: Seu usuário não está cadastrado no sistema.');
            signOut();
          } else if (localData.expires_at && new Date(localData.expires_at) < new Date()) {
            setIsExpired(true);
          } else {
            setIsExpired(false);
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

        // Se o CPF não estiver mais na lista de autorizados, desloga na hora. Se estiver apenas expirado temporariamente, define isExpired para true.
        if (!data) {
          alert('Acesso revogado: Seu usuário não está cadastrado como cliente autorizado.');
          signOut();
        } else if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setIsExpired(true);
        } else {
          setIsExpired(false);
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
      isExpired,
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
