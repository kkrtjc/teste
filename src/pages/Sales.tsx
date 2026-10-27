import { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, AlertTriangle, CheckCircle2, 
  RotateCcw, Download, Plus, Search, Calendar,
  HeartCrack, ArrowRightLeft, Clock, ShieldCheck, MessageSquare,
  Pencil, X, Eye
} from 'lucide-react';
import { useAppSlice } from '../lib/AppContext';
import { useHaptics } from '../hooks/useHaptics';
import { 
  formatBRL, 
  getMovementCents, 
  getMovementCentsWithFallback,
  parseMoneyToCents,
  sanitizeMoneyInput,
  formatMoneyOnBlur,
  centsToInput
} from '../lib/sales/money';
import { 
  summarize, 
  buildDynamicChartSeries, 
  pendingReceivables,
  filterHistory,
  rangeForPeriod,
  movementsToCSV,
  type PeriodKey
} from '../lib/sales/aggregate';
import { 
  TYPE_LABELS, 
  REASON_LABELS, 
  PAYMENT_LABELS,
  type BirdMovement, 
  type MovementType,
  type Range,
  type PaymentMethod
} from '../lib/sales/types';
import { RegisterSaleModal } from '../components/modals/RegisterSaleModal';
import { ReverseMovementModal } from '../components/modals/ReverseMovementModal';
import { todayLocalISO } from '../lib/dates';

