/**
 * LotEconomicsModal — Calculadora de Custo & Lucro do lote.
 *
 * Desempenho:
 *  - Carregado sob demanda (React.lazy) — não pesa no carregamento da aba Lotes.
 *  - Cálculo via compute*Economics (memoizado por referência do lote).
 *  - Listas limitadas às 15 entradas mais recentes até o usuário pedir "ver todas".
 *  - Sem backdrop-blur (caro na GPU de celulares simples).
 */
import { memo, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, TrendingUp, TrendingDown, Wallet, Plus, Trash2, Calculator, ShoppingCart, Info } from 'lucide-react';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import {
  EXTRA_COST_CATEGORIES,
  type EggLot, type MeatLot, type ExtraCost, type ExtraCostCategory, type LotSale, type LotMovementRecord,
} from '../../lib/AppContext';
import {
  computeEggLotEconomics, computeMeatLotEconomics, parseBRNumber, localISO,
  fmtBRL, fmtDec1, fmtDec2, type EconomicsPeriod, type CostBreakdownItem,
} from '../../lib/lotEconomics';

type LotKind = 'postura' | 'engorda' | 'pintinhos';

export interface LotEconomicsModalProps {
  kind: LotKind;
  lot: EggLot | MeatLot;
  onClose: () => void;
  editEggLot: (id: string, updated: Partial<EggLot>) => void;
  editMeatLot: (id: string, updated: Partial<MeatLot>) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`);
const inputCls = 'w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-theme-text-muted/50 focus:border-theme-primary outline-none';
const labelCls = 'block text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1';
const LIST_LIMIT = 15;

function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y?.slice(2)}`;
}

const Kpi = memo(function Kpi({ label, value, hint, tone = 'neutral' }: { label: string; value: string; hint?: string; tone?: 'neutral' | 'good' | 'bad' | 'warn' }) {
  const color = tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-rose-400' : tone === 'warn' ? 'text-amber-400' : 'text-white';
  return (
    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50 min-w-0">
      <p className="text-[10px] font-bold text-theme-text-muted uppercase truncate">{label}</p>
      <p className={`text-base font-black truncate ${color}`}>{value}</p>
      {hint && <p className="text-[10px] text-theme-text-muted truncate">{hint}</p>}
    </div>
  );
});

