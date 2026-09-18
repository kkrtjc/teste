import { useState, useEffect, useRef } from 'react';
import { 
  X, Check, Copy, CheckCircle2, AlertCircle, Loader2,
  CreditCard, QrCode, ShieldCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import localforage from 'localforage';
import type { SubscriptionPlan } from '../lib/AuthContext';

const WORKER_URL = 'https://mura-api.joaopaulojaguar.workers.dev';
const MP_PUBLIC_KEY = 'APP_USR-2502a3c7-5f59-45b0-8365-1cfcad7b0fa5';

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

  // Customer fields
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');

  // Card fields
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState(1);

  // States
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
  }, [initialPlan, isOpen]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  if (!isOpen) return null;

  const planInfo = {
    monthly: {
      title: 'Mensal Comum',
      price: 39.90,
      priceFormatted: 'R$ 39,90',
      period: 'mês',
      days: 30,
      tag: '[COMUM]',
      desc: 'Acesso completo a Aves & Raças, Fotos e Vitrine Digital.'
    },
    pro_monthly: {
      title: 'Mensal Completo',
      price: 59.80,
      priceFormatted: 'R$ 59,80',
      period: 'mês',
      days: 30,
      tag: '[COMPLETO]',
      desc: 'Aves, Vitrine + Lotes inteiros e Gestão de Ovos.'
    },
    yearly: {
      title: 'Anual Completo',
      price: 567.90,
      priceFormatted: 'R$ 567,90',
      period: 'ano',
      days: 365,
      tag: '[ANUAL]',
      desc: 'Tudo 100% liberado por 1 ano com 21% de desconto.'
    }
  }[selectedPlan];

  // Helper de ativação da conta após aprovação no MP
  const handleLiberarConta = async (cleanCpf: string, cleanEmail: string, userSenha: string) => {
    try {
      const expiresAt = new Date(Date.now() + planInfo.days * 86400000).toISOString();
      const taggedNome = `${nome.trim()} ${planInfo.tag}`.trim();

      if (isSupabaseConfigured) {
        // 1. Cria ou atualiza o cliente na tabela allowed_cpfs
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

        // 2. Cria a conta no Supabase Auth se ainda não existir
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

      // Salva localmente
      try {
        localStorage.setItem('@mura-manager:user-cpf', cleanCpf);
        localStorage.setItem('@mura-manager:user-plan', selectedPlan);
        await localforage.setItem(`@mura-manager:user-plan:${cleanEmail}`, selectedPlan);
        await localforage.setItem(`@mura-manager:user-is-paid:${cleanEmail}`, 'true');
        await localforage.setItem(`@mura-manager:locked-trial-expires:${cleanEmail}`, expiresAt);
      } catch {}

      setStep('success');

      // Faz login automático após 1.5s
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
        setError('O pagamento ainda não foi identificado pelo Mercado Pago. Aguarde alguns segundos após pagar e clique novamente.');
      }
    } catch {
      setError('Erro de conexão ao verificar pagamento. Tente novamente.');
    } finally {
      setVerifying(false);
    }
  };

  const validateCustomer = () => {
    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();
    if (!nome.trim()) { setError('Informe seu nome completo.'); return false; }
    if (!cleanEmail || !cleanEmail.includes('@')) { setError('Informe um e-mail válido.'); return false; }
    if (cleanCpf.length !== 11) { setError('Informe um CPF válido com 11 dígitos.'); return false; }
    if (senha.length < 6) { setError('Crie uma senha de acesso com no mínimo 6 dígitos.'); return false; }
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

    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      setError('Preencha todos os dados do cartão de crédito.');
      return;
    }

    setError('');
    setLoading(true);

    const cleanCpf = cpf.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();
    const cardDigits = cardNumber.replace(/\s/g, '');
    const [expMonth, expYearShort] = cardExpiry.split('/');
    const expYear = expYearShort?.length === 2 ? `20${expYearShort}` : expYearShort;

    try {
      // 1. Tokenização via API pública do Mercado Pago
      const tokenRes = await fetch(
        `https://api.mercadopago.com/v1/card_tokens?public_key=${MP_PUBLIC_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            card_number: cardDigits,
            cardholder: {
              name: cardName.toUpperCase(),
              identification: { type: 'CPF', number: cleanCpf },
            },
            security_code: cardCvv,
            expiration_month: Number(expMonth),
            expiration_year: Number(expYear),
          }),
        }
      );

      const tokenData = await tokenRes.json();
      if (!tokenData.id) {
        const errMsg = tokenData.cause?.[0]?.description || tokenData.message || 'Dados do cartão inválidos. Verifique número, validade e CVV.';
        setError(errMsg);
        setLoading(false);
        return;
      }

      // 2. Detecta bandeira pelo primeiro dígito
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
            cpf: cleanCpf,
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
        await handleLiberarConta(cleanCpf, cleanEmail, senha);
      } else if (data.status === 'in_process' || data.status === 'pending') {
        startPolling(data.id, cleanCpf, cleanEmail, senha);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl bg-[#121216] border border-white/10 my-auto animate-scale-up">
        
        {/* Header do Checkout */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.08] flex justify-between items-center bg-[#15151c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
              M
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-1.5">
                <span>Checkout Oficial</span>
                <span className="text-[9px] px-2 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-mono uppercase">
                  100% Seguro
                </span>
              </h3>
              <p className="text-[10px] text-white/50">Mercado Pago Gateway</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-white/40 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto smooth-scroll">
          
          {/* Resumo do Plano Selecionado */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Plano Selecionado</span>
                <h4 className="text-base font-black text-white">{planInfo.title}</h4>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-white">{planInfo.priceFormatted}</span>
                <span className="text-[10px] text-white/50 block">/{planInfo.period}</span>
              </div>
            </div>
            <p className="text-[11px] text-white/60 leading-tight">{planInfo.desc}</p>
          </div>

          {/* UPSELL INTERATIVO DOS LOTES SE ESTIVER NO MENSAL COMUM */}
          {selectedPlan === 'monthly' && step === 'form' && (
            <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-[#181824] border border-amber-500/40 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-scale-up">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black uppercase px-1.5 py-0.2 bg-amber-500 text-black rounded font-mono">OPORTUNIDADE</span>
                  <span className="text-[11px] font-black text-amber-300">Turbine com Lotes & Ovos!</span>
                </div>
                <p className="text-[10px] text-zinc-300 leading-tight">
                  Adicione Lotes de Postura e Gestão de Ovos por apenas <strong className="text-amber-400">+ R$ 19,90/mês</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan('pro_monthly')}
                className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-[10px] uppercase tracking-wide shrink-0 active:scale-95 transition-all shadow-md cursor-pointer text-center"
              >
                Mudar para Completo (+ R$ 19,90)
              </button>
            </div>
          )}

          {/* MENSAGEM DE ERRO */}
          {error && (
            <div className="p-3 rounded-xl text-xs font-bold flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 animate-fade-in">
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
              <div className="flex rounded-xl bg-white/[0.04] p-1 border border-white/[0.08] gap-1">
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
                  <span>Cartão (Até 4x)</span>
                </button>
              </div>

              {/* Formulário Principal */}
              <form onSubmit={paymentMethod === 'pix' ? handleGerarPix : handlePagarCartao} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase">Nome Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Seu nome completo"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/50 uppercase">E-mail</label>
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/50 uppercase">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={whatsapp}
                      onChange={e => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
                        if (clean.length <= 2) setWhatsapp(clean);
                        else if (clean.length <= 7) setWhatsapp(`(${clean.slice(0, 2)}) ${clean.slice(2)}`);
                        else setWhatsapp(`(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`);
                      }}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/50 uppercase">CPF (Para liberação da conta)</label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={e => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
                        if (clean.length <= 3) setCpf(clean);
                        else if (clean.length <= 6) setCpf(`${clean.slice(0, 3)}.${clean.slice(3)}`);
                        else if (clean.length <= 9) setCpf(`${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`);
                        else setCpf(`${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`);
                      }}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none transition-colors font-mono font-bold text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/50 uppercase">Criar Senha de Acesso</label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 dígitos"
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Campos Específicos do Cartão */}
                {paymentMethod === 'card' && (
                  <div className="pt-2 border-t border-white/[0.08] space-y-2.5 animate-fade-in">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                      Dados do Cartão de Crédito
                    </span>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/50 uppercase">Número do Cartão</label>
                      <input
                        type="text"
                        required
                        placeholder="0000 0000 0000 0000"
                        value={cardNumber}
                        onChange={e => {
                          const clean = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const parts = clean.match(/.{1,4}/g);
                          setCardNumber(parts ? parts.join(' ') : clean);
                        }}
                        className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none font-mono text-center tracking-wider"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/50 uppercase">Nome Impresso no Cartão</label>
                      <input
                        type="text"
                        required
                        placeholder="COMO ESTÁ NO CARTÃO"
                        value={cardName}
                        onChange={e => setCardName(e.target.value)}
                        className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/50 uppercase">Validade</label>
                        <input
                          type="text"
                          required
                          placeholder="MM/AA"
                          value={cardExpiry}
                          onChange={e => {
                            const clean = e.target.value.replace(/\D/g, '').slice(0, 4);
                            if (clean.length <= 2) setCardExpiry(clean);
                            else setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
                          }}
                          className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none text-center font-mono"
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
                          className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:border-amber-500 outline-none text-center font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-white/50 uppercase">Parcelamento</label>
                        <select
                          value={installments}
                          onChange={e => setInstallments(Number(e.target.value))}
                          className="w-full bg-[#15151c] border border-white/[0.1] rounded-xl p-2 text-xs text-white focus:border-amber-500 outline-none"
                        >
                          <option value={1}>1x de {planInfo.priceFormatted}</option>
                          <option value={2}>2x de R$ {(planInfo.price / 2).toFixed(2).replace('.', ',')}</option>
                          <option value={3}>3x de R$ {(planInfo.price / 3).toFixed(2).replace('.', ',')}</option>
                          <option value={4}>4x de R$ {(planInfo.price / 4).toFixed(2).replace('.', ',')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin text-black" />
                  ) : paymentMethod === 'pix' ? (
                    <>
                      <QrCode size={15} />
                      <span>Gerar PIX de {planInfo.priceFormatted}</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={15} />
                      <span>Pagar {planInfo.priceFormatted} no Cartão</span>
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-center gap-2 text-[10px] text-white/40 pt-1">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>Transação criptografada pelo Mercado Pago</span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════ */}
          {/* ETAPA 2: TELA DO PIX (QR CODE + COPIA E COLA)         */}
          {/* ══════════════════════════════════════════════════════ */}
          {step === 'pix' && pixData && (
            <div className="space-y-4 text-center animate-fade-in">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                <p className="text-xs font-black text-emerald-400">PIX Gerado com Sucesso!</p>
                <p className="text-[11px] text-white/70 mt-0.5">
                  Pague com seu aplicativo de banco e a sua conta será liberada na hora.
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
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl p-2.5 text-xs text-white/80 font-mono select-all"
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
                <span>Aguardando confirmação do pagamento...</span>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={verifying}
                  onClick={handleVerificarManual}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
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
            <div className="py-8 text-center space-y-3 animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="text-xl font-black text-white">Pagamento Confirmado!</h4>
              <p className="text-xs text-white/70 max-w-sm mx-auto leading-relaxed">
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
