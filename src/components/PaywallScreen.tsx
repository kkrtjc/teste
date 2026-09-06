import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useAppContext } from '../lib/AppContext';
import { 
  ShieldAlert, LogOut, 
  Sparkles, MessageSquare, Copy, CheckCircle2, Check 
} from 'lucide-react';

export function PaywallScreen() {
  const { signOut, cpf, triggerWebhookPayment, linkCpfToUser } = useAuth();
  const { farmSettings } = useAppContext();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [copied, setCopied] = useState(false);

  const pixKey = "mura.manager.pay@gmail.com"; 
  const [paymentCpf, setPaymentCpf] = useState('');

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getWhatsappLink = () => {
    const planText = selectedPlan === 'monthly' ? 'Mensal (R$ 19,90/mês)' : 'Anual Promocional (R$ 199,90/ano)';
    const userIdent = paymentCpf ? `CPF: ${paymentCpf}` : `Usuário: ${cpf}`;
    const text = encodeURIComponent(
      `Olá! Realizei o pagamento do plano ${planText} para o Mura Manager (${userIdent}). Segue em anexo o comprovante para liberação.`
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
      className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-hidden select-none touch-none"
      onTouchMove={e => e.preventDefault()}
    >
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-theme-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* CARD FIXO ÚNICO SEM ROLAGEM */}
      <div 
        className="w-full max-w-xl bg-theme-surface border-2 border-theme-border/80 rounded-3xl shadow-2xl p-4 sm:p-5 flex flex-col justify-between max-h-[96vh] relative z-10 animate-scale-up overflow-hidden"
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
            Escolha um dos planos abaixo para desbloquear seu sistema e continuar gerenciando seu criatório.
          </p>
        </div>

        {/* ── OS DOIS PLANOS LADO A LADO EM GRID FIXA (SEM ROLAGEM) ── */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 my-2">
          
          {/* PLANO MENSAL */}
          <div 
            onClick={() => setSelectedPlan('monthly')}
            className={`p-3 sm:p-3.5 rounded-2xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
              selectedPlan === 'monthly'
                ? 'border-theme-primary bg-theme-primary/10 text-white shadow-lg shadow-theme-primary/10'
                : 'border-theme-border/60 bg-theme-base/50 text-theme-text-muted hover:border-theme-border'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-xs sm:text-sm text-white">Plano Mensal</span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedPlan === 'monthly' ? 'border-theme-primary bg-theme-primary' : 'border-theme-border'
                }`}>
                  {selectedPlan === 'monthly' && <Check size={10} className="text-black font-black" />}
                </div>
              </div>
              <p className="text-[9px] text-theme-text-muted mt-0.5">Assinatura mensal</p>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] line-through text-theme-text-muted/60">R$ 49,90</span>
                <span className="text-lg sm:text-xl font-black text-white">R$ 19,90</span>
                <span className="text-[9px] text-theme-text-muted">/mês</span>
              </div>
              <span className="inline-block mt-1 text-[9px] font-black text-theme-primary bg-theme-primary/10 px-1.5 py-0.5 rounded border border-theme-primary/20">
                Economia de 60%
              </span>
            </div>
          </div>

          {/* PLANO ANUAL PROMOCIONAL */}
          <div 
            onClick={() => setSelectedPlan('yearly')}
            className={`p-3 sm:p-3.5 rounded-2xl border-2 cursor-pointer transition-all relative flex flex-col justify-between overflow-hidden ${
              selectedPlan === 'yearly'
                ? 'border-amber-400 bg-amber-500/10 text-white shadow-lg shadow-amber-500/15'
                : 'border-theme-border/60 bg-theme-base/50 text-theme-text-muted hover:border-theme-border'
            }`}
          >
            <div className="absolute top-0 right-0 bg-amber-400 text-black text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-bl-lg shadow-sm">
              Mais Vendido
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="font-black text-xs sm:text-sm text-white">Plano Anual</span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedPlan === 'yearly' ? 'border-amber-400 bg-amber-400' : 'border-theme-border'
                }`}>
                  {selectedPlan === 'yearly' && <Check size={10} className="text-black font-black" />}
                </div>
              </div>
              <p className="text-[9px] text-theme-text-muted mt-0.5">Acesso completo por 1 ano</p>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] line-through text-theme-text-muted/60">R$ 399,90</span>
                <span className="text-lg sm:text-xl font-black text-amber-400">R$ 199,90</span>
                <span className="text-[9px] text-theme-text-muted">/ano</span>
              </div>
              <span className="inline-block mt-1 text-[9px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Super Promocional
              </span>
            </div>
          </div>

        </div>

        {/* ── PAGAMENTO PIX & LIBERAÇÃO (COMPACTO SEM ROLAGEM) ── */}
        <div className="bg-theme-base/60 border border-theme-border/60 rounded-2xl p-3 sm:p-3.5 space-y-2.5">
          
          {/* Chave Pix e Botão Copiar */}
          <div className="flex items-center justify-between bg-theme-surface border border-theme-border/80 rounded-xl px-3 py-2 text-xs">
            <div className="min-w-0">
              <span className="text-[9px] font-bold text-theme-text-muted block uppercase">Chave Pix Copia e Cola</span>
              <span className="font-mono text-white text-xs truncate font-bold block" title={pixKey}>{pixKey}</span>
            </div>
            <button 
              type="button"
              onClick={handleCopyPix}
              className="p-1.5 text-theme-primary hover:text-white rounded-lg bg-theme-primary/10 hover:bg-theme-primary/20 transition-all flex items-center gap-1 font-bold text-[10px] shrink-0"
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

          {/* Botões de Ação */}
          <div className="space-y-1.5 pt-1">
            <button 
              type="button"
              onClick={async () => {
                const cleanCpf = paymentCpf.replace(/\D/g, '');
                if (cleanCpf && cleanCpf.length === 11) {
                  const { error: linkErr } = await linkCpfToUser(cleanCpf);
                  if (linkErr) {
                    alert(`Atenção ao vincular CPF: ${linkErr.message}`);
                  }
                }
                const { error } = await triggerWebhookPayment(selectedPlan, paymentCpf || cpf);
                if (error) {
                  alert('Erro ao enviar notificação de Webhook.');
                }
              }}
              className="w-full py-2.5 rounded-xl font-extrabold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400 text-xs shadow-md cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Confirmar Pagamento & Liberação Instantânea</span>
            </button>

            <a 
              href={getWhatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all text-theme-text-muted hover:text-white bg-theme-surface border border-theme-border text-[10px]"
            >
              <MessageSquare size={13} />
              <span>Enviar Comprovante via WhatsApp</span>
            </a>
          </div>

        </div>

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
