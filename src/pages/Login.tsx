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

/* ── STATS ANIMADOS ─────────────────────────────────────── */
const stats = [
  { value: '12k+', label: 'Aves Gerenciadas' },
  { value: '380+', label: 'Criadores Ativos' },
  { value: '99.8%', label: 'Uptime na Nuvem' },
  { value: '4.9★', label: 'Avaliação Média' },
];

/* ── FEATURES ────────────────────────────────────────────── */
const features = [
  { icon: Dna, title: 'Controle Genético Completo', desc: 'Forme casais de puro sangue ou híbridos, monitore cruzamentos e visualize a árvore genealógica, evitando consanguinidade indesejada.', color: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/20' },
  { icon: Layers, title: 'Gestão Inteligente de Lotes', desc: 'Lotes de postura com coleta diária automatizada e lotes de engorda com transição ágil de status, peso e terminação.', color: 'from-emerald-500/15 to-emerald-500/5', border: 'border-emerald-500/15' },
  { icon: History, title: 'Histórico de Baixas e Perdas', desc: 'Gerencie saídas por venda ou falecimento. Analise a taxa de mortalidade e mantenha relatórios limpos do plantel ativo.', color: 'from-rose-500/15 to-rose-500/5', border: 'border-rose-500/15' },
  { icon: Smartphone, title: 'Multi-Dispositivo Real', desc: 'Ultra-rápido no Android, iOS, tablet e PC. Sincronização instantânea em tempo real entre todos os seus aparelhos.', color: 'from-blue-500/15 to-blue-500/5', border: 'border-blue-500/15' },
  { icon: TrendingUp, title: 'Alertas de Postura e Previsões', desc: 'Acompanhe a produção real contra a meta teórica baseada em 85% de postura. Projeções e gráficos de rendimento do criatório.', color: 'from-violet-500/15 to-violet-500/5', border: 'border-violet-500/15' },
  { icon: ShieldCheck, title: 'Assinatura Inteligente e Segura', desc: 'Cobrança automática no cartão ou notificações Pix 3 dias antes do vencimento. Zero perda de acesso aos seus dados genéticos.', color: 'from-amber-500/15 to-amber-500/5', border: 'border-amber-500/15' },
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
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) { setLoginError('Preencha seu e-mail ou CPF.'); return; }
    if (!password.trim()) { setLoginError('Preencha sua senha.'); return; }
    setLoginError('');
    setLoginLoading(true);
    try {
      const { error } = await signIn(identifier, password);
      if (error) setLoginError(error.message || 'Credenciais inválidas ou acesso negado.');
    } catch (err: any) {
      setLoginError(err.message || 'Erro inesperado ao autenticar.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = cpf.replace(/\D/g, '');
    if (!nome.trim()) { setCheckoutError('Por favor, informe seu nome.'); return; }
    if (!email.trim() || !email.includes('@')) { setCheckoutError('E-mail inválido.'); return; }
    if (cleanCpf.length !== 11) { setCheckoutError('CPF inválido.'); return; }
    if (senha.length < 6) { setCheckoutError('A senha deve ter pelo menos 6 caracteres.'); return; }
    setCheckoutError('');
    setCheckoutStep('payment');
  };

  const handleConfirmPayment = async () => {
    setCheckoutLoading(true);
    setCheckoutError('');
    const cleanCpf = cpf.replace(/\D/g, '');
    const durationDays = selectedPlan === 'anual' ? 365 : 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    try {
      if (isSupabaseConfigured) {
        const { error: insertErr } = await supabase!.from('allowed_cpfs').insert({ cpf: cleanCpf, email: email.trim().toLowerCase(), senha, expires_at: expiresAt });
        if (insertErr) {
          const localAllowedList = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
          localAllowedList.push({ cpf: cleanCpf, email: email.trim().toLowerCase(), senha, expires_at: expiresAt });
          await localforage.setItem('@mura-manager:local-allowed-cpfs', localAllowedList);
        }
        await supabase!.auth.signUp({ email: email.trim().toLowerCase(), password: senha });
      } else {
        const localAllowedList = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
        localAllowedList.push({ cpf: cleanCpf, email: email.trim().toLowerCase(), senha, expires_at: expiresAt });
        await localforage.setItem('@mura-manager:local-allowed-cpfs', localAllowedList);
      }
      setCheckoutStep('success');
    } catch (err: any) {
      setCheckoutError(err.message || 'Erro ao processar assinatura.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleAutoLoginAfterSuccess = async () => {
    setLoginLoading(true);
    try { await signIn(email, senha); } catch { setShowLoginForm(true); setSelectedPlan(null); } finally { setLoginLoading(false); }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText('00020126580014BR.GOV.BCB.PIX0136pzkzvcflyfdbizhvpamj.supabase.co5204000053039865405' + (selectedPlan === 'anual' ? '639.90' : '59.90') + '5802BR5912MURA_MANAGER6009SAO_PAULO62070503***6304E21A');
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  return (
    <div className="h-screen w-full overflow-y-auto overflow-x-hidden bg-[#0a0a0b] text-white font-sans">

      {/* ── AURORA BACKGROUND ───────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Hero image overlay */}
        <div className="absolute inset-0"
          style={{ backgroundImage: `url(${heroBg})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.12 }} />
        
        {/* Gradient mesh */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245,158,11,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 50%, rgba(22,101,52,0.08) 0%, transparent 50%), radial-gradient(ellipse 50% 70% at 10% 80%, rgba(120,53,15,0.06) 0%, transparent 50%)' }} />

        {/* Animated aurora blobs */}
        <div className="absolute top-[-15%] left-[-10%] w-[70vw] h-[70vh] rounded-full animate-aurora"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vh] rounded-full animate-aurora delay-400"
          style={{ background: 'radial-gradient(circle, rgba(22,101,52,0.06) 0%, transparent 70%)', filter: 'blur(80px)', animationDuration: '16s' }} />

        {/* Noise grain texture */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />

        {/* Grid lines subtle */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
      </div>

      {/* ── NAVBAR ──────────────────────────────────────────── */}
      <nav className="sticky top-0 w-full border-b border-white/[0.06] px-6 py-3 flex justify-between items-center z-40"
        style={{ background: 'rgba(10,10,11,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        
        <div className="flex items-center gap-3">
          <img src={muraLogo} alt="Mura Manager" className="w-9 h-9 rounded-lg object-cover border border-amber-500/20" />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-black tracking-[0.2em] uppercase text-white">MURA</span>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-amber-500/70">MANAGER</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-6 text-xs font-semibold text-white/50">
          <button onClick={() => detailsRef.current?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Recursos</button>
          <button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">Planos</button>
        </div>

        <button 
          onClick={() => { setShowLoginForm(true); setLoginError(''); }}
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-black bg-amber-500 rounded-full hover:bg-amber-400 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
        >
          <LogIn size={12} /> Entrar
        </button>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center px-6 text-center pt-12 pb-20 max-w-5xl mx-auto" style={{ zIndex: 1 }}>
        
        {/* Badge topo */}
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400 text-[10px] font-bold tracking-widest uppercase animate-fade-in-up opacity-0" style={{ animationFillMode: 'forwards' }}>
          <Star size={10} fill="currentColor" />
          A gestão profissional que seu criatório merece
          <Star size={10} fill="currentColor" />
        </div>

        {/* Logo flutuando */}
        <div className="mb-8 animate-float opacity-0 animate-fade-in-up delay-100" style={{ animationFillMode: 'forwards' }}>
          <img 
            src={muraLogo} 
            alt="Mura Manager"
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl object-cover shadow-2xl border border-amber-500/20"
            style={{ boxShadow: '0 0 60px rgba(245,158,11,0.15), 0 20px 60px rgba(0,0,0,0.5)' }}
          />
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[0.9] opacity-0 animate-fade-in-up delay-200" style={{ animationFillMode: 'forwards' }}>
          <span className="text-white">Gestão de </span>
          <br />
          <span className="text-shimmer">Criatórios de Elite.</span>
        </h1>

        <p className="mt-6 text-sm sm:text-base text-white/50 max-w-lg leading-relaxed font-medium opacity-0 animate-fade-in-up delay-300" style={{ animationFillMode: 'forwards' }}>
          Controle genético, lotes de incubação, postura e baixas — tudo em uma plataforma ultra-rápida e sincronizada para Android, iOS e computador.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center opacity-0 animate-fade-in-up delay-400" style={{ animationFillMode: 'forwards' }}>
          <button 
            onClick={() => { setShowLoginForm(true); setLoginError(''); }}
            className="group relative px-8 py-4 text-xs font-black uppercase tracking-widest text-black bg-amber-500 rounded-2xl overflow-hidden active:scale-95 transition-all"
            style={{ boxShadow: '0 0 30px rgba(245,158,11,0.4)' }}
          >
            <span className="relative z-10 flex items-center gap-2"><LogIn size={14} /> Acesse sua Conta</span>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-amber-600 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
          </button>

          <button 
            onClick={() => detailsRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 px-8 py-4 text-xs font-black uppercase tracking-widest text-amber-400 border border-amber-500/25 rounded-2xl hover:border-amber-500/50 hover:bg-amber-500/5 active:scale-95 transition-all"
          >
            Ver Recursos <ArrowDown size={13} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-12 opacity-0 animate-fade-in-up delay-600" style={{ animationFillMode: 'forwards' }}>
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-2xl sm:text-3xl font-black text-white">{s.value}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <div className="w-px h-10 bg-gradient-to-b from-transparent via-amber-500/60 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section ref={detailsRef} className="relative py-24 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-6xl mx-auto">
          
          {/* Section header */}
          <div className="text-center mb-16 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Plataforma Completa</p>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              Tudo que seu criatório<br />precisa em um só lugar
            </h2>
            <p className="text-sm text-white/40 max-w-md mx-auto">
              Desenvolvido especialmente para criadores que exigem controle total, rastreabilidade e agilidade.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div 
                key={i}
                className={`glass-card glass-card-hover relative rounded-2xl p-6 flex flex-col gap-4 cursor-default transition-all duration-300 ${f.border}`}
                style={{ background: `linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)` }}
              >
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center border ${f.border}`}>
                  <f.icon size={20} className="text-amber-400" />
                </div>

                <div>
                  <h3 className="text-sm font-black text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-white/45 leading-relaxed">{f.desc}</p>
                </div>

                {/* Corner accent */}
                <div className={`absolute top-0 right-0 w-16 h-16 rounded-tr-2xl bg-gradient-to-bl ${f.color} opacity-30`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="pricing" className="relative py-24 px-6" style={{ zIndex: 1 }}>
        {/* Divider glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-amber-500/30 to-transparent" />

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">Planos e Preços</p>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">Escolha seu plano</h2>
            <p className="text-sm text-white/40 max-w-sm mx-auto">Sem taxas ocultas. Cancele quando quiser. Seu criatório sempre online.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* PLANO MENSAL */}
            <div className="glass-card rounded-3xl p-8 flex flex-col justify-between gap-8 relative overflow-hidden group hover:border-amber-500/20 transition-all duration-300">
              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Mensal</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-white/60">R$</span>
                    <span className="text-6xl font-black text-white tracking-tighter leading-none">59</span>
                    <span className="text-xl font-black text-white/60">,90</span>
                    <span className="text-xs text-white/30 ml-1 font-bold">/mês</span>
                  </div>
                  <p className="text-xs text-white/30 mt-2 font-medium">Renova todo mês. Cancele quando quiser.</p>
                </div>

                <ul className="space-y-3">
                  {['Aves e lotes ilimitados', 'Árvore genealógica e consanguinidade', 'Sincronização em nuvem multi-dispositivo', 'Backup diário automático', 'Suporte prioritário'].map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs text-white/60">
                      <div className="w-4 h-4 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Check size={9} className="text-amber-400" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => { setSelectedPlan('mensal'); setCheckoutStep('form'); setCheckoutError(''); }}
                className="w-full py-4 rounded-2xl border border-amber-500/25 text-amber-400 text-xs font-black uppercase tracking-widest hover:bg-amber-500/8 hover:border-amber-500/50 active:scale-95 transition-all"
              >
                Começar Agora
              </button>

              <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full opacity-5"
                style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />
            </div>

            {/* PLANO ANUAL */}
            <div className="relative rounded-3xl p-8 flex flex-col justify-between gap-8 overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.04) 100%)', border: '1px solid rgba(245,158,11,0.25)', boxShadow: '0 0 60px rgba(245,158,11,0.08), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              
              {/* Recomendado badge */}
              <div className="absolute top-5 right-5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-black bg-amber-500">
                Recomendado
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/80 mb-1">Anual</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-black text-white/60">R$</span>
                    <span className="text-6xl font-black text-white tracking-tighter leading-none">639</span>
                    <span className="text-xl font-black text-white/60">,90</span>
                    <span className="text-xs text-white/30 ml-1 font-bold">/ano</span>
                  </div>
                  <p className="text-xs text-amber-500/60 mt-2 font-bold flex items-center gap-1.5">
                    <Sparkles size={10} />
                    Economize R$ 78,90 em relação ao mensal
                  </p>
                </div>

                <ul className="space-y-3">
                  {['Tudo do plano mensal', 'Mais de 1 mês gratuito incluso', 'Acesso antecipado a novos recursos', 'Notificações inteligentes de vencimento', 'Relatório anual de desempenho genético'].map((f, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs text-white/70">
                      <div className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                        <Check size={9} className="text-amber-400" />
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => { setSelectedPlan('anual'); setCheckoutStep('form'); setCheckoutError(''); }}
                className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-black bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all"
                style={{ boxShadow: '0 0 30px rgba(245,158,11,0.3)' }}
              >
                Assinar Plano Anual
              </button>

              {/* Background glow */}
              <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="relative border-t border-white/[0.06] py-10 px-6" style={{ zIndex: 1 }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={muraLogo} alt="Mura Manager" className="w-7 h-7 rounded-lg object-cover opacity-60" />
            <span className="text-xs font-black tracking-widest uppercase text-white/30">MURA MANAGER</span>
          </div>
          <p className="text-[10px] text-white/20 font-medium">© {new Date().getFullYear()} Mura Manager. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MODAL LOGIN                                           */}
      {/* ══════════════════════════════════════════════════════ */}
      {showLoginForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-scale-up border border-white/10"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)' }}>
            
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-white/[0.07] flex justify-between items-start">
              <div className="flex items-center gap-3">
                <img src={muraLogo} alt="Mura Manager" className="w-10 h-10 rounded-xl object-cover border border-amber-500/20" />
                <div>
                  <h3 className="font-black text-base text-white tracking-wide">Acesse sua Conta</h3>
                  <p className="text-[10px] text-white/35 mt-0.5">Bem-vindo de volta ao Mura Manager</p>
                </div>
              </div>
              <button onClick={() => setShowLoginForm(false)} className="text-white/30 hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="px-8 py-7 space-y-5">
              {loginError && (
                <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/8 text-red-400 text-xs font-bold text-center">
                  {loginError}
                </div>
              )}

              {/* E-mail ou CPF */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">E-mail ou CPF</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-amber-400 transition-colors">
                    <User size={14} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="email@exemplo.com ou 000.000.000-00"
                    value={identifier}
                    onChange={e => {
                      const val = e.target.value;
                      if (val.includes('@') || /[a-zA-Z]/.test(val)) setIdentifier(val);
                      else setIdentifier(formatCPF(val));
                    }}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:border-amber-500/50 focus:bg-amber-500/[0.03] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/30">Senha</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-amber-400 transition-colors">
                    <Lock size={14} />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:border-amber-500/50 focus:bg-amber-500/[0.03] outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-black bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
                style={{ boxShadow: '0 0 25px rgba(245,158,11,0.25)' }}
              >
                {loginLoading ? <Activity size={16} className="animate-spin" /> : <><LogIn size={15} /> Entrar na Plataforma</>}
              </button>

              <p className="text-center text-[10px] text-white/25">
                Ainda não é cliente?{' '}
                <button type="button" onClick={() => { setShowLoginForm(false); document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-amber-500/60 hover:text-amber-400 transition-colors">
                  Conheça nossos planos
                </button>
              </p>

              {isLocalMode && (
                <div className="p-2 rounded-lg border border-orange-500/10 bg-orange-500/5 text-orange-300/30 text-[9px] text-center">
                  Modo Offline Local · Admin: 14477751630
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════ */}
      {/* MODAL CHECKOUT / ASSINATURA                           */}
      {/* ══════════════════════════════════════════════════════ */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-scale-up flex flex-col max-h-[92vh] border border-white/10"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)', boxShadow: '0 0 80px rgba(0,0,0,0.8)' }}>
            
            {/* Header */}
            <div className="px-7 pt-7 pb-5 border-b border-white/[0.07] flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Sparkles size={16} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white">Assinar Mura Manager</h3>
                  <p className="text-[10px] text-white/30">
                    Plano <span className="text-amber-400 font-bold capitalize">{selectedPlan}</span> · R$ {selectedPlan === 'anual' ? '639,90/ano' : '59,90/mês'}
                  </p>
                </div>
              </div>
              {checkoutStep !== 'success' && (
                <button onClick={() => setSelectedPlan(null)} className="text-white/30 hover:text-white transition-colors p-1">
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-7 py-6">
              {checkoutError && (
                <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/8 text-red-400 text-xs font-bold text-center mb-5">
                  {checkoutError}
                </div>
              )}

              {/* STEP 1: DADOS */}
              {checkoutStep === 'form' && (
                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 pb-1">Seus Dados de Acesso</p>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/25">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                      <input type="text" required placeholder="João da Silva" value={nome} onChange={e => setNome(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:border-amber-500/50 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/25">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                        <input type="email" required placeholder="email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)}
                          className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:border-amber-500/50 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/25">CPF</label>
                      <div className="relative">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                        <input type="text" required placeholder="000.000.000-00" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))}
                          className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:border-amber-500/50 outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/25">Senha da Plataforma</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={14} />
                      <input type="password" required placeholder="Mínimo 6 caracteres" value={senha} onChange={e => setSenha(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:border-amber-500/50 outline-none transition-all" />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-black bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
                    style={{ boxShadow: '0 0 25px rgba(245,158,11,0.2)' }}>
                    Prosseguir para o Pagamento <ChevronRight size={14} />
                  </button>
                </form>
              )}

              {/* STEP 2: PAGAMENTO */}
              {checkoutStep === 'payment' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Tabs Pix/Cartão */}
                  <div className="flex gap-2 p-1 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                    {(['pix', 'card'] as const).map(m => (
                      <button key={m} onClick={() => setPaymentMethod(m)}
                        className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${paymentMethod === m ? 'bg-amber-500 text-black shadow-md' : 'text-white/40 hover:text-white/70'}`}>
                        {m === 'pix' ? <><QrCode size={13} /> Pix</> : <><CreditCard size={13} /> Cartão</>}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'pix' ? (
                    <div className="flex flex-col items-center gap-5 animate-fade-in">
                      {/* QR Code simulado */}
                      <div className="p-4 bg-white rounded-2xl shadow-lg">
                        <div className="w-36 h-36 relative flex items-center justify-center bg-gray-50">
                          <QrCode size={112} className="text-gray-900" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="bg-amber-500 text-black text-[8px] font-black tracking-wider px-2 py-0.5 rounded-md shadow">MURA</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center space-y-2">
                        <p className="text-xs text-white/45 max-w-xs">Escaneie o QR Code no app do seu banco ou copie o código Pix abaixo.</p>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/15 text-amber-400/70 text-[10px] font-bold">
                          <AlertTriangle size={11} /> Aviso 3 dias antes do vencimento por Pix
                        </div>
                      </div>

                      <button onClick={copyPixCode}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-black transition-all ${copiedPix ? 'bg-emerald-500 text-white' : 'border border-amber-500/25 text-amber-400 hover:border-amber-500/50 hover:bg-amber-500/5'}`}>
                        <Clipboard size={13} />
                        {copiedPix ? 'Código Copiado!' : 'Copiar Código Pix'}
                      </button>

                      <div className="w-full border-t border-white/[0.07] pt-5 flex justify-between items-center">
                        <button onClick={() => setCheckoutStep('form')} className="text-xs text-white/30 hover:text-white font-bold transition-colors">← Voltar</button>
                        <button onClick={handleConfirmPayment} disabled={checkoutLoading}
                          className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-black bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2">
                          {checkoutLoading ? <Activity size={14} className="animate-spin" /> : <><Check size={14} /> Confirmar</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={e => { e.preventDefault(); handleConfirmPayment(); }} className="space-y-4 animate-fade-in">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/25">Número do Cartão</label>
                        <input type="text" required placeholder="0000 0000 0000 0000" value={cardNumber}
                          onChange={e => setCardNumber(e.target.value.replace(/\D/g,'').slice(0,16).replace(/(\d{4})/g,'$1 ').trim())}
                          className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder-white/20 focus:border-amber-500/50 outline-none transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/25">Nome no Cartão</label>
                        <input type="text" required placeholder="NOME NO CARTÃO" value={cardName}
                          onChange={e => setCardName(e.target.value.toUpperCase())}
                          className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder-white/20 focus:border-amber-500/50 outline-none transition-all" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/25">Validade</label>
                          <input type="text" required placeholder="MM/AA" value={cardExpiry}
                            onChange={e => { let v = e.target.value.replace(/\D/g,'').slice(0,4); if (v.length > 2) v = `${v.slice(0,2)}/${v.slice(2)}`; setCardExpiry(v); }}
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder-white/20 focus:border-amber-500/50 outline-none transition-all" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-white/25">CVV</label>
                          <input type="text" required placeholder="000" value={cardCVV}
                            onChange={e => setCardCVV(e.target.value.replace(/\D/g,'').slice(0,3))}
                            className="w-full bg-white/[0.04] border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder-white/20 focus:border-amber-500/50 outline-none transition-all" />
                        </div>
                      </div>
                      <p className="text-center text-[10px] text-white/25 font-bold">🔒 Cobrança recorrente automática todo {selectedPlan === 'anual' ? 'ano' : 'mês'}.</p>

                      <div className="border-t border-white/[0.07] pt-5 flex justify-between items-center">
                        <button type="button" onClick={() => setCheckoutStep('form')} className="text-xs text-white/30 hover:text-white font-bold transition-colors">← Voltar</button>
                        <button type="submit" disabled={checkoutLoading}
                          className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-black bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2">
                          {checkoutLoading ? <Activity size={14} className="animate-spin" /> : <><Check size={14} /> Ativar Assinatura</>}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* STEP 3: SUCESSO */}
              {checkoutStep === 'success' && (
                <div className="flex flex-col items-center text-center gap-5 py-6 animate-scale-up">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400">
                    <Check size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white mb-2">Assinatura Ativada!</h4>
                    <p className="text-xs text-white/40 max-w-xs mx-auto">Parabéns, {nome.split(' ')[0]}! Sua conta foi criada e seu acesso já está ativo.</p>
                  </div>
                  <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left space-y-3">
                    <div className="flex justify-between text-xs"><span className="text-white/35 font-bold">Identificador</span><span className="text-white font-mono">{cpf}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-white/35 font-bold">Senha</span><span className="text-white font-mono">••••••</span></div>
                    <div className="flex justify-between text-xs border-t border-white/[0.07] pt-3">
                      <span className="text-white/35 font-bold">Validade</span>
                      <span className="text-amber-400 font-bold">{new Date(Date.now() + (selectedPlan === 'anual' ? 365 : 30) * 86400000).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <button onClick={handleAutoLoginAfterSuccess} disabled={loginLoading}
                    className="w-full max-w-xs py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-black bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all flex items-center justify-center gap-2"
                    style={{ boxShadow: '0 0 25px rgba(245,158,11,0.25)' }}>
                    {loginLoading ? <Activity size={16} className="animate-spin" /> : <><LogIn size={15} /> Entrar na Plataforma</>}
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
