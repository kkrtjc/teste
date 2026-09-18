import { useState, useEffect } from 'react';
import { useAuth, type SubscriptionPlan } from '../lib/AuthContext';
import { useAppContext } from '../lib/AppContext';
import { 
  ShieldAlert, LogOut, 
  Sparkles, MessageSquare, Copy, CheckCircle2, Check,
  CreditCard, QrCode, ShieldCheck, Zap
} from 'lucide-react';

export function PaywallScreen() {
  const { signOut, cpf, triggerWebhookPayment, linkCpfToUser } = useAuth();
  const { farmSettings, showToast } = useAppContext();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card');
  const [copied, setCopied] = useState(false);

  const pixKey = "mura.manager.pay@gmail.com"; 
  const [paymentCpf, setPaymentCpf] = useState('');

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getPlanPriceDisplay = (plan: SubscriptionPlan) => {
    switch (plan) {
      case 'yearly': return 'R$ 567,90/ano (em até 12x ou 4x s/ juros)';
      case 'pro_monthly': return 'R$ 59,80/mês';
      case 'monthly': return 'R$ 39,90/mês';
    }
  };

  const getWhatsappLink = (method: 'card' | 'pix' = paymentMethod) => {
    let planText = '';
    if (selectedPlan === 'yearly') {
      planText = 'Anual Completo (R$ 567,90 - 21% OFF - Economia de R$ 149,70)';
    } else if (selectedPlan === 'pro_monthly') {
      planText = 'Mensal Completo com Lotes e Ovos (R$ 59,80/mês)';
    } else {
      planText = 'Mensal Comum - Aves e Vitrine (R$ 39,90/mês)';
    }
    const userIdent = paymentCpf ? `CPF: ${paymentCpf}` : `Usuário: ${cpf}`;
    const methodText = method === 'card' ? 'Cartão de Crédito (Automático)' : 'PIX (À Vista)';
    const text = encodeURIComponent(
      `Olá! Desejo ativar o plano ${planText} via ${methodText} no Mura Manager (${userIdent}). Segue a solicitação para liberação imediata.`
    );
    return `https://wa.me/55${farmSettings.phone.replace(/\D/g, '') || '5599999999999'}?text=${text}`;
  };

  useEffect(() => {
    document.body.classList.add('modal-open-lock');
    return () => {
      document.body.classList.remove('modal-open-lock');
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto select-none"
    >
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-theme-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* CARD PRINCIPAL */}
      <div 
        className="w-full max-w-2xl bg-theme-surface border-2 border-theme-border/80 rounded-3xl shadow-2xl p-4 sm:p-5 flex flex-col justify-between max-h-[96vh] relative z-10 animate-scale-up overflow-y-auto modal-scrollable-content touch-pan-y"
        onTouchMove={e => e.stopPropagation()}
      >
        
        {/* Header Compacto */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center border border-red-500/30">
              <ShieldAlert size={18} />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white font-serif">Período de Teste Finalizado</h2>
          </div>
          <p className="text-[11px] sm:text-xs text-theme-text-muted leading-tight max-w-md mx-auto">
            Escolha o melhor plano para o seu criatório e continue gerenciando suas aves sem interrupção.
          </p>
        </div>

        {/* ── OS 3 PLANOS EM GRID RESPONSIVA (COM ANCORAGEM DE PREÇO) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 my-3">
          
          {/* 1. PLANO MENSAL COMUM */}
          <div 
            onClick={() => setSelectedPlan('monthly')}
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
              selectedPlan === 'monthly'
                ? 'border-theme-primary bg-theme-primary/10 text-white shadow-lg shadow-theme-primary/10'
                : 'border-theme-border/60 bg-theme-base/50 text-theme-text-muted hover:border-theme-border'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-white">Mensal Comum</span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedPlan === 'monthly' ? 'border-theme-primary bg-theme-primary' : 'border-theme-border'
                }`}>
                  {selectedPlan === 'monthly' && <Check size={10} className="text-black font-black" />}
                </div>
              </div>
              <p className="text-[9px] text-theme-text-muted mt-0.5">Aves e Vitrine</p>
            </div>

            <div className="mt-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-black text-white">R$ 39,90</span>
                <span className="text-[9px] text-theme-text-muted">/mês</span>
              </div>
              <ul className="mt-2 space-y-1 text-[9px] text-theme-text-muted">
                <li>• Cadastro de aves e fotos</li>
                <li>• Vitrine digital pública</li>
                <li>• Fichas técnicas completas</li>
              </ul>
            </div>
          </div>

          {/* 2. PLANO MENSAL COMPLETO */}
          <div 
            onClick={() => setSelectedPlan('pro_monthly')}
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
              selectedPlan === 'pro_monthly'
                ? 'border-amber-400 bg-amber-500/10 text-white shadow-lg shadow-amber-500/15'
                : 'border-theme-border/60 bg-theme-base/50 text-theme-text-muted hover:border-theme-border'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-xs text-white">Mensal Completo</span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedPlan === 'pro_monthly' ? 'border-amber-400 bg-amber-400' : 'border-theme-border'
                }`}>
                  {selectedPlan === 'pro_monthly' && <Check size={10} className="text-black font-black" />}
                </div>
              </div>
              <p className="text-[9px] text-amber-400/90 font-bold mt-0.5">Aves + Lotes & Ovos</p>
            </div>

            <div className="mt-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-black text-amber-400">R$ 59,80</span>
                <span className="text-[9px] text-theme-text-muted">/mês</span>
              </div>
              <ul className="mt-2 space-y-1 text-[9px] text-zinc-300">
                <li>• Tudo do plano de aves</li>
                <li>• Gestão de Lotes de Cria</li>
                <li>• Controle de Ovos & Chocadeira</li>
              </ul>
              <span className="inline-block mt-2 text-[8px] text-theme-text-muted">
                (Apenas + R$ 19,90 pelos lotes)
              </span>
            </div>
          </div>

          {/* 3. PLANO ANUAL COMPLETO (HERO / DECOY ANCHOR) */}
          <div 
            onClick={() => setSelectedPlan('yearly')}
            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all relative flex flex-col justify-between overflow-hidden ${
              selectedPlan === 'yearly'
                ? 'border-emerald-400 bg-emerald-500/10 text-white shadow-xl shadow-emerald-500/20 ring-1 ring-emerald-400/50'
                : 'border-theme-border/60 bg-theme-base/50 text-theme-text-muted hover:border-theme-border'
            }`}
          >
            <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-emerald-400 text-black text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-bl-lg shadow-sm">
              21% OFF • RECOMENDADO
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="font-black text-xs text-white">Anual Completo</span>
                  <Zap size={12} className="text-emerald-400 fill-emerald-400" />
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedPlan === 'yearly' ? 'border-emerald-400 bg-emerald-400' : 'border-theme-border'
                }`}>
                  {selectedPlan === 'yearly' && <Check size={10} className="text-black font-black" />}
                </div>
              </div>
              <p className="text-[9px] text-emerald-400 font-bold mt-0.5">Economia de R$ 149,70</p>
            </div>

            <div className="mt-2">
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] line-through text-theme-text-muted/60">R$ 717,60</span>
                <span className="text-base sm:text-lg font-black text-emerald-400">R$ 567,90</span>
                <span className="text-[9px] text-theme-text-muted">/ano</span>
              </div>
              <p className="text-[10px] font-black text-white mt-0.5">
                ou até 12x no cartão
              </p>
              <span className="inline-block mt-1 text-[9px] font-black text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Apenas R$ 47,32/mês!
              </span>
            </div>
          </div>

        </div>

        {/* ── UPSELL INTERATIVO DE LOTES (QUANDO SELECIONA MENSAL COMUM) ── */}
        {selectedPlan === 'monthly' && (
          <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-[#181824] border border-amber-500/40 rounded-2xl p-3 my-1 flex items-center justify-between gap-2.5 animate-scale-up shadow-lg">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-amber-500 text-black rounded font-mono">OPORTUNIDADE</span>
                <span className="text-[11px] font-black text-amber-300">Turbine com o Módulo de Lotes!</span>
              </div>
              <p className="text-[10px] text-zinc-300 mt-0.5 leading-tight">
                Adicione <strong>Lotes de Cria</strong> e <strong>Gestão de Ovos/Chocadeira</strong> por apenas <strong className="text-amber-400">+ R$ 19,90/mês</strong> (Total: R$ 59,80/mês).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPlan('pro_monthly')}
              className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-[10px] uppercase tracking-wide shrink-0 active:scale-95 transition-all shadow-md cursor-pointer"
            >
              Adicionar Lotes (+ R$ 19,90)
            </button>
          </div>
        )}

        {/* ── SELETOR DE FORMA DE PAGAMENTO (CARTÃO AUTOMÁTICO OU PIX À VISTA) ── */}
        <div className="flex rounded-xl bg-theme-base/80 p-1 border border-theme-border/70 gap-1 my-1">
          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              paymentMethod === 'card'
                ? 'bg-amber-500 text-black shadow-md font-black'
                : 'text-theme-text-muted hover:text-white'
            }`}
          >
            <CreditCard size={13} />
            <span>Cartão (Até 4x sem juros)</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('pix')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              paymentMethod === 'pix'
                ? 'bg-amber-500 text-black shadow-md font-black'
                : 'text-theme-text-muted hover:text-white'
            }`}
          >
            <QrCode size={13} />
            <span>PIX (À Vista Sem Cartão)</span>
          </button>
        </div>

        {/* ── ÁREA DE PAGAMENTO DINÂMICA ── */}
        {paymentMethod === 'card' ? (
          /* CARTÃO DE CRÉDITO */
          <div className="bg-theme-base/60 border border-theme-border/60 rounded-2xl p-3 sm:p-3.5 space-y-2.5 animate-fade-in">
            <div className="flex items-center gap-2 bg-theme-surface border border-theme-border/80 rounded-xl p-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <CreditCard size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white leading-tight">Cobrança no Cartão de Crédito</p>
                <p className="text-[9px] text-theme-text-muted mt-0.5">
                  {selectedPlan === 'yearly' 
                    ? 'Parcelamento em até 12x no cartão ou à vista no Pix. Liberação imediata.'
                    : 'Cobrança mensal recorrente com total comodidade. Cancele quando quiser a 1 clique.'}
                </p>
              </div>
            </div>

            {/* Campo CPF */}
            <div>
              <label className="text-[9px] font-bold text-theme-text-muted uppercase block mb-1">CPF cadastrado na sua conta</label>
              <input 
                type="text" 
                placeholder="Digite seu CPF..."
                value={paymentCpf}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
                  if (clean.length <= 3) setPaymentCpf(clean);
                  else if (clean.length <= 6) setPaymentCpf(`${clean.slice(0,3)}.${clean.slice(3)}`);
                  else if (clean.length <= 9) setPaymentCpf(`${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6)}`);
                  else setPaymentCpf(`${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9)}`);
                }}
                className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-1.5 text-xs text-white focus:border-theme-primary outline-none text-center font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5 pt-1">
              <a 
                href={getWhatsappLink('card')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={async () => {
                  const cleanCpf = paymentCpf.replace(/\D/g, '') || (cpf ? cpf.replace(/\D/g, '') : '');
                  if (cleanCpf && cleanCpf.length === 11) {
                    await linkCpfToUser(cleanCpf);
                  }
                }}
                className="w-full py-2.5 rounded-xl font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400 text-xs shadow-md cursor-pointer"
              >
                <CreditCard size={14} />
                <span>Ativar no Cartão ({getPlanPriceDisplay(selectedPlan)})</span>
              </a>

              <p className="text-[9px] text-center text-theme-text-muted flex items-center justify-center gap-1">
                <ShieldCheck size={11} className="text-emerald-400" />
                <span>Ambiente Seguro • Renovação transparente • Cancelamento sem multas</span>
              </p>
            </div>
          </div>
        ) : (
          /* PIX À VISTA */
          <div className="bg-theme-base/60 border border-theme-border/60 rounded-2xl p-3 sm:p-3.5 space-y-2.5 animate-fade-in">
            {/* Chave Pix e Botão Copiar */}
            <div className="flex items-center justify-between bg-theme-surface border border-theme-border/80 rounded-xl px-3 py-2 text-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-theme-text-muted block uppercase">Chave Pix Copia e Cola (À Vista)</span>
                  <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                    {selectedPlan === 'yearly' ? 'R$ 567,90' : selectedPlan === 'pro_monthly' ? 'R$ 59,80' : 'R$ 39,90'}
                  </span>
                </div>
                <span className="font-mono text-white text-xs truncate font-bold block mt-0.5" title={pixKey}>{pixKey}</span>
              </div>
              <button 
                type="button"
                onClick={handleCopyPix}
                className="p-1.5 text-theme-primary hover:text-white rounded-lg bg-theme-primary/10 hover:bg-theme-primary/20 transition-all flex items-center gap-1 font-bold text-[10px] shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    <span className="text-emerald-400">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copiar Pix</span>
                  </>
                )}
              </button>
            </div>

            {/* Campo CPF para liberação */}
            <div>
              <label className="text-[9px] font-bold text-theme-text-muted uppercase block mb-1">CPF cadastrado na sua conta</label>
              <input 
                type="text" 
                placeholder="Digite seu CPF para liberação..."
                value={paymentCpf}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
                  if (clean.length <= 3) setPaymentCpf(clean);
                  else if (clean.length <= 6) setPaymentCpf(`${clean.slice(0,3)}.${clean.slice(3)}`);
                  else if (clean.length <= 9) setPaymentCpf(`${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6)}`);
                  else setPaymentCpf(`${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9)}`);
                }}
                className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-1.5 text-xs text-white focus:border-theme-primary outline-none text-center font-mono font-bold"
              />
            </div>

            {/* Botões de Ação PIX */}
            <div className="space-y-1.5 pt-1">
              <button 
                type="button"
                onClick={async () => {
                  const cleanCpf = paymentCpf.replace(/\D/g, '') || (cpf ? cpf.replace(/\D/g, '') : '');
                  if (!cleanCpf || cleanCpf.length !== 11) {
                    showToast('Por favor, digite os 11 dígitos do seu CPF para vincular à sua conta e liberar o acesso.', 'warning');
                    return;
                  }

                  const { error: linkErr } = await linkCpfToUser(cleanCpf);
                  if (linkErr) {
                    showToast(`Erro ao vincular CPF: ${linkErr.message}`, 'error');
                    return;
                  }

                  const { error } = await triggerWebhookPayment(selectedPlan, cleanCpf);
                  if (error) {
                    showToast('Erro ao enviar notificação de liberação.', 'error');
                  } else {
                    showToast('Solicitação de liberação enviada com sucesso! Seu CPF foi vinculado à sua conta.', 'success');
                  }
                }}
                className="w-full py-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400 text-xs shadow-md cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Confirmar Pagamento & Liberação Instantânea</span>
              </button>

              <a 
                href={getWhatsappLink('pix')}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-theme-text-muted hover:text-white bg-theme-surface border border-theme-border text-[10px]"
              >
                <MessageSquare size={13} />
                <span>Enviar Comprovante PIX via WhatsApp</span>
              </a>
            </div>
          </div>
        )}

        {/* Sair da conta */}
        <div className="flex justify-center pt-1">
          <button 
            type="button"
            onClick={signOut}
            className="flex items-center gap-1.5 text-[11px] text-theme-text-muted hover:text-red-400 transition-colors font-bold px-2 py-1 hover:bg-red-500/10 rounded-lg cursor-pointer"
          >
            <LogOut size={12} />
            <span>Sair da minha conta</span>
          </button>
        </div>

      </div>
    </div>
  );
}
