import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useAppContext } from '../lib/AppContext';
import { 
  ShieldAlert, LogOut, Egg, Bird, 
  Layers, Database, Sparkles, MessageSquare, Copy, CheckCircle2, Loader2 
} from 'lucide-react';

export function PaywallScreen() {
  const { signOut, cpf, triggerWebhookPayment } = useAuth();
  const { farmSettings } = useAppContext();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [copied, setCopied] = useState(false);

  // Chave Pix aleatória fictícia ou de arrecadação do criador para demonstração
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

  const features = [
    { icon: Bird, text: "Controle completo de pedigree e plantel de elite" },
    { icon: Egg, text: "Registro diário de ovos, faturamento e cálculo de lucro" },
    { icon: Layers, text: "Gestão detalhada de lotes (Postura, Engorda, Pintinhos, Crescimento)" },
    { icon: Database, text: "Sincronização em nuvem em tempo real com funcionamento offline" },
    { icon: Sparkles, text: "Galeria evolutiva de fotos e histórico sanitário individual" }
  ];

  return (
    <div className="min-h-screen bg-theme-base flex items-center justify-center p-4 relative overflow-hidden selection:bg-theme-primary selection:text-black">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-theme-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-theme-surface border border-theme-border/60 rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6 relative z-10 animate-scale-up">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20 animate-pulse">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-2xl font-black text-white font-serif">Período de Teste Expirado</h2>
          <p className="text-xs text-theme-text-muted">
            Seus 7 dias gratuitos acabaram. Assine agora para desbloquear todos os seus dados e continuar gerenciando seu criatório.
          </p>
        </div>

        {/* Features list */}
        <div className="bg-theme-base/40 border border-theme-border/50 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-bold text-theme-primary uppercase tracking-widest">O que você desbloqueia:</p>
          <div className="space-y-2.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="p-1 rounded bg-theme-primary/10 text-theme-primary shrink-0 mt-0.5">
                  <f.icon size={12} />
                </div>
                <span className="text-theme-text-main leading-relaxed">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Selection with Price Anchoring */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-widest">Escolha o seu plano:</p>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Plano Mensal */}
            <div 
              onClick={() => setSelectedPlan('monthly')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between ${
                selectedPlan === 'monthly'
                  ? 'border-theme-primary bg-theme-primary/5 text-white'
                  : 'border-theme-border bg-theme-base/40 text-theme-text-muted hover:border-theme-border-hover'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Plano Mensal Recorrente</span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedPlan === 'monthly' ? 'border-theme-primary bg-theme-primary' : 'border-theme-border'
                }`}>
                  {selectedPlan === 'monthly' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xs line-through text-theme-text-muted/60">R$ 49,90</span>
                <span className="text-xl font-black text-white">R$ 19,90</span>
                <span className="text-[10px] text-theme-text-muted">/mês</span>
              </div>
              <p className="text-[10px] text-theme-primary font-bold mt-1">Economia de 60% de lançamento</p>
            </div>

            {/* Plano Anual - Promocional Lançamento */}
            <div 
              onClick={() => setSelectedPlan('yearly')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all relative flex flex-col justify-between overflow-hidden ${
                selectedPlan === 'yearly'
                  ? 'border-theme-primary bg-theme-primary/5 text-white'
                  : 'border-theme-border bg-theme-base/40 text-theme-text-muted hover:border-theme-border-hover'
              }`}
            >
              <div className="absolute top-0 right-0 bg-theme-primary text-black text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">
                Melhor Valor
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">Plano Anual de Lançamento</span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  selectedPlan === 'yearly' ? 'border-theme-primary bg-theme-primary' : 'border-theme-border'
                }`}>
                  {selectedPlan === 'yearly' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xs line-through text-theme-text-muted/60">R$ 399,90</span>
                <span className="text-2xl font-black text-theme-primary">R$ 199,90</span>
                <span className="text-[10px] text-theme-text-muted">/ano</span>
              </div>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">Super desconto de lançamento por tempo indeterminado</p>
            </div>
          </div>
        </div>

        {/* Pix payment instructions */}
        <div className="bg-theme-base/60 border border-theme-border p-4 rounded-2xl space-y-3.5 text-center">
          <div className="space-y-1">
            <p className="font-bold text-xs text-white">Pagamento Rápido via Pix</p>
            <p className="text-[10px] text-theme-text-muted">Copie a chave Pix abaixo e pague no seu aplicativo do banco:</p>
          </div>

          <div className="flex items-center justify-between bg-theme-surface border border-theme-border rounded-xl px-3 py-2 text-xs">
            <span className="font-mono text-white truncate max-w-[200px]" title={pixKey}>{pixKey}</span>
            <button 
              onClick={handleCopyPix}
              className="p-1.5 text-theme-primary hover:text-white rounded-lg bg-theme-primary/10 hover:bg-theme-primary/20 transition-all flex items-center gap-1 font-bold text-[10px]"
            >
              {copied ? (
                <>
                  <CheckCircle2 size={12} />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-bold text-theme-text-muted uppercase">Seu CPF (para liberação da conta)</label>
            <input 
              type="text" 
              placeholder="000.000.000-00"
              value={paymentCpf}
              onChange={(e) => {
                const clean = e.target.value.replace(/\D/g, '').slice(0, 11);
                if (clean.length <= 3) setPaymentCpf(clean);
                else if (clean.length <= 6) setPaymentCpf(`${clean.slice(0,3)}.${clean.slice(3)}`);
                else if (clean.length <= 9) setPaymentCpf(`${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6)}`);
                else setPaymentCpf(`${clean.slice(0,3)}.${clean.slice(3,6)}.${clean.slice(6,9)}-${clean.slice(9)}`);
              }}
              className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-2 text-xs text-white focus:border-theme-primary outline-none text-center font-mono font-bold"
            />
          </div>

          <div className="pt-2 space-y-3">
            {/* Status da Escuta em Tempo Real do Webhook */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-xs">
                <Loader2 size={14} className="animate-spin" />
                <span>Aguardando confirmação do pagamento via Webhook...</span>
              </div>
              <p className="text-[10px] text-theme-text-muted">
                Assim que o banco/gateway confirmar seu Pix ou Cartão, o sistema libera seu acesso em tempo real.
              </p>
            </div>

            {/* Botão de Simulação de Webhook para Ambiente de Testes */}
            <button 
              onClick={async () => {
                const { error } = await triggerWebhookPayment(selectedPlan, paymentCpf || cpf);
                if (error) {
                  alert('Erro ao enviar notificação de Webhook.');
                }
              }}
              className="w-full py-3 rounded-xl font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400 text-xs shadow-lg shadow-amber-500/20"
            >
              <Sparkles size={16} />
              <span>Simular Liberação por Webhook (Teste)</span>
            </button>

            <a 
              href={getWhatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-theme-text-muted hover:text-white bg-theme-surface border border-theme-border text-[11px]"
            >
              <MessageSquare size={14} />
              <span>Enviar Comprovante pelo WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-center border-t border-theme-border pt-4">
          <button 
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-theme-text-muted hover:text-red-400 transition-colors font-bold px-3 py-1.5 hover:bg-red-500/5 rounded-lg"
          >
            <LogOut size={14} />
            <span>Sair da minha conta</span>
          </button>
        </div>
      </div>
    </div>
  );
}
