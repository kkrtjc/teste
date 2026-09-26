import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Clock, ShieldAlert, Zap, CheckCircle2, Copy, ArrowRight } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de controle — chave no localStorage para marcar "visto hoje"
// ─────────────────────────────────────────────────────────────────────────────
const POPUP_KEY = '@mura-manager:trial-popup-last-shown';
const CLOSE_DELAY_MS = 4000; // 4 segundos obrigatórios antes de poder fechar

/** Retorna `true` se o popup ainda não foi exibido nas últimas 24 horas. */
export function shouldShowTrialPopup(isTrial: boolean, isAdmin: boolean): boolean {
  if (!isTrial || isAdmin) return false;
  const raw = localStorage.getItem(POPUP_KEY);
  if (!raw) return true;
  const elapsed = Date.now() - Number(raw);
  return elapsed >= 24 * 60 * 60 * 1000;
}

/** Registra o timestamp atual como "popup visto agora". */
export function markTrialPopupShown(): void {
  localStorage.setItem(POPUP_KEY, String(Date.now()));
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
interface TrialPopupModalProps {
  remainingDays: number;
  totalTrialDays?: number;           // padrão 7
  expiresAt?: string | null;
  onClose: () => void;
  onUpgrade: () => void;
}

export function TrialPopupModal({
  remainingDays,
  totalTrialDays = 7,
  expiresAt,
  onClose,
  onUpgrade,
}: TrialPopupModalProps) {
  // Countdown de segundos até liberar o botão de fechar
  const [countdown, setCountdown] = useState(Math.ceil(CLOSE_DELAY_MS / 1000));
  const [canClose, setCanClose] = useState(false);
  const [copied, setCopied] = useState(false);

  // Live countdown timer dos 7 dias com segundos, minutos, horas e dias
  const [timeLeft, setTimeLeft] = useState(() => {
    const targetMs = expiresAt ? new Date(expiresAt).getTime() : Date.now() + remainingDays * 86400000;
    const diff = Math.max(0, targetMs - Date.now());
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const targetMs = expiresAt ? new Date(expiresAt).getTime() : Date.now() + remainingDays * 86400000;
      const diff = Math.max(0, targetMs - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, remainingDays]);

  const daysUsed = totalTrialDays - remainingDays;
  const progressPct = Math.min(100, Math.round((daysUsed / totalTrialDays) * 100));

  // ── urgency color ──
  const urgencyColor =
    remainingDays <= 1
      ? { ring: 'border-red-500/60', glow: 'shadow-red-500/20', bar: 'bg-red-500', text: 'text-red-400', badge: 'bg-red-500/15 border-red-500/30 text-red-300' }
      : remainingDays <= 3
      ? { ring: 'border-orange-500/60', glow: 'shadow-orange-500/20', bar: 'bg-orange-500', text: 'text-orange-400', badge: 'bg-orange-500/15 border-orange-500/30 text-orange-300' }
      : { ring: 'border-amber-500/40', glow: 'shadow-amber-500/15', bar: 'bg-amber-400', text: 'text-amber-400', badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300' };

  const urgencyLabel =
    remainingDays <= 1 ? '🚨 Último dia!' :
    remainingDays <= 3 ? '⚠️ Acabando!' : '⏳ Em período de teste';

  // ── Countdown antes de poder fechar ──
  useEffect(() => {
    if (countdown <= 0) {
      setCanClose(true);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleClose = useCallback(() => {
    if (!canClose) return;
    markTrialPopupShown();
    onClose();
  }, [canClose, onClose]);

  const handleUpgrade = useCallback(() => {
    markTrialPopupShown();
    onUpgrade();
  }, [onUpgrade]);

  const pixKey = 'mura.manager.pay@gmail.com';

  const handleCopy = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return createPortal(
    <div id="trial-popup-overlay" className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* ── Backdrop escuro com leve blur ── */}
      <div className="absolute inset-0 bg-black/75" />

      {/* ── Card central ── */}
      <div
        className={`relative bg-[#0f1117] border ${urgencyColor.ring} rounded-3xl w-full max-w-sm shadow-2xl ${urgencyColor.glow} overflow-hidden animate-scale-up`}
        style={{ boxShadow: `0 0 60px 0 rgba(245,158,11,0.12), 0 25px 50px -12px rgba(0,0,0,0.7)` }}
      >
        {/* ── Faixa decorativa topo ── */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600" />

        {/* ── Partículas de fundo (decorativas) ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-8 right-8 w-32 h-32 rounded-full bg-amber-500/5 blur-2xl" />
          <div className="absolute bottom-8 left-8 w-24 h-24 rounded-full bg-orange-500/5 blur-2xl" />
        </div>

        <div className="relative p-6 space-y-5">

          {/* ── Ícone + urgência badge ── */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl border ${urgencyColor.badge} flex items-center justify-center shrink-0`}>
                <ShieldAlert size={24} className={urgencyColor.text} />
              </div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${urgencyColor.text}`}>
                  {urgencyLabel}
                </span>
                <h2 className="text-lg font-black text-white leading-tight mt-0.5">
                  Período de Teste
                </h2>
              </div>
            </div>

            {/* Botão de fechar com countdown */}
            <button
              onClick={handleClose}
              disabled={!canClose}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all font-black text-xs ${
                canClose
                  ? 'bg-white/5 hover:bg-white/10 text-white cursor-pointer active:scale-95'
                  : 'bg-white/5 text-theme-text-muted cursor-not-allowed'
              }`}
              title={canClose ? 'Fechar' : `Aguarde ${countdown}s`}
            >
              {canClose ? <X size={16} /> : <span>{countdown}</span>}
            </button>
          </div>

          {/* ── Dias restantes + timer regressivo dos 7 dias + barra de progresso ── */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Dias restantes</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`text-3xl font-black ${urgencyColor.text} leading-none`}>
                    {remainingDays}
                  </span>
                  <span className="text-sm font-bold text-theme-text-muted">
                    / {totalTrialDays} dias
                  </span>
                </div>

                {/* Timer pequenininho regressivo descendo os 7 dias com segundos, minutos, horas e dias */}
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/60 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold shadow-inner">
                  <Clock size={12} className="text-amber-400 shrink-0 animate-pulse" />
                  <span>
                    {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m {String(timeLeft.seconds).padStart(2, '0')}s
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-xl border ${urgencyColor.badge}`}>
                <Clock size={20} className={urgencyColor.text} />
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-theme-text-muted font-bold">
                <span>Trial consumido</span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-2 w-full bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className={`h-full ${urgencyColor.bar} rounded-full transition-all duration-1000`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Mensagem contextual ── */}
          <p className="text-[11px] text-theme-text-muted leading-relaxed text-center">
            {remainingDays <= 1
              ? 'Seus dados e plantel serão bloqueados amanhã. Assine agora para não perder nenhuma informação.'
              : remainingDays <= 3
              ? 'Seu teste está quase acabando. Garanta já sua assinatura com o desconto de lançamento.'
              : `Você tem ${remainingDays} dias para explorar todos os recursos. Assine antes que o desconto termine!`}
          </p>

          {/* ── Chave Pix rápida ── */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3.5 space-y-2">
            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
              Pagamento via Pix — ativação instantânea
            </p>
            <div className="flex items-center justify-between bg-black/30 border border-white/[0.06] rounded-xl px-3 py-2">
              <span className="font-mono text-[11px] text-white truncate">{pixKey}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[10px] font-black text-amber-400 hover:text-amber-300 transition-colors ml-2 shrink-0"
              >
                {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            {/* Mini planos clicáveis */}
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={handleUpgrade}
                className="bg-black/30 hover:bg-black/60 border border-white/[0.08] hover:border-amber-500/50 rounded-xl p-2 text-center cursor-pointer active:scale-95 transition-all group"
                title="Clique para ver o Plano Mensal Comum"
              >
                <p className="text-[8px] text-theme-text-muted font-bold uppercase group-hover:text-amber-300">Comum</p>
                <p className="text-xs sm:text-sm font-black text-white mt-0.5">R$ 39,90</p>
                <p className="text-[7px] text-amber-400/80 group-hover:text-amber-300 underline mt-0.5 font-bold">Ver →</p>
              </button>
              <button
                type="button"
                onClick={handleUpgrade}
                className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/70 rounded-xl p-2 text-center cursor-pointer active:scale-95 transition-all group"
                title="Clique para ver o Plano Mensal Completo"
              >
                <p className="text-[8px] text-amber-300 font-bold uppercase group-hover:text-amber-200">Completo</p>
                <p className="text-xs sm:text-sm font-black text-amber-300 mt-0.5">R$ 59,80</p>
                <p className="text-[7px] text-amber-400/80 group-hover:text-amber-300 underline mt-0.5 font-bold">Ver →</p>
              </button>
              <button
                type="button"
                onClick={handleUpgrade}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/70 rounded-xl p-2 text-center relative overflow-hidden cursor-pointer active:scale-95 transition-all group"
                title="Clique para ver o Plano Anual (21% OFF)"
              >
                <span className="absolute top-0 right-0 bg-emerald-500 text-black text-[6px] font-black px-1 py-0.2 rounded-bl-md">21% OFF</span>
                <p className="text-[8px] text-emerald-400 font-bold uppercase group-hover:text-emerald-300">Anual</p>
                <p className="text-xs sm:text-sm font-black text-emerald-400 mt-0.5">R$ 567,90</p>
                <p className="text-[7px] text-emerald-400 group-hover:text-emerald-300 underline mt-0.5 font-bold">Ver →</p>
              </button>
            </div>
          </div>

          {/* ── CTAs ── */}
          <div className="space-y-2.5">
            <button
              onClick={handleUpgrade}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
            >
              <Zap size={16} />
              <span>Garantir Acesso Agora</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={handleClose}
              disabled={!canClose}
              className={`w-full py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                canClose
                  ? 'border-white/10 text-theme-text-muted hover:text-white hover:border-white/20 cursor-pointer'
                  : 'border-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {canClose
                ? 'Continuar usando o período de teste'
                : `Aguarde ${countdown}s para continuar...`}
            </button>
          </div>

        </div>

        {/* ── Faixa inferior ── */}
        <div className="border-t border-white/[0.04] px-6 py-3 flex items-center justify-center gap-1.5">
          <Sparkles size={11} className="text-amber-500/60" />
          <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">
            Mura Manager · Sistema Elite de Criatório
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
