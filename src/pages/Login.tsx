import { useState, useRef } from 'react';
import { 
  Activity, LogIn, Check, Sparkles, ShieldCheck, Layers, Dna,
  TrendingUp, History, Smartphone, ArrowDown, CreditCard, QrCode,
  Clipboard, Lock, User, Mail, FileText, X, ChevronRight, AlertTriangle, Star
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import localforage from 'localforage';
import muraLogo from '../assets/mura_logo.jpg';
import heroBg from '../assets/hero_bg.jpg';
import roosterImg from '../assets/rooster_sticker.jpg';

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
  const { signIn, isLocalMode } = useAuth();
  const detailsRef = useRef<HTMLDivElement>(null);

  const [showLoginForm, setShowLoginForm] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'anual' | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'payment' | 'success'>('form');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

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
      if (error) setLoginError(error.message || 'Credenciais inválidas.');
    } catch (err: any) {
      setLoginError(err.message || 'Erro inesperado.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!nome.trim()) { setCheckoutError('Informe seu nome.'); return; }
    if (!email.includes('@')) { setCheckoutError('E-mail inválido.'); return; }
    if (cleanCpf.length !== 11) { setCheckoutError('CPF inválido.'); return; }
    if (senha.length < 6) { setCheckoutError('Senha deve ter mínimo 6 caracteres.'); return; }
    setCheckoutError('');
    setCheckoutStep('payment');
  };

  const handleConfirmPayment = async () => {
    setCheckoutLoading(true);
    setCheckoutError('');
    const cleanCpf = cpf.replace(/\D/g, '');
    const days = selectedPlan === 'anual' ? 365 : 30;
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
    try {
      if (isSupabaseConfigured) {
        const { error: insertErr } = await supabase!.from('allowed_cpfs').insert({ cpf: cleanCpf, email: email.trim().toLowerCase(), senha, expires_at: expiresAt });
        if (insertErr) {
          const list = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
          list.push({ cpf: cleanCpf, email: email.trim().toLowerCase(), senha, expires_at: expiresAt });
          await localforage.setItem('@mura-manager:local-allowed-cpfs', list);
        }
        await supabase!.auth.signUp({ email: email.trim().toLowerCase(), password: senha });
      } else {
        const list = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
        list.push({ cpf: cleanCpf, email: email.trim().toLowerCase(), senha, expires_at: expiresAt });
        await localforage.setItem('@mura-manager:local-allowed-cpfs', list);
      }
      setCheckoutStep('success');
    } catch (err: any) {
      setCheckoutError(err.message || 'Erro ao processar.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleAutoLogin = async () => {
    setLoginLoading(true);
    try { await signIn(email, senha); } catch { setShowLoginForm(true); setSelectedPlan(null); } finally { setLoginLoading(false); }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText('00020126580014BR.GOV.BCB.PIX013600000000000000000000000000005204000053039865802BR5912MURA_MANAGER6009SAO_PAULO62070503***6304E21A');
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  /* ── INPUT STYLES ────────────────── */
  const inputCls = "w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:border-amber-500/40 focus:outline-none transition-colors";

  return (
    <div className="h-screen w-full overflow-y-auto overflow-x-hidden bg-[#0a0a0b] text-white font-sans">

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

        {/* ── GALO INTEGRADO AO FUNDO (GPU layer, sticker overlay effect) ── */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 'clamp(280px, 35vw, 480px)',
            display: 'flex',
            alignItems: 'stretch',
            /* GPU compositing */
            transform: 'translateZ(0)',
            willChange: 'transform',
          }}
        >
          <img
            src={roosterImg}
            alt="Galo Mura Manager"
            fetchPriority="high"
            decoding="async"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center top',
              /* mix-blend-mode screen remove o fundo preto da imagem perfeitamente */
              mixBlendMode: 'screen',
              opacity: 0.75,
              /* Máscara de fade para integrar o galo ao fundo escuro */
              WebkitMaskImage: 'linear-gradient(to right, black 40%, rgba(0,0,0,0.3) 75%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
              maskImage: 'linear-gradient(to right, black 40%, rgba(0,0,0,0.3) 75%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 10%, black 90%, transparent 100%)',
            }}
          />
        </div>

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
        style={{ zIndex: 3, minHeight: '88vh' }}
      >
        {/* Badge */}
        <div className="mb-7 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase animate-fade-in-up opacity-0" style={{ border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.06)', color: '#f59e0b', animationFillMode: 'forwards' }}>
          <Star size={9} fill="currentColor" /> A gestão que seu criatório merece <Star size={9} fill="currentColor" />
        </div>

        {/* Logo flutuante */}
        <div className="mb-7 animate-float opacity-0 animate-fade-in-up delay-100" style={{ animationFillMode: 'forwards' }}>
          <img src={muraLogo} alt="Mura Manager" className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover"
            style={{ border: '1px solid rgba(245,158,11,0.2)', boxShadow: '0 0 50px rgba(245,158,11,0.12), 0 20px 50px rgba(0,0,0,0.5)' }} />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[0.9] opacity-0 animate-fade-in-up delay-200" style={{ animationFillMode: 'forwards' }}>
          Gestão de<br /><span className="text-shimmer">Criatórios de Elite.</span>
        </h1>

        <p className="mt-5 text-sm text-white/45 max-w-sm leading-relaxed font-medium opacity-0 animate-fade-in-up delay-300" style={{ animationFillMode: 'forwards' }}>
          Genética, lotes, postura e baixas — em uma plataforma sincronizada para Android, iOS e computador.
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-col sm:flex-row gap-3 items-center opacity-0 animate-fade-in-up delay-400" style={{ animationFillMode: 'forwards' }}>
          <button
            onClick={() => { setShowLoginForm(true); setLoginError(''); }}
            className="px-7 py-3.5 text-xs font-black uppercase tracking-widest text-black rounded-2xl active:scale-95 transition-transform flex items-center gap-2"
            style={{ background: '#f59e0b', boxShadow: '0 0 28px rgba(245,158,11,0.35)' }}
          >
            <LogIn size={13} /> Acesse sua Conta
          </button>

          <button
            onClick={() => detailsRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="px-7 py-3.5 text-xs font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-colors flex items-center gap-2"
            style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.22)' }}
          >
            Ver Recursos <ArrowDown size={12} />
          </button>
        </div>

        {/* Stats */}
        <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 opacity-0 animate-fade-in-up delay-500" style={{ animationFillMode: 'forwards' }}>
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-black text-white">{s.value}</span>
              <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 opacity-20">
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
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Sem taxas ocultas. Cancele quando quiser.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* MENSAL */}
            <div className="rounded-2xl p-7 flex flex-col gap-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Mensal</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black" style={{ color: 'rgba(255,255,255,0.5)' }}>R$</span>
                  <span className="text-5xl font-black text-white tracking-tighter leading-none">59</span>
                  <span className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.5)' }}>,90</span>
                  <span className="text-xs font-bold ml-1" style={{ color: 'rgba(255,255,255,0.25)' }}>/mês</span>
                </div>
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
                onClick={() => { setSelectedPlan('mensal'); setCheckoutStep('form'); setCheckoutError(''); }}
                className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                style={{ color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                Começar Agora
              </button>
            </div>

            {/* ANUAL */}
            <div className="rounded-2xl p-7 flex flex-col gap-6 relative overflow-hidden" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', boxShadow: '0 0 50px rgba(245,158,11,0.06)' }}>
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-black" style={{ background: '#f59e0b' }}>
                Recomendado
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(245,158,11,0.7)' }}>Anual</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black" style={{ color: 'rgba(255,255,255,0.5)' }}>R$</span>
                  <span className="text-5xl font-black text-white tracking-tighter leading-none">639</span>
                  <span className="text-lg font-black" style={{ color: 'rgba(255,255,255,0.5)' }}>,90</span>
                  <span className="text-xs font-bold ml-1" style={{ color: 'rgba(255,255,255,0.25)' }}>/ano</span>
                </div>
                <p className="text-[10px] mt-1 flex items-center gap-1 font-bold" style={{ color: 'rgba(245,158,11,0.6)' }}>
                  <Sparkles size={9} /> Economize R$ 78,90
                </p>
              </div>
              <ul className="space-y-2.5">
                {['Tudo do plano mensal','1 mês grátis incluso','Acesso antecipado a novos recursos','Notificações inteligentes','Relatório anual de desempenho'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.4)' }}>
                      <Check size={9} style={{ color: '#f59e0b' }} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setSelectedPlan('anual'); setCheckoutStep('form'); setCheckoutError(''); }}
                className="w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-black active:scale-95 transition-transform"
                style={{ background: '#f59e0b', boxShadow: '0 0 24px rgba(245,158,11,0.25)' }}
              >
                Assinar Plano Anual
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
      {/* MODAL CHECKOUT                                        */}
      {/* ══════════════════════════════════════════════════════ */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scale-up" style={{ background: 'rgba(18,18,20,0.98)', border: '1px solid rgba(255,255,255,0.09)' }}>
            {/* Header */}
            <div className="px-7 pt-7 pb-5 border-b flex justify-between items-center shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <Sparkles size={16} style={{ color: '#f59e0b' }} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Assinar Mura Manager</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Plano <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{selectedPlan === 'anual' ? 'Anual' : 'Mensal'}</span> · R$ {selectedPlan === 'anual' ? '639,90/ano' : '59,90/mês'}
                  </p>
                </div>
              </div>
              {checkoutStep !== 'success' && (
                <button onClick={() => setSelectedPlan(null)} className="p-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-6 space-y-5">
              {checkoutError && (
                <div className="p-3 rounded-xl text-xs font-bold text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  {checkoutError}
                </div>
              )}

              {/* FORM */}
              {checkoutStep === 'form' && (
                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Nome Completo</label>
                    <div className="relative"><User className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      <input type="text" required placeholder="João da Silva" value={nome} onChange={e => setNome(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>E-mail</label>
                      <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                        <input type="email" required placeholder="email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>CPF</label>
                      <div className="relative"><FileText className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                        <input type="text" required placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} className={inputCls} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Senha da Plataforma</label>
                    <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2" size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      <input type="password" required placeholder="Mínimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-black active:scale-95 transition-transform flex items-center justify-center gap-2"
                    style={{ background: '#f59e0b', boxShadow: '0 0 22px rgba(245,158,11,0.2)' }}>
                    Prosseguir para o Pagamento <ChevronRight size={13} />
                  </button>
                </form>
              )}

              {/* PAYMENT */}
              {checkoutStep === 'payment' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {(['pix','card'] as const).map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)}
                        className="flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                        style={paymentMethod === m ? { background: '#f59e0b', color: 'black' } : { color: 'rgba(255,255,255,0.35)' }}>
                        {m === 'pix' ? <><QrCode size={13}/> Pix</> : <><CreditCard size={13}/> Cartão</>}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'pix' ? (
                    <div className="flex flex-col items-center gap-4 animate-fade-in">
                      <div className="p-3 bg-white rounded-2xl shadow-lg">
                        <div className="w-32 h-32 relative flex items-center justify-center bg-gray-50">
                          <QrCode size={104} className="text-gray-900" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[8px] font-black tracking-wider px-1.5 py-0.5 rounded text-black" style={{ background: '#f59e0b' }}>MURA</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)', color: 'rgba(245,158,11,0.65)' }}>
                        <AlertTriangle size={11}/> Aviso 3 dias antes do vencimento por Pix
                      </div>
                      <button onClick={copyPixCode}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-colors"
                        style={copiedPix ? { background: '#10b981', color: 'white' } : { border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b' }}>
                        <Clipboard size={13}/> {copiedPix ? 'Código Copiado!' : 'Copiar Código Pix'}
                      </button>
                      <div className="w-full border-t pt-4 flex justify-between items-center" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                        <button onClick={() => setCheckoutStep('form')} className="text-xs font-bold transition-colors" style={{ color: 'rgba(255,255,255,0.3)' }}>← Voltar</button>
                        <button onClick={handleConfirmPayment} disabled={checkoutLoading}
                          className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-black active:scale-95 disabled:opacity-50 transition-transform flex items-center gap-2"
                          style={{ background: '#f59e0b' }}>
                          {checkoutLoading ? <Activity size={13} className="animate-spin"/> : <><Check size={13}/> Confirmar</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={e => { e.preventDefault(); handleConfirmPayment(); }} className="space-y-4 animate-fade-in">
                      {[
                        { label: 'Número do Cartão', placeholder: '0000 0000 0000 0000', value: cardNumber, onChange: (e: any) => setCardNumber(e.target.value.replace(/\D/g,'').slice(0,16).replace(/(\d{4})/g,'$1 ').trim()) },
                        { label: 'Nome no Cartão', placeholder: 'NOME NO CARTÃO', value: cardName, onChange: (e: any) => setCardName(e.target.value.toUpperCase()) },
                      ].map(f => (
                        <div key={f.label} className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.label}</label>
                          <input type="text" required placeholder={f.placeholder} value={f.value} onChange={f.onChange}
                            className="w-full rounded-xl py-3.5 px-4 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Validade</label>
                          <input type="text" required placeholder="MM/AA" value={cardExpiry}
                            onChange={e => { let v = e.target.value.replace(/\D/g,'').slice(0,4); if (v.length > 2) v = `${v.slice(0,2)}/${v.slice(2)}`; setCardExpiry(v); }}
                            className="w-full rounded-xl py-3.5 px-4 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>CVV</label>
                          <input type="text" required placeholder="000" value={cardCVV}
                            onChange={e => setCardCVV(e.target.value.replace(/\D/g,'').slice(0,3))}
                            className="w-full rounded-xl py-3.5 px-4 text-sm text-white placeholder-white/20 focus:outline-none transition-colors"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                        </div>
                      </div>
                      <p className="text-center text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>🔒 Cobrança automática todo {selectedPlan === 'anual' ? 'ano' : 'mês'}.</p>
                      <div className="border-t pt-4 flex justify-between items-center" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                        <button type="button" onClick={() => setCheckoutStep('form')} className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>← Voltar</button>
                        <button type="submit" disabled={checkoutLoading}
                          className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-black active:scale-95 disabled:opacity-50 transition-transform flex items-center gap-2"
                          style={{ background: '#f59e0b' }}>
                          {checkoutLoading ? <Activity size={13} className="animate-spin"/> : <><Check size={13}/> Ativar Assinatura</>}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* SUCCESS */}
              {checkoutStep === 'success' && (
                <div className="flex flex-col items-center text-center gap-5 py-6 animate-scale-up">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.4)', color: '#10b981' }}>
                    <Check size={26}/>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white mb-1.5">Assinatura Ativada!</h4>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Parabéns, {nome.split(' ')[0]}! Sua conta está pronta.</p>
                  </div>
                  <div className="w-full max-w-xs rounded-2xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {[['Identificador', cpf], ['Senha', '••••••']].map(([k,v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>{k}</span>
                        <span className="text-white font-mono">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 'bold' }}>Validade</span>
                      <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{new Date(Date.now() + (selectedPlan === 'anual' ? 365 : 30) * 86400000).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <button onClick={handleAutoLogin} disabled={loginLoading}
                    className="px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-black active:scale-95 disabled:opacity-50 transition-transform flex items-center gap-2"
                    style={{ background: '#f59e0b', boxShadow: '0 0 22px rgba(245,158,11,0.25)' }}>
                    {loginLoading ? <Activity size={15} className="animate-spin"/> : <><LogIn size={14}/> Entrar na Plataforma</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
