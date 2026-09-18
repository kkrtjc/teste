import { useNavigate } from 'react-router-dom';
import { Layers, Egg, Sparkles, ArrowRight, CheckCircle2, ChevronRight } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

interface ModuleLockedPaywallProps {
  module: 'lots' | 'eggs';
}

export function ModuleLockedPaywall({ module }: ModuleLockedPaywallProps) {
  const navigate = useNavigate();
  const { openUpgradeModal } = useAppContext();

  const isLots = module === 'lots';
  const title = isLots ? 'Gestão Profissional de Lotes' : 'Controle & Gestão de Ovos';
  const subtitle = isLots
    ? 'Organize lotes inteiros de postura, engorda e crescimento, controle pesagens, custos e relatórios oficiais.'
    : 'Monitore coletas diárias, taxa de postura, perdas, custos de produção e estoque de ovos para incubação.';

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      <div className="w-full max-w-2xl bg-theme-surface/90 border border-theme-border rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Header Badge & Icons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
                {isLots ? <Layers size={28} /> : <Egg size={28} />}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider mb-1">
                  <Sparkles size={11} />
                  <span>Módulo Exclusivo</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">{title}</h2>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold text-theme-text-muted uppercase block">Seu plano atual</span>
              <span className="text-xs font-bold text-zinc-300 bg-theme-base/80 px-2.5 py-1 rounded-lg border border-theme-border inline-block mt-0.5">
                Mensal Comum (Aves & Vitrine)
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-theme-text-muted leading-relaxed">
            {subtitle} Para liberar este módulo e todas as ferramentas de lote e ovos, faça o upgrade para o{' '}
            <strong className="text-white font-bold">Plano Completo</strong> por apenas mais{' '}
            <span className="text-amber-400 font-extrabold">R$ 19,90/mês</span> ou economize com o Anual Completo.
          </p>

          {/* Benefits list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-4 rounded-2xl bg-theme-base/40 border border-theme-border/60">
            <div className="flex items-start gap-2 text-xs text-zinc-300">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Lotes de Postura, Engorda e Crescimento</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-zinc-300">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Controle de Ovos, Coleta e Incubação</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-zinc-300">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Controle de Custos, Ração e Pesagem</span>
            </div>
            <div className="flex items-start gap-2 text-xs text-zinc-300">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Geração de Fichas e Relatórios em PDF</span>
            </div>
          </div>

          {/* Upgrade Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Mensal Completo (+ 19,90) */}
            <div className="p-4 rounded-2xl bg-theme-base/60 border border-theme-border hover:border-amber-500/50 transition-all flex flex-col justify-between gap-3 group">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">Mensal Completo</span>
                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    + R$ 19,90/mês
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">R$ 59,80</span>
                  <span className="text-xs text-theme-text-muted">/mês</span>
                </div>
                <p className="text-[11px] text-theme-text-muted mt-1 leading-snug">
                  Adicione Lotes & Gestão de Ovos à sua assinatura mensal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => openUpgradeModal('pro_monthly')}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <span>Desbloquear Lotes</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Anual Completo (567,90) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-theme-base/80 to-theme-base/60 border-2 border-amber-500/40 relative flex flex-col justify-between gap-3 shadow-lg shadow-amber-500/5">
              <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-[9px] uppercase tracking-wider shadow">
                21% OFF • Recomendado
              </span>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">Anual Completo</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-white">R$ 567,90</span>
                  <span className="text-xs text-theme-text-muted">/ano</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                  Equivale a <strong className="text-amber-400">R$ 47,32/mês</strong>. Todos os módulos 100% liberados por 1 ano.
                </p>
              </div>

              <button
                type="button"
                onClick={() => openUpgradeModal('yearly')}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <span>Migrar para o Anual</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Secondary Action */}
          <div className="pt-2 flex items-center justify-center">
            <button
              type="button"
              onClick={() => navigate('/birds')}
              className="text-xs font-bold text-theme-text-muted hover:text-white transition-colors cursor-pointer"
            >
              ← Voltar para Minhas Aves & Vitrine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
