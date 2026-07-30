import { useState, useRef, useEffect } from 'react';
import { 
  Activity, LogIn, Check, Sparkles, ShieldCheck, Layers, Dna,
  TrendingUp, History, Smartphone, Lock, User, Mail, X, Star, Fingerprint
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import localforage from 'localforage';
import muraLogo from '../assets/mura_logo.jpg';
import heroBg from '../assets/hero_bg.jpg';
import roosterImg from '../assets/rooster_sticker.png';
import {
  checkBiometricSupport,
  hasBiometricRegistered,
  registerBiometric,
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

export function Login() {
  const { signIn, signInWithGoogle, isLocalMode } = useAuth();
  const detailsRef = useRef<HTMLDivElement>(null);

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % carouselImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [regNome, setRegNome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // ── Estado biométrico ──
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  // Após login com senha com sucesso: oferece ativar biometria
  const [showBiometricOffer, setShowBiometricOffer] = useState(false);
  const [lastLoggedIdentifier, setLastLoggedIdentifier] = useState('');

  // Detecta suporte a biometria no dispositivo ao montar
  useEffect(() => {
    checkBiometricSupport().then(setBiometricAvailable);
  }, []);

  const formatCPF = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) { setLoginError('Preencha seu e-mail ou CPF.'); return; }
    if (!password.trim()) { setLoginError('Preencha sua senha.'); return; }
    setLoginError('');
    setLoginLoading(true);
    try {
      const { error } = await signIn(identifier, password);
      if (error) {
        setLoginError(error.message || 'Credenciais inválidas.');
      } else {
        // Login com senha bem-sucedido: oferecer ativar biometria se disponível e não registrada
        if (biometricAvailable && !hasBiometricRegistered()) {
          setLastLoggedIdentifier(identifier);
          setShowBiometricOffer(true);
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'Erro inesperado.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Login com Face ID / Biometria ──
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
      // Usa o userId salvo para fazer sign in silencioso
      // Como WebAuthn não retorna senha, usamos o identifier salvo como chave
      const { error } = await signIn(userId, '__biometric__');
      if (error) setBiometricError('Falha ao acessar a conta. Use sua senha.');
    } catch (err: any) {
      setBiometricError(err.message || 'Erro na autenticação biométrica.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleFreeRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = regEmail.trim().toLowerCase();
    if (!regNome.trim()) { setRegError('Informe seu nome completo.'); return; }
    if (!cleanEmail || !cleanEmail.includes('@')) { setRegError('Informe um e-mail válido.'); return; }
    if (regSenha.length < 6) { setRegError('A senha deve ter no mínimo 6 caracteres.'); return; }

    setRegError('');
    setRegLoading(true);

    const days = 7;
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const tempCpf = Math.floor(10000000000 + Math.random() * 90000000000).toString();

    try {
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

  /* ── INPUT STYLES ────────────────── */
  const inputCls = "w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:border-amber-500/40 focus:outline-none transition-colors";

  return (
    <div className="h-screen w-full overflow-y-auto overflow-x-hidden bg-[#0a0a0b] text-white font-sans pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),16px)] pl-[max(env(safe-area-inset-left),12px)] pr-[max(env(safe-area-inset-right),12px)] box-border">

      {/* ── BACKGROUND (GPU-composited, no CPU blur) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
          /* Force GPU layer */ transform: 'translateZ(0)', willChange: 'transform',
        }}
      >
        {/* Hero photo — pre-baked, no runtime blur */}
        <img
          src={heroBg}
          alt=""
          fetchPriority="high"
          decoding="async"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, willChange: 'transform' }}
        />

        {/* Static gradient mesh — zero CSS filter, GPU composited via opacity */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(245,158,11,0.11) 0%, transparent 60%), radial-gradient(ellipse 55% 70% at 85% 50%, rgba(22,101,52,0.07) 0%, transparent 55%)',
          opacity: 1,
        }} />

        {/* Noise grain — pre-rendered SVG, one-time paint, no repaint */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'300\' height=\'300\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.75\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'300\' height=\'300\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '300px 300px',
        }} />

        {/* Subtle grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />
      </div>

      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(10,10,11,0.88)',
          /* Backdrop apenas nessa camada — GPU-composited */
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          transform: 'translateZ(0)', willChange: 'transform',
        }}
        className="px-6 py-3 flex justify-between items-center"
      >
        <div className="flex items-center gap-3">
          <img src={muraLogo} alt="Mura Manager" className="w-9 h-9 rounded-lg object-cover" style={{ border: '1px solid rgba(245,158,11,0.2)' }} />
          <div className="leading-none">
            <p className="text-sm font-black tracking-[0.2em] uppercase text-white">MURA</p>
            <p className="text-[9px] font-bold tracking-[0.3em] uppercase" style={{ color: 'rgba(245,158,11,0.7)' }}>MANAGER</p>
          </div>
        </div>

        <div className="hidden sm:flex gap-6 text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>
          <button onClick={() => detailsRef.current?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Recursos</button>
          <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Planos</button>
        </div>

        <button
          onClick={() => { setShowLoginForm(true); setLoginError(''); }}
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-black rounded-full active:scale-95 transition-transform"
          style={{ background: '#f59e0b', boxShadow: '0 0 18px rgba(245,158,11,0.3)' }}
        >
          <LogIn size={12} /> Entrar
        </button>
      </nav>

      {/* ── HERO ── */}
      <section
        className="relative flex flex-col justify-center items-center text-center py-20 px-6 max-w-4xl mx-auto"
        style={{ zIndex: 3, minHeight: '88vh', overflow: 'hidden' }}
      >
        {/*
         * GALO: posicionado como no site de referência — absolute, canto inferior
         * esquerdo, dentro da section do hero. Fica confinado apenas à 1ª dobra.
         * mix-blend-mode:screen torna o fundo preto da imagem 100% transparente.
         * A máscara suaviza o topo e a borda direita para fusão natural.
         */}
        <img
          src={roosterImg}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            /* altura = 90% da section para emergir de baixo como no exemplo */
            height: '90%',
            width: 'auto',
            maxWidth: 'clamp(220px, 30vw, 420px)',
            objectFit: 'contain',
            /* Imagem agora possui transparência real (.png) */
            opacity: 0.85,
            /* Fade no topo e na borda direita para integração natural */
            WebkitMaskImage:
              'linear-gradient(to top, black 50%, rgba(0,0,0,0.7) 75%, transparent 100%), linear-gradient(to right, black 55%, rgba(0,0,0,0.4) 80%, transparent 100%)',
            maskImage:
              'linear-gradient(to top, black 50%, rgba(0,0,0,0.7) 75%, transparent 100%), linear-gradient(to right, black 55%, rgba(0,0,0,0.4) 80%, transparent 100%)',
            zIndex: 0,
            pointerEvents: 'none',
            transform: 'translateZ(0)',
            willChange: 'transform',
          }}
        />
        {/* Scrim radial escuro centrado — garante legibilidade dos textos sobre o galo */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            /* Gradiente radial escuro atrás do bloco de texto central */
            background: 'radial-gradient(ellipse 70% 80% at 55% 45%, rgba(0,0,0,0.55) 0%, transparent 75%)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        {/* Badge */}
        <div
          className="mb-7 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase animate-fade-in-up opacity-0"
          style={{
            border: '1px solid rgba(245,158,11,0.25)',
            background: 'rgba(10,10,11,0.55)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: '#f59e0b',
            animationFillMode: 'forwards',
            position: 'relative', zIndex: 1,
          }}
        >
          <Star size={9} fill="currentColor" /> A gestão que seu criatório merece <Star size={9} fill="currentColor" />
        </div>

        {/* Logo flutuante */}
        <div className="mb-7 animate-float opacity-0 animate-fade-in-up delay-100" style={{ animationFillMode: 'forwards', position: 'relative', zIndex: 1 }}>
          <img src={muraLogo} alt="Mura Manager" className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover"
            style={{ border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 0 50px rgba(245,158,11,0.12), 0 20px 50px rgba(0,0,0,0.5)' }} />
        </div>

        {/* Headline */}
        <h1
          className="text-4xl sm:text-6xl font-black tracking-tight leading-[0.9] opacity-0 animate-fade-in-up delay-200 text-white"
          style={{
            animationFillMode: 'forwards',
            position: 'relative', zIndex: 1,
            /* text-shadow duplo: sombra escura próxima + glow difuso — garante leitura sobre o galo */
            textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 4px 24px rgba(0,0,0,0.7), 0 0 60px rgba(0,0,0,0.5)',
          }}
        >
          Gestão de<br />Criatórios de Elite.
        </h1>

        <p
          className="mt-5 text-sm max-w-lg leading-relaxed font-semibold opacity-0 animate-fade-in-up delay-300"
          style={{
            animationFillMode: 'forwards',
            position: 'relative', zIndex: 1,
            color: 'rgba(255,255,255,0.75)',
            textShadow: '0 1px 3px rgba(0,0,0,0.95), 0 2px 12px rgba(0,0,0,0.8)',
          }}
        >
          Cadastre mais de 20 mil aves e tenha o controle completo sobre o seu plantel, nível de parentesco e gestão inteligente de lotes de postura e engorda.
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-col sm:flex-row gap-3 items-center opacity-0 animate-fade-in-up delay-400" style={{ animationFillMode: 'forwards', position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => { setShowRegisterForm(true); setShowLoginForm(false); setRegError(''); }}
            className="px-7 py-3.5 text-xs font-black uppercase tracking-widest text-black rounded-2xl active:scale-95 transition-transform flex items-center gap-2"
            style={{ background: '#f59e0b', boxShadow: '0 0 28px rgba(245,158,11,0.35)' }}
          >
            <Sparkles size={13} /> Criar Conta
          </button>

          <button
            onClick={() => { setShowLoginForm(true); setShowRegisterForm(false); setLoginError(''); }}
            className="px-7 py-3.5 text-xs font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-colors flex items-center gap-2"
            style={{
              color: '#f59e0b',
              border: '1px solid rgba(245,158,11,0.22)',
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <LogIn size={13} /> Acesse sua Conta
          </button>
        </div>

        {/* Stats */}
        <div
          className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 opacity-0 animate-fade-in-up delay-500"
          style={{ animationFillMode: 'forwards', position: 'relative', zIndex: 1 }}
        >
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className="text-2xl font-black text-white"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.7)' }}
              >
                {s.value}
              </span>
              <span
                className="text-[10px] uppercase tracking-widest font-bold"
                style={{
                  color: 'rgba(255,255,255,0.6)',
                  textShadow: '0 1px 3px rgba(0,0,0,0.95)',
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── CARROSSEL DE APRESENTAÇÃO DO APP ── */}
        <div className="mt-12 w-full max-w-md mx-auto opacity-0 animate-fade-in-up delay-500" style={{ animationFillMode: 'forwards', position: 'relative', zIndex: 2 }}>
          <div className="relative rounded-[32px] overflow-hidden border-[4px] border-white/20 bg-[#0a0a0b] shadow-2xl shadow-amber-500/10 group aspect-[497/755] max-w-[360px] mx-auto">
            {carouselImages.map((img, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <img src={img.src} alt={img.title} className="w-full h-full object-contain bg-[#0a0a0b]" />
              </div>
            ))}

            {/* Setas de Navegação */}
            <button
              type="button"
              onClick={() => setActiveSlide(prev => (prev - 1 + carouselImages.length) % carouselImages.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-amber-500 hover:text-black hover:border-amber-500 transition-all opacity-60 group-hover:opacity-100 shadow-lg text-xs"
            >
              ❮
            </button>
            <button
              type="button"
              onClick={() => setActiveSlide(prev => (prev + 1) % carouselImages.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/70 border border-white/20 text-white flex items-center justify-center hover:bg-amber-500 hover:text-black hover:border-amber-500 transition-all opacity-60 group-hover:opacity-100 shadow-lg text-xs"
            >
              ❯
            </button>
          </div>

          {/* Legenda do Slide */}
          <div className="mt-4 text-center px-4">
            <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest">
              {carouselImages[activeSlide].title}
            </h4>
            <p className="text-[11px] text-white/60 mt-1 max-w-md mx-auto">
              {carouselImages[activeSlide].desc}
            </p>
          </div>

          {/* Indicadores (Dots) */}
          <div className="mt-3 flex justify-center gap-2">
            {carouselImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeSlide ? 'bg-amber-500 w-7' : 'bg-white/20 w-1.5'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 opacity-20" style={{ zIndex: 1 }}>
          <div style={{ width: 1, height: 36, background: 'linear-gradient(to bottom, transparent, #f59e0b, transparent)' }} className="animate-pulse" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section ref={detailsRef} className="relative py-24 px-6 mx-auto max-w-5xl" style={{ zIndex: 3 }}>
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#f59e0b' }}>Plataforma Completa</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">Tudo que seu criatório<br />precisa em um só lugar</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div key={i}
                className="rounded-2xl p-5 flex flex-col gap-3 transition-colors duration-200 cursor-default"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${f.accent}30`; (e.currentTarget as HTMLElement).style.background = `rgba(255,255,255,0.05)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${f.accent}15`, border: `1px solid ${f.accent}25` }}>
                  <f.icon size={18} style={{ color: f.accent }} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white mb-1">{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="relative py-24 px-6 mx-auto max-w-4xl" style={{ zIndex: 3 }}>
        <div className="max-w-3xl mx-auto">
          <div className="mb-12 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: '#f59e0b' }}>Planos e Preços</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Escolha seu plano</h2>
            <p className="text-sm font-bold text-theme-primary mt-1">Experimente Grátis por 7 dias — Sem compromisso e sem precisar cadastrar cartão!</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* MENSAL */}
            <div className="rounded-2xl p-7 flex flex-col gap-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Mensal</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs line-through" style={{ color: 'rgba(255,255,255,0.3)' }}>R$ 49,90</span>
                  <span className="text-base font-black" style={{ color: 'rgba(255,255,255,0.5)' }}>R$</span>
                  <span className="text-5xl font-black text-white tracking-tighter leading-none">19</span>
                  <span className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.5)' }}>,90</span>
                  <span className="text-xs font-bold ml-1" style={{ color: 'rgba(255,255,255,0.25)' }}>/mês</span>
                </div>
                <p className="text-[10px] mt-1 flex items-center gap-1 font-bold text-theme-primary">
                  <Sparkles size={9} /> Economia de 60% no lançamento
                </p>
              </div>
              <ul className="space-y-2.5">
                {['Aves e lotes ilimitados','Árvore genealógica','Sincronização em nuvem','Backup automático','Suporte prioritário'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
                      <Check size={9} style={{ color: '#f59e0b' }} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setShowRegisterForm(true); setShowLoginForm(false); setRegError(''); }}
                className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                Criar Conta
              </button>
            </div>

            {/* ANUAL */}
            <div className="rounded-2xl p-7 flex flex-col gap-6 relative overflow-hidden" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', boxShadow: '0 0 50px rgba(245,158,11,0.06)' }}>
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-black" style={{ background: '#f59e0b' }}>
                Melhor Valor
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(245,158,11,0.7)' }}>Anual</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs line-through" style={{ color: 'rgba(255,255,255,0.3)' }}>R$ 399,90</span>
                  <span className="text-base font-black" style={{ color: 'rgba(255,255,255,0.5)' }}>R$</span>
                  <span className="text-5xl font-black text-theme-primary tracking-tighter leading-none">199</span>
                  <span className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.5)' }}>,90</span>
                  <span className="text-xs font-bold ml-1" style={{ color: 'rgba(255,255,255,0.25)' }}>/ano</span>
                </div>
                <p className="text-[10px] mt-1 flex items-center gap-1 font-bold text-emerald-400">
                  <Sparkles size={9} /> Super desconto promocional de lançamento
                </p>
              </div>
              <ul className="space-y-2.5">
                {['Tudo do plano mensal','Acesso imediato de 7 dias grátis','Acesso antecipado a novos recursos','Notificações inteligentes','Relatório anual de desempenho'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.4)' }}>
                      <Check size={9} style={{ color: '#f59e0b' }} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setShowRegisterForm(true); setShowLoginForm(false); setRegError(''); }}
                className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-black active:scale-95 transition-transform"
                style={{ background: '#f59e0b', boxShadow: '0 0 24px rgba(245,158,11,0.25)' }}
              >
                Ativar 7 Dias Grátis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative py-8 px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)', zIndex: 3 }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <img src={muraLogo} alt="" className="w-6 h-6 rounded object-cover opacity-50" />
            <span className="text-xs font-black tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>MURA MANAGER</span>
          </div>
          <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.18)' }}>© {new Date().getFullYear()} Mura Manager. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MODAL LOGIN                                           */}
      {/* ══════════════════════════════════════════════════════ */}
      {showLoginForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-up" style={{ background: 'rgba(18,18,20,0.98)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <div className="px-7 pt-7 pb-5 border-b flex justify-between items-center" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3">
                <img src={muraLogo} alt="" className="w-9 h-9 rounded-xl object-cover" style={{ border: '1px solid rgba(245,158,11,0.2)' }} />
                <div>
                  <h3 className="font-black text-sm text-white">Acesse sua Conta</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Bem-vindo ao Mura Manager</p>
                </div>
              </div>
              <button onClick={() => setShowLoginForm(false)} className="p-1 transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleLoginSubmit} className="px-7 py-6 space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl text-xs font-bold text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  {loginError}
                </div>
              )}

              {/* Botão de Login por Biometria (Face ID / Impressao Digital) */}
              {biometricAvailable && hasBiometricRegistered() && (
                <div className="space-y-2">
                  {biometricError && (
                    <div className="p-2.5 rounded-xl text-xs font-bold text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                      {biometricError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleBiometricLogin}
                    disabled={biometricLoading}
                    className="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 active:scale-95 transition-all disabled:opacity-60"
                    style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', boxShadow: '0 0 18px rgba(245,158,11,0.08)' }}
                  >
                    {biometricLoading
                      ? <Activity size={15} className="animate-spin" />
                      : <Fingerprint size={16} />}
                    <span>{biometricLoading ? 'Verificando...' : 'Entrar com Face ID / Biometria'}</span>
                  </button>
                </div>
              )}

              {/* Botão de Login Social */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={async () => {
                    const { error } = await signInWithGoogle();
                    if (error) setLoginError(error.message || 'Erro ao entrar com o Google.');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-white text-gray-900 font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-100 active:scale-95 transition-all shadow-md"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Entrar com o Google</span>
                </button>
              </div>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>ou e-mail / CPF</span>
                <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>E-mail ou CPF</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <input type="text" required placeholder="email@exemplo.com ou CPF" value={identifier}
                    onChange={e => { const v = e.target.value; setIdentifier(v.includes('@') || /[a-zA-Z]/.test(v) ? v : formatCPF(v)); }}
                    className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className={inputCls} />
                </div>
              </div>
              <button type="submit" disabled={loginLoading}
                className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-black active:scale-95 disabled:opacity-50 transition-transform flex items-center justify-center gap-2 mt-1"
                style={{ background: '#f59e0b', boxShadow: '0 0 22px rgba(245,158,11,0.22)' }}>
                {loginLoading ? <Activity size={15} className="animate-spin" /> : <><LogIn size={14} /> Entrar na Plataforma</>}
              </button>
              
              <div className="pt-3 text-center border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <button
                  type="button"
                  onClick={() => { setShowLoginForm(false); setShowRegisterForm(true); setRegError(''); }}
                  className="text-xs text-theme-text-muted hover:text-white transition-colors"
                >
                  Ainda não tem conta? <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Cadastre-se grátis por 7 dias</span>
                </button>
              </div>

              {isLocalMode && (
                <div className="p-2 rounded-lg text-[9px] text-center" style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.1)', color: 'rgba(253,186,116,0.35)' }}>
                  Modo Offline · Admin: 14477751630
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* MODAL CADASTRO GRÁTIS DE 7 DIAS                       */}
      {/* ══════════════════════════════════════════════════════ */}
      {showRegisterForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-up" style={{ background: 'rgba(18,18,20,0.98)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <div className="px-7 pt-7 pb-5 border-b flex justify-between items-center" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Sparkles size={16} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white font-serif">Tenha todo acesso por 7 dias gratuitos.</h3>
                </div>
              </div>
              <button onClick={() => setShowRegisterForm(false)} className="p-1 transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleFreeRegisterSubmit} className="px-7 py-6 space-y-4">
              {regError && (
                <div className="p-3 rounded-xl text-xs font-bold text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  {regError}
                </div>
              )}

              {/* Botões de Cadastro Social */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={async () => {
                    const { error } = await signInWithGoogle();
                    if (error) setRegError(error.message || 'Erro ao cadastrar com o Google.');
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-white text-gray-900 font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-100 active:scale-95 transition-all shadow-md"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Cadastrar com o Google</span>
                </button>
              </div>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)' }}>ou preencha os dados</span>
                <div className="flex-1 h-[1px]" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <input type="text" required placeholder="Seu nome ou nome do criatório" value={regNome} onChange={e => setRegNome(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <input type="email" required placeholder="seuemail@exemplo.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Senha de Acesso</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <input type="password" required placeholder="Mínimo 6 caracteres" value={regSenha} onChange={e => setRegSenha(e.target.value)} className={inputCls} />
                </div>
              </div>
              <button type="submit" disabled={regLoading}
                className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-black active:scale-95 disabled:opacity-50 transition-transform flex items-center justify-center gap-2 mt-2"
                style={{ background: '#f59e0b', boxShadow: '0 0 22px rgba(245,158,11,0.22)' }}>
                {regLoading ? <Activity size={15} className="animate-spin" /> : <><Sparkles size={14} /> Criar Minha Conta Grátis e Entrar</>}
              </button>
              <div className="pt-3 text-center border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <button
                  type="button"
                  onClick={() => { setShowRegisterForm(false); setShowLoginForm(true); setLoginError(''); }}
                  className="text-xs text-theme-text-muted hover:text-white transition-colors"
                >
                  Já possui uma conta? <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>Acessar Conta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════ */}
      {/* MODAL OFERTA DE ATIVAR BIOMETRIA (pós-login com senha) */}
      {/* ══════════════════════════════════════════════════════ */}
      {showBiometricOffer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-scale-up" style={{ background: 'rgba(18,18,20,0.98)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="p-7 space-y-5">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <Fingerprint size={32} style={{ color: '#f59e0b' }} />
                </div>
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-black text-white">Ativar Face ID / Biometria?</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Nos próximos acessos, entre com apenas um toque — sem precisar digitar e-mail e senha.
                  {typeof window !== 'undefined' && /iPhone|iPad|Mac/i.test(navigator.userAgent)
                    ? ' Usa Face ID ou Touch ID do seu dispositivo Apple.'
                    : ' Usa impressão digital ou desbloqueio facial do seu Android.'}
                </p>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={async () => {
                    const ok = await registerBiometric(lastLoggedIdentifier);
                    setShowBiometricOffer(false);
                    if (!ok) setBiometricError('Não foi possível registrar a biometria. Tente novamente mais tarde.');
                  }}
                  className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-black active:scale-95 transition-transform flex items-center justify-center gap-2"
                  style={{ background: '#f59e0b', boxShadow: '0 0 22px rgba(245,158,11,0.22)' }}
                >
                  <Fingerprint size={15} /> Ativar Agora
                </button>
                <button
                  onClick={() => setShowBiometricOffer(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'; }}
                >
                  Agora não
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
