import { useState, useEffect, useRef } from 'react';
import { 
  X, Check, Copy, CheckCircle2, AlertCircle, Loader2,
  CreditCard, QrCode, ShieldCheck, Star, ArrowRight, Zap
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import localforage from 'localforage';
import type { SubscriptionPlan } from '../lib/AuthContext';
import heroBg from '../assets/hero_bg.jpg';

const WORKER_URL = 'https://mura-api.joaopaulojaguar.workers.dev';
const MP_PUBLIC_KEY = 'APP_USR-2502a3c7-5f59-45b0-8365-1cfcad7b0fa5';

// Validação de CPF real (dígitos verificadores)
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

// Validação de E-mail
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Validação de Validade de Cartão (MM/AA)
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

// Detecção pura da bandeira do cartão (0 hooks, ultra veloz)
function getDetectedBrand(cleanCardDigits: string) {
  if (cleanCardDigits.startsWith('4')) return { name: 'Visa', color: 'text-sky-400 bg-sky-500/20 border-sky-500/40' };
  if (/^5[1-5]/.test(cleanCardDigits) || /^2[2-7]/.test(cleanCardDigits)) return { name: 'Mastercard', color: 'text-amber-400 bg-amber-500/20 border-amber-500/40' };
  if (/^(4011|4389|4514|4576|5041|5066|5067|509|6277|6362|6363|650|6516|6550)/.test(cleanCardDigits) || cleanCardDigits.startsWith('6')) return { name: 'Elo', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40' };
  if (/^3[47]/.test(cleanCardDigits)) return { name: 'Amex', color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40' };
  return null;
}

interface LandingCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan: SubscriptionPlan;
  signIn: (identifier: string, pass: string) => Promise<{ error: any }>;
}

export function LandingCheckoutModal({
  isOpen,
  onClose,
  initialPlan,
  signIn,
}: LandingCheckoutModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(initialPlan);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');

  // Dados da Conta
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');

  // Dados do Cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardCpf, setCardCpf] = useState('');
  const [sameAsAccountCpf, setSameAsAccountCpf] = useState(true);
  const [installments, setInstallments] = useState(1);

  // Estados de toque (para feedback inteligente nos inputs)
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Estados de Operação
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'pix' | 'success'>('form');
  const [pixData, setPixData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const pollingRef = useRef<any>(null);

  useEffect(() => {
    setSelectedPlan(initialPlan);
    setStep('form');
    setError('');
    setPixData(null);
    setTouched({});
    setInstallments(1);
  }, [initialPlan, isOpen]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Se o usuário marcar "mesmo CPF da conta", sincroniza
  useEffect(() => {
    if (sameAsAccountCpf && cpf) {
      setCardCpf(cpf);
    }
  }, [cpf, sameAsAccountCpf]);

  if (!isOpen) return null;

  // Planos com ancoragem de preço (riscado) e lista de benefícios
  const planInfo = {
    monthly: {
      title: 'Mensal Comum',
      originalPrice: 'R$ 59,90',
      price: 39.90,
      priceFormatted: 'R$ 39,90',
      discountBadge: '33% OFF',
      period: 'mês',
      days: 30,
      tag: '[COMUM]',
      benefits: [
        'Cadastro ilimitado de aves, linhagens e baias',
        'Ficha técnica genealógica com fotos em alta definição',
        'Vitrine Digital exclusiva para vendas no WhatsApp',
        'Sincronização em tempo real entre celular e computador'
      ]
    },
    pro_monthly: {
      title: 'Mensal Completo',
      originalPrice: 'R$ 89,90',
      price: 59.80,
      priceFormatted: 'R$ 59,80',
      discountBadge: '33% OFF',
      period: 'mês',
      days: 30,
      tag: '[COMPLETO]',
      benefits: [
        'Tudo do Plano Comum (Aves, Fotos e Vitrine)',
        'Controle completo de Lotes de Postura e Engorda',
        'Gestão de Chocadeira, Ovos e Taxa de Eclosão',
        'Alertas automáticos de vacinação e pesagem de plantel'
      ]
    },
    yearly: {
      title: 'Anual Completo',
      originalPrice: 'R$ 717,60',
      price: 567.90,
      priceFormatted: 'R$ 567,90',
      discountBadge: '21% OFF • ECONOMIZE R$ 149,70',
      period: 'ano',
      days: 365,
      tag: '[ANUAL]',
      benefits: [
        'Acesso 100% irrestrito a todos os recursos por 1 ano',
        'Aves, Vitrine + Lotes inteiros e Gestão de Ovos inclusos',
        'Equivale a apenas R$ 47,32/mês com desconto total',
        'Suporte prioritário VIP direto com o desenvolvedor'
      ]
    }
  }[selectedPlan];

  // Opções de parcelas inteligentes (até 12x no anual, até 4x no mensal)
  const maxInstallments = selectedPlan === 'yearly' ? 12 : 4;
  const installmentOptions = Array.from({ length: maxInstallments }, (_, i) => {
    const num = i + 1;
    const val = (planInfo.price / num).toFixed(2).replace('.', ',');
    return {
      value: num,
      label: num === 1 
        ? `1x de ${planInfo.priceFormatted} (À vista)` 
        : `${num}x de R$ ${val} (Sem acréscimo)`
    };
  });

  // Validações em tempo real para cada campo
  const isNomeValid = nome.trim().split(/\s+/).length >= 2 && nome.trim().length >= 5;
  const isEmailValid = isValidEmail(email);
  const isWhatsappValid = whatsapp.replace(/\D/g, '').length >= 10;
  const isCpfValid = isValidCPF(cpf);
  const isSenhaValid = senha.length >= 6;

  // Validações do Cartão
  const cleanCardDigits = cardNumber.replace(/\s/g, '');
  const isCardNumberValid = cleanCardDigits.length >= 15 && cleanCardDigits.length <= 16;
  const isCardNameValid = cardName.trim().split(/\s+/).length >= 2;
  const isCardExpiryValid = isValidCardExpiry(cardExpiry);
  const isCardCvvValid = cardCvv.length >= 3 && cardCvv.length <= 4;
  const isCardCpfValid = isValidCPF(cardCpf);

  // Detecção automática de bandeira (0 hooks, instantâneo)
  const detectedBrand = getDetectedBrand(cleanCardDigits);

  const markTouched = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Helper de ativação da conta após aprovação no MP
  const handleLiberarConta = async (cleanCpf: string, cleanEmail: string, userSenha: string) => {
    try {
      const expiresAt = new Date(Date.now() + planInfo.days * 86400000).toISOString();
      const taggedNome = `${nome.trim()} ${planInfo.tag}`.trim();

      if (isSupabaseConfigured) {
        const { error: upsertErr } = await supabase!
          .from('allowed_cpfs')
          .upsert({
            cpf: cleanCpf,
            nome: taggedNome,
            email: cleanEmail,
            whatsapp: whatsapp.replace(/\D/g, '') || null,
            senha: userSenha,
            expires_at: expiresAt
          }, { onConflict: 'email' });

        if (upsertErr) {
          console.warn('Erro ao atualizar allowed_cpfs:', upsertErr);
        }

        await supabase!.auth.signUp({
          email: cleanEmail,
          password: userSenha,
          options: {
            data: {
              full_name: nome.trim(),
              cpf: cleanCpf,
              plan: selectedPlan
            }
          }
        }).catch(() => {});
      } else {
        const localList = (await localforage.getItem<any[]>('@mura-manager:local-allowed-cpfs')) || [];
        const idx = localList.findIndex(item => item.email === cleanEmail || item.cpf === cleanCpf);
        const entry = {
          cpf: cleanCpf,
          nome: taggedNome,
          email: cleanEmail,
          whatsapp: whatsapp.replace(/\D/g, ''),
          senha: userSenha,
          expires_at: expiresAt
        };
        if (idx >= 0) localList[idx] = entry;
        else localList.push(entry);
        await localforage.setItem('@mura-manager:local-allowed-cpfs', localList);
      }

      try {
        localStorage.setItem('@mura-manager:user-cpf', cleanCpf);
        localStorage.setItem('@mura-manager:user-plan', selectedPlan);
        await localforage.setItem(`@mura-manager:user-plan:${cleanEmail}`, selectedPlan);
        await localforage.setItem(`@mura-manager:user-is-paid:${cleanEmail}`, 'true');
        await localforage.setItem(`@mura-manager:locked-trial-expires:${cleanEmail}`, expiresAt);
      } catch {}

      setStep('success');

      setTimeout(async () => {
        await signIn(cleanEmail, userSenha);
        onClose();
      }, 1800);
    } catch (e) {
      console.error('Erro ao liberar conta pós-pagamento:', e);
    }
  };

  const startPolling = (paymentId: string, cleanCpf: string, cleanEmail: string, userSenha: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let attempts = 0;

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 100) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }
      try {
        const res = await fetch(`${WORKER_URL}/api/checkout/payment/${paymentId}`);
        const data = await res.json();
        if (data.status === 'approved') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          await handleLiberarConta(cleanCpf, cleanEmail, userSenha);
        }
      } catch (err) {
        console.error('Erro no polling de pagamento:', err);
      }
    }, 3000);
  };

  const handleVerificarManual = async () => {
    if (!pixData?.id) return;
    setVerifying(true);
    setError('');
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch(`${WORKER_URL}/api/checkout/payment/${pixData.id}`);
      const data = await res.json();
      if (data.status === 'approved') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        await handleLiberarConta(cleanCpf, cleanEmail, senha);
      } else {
        setError('O pagamento ainda não foi identificado pelo banco. Aguarde alguns instantes e clique novamente.');
      }
    } catch {
      setError('Erro de conexão ao verificar pagamento. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  const validateCustomer = () => {
    if (!isNomeValid) { setError('Informe seu nome completo (nome e sobrenome).'); return false; }
    if (!isEmailValid) { setError('Informe um e-mail válido (ex: seu@email.com).'); return false; }
    if (!isWhatsappValid) { setError('Informe um número de WhatsApp válido com DDD.'); return false; }
    if (!isCpfValid) { setError('Informe um CPF válido para ativação da sua conta.'); return false; }
    if (!isSenhaValid) { setError('Crie uma senha de acesso com no mínimo 6 caracteres.'); return false; }
    return true;
  };

  const handleGerarPix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCustomer()) return;

    setError('');
    setLoading(true);

    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch(`${WORKER_URL}/api/checkout/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: `plano_${selectedPlan}`,
            title: `Mura Manager - ${planInfo.title}`,
            price: planInfo.price
          }],
          customer: {
            name: nome.trim(),
            email: cleanEmail,
            cpf: cleanCpf,
            phone: whatsapp.replace(/\D/g, '') || ''
          },
          site: 'mura_app'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.qr_code) {
        setError(data.error || 'Erro ao gerar o código PIX. Verifique os dados informados.');
        setLoading(false);
        return;
      }

      setPixData(data);
      setStep('pix');
      startPolling(data.id, cleanCpf, cleanEmail, senha);
    } catch {
      setError('Falha de conexão com o gateway de pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePagarCartao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCustomer()) return;

    if (!isCardNumberValid) { setError('Número de cartão de crédito incompleto ou inválido.'); return; }
    if (!isCardNameValid) { setError('Informe o nome completo impresso no cartão de crédito.'); return; }
    if (!isCardExpiryValid) { setError('Validade do cartão expirada ou inválida (MM/AA).'); return; }
    if (!isCardCvvValid) { setError('Código de segurança (CVV) inválido.'); return; }
    if (!isCardCpfValid) { setError('Informe um CPF válido do titular do cartão de crédito.'); return; }

    setError('');
    setLoading(true);

    const cleanAccountCpf = cpf.replace(/\D/g, '');
    const cleanCardholderCpf = cardCpf.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();
    const cardDigits = cardNumber.replace(/\s/g, '');
    const [expMonth, expYearShort] = cardExpiry.split('/');
    const expYear = expYearShort?.length === 2 ? `20${expYearShort}` : expYearShort;

    try {
      // 1. Tokenização via API oficial do Mercado Pago com o CPF do Titular do Cartão
      const tokenRes = await fetch(
        `https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_number: cardDigits,
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
        const errMsg = tokenData.cause?.[0]?.description || tokenData.message || 'Dados do cartão recusados. Verifique número, validade e CVV.';
        setError(errMsg);
        setLoading(false);
        return;
      }

      // 2. Detecta bandeira
      const firstDigit = cardDigits[0];
      const paymentMethodId = firstDigit === '4' ? 'visa'
        : firstDigit === '5' ? 'master'
        : firstDigit === '3' ? 'amex'
        : firstDigit === '6' ? 'elo'
        : 'visa';

      // 3. Processa no Worker
      const res = await fetch(`${WORKER_URL}/api/checkout/card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            id: `plano_${selectedPlan}`,
            title: `Mura Manager - ${planInfo.title}`,
            price: planInfo.price
          }],
          customer: {
            name: nome.trim(),
            email: cleanEmail,
            cpf: cleanAccountCpf,
            phone: whatsapp.replace(/\D/g, '') || ''
          },
          token: tokenData.id,
          installments: Number(installments),
          payment_method_id: paymentMethodId,
          site: 'mura_app',
        }),
      });

      const data = await res.json();

      if (data.status === 'approved') {
        await handleLiberarConta(cleanAccountCpf, cleanEmail, senha);
      } else if (data.status === 'in_process' || data.status === 'pending') {
        startPolling(data.id, cleanAccountCpf, cleanEmail, senha);
        setError('O pagamento está sendo processado pela operadora do seu cartão. Aguarde um instante...');
      } else {
        setError(data.status_detail || data.error || 'Pagamento recusado pela operadora. Verifique o limite ou tente outro cartão.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao processar cobrança do cartão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl bg-[#111116] border border-white/20 my-auto relative transform-gpu">
        
        {/* ══════════════════════════════════════════════════════ */}
        {/* FOTO FIXA DE FUNDO: O GALO DA PÁGINA INICIAL          */}
        {/* ══════════════════════════════════════════════════════ */}
        <div 
          aria-hidden="true" 
          className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none"
        >
          <img
            src={heroBg}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover object-[center_20%] opacity-35 scale-105 transform-gpu"
          />
          {/* Máscara equilibrada: escurece o suficiente para leitura mas deixa o galo 100% visível */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#111116]/80 via-[#111116]/65 to-[#111116]/90" />
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 70% 50% at 50% 15%, rgba(245, 158, 11, 0.12) 0%, transparent 70%)'
            }}
          />
        </div>

        {/* Header do Checkout */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.1] flex justify-between items-center bg-[#15151c]/95 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black shadow-sm">
              M
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                <span>Checkout Oficial</span>
                <span className="text-[9px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-mono uppercase font-bold">
                  100% Seguro
                </span>
              </h3>
              <p className="text-[10px] text-white/50">Mercado Pago Gateway • Criptografia Bancária SSL</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[84vh] overflow-y-auto relative z-10 overscroll-contain">
          
          {/* ══════════════════════════════════════════════════════ */}
          {/* CARD DE PLANO SELECIONADO (SOBREPOSIÇÃO + BENEFÍCIOS)  */}
          {/* ══════════════════════════════════════════════════════ */}
          <div className="p-4 rounded-2xl bg-black/60 border border-amber-500/40 shadow-lg space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Plano Selecionado
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                    {planInfo.discountBadge}
                  </span>
                </div>
                <h4 className="text-lg font-black text-white mt-1">{planInfo.title}</h4>
              </div>

              {/* Preço com ancoragem / corte */}
              <div className="text-right">
                <span className="text-xs line-through text-white/40 font-bold block">
                  {planInfo.originalPrice}
                </span>
                <div className="flex items-baseline justify-end gap-1">
                  <span className="text-2xl font-black text-amber-400 tracking-tight">
                    {planInfo.priceFormatted}
                  </span>
                  <span className="text-[10px] text-white/50 font-bold">/{planInfo.period}</span>
                </div>
              </div>
            </div>

            {/* Lista resumida de benefícios */}
            <div className="pt-2 border-t border-white/[0.1] space-y-1.5">
              {planInfo.benefits.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px] text-white/90">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <Check size={8} className="text-emerald-400" />
                  </div>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* MENSAGEM DE ERRO */}
          {error && (
            <div className="p-3 rounded-xl text-xs font-bold flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ETAPA 1: FORMULÁRIO DE DADOS E PAGAMENTO              */}
          {/* ══════════════════════════════════════════════════════ */}
          {step === 'form' && (
            <div className="space-y-4">
              {/* Seletor PIX / Cartão */}
              <div className="flex rounded-xl bg-black/50 p-1 border border-white/[0.12] gap-1">
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
                  <span>PIX Instantâneo</span>
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

              {/* Formulário Principal */}
              <form onSubmit={paymentMethod === 'pix' ? handleGerarPix : handlePagarCartao} className="space-y-3">
                
                {/* Nome Completo */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-white/50 uppercase">Nome Completo</label>
                    {touched.nome && (
                      <span className={`text-[9px] font-bold ${isNomeValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isNomeValid ? '✓ Válido' : 'Nome e sobrenome'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Seu nome completo"
                      value={nome}
                      onBlur={() => markTouched('nome')}
                      onChange={e => setNome(e.target.value)}
                      className={`w-full bg-black/60 border rounded-xl p-2.5 text-xs text-white outline-none transition-colors ${
                        touched.nome 
                          ? isNomeValid ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-amber-500/50 focus:border-amber-500'
                          : 'border-white/[0.15] focus:border-amber-500'
                      }`}
                    />
                    {isNomeValid && (
                      <CheckCircle2 size={13} className="absolute right-3 top-3 text-emerald-400" />
                    )}
                  </div>
                </div>

                {/* E-mail e WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-white/50 uppercase">E-mail</label>
                      {touched.email && (
                        <span className={`text-[9px] font-bold ${isEmailValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isEmailValid ? '✓ Válido' : 'E-mail incorreto'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="seu@email.com"
                        value={email}
                        onBlur={() => markTouched('email')}
                        onChange={e => setEmail(e.target.value)}
                        className={`w-full bg-black/60 border rounded-xl p-2.5 text-xs text-white outline-none transition-colors ${
                          touched.email 
                            ? isEmailValid ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-amber-500/50 focus:border-amber-500'
                            : 'border-white/[0.15] focus:border-amber-500'
                        }`}
                      />
                      {isEmailValid && (
                        <CheckCircle2 size={13} className="absolute right-3 top-3 text-emerald-400" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-white/50 uppercase">WhatsApp</label>
                      {touched.whatsapp && (
                        <span className={`text-[9px] font-bold ${isWhatsappValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isWhatsappValid ? '✓ Válido' : 'Com DDD'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        value={whatsapp}
                        onBlur={() => markTouched('whatsapp')}
                        onChange={e => {
                          const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
                          if (clean.length <= 2) setWhatsapp(clean);
                          else if (clean.length <= 7) setWhatsapp(`(${clean.slice(0, 2)}) ${clean.slice(2)}`);
                          else setWhatsapp(`(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`);
                        }}
                        className={`w-full bg-black/60 border rounded-xl p-2.5 text-xs text-white outline-none transition-colors ${
                          touched.whatsapp 
                            ? isWhatsappValid ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-amber-500/50 focus:border-amber-500'
                            : 'border-white/[0.15] focus:border-amber-500'
                        }`}
                      />
                      {isWhatsappValid && (
                        <CheckCircle2 size={13} className="absolute right-3 top-3 text-emerald-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* CPF da Conta e Senha */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-white/50 uppercase">CPF da Conta (Criador)</label>
                      {touched.cpf && (
                        <span className={`text-[9px] font-bold ${isCpfValid ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isCpfValid ? '✓ CPF Válido' : 'CPF Inválido'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="000.000.000-00"
                        value={cpf}
                        onBlur={() => markTouched('cpf')}
                        onChange={e => {
                          const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
                          if (clean.length <= 3) setCpf(clean);
                          else if (clean.length <= 6) setCpf(`${clean.slice(0, 3)}.${clean.slice(3)}`);
                          else if (clean.length <= 9) setCpf(`${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`);
                          else setCpf(`${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`);
                        }}
                        className={`w-full bg-black/60 border rounded-xl p-2.5 text-xs text-white outline-none font-mono text-center font-bold tracking-wider transition-colors ${
                          touched.cpf 
                            ? isCpfValid ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-red-500/50 focus:border-red-500'
                            : 'border-white/[0.15] focus:border-amber-500'
                        }`}
                      />
                      {isCpfValid && (
                        <CheckCircle2 size={13} className="absolute right-3 top-3 text-emerald-400" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-white/50 uppercase">Criar Senha de Acesso</label>
                      {touched.senha && (
                        <span className={`text-[9px] font-bold ${isSenhaValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isSenhaValid ? '✓ Válida' : 'Mín. 6 dígitos'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="password"
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={senha}
                        onBlur={() => markTouched('senha')}
                        onChange={e => setSenha(e.target.value)}
                        className={`w-full bg-black/60 border rounded-xl p-2.5 text-xs text-white outline-none transition-colors ${
                          touched.senha 
                            ? isSenhaValid ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-amber-500/50 focus:border-amber-500'
                            : 'border-white/[0.15] focus:border-amber-500'
                        }`}
                      />
                      {isSenhaValid && (
                        <CheckCircle2 size={13} className="absolute right-3 top-3 text-emerald-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════ */}
                {/* CAMPOS ESPECÍFICOS DO CARTÃO + CPF DO TITULAR         */}
                {/* ══════════════════════════════════════════════════════ */}
                {paymentMethod === 'card' && (
                  <div className="pt-3 border-t border-white/[0.1] space-y-3 bg-black/60 p-3.5 rounded-2xl border border-white/15">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard size={12} /> Dados do Cartão de Crédito
                      </span>
                      {detectedBrand && (
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${detectedBrand.color}`}>
                          {detectedBrand.name} Detectado
                        </span>
                      )}
                    </div>

                    {/* Número do Cartão */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-white/50 uppercase">Número do Cartão</label>
                        {touched.cardNumber && (
                          <span className={`text-[9px] font-bold ${isCardNumberValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isCardNumberValid ? '✓ Válido' : '16 dígitos'}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder="0000 0000 0000 0000"
                          value={cardNumber}
                          onBlur={() => markTouched('cardNumber')}
                          onChange={e => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 16);
                            const parts = clean.match(/.{1,4}/g);
                            setCardNumber(parts ? parts.join(' ') : clean);
                          }}
                          className={`w-full bg-black/75 border rounded-xl p-2.5 text-xs text-white outline-none font-mono text-center tracking-wider transition-colors ${
                            touched.cardNumber 
                              ? isCardNumberValid ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-amber-500/50 focus:border-amber-500'
                              : 'border-white/[0.15] focus:border-amber-500'
                          }`}
                        />
                        {isCardNumberValid && (
                          <CheckCircle2 size={13} className="absolute right-3 top-3 text-emerald-400" />
                        )}
                      </div>
                    </div>

                    {/* Nome Impresso no Cartão */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-white/50 uppercase">Nome Impresso no Cartão</label>
                        {touched.cardName && (
                          <span className={`text-[9px] font-bold ${isCardNameValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isCardNameValid ? '✓ Válido' : 'Como está no cartão'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="COMO IMPRESSO NO CARTÃO"
                        value={cardName}
                        onBlur={() => markTouched('cardName')}
                        onChange={e => setCardName(e.target.value)}
                        className={`w-full bg-black/75 border rounded-xl p-2.5 text-xs text-white outline-none uppercase transition-colors ${
                          touched.cardName 
                            ? isCardNameValid ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-amber-500/50 focus:border-amber-500'
                            : 'border-white/[0.15] focus:border-amber-500'
                        }`}
                      />
                    </div>

                    {/* Validade, CVV e Parcelamento Inteligente */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/50 uppercase">Validade</label>
                        <input
                          type="text"
                          required
                          placeholder="MM/AA"
                          value={cardExpiry}
                          onBlur={() => markTouched('cardExpiry')}
                          onChange={e => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                            if (clean.length <= 2) setCardExpiry(clean);
                            else setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
                          }}
                          className={`w-full bg-black/75 border rounded-xl p-2.5 text-xs text-white outline-none text-center font-mono transition-colors ${
                            touched.cardExpiry 
                              ? isCardExpiryValid ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-amber-500/50 focus:border-amber-500'
                              : 'border-white/[0.15] focus:border-amber-500'
                          }`}
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
                          onBlur={() => markTouched('cardCvv')}
                          onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className={`w-full bg-black/75 border rounded-xl p-2.5 text-xs text-white outline-none text-center font-mono transition-colors ${
                            touched.cardCvv 
                              ? isCardCvvValid ? 'border-emerald-500/50 focus:border-emerald-500' : 'border-amber-500/50 focus:border-amber-500'
                              : 'border-white/[0.15] focus:border-amber-500'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/50 uppercase">Parcelas</label>
                        <select
                          value={installments}
                          onChange={e => setInstallments(Number(e.target.value))}
                          className="w-full bg-[#181822] border border-white/[0.2] rounded-xl p-2 text-xs text-white focus:border-amber-500 outline-none"
                        >
                          {installmentOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* CPF DO TITULAR DO CARTÃO */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-white/50 uppercase">CPF do Titular do Cartão</label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-amber-400 font-bold select-none">
                          <input
                            type="checkbox"
                            checked={sameAsAccountCpf}
                            onChange={e => {
                              const checked = e.target.checked;
                              setSameAsAccountCpf(checked);
                              if (checked && cpf) setCardCpf(cpf);
                            }}
                            className="rounded border-white/20 bg-white/10 text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Mesmo CPF da conta</span>
                        </label>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          disabled={sameAsAccountCpf}
                          placeholder="000.000.000-00"
                          value={sameAsAccountCpf ? cpf : cardCpf}
                          onBlur={() => markTouched('cardCpf')}
                          onChange={e => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
                            if (clean.length <= 3) setCardCpf(clean);
                            else if (clean.length <= 6) setCardCpf(`${clean.slice(0, 3)}.${clean.slice(3)}`);
                            else if (clean.length <= 9) setCardCpf(`${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`);
                            else setCardCpf(`${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`);
                          }}
                          className={`w-full bg-black/75 border rounded-xl p-2.5 text-xs text-white outline-none font-mono text-center font-bold tracking-wider transition-colors ${
                            sameAsAccountCpf ? 'opacity-60 cursor-not-allowed border-white/[0.08]' : 'border-white/[0.15] focus:border-amber-500'
                          }`}
                        />
                        {(sameAsAccountCpf ? isCpfValid : isCardCpfValid) && (
                          <CheckCircle2 size={13} className="absolute right-3 top-3 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════ */}
                {/* UPSELL APÓS FORMULÁRIO E ANTES DO BOTÃO DE LIBERAR    */}
                {/* ══════════════════════════════════════════════════════ */}
                {selectedPlan === 'monthly' && (
                  <div className="bg-gradient-to-br from-amber-500/25 via-amber-500/10 to-[#181824] border-2 border-amber-500/60 rounded-2xl p-3.5 space-y-2.5 shadow-xl shadow-amber-500/10">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-amber-500 text-black rounded-md font-mono tracking-wider">
                        OPORTUNIDADE EXCLUSIVA
                      </span>
                      <span className="text-xs font-black text-amber-400">+ R$ 19,90/mês</span>
                    </div>

                    <div>
                      <h5 className="text-xs font-black text-white flex items-center gap-1.5">
                        <Zap size={13} className="text-amber-400 fill-amber-400" />
                        <span>Turbine sua assinatura com o Módulo de Lotes e Ovos</span>
                      </h5>
                      <p className="text-[11px] text-white/80 leading-relaxed mt-1">
                        Cadastre lotes inteiros de postura, engorda e crescimento. Tenha controle total de ovos, chocadeira e pesagem coletiva no seu aplicativo.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedPlan('pro_monthly')}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wide active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Sim! Adicionar Lotes e Ovos (Total: R$ 59,80/mês)</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}

                {/* Se o cliente estiver no Completo e quiser voltar para o comum */}
                {selectedPlan === 'pro_monthly' && initialPlan === 'monthly' && (
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('monthly')}
                      className="text-[10px] text-white/40 hover:text-white transition-colors cursor-pointer"
                    >
                      ← Manter apenas o Plano Comum (R$ 39,90/mês)
                    </button>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════ */}
                {/* BOTÃO PRINCIPAL: LIBERAR MEU ACESSO                   */}
                {/* ══════════════════════════════════════════════════════ */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm uppercase tracking-wider active:scale-95 transition-all shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin text-black" />
                  ) : (
                    <>
                      <Zap size={16} className="fill-black" />
                      <span>Liberar Meu Acesso Agora</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* ══════════════════════════════════════════════════════ */}
              {/* BANDEIRAS DE PAGAMENTO (MASTER, VISA, ELO, PIX)        */}
              {/* ══════════════════════════════════════════════════════ */}
              <div className="pt-2 flex flex-col items-center gap-3">
                <div className="flex items-center justify-center gap-3 text-white/40">
                  {/* Badge Visa */}
                  <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-black tracking-widest text-white/70 italic">
                    VISA
                  </div>
                  {/* Badge Mastercard */}
                  <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-black tracking-wider text-white/70 flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80 -mr-1.5" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="text-[8px] font-bold uppercase ml-1">Mastercard</span>
                  </div>
                  {/* Badge Elo */}
                  <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-black tracking-wider text-white/70 flex items-center gap-1">
                    <span className="text-yellow-400 text-[10px]">●</span>
                    <span className="text-blue-400 text-[10px] -ml-1">●</span>
                    <span className="text-red-400 text-[10px] -ml-1">●</span>
                    <span className="text-[8px] font-bold uppercase ml-0.5">Elo</span>
                  </div>
                  {/* Badge Pix */}
                  <div className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 flex items-center gap-1">
                    <QrCode size={10} />
                    <span>PIX</span>
                  </div>
                </div>

                {/* ══════════════════════════════════════════════════════ */}
                {/* PROVA SOCIAL: DEPOIMENTO E AVATARES DE USUÁRIOS        */}
                {/* ══════════════════════════════════════════════════════ */}
                <div className="w-full pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/60 p-3 rounded-2xl border border-white/15">
                  {/* Avatares sobrepostos */}
                  <div className="flex items-center">
                    <div className="flex -space-x-2 overflow-hidden shrink-0">
                      <img
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-[#121216] object-cover"
                        src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=face"
                        alt="Criador"
                      />
                      <img
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-[#121216] object-cover"
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face"
                        alt="Criador"
                      />
                      <img
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-[#121216] object-cover"
                        src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=face"
                        alt="Criador"
                      />
                      <img
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-[#121216] object-cover"
                        src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=face"
                        alt="Criador"
                      />
                      <img
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-[#121216] object-cover"
                        src="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=64&h=64&fit=crop&crop=face"
                        alt="Criador"
                      />
                    </div>
                    <div className="flex items-center gap-0.5 ml-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={10} className="text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                  </div>

                  {/* Texto de Depoimento / Métricas */}
                  <div className="text-center sm:text-right">
                    <p className="text-[11px] font-extrabold text-white">
                      Mais de 500 contas cadastradas
                    </p>
                    <p className="text-[9px] font-bold text-amber-400/90">
                      +50.000 aves registradas no sistema
                    </p>
                  </div>
                </div>

                {/* Selo de Garantia Incondicional */}
                <div className="w-full flex items-center justify-center gap-2 text-[10px] text-emerald-400/90 font-bold bg-emerald-500/10 border border-emerald-500/20 py-2 px-3 rounded-xl">
                  <ShieldCheck size={13} className="shrink-0 text-emerald-400" />
                  <span>Garantia incondicional de 7 dias • Cancele quando quiser</span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ETAPA 2: TELA DO PIX (QR CODE + COPIA E COLA)         */}
          {/* ══════════════════════════════════════════════════════ */}
          {step === 'pix' && pixData && (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl">
                <p className="text-xs font-black text-emerald-400">Código PIX Gerado com Sucesso!</p>
                <p className="text-[11px] text-white/80 mt-0.5">
                  Copie o código ou escaneie o QR Code no app do seu banco. A liberação ocorre em segundos.
                </p>
              </div>

              {/* QR Code Imagem */}
              {pixData.qr_code_base64 && (
                <div className="p-3 bg-white rounded-2xl max-w-[190px] mx-auto shadow-xl">
                  <img
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="w-full h-auto block rounded-lg"
                  />
                </div>
              )}

              {/* Copia e Cola */}
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-white/50 uppercase">Código PIX Copia e Cola</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixData.qr_code}
                    className="w-full bg-black/60 border border-white/[0.15] rounded-xl p-2.5 text-xs text-white/90 font-mono select-all"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(pixData.qr_code)}
                    className="px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Status ao vivo */}
              <div className="flex items-center justify-center gap-2 text-xs text-amber-400 py-1 font-bold">
                <Loader2 size={15} className="animate-spin" />
                <span>Aguardando identificação do pagamento...</span>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={verifying}
                  onClick={handleVerificarManual}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
                >
                  {verifying ? <Loader2 size={15} className="animate-spin text-black" /> : <Check size={15} />}
                  <span>Já fiz o pagamento</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
                >
                  ← Alterar dados ou forma de pagamento
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ETAPA 3: SUCESSO E LIBERAÇÃO IMEDIATA                  */}
          {/* ══════════════════════════════════════════════════════ */}
          {step === 'success' && (
            <div className="py-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="text-xl font-black text-white">Pagamento Confirmado!</h4>
              <p className="text-xs text-white/75 max-w-sm mx-auto leading-relaxed">
                Sua conta com o plano <strong className="text-amber-400">{planInfo.title}</strong> foi ativada com sucesso. Entrando na plataforma...
              </p>
              <div className="pt-2 flex justify-center">
                <Loader2 size={24} className="animate-spin text-amber-400" />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