const Breakdown = memo(function Breakdown({ items, total }: { items: CostBreakdownItem[]; total: number }) {
  if (items.length === 0 || total <= 0) return null;
  return (
    <div className="space-y-2">
      <p className={labelCls}>Para onde vai o dinheiro</p>
      {items.map(it => {
        const pct = (it.valor / total) * 100;
        return (
          <div key={it.label}>
            <div className="flex justify-between text-[11px] mb-0.5">
              <span className="text-white font-bold truncate">{it.label}</span>
              <span className="text-theme-text-muted shrink-0 ml-2">{fmtBRL(it.valor)} · {fmtDec1(pct)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-theme-base overflow-hidden">
              <div className="h-full bg-theme-primary rounded-full" style={{ width: `${Math.max(2, pct)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default function LotEconomicsModal({ kind, lot, onClose, editEggLot, editMeatLot, showToast }: LotEconomicsModalProps) {
  useModalScrollLock(true);
  const isEgg = kind === 'postura';
  const [period, setPeriod] = useState<EconomicsPeriod>('tudo');
  const [panel, setPanel] = useState<'none' | 'custo' | 'venda'>('none');
  const [showAllCosts, setShowAllCosts] = useState(false);
  const [showAllSales, setShowAllSales] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Formulário de custo
  const [cCat, setCCat] = useState<ExtraCostCategory>(EXTRA_COST_CATEGORIES[0]);
  const [cValor, setCValor] = useState('');
  const [cData, setCData] = useState(localISO());
  const [cDesc, setCDesc] = useState('');

  // Formulário de venda (corte)
  const [vValor, setVValor] = useState('');
  const [vQtd, setVQtd] = useState('');
  const [vKg, setVKg] = useState('');
  const [vData, setVData] = useState(localISO());

  const meatLot = isEgg ? null : (lot as MeatLot);
  const eggLot = isEgg ? (lot as EggLot) : null;
  const [precoKg, setPrecoKg] = useState(() => (meatLot?.precoVendaKg ? fmtDec2(meatLot.precoVendaKg) : ''));

  const meat = useMemo(() => (meatLot ? computeMeatLotEconomics(meatLot) : null), [meatLot]);
  const egg = useMemo(() => (eggLot ? computeEggLotEconomics(eggLot, period) : null), [eggLot, period]);

  const extras = lot.custosExtras || [];
  const sortedExtras = useMemo(() => [...extras].sort((a, b) => (b.data || '').localeCompare(a.data || '')), [extras]);
  const sales = meatLot?.vendas || [];
  const sortedSales = useMemo(() => [...sales].sort((a, b) => (b.data || '').localeCompare(a.data || '')), [sales]);

  const save = useCallback((patch: Partial<EggLot> & Partial<MeatLot>) => {
    if (isEgg) editEggLot(lot.id, patch as Partial<EggLot>);
    else editMeatLot(lot.id, patch as Partial<MeatLot>);
  }, [isEgg, lot.id, editEggLot, editMeatLot]);

  const handleAddCost = () => {
    const valor = parseBRNumber(cValor);
    if (!Number.isFinite(valor) || valor <= 0) { showToast('Informe um valor maior que zero.', 'warning'); return; }
    const entry: ExtraCost = { id: uid(), data: cData || localISO(), categoria: cCat, valor, ...(cDesc.trim() ? { descricao: cDesc.trim() } : {}) };
    save({ custosExtras: [...extras, entry] });
    setCValor(''); setCDesc(''); setPanel('none');
    showToast(`Custo de ${fmtBRL(valor)} lançado.`, 'success');
  };

  const handleAddSale = () => {
    if (!meatLot) return;
    const valor = parseBRNumber(vValor);
    if (!Number.isFinite(valor) || valor <= 0) { showToast('Informe o valor recebido.', 'warning'); return; }
    const qtd = Math.floor(parseBRNumber(vQtd) || 0);
    const kg = parseBRNumber(vKg);
    const avesAtuais = meat?.avesAtuais ?? 0;
    if (qtd > avesAtuais) { showToast(`O lote tem só ${avesAtuais} aves.`, 'warning'); return; }

    const sale: LotSale = {
      id: uid(), data: vData || localISO(), valorTotal: valor,
      ...(qtd > 0 ? { quantidadeAves: qtd } : {}),
      ...(Number.isFinite(kg) && kg > 0 ? { kgTotal: kg } : {}),
    };
    const patch: Partial<MeatLot> = { vendas: [...sales, sale] };

    // Baixa automática das aves vendidas (lotes por quantidade). Lotes com aves
    // individuais usam a tela de Movimentações para escolher quais aves saíram.
    const usesIndividualBirds = (meatLot.avesIds?.length || 0) > 0;
    if (qtd > 0 && !usesIndividualBirds) {
      const mov: LotMovementRecord = { id: uid(), tipo: 'saida', quantidade: qtd, motivo: 'Venda', data: sale.data, observacao: `Venda de ${fmtBRL(valor)}` };
      patch.movimentacoes = [...(meatLot.movimentacoes || []), mov];
      patch.qtdAves = Math.max(0, avesAtuais - qtd);
    }
    editMeatLot(meatLot.id, patch);
    setVValor(''); setVQtd(''); setVKg(''); setPanel('none');
    showToast(qtd > 0 && usesIndividualBirds
      ? 'Venda registrada. Dê baixa nas aves em Movimentações.'
      : 'Venda registrada!', 'success');
  };

  const handleSavePrice = () => {
    const v = parseBRNumber(precoKg);
    if (precoKg.trim() === '') { save({ precoVendaKg: 0 }); showToast('Preço removido.', 'info'); return; }
    if (!Number.isFinite(v) || v <= 0) { showToast('Preço inválido.', 'warning'); return; }
    save({ precoVendaKg: v });
    setPrecoKg(fmtDec2(v));
    showToast('Preço de venda salvo.', 'success');
  };

  const confirmDelete = (kindDel: 'custo' | 'venda', id: string) => {
    if (pendingDelete !== id) { setPendingDelete(id); return; }
    if (kindDel === 'custo') save({ custosExtras: extras.filter(c => c.id !== id) });
    else save({ vendas: sales.filter(s => s.id !== id) });
    setPendingDelete(null);
    showToast('Lançamento removido.', 'info');
  };

  const title = isEgg ? 'Lote de Postura' : kind === 'pintinhos' ? 'Lote de Pintinhos' : 'Lote de Engorda';

  // ── Resultado principal ────────────────────────────────────────────────
  let heroLabel = '';
  let heroValue = 0;
  let heroHint = '';
  let heroKnown = true;
  if (egg) {
    heroLabel = egg.lucro >= 0 ? 'Lucro do período' : 'Prejuízo do período';
    heroValue = egg.lucro;
    heroHint = `Receita ${fmtBRL(egg.receita)} − Custos ${fmtBRL(egg.custoTotal)}`;
  } else if (meat) {
    if (meat.lucroProjetado !== null) {
      const encerrado = meatLot?.status === 'Abatido';
      heroLabel = encerrado ? (meat.lucroProjetado >= 0 ? 'Lucro final' : 'Prejuízo final') : (meat.lucroProjetado >= 0 ? 'Lucro previsto' : 'Prejuízo previsto');
      heroValue = meat.lucroProjetado;
      heroHint = meat.receitaProjetada > 0
        ? `Vendido ${fmtBRL(meat.receitaRealizada)} + no lote ${fmtBRL(meat.receitaProjetada)} − Custos ${fmtBRL(meat.custoTotal)}`
        : `Receita ${fmtBRL(meat.receitaRealizada)} − Custos ${fmtBRL(meat.custoTotal)}`;
    } else {
      heroKnown = false;
      heroLabel = 'Custo acumulado';
      heroValue = meat.custoTotal;
      heroHint = 'Informe o preço de venda por kg abaixo para ver o lucro previsto.';
    }
  }
  const positive = heroValue >= 0;
  const temDados = egg ? egg.temDados : meat ? meat.temDados : false;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center bg-black/80 animate-fade-in" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg max-h-[92dvh] bg-theme-base border border-theme-border rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Custos e lucro — ${title}`}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme-border shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-theme-primary uppercase tracking-wider flex items-center gap-1"><Calculator size={12} /> Custos & Lucro</p>
            <h2 className="text-base font-black text-white truncate">{title} — Baia {lot.baia}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2.5 rounded-xl bg-theme-surface border border-theme-border text-theme-text-muted hover:text-white shrink-0" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {isEgg && (
            <div className="grid grid-cols-3 gap-1 p-1 bg-theme-surface rounded-xl border border-theme-border/50">
              {([['tudo', 'Tudo'], ['mes', 'Este mês'], ['30d', '30 dias']] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setPeriod(k)}
                  className={`py-2 rounded-lg text-xs font-bold transition-colors ${period === k ? 'bg-theme-primary text-black' : 'text-theme-text-muted'}`}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Resultado */}
          <div className={`p-4 rounded-2xl border ${!heroKnown ? 'bg-theme-surface border-theme-border' : positive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
            <p className="text-[11px] font-bold uppercase text-theme-text-muted flex items-center gap-1.5">
              {!heroKnown ? <Wallet size={13} /> : positive ? <TrendingUp size={13} className="text-emerald-400" /> : <TrendingDown size={13} className="text-rose-400" />}
              {heroLabel}
            </p>
            <p className={`text-3xl font-black mt-1 ${!heroKnown ? 'text-white' : positive ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtBRL(heroValue)}</p>
            <p className="text-[11px] text-theme-text-muted mt-1">{heroHint}</p>
            {egg?.custoEstimado && (
              <p className="text-[10px] text-amber-400 mt-2 flex items-start gap-1"><Info size={11} className="mt-0.5 shrink-0" />Custo estimado pelo "custo por ovo" dos registros. Lance a ração para ter o custo real.</p>
            )}
          </div>

          {!temDados && (
            <div className="p-3 rounded-xl bg-theme-surface border border-dashed border-theme-border text-[11px] text-theme-text-muted">
              Ainda não há custos nem vendas neste lote. Lance a ração no botão <b className="text-amber-400">Ração</b> do lote e os outros custos aqui embaixo — o app calcula o resto sozinho.
            </div>
          )}

          {/* Indicadores */}
          {meat && (
            <div className="grid grid-cols-2 gap-2">
              <Kpi label="Custo por ave" value={meat.custoPorAve !== null ? fmtBRL(meat.custoPorAve) : '—'} hint={`${meat.avesAtuais} aves no lote`} />
              <Kpi label="Custo por kg" value={meat.custoPorKg !== null ? fmtBRL(meat.custoPorKg) : '—'} hint={meat.pesoAtualG ? `Peso médio ${fmtDec2(meat.pesoAtualG / 1000)} kg` : 'Registre uma pesagem'} />
              <Kpi label="Conversão alimentar" value={meat.conversaoAlimentar !== null ? fmtDec2(meat.conversaoAlimentar) : '—'} hint={meat.conversaoAlimentar !== null ? 'kg ração / kg ganho' : 'Precisa de ração + pesagem'}
                tone={meat.conversaoAlimentar === null ? 'neutral' : meat.conversaoAlimentar <= 2.5 ? 'good' : meat.conversaoAlimentar <= 3.5 ? 'warn' : 'bad'} />
              <Kpi label="Mortalidade" value={`${fmtDec1(meat.mortalidadePct)}%`} hint={`${meat.mortes} de ${meat.avesIniciais} aves`}
                tone={meat.mortalidadePct <= 3 ? 'good' : meat.mortalidadePct <= 8 ? 'warn' : 'bad'} />
              <Kpi label="Gasto médio por dia" value={fmtBRL(meat.custoMedioDia)} hint={`${meat.diasLote} dias de lote`} />
              <Kpi label="Ração consumida" value={`${fmtDec1(meat.kgRacao)} kg`} hint={fmtBRL(meat.custoRacao)} />
            </div>
          )}
          {egg && (
            <div className="grid grid-cols-2 gap-2">
              <Kpi label="Custo por dúzia" value={egg.custoPorDuzia !== null ? fmtBRL(egg.custoPorDuzia) : '—'} hint={egg.custoPorOvo !== null ? `${fmtBRL(egg.custoPorOvo)} por ovo` : undefined} />
              <Kpi label="Preço médio da dúzia" value={egg.precoMedioDuzia !== null ? fmtBRL(egg.precoMedioDuzia) : '—'}
                tone={egg.precoMedioDuzia !== null && egg.custoPorDuzia !== null ? (egg.precoMedioDuzia >= egg.custoPorDuzia ? 'good' : 'bad') : 'neutral'} />
              <Kpi label="Ovos coletados" value={String(egg.ovosColetados)} hint={`${egg.ovosVendidos} vendidos`} />
              <Kpi label="Perdas" value={`${fmtDec1(egg.perdaPct)}%`} hint={`${egg.ovosPerdidos} ovos`} tone={egg.perdaPct <= 3 ? 'good' : egg.perdaPct <= 8 ? 'warn' : 'bad'} />
              <Kpi label="Margem" value={egg.margemPct !== null ? `${fmtDec1(egg.margemPct)}%` : '—'} tone={egg.margemPct === null ? 'neutral' : egg.margemPct >= 0 ? 'good' : 'bad'} />
              <Kpi label="Ração consumida" value={`${fmtDec1(egg.kgRacao)} kg`} hint={fmtBRL(egg.custoRacao)} />
            </div>
          )}

          {/* Preço de venda e ponto de equilíbrio (corte) */}
          {meat && meatLot?.status !== 'Abatido' && (
            <div className="p-3 rounded-xl bg-theme-surface border border-theme-border/50 space-y-2">
              <label className={labelCls} htmlFor="preco-kg">Preço de venda (R$ por kg vivo)</label>
              <div className="flex gap-2">
                <input id="preco-kg" inputMode="decimal" placeholder="Ex: 12,50" value={precoKg} onChange={e => setPrecoKg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSavePrice(); }} className={inputCls} />
                <button type="button" onClick={handleSavePrice} className="px-4 rounded-xl bg-theme-primary text-black text-xs font-black shrink-0 active:scale-95">Salvar</button>
              </div>
              {meat.pontoEquilibrioKg !== null && (
                <p className="text-[11px] text-theme-text-muted">
                  Para não ter prejuízo, venda acima de <b className="text-amber-400">{fmtBRL(meat.pontoEquilibrioKg)}/kg</b>
                  {meat.biomassaAtualKg > 0 && <> ({fmtDec1(meat.biomassaAtualKg)} kg no lote hoje)</>}.
                </p>
              )}
            </div>
          )}

          <Breakdown items={egg ? egg.breakdown : meat ? meat.breakdown : []} total={egg ? egg.custoTotal : meat ? meat.custoTotal : 0} />

          {/* Ações */}
          <div className={`grid gap-2 ${isEgg ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <button type="button" onClick={() => setPanel(p => (p === 'custo' ? 'none' : 'custo'))}
              className={`py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border active:scale-95 ${panel === 'custo' ? 'bg-rose-500/20 border-rose-500/50 text-rose-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
              <Plus size={14} /> Lançar custo
            </button>
            {!isEgg && (
              <button type="button" onClick={() => setPanel(p => (p === 'venda' ? 'none' : 'venda'))}
                className={`py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border active:scale-95 ${panel === 'venda' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                <ShoppingCart size={14} /> Registrar venda
              </button>
            )}
          </div>

          {panel === 'custo' && (
            <div className="p-3 rounded-xl bg-theme-surface border border-rose-500/30 space-y-3">
              <div>
                <p className={labelCls}>Tipo de custo</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXTRA_COST_CATEGORIES.map(c => (
                    <button key={c} type="button" onClick={() => setCCat(c)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${cCat === c ? 'bg-theme-primary text-black border-theme-primary' : 'bg-theme-base text-theme-text-muted border-theme-border'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls} htmlFor="c-valor">Valor (R$)</label>
                  <input id="c-valor" inputMode="decimal" placeholder="0,00" value={cValor} onChange={e => setCValor(e.target.value)} className={inputCls} autoFocus />
                </div>
                <div>
                  <label className={labelCls} htmlFor="c-data">Data</label>
                  <input id="c-data" type="date" value={cData} onChange={e => setCData(e.target.value)} className={inputCls} />
                </div>
              </div>
              <input placeholder="Descrição (opcional)" value={cDesc} onChange={e => setCDesc(e.target.value)} className={inputCls} maxLength={80} />
              <button type="button" onClick={handleAddCost} className="w-full py-3 rounded-xl bg-rose-500 text-white text-xs font-black active:scale-95">Salvar custo</button>
            </div>
          )}

          {panel === 'venda' && meat && (
            <div className="p-3 rounded-xl bg-theme-surface border border-emerald-500/30 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls} htmlFor="v-valor">Valor recebido (R$)</label>
                  <input id="v-valor" inputMode="decimal" placeholder="0,00" value={vValor} onChange={e => setVValor(e.target.value)} className={inputCls} autoFocus />
                </div>
                <div>
                  <label className={labelCls} htmlFor="v-data">Data</label>
                  <input id="v-data" type="date" value={vData} onChange={e => setVData(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="v-qtd">Aves vendidas</label>
                  <input id="v-qtd" inputMode="numeric" placeholder={`até ${meat.avesAtuais}`} value={vQtd} onChange={e => setVQtd(e.target.value.replace(/\D/g, ''))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="v-kg">Peso total (kg)</label>
                  <input id="v-kg" inputMode="decimal" placeholder="opcional" value={vKg} onChange={e => setVKg(e.target.value)} className={inputCls} />
                </div>
              </div>
              <p className="text-[10px] text-theme-text-muted">
                {(meatLot?.avesIds?.length || 0) > 0
                  ? 'Este lote usa aves cadastradas: depois, dê baixa nelas em Movimentações.'
                  : 'As aves vendidas saem do lote automaticamente.'}
              </p>
              <button type="button" onClick={handleAddSale} className="w-full py-3 rounded-xl bg-emerald-500 text-black text-xs font-black active:scale-95">Salvar venda</button>
            </div>
          )}

          {/* Históricos */}
          {sortedSales.length > 0 && (
            <div className="space-y-1.5">
              <p className={labelCls}>Vendas ({sortedSales.length})</p>
              {(showAllSales ? sortedSales : sortedSales.slice(0, LIST_LIMIT)).map(s => (
                <div key={s.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-theme-surface border border-theme-border/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-emerald-400">{fmtBRL(s.valorTotal)}</p>
                    <p className="text-[10px] text-theme-text-muted truncate">
                      {fmtDate(s.data)}{s.quantidadeAves ? ` · ${s.quantidadeAves} aves` : ''}{s.kgTotal ? ` · ${fmtDec1(s.kgTotal)} kg` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => confirmDelete('venda', s.id)}
                    className={`px-2.5 py-2 rounded-lg text-[10px] font-bold shrink-0 ${pendingDelete === s.id ? 'bg-rose-500 text-white' : 'bg-rose-500/10 text-rose-400'}`}
                    aria-label="Remover venda">
                    {pendingDelete === s.id ? 'Confirmar' : <Trash2 size={13} />}
                  </button>
                </div>
              ))}
              {!showAllSales && sortedSales.length > LIST_LIMIT && (
                <button type="button" onClick={() => setShowAllSales(true)} className="w-full py-2 text-[11px] font-bold text-theme-primary">Ver todas</button>
              )}
            </div>
          )}

          {sortedExtras.length > 0 && (
            <div className="space-y-1.5">
              <p className={labelCls}>Outros custos ({sortedExtras.length})</p>
              {(showAllCosts ? sortedExtras : sortedExtras.slice(0, LIST_LIMIT)).map(c => (
                <div key={c.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-theme-surface border border-theme-border/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{c.categoria} <span className="text-rose-400">{fmtBRL(c.valor)}</span></p>
                    <p className="text-[10px] text-theme-text-muted truncate">{fmtDate(c.data)}{c.descricao ? ` · ${c.descricao}` : ''}</p>
                  </div>
                  <button type="button" onClick={() => confirmDelete('custo', c.id)}
                    className={`px-2.5 py-2 rounded-lg text-[10px] font-bold shrink-0 ${pendingDelete === c.id ? 'bg-rose-500 text-white' : 'bg-rose-500/10 text-rose-400'}`}
                    aria-label="Remover custo">
                    {pendingDelete === c.id ? 'Confirmar' : <Trash2 size={13} />}
                  </button>
                </div>
              ))}
              {!showAllCosts && sortedExtras.length > LIST_LIMIT && (
                <button type="button" onClick={() => setShowAllCosts(true)} className="w-full py-2 text-[11px] font-bold text-theme-primary">Ver todos</button>
              )}
            </div>
          )}

          <p className="text-[10px] text-theme-text-muted text-center pb-2">
            Os gastos com ração vêm automaticamente do botão <b>Ração</b> do lote.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
