import { useState, useEffect, useRef } from 'react';
import { 
  X, Check, Copy, CheckCircle2, AlertCircle, Loader2,
  CreditCard, QrCode, ShieldCheck, Sparkles, 
  RefreshCw, Star, ArrowLeft
} from 'lucide-react';
import type { SubscriptionPlan } from '../../lib/AuthContext';
import roosterImg from '../../assets/rooster_sticker.png';
import muraLogo from '../../assets/mura_logo.jpg';
import visaLogo from '../../assets/payments/visa.png';
import mastercardLogo from '../../assets/payments/mastercard.png';
import mercadoPagoLogo from '../../assets/payments/mercado-pago.png';

const WORKER_URL = 'https://mura-api.joaopaulojaguar.workers.dev';
const MP_PUBLIC_KEY = 'APP_USR-2502a3c7-5f59-45b0-8365-1cfcad7b0fa5';

// Validação de CPF
function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10))) return false;
  return true;
}

function isValidCardExpiry(exp: string): boolean {
  const [m, y] = exp.split('/');
  if (!m || !y || m.length !== 2 || y.length !== 2) return false;
  const month = parseInt(m, 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  const year = parseInt(y, 10);
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}

export interface RenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: SubscriptionPlan | 'trial';
  daysRemaining?: number;
  currentUser?: {
    cpf?: string;
    nome?: string;
    email?: string;
    whatsapp?: string;
  };
  onRenewSuccess: (renewedPlan: SubscriptionPlan) => Promise<any> | void;
}

