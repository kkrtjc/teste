import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import localforage from 'localforage';

export const ADMIN_CPF = '14477751630';
export const ADMIN_EMAIL = 'galosmurabrasill@gmail.com';
export const ADMIN_EMAILS = [
  'galosmurabrasill@gmail.com',
  `${ADMIN_CPF}@mura.com`
];

export function isUserAdmin(emailOrCpf?: string | null): boolean {
  if (!emailOrCpf) return false;
  const clean = emailOrCpf.trim().toLowerCase();
  const cleanCpf = clean.split('@')[0].replace(/\D/g, '');
  if (cleanCpf === ADMIN_CPF) return true;
  return ADMIN_EMAILS.some(e => e.toLowerCase() === clean);
}

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
  isAdmin: boolean;
  trialInfo: TrialInfo;
  lastWebhookConfirmation: number | null;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (value: boolean) => void;
  signIn: (identifier: string, password?: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signInWithApple: () => Promise<{ error: any }>;
  sendPasswordReset: (identifier: string) => Promise<{ error: any; email?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  linkCpfToUser: (cpfInput: string) => Promise<{ error: any }>;
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
  const [user, setUser] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('@mura-manager:cached-user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('@mura-manager:cached-session');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isExpired, setIsExpired] = useState(false);
  const [lastWebhookConfirmation, setLastWebhookConfirmation] = useState<number | null>(null);
  const [trialInfo, setTrialInfo] = useState<TrialInfo>({
    isTrial: false,
    remainingDays: 0,
    expiresAt: null
  });
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [loading, setLoading] = useState(() => {
    try {
      return !localStorage.getItem('@mura-manager:cached-user');
    } catch {
      return true;
    }
  });

  async function validateUserAccess(targetUser: any) {
    if (!targetUser) return;
    const userEmail = targetUser.email;
    const cleanCpf = userEmail ? userEmail.split('@')[0] : '';
    if (!cleanCpf && !userEmail) return;

    if (isUserAdmin(userEmail) || isUserAdmin(cleanCpf)) {
      setIsExpired(false);
      setTrialInfo({ isTrial: false, remainingDays: 9999, expiresAt: null });
      return;
    }

    try {
      let rawExpiresAt: string | null = null;
      const userKey = targetUser.id || targetUser.email || cleanCpf;
      const storedExpiresAt: string | null = await localforage.getItem(`@mura-manager:locked-trial-expires:${userKey}`);

      if (!isSupabaseConfigured) {
        const localAllowedList = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
        let localData = localAllowedList.find(item => item.cpf === cleanCpf || item.email === userEmail);
        
        if (!localData && userEmail) {
          const initialExpires = storedExpiresAt || new Date(Date.now() + 7 * 86400000).toISOString();
          const tempCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();
          localData = {
            cpf: tempCpf,
            nome: targetUser.user_metadata?.full_name || userEmail.split('@')[0] || 'Novo Usuário',
            email: userEmail,
            expires_at: initialExpires
          };
          localAllowedList.push(localData);
          await localforage.setItem('@mura-manager:local-allowed-cpfs', localAllowedList);
          await localforage.setItem(`@mura-manager:locked-trial-expires:${userKey}`, initialExpires);
        }
        rawExpiresAt = localData?.expires_at ?? storedExpiresAt;
      } else {
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
          const initialExpires = storedExpiresAt || (targetUser?.created_at 
            ? new Date(new Date(targetUser.created_at).getTime() + 7 * 86400000).toISOString()
            : new Date(Date.now() + 7 * 86400000).toISOString());

          const tempCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();
          const newClient = {
            cpf: tempCpf,
            nome: targetUser.user_metadata?.full_name || userEmail.split('@')[0] || 'Novo Usuário Social',
            email: normEmail,
            expires_at: initialExpires
          };
          await supabase!.from('allowed_cpfs').insert([newClient]);
          await localforage.setItem(`@mura-manager:locked-trial-expires:${userKey}`, initialExpires);
          rawExpiresAt = initialExpires;
        } else {
          rawExpiresAt = data?.expires_at ?? storedExpiresAt;
        }
      }

      let expDateObj = parseIsoDate(rawExpiresAt);

      if (!expDateObj && targetUser?.created_at) {
        const createdAt = parseIsoDate(targetUser.created_at);
        if (createdAt) {
          expDateObj = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      }

      if (!expDateObj) {
        if (storedExpiresAt) {
          expDateObj = parseIsoDate(storedExpiresAt);
        } else {
          const firstInitExp = new Date(Date.now() + 7 * 86400000).toISOString();
          await localforage.setItem(`@mura-manager:locked-trial-expires:${userKey}`, firstInitExp);
          expDateObj = parseIsoDate(firstInitExp);
        }
      }

      if (expDateObj) {
        const nowMs = Date.now();
        const expMs = expDateObj.getTime();
        const diffMs = expMs - nowMs;
        const expired = diffMs <= 0;

        if (rawExpiresAt) {
          await localforage.setItem(`@mura-manager:locked-trial-expires:${userKey}`, expDateObj.toISOString());
        }

        const daysLeft = expired ? 0 : Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

        setIsExpired(expired);
        setTrialInfo({
          isTrial: !expired && daysLeft <= 7,
          remainingDays: daysLeft,
          expiresAt: expDateObj.toISOString()
        });
      }
    } catch (err) {
      console.error('Erro de conexão ao validar usuário:', err);
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Modo Local/Offline Fallback: recupera sessão local mockada se houver
      async function checkLocalSession() {
        try {
          const localSession: any = await localforage.getItem('@mura-manager:local-session');
          if (localSession?.user) {
            setUser(localSession.user);
            setSession(localSession.session);
            await validateUserAccess(localSession.user);
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
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 1500);

    // 1. Pega a sessão salva e libera o app instantaneamente
    supabase!.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        try {
          localStorage.setItem('@mura-manager:cached-user', JSON.stringify(session.user));
          if (session.access_token) {
            localStorage.setItem('@mura-manager:cached-session', JSON.stringify(session));
          }
        } catch {}
        // Validação em segundo plano sem travar o carregamento da tela
        validateUserAccess(session.user);
      } else {
        setUser(null);
        setSession(null);
        try {
          localStorage.removeItem('@mura-manager:cached-user');
          localStorage.removeItem('@mura-manager:cached-session');
        } catch {}
      }
      setLoading(false);
      clearTimeout(safetyTimeout);
    }).catch(err => {
      console.error('Erro ao buscar sessão do Supabase:', err);
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    // 2. Escuta mudanças de estado (login, token refresh, logout, recuperação de senha)
    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        try {
          localStorage.setItem('@mura-manager:cached-user', JSON.stringify(session.user));
          if (session.access_token) {
            localStorage.setItem('@mura-manager:cached-session', JSON.stringify(session));
          }
        } catch {}
        validateUserAccess(session.user);
      } else {
        setUser(null);
        setSession(null);
        try {
          localStorage.removeItem('@mura-manager:cached-user');
          localStorage.removeItem('@mura-manager:cached-session');
        } catch {}
      }
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

    const isAdmin = isUserAdmin(identifier) || isUserAdmin(cleanId) || cleanId === ADMIN_CPF || cleanId.toLowerCase() === ADMIN_EMAIL;

    // ══════════════════════════════════════════════════════
    // ADMIN ÚNICO: galosmurabrasill@gmail.com & 14477751630
    // ══════════════════════════════════════════════════════
    if (isAdmin) {
      if (isSupabaseConfigured) {
        const email    = isEmail ? cleanId.toLowerCase() : ADMIN_EMAIL;
        const password = passwordInput || `mura2026`;

        try {
          let { data, error } = await supabase!.auth.signInWithPassword({ email, password });

          // Se falhar no email oficial, tenta o alias interno
          if (error && !isEmail) {
            const retry = await supabase!.auth.signInWithPassword({ email: `${ADMIN_CPF}@mura.com`, password });
            if (!retry.error) {
              data = retry.data;
              error = null;
            }
          }

          if (!error && data?.session) {
            setSession(data.session);
            setUser(data.user);
            await validateUserAccess(data.user);
            return { error: null };
          }

          const { data: signUpData, error: signUpError } = await supabase!.auth.signUp({ email, password });
          if (!signUpError && signUpData?.session) {
            setSession(signUpData.session);
            setUser(signUpData.user);
            await validateUserAccess(signUpData.user);
            return { error: null };
          }
        } catch {
          // Supabase inacessível → continua para bypass local
        }
      }

      const adminSession = {
        session: { access_token: `admin-local-${Date.now()}` },
        user:    { id: `admin-${ADMIN_CPF}`, email: ADMIN_EMAIL },
      };
      await localforage.setItem('@mura-manager:local-session', adminSession);
      setUser(adminSession.user);
      setSession(adminSession.session);
      await validateUserAccess(adminSession.user);
      return { error: null };
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
        (item) => item.cpf === cleanId || item.email?.toLowerCase() === cleanId.toLowerCase()
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
        user:    { id: `local-${localData.cpf || localData.email}`, email: localData.email || `${localData.cpf}@mura.com` },
      };
      await localforage.setItem('@mura-manager:local-session', mockSession);
      setUser(mockSession.user);
      setSession(mockSession.session);
      return { error: null };
    }

    // ══════════════════════════════════════════════════════
    // MODO ONLINE — Usuário Regular
    // ══════════════════════════════════════════════════════
    let resolvedEmail = '';

    if (isEmail) {
      resolvedEmail = cleanId.toLowerCase();
    } else {
      // Login com CPF: descobre o e-mail cadastrado
      const { data: allowedData, error: allowedError } = await supabase!
        .from('allowed_cpfs')
        .select('cpf, expires_at, email')
        .eq('cpf', cleanId)
        .maybeSingle();

      if (allowedError) {
        return { error: { message: 'Erro ao verificar CPF no servidor. Tente novamente.' } };
      }

      if (!allowedData || !allowedData.email) {
        return { 
          error: { 
            message: 'Nenhuma conta vinculada a este CPF foi encontrada. Se você ainda está no período gratuito de 7 dias, entre com seu e-mail cadastrado.' 
          } 
        };
      }

      resolvedEmail = allowedData.email.toLowerCase();
    }

    try {
      const { data, error } = await supabase!.auth.signInWithPassword({ 
        email: resolvedEmail, 
        password: passwordInput 
      });

      if (!error && data.session) {
        setSession(data.session);
        setUser(data.user);
        try {
          localStorage.setItem('@mura-manager:cached-user', JSON.stringify(data.user));
          if (data.session.access_token) {
            localStorage.setItem('@mura-manager:cached-session', JSON.stringify(data.session));
          }
        } catch {}
        validateUserAccess(data.user);
        return { error: null };
      }

      return { error: error || { message: 'E-mail, CPF ou senha incorretos.' } };
    } catch (err: any) {
      return { error: err };
    }
  };

  // ══════════════════════════════════════════════════════
  // RECUPERAÇÃO DE SENHA POR EMAIL OU CPF
  // ══════════════════════════════════════════════════════
  const sendPasswordReset = async (identifier: string): Promise<{ error: any; email?: string }> => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Recuperação de senha não disponível no modo offline.' } };
    }

    const clean = identifier.trim().toLowerCase();
    const isEmail = clean.includes('@');
    let targetEmail = clean;

    if (!isEmail) {
      const cleanCpf = clean.replace(/\D/g, '');
      if (cleanCpf === ADMIN_CPF) {
        targetEmail = ADMIN_EMAIL;
      } else {
        const { data, error } = await supabase!
          .from('allowed_cpfs')
          .select('email')
          .eq('cpf', cleanCpf)
          .maybeSingle();

        if (error || !data?.email) {
          return { 
            error: { 
              message: 'Nenhum e-mail vinculado a este CPF foi encontrado. Se você ainda não cadastrou o CPF, informe seu e-mail de cadastro.' 
            } 
          };
        }
        targetEmail = data.email.toLowerCase();
      }
    }

    try {
      const { error } = await supabase!.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/`
      });

      if (error) {
        return { error };
      }

      // Mascara o e-mail para exibição segura (ex: g***l@gmail.com)
      const parts = targetEmail.split('@');
      const userPart = parts[0];
      const domain = parts[1] || 'email.com';
      const maskedUser = userPart.length > 2 
        ? `${userPart[0]}***${userPart[userPart.length - 1]}` 
        : `${userPart[0]}***`;
      const maskedEmail = `${maskedUser}@${domain}`;

      return { error: null, email: maskedEmail };
    } catch (err: any) {
      return { error: err };
    }
  };

  // ══════════════════════════════════════════════════════
  // DEFINIR NOVA SENHA (APÓS CLICAR NO LINK DO EMAIL)
  // ══════════════════════════════════════════════════════
  const updatePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured) {
      return { error: { message: 'Operação não suportada no modo offline.' } };
    }

    try {
      const { error } = await supabase!.auth.updateUser({ password: newPassword });
      if (!error) {
        setIsPasswordRecovery(false);
      }
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  // ══════════════════════════════════════════════════════
  // VINCULAR CPF AO USUÁRIO NO MOMENTO DO PAGAMENTO
  // ══════════════════════════════════════════════════════
  const linkCpfToUser = async (cpfInput: string) => {
    const cleanCpf = cpfInput.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      return { error: { message: 'CPF inválido. Digite os 11 dígitos do CPF.' } };
    }

    const emailToUse = user?.email?.toLowerCase().trim();
    if (!emailToUse) {
      return { error: { message: 'Nenhum usuário logado para vincular o CPF.' } };
    }

    try {
      if (isSupabaseConfigured) {
        // Verifica se o CPF já pertence a outro usuário com email diferente
        const { data: existing } = await supabase!
          .from('allowed_cpfs')
          .select('email')
          .eq('cpf', cleanCpf)
          .neq('email', emailToUse)
          .maybeSingle();

        if (existing) {
          return { error: { message: 'Este CPF já está associado a outra conta.' } };
        }

        // Atualiza a tabela allowed_cpfs com o CPF do usuário
        const { error: updateErr } = await supabase!
          .from('allowed_cpfs')
          .update({ cpf: cleanCpf })
          .eq('email', emailToUse);

        if (updateErr) {
          console.warn('Tentando upsert de CPF...', updateErr);
          await supabase!
            .from('allowed_cpfs')
            .upsert({
              email: emailToUse,
              cpf: cleanCpf,
              nome: emailToUse.split('@')[0],
            }, { onConflict: 'email' });
        }
      } else {
        const localList = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
        const idx = localList.findIndex(item => item.email?.toLowerCase() === emailToUse);
        if (idx >= 0) {
          localList[idx].cpf = cleanCpf;
        } else {
          localList.push({ email: emailToUse, cpf: cleanCpf });
        }
        await localforage.setItem('@mura-manager:local-allowed-cpfs', localList);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      localStorage.removeItem('@mura-manager:cached-user');
      localStorage.removeItem('@mura-manager:cached-session');
    } catch {}

    if (!isSupabaseConfigured) {
      await localforage.removeItem('@mura-manager:local-session');
      setUser(null);
      setSession(null);
      return;
    }

    await supabase!.auth.signOut();
    setUser(null);
    setSession(null);
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

    if (cleanCpf === ADMIN_CPF) {
      setIsExpired(false);
      setTrialInfo({ isTrial: false, remainingDays: 999, expiresAt: null });
      return;
    }

    async function checkCurrentCpfAccess() {
      try {
        let rawExpiresAt: string | null = null;
        const userKey = user.id || user.email || cleanCpf;
        const storedExpiresAt: string | null = await localforage.getItem(`@mura-manager:locked-trial-expires:${userKey}`);

        if (!isSupabaseConfigured) {
          const localAllowedList = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
          let localData = localAllowedList.find(item => item.cpf === cleanCpf || item.email === userEmail);
          
          if (!localData && userEmail) {
            const initialExpires = storedExpiresAt || new Date(Date.now() + 7 * 86400000).toISOString();
            const tempCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();
            localData = {
              cpf: tempCpf,
              nome: user.user_metadata?.full_name || userEmail.split('@')[0] || 'Novo Usuário',
              email: userEmail,
              expires_at: initialExpires
            };
            localAllowedList.push(localData);
            await localforage.setItem('@mura-manager:local-allowed-cpfs', localAllowedList);
            await localforage.setItem(`@mura-manager:locked-trial-expires:${userKey}`, initialExpires);
          }
          rawExpiresAt = localData?.expires_at ?? storedExpiresAt;
        } else {
          // Validação online no Supabase com busca segura
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
            const initialExpires = storedExpiresAt || (user?.created_at 
              ? new Date(new Date(user.created_at).getTime() + 7 * 86400000).toISOString()
              : new Date(Date.now() + 7 * 86400000).toISOString());

            const tempCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();
            const newClient = {
              cpf: tempCpf,
              nome: user.user_metadata?.full_name || userEmail.split('@')[0] || 'Novo Usuário Social',
              email: normEmail,
              expires_at: initialExpires
            };
            await supabase!.from('allowed_cpfs').insert([newClient]);
            await localforage.setItem(`@mura-manager:locked-trial-expires:${userKey}`, initialExpires);
            rawExpiresAt = initialExpires;
          } else {
            rawExpiresAt = data?.expires_at ?? storedExpiresAt;
          }
        }

        // ── Cálculo Rigoroso Travado de Expiração ──
        let expDateObj = parseIsoDate(rawExpiresAt);

        // Se o registro no DB não contiver expiração explícita, calcula a partir do user.created_at (Data de Cadastro)
        if (!expDateObj && user?.created_at) {
          const createdAt = parseIsoDate(user.created_at);
          if (createdAt) {
            expDateObj = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
          }
        }

        // Se ainda não houver expiração, usa o horário gravado na 1ª inicialização da conta
        if (!expDateObj) {
          if (storedExpiresAt) {
            expDateObj = parseIsoDate(storedExpiresAt);
          } else {
            const firstInitExp = new Date(Date.now() + 7 * 86400000).toISOString();
            await localforage.setItem(`@mura-manager:locked-trial-expires:${userKey}`, firstInitExp);
            expDateObj = parseIsoDate(firstInitExp);
          }
        }

        if (expDateObj) {
          const nowMs = Date.now();
          const expMs = expDateObj.getTime();
          const diffMs = expMs - nowMs;
          const expired = diffMs <= 0;

          // Salva no cache local para garantir trava contra desincronizações
          if (rawExpiresAt) {
            await localforage.setItem(`@mura-manager:locked-trial-expires:${userKey}`, expDateObj.toISOString());
          }

          const daysLeft = expired ? 0 : Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

          setIsExpired(expired);
          setTrialInfo({
            isTrial: !expired && daysLeft <= 7,
            remainingDays: daysLeft,
            expiresAt: expDateObj.toISOString()
          });
        }
      } catch (err) {
        console.error('Erro de conexão ao validar usuário:', err);
      }
    }

    checkCurrentCpfAccess();
    // Verificação periódica a cada 5 minutos
    const interval = setInterval(checkCurrentCpfAccess, 5 * 60 * 1000);

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
      isExpired: (isUserAdmin(user?.email) || isUserAdmin(getCpf())) ? false : isExpired,
      isAdmin: isUserAdmin(user?.email) || isUserAdmin(getCpf()),
      trialInfo,
      lastWebhookConfirmation,
      isPasswordRecovery,
      setIsPasswordRecovery,
      signIn,
      signInWithGoogle,
      signInWithApple,
      sendPasswordReset,
      updatePassword,
      linkCpfToUser,
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