export function Sales() {
  const { 
    movements, 
    birds, 
    reverseBirdMovement, 
    markPaymentReceived, 
    updateBirdMovementValue, 
    openBirdProfile,
    showToast 
  } = useAppSlice(
    'movements',
    'birds',
    'reverseBirdMovement',
    'markPaymentReceived',
    'updateBirdMovementValue',
    'openBirdProfile',
    'showToast'
  );
  const { triggerSuccess, triggerLight, triggerWarning } = useHaptics();

  const today = todayLocalISO();

  // Estados de Filtro de Período Inteligente
  const [periodo, setPeriodo] = useState<PeriodKey>('tudo');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  // Filtros de Listagem
  const [activeChip, setActiveChip] = useState<'todas' | 'vendas' | 'pendentes' | 'perdas' | 'estornos'>('todas');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(30);

  // Estados dos Modais
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [movementToReverse, setMovementToReverse] = useState<BirdMovement | null>(null);
  const [editingMovement, setEditingMovement] = useState<BirdMovement | null>(null);
  const [editPriceInput, setEditPriceInput] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('pix');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // Auto-healing: se existir venda sem valor gravado, mas a ave tiver preço conhecido no cadastro ou vitrine,
  // grava o valor automaticamente para que o faturamento reflita sem intervenção manual.
  useEffect(() => {
    if (!birds || birds.length === 0 || !movements || movements.length === 0) return;
    for (const m of movements) {
      if (m.tipo === 'venda' && !m.estornado && getMovementCents(m) === 0 && m.birdId) {
        const cents = getMovementCentsWithFallback(m, birds);
        if (cents > 0) {
          updateBirdMovementValue(m.id, cents, m.pagamento || 'pix');
          break;
        }
      }
    }
  }, [movements, birds, updateBirdMovementValue]);

  // Range personalizado quando 'custom' estiver ativo
  const customRange: Range = useMemo(() => {
    if (!customFrom) return {};
    if (!customTo) return { from: customFrom, to: customFrom };
    const from = customFrom <= customTo ? customFrom : customTo;
    const to = customFrom <= customTo ? customTo : customFrom;
    return { from, to };
  }, [customFrom, customTo]);

  // Intervalo ativo calculado com base na opção selecionada
  const activeRange = useMemo(() => {
    return rangeForPeriod(periodo, today, customRange);
  }, [periodo, today, customRange]);

  // Computação de Resumo Financeiro (O(n) memoizado, filtrado pelo período ativo)
  const summary = useMemo(() => {
    return summarize(movements, activeRange, birds);
  }, [movements, activeRange, birds]);

  // Gráfico dinâmico nativo e inteligente (responde imediatamente à mudança do filtro)
  const chartReport = useMemo(() => {
    return buildDynamicChartSeries(movements, periodo, today, customRange, birds);
  }, [movements, periodo, today, customRange, birds]);

  // Vendas pendentes prioritárias (A Receber), filtradas pelo período ativo
  const pendingSales = useMemo(() => {
    const allPending = pendingReceivables(movements);
    if (!activeRange.from && !activeRange.to) return allPending;
    return allPending.filter(m => 
      (!activeRange.from || m.data >= activeRange.from) && 
      (!activeRange.to || m.data <= activeRange.to)
    );
  }, [movements, activeRange]);

  // Movimentações filtradas para exibição no Ledger Timeline
  const filteredList = useMemo(() => {
    let tipos: MovementType[] | undefined = undefined;
    const includeReversed = activeChip === 'estornos';

    if (activeChip === 'vendas') {
      tipos = ['venda'];
    } else if (activeChip === 'pendentes') {
      return pendingSales.filter(m => 
        !search.trim() || 
        m.snapshot?.anilha?.toLowerCase().includes(search.toLowerCase()) ||
        m.snapshot?.nome?.toLowerCase().includes(search.toLowerCase()) ||
        m.comprador?.nome?.toLowerCase().includes(search.toLowerCase())
      );
    } else if (activeChip === 'perdas') {
      tipos = ['perda', 'saida'];
    }

    return filterHistory(movements, {
      tipos,
      query: search.trim() || undefined,
      range: activeRange,
      includeReversed: includeReversed || activeChip === 'todas'
    });
  }, [movements, activeChip, activeRange, search, pendingSales]);

  // Vendas no período ativo que estão sem valor financeiro informado
  const unpricedSales = useMemo(() => {
    return filteredList.filter(m => m.tipo === 'venda' && !m.estornado && getMovementCentsWithFallback(m, birds) === 0);
  }, [filteredList, birds]);

  // Ação de confirmar recebimento de venda pendente
  const handleConfirmPayment = useCallback(async (movementId: string) => {
    triggerLight();
    const res = await markPaymentReceived(movementId, todayLocalISO());
    if (res.success) {
      triggerSuccess();
    }
  }, [markPaymentReceived, triggerLight, triggerSuccess]);

  // Ação de confirmar estorno
  const handleConfirmReverse = useCallback(async (movementId: string, motivo: string) => {
    const res = await reverseBirdMovement(movementId, motivo);
    if (res.success) {
      triggerSuccess();
    } else {
      triggerWarning();
    }
  }, [reverseBirdMovement, triggerSuccess, triggerWarning]);

  // Exportar dados para CSV seguro filtrados pelo período ativo
  const handleExportCSV = useCallback(() => {
    triggerLight();
    if (filteredList.length === 0) {
      showToast('Não há movimentações no período para exportar.', 'info');
      return;
    }
    const csvContent = movementsToCSV(filteredList);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vendas-movimentacoes-${todayLocalISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Relatório CSV baixado com sucesso!', 'success');
  }, [filteredList, showToast, triggerLight]);

  // Valor máximo para normalização proporcional das barras do gráfico SVG
  const maxSeriesValue = useMemo(() => {
    const max = Math.max(...chartReport.bars.map(b => b.receita), 100);
    return max;
  }, [chartReport.bars]);

  const displayedList = useMemo(() => {
    return filteredList.slice(0, visibleCount);
  }, [filteredList, visibleCount]);

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4 max-w-7xl mx-auto pb-24 sm:pb-12">
      {/* ── HEADER PRINCIPAL ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-theme-surface border border-theme-border p-4 sm:p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Vendas & Movimentações
              </h1>
              <p className="text-xs text-theme-text-muted mt-0.5">
                Controle financeiro do criatório, saídas, perdas e recebimentos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 bg-theme-base hover:bg-theme-surface border border-theme-border hover:border-theme-primary/50 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer touch-manipulation"
            title="Exportar dados para Excel/CSV"
          >
            <Download size={15} className="text-theme-primary" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerLight();
              setIsRegisterModalOpen(true);
            }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer touch-manipulation"
          >
            <Plus size={16} />
            <span>Registrar Venda / Saída</span>
          </button>
        </div>
      </div>

      {/* ── SELETOR DE PERÍODO INTELIGENTE ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 p-1 bg-theme-surface border border-theme-border rounded-xl">
            {[
              { key: 'hoje', label: 'Hoje' },
              { key: '7d', label: 'Últimos 7 dias' },
              { key: '30d', label: 'Últimos 30 dias' },
              { key: 'tudo', label: 'Todo o período' },
              { key: 'custom', label: 'Personalizado' }
            ].map(p => {
              const active = periodo === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    triggerLight();
                    setPeriodo(p.key as PeriodKey);
                    setVisibleCount(30);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all touch-manipulation whitespace-nowrap ${
                    active
                      ? 'bg-theme-primary text-black shadow-sm font-black'
                      : 'text-theme-text-muted hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <span className="text-[11px] text-theme-text-muted hidden sm:inline-flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Ledger Imutável • Auditoria Contábil</span>
          </span>
        </div>

        {/* Barra de Filtro de Data Personalizada (Dia Único ou Intervalo) */}
        {periodo === 'custom' && (
          <div className="p-3 bg-theme-surface border border-theme-border rounded-xl flex flex-wrap items-center gap-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-theme-primary shrink-0" />
              <span className="font-bold text-white">De:</span>
              <input
                type="date"
                value={customFrom}
                onChange={e => {
                  setCustomFrom(e.target.value);
                  if (!customTo || customTo < e.target.value) {
                    setCustomTo(e.target.value);
                  }
                  setVisibleCount(30);
                }}
                className="bg-theme-base border border-theme-border rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-theme-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Até:</span>
              <input
                type="date"
                value={customTo}
                onChange={e => {
                  setCustomTo(e.target.value);
                  setVisibleCount(30);
                }}
                className="bg-theme-base border border-theme-border rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-theme-primary"
              />
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => {
                  setCustomFrom(today);
                  setCustomTo(today);
                  setVisibleCount(30);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-theme-base hover:bg-theme-border border border-theme-border text-theme-text-muted hover:text-white rounded-lg transition-colors cursor-pointer touch-manipulation"
              >
                Apenas Hoje
              </button>
              <button
                type="button"
                onClick={() => {
                  const [y, m, d] = today.split('-').map(Number);
                  const dt = new Date(Date.UTC(y, m - 1, d - 1));
                  const yesterday = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
                  setCustomFrom(yesterday);
                  setCustomTo(yesterday);
                  setVisibleCount(30);
                }}
                className="px-2.5 py-1 text-[11px] font-bold bg-theme-base hover:bg-theme-border border border-theme-border text-theme-text-muted hover:text-white rounded-lg transition-colors cursor-pointer touch-manipulation"
              >
                Apenas Ontem
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── KPI CARDS (FINANCEIRO & OPERACIONAL FILTRADOS) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Receita Total */}
        <div className="p-4 bg-theme-surface border border-theme-border rounded-2xl shadow-sm space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-theme-text-muted text-xs">
            <span className="font-semibold">Faturamento Bruto</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {formatBRL(summary.receita)}
          </p>
          <p className="text-[11px] text-theme-text-muted">
            {summary.vendasCount} ave(s) vendida(s) no período
          </p>
        </div>

        {/* Total Recebido */}
        <div className="p-4 bg-theme-surface border border-theme-border rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-theme-text-muted text-xs">
            <span className="font-semibold">Total Recebido</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
            {formatBRL(summary.recebido)}
          </p>
          <p className="text-[11px] text-theme-text-muted">
            Dinheiro em caixa confirmado
          </p>
        </div>

        {/* A Receber (Pendentes) */}
        <div className={`p-4 rounded-2xl border shadow-sm space-y-1 transition-all ${
          summary.aReceber > 0
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
            : 'bg-theme-surface border-theme-border text-theme-text-muted'
        }`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">A Receber</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              summary.aReceber > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-theme-text-muted'
            }`}>
              <Clock size={15} />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {formatBRL(summary.aReceber)}
          </p>
          <p className="text-[11px] text-theme-text-muted">
            {pendingSales.length} venda(s) a receber
          </p>
        </div>

        {/* Lucro Líquido Real */}
        <div className="p-4 bg-theme-surface border border-theme-border rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-theme-text-muted text-xs">
            <span className="font-semibold">Lucro Real Estimado</span>
            <div className="w-7 h-7 rounded-lg bg-theme-primary/10 text-theme-primary flex items-center justify-center">
              <DollarSign size={15} />
            </div>
          </div>
          <p className={`text-xl sm:text-2xl font-black tracking-tight ${
            summary.lucro >= 0 ? 'text-theme-primary' : 'text-rose-400'
          }`}>
            {formatBRL(summary.lucro)}
          </p>
          <p className="text-[11px] text-theme-text-muted">
            Ticket médio: {formatBRL(summary.ticketMedio)}
          </p>
        </div>
      </div>

      {/* ── ALERTA DE VENDAS SEM VALOR DEFINIDO ── */}
      {unpricedSales.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 animate-fade-in shadow-lg shadow-amber-950/20">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {unpricedSales.length === 1 
                  ? 'Existe 1 venda registrada neste período sem valor financeiro informado'
                  : `Existem ${unpricedSales.length} vendas registradas neste período sem valor financeiro informado`}
              </p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Por isso o faturamento bruto mostra R$ 0,00. Clique no botão ao lado para informar o valor e atualizar as contas na hora.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerLight();
              const first = unpricedSales[0];
              setEditingMovement(first);
              setEditPriceInput('');
              setEditPaymentMethod(first.pagamento || 'pix');
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black shadow-md transition-all shrink-0 cursor-pointer touch-manipulation flex items-center justify-center gap-1.5"
          >
            <DollarSign size={14} />
            <span>Definir Valor Agora</span>
          </button>
        </div>
      )}

      {/* ── GRÁFICO SVG NATIVO LEVE (DINÂMICO CONFORME O FILTRO SELECIONADO) ── */}
      <div className="p-4 sm:p-5 bg-theme-surface border border-theme-border rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{chartReport.title}</span>
              {periodo !== 'tudo' && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Filtro Ativo
                </span>
              )}
            </h3>
            <p className="text-[11px] text-theme-text-muted">{chartReport.subtitle}</p>
          </div>
          <span className="text-xs font-mono font-bold text-theme-primary">
            {formatBRL(chartReport.totalReceita)} no período
          </span>
        </div>

        <div className="h-40 w-full flex items-end gap-1.5 sm:gap-3 pt-4 px-1 overflow-x-auto">
          {chartReport.bars.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-theme-text-muted">
              Sem movimentações no período
            </div>
          ) : (
            chartReport.bars.map(item => {
              const heightPercent = maxSeriesValue > 0 
                ? Math.max(8, Math.round((item.receita / maxSeriesValue) * 100))
                : 8;
              return (
                <div key={item.key} className="flex-1 min-w-[38px] max-w-[64px] flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className={`text-[10px] font-mono text-emerald-400 font-bold truncate max-w-full transition-opacity ${
                    item.receita > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}>
                    {formatBRL(item.receita)}
                  </span>
                  <div 
                    className={`w-full rounded-t-lg transition-all ${
                      item.isHighlight
                        ? 'bg-theme-primary hover:brightness-110 shadow-sm shadow-theme-primary/30 border border-theme-primary'
                        : item.receita > 0
                          ? 'bg-emerald-500/40 hover:bg-emerald-500 border border-emerald-500/60'
                          : 'bg-white/5 border border-white/10'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                    title={`${item.label}${item.sublabel ? ` (${item.sublabel})` : ''}: ${formatBRL(item.receita)} (${item.vendas} venda(s))`}
                  />
                  <div className="flex flex-col items-center">
                    <span className={`text-[11px] font-bold tracking-tight truncate max-w-full ${
                      item.isHighlight ? 'text-theme-primary font-black' : 'text-theme-text-muted'
                    }`}>
                      {item.label}
                    </span>
                    {item.sublabel && (
                      <span className="text-[9px] text-theme-text-muted/70 truncate max-w-full">
                        {item.sublabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── ALERTA DE RECEBÍVEIS PENDENTES DO PERÍODO (SE HOUVER) ── */}
      {pendingSales.length > 0 && (
        <div className="p-4 sm:p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Vendas Pendentes de Recebimento ({pendingSales.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-amber-300">
              Total: {formatBRL(pendingSales.reduce((acc, m) => acc + getMovementCents(m), 0))}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {pendingSales.map(m => {
              const cleanPhone = m.comprador?.contato?.replace(/[^0-9]/g, '') || '';
              const whatsappUrl = cleanPhone 
                ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(`Olá ${m.comprador?.nome || ''}, tudo bem? Estou entrando em contato sobre a ave ${m.snapshot?.anilha || m.snapshot?.nome || ''} no valor de ${formatBRL(m.valorCentavos)}.`)}`
                : null;

              return (
                <div 
                  key={m.id}
                  className="p-3 bg-theme-base/80 border border-theme-border rounded-xl flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-white truncate">
                      Ave: {m.snapshot?.anilha || m.snapshot?.nome}
                    </p>
                    <p className="text-[11px] text-theme-text-muted truncate">
                      Comprador: <strong className="text-white">{m.comprador?.nome || 'Não informado'}</strong>
                    </p>
                    <p className="text-[10px] text-theme-text-muted">
                      Vendido em {m.data} • {formatBRL(m.valorCentavos)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors touch-manipulation"
                        title="Cobrar via WhatsApp"
                      >
                        <MessageSquare size={14} />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleConfirmPayment(m.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer touch-manipulation"
                    >
                      Confirmar Pago
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BARRA DE PESQUISA & FILTROS DE CHIPS ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: 'todas', label: 'Todas' },
              { key: 'vendas', label: 'Vendas' },
              { key: 'pendentes', label: `A Receber (${pendingSales.length})` },
              { key: 'perdas', label: 'Perdas / Saídas' },
              { key: 'estornos', label: 'Estornos' }
            ].map(c => {
              const active = activeChip === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    triggerLight();
                    setActiveChip(c.key as typeof activeChip);
                    setVisibleCount(30);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 touch-manipulation ${
                    active
                      ? 'bg-theme-primary/15 border-theme-primary text-theme-primary shadow-sm'
                      : 'bg-theme-surface border-theme-border text-theme-text-muted hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Busca textual */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
            <input
              type="text"
              placeholder="Buscar anilha, comprador..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setVisibleCount(30);
              }}
              className="w-full bg-theme-surface border border-theme-border rounded-xl py-1.5 pl-8 pr-3 text-xs text-white outline-none focus:border-theme-primary"
            />
          </div>
        </div>

        {/* ── LISTA CHRONOLÓGICA / TIMELINE DO LEDGER ── */}
        <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-theme-border bg-theme-base/50 flex items-center justify-between">
            <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
              Histórico de Movimentações ({filteredList.length})
            </span>
            <span className="text-[11px] text-theme-text-muted">
              Filtrado por período • Ordenado por data
            </span>
          </div>

          {filteredList.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 mx-auto flex items-center justify-center text-theme-text-muted">
                <ArrowRightLeft size={22} />
              </div>
              <p className="text-sm font-bold text-white">Nenhuma movimentação encontrada</p>
              <p className="text-xs text-theme-text-muted max-w-sm mx-auto">
                Não há registros com os filtros e período selecionados.
              </p>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm touch-manipulation cursor-pointer"
              >
                <Plus size={14} />
                <span>Registrar Venda / Saída</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-theme-border">
              {displayedList.map(item => {
                const isVenda = item.tipo === 'venda';
                const isPerda = item.tipo === 'perda';
                const isPendente = isVenda && item.statusPagamento === 'pendente';
                const effectiveCents = getMovementCentsWithFallback(item, birds);

                return (
                  <div
                    key={item.id}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '0 72px' }}
                    className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      item.estornado ? 'opacity-60 bg-black/20' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Lado Esquerdo: Identificação da Ave & Tipo */}
                    <div 
                      onClick={() => {
                        if (item.birdId) {
                          triggerLight();
                          openBirdProfile(item.birdId);
                        }
                      }}
                      className="flex items-start sm:items-center gap-3 min-w-0 flex-1 cursor-pointer group"
                      title="Clique para abrir a ficha da ave"
                    >
                      {/* Avatar / Ícone do tipo */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                        item.estornado ? 'bg-gray-500/15 border-gray-500/30 text-gray-400' :
                        isVenda ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' :
                        isPerda ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' :
                        'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      }`}>
                        {item.estornado ? <RotateCcw size={18} /> :
                         isVenda ? <DollarSign size={18} /> :
                         isPerda ? <HeartCrack size={18} /> :
                         <ArrowRightLeft size={18} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            item.estornado ? 'bg-gray-500/10 border-gray-500/30 text-gray-400 line-through' :
                            isVenda ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                            isPerda ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                            'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}>
                            {TYPE_LABELS[item.tipo]} {item.estornado ? '(Estornado)' : ''}
                          </span>

                          <span className="font-mono text-xs font-bold text-white group-hover:text-theme-primary transition-colors underline decoration-dotted decoration-white/30 underline-offset-2">
                            {item.snapshot?.anilha || 'Sem anilha'}
                          </span>

                          {item.snapshot?.nome && (
                            <span className="text-xs text-theme-text-muted truncate">
                              • {item.snapshot.nome}
                            </span>
                          )}

                          {isPendente && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              A Receber
                            </span>
                          )}

                          <span className="text-[10px] text-theme-primary/80 group-hover:text-theme-primary hidden sm:inline-flex items-center gap-0.5 font-bold">
                            <Eye size={11} /> Ficha
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-theme-text-muted mt-1 flex-wrap">
                          <span>{item.data}</span>
                          {item.comprador?.nome && (
                            <span>• Comprador: <strong className="text-white">{item.comprador.nome}</strong></span>
                          )}
                          {item.pagamento && (
                            <span>• {PAYMENT_LABELS[item.pagamento] ?? item.pagamento}</span>
                          )}
                          {item.motivo && (
                            <span>• Motivo: {REASON_LABELS[item.motivo] ?? item.motivo}</span>
                          )}
                          {item.observacao && (
                            <span className="italic truncate max-w-xs">({item.observacao})</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito: Valores & Ações */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-theme-border/40">
                      {isVenda && !item.estornado ? (
                        effectiveCents > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="text-left sm:text-right">
                              <p className="font-mono text-sm sm:text-base font-bold text-emerald-400">
                                {formatBRL(effectiveCents)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                triggerLight();
                                setEditingMovement(item);
                                setEditPriceInput(centsToInput(effectiveCents));
                                setEditPaymentMethod(item.pagamento || 'pix');
                              }}
                              className="p-1 rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer touch-manipulation"
                              title="Editar valor da venda"
                            >
                              <Pencil size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Sem valor informado
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                triggerLight();
                                setEditingMovement(item);
                                setEditPriceInput('');
                                setEditPaymentMethod(item.pagamento || 'pix');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer touch-manipulation flex items-center gap-1"
                            >
                              <DollarSign size={13} />
                              <span>Definir Valor</span>
                            </button>
                          </div>
                        )
                      ) : (
                        effectiveCents > 0 && (
                          <div className="text-left sm:text-right">
                            <p className={`font-mono text-sm sm:text-base font-bold ${
                              item.estornado ? 'text-gray-400 line-through' : 'text-emerald-400'
                            }`}>
                              {formatBRL(effectiveCents)}
                            </p>
                          </div>
                        )
                      )}

                      {/* Botões de Ação na Linha */}
                      <div className="flex items-center gap-1.5">
                        {item.birdId && (
                          <button
                            type="button"
                            onClick={() => {
                              triggerLight();
                              openBirdProfile(item.birdId);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-theme-base hover:bg-theme-border text-theme-text-muted hover:text-white border border-theme-border/60 transition-colors cursor-pointer touch-manipulation flex items-center gap-1 text-[11px] font-bold"
                            title="Ver ficha completa da ave"
                          >
                            <Eye size={13} className="text-theme-primary" />
                            <span className="hidden sm:inline">Ficha da Ave</span>
                          </button>
                        )}

                        {isPendente && !item.estornado && (
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment(item.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer touch-manipulation"
                          >
                            Receber
                          </button>
                        )}

                        {!item.estornado && (
                          <button
                            type="button"
                            onClick={() => setMovementToReverse(item)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/15 text-theme-text-muted hover:text-rose-400 transition-colors cursor-pointer touch-manipulation"
                            title="Estornar movimentação"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredList.length > visibleCount && (
                <div className="p-3 text-center border-t border-theme-border bg-theme-base/30">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(c => c + 30)}
                    className="px-4 py-2 text-xs font-bold text-theme-primary bg-theme-primary/10 hover:bg-theme-primary/20 rounded-xl transition-colors cursor-pointer touch-manipulation"
                  >
                    Mostrar mais ({filteredList.length - visibleCount} restantes)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MODAIS ── */}
      <RegisterSaleModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />

      <ReverseMovementModal
        isOpen={Boolean(movementToReverse)}
        movement={movementToReverse}
        onClose={() => setMovementToReverse(null)}
        onConfirm={handleConfirmReverse}
      />

      {/* ── MODAL DEFINIR / EDITAR VALOR DA VENDA ── */}
      {editingMovement && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => !isSavingPrice && setEditingMovement(null)}
        >
          <div 
            className="w-full max-w-md bg-theme-surface border border-theme-border rounded-2xl shadow-2xl p-5 space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-theme-border pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {getMovementCentsWithFallback(editingMovement, birds) > 0 ? 'Editar Valor da Venda' : 'Definir Valor da Venda'}
                  </h3>
                  <p className="text-[11px] text-theme-text-muted">
                    {editingMovement.snapshot?.anilha || 'Ave'} {editingMovement.snapshot?.nome ? `• ${editingMovement.snapshot.nome}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSavingPrice}
                onClick={() => setEditingMovement(null)}
                className="p-1.5 rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-theme-text-muted mb-1">
                  Valor Negociado (R$) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={editPriceInput}
                  onChange={e => setEditPriceInput(sanitizeMoneyInput(e.target.value))}
                  onBlur={() => setEditPriceInput(formatMoneyOnBlur(editPriceInput))}
                  className="w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2 text-sm text-white font-mono font-bold outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-theme-text-muted mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={e => setEditPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="pix">PIX</option>
                  <option value="dinheiro">Dinheiro em Espécie</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="cartao_debito">Cartão de Débito</option>
                  <option value="transferencia">Transferência Bancária</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <p className="text-[11px] text-theme-text-muted bg-white/5 p-2.5 rounded-xl border border-white/5">
                O valor informado atualizará o Faturamento Bruto, o Total Recebido e as métricas do gráfico em todos os períodos retroativamente.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-theme-border">
              <button
                type="button"
                disabled={isSavingPrice}
                onClick={() => setEditingMovement(null)}
                className="px-4 py-2 text-xs font-bold text-theme-text-muted hover:text-white rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingPrice}
                onClick={async () => {
                  const cents = parseMoneyToCents(editPriceInput);
                  if (cents === null || cents <= 0) {
                    showToast('Informe um valor válido maior que zero (ex: 250,00).', 'error');
                    triggerWarning();
                    return;
                  }
                  setIsSavingPrice(true);
                  try {
                    const res = await updateBirdMovementValue(editingMovement.id, cents, editPaymentMethod);
                    if (res.success) {
                      triggerSuccess();
                      showToast('Valor da venda atualizado com sucesso!', 'success');
                      setEditingMovement(null);
                    } else {
                      triggerWarning();
                      showToast(res.error || 'Erro ao atualizar valor da venda.', 'error');
                    }
                  } finally {
                    setIsSavingPrice(false);
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation disabled:opacity-50"
              >
                <CheckCircle2 size={14} />
                <span>{isSavingPrice ? 'Salvando...' : 'Salvar Valor'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
