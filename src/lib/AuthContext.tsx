import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import localforage from 'localforage';

export const ADMIN_CPF = import.meta.env.VITE_ADMIN_CPF || '14477751630';

export type TrialInfo = {
  isTrial: boolean;
  remainingDays: number;
  expiresAt: string | null;
};

type AuthContextType = {
  user: User | { id: string; email: string } | null;
  cpf: string;
  session: Session | { access_token: string } | null;
  loading: boolean;
  isLocalMode: boolean;
  isExpired: boolean;
  trialInfo: TrialInfo;
  lastWebhookConfirmation: number | null;
  signIn: (identifier: string, password?: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
  activateSubscription: (plan: 'monthly' | 'yearly') => Promise<{ error: any }>;
  triggerWebhookPayment: (plan: 'monthly' | 'yearly', targetEmailOrCpf?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseIsoDate(dateStr: any): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T') + 'Z';
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [lastWebhookConfirmation, setLastWebhookConfirmation] = useState<number | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo>({
    isTrial: false,
    remainingDays: 0,
    expiresAt: null
  });
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
    // Timeout de resiliência caso ocorra problema de rede
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 2000);

    // 1. Pega a sessão salva de forma assíncrona
    supabase!.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      clearTimeout(safetyTimeout);
    }).catch(err => {
      console.error('Erro ao buscar sessão do Supabase:', err);
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    // 2. Escuta mudanças de estado (login, token refresh, logout)
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

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      const mockEmail = `usuario.google.${Math.floor(Math.random() * 1000)}@gmail.com`;
      const trialExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      const tempCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();
      const clientPayload = {
        cpf: tempCpf,
        nome: 'Usuário Google',
        email: mockEmail,
        expires_at: trialExpiresAt
      };
      const list = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
      list.push(clientPayload);
      await localforage.setItem('@mura-manager:local-allowed-cpfs', list);
      const mockSession = {
        session: { access_token: `google-mock-${Date.now()}` },
        user: { id: `google-${tempCpf}`, email: mockEmail, user_metadata: { full_name: 'Usuário Google' } }
      };
      await localforage.setItem('@mura-manager:local-session', mockSession);
      setUser(mockSession.user);
      setSession(mockSession.session);
      return { error: null };
    }

    const { error } = await supabase!.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    return { error };
  };

  const signInWithApple = async () => {
    if (!isSupabaseConfigured) {
      const mockEmail = `usuario.apple.${Math.floor(Math.random() * 1000)}@apple.com`;
      const trialExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      const tempCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();
      const clientPayload = {
        cpf: tempCpf,
        nome: 'Usuário Apple',
        email: mockEmail,
        expires_at: trialExpiresAt
      };
      const list = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
      list.push(clientPayload);
      await localforage.setItem('@mura-manager:local-allowed-cpfs', list);
      const mockSession = {
        session: { access_token: `apple-mock-${Date.now()}` },
        user: { id: `apple-${tempCpf}`, email: mockEmail, user_metadata: { full_name: 'Usuário Apple' } }
      };
      await localforage.setItem('@mura-manager:local-session', mockSession);
      setUser(mockSession.user);
      setSession(mockSession.session);
      return { error: null };
    }

    const { error } = await supabase!.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin }
    });
    return { error };
  };

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
          const { data, error } = await supabase!.auth.signInWithPassword({ email, password });

          if (!error && data.session) {
            setSession(data.session);
            setUser(data.user);
            return { error: null };
          }

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
    // SEGURANÇA: EXIGÊNCIA ESTRITA DE SENHA PARA USUÁRIOS
    // ══════════════════════════════════════════════════════
    if (!passwordInput || !passwordInput.trim()) {
      return { error: { message: 'A senha de acesso é obrigatória para realizar o login.' } };
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
      if (localData.senha && localData.senha !== passwordInput) {
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
      } else {
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
      } else {
        resolvedEmail = allowedData.email || `${cleanId}@mura.com`;
      }
    }

    try {
      const { data, error } = await supabase!.auth.signInWithPassword({ email: resolvedEmail, password: passwordInput });

      if (!error && data.session) {
        setSession(data.session);
        setUser(data.user);
        return { error: null };
      }

      return { error: error || { message: 'E-mail, CPF ou senha incorretos.' } };
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

  const activateSubscription = async (plan: 'monthly' | 'yearly') => {
    if (!user) return { error: { message: 'Usuário não autenticado.' } };

    const days = plan === 'yearly' ? 365 : 30;
    const newExpiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const userEmail = user.email;
    const cleanCpf = getCpf();

    try {
      if (!isSupabaseConfigured) {
        const localAllowedList = (await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs')) || [];
        const index = localAllowedList.findIndex(
          (item) => (userEmail && item.email === userEmail) || (cleanCpf && item.cpf === cleanCpf)
        );

        if (index >= 0) {
          localAllowedList[index].expires_at = newExpiresAt;
        } else {
          localAllowedList.push({
            cpf: cleanCpf || Math.floor(10000000000 + Math.random() * 90000000000).toString(),
            email: userEmail,
            expires_at: newExpiresAt
          });
        }
        await localforage.setItem('@mura-manager:local-allowed-cpfs', localAllowedList);
      } else {
        const { error: updateErr } = await supabase!
          .from('allowed_cpfs')
          .update({ expires_at: newExpiresAt })
          .or(`email.eq.${userEmail},cpf.eq.${cleanCpf}`);

        if (updateErr) {
          await supabase!.from('allowed_cpfs').insert([
            {
              cpf: cleanCpf || Math.floor(10000000000 + Math.random() * 90000000000).toString(),
              email: userEmail,
              expires_at: newExpiresAt
            }
          ]);
        }
      }

      setIsExpired(false);
      setTrialInfo({
        isTrial: false,
        remainingDays: days,
        expiresAt: newExpiresAt
      });

      return { error: null };
    } catch (err: any) {
      console.error('Erro ao ativar assinatura automaticamente:', err);
      return { error: err };
    }
  };

  const triggerWebhookPayment = async (plan: 'monthly' | 'yearly', targetEmailOrCpf?: string) => {
    const emailToUse = targetEmailOrCpf || user?.email;
    const cleanCpfToUse = targetEmailOrCpf?.replace(/\D/g, '') || getCpf();
    if (!emailToUse && !cleanCpfToUse) return { error: { message: 'Identificador do usuário não encontrado.' } };

    const days = plan === 'yearly' ? 365 : 30;
    const newExpiresAt = new Date(Date.now() + days * 86400000).toISOString();

    try {
      if (!isSupabaseConfigured) {
        const localAllowedList = (await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs')) || [];
        const index = localAllowedList.findIndex(
          (item) => (emailToUse && item.email === emailToUse) || (cleanCpfToUse && item.cpf === cleanCpfToUse)
        );

        if (index >= 0) {
          localAllowedList[index].expires_at = newExpiresAt;
        } else {
          localAllowedList.push({
            cpf: cleanCpfToUse || Math.floor(10000000000 + Math.random() * 90000000000).toString(),
            email: emailToUse,
            expires_at: newExpiresAt
          });
        }
        await localforage.setItem('@mura-manager:local-allowed-cpfs', localAllowedList);
      } else {
        const query = emailToUse ? `email.eq.${emailToUse}` : `cpf.eq.${cleanCpfToUse}`;
        const { error: updateErr } = await supabase!
          .from('allowed_cpfs')
          .update({ expires_at: newExpiresAt })
          .or(query);

        if (updateErr) {
          await supabase!.from('allowed_cpfs').insert([
            {
              cpf: cleanCpfToUse || Math.floor(10000000000 + Math.random() * 90000000000).toString(),
              email: emailToUse,
              expires_at: newExpiresAt
            }
          ]);
        }
      }

      setIsExpired(false);
      setLastWebhookConfirmation(Date.now());
      setTrialInfo({
        isTrial: false,
        remainingDays: days,
        expiresAt: newExpiresAt
      });

      return { error: null };
    } catch (err: any) {
      console.error('Erro ao processar Webhook de pagamento:', err);
      return { error: err };
    }
  };

  // Verificação periódica de acesso (a cada 10 minutos) para capturar aprovações de Webhook do gateway
  useEffect(() => {
    if (!user) return;

    const cleanCpf = getCpf();
    const userEmail = user.email;
    if (!cleanCpf && !userEmail) return;

    if (cleanCpf === ADMIN_CPF) return;

    async function checkCurrentCpfAccess() {
      try {
        let rawExpiresAt: string | null = null;

        if (!isSupabaseConfigured) {
          const localAllowedList = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
          let localData = localAllowedList.find(item => item.cpf === cleanCpf || item.email === userEmail);
          
          if (!localData && userEmail) {
            const trialExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
            const tempCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();
            localData = {
              cpf: tempCpf,
              nome: user.user_metadata?.full_name || userEmail.split('@')[0] || 'Novo Usuário',
              email: userEmail,
              expires_at: trialExpiresAt
            };
            localAllowedList.push(localData);
            await localforage.setItem('@mura-manager:local-allowed-cpfs', localAllowedList);
          }
          rawExpiresAt = localData?.expires_at ?? null;
        } else {
          // Validação online no Supabase com busca segura sem falha de sintaxe PostgREST
          const normEmail = userEmail ? userEmail.toLowerCase().trim() : '';
          let query = supabase!.from('allowed_cpfs').select('cpf, expires_at, email');

          if (normEmail && cleanCpf) {
            query = query.or(`email.ilike.${normEmail},cpf.eq.${cleanCpf}`);
          } else if (normEmail) {
            query = query.ilike('email', normEmail);
          } else if (cleanCpf) {
            query = query.eq('cpf', cleanCpf);
          }

          const { data, error } = await query.maybeSingle();

          if (error) {
            console.error('Erro ao validar acesso do usuário ativo:', error);
            return;
          }

          if (!data && userEmail) {
            const trialExpiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
            const tempCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();
            const newClient = {
              cpf: tempCpf,
              nome: user.user_metadata?.full_name || userEmail.split('@')[0] || 'Novo Usuário Social',
              email: normEmail,
              expires_at: trialExpiresAt
            };
            await supabase!.from('allowed_cpfs').insert([newClient]);
            rawExpiresAt = trialExpiresAt;
          } else {
            rawExpiresAt = data?.expires_at ?? null;
          }
        }

        // ── Cálculo Preciso de Expiração e Período de Testes ──
        let expDateObj = parseIsoDate(rawExpiresAt);

        // Se o registro não contiver data de expiração explícita, calcula 7 dias a partir da criação da conta no Supabase Auth
        if (!expDateObj && user?.created_at) {
          const createdAt = parseIsoDate(user.created_at);
          if (createdAt) {
            expDateObj = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
          }
        }

        if (expDateObj) {
          const nowMs = Date.now();
          const expMs = expDateObj.getTime();
          const diffMs = expMs - nowMs;
          const expired = diffMs <= 0;

          // Arredonda dias restantes para cima para exibir de forma intuitiva (ex: 6.8 dias -> 7 dias)
          const daysLeft = expired ? 0 : Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

          setIsExpired(expired);
          setTrialInfo({
            isTrial: !expired && daysLeft <= 7,
            remainingDays: daysLeft,
            expiresAt: expDateObj.toISOString()
          });
        } else {
          // Fallback seguro de trial de 7 dias se nenhuma data puder ser inferida
          const fallbackExp = new Date(Date.now() + 7 * 86400000).toISOString();
          setIsExpired(false);
          setTrialInfo({
            isTrial: true,
            remainingDays: 7,
            expiresAt: fallbackExp
          });
        }
      } catch (err) {
        console.error('Erro de conexão ao validar usuário:', err);
      }
    }

    checkCurrentCpfAccess();
    // Verificação a cada 10 minutos — equilibra responsividade com economia de bateria e cota de API
    const interval = setInterval(checkCurrentCpfAccess, 10 * 60 * 1000);

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
      trialInfo,
      lastWebhookConfirmation,
      signIn,
      signInWithGoogle,
      signInWithApple,
      activateSubscription,
      triggerWebhookPayment,
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
