import React, { useState, useRef, useEffect, memo } from 'react';
import { 
  Activity, LogIn, Check, Sparkles, ShieldCheck, Layers, Dna,
  TrendingUp, History, Smartphone, Lock, User, Mail, X, Star, Fingerprint,
  KeyRound, ArrowLeft, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';
import { useAuth, isUserAdmin, type SubscriptionPlan } from '../lib/AuthContext';
import { LandingCheckoutModal } from '../components/LandingCheckoutModal';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import localforage from 'localforage';
import muraLogo from '../assets/mura_logo.jpg';
import heroBg from '../assets/hero_bg.jpg';
import roosterImg from '../assets/rooster_sticker.png';
import {
  checkBiometricSupport,
  hasBiometricRegistered,
  authenticateWithBiometric,
} from '../lib/biometricAuth';
import previewDashboard from '../assets/preview_dashboard.png';
import previewGenetics from '../assets/preview_genetics.png';
import previewLots from '../assets/preview_lots.png';
import previewBirdProfile from '../assets/preview_bird_profile.png';
import previewChicksLot from '../assets/preview_chicks_lot.png';

const carouselImages = [
  { src: previewGenetics, title: 'Cadastro de Raças e Linhagens', desc: 'Controle completo do seu plantel categorizado por raça, com idade, peso médio e contagem de aves.' },
  { src: previewBirdProfile, title: 'Ficha e Perfil Detalhado da Ave', desc: 'Galeria de fotos da ave, anilha, gênero, raça, localização na baia, status e registro de vacinas aplicadas.' },
  { src: previewDashboard, title: 'Gestão Completa de Ovos', desc: 'Acompanhe a coleta diária, taxa de aproveitamento, receitas geradas e balanço financeiro de lucro e custo.' },
  { src: previewLots, title: 'Gestão de Lotes de Postura e Engorda', desc: 'Monitore lotes ativos, expectativa diária de produção, fêmeas em postura e acompanhamento de baia.' },
  { src: previewChicksLot, title: 'Controle de Lotes de Pintinhos e Crescimento', desc: 'Contagem automática da idade em dias, lote por baia, quantidade total de pintinhos e alteração de status.' }
];

const stats = [
  { value: '12k+', label: 'Aves Gerenciadas' },
  { value: '380+', label: 'Criadores Ativos' },
  { value: '99.8%', label: 'Uptime' },
  { value: '4.9★', label: 'Avaliação' },
];

const features = [
  { icon: Dna, title: 'Controle Genético', desc: 'Forme casais, monitore cruzamentos e visualize a árvore genealógica, evitando consanguinidade indesejada.', accent: '#f59e0b' },
  { icon: Layers, title: 'Gestão de Lotes', desc: 'Lotes de postura com coleta diária automatizada e lotes de engorda com transição ágil de status.', accent: '#10b981' },
  { icon: History, title: 'Histórico de Baixas', desc: 'Saídas por venda ou falecimento com relatórios limpos e taxa de mortalidade automatizada.', accent: '#f43f5e' },
  { icon: Smartphone, title: 'Multi-Dispositivo', desc: 'Ultra-rápido no Android, iOS e PC. Sincronização em tempo real entre todos os seus aparelhos.', accent: '#3b82f6' },
  { icon: TrendingUp, title: 'Alertas de Postura', desc: 'Produção real vs meta teórica de 85%. Gráficos e projeções de rendimento do criatório.', accent: '#8b5cf6' },
  { icon: ShieldCheck, title: 'Assinatura Segura', desc: 'Cobrança automática no cartão ou notificações Pix 3 dias antes do vencimento. Zero surpresas.', accent: '#f59e0b' },
];

const inputCls = "w-full bg-white/[0.05] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:border-amber-500 focus:outline-none transition-colors";

const formatCPF = (value: string) => {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};

/* ══════════════════════════════════════════════════════ */
/* COMPONENTE ISOLADO: CARROSSEL (MEMOIZADO)              */
/* ══════════════════════════════════════════════════════ */
const AppCarousel = memo(function AppCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % carouselImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative pt-2 pb-6 sm:pt-4 sm:pb-10 px-4 max-w-md mx-auto z-10">
      <div className="w-full max-w-[360px] mx-auto relative">
        {/*
         * GALO DE FUNDO: pés apoiados exatamente na parte superior do container das imagens.
         * Fica no plano de fundo, com máscara gradiente para não cobrir nenhum texto ou botão.
         */}
        <img
          src={roosterImg}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          className="pointer-events-none select-none transform-gpu"
          style={{
            position: 'absolute',
            bottom: 'calc(100% - 10px)',
            left: '-10px',
            height: 'clamp(210px, 30vw, 290px)',
            width: 'auto',
            maxWidth: 'none',
            objectFit: 'contain',
            objectPosition: 'bottom left',
            opacity: 0.85,
            WebkitMaskImage:
              'linear-gradient(to top, black 70%, rgba(0,0,0,0.6) 85%, transparent 100%), linear-gradient(to right, black 65%, rgba(0,0,0,0.4) 85%, transparent 100%)',
            maskImage:
              'linear-gradient(to top, black 70%, rgba(0,0,0,0.6) 85%, transparent 100%), linear-gradient(to right, black 65%, rgba(0,0,0,0.4) 85%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 0,
            willChange: 'transform',
          }}
        />

        <div className="relative rounded-[32px] overflow-hidden border-[3px] border-white/20 bg-[#0a0a0b] shadow-2xl shadow-amber-500/10 group aspect-[497/755] max-w-[360px] mx-auto z-10">
          {carouselImages.map((img, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                idx === activeSlide ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img src={img.src} alt={img.title} className="w-full h-full object-contain bg-[#0a0a0b]" loading="lazy" />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setActiveSlide(prev => (prev - 1 + carouselImages.length) % carouselImages.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center hover:bg-amber-500 hover:text-black hover:border-amber-500 transition-all opacity-70 group-hover:opacity-100 shadow-lg text-xs cursor-pointer"
          >
            ❮
          </button>
          <button
            type="button"
            onClick={() => setActiveSlide(prev => (prev + 1) % carouselImages.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center hover:bg-amber-500 hover:text-black hover:border-amber-500 transition-all opacity-70 group-hover:opacity-100 shadow-lg text-xs cursor-pointer"
          >
            ❯
          </button>
        </div>

        <div className="mt-4 text-center px-4">
          <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest">
            {carouselImages[activeSlide].title}
          </h4>
          <p className="text-[11px] text-white/60 mt-1 max-w-md mx-auto">
            {carouselImages[activeSlide].desc}
          </p>
        </div>

        <div className="mt-3 flex justify-center gap-2">
          {carouselImages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === activeSlide ? 'bg-amber-500 w-7' : 'bg-white/20 w-1.5'
              }`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
});

/* ══════════════════════════════════════════════════════ */
/* COMPONENTE ISOLADO: MODAL DE LOGIN                     */
/* ══════════════════════════════════════════════════════ */
const LoginFormModal = memo(function LoginFormModal({
  isOpen,
  onClose,
  onOpenRegister,
  onOpenForgot,
  signIn,
  isLocalMode,
  biometricAvailable,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
  onOpenForgot: (id: string) => void;
  signIn: (id: string, pass: string) => Promise<{ error: any }>;
  isLocalMode: boolean;
  biometricAvailable: boolean;
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) { setLoginError('Preencha seu e-mail ou CPF.'); return; }
    if (!password) { setLoginError('Informe sua senha.'); return; }
    setLoginError('');
    setLoginLoading(true);
    try {
      const { error } = await signIn(identifier.trim(), password);
      if (error) {
        setLoginError(
          error.message?.includes('Invalid login') 
            ? 'E-mail, CPF ou senha incorretos.' 
            : error.message || 'Erro ao entrar. Verifique os dados.'
        );
      }
    } catch (err: any) {
      setLoginError(err.message || 'Erro inesperado.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!hasBiometricRegistered()) {
      setBiometricError('Nenhuma biometria registrada. Faça login com senha primeiro.');
      return;
    }
    setBiometricError('');
    setBiometricLoading(true);
    try {
      const userId = await authenticateWithBiometric();
      if (!userId) {
        setBiometricError('Biometria não reconhecida. Tente novamente ou use sua senha.');
        return;
      }
      const { error } = await signIn(userId, '__biometric__');
      if (error) setBiometricError('Falha ao acessar a conta. Use sua senha.');
    } catch (err: any) {
      setBiometricError(err.message || 'Erro na autenticação biométrica.');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl bg-[#121216] border border-white/10">
        <div className="px-7 pt-7 pb-5 border-b border-white/[0.08] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={muraLogo} alt="" className="w-9 h-9 rounded-xl object-cover border border-amber-500/20" />
            <div>
              <h3 className="font-black text-sm text-white">Acesse sua Conta</h3>
              <p className="text-[10px] mt-0.5 text-white/40">Bem-vindo ao Mura Manager</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleLoginSubmit} className="px-7 py-6 space-y-4">
          {loginError && (
            <div className="p-3 rounded-xl text-xs font-bold text-center bg-red-500/10 border border-red-500/20 text-red-400">
              {loginError}
            </div>
          )}

          {biometricAvailable && hasBiometricRegistered() && (
            <div className="space-y-2">
              {biometricError && (
                <div className="p-2.5 rounded-xl text-xs font-bold text-center bg-red-500/10 border border-red-500/20 text-red-400">
                  {biometricError}
                </div>
              )}
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 active:scale-95 transition-all disabled:opacity-60 bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm cursor-pointer"
              >
                {biometricLoading ? <Activity size={15} className="animate-spin" /> : <Fingerprint size={16} />}
                <span>{biometricLoading ? 'Verificando...' : 'Entrar com Face ID / Biometria'}</span>
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">E-mail ou CPF</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input 
                type="text" 
                required 
                placeholder="email@exemplo.com ou CPF" 
                value={identifier}
                onChange={e => { 
                  const v = e.target.value; 
                  setIdentifier(v.includes('@') || /[a-zA-Z]/.test(v) ? v : formatCPF(v)); 
                }}
                className={inputCls} 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Senha</label>
              <button
                type="button"
                onClick={() => onOpenForgot(identifier)}
                className="text-[11px] text-amber-500 hover:text-amber-400 font-bold transition-colors cursor-pointer"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input 
                type="password" 
                required 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className={inputCls} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loginLoading}
            className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-black active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-1 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            {loginLoading ? <Activity size={15} className="animate-spin text-black" /> : <><LogIn size={14} /> Entrar na Plataforma</>}
          </button>
          
          <div className="pt-3 text-center border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onOpenRegister}
              className="text-xs text-theme-text-muted hover:text-white transition-colors cursor-pointer"
            >
              Ainda não tem conta? <span className="text-amber-400 font-bold">Cadastre-se grátis por 7 dias</span>
            </button>
          </div>

          {isLocalMode && (
            <div className="p-2 rounded-lg text-[9px] text-center bg-amber-500/5 border border-amber-500/10 text-amber-400/50">
              Modo Offline · Admin: 14477751630
            </div>
          )}
        </form>
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════ */
/* COMPONENTE ISOLADO: MODAL DE CADASTRO GRÁTIS (7 DIAS)  */
/* ══════════════════════════════════════════════════════ */
const RegisterFormModal = memo(function RegisterFormModal({
  isOpen,
  onClose,
  onOpenLogin,
  signIn,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  signIn: (id: string, pass: string) => Promise<{ error: any }>;
}) {
  const [regNome, setRegNome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  if (!isOpen) return null;

  const handleFreeRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = regEmail.trim().toLowerCase();
    if (!regNome.trim()) { setRegError('Informe seu nome completo.'); return; }
    if (!cleanEmail || !cleanEmail.includes('@')) { setRegError('Informe um e-mail válido.'); return; }
    if (regSenha.length < 6) { setRegError('A senha deve ter no mínimo 6 caracteres.'); return; }

    if (isUserAdmin(cleanEmail)) {
      setRegError('Este e-mail é a conta do Administrador Principal. Acesse usando o formulário de login.');
      return;
    }

    setRegError('');
    setRegLoading(true);

    try {
      if (isSupabaseConfigured) {
        const { data: existingUser } = await supabase!
          .from('allowed_cpfs')
          .select('email')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (existingUser) {
          setRegError('Este e-mail já possui cadastro no Mura Manager. Faça login com sua senha.');
          setRegLoading(false);
          return;
        }
      }

      const days = 7;
      const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      const tempCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();
      const clientPayload = {
        cpf: tempCpf,
        email: cleanEmail,
        nome: regNome.trim(),
        senha: regSenha,
        expires_at: expiresAt
      };

      if (isSupabaseConfigured) {
        const { error: insertErr } = await supabase!.from('allowed_cpfs').insert([clientPayload]);
        if (insertErr) {
          const list = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
          list.push(clientPayload);
          await localforage.setItem('@mura-manager:local-allowed-cpfs', list);
        }
        await supabase!.auth.signUp({ email: cleanEmail, password: regSenha });
      } else {
        const list = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
        list.push(clientPayload);
        await localforage.setItem('@mura-manager:local-allowed-cpfs', list);
      }

      const { error: loginErr } = await signIn(cleanEmail, regSenha);
      if (loginErr) {
        setRegError(loginErr.message || 'Erro ao entrar na conta criada.');
      }
    } catch (err: any) {
      setRegError(err.message || 'Erro ao criar conta de testes.');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl bg-[#121216] border border-white/10">
        <div className="px-7 pt-7 pb-5 border-b border-white/[0.08] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Criar Conta Grátis</h3>
              <p className="text-[10px] text-theme-text-muted">Acesso completo liberado por 7 dias sem cartão</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleFreeRegisterSubmit} className="px-7 py-6 space-y-4">
          {regError && (
            <div className="p-3 rounded-xl text-xs font-bold text-center bg-red-500/10 border border-red-500/20 text-red-400">
              {regError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input 
                type="text" 
                required 
                placeholder="Seu nome ou nome do criatório" 
                value={regNome} 
                onChange={e => setRegNome(e.target.value)} 
                className={inputCls} 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input 
                type="email" 
                required 
                placeholder="seuemail@exemplo.com" 
                value={regEmail} 
                onChange={e => setRegEmail(e.target.value)} 
                className={inputCls} 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Senha de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
              <input 
                type="password" 
                required 
                placeholder="Mínimo 6 caracteres" 
                value={regSenha} 
                onChange={e => setRegSenha(e.target.value)} 
                className={inputCls} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={regLoading}
            className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-black active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            {regLoading ? <Activity size={15} className="animate-spin text-black" /> : <><Sparkles size={14} /> Criar Minha Conta Grátis e Entrar</>}
          </button>

          <div className="pt-3 text-center border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-xs text-theme-text-muted hover:text-white transition-colors cursor-pointer"
            >
              Já possui uma conta? <span className="text-amber-400 font-bold">Acessar Conta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════ */
/* COMPONENTE ISOLADO: MODAL RECUPERAÇÃO DE SENHA         */
/* ══════════════════════════════════════════════════════ */
const ForgotPasswordModal = memo(function ForgotPasswordModal({
  isOpen,
  onClose,
  onOpenLogin,
  sendPasswordReset,
  initialIdentifier,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  sendPasswordReset: (email: string) => Promise<{ error: any }>;
  initialIdentifier: string;
}) {
  const [forgotIdentifier, setForgotIdentifier] = useState(initialIdentifier);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  useEffect(() => {
    if (initialIdentifier) setForgotIdentifier(initialIdentifier);
  }, [initialIdentifier]);

  if (!isOpen) return null;

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = forgotIdentifier.trim();
    if (!cleanId) { setForgotError('Informe seu e-mail ou CPF.'); return; }
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      let emailToSend = cleanId;
      if (!cleanId.includes('@')) {
        const rawDigits = cleanId.replace(/\D/g, '');
        if (isSupabaseConfigured) {
          const { data } = await supabase!
            .from('allowed_cpfs')
            .select('email')
            .eq('cpf', rawDigits)
            .maybeSingle();
          if (!data?.email) {
            setForgotError('Nenhum cadastro encontrado para este CPF.');
            setForgotLoading(false);
            return;
          }
          emailToSend = data.email;
        } else {
          setForgotError('Recuperação por CPF disponível apenas com conexão ativa.');
          setForgotLoading(false);
          return;
        }
      }

      const { error } = await sendPasswordReset(emailToSend);
      if (error) {
        setForgotError(error.message || 'Erro ao enviar e-mail de recuperação.');
      } else {
        setForgotSuccess(`Instruções de redefinição de senha enviadas para: ${emailToSend}. Verifique sua caixa de entrada.`);
      }
    } catch (err: any) {
      setForgotError(err.message || 'Erro inesperado.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl bg-[#121216] border border-white/10">
        <div className="px-7 pt-7 pb-5 border-b border-white/[0.08] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <KeyRound size={16} />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Recuperar Minha Senha</h3>
              <p className="text-[10px] text-white/40">Informe seu E-mail ou CPF cadastrado</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleForgotPasswordSubmit} className="px-7 py-6 space-y-4">
          <p className="text-xs text-white/70 leading-relaxed">
            Digite seu e-mail ou CPF cadastrado. Nós enviaremos um link seguro para você redefinir sua senha diretamente no seu e-mail.
          </p>

          {forgotError && (
            <div className="p-3.5 rounded-xl text-xs font-bold text-center flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400">
              <AlertCircle size={16} className="shrink-0" />
              <span>{forgotError}</span>
            </div>
          )}

          {forgotSuccess && (
            <div className="p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <span>{forgotSuccess}</span>
            </div>
          )}

          {!forgotSuccess && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">E-mail ou CPF</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                <input 
                  type="text" 
                  required 
                  placeholder="email@exemplo.com ou CPF" 
                  value={forgotIdentifier}
                  onChange={e => {
                    const v = e.target.value;
                    setForgotIdentifier(v.includes('@') || /[a-zA-Z]/.test(v) ? v : formatCPF(v));
                  }}
                  className={inputCls} 
                />
              </div>
            </div>
          )}

          {!forgotSuccess ? (
            <button 
              type="submit" 
              disabled={forgotLoading}
              className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-black active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-1 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {forgotLoading ? <Activity size={15} className="animate-spin text-black" /> : <><Mail size={14} /> Enviar Link de Recuperação</>}
            </button>
          ) : (
            <button 
              type="button" 
              onClick={onOpenLogin}
              className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest text-black bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn size={14} /> Voltar ao Login
            </button>
          )}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-xs text-theme-text-muted hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <ArrowLeft size={13} /> Voltar para a tela de Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════ */
/* COMPONENTE ISOLADO: MODAL DEFINIR NOVA SENHA           */
/* ══════════════════════════════════════════════════════ */
const ResetPasswordModal = memo(function ResetPasswordModal({
  isOpen,
  onClose,
  updatePassword,
}: {
  isOpen: boolean;
  onClose: () => void;
  updatePassword: (pass: string) => Promise<{ error: any }>;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  if (!isOpen) return null;

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setResetError('A nova senha deve ter no mínimo 6 caracteres.'); return; }
    if (newPassword !== confirmNewPassword) { setResetError('As senhas digitadas não coincidem.'); return; }
    setResetError('');
    setResetLoading(true);

    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        setResetError(error.message || 'Erro ao redefinir a senha.');
      } else {
        setResetSuccess('Sua nova senha foi definida com sucesso! Entrando...');
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err: any) {
      setResetError(err.message || 'Erro ao redefinir a senha.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90">
      <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl bg-[#121216] border border-amber-500/30">
        <div className="px-7 pt-7 pb-5 border-b border-white/[0.08] flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <KeyRound size={16} />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Criar Nova Senha</h3>
              <p className="text-[10px] text-white/40">Redefinição de acesso segura</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdatePasswordSubmit} className="px-7 py-6 space-y-4">
          <p className="text-xs text-white/70 leading-relaxed">
            Você confirmou a recuperação pelo link do e-mail. Agora, digite sua nova senha para acessar a plataforma.
          </p>

          {resetError && (
            <div className="p-3.5 rounded-xl text-xs font-bold text-center flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400">
              <AlertCircle size={16} className="shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
              <span>{resetSuccess}</span>
            </div>
          )}

          {!resetSuccess && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                  <input 
                    type="password" 
                    required 
                    placeholder="Mínimo 6 caracteres" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className={inputCls} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Confirmar Nova Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                  <input 
                    type="password" 
                    required 
                    placeholder="Repita a nova senha" 
                    value={confirmNewPassword} 
                    onChange={e => setConfirmNewPassword(e.target.value)} 
                    className={inputCls} 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={resetLoading}
                className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-black active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {resetLoading ? <Activity size={15} className="animate-spin text-black" /> : <><Check size={14} /> Salvar Nova Senha e Entrar</>}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
});

/* ══════════════════════════════════════════════════════ */
/* COMPONENTE PRINCIPAL: LOGIN / LANDING PAGE             */
/* ══════════════════════════════════════════════════════ */
export function Login() {
  const { 
    signIn, 
    isLocalMode,
    sendPasswordReset,
    updatePassword,
    isPasswordRecovery,
    setIsPasswordRecovery
  } = useAuth();
  const detailsRef = useRef<HTMLDivElement>(null);

  // Controles de visibilidade dos modais (totalmente desacoplados dos inputs)
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotInitialId, setForgotInitialId] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlan>('pro_monthly');

  const handleOpenCheckout = (plan: SubscriptionPlan) => {
    setCheckoutPlan(plan);
    setShowCheckoutModal(true);
  };

  // Detecção de biometria
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  useEffect(() => {
    checkBiometricSupport().then(setBiometricAvailable);
  }, []);

  // Detecção de anúncio/link direto para cadastro (?cadastro=true ou ?signup=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cadastro') === 'true' || params.get('signup') === 'true') {
      setShowRegisterForm(true);
    } else if (params.get('entrar') === 'true' || params.get('login') === 'true') {
      setShowLoginForm(true);
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] text-white font-sans overflow-x-hidden relative selection:bg-amber-500 selection:text-black">

      {/* ── BACKGROUND (GPU-composited, zero CPU blur, zero heavy SVG filters) ── */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none transform-gpu"
      >
        <img
          src={heroBg}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />

        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(245,158,11,0.12) 0%, transparent 60%), radial-gradient(ellipse 55% 70% at 85% 50%, rgba(22,101,52,0.08) 0%, transparent 55%)',
          }} 
        />

        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }} 
        />
      </div>

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-40 bg-[#0a0a0b]/95 border-b border-white/[0.08] px-4 sm:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src={muraLogo} alt="Mura Manager" className="w-9 h-9 rounded-lg object-cover border border-amber-500/20" />
          <div className="leading-none">
            <p className="text-sm font-black tracking-[0.2em] uppercase text-white">MURA</p>
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-amber-500/70">MANAGER</p>
          </div>
        </div>

        <div className="hidden sm:flex gap-6 text-xs font-semibold text-white/50">
          <button onClick={() => detailsRef.current?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors cursor-pointer">Recursos</button>
          <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors cursor-pointer">Planos</button>
        </div>

        <button
          onClick={() => setShowLoginForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-black rounded-full active:scale-95 transition-all bg-amber-500 hover:bg-amber-400 shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <LogIn size={12} /> Entrar
        </button>
      </nav>

      {/* ── HERO (z-20 garante que títulos, botões e estatísticas fiquem na frente do galo) ── */}
      <section className="relative flex flex-col items-center text-center pt-4 pb-3 sm:pt-8 sm:pb-6 px-4 sm:px-6 max-w-4xl mx-auto z-20">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(ellipse 70% 80% at 55% 45%, rgba(0,0,0,0.55) 0%, transparent 75%)',
          }}
        />

        <div className="mb-3 sm:mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border border-amber-500/30 bg-[#121216] text-amber-400 shadow-sm relative z-10">
          <Star size={9} fill="currentColor" /> A gestão que seu criatório merece <Star size={9} fill="currentColor" />
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05] text-white relative z-10">
          Gestão de<br />Criatórios de Elite.
        </h1>

        <p className="mt-2.5 sm:mt-3.5 text-xs sm:text-sm max-w-lg leading-relaxed font-semibold text-white/75 relative z-10">
          Cadastre mais de 20 mil aves e tenha o controle completo sobre o seu plantel, nível de parentesco e gestão inteligente de lotes de postura e engorda.
        </p>

        <div className="mt-4 sm:mt-5 flex flex-col items-center gap-3 relative z-10 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
            <button
              onClick={() => setShowRegisterForm(true)}
              className="w-full sm:w-auto px-7 py-3.5 text-xs font-black uppercase tracking-widest text-black rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/25 cursor-pointer"
            >
              <Sparkles size={13} /> Teste grátis durante 7 dias
            </button>

            <button
              onClick={() => setShowLoginForm(true)}
              className="w-full sm:w-auto px-7 py-3.5 text-xs font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 text-amber-400 border border-amber-500/30 bg-black/40 hover:bg-black/60 cursor-pointer"
            >
              <LogIn size={13} /> Acesse sua Conta
            </button>
          </div>

          <button
            type="button"
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-xs font-extrabold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-white/5 cursor-pointer"
          >
            <span>Conheça os planos</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 relative z-10 w-full max-w-lg">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-black text-white">
                {s.value}
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-white/60">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CARROSSEL DE APRESENTAÇÃO DO APP (ISOLADO E RÁPIDO) ── */}
      <AppCarousel />

      {/* ── FEATURES ── */}
      <section ref={detailsRef} className="relative py-10 sm:py-14 px-6 mx-auto max-w-5xl z-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Plataforma Completa</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">Tudo que seu criatório<br />precisa em um só lugar</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div 
                key={i}
                className="rounded-2xl p-5 flex flex-col gap-3 bg-white/[0.03] border border-white/[0.08] hover:border-amber-500/30 hover:bg-white/[0.05] transition-all cursor-default"
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" 
                  style={{ background: `${f.accent}15`, border: `1px solid ${f.accent}25` }}
                >
                  <f.icon size={18} style={{ color: f.accent }} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white mb-1">{f.title}</h3>
                  <p className="text-xs leading-relaxed text-white/50">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="relative py-10 sm:py-14 px-4 sm:px-6 mx-auto max-w-5xl z-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8 space-y-2 text-center sm:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Planos e Preços</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Escolha o plano ideal para seu criatório</h2>
            <p className="text-sm font-bold text-amber-400 mt-1">Experimente Grátis por 7 dias com TUDO liberado — Sem compromisso e sem cartão!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {/* 1. MENSAL COMUM */}
            <div className="rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 bg-white/[0.03] border border-white/[0.08] hover:border-white/20 transition-all">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 text-white/50">Mensal Comum</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-white/50">R$</span>
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter leading-none">39</span>
                  <span className="text-base font-black text-white/50">,90</span>
                  <span className="text-xs font-bold text-white/40">/mês</span>
                </div>
                <p className="text-[10px] mt-1.5 font-bold text-amber-400">
                  Ideal para controle individual e vendas
                </p>
              </div>

              <ul className="space-y-2.5 my-auto">
                {[
                  'Cadastro completo de aves com fotos e anilhas',
                  'Genealogia e árvore genealógica de linhagens',
                  'Vitrine digital pública para divulgar no WhatsApp',
                  'Fichas técnicas completas para clientes',
                  'Histórico sanitário e vacinas individuais',
                  'Backup automático e sincronização em nuvem',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-amber-500/15 border border-amber-500/30">
                      <Check size={8} className="text-amber-400" />
                    </div>
                    <span className="leading-snug text-[11px]">{item}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleOpenCheckout('monthly')}
                className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all text-black bg-amber-500 hover:bg-amber-400 shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Assinar Mensal Comum</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* 2. MENSAL COMPLETO */}
            <div className="rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 relative overflow-hidden bg-white/[0.05] border border-amber-500/40 shadow-xl shadow-amber-500/5 hover:border-amber-500/60 transition-all">
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-black bg-amber-400">
                COMBO COMPLETO
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 text-amber-400">Mensal Completo</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-white/50">R$</span>
                  <span className="text-4xl sm:text-5xl font-black text-amber-400 tracking-tighter leading-none">59</span>
                  <span className="text-base font-black text-white/50">,80</span>
                  <span className="text-xs font-bold text-white/40">/mês</span>
                </div>
                <p className="text-[10px] mt-1.5 font-bold text-zinc-300">
                  Aves + Lotes inteiros e Gestão de Ovos
                </p>
              </div>

              <ul className="space-y-2.5 my-auto">
                {[
                  'Tudo do Plano Mensal Comum incluso',
                  'Módulo completo de lotes de cria e crescimento',
                  'Controle de postura, engorda e peso coletivo',
                  'Gestão de chocadeira, incubatório e eclosão',
                  'Alertas de manejo, vacinação coletiva e ração',
                  'Relatórios completos de produção de ovos',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/85">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-amber-500/25 border border-amber-500/50">
                      <Check size={8} className="text-amber-400" />
                    </div>
                    <span className="leading-snug text-[11px]">{item}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleOpenCheckout('pro_monthly')}
                className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all text-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5"
              >
                <span>Assinar Mensal Completo</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* 3. ANUAL COMPLETO */}
            <div className="rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-5 relative overflow-hidden bg-gradient-to-b from-amber-500/[0.12] to-amber-500/[0.03] border-2 border-emerald-400/80 shadow-2xl shadow-emerald-500/10">
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-black bg-emerald-400 font-mono">
                21% OFF • MAIS VANTAJOSO
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 text-emerald-400">Anual Completo</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs line-through text-white/30">R$ 717,60</span>
                  <span className="text-sm font-black text-white/50">R$</span>
                  <span className="text-4xl sm:text-5xl font-black text-emerald-400 tracking-tighter leading-none">567</span>
                  <span className="text-base font-black text-white/50">,90</span>
                  <span className="text-xs font-bold text-white/40">/ano</span>
                </div>
                <p className="text-[10px] mt-1.5 flex items-center gap-1 font-bold text-emerald-300">
                  <Sparkles size={9} /> Equivale a R$ 47,32/mês (Economize R$ 149,70)
                </p>
              </div>

              <ul className="space-y-2.5 my-auto">
                {[
                  'Acesso total e irrestrito a todas as ferramentas',
                  'Aves, fotos, fichas técnicas e vitrine ilimitadas',
                  'Lotes e Gestão de Ovos completos inclusos',
                  'Parcelamento facilitado em até 12x no cartão',
                  'Economia de R$ 149,70 garantida no ano',
                  'Suporte prioritário VIP direto com o desenvolvedor',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white">
                    <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-emerald-500/25 border border-emerald-500/50">
                      <Check size={8} className="text-emerald-400" />
                    </div>
                    <span className="leading-snug text-[11px]">{item}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleOpenCheckout('yearly')}
                className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-black active:scale-95 transition-all mt-1 bg-gradient-to-r from-emerald-400 to-amber-400 hover:from-emerald-300 hover:to-amber-300 shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Assinar Anual Completo</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative py-6 px-6 border-t border-white/[0.08] z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img src={muraLogo} alt="" className="w-6 h-6 rounded object-cover opacity-50" />
            <span className="text-xs font-black tracking-widest uppercase text-white/30">MURA MANAGER</span>
          </div>
          <p className="text-[10px] font-medium text-white/20">© {new Date().getFullYear()} Mura Manager. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MODAIS TOTALMENTE DESACOPLADOS (0ms LATÊNCIA AO DIGITAR) */}
      {/* ══════════════════════════════════════════════════════ */}
      <LoginFormModal 
        isOpen={showLoginForm}
        onClose={() => setShowLoginForm(false)}
        onOpenRegister={() => {
          setShowLoginForm(false);
          setShowRegisterForm(true);
        }}
        onOpenForgot={(id) => {
          setShowLoginForm(false);
          setForgotInitialId(id);
          setShowForgotModal(true);
        }}
        signIn={signIn}
        isLocalMode={isLocalMode}
        biometricAvailable={biometricAvailable}
      />

      <RegisterFormModal
        isOpen={showRegisterForm}
        onClose={() => setShowRegisterForm(false)}
        onOpenLogin={() => {
          setShowRegisterForm(false);
          setShowLoginForm(true);
        }}
        signIn={signIn}
      />

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        onOpenLogin={() => {
          setShowForgotModal(false);
          setShowLoginForm(true);
        }}
        sendPasswordReset={sendPasswordReset}
        initialIdentifier={forgotInitialId}
      />

      <ResetPasswordModal
        isOpen={isPasswordRecovery}
        onClose={() => setIsPasswordRecovery(false)}
        updatePassword={updatePassword}
      />

      <LandingCheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        initialPlan={checkoutPlan}
        signIn={signIn}
      />

    </div>
  );
}
