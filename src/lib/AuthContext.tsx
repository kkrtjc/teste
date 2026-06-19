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
  signIn: (cpf: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    // 1. Pega a sessão atual de forma assíncrona
    supabase!.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
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
    };
  }, []);

  const signIn = async (rawCpf: string) => {
    const cleanCpf = rawCpf.replace(/\D/g, '');
    
    if (cleanCpf.length !== 11) {
      return { error: { message: 'Por favor, insira um CPF válido com 11 dígitos.' } };
    }

    const isAdmin = cleanCpf === ADMIN_CPF;

    // Se estiver usando Supabase, verifica se o CPF está cadastrado
    if (isSupabaseConfigured && !isAdmin) {
      try {
        const { data: allowedData, error: allowedError } = await supabase!
          .from('allowed_cpfs')
          .select('cpf')
          .eq('cpf', cleanCpf)
          .maybeSingle();

        if (allowedError) {
          console.error('Erro ao consultar allowed_cpfs:', allowedError);
          return { error: { message: 'Erro ao verificar permissão do CPF. Tente novamente.' } };
        }

        if (!allowedData) {
          return { error: { message: 'Este CPF não está cadastrado no sistema. Entre em contato com o administrador.' } };
        }
      } catch (err) {
        return { error: { message: 'Erro de conexão ao verificar o CPF.' } };
      }
    }

    if (!isSupabaseConfigured) {
      // Login Simulado Local (Bypass Offline)
      const mockSession = {
        session: { access_token: 'mock-token' },
        user: { id: `local-${cleanCpf}`, email: `${cleanCpf}@mura.com` }
      };
      await localforage.setItem('@mura-manager:local-session', mockSession);
      setUser(mockSession.user);
      setSession(mockSession.session);
      return { error: null };
    }

    const email = `${cleanCpf}@mura.com`;
    const password = `mura-${cleanCpf}-secure`;

    try {
      // 1. Tenta fazer login direto
      const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
      
      if (error) {
        // 2. Se falhar por credenciais/usuário não existente, cria a conta (primeiro acesso)
        if (
          error.message.includes('Invalid login credentials') || 
          error.message.includes('Email not confirmed') ||
          error.message.includes('user not found')
        ) {
          console.log('Criando conta de primeiro acesso para o CPF...');
          const { data: signUpData, error: signUpError } = await supabase!.auth.signUp({ email, password });
          
          if (signUpError) {
            return { error: signUpError };
          }
          
          if (signUpData.session) {
            setSession(signUpData.session);
            setUser(signUpData.user);
            return { error: null };
          } else {
            // Tenta logar novamente pós-cadastro
            const { data: retryData, error: retryError } = await supabase!.auth.signInWithPassword({ email, password });
            if (retryError) {
              return { error: retryError };
            }
            setSession(retryData.session);
            setUser(retryData.user);
            return { error: null };
          }
        }
        return { error };
      }
      
      setSession(data.session);
      setUser(data.user);
      return { error: null };
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
