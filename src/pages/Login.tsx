import { useState, useRef } from 'react';
import { 
  Activity, 
  LogIn, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Dna, 
  TrendingUp, 
  History, 
  Smartphone, 
  ArrowDown, 
  CreditCard, 
  QrCode, 
  Clipboard, 
  Lock, 
  User, 
  Mail, 
  FileText, 
  X, 
  ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import localforage from 'localforage';
import gamecockSilhouette from '../assets/gamefowl_silhouette.png';

export function Login() {
  const { signIn, isLocalMode } = useAuth();
  const detailsRef = useRef<HTMLDivElement>(null);

  // Estados de Autenticação / Login
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Estados de Assinatura / Checkout
  const [selectedPlan, setSelectedPlan] = useState<'mensal' | 'anual' | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'payment' | 'success'>('form');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [copiedPix, setCopiedPix] = useState(false);

  // Form de Cadastro na compra
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');

  // Form de Cartão de Crédito
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');

  // Utilitários de Máscara e Formatação
  const formatCPF = (value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCPF(e.target.value));
  };

  const scrollToDetails = () => {
    detailsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Envio do Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) { setLoginError('Preencha seu e-mail ou CPF.'); return; }
    if (!password.trim()) { setLoginError('Preencha sua senha.'); return; }
    
    setLoginError('');
    setLoginLoading(true);
    try {
      const { error } = await signIn(identifier, password);
      if (error) {
        setLoginError(error.message || 'Credenciais inválidas ou acesso negado.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Erro inesperado ao autenticar.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Finalização do Checkout (Compra simulada com registro real)
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = cpf.replace(/\D/g, '');
    
    if (!nome.trim()) { setCheckoutError('Por favor, informe seu nome.'); return; }
    if (!email.trim() || !email.includes('@')) { setCheckoutError('E-mail inválido.'); return; }
    if (cleanCpf.length !== 11) { setCheckoutError('CPF inválido.'); return; }
    if (senha.length < 6) { setCheckoutError('A senha deve ter pelo menos 6 caracteres.'); return; }

    setCheckoutError('');
    
    // Avança para a etapa de pagamento
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
        // 1. Tenta inserir na tabela allowed_cpfs
        const { error: insertErr } = await supabase!
          .from('allowed_cpfs')
          .insert({
            cpf: cleanCpf,
            email: email.trim().toLowerCase(),
            senha: senha, // Senha de referência
            expires_at: expiresAt
          });

        if (insertErr) {
          console.warn('RLS do allowed_cpfs impediu inserção direta. Usando cache local de teste.', insertErr);
          // Fallback local caso a tabela tenha políticas de segurança restritivas para convidados
          const localAllowedList = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
          localAllowedList.push({
            cpf: cleanCpf,
            email: email.trim().toLowerCase(),
            senha: senha,
            expires_at: expiresAt
          });
          await localforage.setItem('@mura-manager:local-allowed-cpfs', localAllowedList);
        }

        // 2. Tenta cadastrar o usuário no Supabase Auth para habilitar login
        const { error: authErr } = await supabase!.auth.signUp({
          email: email.trim().toLowerCase(),
          password: senha
        });

        if (authErr) {
          console.error('Erro de Auth do Supabase:', authErr);
        }
      } else {
        // Modo Local/Offline tradicional: salva localmente no IndexedDB
        const localAllowedList = await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs') || [];
        localAllowedList.push({
          cpf: cleanCpf,
          email: email.trim().toLowerCase(),
          senha: senha,
          expires_at: expiresAt
        });
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
    try {
      await signIn(email, senha);
    } catch (err) {
      console.error(err);
      setShowLoginForm(true);
      setSelectedPlan(null);
    } finally {
      setLoginLoading(false);
    }
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText('00020126580014BR.GOV.BCB.PIX0136pzkzvcflyfdbizhvpamj.supabase.co520400005303986540559.905802BR5912MURA_MANAGER6009SAO_PAULO62070503***6304E21A');
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div className="h-screen w-full overflow-y-auto overflow-x-hidden scroll-smooth bg-black text-white relative font-sans">
      
      {/* Glow de fundo principal */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[500px] h-[500px] bg-theme-primary/5 rounded-full blur-[140px] pointer-events-none" />

      {/* ── NAVBAR FLUTUANTE ── */}
      <nav className="sticky top-0 w-full bg-black/80 backdrop-blur-md border-b border-theme-border/30 px-6 py-4 flex justify-between items-center z-45">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black text-white tracking-widest uppercase">
            MURA<span className="text-theme-primary">.</span>MANAGER
          </span>
        </div>
        <button 
          onClick={() => { setShowLoginForm(true); setLoginError(''); }}
          className="px-4 py-2 text-xs font-black uppercase text-theme-primary hover:text-white border border-theme-primary/30 rounded-full hover:border-theme-primary transition-all active:scale-95 flex items-center gap-2"
        >
          <LogIn size={13} /> Acesse sua Conta
        </button>
      </nav>

      {/* ── SEÇÃO 1: HERO / APRESENTAÇÃO (PRIMEIRA DOBRA) ── */}
      <section className="min-h-[85vh] flex flex-col justify-center items-center px-6 text-center relative max-w-4xl mx-auto py-12">
        <img
          src={gamecockSilhouette}
          alt="Mura Manager Silhouette"
          className="w-48 h-48 sm:w-56 sm:h-56 object-contain select-none pointer-events-none mb-6 animate-fade-in"
        />

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
          Gestão Profissional para <br />
          <span className="bg-gradient-to-r from-theme-primary via-yellow-500 to-amber-600 bg-clip-text text-transparent">
            Criatórios de Elite
          </span>
        </h1>

        <p className="mt-6 text-sm sm:text-lg text-theme-text-muted max-w-xl font-medium">
          Organize casais, acompanhe o pedigree de forma visual, gerencie lotes de eclosão e controle finanças e baixas em uma única plataforma fluida e veloz.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
          <button 
            onClick={() => { setShowLoginForm(true); setLoginError(''); }}
            className="w-full sm:w-auto btn-primary !px-8 !py-3.5 !text-xs uppercase flex items-center justify-center gap-2 shadow-lg"
          >
            <LogIn size={14} /> Acesse sua Conta
          </button>

          <button 
            onClick={scrollToDetails}
            className="w-full sm:w-auto px-8 py-3.5 text-xs font-black uppercase text-theme-primary border border-theme-primary/30 hover:border-theme-primary rounded-full transition-all active:scale-95 flex items-center justify-center gap-2 group"
          >
            Conhecer o Produto <ArrowDown size={14} className="group-hover:translate-y-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* ── SEÇÃO 2: DETALHES DO PRODUTO (SEGUNDA DOBRA) ── */}
      <section ref={detailsRef} id="product-details" className="py-24 border-t border-theme-border/20 px-6 max-w-5xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Tudo o que seu criatório precisa
          </h2>
          <p className="text-xs sm:text-sm text-theme-text-muted max-w-md mx-auto">
            Desenvolvido sob medida para criadores de aves de alto padrão que exigem controle, rastreabilidade e simplicidade.
          </p>
        </div>

        {/* Grade de Recursos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="premium-card p-6 flex flex-col gap-3 border border-theme-border/50 bg-theme-surface/50">
            <div className="w-10 h-10 rounded-xl bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center text-theme-primary">
              <Dna size={20} />
            </div>
            <h3 className="text-base font-black text-white">Controle Genético Completo</h3>
            <p className="text-xs text-theme-text-muted leading-relaxed">
              Forme casais de puro sangue ou híbridos, monitore cruzamentos e visualize a árvore genealógica de forma integrada, evitando consanguinidade indesejada.
            </p>
          </div>

          <div className="premium-card p-6 flex flex-col gap-3 border border-theme-border/50 bg-theme-surface/50">
            <div className="w-10 h-10 rounded-xl bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center text-theme-primary">
              <Layers size={20} />
            </div>
            <h3 className="text-base font-black text-white">Gestão Inteligente de Lotes</h3>
            <p className="text-xs text-theme-text-muted leading-relaxed">
              Crie lotes específicos para postura (coleta diária de ovos com metas automatizadas) e lotes de engorda com transição ágil de status para abate ou terminação.
            </p>
          </div>

          <div className="premium-card p-6 flex flex-col gap-3 border border-theme-border/50 bg-theme-surface/50">
            <div className="w-10 h-10 rounded-xl bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center text-theme-primary">
              <History size={20} />
            </div>
            <h3 className="text-base font-black text-white">Histórico de Baixas e Perdas</h3>
            <p className="text-xs text-theme-text-muted leading-relaxed">
              Gerencie a saída de aves por vendas ou falecimento de forma prática. Analise a taxa de mortalidade e tenha relatórios limpos do plantel ativo.
            </p>
          </div>

          <div className="premium-card p-6 flex flex-col gap-3 border border-theme-border/50 bg-theme-surface/50">
            <div className="w-10 h-10 rounded-xl bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center text-theme-primary">
              <Smartphone size={20} />
            </div>
            <h3 className="text-base font-black text-white">Multi-Dispositivo de Verdade</h3>
            <p className="text-xs text-theme-text-muted leading-relaxed">
              Desenvolvido com tecnologia de ponta para rodar de forma ultra-rápida no Android, iOS, tablets e computadores, sincronizando tudo na nuvem em tempo real.
            </p>
          </div>

          <div className="premium-card p-6 flex flex-col gap-3 border border-theme-border/50 bg-theme-surface/50">
            <div className="w-10 h-10 rounded-xl bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center text-theme-primary">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-base font-black text-white">Previsão e Alertas de Postura</h3>
            <p className="text-xs text-theme-text-muted leading-relaxed">
              Acompanhe a produção real de ovos contra a expectativa teórica baseada em 85% de postura. Veja projeções e gráficos claros de rendimento do criatório.
            </p>
          </div>

          <div className="premium-card p-6 flex flex-col gap-3 border border-theme-border/50 bg-theme-surface/50">
            <div className="w-10 h-10 rounded-xl bg-theme-primary/10 border border-theme-primary/20 flex items-center justify-center text-theme-primary">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-base font-black text-white">Acesso por Assinatura Inteligente</h3>
            <p className="text-xs text-theme-text-muted leading-relaxed">
              Faturamento automático direto no cartão ou avisos de Pix recorrentes 3 dias antes do vencimento para você nunca perder acesso à sua base de dados genéticos.
            </p>
          </div>
        </div>
      </section>

      {/* ── SEÇÃO 3: PLANOS E VALORES ── */}
      <section className="py-24 border-t border-theme-border/20 bg-theme-surface/10 px-6">
        <div className="max-w-4xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Escolha o plano ideal para seu criatório
            </h2>
            <p className="text-xs sm:text-sm text-theme-text-muted max-w-sm mx-auto">
              Sem taxas escondidas. Cancele ou altere o plano quando desejar.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-stretch">
            
            {/* PLANO MENSAL */}
            <div className="premium-card p-8 flex flex-col justify-between border border-theme-border/50 bg-theme-surface/40 relative">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white">Plano Mensal</h3>
                  <p className="text-xs text-theme-text-muted mt-1">Acesso contínuo mês a mês</p>
                </div>

                <div className="flex items-baseline gap-1 text-white">
                  <span className="text-2xl font-black">R$</span>
                  <span className="text-5xl font-black tracking-tight">59</span>
                  <span className="text-2xl font-black">,90</span>
                  <span className="text-xs text-theme-text-muted font-bold ml-1">/mês</span>
                </div>

                <ul className="space-y-3 border-t border-theme-border/30 pt-6">
                  {['Gestão de aves e lotes ilimitados', 'Mapeamento genealógico e consanguinidade', 'Sincronização multi-dispositivo na nuvem', 'Backup diário dos dados', 'Suporte técnico prioritário'].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-theme-text-muted">
                      <Check size={14} className="text-theme-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => { setSelectedPlan('mensal'); setCheckoutStep('form'); setCheckoutError(''); }}
                className="mt-8 w-full py-3 rounded-xl border border-theme-primary/30 hover:border-theme-primary text-theme-primary hover:text-white font-black text-xs uppercase transition-all hover:bg-theme-primary/5 active:scale-95"
              >
                Assinar Plano Mensal
              </button>
            </div>

            {/* PLANO ANUAL */}
            <div className="premium-card p-8 flex flex-col justify-between border-2 border-theme-primary bg-theme-surface/60 relative shadow-[0_0_40px_rgba(245,158,11,0.05)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-theme-primary text-black font-black uppercase text-[9px] tracking-wider px-3.5 py-1 rounded-full shadow-lg">
                Melhor Valor — Economize R$ 78,90
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-1.5">
                    Plano Anual <Sparkles size={16} className="text-theme-primary" />
                  </h3>
                  <p className="text-xs text-theme-text-muted mt-1">Acesso garantido por 1 ano completo</p>
                </div>

                <div className="flex items-baseline gap-1 text-white">
                  <span className="text-2xl font-black">R$</span>
                  <span className="text-5xl font-black tracking-tight">639</span>
                  <span className="text-2xl font-black">,90</span>
                  <span className="text-xs text-theme-text-muted font-bold ml-1">/ano</span>
                </div>

                <ul className="space-y-3 border-t border-theme-border/30 pt-6">
                  {['Tudo do plano mensal incluído', 'Desconto equivalente a mais de 1 mensalidade grátis', 'Acesso prioritário a novas funcionalidades', 'Notificações de vencimento inteligentes', 'Relatório anual de desempenho genético'].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-theme-text-muted">
                      <Check size={14} className="text-theme-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => { setSelectedPlan('anual'); setCheckoutStep('form'); setCheckoutError(''); }}
                className="mt-8 w-full btn-primary py-3 rounded-xl flex items-center justify-center font-black text-xs uppercase"
              >
                Assinar Plano Anual
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-theme-border/20 text-center text-xs text-theme-text-muted max-w-4xl mx-auto px-6">
        <p className="font-bold">MURA MANAGER © {new Date().getFullYear()} · Todos os direitos reservados.</p>
        <p className="mt-2 text-[10px] text-theme-text-muted/60">Acesso sujeito a termos de assinatura e termos de uso do serviço de banco de dados na nuvem.</p>
      </footer>

      {/* ── MODAL DE LOGIN / ACESSO À CONTA ── */}
      {showLoginForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-fade-in">
          <div className="bg-theme-surface border border-theme-border/80 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-scale-up relative">
            <button 
              onClick={() => setShowLoginForm(false)}
              className="absolute right-4 top-4 text-theme-text-muted hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="p-6 border-b border-theme-border flex items-center gap-3 bg-theme-base/50">
              <LogIn size={20} className="text-theme-primary" />
              <div>
                <h3 className="font-black text-base text-white">Acesse sua Conta</h3>
                <p className="text-[10px] text-theme-text-muted">Informe suas credenciais registradas</p>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold text-center">
                  {loginError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-theme-text-muted uppercase">E-mail ou CPF</label>
                <input
                  type="text"
                  required
                  placeholder="Seu e-mail ou 000.000.000-00"
                  value={identifier}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.includes('@') || val.match(/[a-zA-Z]/)) {
                      setIdentifier(val);
                    } else {
                      setIdentifier(formatCPF(val));
                    }
                  }}
                  className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-theme-text-muted uppercase">Senha de Acesso</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full btn-primary py-3 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 mt-2"
              >
                {loginLoading 
                  ? <Activity size={16} className="animate-spin" />
                  : <><LogIn size={16} /> Entrar no Criatório</>
                }
              </button>

              {isLocalMode && (
                <div className="p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg text-orange-300/40 text-[9px] text-center mt-3">
                  Modo Offline Local Ativo · Admin: 14477751630 (sem senha)
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DE CHECKOUT / COMPRA / CADASTRO ── */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 animate-fade-in">
          <div className="bg-theme-surface border border-theme-border/80 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up relative">
            
            {/* Botão fechar */}
            {checkoutStep !== 'success' && (
              <button 
                onClick={() => setSelectedPlan(null)}
                className="absolute right-4 top-4 text-theme-text-muted hover:text-white z-10"
              >
                <X size={20} />
              </button>
            )}

            {/* Cabeçalho */}
            <div className="p-6 border-b border-theme-border flex justify-between items-center bg-theme-base/50 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-theme-primary" />
                <div>
                  <h3 className="font-black text-base text-white">Assinar Mura Manager</h3>
                  <p className="text-[10px] text-theme-text-muted">
                    Plano selecionado: <span className="text-theme-primary font-bold capitalize">{selectedPlan}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-theme-text-muted font-bold block">Valor</span>
                <span className="text-lg font-black text-white">
                  R$ {selectedPlan === 'anual' ? '639,90' : '59,90'}
                </span>
              </div>
            </div>

            {/* Conteúdo dinâmico com base no passo */}
            <div className="flex-1 overflow-y-auto p-6">
              {checkoutError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold text-center mb-4">
                  {checkoutError}
                </div>
              )}

              {/* PASSO 1: DADOS CADASTRAIS */}
              {checkoutStep === 'form' && (
                <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-theme-text-muted uppercase">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={14} />
                      <input
                        type="text"
                        required
                        placeholder="Ex: João Silva"
                        value={nome}
                        onChange={e => setNome(e.target.value)}
                        className="w-full bg-theme-base border border-theme-border rounded-xl py-3 pl-9 pr-4 text-sm text-white focus:border-theme-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-theme-text-muted uppercase">E-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={14} />
                        <input
                          type="email"
                          required
                          placeholder="seuemail@exemplo.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full bg-theme-base border border-theme-border rounded-xl py-3 pl-9 pr-4 text-sm text-white focus:border-theme-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-theme-text-muted uppercase">CPF (Acesso)</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={14} />
                        <input
                          type="text"
                          required
                          placeholder="000.000.000-00"
                          value={cpf}
                          onChange={handleCpfChange}
                          className="w-full bg-theme-base border border-theme-border rounded-xl py-3 pl-9 pr-4 text-sm text-white focus:border-theme-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-theme-text-muted uppercase">Senha da Plataforma</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={14} />
                      <input
                        type="password"
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={senha}
                        onChange={e => setSenha(e.target.value)}
                        className="w-full bg-theme-base border border-theme-border rounded-xl py-3 pl-9 pr-4 text-sm text-white focus:border-theme-primary outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary py-3.5 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 mt-4"
                  >
                    Prosseguir para o Pagamento <ChevronRight size={14} />
                  </button>
                </form>
              )}

              {/* PASSO 2: ESCOLHER PAGAMENTO (PIX OU CARTÃO) */}
              {checkoutStep === 'payment' && (
                <div className="space-y-6">
                  {/* Abas */}
                  <div className="flex bg-theme-base border border-theme-border rounded-xl p-1 gap-1">
                    <button
                      onClick={() => setPaymentMethod('pix')}
                      className={`flex-1 py-3.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === 'pix' 
                          ? 'bg-theme-primary text-black' 
                          : 'text-theme-text-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <QrCode size={15} /> Pagamento via Pix
                    </button>
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`flex-1 py-3.5 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === 'card' 
                          ? 'bg-theme-primary text-black' 
                          : 'text-theme-text-muted hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <CreditCard size={15} /> Cartão de Crédito
                    </button>
                  </div>

                  {/* Detalhe do método */}
                  {paymentMethod === 'pix' ? (
                    <div className="flex flex-col items-center text-center space-y-4 animate-fade-in">
                      <div className="p-4 bg-white rounded-2xl border-4 border-theme-primary shadow-md">
                        {/* Mock Pix QR Code */}
                        <div className="w-40 h-40 flex items-center justify-center bg-zinc-100 relative">
                          <QrCode size={120} className="text-zinc-900" />
                          <div className="absolute inset-0 bg-zinc-900/10 flex items-center justify-center">
                            <span className="bg-theme-primary text-black text-[9px] font-black tracking-widest px-2 py-0.5 rounded shadow">
                              MURA PIX
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-theme-text-muted leading-relaxed max-w-sm mx-auto">
                          Escaneie o QR Code acima no app do seu banco ou utilize o botão copiar código Pix abaixo para realizar o pagamento.
                        </p>
                        <div className="flex items-center justify-center gap-2 p-2 text-[10px] text-yellow-500 font-bold bg-yellow-500/5 border border-yellow-500/10 rounded-lg max-w-xs mx-auto mt-2">
                          <AlertTriangle size={14} className="shrink-0" />
                          <span>O vencimento Pix avisa 3 dias antes do bloqueio automático.</span>
                        </div>
                      </div>

                      <button
                        onClick={copyPixCode}
                        className={`px-5 py-2.5 rounded-full text-xs font-black flex items-center gap-2 border transition-all ${
                          copiedPix 
                            ? 'bg-emerald-500 border-emerald-600 text-white' 
                            : 'border-theme-primary/30 hover:border-theme-primary text-theme-primary'
                        }`}
                      >
                        <Clipboard size={14} />
                        {copiedPix ? 'Código Pix Copiado!' : 'Copiar Código Pix'}
                      </button>

                      <div className="w-full pt-4 border-t border-theme-border/30 flex justify-between gap-4">
                        <button 
                          onClick={() => setCheckoutStep('form')}
                          className="px-4 py-2 text-xs font-bold text-theme-text-muted hover:text-white"
                        >
                          Voltar
                        </button>
                        <button
                          onClick={handleConfirmPayment}
                          disabled={checkoutLoading}
                          className="btn-primary !px-6 !py-2.5 !text-xs uppercase flex items-center gap-1.5"
                        >
                          {checkoutLoading 
                            ? <Activity size={14} className="animate-spin" />
                            : <><Check size={14} /> Confirmar Pagamento</>
                          }
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form 
                      onSubmit={e => { e.preventDefault(); handleConfirmPayment(); }} 
                      className="space-y-4 animate-fade-in"
                    >
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-theme-text-muted uppercase">Número do Cartão</label>
                        <input
                          type="text"
                          required
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim())}
                          className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-theme-text-muted uppercase">Nome no Cartão</label>
                        <input
                          type="text"
                          required
                          placeholder="NOME IGUAL NO CARTÃO"
                          value={cardName}
                          onChange={e => setCardName(e.target.value.toUpperCase())}
                          className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-theme-text-muted uppercase">Validade</label>
                          <input
                            type="text"
                            required
                            placeholder="MM/AA"
                            value={cardExpiry}
                            onChange={e => {
                              let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                              if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                              setCardExpiry(v);
                            }}
                            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-theme-text-muted uppercase">CVV</label>
                          <input
                            type="text"
                            required
                            placeholder="000"
                            value={cardCVV}
                            onChange={e => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                          />
                        </div>
                      </div>

                      <p className="text-[10px] text-theme-text-muted font-bold text-center">
                        🔒 Cobrança automática recorrente. O valor será debitado todo {selectedPlan === 'anual' ? 'ano' : 'mês'}.
                      </p>

                      <div className="w-full pt-4 border-t border-theme-border/30 flex justify-between gap-4">
                        <button 
                          onClick={() => setCheckoutStep('form')}
                          type="button"
                          className="px-4 py-2 text-xs font-bold text-theme-text-muted hover:text-white"
                        >
                          Voltar
                        </button>
                        <button
                          type="submit"
                          disabled={checkoutLoading}
                          className="btn-primary !px-6 !py-2.5 !text-xs uppercase flex items-center gap-1.5"
                        >
                          {checkoutLoading 
                            ? <Activity size={14} className="animate-spin" />
                            : <><Check size={14} /> Ativar Assinatura Recorrente</>
                          }
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* PASSO 3: COMPRA FINALIZADA COM SUCESSO */}
              {checkoutStep === 'success' && (
                <div className="flex flex-col items-center text-center space-y-5 py-8 animate-scale-up">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-500 animate-pulse">
                    <Check size={32} />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-white">Assinatura Ativada com Sucesso!</h4>
                    <p className="text-xs text-theme-text-muted leading-relaxed max-w-sm mx-auto">
                      Parabéns, {nome.split(' ')[0]}! Sua conta do Mura Manager foi criada com sucesso e seu acesso já está 100% liberado.
                    </p>
                  </div>

                  <div className="p-4 bg-theme-base/50 border border-theme-border rounded-xl text-left w-full max-w-xs space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-text-muted font-bold">Identificador de Acesso:</span>
                      <span className="text-white font-mono font-bold">{cpf}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-theme-text-muted font-bold">Senha Cadastrada:</span>
                      <span className="text-white font-mono font-bold">••••••</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-theme-border pt-2 mt-2">
                      <span className="text-theme-text-muted font-bold">Expiração da Licença:</span>
                      <span className="text-yellow-500 font-bold">
                        {new Date(Date.now() + (selectedPlan === 'anual' ? 365 : 30) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleAutoLoginAfterSuccess}
                    disabled={loginLoading}
                    className="btn-primary !px-8 !py-3.5 !text-xs uppercase flex items-center justify-center gap-2 mt-4"
                  >
                    {loginLoading 
                      ? <Activity size={16} className="animate-spin" />
                      : <><LogIn size={16} /> Entrar na Plataforma</>
                    }
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