export function RenewalModal({
  isOpen,
  onClose,
  currentPlan = 'monthly',
  daysRemaining = 0,
  currentUser,
  onRenewSuccess,
}: RenewalModalProps) {
  // Planos disponíveis para a renovação
  const planDetails: Record<SubscriptionPlan, { title: string; price: number; priceFormatted: string; period: string }> = {
    monthly: {
      title: 'Mensal Comum',
      price: 39.90,
      priceFormatted: 'R$ 39,90',
      period: 'mês'
    },
    pro_monthly: {
      title: 'Mensal Completo',
      price: 59.80,
      priceFormatted: 'R$ 59,80',
      period: 'mês'
    },
    yearly: {
      title: 'Anual Completo',
      price: 567.90,
      priceFormatted: 'R$ 567,90',
      period: 'ano'
    }
  };

  // Determina o plano inicial com base no plano atual
  const activePlan: SubscriptionPlan = currentPlan === 'pro_monthly' || currentPlan === 'yearly' ? currentPlan : 'monthly';

  // Estados principais
  const [selectedRenewPlan, setSelectedRenewPlan] = useState<SubscriptionPlan>(activePlan);
  const [step, setStep] = useState<'offer' | 'payment' | 'success'>('offer');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');

  // Estados do PIX
  const [pixData, setPixData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  // Estados do Cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState(currentUser?.cpf || '');
  const [installments, setInstallments] = useState(1);

  const pollingRef = useRef<any>(null);

  // Reinicia estado ao abrir
  useEffect(() => {
    if (isOpen) {
      setSelectedRenewPlan(activePlan);
      setStep('offer');
      setPaymentMethod('pix');
      setPixData(null);
      setError('');
      setCopied(false);
      if (currentUser?.cpf) setCardCpf(currentUser.cpf);
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, activePlan, currentUser]);

  if (!isOpen) return null;

  const currentPlanInfo = planDetails[selectedRenewPlan];

  // Disparo da geração de PIX
  const generatePixForPlan = async (plan: SubscriptionPlan) => {
    setLoading(true);
    setError('');
    const targetPlanInfo = planDetails[plan];
    const cleanCpf = (currentUser?.cpf || '').replace(/\D/g, '') || '00000000000';
    const cleanEmail = currentUser?.email || 'contato@muramanager.com';
    const cleanName = currentUser?.nome || 'Cliente Mura Manager';
    const cleanPhone = (currentUser?.whatsapp || '').replace(/\D/g, '');

    const idempotencyKey = `renew-pix-${cleanCpf}-${plan}-${targetPlanInfo.price.toFixed(2)}-${Date.now()}`;

    try {
      const res = await fetch(`${WORKER_URL}/api/checkout/pix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          items: [{
            id: `renew_${plan}`,
            title: `Renovação Mura Manager - ${targetPlanInfo.title}`,
            price: targetPlanInfo.price,
          }],
          customer: {
            name: cleanName,
            email: cleanEmail,
            cpf: cleanCpf,
            phone: cleanPhone,
          },
          site: 'mura_app',
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.qr_code) {
        setError(data.error || 'Erro ao gerar o código PIX. Tente novamente.');
        setLoading(false);
        return;
      }

      setPixData(data);
      setStep('payment');
      startPolling(data.id, plan);
    } catch {
      setError('Falha de conexão ao gerar o PIX de renovação. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // Inicia escuta automática do pagamento
  const startPolling = (paymentId: string, plan: SubscriptionPlan) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let attempts = 0;

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 120) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }
      try {
        const res = await fetch(`${WORKER_URL}/api/checkout/payment/${paymentId}`);
        const data = await res.json();
        if (data.status === 'approved') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          handleSuccess(plan);
        }
      } catch (err) {
        console.error('Erro no polling de renovação:', err);
      }
    }, 3000);
  };

  const handleVerifyManual = async () => {
    if (!pixData?.id) return;
    setVerifying(true);
    setError('');
    try {
      const res = await fetch(`${WORKER_URL}/api/checkout/payment/${pixData.id}`);
      const data = await res.json();
      if (data.status === 'approved') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        handleSuccess(selectedRenewPlan);
      } else {
        setError('O pagamento ainda não foi processado pelo banco. Aguarde mais alguns instantes.');
      }
    } catch {
      setError('Erro ao verificar pagamento. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSuccess = async (plan: SubscriptionPlan) => {
    setStep('success');
    try {
      await onRenewSuccess(plan);
    } catch (err) {
      console.error('Erro ao executar callback de renovação:', err);
    }
    setTimeout(() => {
      onClose();
    }, 2200);
  };

  // Pagamento via Cartão de Crédito
  const handlePagarCartao = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCardDigits = cardNumber.replace(/\s/g, '');
    if (cleanCardDigits.length < 15) { setError('Número de cartão de crédito incompleto.'); return; }
    if (!cardName.trim() || cardName.trim().split(/\s+/).length < 2) { setError('Informe o nome completo impresso no cartão.'); return; }
    if (!isValidCardExpiry(cardExpiry)) { setError('Validade do cartão expirada ou inválida (MM/AA).'); return; }
    if (cardCvv.length < 3) { setError('Código CVV inválido.'); return; }
    if (!isValidCPF(cardCpf)) { setError('CPF do titular do cartão inválido.'); return; }

    setError('');
    setLoading(true);

    const [expMonth, expYearShort] = cardExpiry.split('/');
    const expYear = expYearShort?.length === 2 ? `20${expYearShort}` : expYearShort;
    const cleanAccountCpf = (currentUser?.cpf || '').replace(/\D/g, '') || '00000000000';
    const cleanCardholderCpf = cardCpf.replace(/\D/g, '');
    const cleanEmail = currentUser?.email || 'contato@muramanager.com';

    try {
      const tokenRes = await fetch(
        `https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_number: cleanCardDigits,
            cardholder: {
              name: cardName.toUpperCase(),
              identification: { type: 'CPF', number: cleanCardholderCpf },
            },
            security_code: cardCvv,
            expiration_month: Number(expMonth),
            expiration_year: Number(expYear),
          }),
        }
      );

      const tokenData = await tokenRes.json();
      if (!tokenData.id) {
        setError(tokenData.cause?.[0]?.description || 'Dados do cartão recusados. Verifique número, validade e CVV.');
        setLoading(false);
        return;
      }

      const isSubscription = selectedRenewPlan === 'monthly' || selectedRenewPlan === 'pro_monthly';
      const endpoint = isSubscription 
        ? `${WORKER_URL}/api/checkout/subscription` 
        : `${WORKER_URL}/api/checkout/card`;

      const payload = isSubscription ? {
        token: tokenData.id,
        plan: selectedRenewPlan,
        customer: {
          name: cardName.trim(),
          email: cleanEmail,
          cpf: cleanAccountCpf,
          phone: (currentUser?.whatsapp || '').replace(/\D/g, ''),
        },
        site: 'mura_app',
      } : {
        token: tokenData.id,
        plan: selectedRenewPlan,
        installments: Number(installments) || 1,
        items: [{
          id: `renew_${selectedRenewPlan}`,
          title: `Renovação Mura Manager - ${currentPlanInfo.title}`,
          price: currentPlanInfo.price,
        }],
        customer: {
          name: cardName.trim(),
          email: cleanEmail,
          cpf: cleanAccountCpf,
          phone: (currentUser?.whatsapp || '').replace(/\D/g, ''),
        },
        site: 'mura_app',
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Cartão não autorizado pela operadora. Verifique os dados ou tente outro cartão.');
        setLoading(false);
        return;
      }

      if (data.status === 'approved' || data.status === 'authorized') {
        handleSuccess(selectedRenewPlan);
      } else if (data.status === 'in_process' || data.status === 'pending') {
        setError('Pagamento em análise pelo Mercado Pago. Aguarde alguns instantes.');
      } else {
        setError(data.status_detail || 'Pagamento recusado pela operadora do cartão.');
      }
    } catch {
      setError('Falha de conexão com o gateway de pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Formatação de inputs
  const formatCardNumber = (val: string) => {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
  };
  const formatExpiry = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length > 2) return `${clean.slice(0, 2)}/${clean.slice(2)}`;
    return clean;
  };
  const formatCPFInput = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 11);
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      .replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
      .replace(/(\d{3})(\d{1,3})/, '$1.$2');
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-3 sm:p-4 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#121218] border border-theme-border/80 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative animate-scale-up my-auto flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Marca d'água sutil do galo no fundo do modal */}
        <div 
          className="absolute -bottom-8 -right-8 w-60 h-60 pointer-events-none opacity-[0.04] select-none z-0"
          style={{
            backgroundImage: `url(${roosterImg})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />

        {/* ── HEADER MODERNO DO CHECKOUT ── */}
        <div className="relative z-10 px-5 py-4 border-b border-theme-border/70 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-[#181822] to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black/50 border border-white/10 p-1 flex items-center justify-center shrink-0 shadow-inner">
              <img src={muraLogo} alt="Mura Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm text-white">Renovação de Assinatura</h3>
                <span className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                  Oficial
                </span>
              </div>
              <p className="text-[10px] text-theme-text-muted mt-0.5 flex items-center gap-1">
                <ShieldCheck size={11} className="text-emerald-400" />
                <span>Mercado Pago Gateway • Criptografia Bancária SSL</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-theme-text-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── CORPO DO MODAL ── */}
        <div className="relative z-10 p-5 overflow-y-auto space-y-4 modal-scrollable-content flex-1">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-400 text-xs font-semibold flex items-center gap-2 animate-shake">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ETAPA 1: ESCOLHA DO PLANO / OFERTA INTELIGENTE       */}
          {/* ══════════════════════════════════════════════════════ */}
          {step === 'offer' && (
            <div className="space-y-4 animate-fade-in">
              {/* Aviso de Vencimento */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                daysRemaining <= 0 
                  ? 'bg-red-500/10 border-red-500/25 text-red-300' 
                  : daysRemaining <= 3 
                  ? 'bg-orange-500/10 border-orange-500/25 text-orange-300' 
                  : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
              }`}>
                <div className="flex items-center gap-2">
                  <RefreshCw size={15} className="animate-spin" style={{ animationDuration: '8s' }} />
                  <div>
                    <p className="font-bold text-white text-xs">
                      {daysRemaining <= 0 
                        ? 'Sua assinatura está vencida!' 
                        : daysRemaining === 1 
                        ? 'Sua assinatura vence amanhã!' 
                        : `Sua assinatura vai vencer em ${daysRemaining} dias.`}
                    </p>
                    <p className="text-[10.5px] opacity-80 mt-0.5">
                      Renove agora e os novos 30 dias serão somados ao seu tempo atual.
                    </p>
                  </div>
                </div>
              </div>

              {/* ── CASO 1: CLIENTE COM PLANO MENSAL COMUM -> OFERTA UPSELL LOTES ── */}
              {activePlan === 'monthly' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-white">Deseja continuar no mesmo plano ou turbinar seu criatório?</p>

                  {/* Card do Plano Atual */}
                  <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-theme-text-muted">Seu Plano Atual</span>
                      <p className="text-xs font-bold text-white">Mensal Comum (Aves e Vitrine)</p>
                    </div>
                    <span className="text-xs font-black text-white font-mono">R$ 39,90/mês</span>
                  </div>

                  {/* Card Oportunidade de Upsell de Lotes e Ovos */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-transparent border border-amber-500/40 shadow-lg shadow-amber-500/5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-amber-500 text-black rounded-full font-mono">
                        OPORTUNIDADE EXCLUSIVA
                      </span>
                      <span className="text-xs font-black text-amber-400 font-mono">+ R$ 19,90/mês</span>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-400" />
                        Turbine com o Módulo de Lotes e Ovos!
                      </h4>
                      <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                        Desbloqueie controle total de ninhadas, chocadeiras, taxa de eclosão, postura e lotes de engorda.
                      </p>
                    </div>

                    <ul className="space-y-1 text-[10.5px] text-zinc-300">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-amber-400 shrink-0" />
                        <span>Gestão de chocadeiras e ovos com alertas de eclosão</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-amber-400 shrink-0" />
                        <span>Controle de lotes de engorda, postura e recria</span>
                      </li>
                    </ul>

                    {/* Botões de Decisão */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRenewPlan('pro_monthly');
                          generatePixForPlan('pro_monthly');
                        }}
                        disabled={loading}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : (
                          <>
                            <Sparkles size={13} />
                            <span>Sim! Adicionar Lotes (R$ 59,80)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRenewPlan('monthly');
                          generatePixForPlan('monthly');
                        }}
                        disabled={loading}
                        className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-bold text-xs transition-all active:scale-95 cursor-pointer text-center"
                      >
                        Continuar no Mensal Comum (R$ 39,90)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CASO 2: CLIENTE COM PLANO MENSAL COMPLETO -> OFERTA PLANO ANUAL COM DESCONTO ── */}
              {activePlan === 'pro_monthly' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-white">Deseja continuar no mesmo plano ou economizar no Anual?</p>

                  {/* Card do Plano Atual */}
                  <div className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-theme-text-muted">Seu Plano Atual</span>
                      <p className="text-xs font-bold text-white">Mensal Completo (Tudo Incluso)</p>
                    </div>
                    <span className="text-xs font-black text-white font-mono">R$ 59,80/mês</span>
                  </div>

                  {/* Card Oportunidade Anual com Desconto */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent border border-emerald-500/40 shadow-lg shadow-emerald-500/5 space-y-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-500 text-black rounded-full font-mono">
                        ECONOMIZE R$ 149,70 NO ANO
                      </span>
                      <span className="text-xs font-black text-emerald-400 font-mono">21% OFF</span>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                        <Star size={14} className="text-emerald-400 fill-emerald-400" />
                        Migre para o Anual Completo com Desconto!
                      </h4>
                      <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                        De <span className="line-through text-zinc-500">R$ 717,60</span> por apenas <strong className="text-emerald-400 font-black">R$ 567,90/ano</strong> (apenas R$ 47,32/mês). 1 ano inteiro de tranquilidade sem cobranças todo mês!
                      </p>
                    </div>

                    <ul className="space-y-1 text-[10.5px] text-zinc-300">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                        <span>Acesso liberado 100% irrestrito por 365 dias</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                        <span>Parcelamento facilitado em até 12x no cartão</span>
                      </li>
                    </ul>

                    {/* Botões de Decisão */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRenewPlan('yearly');
                          generatePixForPlan('yearly');
                        }}
                        disabled={loading}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : (
                          <>
                            <Star size={13} />
                            <span>Aproveitar Desconto: Mudar para Anual (R$ 567,90)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRenewPlan('pro_monthly');
                          generatePixForPlan('pro_monthly');
                        }}
                        disabled={loading}
                        className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-bold text-xs transition-all active:scale-95 cursor-pointer text-center"
                      >
                        Continuar no Mensal Completo (R$ 59,80)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CASO 3: CLIENTE COM PLANO ANUAL COMPLETO -> RENOVAR ANUAL COM DESCONTO ── */}
              {activePlan === 'yearly' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-white">Renove seu Plano Anual Completo com 21% OFF garantido</p>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent border border-emerald-500/40 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-500 text-black rounded-full font-mono">
                        PLANO ANUAL VIP
                      </span>
                      <span className="text-sm font-black text-emerald-400 font-mono">R$ 567,90/ano</span>
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      Garanta mais 365 dias de acesso total com suporte prioritário e todos os módulos liberados.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRenewPlan('yearly');
                        generatePixForPlan('yearly');
                      }}
                      disabled={loading}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 text-black font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
                    >
                      {loading ? <Loader2 size={14} className="animate-spin" /> : (
                        <>
                          <RefreshCw size={13} />
                          <span>Renovar Anual Completo (R$ 567,90)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ETAPA 2: PAGAMENTO (QR CODE PIX OFICIAL / CARTÃO)    */}
          {/* ══════════════════════════════════════════════════════ */}
          {step === 'payment' && (
            <div className="space-y-4 animate-fade-in">
              {/* Barra superior de retorno para reescolher o plano */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    if (pollingRef.current) clearInterval(pollingRef.current);
                    setStep('offer');
                  }}
                  className="flex items-center gap-1.5 text-xs text-theme-text-muted hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  <span>Mudar plano</span>
                </button>
                <div className="text-right">
                  <span className="text-[10px] text-theme-text-muted block">Total a pagar:</span>
                  <span className="text-sm font-black text-amber-400 font-mono">
                    {currentPlanInfo.priceFormatted}
                  </span>
                </div>
              </div>

              {/* Seletor de Método de Pagamento */}
              <div className="flex rounded-xl bg-black/50 p-1 border border-white/[0.15] gap-1">
                <button
                  type="button"
                  onClick={() => { setPaymentMethod('pix'); setError(''); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'pix'
                      ? 'bg-amber-500 text-black shadow-md font-black'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <QrCode size={14} />
                  <span>PIX (QR Code Instantâneo)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPaymentMethod('card'); setError(''); }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'bg-amber-500 text-black shadow-md font-black'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <CreditCard size={14} />
                  <span>Cartão de Crédito</span>
                </button>
              </div>

              {/* ── PAGAMENTO VIA PIX COM QR CODE OFICIAL ── */}
              {paymentMethod === 'pix' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-bold text-white">QR Code PIX Gerado com Sucesso</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-black">
                      {currentPlanInfo.priceFormatted}
                    </span>
                  </div>

                  {/* QR Code Container */}
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner max-w-[220px] mx-auto">
                    {pixData?.qr_code_base64 ? (
                      <img 
                        src={`data:image/png;base64,${pixData.qr_code_base64}`} 
                        alt="QR Code PIX" 
                        className="w-48 h-48 object-contain rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-zinc-400">
                        <QrCode size={48} />
                      </div>
                    )}
                  </div>

                  {/* Chave Pix Copia e Cola */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-white/60 uppercase">Código PIX Copia e Cola:</span>
                      <span className="text-[9px] text-amber-400">Pague pelo app do seu banco</span>
                    </div>
                    <div className="flex items-center gap-2 bg-black/60 border border-white/15 rounded-xl p-2">
                      <input
                        type="text"
                        readOnly
                        value={pixData?.qr_code || ''}
                        className="bg-transparent text-white text-[11px] font-mono outline-none flex-1 truncate select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (pixData?.qr_code) {
                            navigator.clipboard.writeText(pixData.qr_code);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2500);
                          }
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                          copied ? 'bg-emerald-500 text-black' : 'bg-amber-500 hover:bg-amber-400 text-black'
                        }`}
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Status do Polling e Verificação Manual */}
                  <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-amber-300 text-xs">
                      <Loader2 size={14} className="animate-spin text-amber-400 shrink-0" />
                      <span className="leading-tight">Aguardando confirmação bancária...</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyManual}
                      disabled={verifying}
                      className="text-[10px] font-bold text-white bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      {verifying ? 'Verificando...' : 'Já paguei'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PAGAMENTO VIA CARTÃO DE CRÉDITO ── */}
              {paymentMethod === 'card' && (
                <form onSubmit={handlePagarCartao} className="space-y-3 animate-fade-in bg-black/50 p-3.5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-white flex items-center gap-1.5">
                      <CreditCard size={13} className="text-amber-400" />
                      <span>Dados do Cartão de Crédito</span>
                    </span>
                    <div className="flex items-center gap-1.5 opacity-80">
                      <img src={visaLogo} alt="Visa" className="h-4 object-contain" />
                      <img src={mastercardLogo} alt="Mastercard" className="h-4 object-contain" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/50 uppercase">Número do Cartão</label>
                    <input
                      type="text"
                      required
                      placeholder="0000 0000 0000 0000"
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                      className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/50 uppercase">Nome Impresso no Cartão</label>
                    <input
                      type="text"
                      required
                      placeholder="Como impresso no cartão"
                      value={cardName}
                      onChange={e => setCardName(e.target.value.toUpperCase())}
                      className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 transition-colors uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/50 uppercase">Validade (MM/AA)</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/AA"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/50 uppercase">CVV</label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        placeholder="123"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/50 uppercase">CPF do Titular do Cartão</label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={cardCpf}
                      onChange={e => setCardCpf(formatCPFInput(e.target.value))}
                      className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  {selectedRenewPlan === 'yearly' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/50 uppercase">Parcelas</label>
                      <select
                        value={installments}
                        onChange={e => setInstallments(Number(e.target.value))}
                        className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 transition-colors cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => {
                          const num = i + 1;
                          const val = (currentPlanInfo.price / num).toFixed(2).replace('.', ',');
                          return (
                            <option key={num} value={num} className="bg-zinc-900 text-white">
                              {num === 1 ? `1x de ${currentPlanInfo.priceFormatted} (À vista)` : `${num}x de R$ ${val} (Sem acréscimo)`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : (
                      <>
                        <CreditCard size={14} />
                        <span>Pagar {currentPlanInfo.priceFormatted} no Cartão</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ETAPA 3: SUCESSO                                     */}
          {/* ══════════════════════════════════════════════════════ */}
          {step === 'success' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h4 className="font-black text-lg text-white font-serif">Renovação Concluída com Sucesso!</h4>
                <p className="text-xs text-theme-text-muted mt-1 max-w-xs">
                  Seu acesso foi estendido e todos os recursos do plano <strong className="text-amber-400">{currentPlanInfo.title}</strong> estão 100% ativos.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Sparkles size={14} />
                <span>Atualizando seu aplicativo...</span>
              </div>
            </div>
          )}
        </div>

        {/* ── FOOTER SEGURO DO MODAL ── */}
        <div className="relative z-10 p-3.5 border-t border-theme-border/60 bg-black/40 flex items-center justify-between text-[10px] text-theme-text-muted">
          <div className="flex items-center gap-1.5">
            <img src={mercadoPagoLogo} alt="Mercado Pago" className="h-3.5 object-contain" />
            <span>Processado pelo Mercado Pago</span>
          </div>
          <span className="font-mono">Ambiente Criptografado</span>
        </div>
      </div>
    </div>
  );
}
