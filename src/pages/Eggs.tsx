import { useState, useMemo, useEffect, useRef, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAppContext } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';
import { ModuleLockedPaywall } from '../components/ModuleLockedPaywall';
import type { EggDailyRecord, EggLot } from '../lib/AppContext';
import {
  Egg, Plus, TrendingUp, TrendingDown, DollarSign,
  ChevronDown, ChevronUp, ChevronRight, X, Check, BarChart2,
  CalendarDays, Layers, AlertCircle, Info, Edit2, Trash2,
  AlertTriangle, ShoppingCart, Sparkles, Activity, Search, FileText, Clock
} from 'lucide-react';
import { syncDailyEggReminder } from '../lib/pushNotifications';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import { LotMovementModal } from '../components/modals/LotMovementModal';
import { LotNotesModal } from '../components/modals/LotNotesModal';
import { calculateLotProduction } from '../lib/lotProduction';

// helpers
function normalizeSearch(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function formatDate(iso: string) {
  if (!iso || !iso.includes('-')) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function daysBetween(a: string, b: string) {
  if (!a || !b) return 1;
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);
}
function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

const onlyNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', '.', ','];
  if (allowed.includes(e.key)) return;
  if (e.ctrlKey || e.metaKey) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
};

const PT_BR_WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PT_BR_WEEKDAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const PT_BR_MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function parseDateDetails(iso: string) {
  if (!iso || !iso.includes('-')) {
    return { dayNum: '01', monthNum: '01', weekdayShort: 'Seg', weekdayFull: 'Segunda-feira', fullFormatted: iso || '' };
  }
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  const weekdayIdx = isNaN(dt.getDay()) ? 0 : dt.getDay();
  return {
    dayNum: String(d).padStart(2, '0'),
    monthNum: String(m).padStart(2, '0'),
    weekdayShort: PT_BR_WEEKDAYS_SHORT[weekdayIdx] || 'Seg',
    weekdayFull: PT_BR_WEEKDAYS_FULL[weekdayIdx] || 'Segunda-feira',
    fullFormatted: `${d} de ${PT_BR_MONTHS_FULL[(m || 1) - 1] || ''}`
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// EggProductionChart — Gráfico Interativo & Inteligente de Postura
// Cores Zootécnicas:
//  - Azul (#3B82F6): Dias sem registro / lacuna de coleta
//  - Vermelho (#EF4444): Dias negativos ou com média crítica / perdas severas
//  - Dourado (#F59E0B): Produção normal dentro do padrão do lote
//  - Esmeralda (#10B981): Pico de postura do período
// ─────────────────────────────────────────────────────────────────────────────
export interface EggProductionChartProps {
  lot: EggLot;
  records: EggDailyRecord[];
  totalFemeas?: number;
  expectativaDiaria?: number;
  onOpenRegister?: (lot: EggLot, initialDate?: string, existingRecord?: EggDailyRecord) => void;
  onEditRecord?: (lot: EggLot, record: EggDailyRecord) => void;
}

export const EggProductionChart = memo(function EggProductionChart({
  lot,
  records,
  totalFemeas = 0,
  expectativaDiaria,
  onOpenRegister,
  onEditRecord
}: EggProductionChartProps) {
  const [chartPeriod, setChartPeriod] = useState<7 | 14 | 30>(14);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Calcula a média ou expectativa base de postura do lote (referência)
  const lotAverage = useMemo(() => {
    if (expectativaDiaria && expectativaDiaria > 0) return expectativaDiaria;
    const validRecords = records.filter(r => r.coletados > 0 && r.observacao !== 'Nenhum registro');
    if (validRecords.length > 0) {
      const total = validRecords.reduce((s, r) => s + (Number(r.coletados) || 0), 0);
      return total / validRecords.length;
    }
    if (totalFemeas > 0) {
      return totalFemeas * 0.7; // Expectativa padrão de 70% postura
    }
    return 0;
  }, [expectativaDiaria, records, totalFemeas]);

  // Âncora final da linha do tempo: se o lote está encerrado, âncora no último registro
  const endDateStr = useMemo(() => {
    if (lot.status === 'Encerrado' && records.length > 0) {
      const sorted = [...records].sort((a, b) => b.data.localeCompare(a.data));
      return sorted[0].data;
    }
    return todayISO();
  }, [lot.status, records]);

  // Gera o período contínuo de dias (sem pular dias não registrados)
  const periodDates = useMemo(() => {
    const [y, m, d] = (endDateStr || todayISO()).split('-').map(Number);
    const baseDate = new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
    const dates: string[] = [];
    for (let i = chartPeriod - 1; i >= 0; i--) {
      const iter = new Date(baseDate.getTime() - i * 86400000);
      const yyyy = iter.getFullYear();
      const mm = String(iter.getMonth() + 1).padStart(2, '0');
      const dd = String(iter.getDate()).padStart(2, '0');
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    return dates;
  }, [endDateStr, chartPeriod]);

  // Data selecionada interativa (inicia como null; só exibe detalhes quando um dia for clicado)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mantém a seleção dentro do período atual caso haja data selecionada
  useEffect(() => {
    if (selectedDate && !periodDates.includes(selectedDate)) {
      setSelectedDate(null);
    }
  }, [periodDates, selectedDate]);

  // Fecha as opções do dia selecionado se o usuário clicar ou tocar fora do gráfico/painel
  useEffect(() => {
    if (!selectedDate) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSelectedDate(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [selectedDate]);

  // Processa todos os dias aplicando as regras visuais exigidas
  const dayData = useMemo(() => {
    const recMap = new Map<string, EggDailyRecord>();
    records.forEach(r => {
      if (r?.data) recMap.set(r.data, r);
    });

    const maxCollectedInPeriod = Math.max(
      ...periodDates.map(dt => {
        const r = recMap.get(dt);
        if (!r || r.observacao === 'Nenhum registro') return 0;
        return Number(r.coletados) || 0;
      }),
      0
    );

    return periodDates.map(dateStr => {
      const rec = recMap.get(dateStr);
      const dateParts = parseDateDetails(dateStr);
      const isToday = dateStr === todayISO();

      const isNoRecord = !rec ||
        rec.observacao === 'Nenhum registro' ||
        (rec as any).isNoRecord === true ||
        rec.observacao?.toLowerCase().includes('nenhum registro') ||
        rec.observacao?.toLowerCase().includes('sem registro') ||
        rec.id?.startsWith('auto-empty-') ||
        (rec.coletados === 0 && !rec.vendidos && !rec.perdidos && !rec.observacao);

      if (isNoRecord) {
        return {
          date: dateStr,
          ...dateParts,
          isToday,
          rec,
          coletados: 0,
          vendidos: 0,
          perdidos: 0,
          saldo: 0,
          observacao: rec?.observacao || 'Sem registro',
          status: 'sem_registro' as const,
          statusLabel: 'Sem Registro',
          statusColor: '#3B82F6',
          motivo: 'Nenhuma coleta registrada para este lote neste dia'
        };
      }

      const coletados = Number(rec.coletados) || 0;
      const vendidos = Number(rec.vendidos) || 0;
      const perdidos = Number(rec.perdidos) || 0;
      const saldo = coletados - perdidos;

      // Critérios para "Negativo ou Baixa Média" (Vermelho)
      const isPerdaGrave = perdidos >= coletados && (coletados > 0 || perdidos > 0);
      const isZeroColeta = coletados === 0;
      const isAbaixoMedia = lotAverage >= 2 && coletados < (lotAverage * 0.45);
      const isTaxaPerdaAlta = coletados > 0 && perdidos >= 2 && (perdidos / coletados) >= 0.4;

      if (isPerdaGrave || isZeroColeta || isAbaixoMedia || isTaxaPerdaAlta) {
        let motivo = 'Produção abaixo da média esperada do lote';
        if (isPerdaGrave) motivo = 'Saldo crítico: ovos perdidos igualaram ou superaram os ovos coletados';
        else if (isZeroColeta) motivo = 'Postura zerada: nenhum ovo coletado nesta data';
        else if (isTaxaPerdaAlta) motivo = `Taxa alta de quebra/perda (${Math.round((perdidos / coletados) * 100)}% de perdas)`;
        else if (isAbaixoMedia) motivo = `Produção (${coletados} ovos) ficou ${Math.round(((lotAverage - coletados) / lotAverage) * 100)}% abaixo da média (${lotAverage.toFixed(1)}/dia)`;

        return {
          date: dateStr,
          ...dateParts,
          isToday,
          rec,
          coletados,
          vendidos,
          perdidos,
          saldo,
          observacao: rec.observacao,
          status: 'critico_baixo' as const,
          statusLabel: 'Abaixo da Média / Negativo',
          statusColor: '#EF4444',
          motivo
        };
      }

      // Pico de postura (Verde Esmeralda)
      const isPeak = maxCollectedInPeriod >= 2 && coletados === maxCollectedInPeriod;
      if (isPeak) {
        return {
          date: dateStr,
          ...dateParts,
          isToday,
          rec,
          coletados,
          vendidos,
          perdidos,
          saldo,
          observacao: rec.observacao,
          status: 'pico' as const,
          statusLabel: 'Pico de Postura',
          statusColor: '#10B981',
          motivo: `Maior coleta registrada no período (${coletados} ovos)`
        };
      }

      // Normal (Dourado/Amber)
      return {
        date: dateStr,
        ...dateParts,
        isToday,
        rec,
        coletados,
        vendidos,
        perdidos,
        saldo,
        observacao: rec.observacao,
        status: 'normal' as const,
        statusLabel: 'Produção Normal',
        statusColor: '#F59E0B',
        motivo: `${coletados} ovos coletados dentro do padrão do lote`
      };
    });
  }, [periodDates, records, lotAverage]);

  // Resumo de métricas do período selecionado
  const periodStats = useMemo(() => {
    const recordedDays = dayData.filter(d => d.status !== 'sem_registro');
    const semRegistroCount = dayData.filter(d => d.status === 'sem_registro').length;
    const criticosCount = dayData.filter(d => d.status === 'critico_baixo').length;
    const totalColetados = recordedDays.reduce((s, d) => s + d.coletados, 0);
    const totalPerdidos = recordedDays.reduce((s, d) => s + d.perdidos, 0);
    const totalVendidos = recordedDays.reduce((s, d) => s + d.vendidos, 0);
    const mediaPeriodo = recordedDays.length > 0 ? (totalColetados / recordedDays.length).toFixed(1) : '0';

    return {
      recordedDaysCount: recordedDays.length,
      semRegistroCount,
      criticosCount,
      totalColetados,
      totalPerdidos,
      totalVendidos,
      mediaPeriodo
    };
  }, [dayData]);

  // Dia selecionado para exibição detalhada (apenas após o usuário clicar em um dia do gráfico)
  const selectedDay = useMemo(() => {
    if (!selectedDate) return null;
    return dayData.find(d => d.date === selectedDate) || null;
  }, [dayData, selectedDate]);

  // Cálculos de geometria do SVG
  const svgW = 520;
  const svgH = 150;
  const startX = 24;
  const usableW = 472;
  const baselineY = 112;
  const topY = 18;
  const chartH = baselineY - topY; // 94px

  const maxVal = Math.max(...dayData.map(d => d.coletados), Math.ceil(lotAverage) || 1, 4);
  const colW = usableW / dayData.length;
  const barW = Math.max(7, Math.min(26, colW - (dayData.length > 20 ? 3 : 5)));

  // Posição Y da linha de média/expectativa
  const yBench = lotAverage > 0 && lotAverage <= maxVal ? baselineY - (lotAverage / maxVal) * chartH : null;

  return (
    <div ref={containerRef} className="space-y-3.5">
      {/* Barra de Controles do Gráfico */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
            <BarChart2 size={13} />
          </div>
          <div>
            <span className="text-xs font-black text-white uppercase tracking-wider block">
              Desempenho Diário de Postura
            </span>
            <span className="text-[10px] text-theme-text-muted">
              {chartPeriod} dias exibidos &bull; Toque em qualquer coluna para ver detalhes
            </span>
          </div>
        </div>

        {/* Seletor de Período 7d / 14d / 30d */}
        <div className="flex items-center bg-theme-surface border border-theme-border rounded-xl p-0.5 gap-0.5">
          {([7, 14, 30] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setChartPeriod(p)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                chartPeriod === p
                  ? 'bg-amber-400 text-black shadow-sm font-black'
                  : 'text-theme-text-muted hover:text-white'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* Container do Gráfico SVG */}
      <div className="rounded-2xl border border-theme-border/60 bg-theme-surface/50 p-2 sm:p-3 relative overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto overflow-visible"
          style={{ maxHeight: 180 }}
          onMouseLeave={() => setHoveredDate(null)}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedDate(null);
            }
          }}
        >
          <defs>
            {/* Gradiente Dourado (Normal) */}
            <linearGradient id="eggAmberGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Gradiente Vermelho (Abaixo da Média / Negativo) */}
            <linearGradient id="eggRedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F87171" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>

            {/* Gradiente Verde (Pico) */}
            <linearGradient id="eggGreenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Gradiente Azul (Sem Registro) */}
            <linearGradient id="eggBlueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
          </defs>

          {/* Linha de Base (y = 0) */}
          <line x1={startX - 10} y1={baselineY} x2={startX + usableW + 5} y2={baselineY} stroke="#374151" strokeWidth="1" />

          {/* Linha de Referência da Média Diária */}
          {yBench !== null && (
            <g>
              <line
                x1={startX - 10}
                y1={yBench}
                x2={startX + usableW + 5}
                y2={yBench}
                stroke="#F59E0B"
                strokeWidth="1"
                strokeDasharray="4 3"
                strokeOpacity="0.45"
              />
              <text
                x={startX + usableW + 2}
                y={yBench - 3}
                textAnchor="end"
                fontSize="7.5"
                fill="#F59E0B"
                opacity="0.85"
                fontWeight="bold"
              >
                Média {lotAverage.toFixed(1)}
              </text>
            </g>
          )}

          {/* Colunas Diárias */}
          {dayData.map((d, i) => {
            const cx = startX + i * colW + colW / 2;
            const x = cx - barW / 2;
            const isSelected = selectedDate === d.date;
            const isHovered = hoveredDate === d.date;
            const isHighlighted = isSelected || isHovered;

            // Altura do pilar conforme status
            let barH = 6;
            let barY = baselineY - barH;
            let barFill = 'url(#eggAmberGrad)';

            if (d.status === 'sem_registro') {
              barH = 8;
              barY = baselineY - barH;
              barFill = 'url(#eggBlueGrad)';
            } else if (d.status === 'critico_baixo') {
              if (d.coletados === 0) {
                barH = 7;
                barY = baselineY - barH;
                barFill = '#EF4444';
              } else {
                barH = Math.max(10, (d.coletados / maxVal) * chartH);
                barY = baselineY - barH;
                barFill = 'url(#eggRedGrad)';
              }
            } else if (d.status === 'pico') {
              barH = Math.max(12, (d.coletados / maxVal) * chartH);
              barY = baselineY - barH;
              barFill = 'url(#eggGreenGrad)';
            } else {
              barH = Math.max(10, (d.coletados / maxVal) * chartH);
              barY = baselineY - barH;
              barFill = 'url(#eggAmberGrad)';
            }

            // Frações de vendas e perdas
            const vendH = d.vendidos > 0 && d.status !== 'sem_registro' ? Math.min(barH, Math.max(3, (d.vendidos / maxVal) * chartH)) : 0;
            const perdH = d.perdidos > 0 && d.status !== 'sem_registro' ? Math.min(barH, Math.max(3, (d.perdidos / maxVal) * chartH)) : 0;

            return (
              <g key={d.date}>
                {/* Destaque de Coluna Ativa */}
                {isHighlighted && (
                  <rect
                    x={cx - colW / 2 + 1}
                    y={topY - 8}
                    width={colW - 2}
                    height={chartH + 16}
                    rx="6"
                    fill="rgba(255,255,255,0.06)"
                    stroke={d.statusColor}
                    strokeWidth="1"
                    strokeDasharray="3 2"
                    opacity={isSelected ? 1 : 0.6}
                  />
                )}

                {/* Linha guia suave de coluna */}
                <line
                  x1={cx}
                  y1={topY}
                  x2={cx}
                  y2={baselineY}
                  stroke={d.status === 'sem_registro' ? '#3B82F6' : '#FFFFFF'}
                  strokeWidth="1"
                  strokeDasharray="1 3"
                  strokeOpacity={d.status === 'sem_registro' ? '0.2' : '0.04'}
                />

                {/* Pilar Principal */}
                <rect
                  x={x}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx="3"
                  fill={barFill}
                  className="transition-all"
                  opacity={isHighlighted ? 1 : 0.88}
                />

                {/* Sub-barra de Vendas (Verde) */}
                {vendH > 0 && (
                  <rect
                    x={x}
                    y={baselineY - vendH}
                    width={barW}
                    height={vendH}
                    rx="2"
                    fill="#10B981"
                    opacity="0.8"
                  />
                )}

                {/* Topo de Perdas (Vermelho) */}
                {perdH > 0 && d.status !== 'critico_baixo' && (
                  <rect
                    x={x}
                    y={barY}
                    width={barW}
                    height={perdH}
                    rx="2"
                    fill="#EF4444"
                    opacity="0.85"
                  />
                )}

                {/* Indicador Especial no Topo da Barra */}
                {d.status === 'sem_registro' && (
                  <circle cx={cx} cy={baselineY - 14} r="2" fill="#3B82F6" />
                )}

                {d.status === 'critico_baixo' && (
                  <circle cx={cx} cy={barY - 4} r="2" fill="#EF4444" />
                )}

                {d.status === 'pico' && (
                  <circle cx={cx} cy={barY - 5} r="2.5" fill="#10B981" />
                )}

                {/* Marcador triangular do dia selecionado */}
                {isSelected && (
                  <polygon
                    points={`${cx - 3},${baselineY + 1} ${cx + 3},${baselineY + 1} ${cx},${baselineY - 3}`}
                    fill={d.statusColor}
                  />
                )}

                {/* Número do Dia (X-axis) */}
                <text
                  x={cx}
                  y={baselineY + 13}
                  textAnchor="middle"
                  fontSize={dayData.length > 20 ? '7' : '8.5'}
                  fontWeight={d.isToday || isSelected ? '900' : '600'}
                  fill={
                    isSelected
                      ? '#FFFFFF'
                      : d.isToday
                      ? '#F59E0B'
                      : d.status === 'sem_registro'
                      ? '#60A5FA'
                      : d.status === 'critico_baixo'
                      ? '#F87171'
                      : '#9CA3AF'
                  }
                >
                  {d.dayNum}
                </text>

                {/* Dia da Semana (Letra Inicial) */}
                <text
                  x={cx}
                  y={baselineY + 23}
                  textAnchor="middle"
                  fontSize="6.5"
                  fill={isSelected ? '#E5E7EB' : '#6B7280'}
                >
                  {d.weekdayShort[0]}
                </text>

                {/* Área de Toque/Clique Total da Coluna */}
                <rect
                  x={cx - colW / 2}
                  y={0}
                  width={colW}
                  height={svgH}
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(d.date);
                  }}
                  onMouseEnter={() => setHoveredDate(d.date)}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setSelectedDate(d.date);
                  }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Card Interativo de Detalhes do Dia Selecionado (Só aparece após clicar em algum dia do gráfico) */}
      {selectedDay && (
        <div
          className={`p-3.5 rounded-2xl border transition-all animate-fade-in ${
            selectedDay.status === 'sem_registro'
              ? 'bg-blue-500/10 border-blue-500/30'
              : selectedDay.status === 'critico_baixo'
              ? 'bg-rose-500/10 border-rose-500/30'
              : selectedDay.status === 'pico'
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-theme-surface border-theme-border/80'
          }`}
        >
          {/* Cabeçalho do Dia */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-theme-border/40">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-white flex items-center gap-1.5">
                <CalendarDays
                  size={14}
                  className={
                    selectedDay.status === 'sem_registro'
                      ? 'text-blue-400'
                      : selectedDay.status === 'critico_baixo'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }
                />
                {selectedDay.fullFormatted} ({selectedDay.weekdayFull})
              </span>
              {selectedDay.isToday && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-extrabold border border-amber-400/30">
                  Hoje
                </span>
              )}
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                  selectedDay.status === 'sem_registro'
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : selectedDay.status === 'critico_baixo'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : selectedDay.status === 'pico'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {selectedDay.status === 'sem_registro' && <Clock size={11} />}
                {selectedDay.status === 'critico_baixo' && <AlertTriangle size={11} />}
                {selectedDay.status === 'pico' && <Sparkles size={11} />}
                {selectedDay.status === 'normal' && <Check size={11} />}
                <span>{selectedDay.statusLabel}</span>
              </span>
            </div>

            {/* Botão de Ação Direta no Dia Selecionado e Botão de Fechar */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {selectedDay.status === 'sem_registro' ? (
                <button
                  type="button"
                  onClick={() => onOpenRegister?.(lot, selectedDay.date, selectedDay.rec)}
                  className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Registrar Coleta deste Dia</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedDay.rec && onEditRecord) {
                      onEditRecord(lot, selectedDay.rec);
                    } else if (onOpenRegister) {
                      onOpenRegister(lot, selectedDay.date, selectedDay.rec);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-theme-surface hover:bg-theme-surface-hover text-white border border-theme-border font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 size={12} className="text-theme-primary" />
                  <span>Editar Lançamento</span>
                </button>
              )}

              {/* Botão X para fechar as opções do dia */}
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="p-1.5 rounded-xl text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Fechar detalhes do dia"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Motivo / Contexto Amigável */}
          <p className="text-xs text-theme-text-muted mt-2">
            {selectedDay.motivo}
          </p>

          {/* Mini Cards com os Números do Dia (Coletados, Vendidos, Perdidos) */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="p-2.5 sm:p-2 rounded-xl bg-theme-base/60 border border-theme-border/40 text-center min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[9px] uppercase font-extrabold text-theme-text-muted block truncate">Coletados</span>
              <span
                className={`text-lg sm:text-base font-black truncate block mt-0.5 ${
                  selectedDay.status === 'sem_registro'
                    ? 'text-blue-400'
                    : selectedDay.status === 'critico_baixo'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {selectedDay.coletados}
              </span>
              {totalFemeas > 0 && selectedDay.coletados > 0 && (
                <span className="text-[9px] text-emerald-400 font-bold block truncate mt-0.5">
                  {Math.round((selectedDay.coletados / totalFemeas) * 100)}% postura
                </span>
              )}
            </div>

            <div className="p-2.5 sm:p-2 rounded-xl bg-theme-base/60 border border-theme-border/40 text-center min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[9px] uppercase font-extrabold text-theme-text-muted block truncate">Vendidos</span>
              <span className="text-lg sm:text-base font-black text-green-400 truncate block mt-0.5">
                {selectedDay.vendidos}
              </span>
            </div>

            <div className="p-2.5 sm:p-2 rounded-xl bg-theme-base/60 border border-theme-border/40 text-center min-w-0 overflow-hidden">
              <span className="text-[10px] sm:text-[9px] uppercase font-extrabold text-theme-text-muted block truncate">Perdidos</span>
              <span className={`text-lg sm:text-base font-black truncate block mt-0.5 ${selectedDay.perdidos > 0 ? 'text-rose-400' : 'text-theme-text-muted'}`}>
                {selectedDay.perdidos}
              </span>
            </div>
          </div>

          {/* Observação Adicional do Dia */}
          {selectedDay.observacao && selectedDay.observacao !== 'Nenhum registro' && (
            <div className="mt-2.5 px-3 py-2 rounded-xl bg-theme-base/40 border border-theme-border/30 text-xs text-theme-text-muted flex items-start gap-1.5">
              <FileText size={12} className="text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-snug"><strong>Obs:</strong> {selectedDay.observacao}</span>
            </div>
          )}
        </div>
      )}

      {/* Legenda Explicativa & Resumo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
        {/* Legenda de Cores */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5" title="Dias sem lançamento de coleta no histórico">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-500 shadow-sm shadow-blue-500/50" />
            <span className="text-[11px] font-bold text-blue-400">Sem registro</span>
          </div>
          <div className="flex items-center gap-1.5" title="Dias com produção abaixo de 45% da média ou com perdas elevadas">
            <div className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span className="text-[11px] font-bold text-rose-400">Baixa produção / Negativo</span>
          </div>
          <div className="flex items-center gap-1.5" title="Produção regular do lote">
            <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
            <span className="text-[11px] font-bold text-theme-text-muted">Normal</span>
          </div>
          <div className="flex items-center gap-1.5" title="Melhor dia de postura do período">
            <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400">Pico</span>
          </div>
        </div>

        {/* Resumo do Período */}
        <div className="flex items-center gap-3 text-[11px] text-theme-text-muted font-bold flex-wrap">
          <span>Total: <strong className="text-white">{periodStats.totalColetados} ovos</strong></span>
          <span>Média: <strong className="text-amber-400">{periodStats.mediaPeriodo}/dia</strong></span>
          {periodStats.semRegistroCount > 0 && (
            <span className="text-blue-400">{periodStats.semRegistroCount} {periodStats.semRegistroCount === 1 ? 'dia sem registro' : 'dias sem registro'}</span>
          )}
        </div>
      </div>
    </div>
  );
});

export const BarChart = EggProductionChart;

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────
const KpiCard = memo(function KpiCard({ label, value, sub, color = 'amber', icon: Icon }: { label: string; value: string; sub?: string; color?: 'amber' | 'green' | 'red' | 'blue' | 'purple'; icon: any }) {
  const colors: Record<string, string> = {
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    green: 'text-green-400 bg-green-400/10 border-green-400/20',
    red: 'text-red-400 bg-red-400/10 border-red-400/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  };

  return (
    <div className={`rounded-2xl border p-3.5 sm:p-4 flex flex-col justify-between overflow-hidden min-w-0 ${colors[color]}`}>
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80 truncate">{label}</span>
        <Icon size={14} className="shrink-0" />
      </div>
      <p className="text-xl sm:text-2xl font-black text-white mt-1 truncate">{value}</p>
      {sub && <p className="text-[10px] opacity-70 mt-0.5 truncate leading-tight" title={sub}>{sub}</p>}
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Criar Novo Lote de Postura
// ─────────────────────────────────────────────────────────────────────────────
function CreateEggLotModal({ onClose, onSave }: { onClose: () => void; onSave: (lot: EggLot) => void }) {
  const { birds, breeds } = useAppContext();
  const [baia, setBaia] = useState('');
  const [qtdFemeas, setQtdFemeas] = useState('');
  const [raca, setRaca] = useState('');
  const [observacao, setObservacao] = useState('');
  const [selectedFemeas, setSelectedFemeas] = useState<string[]>([]);
  const [searchFemeas, setSearchFemeas] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.classList.add('modal-open-lock');
    return () => {
      document.body.classList.remove('modal-open-lock');
    };
  }, []);

  const availableFemeas = useMemo(() => {
    return birds.filter(b => {
      const s = normalizeSearch(b.sexo);
      const isFemale = s === 'femea' || s === 'f' || s.startsWith('fem');
      const stat = normalizeSearch(b.status);
      const isExcluded = ['vendido', 'faleceu', 'morto', 'abatido'].includes(stat);
      return isFemale && !isExcluded;
    });
  }, [birds]);

  const qFemeas = normalizeSearch(searchFemeas);
  const hasSearchFemeas = qFemeas.length > 0;

  const filteredFemeas = useMemo(() => {
    if (!hasSearchFemeas) return [];
    return availableFemeas.filter(b => {
      const nomeNorm = normalizeSearch(b.nome);
      const anilhaNorm = normalizeSearch(b.anilha);
      const racaNorm = normalizeSearch(b.raca);
      const baiaNorm = normalizeSearch(b.baia);
      return nomeNorm.includes(qFemeas) || anilhaNorm.includes(qFemeas) || racaNorm.includes(qFemeas) || baiaNorm.includes(qFemeas);
    });
  }, [availableFemeas, qFemeas, hasSearchFemeas]);

  const selectedFemeasBirds = useMemo(() => {
    return selectedFemeas.map(id => birds.find(b => b.id === id)).filter(Boolean);
  }, [birds, selectedFemeas]);

  const handleSave = () => {
    if (!baia.trim()) {
      setError('Informe a identificação da Baia.');
      return;
    }

    const numSel = selectedFemeas.length;
    const numExtra = parseInt(qtdFemeas) || 0;
    const countFemeas = numSel + numExtra;

    if (countFemeas <= 0) {
      setError('Informe a quantidade de fêmeas ou selecione as galinhas vinculadas.');
      return;
    }

    const newLot: EggLot = {
      id: uid(),
      baia: baia.trim(),
      femeasIds: selectedFemeas,
      qtdFemeas: countFemeas,
      expectativaDiaria: 0,
      dataInicio: todayISO(),
      status: 'Ativo',
      raca: raca || undefined,
      observacao: observacao.trim() || undefined,
      registros: []
    };

    onSave(newLot);
    onClose();
  };

  const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2.5 text-xs text-white placeholder-theme-text-muted focus:border-theme-primary outline-none transition-colors";

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-hidden animate-fade-in" 
      onClick={onClose}
      onTouchMove={e => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div 
        className="bg-theme-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-theme-border/60 shadow-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-scale-up gpu-accelerated" 
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-theme-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-white flex items-center gap-2 text-sm">
              <Egg size={18} className="text-amber-400" />
              <span>Novo Lote de Postura</span>
            </h3>
            <p className="text-[11px] text-theme-text-muted mt-0.5">Cadastre uma baia para controle diário de ovos</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-theme-text-muted hover:text-white rounded-lg transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto smooth-scroll flex-1 min-h-0 p-5 space-y-4 text-xs modal-scrollable-content overscroll-contain touch-pan-y">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 font-bold">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Baia / Local <span className="text-amber-400">*</span></label>
              <input type="text" placeholder="Ex: Baia 01" value={baia} onChange={e => setBaia(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Raça Predominante</label>
              <select value={raca} onChange={e => setRaca(e.target.value)} className={inputCls}>
                <option value="">Selecione...</option>
                {breeds.map(b => (
                  <option key={b.id} value={b.nome}>{b.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Nº de Fêmeas Avulsas / Não Cadastradas</label>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Ex: 30"
              value={qtdFemeas}
              onChange={e => setQtdFemeas(e.target.value)}
              onKeyDown={onlyNumericKeyDown}
              className={inputCls}
            />
          </div>

          <div className="p-2.5 rounded-xl bg-theme-base border border-theme-border flex items-center justify-between text-xs">
            <span className="text-theme-text-muted">Total de fêmeas no lote:</span>
            <span className="font-black text-amber-400">
              {selectedFemeas.length + (parseInt(qtdFemeas) || 0)} ave(s)
              {selectedFemeas.length > 0 && (parseInt(qtdFemeas) || 0) > 0 && (
                <span className="text-[10px] text-theme-text-muted font-normal ml-1.5">
                  ({selectedFemeas.length} cadastradas + {parseInt(qtdFemeas) || 0} avulsas)
                </span>
              )}
            </span>
          </div>


          {availableFemeas.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-theme-border">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted block">
                Vincular Galinhas Cadastradas
              </label>

              {/* Barra de Busca de Fêmeas */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={13} />
                <input
                  type="text"
                  placeholder="Buscar por nome (ex: Pérola), anilha ou raça..."
                  value={searchFemeas}
                  onChange={e => setSearchFemeas(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-theme-text-muted focus:border-theme-primary outline-none transition-colors"
                />
                {searchFemeas && (
                  <button
                    type="button"
                    onClick={() => setSearchFemeas('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white p-1 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Fêmeas já Selecionadas (chips informativos) */}
              {selectedFemeasBirds.length > 0 && (
                <div className="p-2.5 rounded-xl bg-theme-base/60 border border-theme-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <Check size={12} strokeWidth={3} /> {selectedFemeasBirds.length} fêmea(s) selecionada(s)
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedFemeas([])}
                      className="text-[10px] text-theme-text-muted hover:text-rose-400 font-bold transition-colors cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {selectedFemeasBirds.map(f => f && (
                      <span
                        key={f.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-theme-primary/15 text-theme-primary border border-theme-primary/30 text-[11px] font-bold"
                      >
                        <span>{f.nome ? `${f.nome} (${f.anilha})` : `Anilha ${f.anilha}`}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFemeas(prev => prev.filter(id => id !== f.id))}
                          className="hover:text-white text-theme-primary/70 ml-0.5 cursor-pointer"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quando digitou: exibe lista de fêmeas encontradas */}
              {hasSearchFemeas && (
                <div className="space-y-1.5 animate-fade-in">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-theme-text-muted font-bold">
                      {filteredFemeas.length} encontrada(s) para "{searchFemeas}"
                    </span>
                    {filteredFemeas.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const allChecked = filteredFemeas.every(f => selectedFemeas.includes(f.id));
                          if (allChecked) {
                            setSelectedFemeas(prev => prev.filter(id => !filteredFemeas.some(f => f.id === id)));
                          } else {
                            const newIds = filteredFemeas.map(f => f.id);
                            setSelectedFemeas(prev => Array.from(new Set([...prev, ...newIds])));
                          }
                        }}
                        className="text-[10px] text-theme-primary font-bold hover:underline cursor-pointer"
                      >
                        {filteredFemeas.every(f => selectedFemeas.includes(f.id)) ? 'Desmarcar' : 'Selecionar todas'}
                      </button>
                    )}
                  </div>

                  <div className="border border-theme-border rounded-xl max-h-40 overflow-y-auto divide-y divide-theme-border/40 bg-theme-base/40">
                    {filteredFemeas.map(f => {
                      const isChecked = selectedFemeas.includes(f.id);
                      return (
                        <div
                          key={f.id}
                          onClick={() => {
                            setSelectedFemeas(prev => {
                              return isChecked ? prev.filter(id => id !== f.id) : [...prev, f.id];
                            });
                          }}
                          className={`py-2 px-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                            isChecked ? 'bg-theme-primary/10 hover:bg-theme-primary/15' : 'hover:bg-theme-base/50'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-bold text-white text-xs flex items-center gap-1.5">
                              <span>Anilha: {f.anilha}</span>
                              {f.nome && <span className="text-amber-400 font-black">· {f.nome}</span>}
                            </p>
                            <p className="text-[10px] text-theme-text-muted truncate">
                              {f.raca || 'Sem raça'} · {f.sexo} · {f.baia ? `Baia: ${f.baia}` : (f.status || 'Ativo')}
                            </p>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                            isChecked ? 'border-amber-400 bg-amber-400 text-black' : 'border-theme-border bg-theme-surface'
                          }`}>
                            {isChecked && <Check size={10} strokeWidth={3} />}
                          </div>
                        </div>
                      );
                    })}

                    {filteredFemeas.length === 0 && (
                      <div className="p-3 text-center space-y-0.5">
                        <p className="text-xs font-bold text-amber-400">Nenhuma fêmea encontrada</p>
                        <p className="text-[10px] text-theme-text-muted italic">
                          Nenhuma ave cadastrada encontrada com "{searchFemeas}".
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Observações</label>
            <textarea rows={2} placeholder="Ex: Galinhas em início de postura..." value={observacao} onChange={e => setObservacao(e.target.value)} className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="p-4 border-t border-theme-border shrink-0">
          <button onClick={handleSave} className="w-full btn-primary py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400">
            <Check size={16} />
            <span>Salvar Lote de Postura</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// Modal: Registrar Venda Direta do Estoque
// ─────────────────────────────────────────────────────────────────────────────
function SellFromStockModal({
  lot,
  availableStock,
  onClose,
  onConfirm
}: {
  lot: EggLot;
  availableStock: number;
  onClose: () => void;
  onConfirm: (count: number, pricePerDozen: number) => void;
}) {
  const [quantity, setQuantity] = useState(String(availableStock));
  const [pricePerDozen, setPricePerDozen] = useState(lot.precoVendaPadrao !== undefined ? String(lot.precoVendaPadrao) : '');
  const [error, setError] = useState('');

  const qtyNum = parseInt(quantity) || 0;
  const priceNum = parseFloat(pricePerDozen) || 0;
  const totalRevenue = (qtyNum / 12) * priceNum;

  const handleConfirm = () => {
    if (qtyNum <= 0) {
      setError('Informe uma quantidade válida de ovos.');
      return;
    }
    if (qtyNum > availableStock) {
      setError(`Quantidade não pode exceder o estoque disponível (${availableStock} ovos).`);
      return;
    }
    onConfirm(qtyNum, priceNum);
    onClose();
  };

  const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2 text-xs text-white focus:border-theme-primary outline-none";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-x-hidden touch-pan-y animate-fade-in" onClick={onClose}>
      <div className="bg-theme-surface w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-green-500/30 shadow-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-x-hidden touch-pan-y animate-scale-up p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-theme-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Registrar Venda do Estoque</h3>
              <p className="text-[10px] text-theme-text-muted">Baia {lot.baia}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-theme-text-muted hover:text-white rounded-lg">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-bold text-center">
            {error}
          </div>
        )}

        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center space-y-1">
          <p className="text-[10px] font-bold text-green-300 uppercase">Receita Estimada da Venda</p>
          <p className="text-2xl font-black text-white">{fmtBRL(totalRevenue)}</p>
          <p className="text-[10px] text-theme-text-muted">({qtyNum} ovos = {(qtyNum / 12).toFixed(1)} dúzias)</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Qtd de Ovos</label>
            <input
              type="number"
              min="1"
              max={availableStock}
              inputMode="numeric"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              onKeyDown={onlyNumericKeyDown}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Preço / Dúzia (R$)</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={pricePerDozen}
              onChange={e => setPricePerDozen(e.target.value)}
              onKeyDown={onlyNumericKeyDown}
              className={inputCls}
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
          >
            <DollarSign size={16} />
            <span>Confirmar Venda</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Registrar / Editar Dia de Produção
// ─────────────────────────────────────────────────────────────────────────────
type RegForm = {
  data: string;
  coletados: string;
  vendidos: string;
  perdidos: string;
  observacao: string;
};

function RegisterDaySheet({
  lot,
  editingRecord,
  initialDate,
  onClose,
  onSave
}: {
  lot: EggLot;
  editingRecord?: EggDailyRecord | null;
  initialDate?: string;
  onClose: () => void;
  onSave: (rec: EggDailyRecord) => void;
}) {
  const [form, setForm] = useState<RegForm>(() => ({
    data: editingRecord?.data || initialDate || todayISO(),
    coletados: editingRecord ? String(editingRecord.coletados) : '',
    vendidos: editingRecord ? String(editingRecord.vendidos) : '0',
    perdidos: editingRecord ? String(editingRecord.perdidos) : '0',
    observacao: editingRecord?.observacao && editingRecord.observacao !== 'Nenhum registro' ? editingRecord.observacao : ''
  }));

  const [error, setError] = useState('');
  const [existingRecordAlert, setExistingRecordAlert] = useState(false);

  useEffect(() => {
    if (editingRecord) return;
    const existing = (lot.registros || []).find(r => r.data === form.data);
    if (existing) {
      const isAutoPlaceholder = existing.observacao === 'Nenhum registro' || existing.id?.startsWith('auto-empty-');
      setExistingRecordAlert(!isAutoPlaceholder);
      setForm(prev => ({
        ...prev,
        coletados: isAutoPlaceholder ? '' : String(existing.coletados),
        vendidos: String(existing.vendidos),
        perdidos: String(existing.perdidos),
        observacao: isAutoPlaceholder ? '' : (existing.observacao || '')
      }));
    } else {
      setExistingRecordAlert(false);
    }
  }, [form.data, lot.registros, editingRecord]);

  const set = (k: keyof RegForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = () => {
    const col = parseFloat(form.coletados) || 0;
    const vend = parseFloat(form.vendidos) || 0;
    const perd = parseFloat(form.perdidos) || 0;

    // Preserva ou adota o padrão configurado no lote (sem obrigar preenchimento na coleta diária)
    const preco = editingRecord?.precoVenda !== undefined
      ? editingRecord.precoVenda
      : (lot.precoVendaPadrao !== undefined ? lot.precoVendaPadrao : 6.0);
    const custo = editingRecord?.custoProd !== undefined
      ? editingRecord.custoProd
      : (lot.custoProdPadrao !== undefined ? lot.custoProdPadrao : 0.30);

    if (isNaN(col) || col < 0) {
      setError('Informe uma quantidade válida de ovos coletados (mínimo 0).');
      return;
    }
    if ((vend + perd) > col) {
      setError('A soma de Vendidos + Perdidos não pode ser maior que o total coletado.');
      return;
    }

    onSave({
      id: editingRecord?.id || uid(),
      data: form.data,
      coletados: col,
      vendidos: vend,
      perdidos: perd,
      precoVenda: preco,
      custoProd: custo,
      observacao: form.observacao.trim() || undefined
    });
    onClose();
  };

  const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-theme-text-muted focus:border-theme-primary outline-none transition-colors";

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-x-hidden touch-pan-y animate-fade-in" 
      onClick={onClose}
      onTouchMove={e => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div 
        className="bg-theme-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-theme-border/60 shadow-2xl max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-x-hidden touch-pan-y animate-scale-up gpu-accelerated" 
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-3 border-b border-theme-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <Egg size={16} className="text-amber-400" />
              <span>{editingRecord ? 'Editar Registro Diário' : 'Registrar Dia de Produção'}</span>
            </h3>
            <p className="text-[11px] text-theme-text-muted mt-0.5">Baia {lot.baia}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-theme-text-muted hover:text-white rounded-lg transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto smooth-scroll flex-1 min-h-0 p-5 space-y-4 modal-scrollable-content touch-pan-y">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400 font-bold">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {existingRecordAlert && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-300 font-bold">
              <Info size={14} />
              <span>Já existe um registro para esta data. Os dados foram carregados para atualização.</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Data da Coleta</label>
            <input type="date" value={form.data} onChange={set('data')} className={inputCls} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Ovos Coletados <span className="text-amber-400">*</span></label>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Ex: 24"
              value={form.coletados}
              onChange={set('coletados')}
              onKeyDown={onlyNumericKeyDown}
              className={`${inputCls} text-3xl font-black text-center text-amber-400 py-3`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Vendidos</label>
              <input type="number" min="0" inputMode="numeric" placeholder="0" value={form.vendidos} onChange={set('vendidos')} onKeyDown={onlyNumericKeyDown} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Perdidos / Trincados</label>
              <input type="number" min="0" inputMode="numeric" placeholder="0" value={form.perdidos} onChange={set('perdidos')} onKeyDown={onlyNumericKeyDown} className={inputCls} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Observação (opcional)</label>
            <textarea rows={2} placeholder="Ex: Postura normal, raça bem alimentada..." value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="p-4 border-t border-theme-border shrink-0">
          <button onClick={handleSave} className="w-full btn-primary py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400">
            <Check size={16} />
            <span>{editingRecord ? 'Atualizar Registro' : 'Salvar Coleta'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Histórico Completo de Registros do Lote de Ovos
// ─────────────────────────────────────────────────────────────────────────────
function EggLotRecordsModal({
  lot,
  records,
  prodStats,
  onClose,
  onEditRecord,
  onRequestDeleteRecord,
  onDeleteRecord,
  onRegisterWithDate: _onRegisterWithDate
}: {
  lot: EggLot;
  records: EggDailyRecord[];
  prodStats: ReturnType<typeof calculateLotProduction>;
  onClose: () => void;
  onEditRecord: (lot: EggLot, record: EggDailyRecord) => void;
  onRequestDeleteRecord?: (lot: EggLot, recordId: string, date: string) => void;
  onDeleteRecord: (lot: EggLot, recordId: string) => void;
  onRegisterWithDate?: (lot: EggLot, initialDate: string) => void;
}) {
  const [filterType, setFilterType] = useState<'todos' | 'coletas' | 'sem_registro' | 'criticos'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => b.data.localeCompare(a.data));
  }, [records]);

  // Contadores para as pílulas de filtro
  const stats = useMemo(() => {
    let semRegistro = 0;
    let criticos = 0;
    let comColeta = 0;

    records.forEach(r => {
      const isNoRecord = (r.coletados === 0 && (!r.vendidos && !r.perdidos)) || r.observacao === 'Nenhum registro' || r.id?.startsWith('auto-empty-');
      if (isNoRecord) {
        semRegistro++;
      } else {
        const isCritico = (
          (r.perdidos >= r.coletados && (r.coletados > 0 || r.perdidos > 0)) ||
          (r.coletados === 0) ||
          (prodStats.mediaOvosDia >= 2 && r.coletados < prodStats.mediaOvosDia * 0.45) ||
          (r.coletados > 0 && r.perdidos >= 2 && (r.perdidos / r.coletados) >= 0.4)
        );
        if (isCritico) criticos++;
        comColeta++;
      }
    });

    return { total: records.length, semRegistro, criticos, comColeta };
  }, [records, prodStats.mediaOvosDia]);

  const filtered = useMemo(() => {
    return sortedRecords.filter(r => {
      const isNoRecord = (r.coletados === 0 && (!r.vendidos && !r.perdidos)) || r.observacao === 'Nenhum registro' || r.id?.startsWith('auto-empty-');
      const isCritico = !isNoRecord && (
        (r.perdidos >= r.coletados && (r.coletados > 0 || r.perdidos > 0)) ||
        (r.coletados === 0) ||
        (prodStats.mediaOvosDia >= 2 && r.coletados < prodStats.mediaOvosDia * 0.45) ||
        (r.coletados > 0 && r.perdidos >= 2 && (r.perdidos / r.coletados) >= 0.4)
      );

      if (filterType === 'coletas' && isNoRecord) return false;
      if (filterType === 'sem_registro' && !isNoRecord) return false;
      if (filterType === 'criticos' && !isCritico) return false;

      if (searchTerm.trim()) {
        const q = normalizeSearch(searchTerm);
        const dtNorm = formatDate(r.data);
        const isoNorm = r.data;
        const obsNorm = normalizeSearch(r.observacao);
        if (!dtNorm.includes(q) && !isoNorm.includes(q) && !obsNorm.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [sortedRecords, filterType, searchTerm, prodStats.mediaOvosDia]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface w-full max-w-lg rounded-2xl border border-theme-border/70 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="px-5 py-4 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-surface">
          <div>
            <h3 className="font-black text-white text-base flex items-center gap-2">
              <CalendarDays size={18} className="text-amber-400" />
              <span>Histórico de Registros</span>
            </h3>
            <p className="text-xs text-theme-text-muted mt-0.5">
              Baia {lot.baia}{lot.raca ? ` · ${lot.raca}` : ''} &bull; {records.length} {records.length === 1 ? 'dia registrado' : 'dias registrados'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Busca e Filtros Rápidos */}
        <div className="p-3 sm:px-5 sm:py-3 border-b border-theme-border/60 bg-theme-base/50 space-y-2.5 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
            <input
              type="text"
              placeholder="Buscar por data (ex: 22/09) ou observação..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-theme-surface border border-theme-border/80 rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-theme-text-muted focus:border-theme-primary outline-none transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'todos', label: 'Todos', count: stats.total },
              { id: 'coletas', label: 'Com Coleta', count: stats.comColeta },
              { id: 'sem_registro', label: 'Sem Registro', count: stats.semRegistro },
              { id: 'criticos', label: 'Baixa Produção', count: stats.criticos },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterType(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  filterType === f.id
                    ? 'bg-theme-primary text-black font-black shadow-sm'
                    : 'bg-theme-surface hover:bg-theme-surface-hover text-theme-text-muted hover:text-white border border-theme-border/40'
                }`}
              >
                <span>{f.label}</span>
                <span className={`px-1 py-0.2 rounded-full text-[9px] ${
                  filterType === f.id ? 'bg-black/25 text-black' : 'bg-theme-base text-theme-text-muted'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Dias com Scroll Suave */}
        <div className="overflow-y-auto flex-1 p-3 sm:p-5 space-y-2 smooth-scroll">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-theme-text-muted">
              <CalendarDays size={32} className="mx-auto mb-2 opacity-40 text-amber-400" />
              <p className="text-xs font-bold text-white">Nenhum registro encontrado</p>
              <p className="text-[11px] mt-0.5">Tente mudar o filtro ou termo de busca.</p>
            </div>
          ) : (
            filtered.map(r => {
              const isNoRecord = (r.coletados === 0 && (!r.vendidos && !r.perdidos)) || r.observacao === 'Nenhum registro' || r.id?.startsWith('auto-empty-');
              const isCritico = !isNoRecord && (
                (r.perdidos >= r.coletados && (r.coletados > 0 || r.perdidos > 0)) ||
                (r.coletados === 0) ||
                (prodStats.mediaOvosDia >= 2 && r.coletados < prodStats.mediaOvosDia * 0.45) ||
                (r.coletados > 0 && r.perdidos >= 2 && (r.perdidos / r.coletados) >= 0.4)
              );

              return (
                <div
                  key={r.id || r.data}
                  className={`flex items-center justify-between text-xs rounded-xl px-3.5 py-2.5 transition-colors border ${
                    isNoRecord
                      ? 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40'
                      : isCritico
                      ? 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'
                      : 'bg-theme-base/60 border-theme-border/70 hover:border-theme-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <CalendarDays
                      size={14}
                      className={isNoRecord ? 'text-blue-400 shrink-0' : isCritico ? 'text-rose-400 shrink-0' : 'text-amber-400 shrink-0'}
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">{formatDate(r.data)}</span>
                        {isNoRecord ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20 flex items-center gap-1">
                            <Clock size={10} />
                            Sem registro
                          </span>
                        ) : (
                          <>
                            <span className={`font-bold ${isCritico ? 'text-rose-400' : 'text-amber-400'}`}>
                              {r.coletados} {r.coletados === 1 ? 'ovo' : 'ovos'}
                            </span>
                            {isCritico && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                                Baixa produção
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Sublinha de detalhes */}
                      {!isNoRecord && (r.vendidos > 0 || r.perdidos > 0 || r.observacao) && (
                        <div className="flex items-center gap-2 text-[10px] text-theme-text-muted mt-0.5 truncate">
                          {r.vendidos > 0 && <span className="text-green-400 font-medium">+{r.vendidos} vendidos</span>}
                          {r.perdidos > 0 && <span className="text-red-400 font-medium">-{r.perdidos} perdidos</span>}
                          {r.observacao && <span className="italic truncate">&bull; {r.observacao}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => onEditRecord(lot, r)}
                      className="p-1.5 text-theme-text-muted hover:text-amber-400 rounded-lg hover:bg-amber-400/10 transition-colors cursor-pointer"
                      title={isNoRecord ? 'Preencher coleta deste dia' : 'Editar lançamento'}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onRequestDeleteRecord) {
                          onRequestDeleteRecord(lot, r.id, r.data);
                        } else {
                          onDeleteRecord(lot, r.id);
                        }
                      }}
                      className="p-1.5 text-theme-text-muted hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Excluir lançamento"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 sm:px-5 border-t border-theme-border flex items-center justify-end shrink-0 bg-theme-surface">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-theme-base hover:bg-white/5 border border-theme-border text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LotCard — Card Principal do Lote com Detecção de Anomalias & Gestão de Estoque
// ─────────────────────────────────────────────────────────────────────────────
function LotCard({
  lot,
  birds,
  onRegister,
  onRegisterWithDate,
  onEditRecord,
  onDeleteRecord,
  onSellFromStock,
  onToggleStatus,
  onDeleteLot,
  onOpenMovement,
  onOpenNotes,
  onRequestDeleteRecord,
  isExpandedInitial = false,
}: {
  lot: EggLot;
  birds: ReturnType<typeof useAppContext>['birds'];
  onRegister: (lot: EggLot) => void;
  onRegisterWithDate?: (lot: EggLot, initialDate: string) => void;
  onEditRecord: (lot: EggLot, record: EggDailyRecord) => void;
  onDeleteRecord: (lot: EggLot, recordId: string) => void;
  onSellFromStock: (lot: EggLot, stock: number) => void;
  onToggleStatus?: (lot: EggLot) => void;
  onDeleteLot?: (lot: EggLot) => void;
  onOpenMovement?: (lot: EggLot) => void;
  onOpenNotes?: (lot: EggLot) => void;
  onRequestDeleteRecord?: (lot: EggLot, recordId: string, date: string) => void;
  isExpandedInitial?: boolean;
}) {
  const [expanded, setExpanded] = useState(isExpandedInitial);
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const records = lot.registros ?? [];

  const total = records.reduce((s, r) => s + r.coletados, 0);
  const totalVendidos = records.reduce((s, r) => s + r.vendidos, 0);
  const totalPerdidos = records.reduce((s, r) => s + r.perdidos, 0);
  const totalEstoque = Math.max(0, total - totalVendidos - totalPerdidos);

  const receita = records.reduce((s, r) => s + (r.vendidos / 12) * r.precoVenda, 0);
  const custo = records.reduce((s, r) => s + r.vendidos * r.custoProd, 0);
  const lucro = receita - custo;
  const dias = daysBetween(lot.dataInicio, todayISO());
  const totalFemeas = Math.max(lot.qtdFemeas || 0, lot.femeasIds?.length || 0);
  const prodStats = calculateLotProduction(records, totalFemeas);
  const cadastradasCount = lot.femeasIds?.length || 0;
  const avulsasCount = Math.max(0, totalFemeas - cadastradasCount);
  const femeaNomes = lot.femeasIds.map(id => birds.find(b => b.id === id)).filter(Boolean).map(b => b!.nome || b!.anilha).join(', ');
  const isAtivo = lot.status === 'Ativo';

  // ── DETECTOR DE ANOMALIA / QUEDA DE POSTURA ──
  // Compara a média recente (últimos 3 lançamentos) com a média histórica da baia (últimos 14)
  const anomalyInfo = useMemo(() => {
    if (records.length < 3) return null;
    const sorted = [...records].sort((a, b) => b.data.localeCompare(a.data));
    const recent3 = sorted.slice(0, 3);
    const avgRecent = recent3.reduce((s, r) => s + r.coletados, 0) / 3;
    const avgOverall = total / records.length;

    if (avgOverall >= 2 && avgRecent <= avgOverall * 0.6) {
      const dropPct = Math.round(((avgOverall - avgRecent) / avgOverall) * 100);
      return {
        dropPct,
        avgOverall: avgOverall.toFixed(1),
        avgRecent: avgRecent.toFixed(1)
      };
    }
    return null;
  }, [records, total]);

  return (
    <div id={`egg-lot-${lot.id}`} className="rounded-2xl border border-theme-border/60 bg-theme-surface overflow-hidden shadow-lg transition-all hover:border-theme-border">
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
          <Egg size={18} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-sm">Baia {lot.baia}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAtivo ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {lot.status}
              </span>
              {(!prodStats.hasRecords || records.length === 0) && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Sem registros
                </span>
              )}
            </div>

            {/* Ações Rápidas de Gestão do Lote */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onToggleStatus && (
                <button
                  type="button"
                  onClick={() => onToggleStatus(lot)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95 flex items-center gap-1 cursor-pointer ${
                    isAtivo
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  }`}
                  title={isAtivo ? 'Encerrar lote de postura' : 'Reativar lote'}
                >
                  <Check size={11} />
                  <span>{isAtivo ? 'Encerrar' : 'Reativar'}</span>
                </button>
              )}

              {onDeleteLot && (
                <button
                  type="button"
                  onClick={() => onDeleteLot(lot)}
                  className="text-theme-text-muted hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                  title="Excluir este lote de postura"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-theme-text-muted mt-0.5 truncate">
            <strong className="text-white">{totalFemeas} fêmea(s)</strong> {cadastradasCount > 0 && avulsasCount > 0 ? `(${cadastradasCount} cadastradas + ${avulsasCount} avulsas)` : ''} &bull; {prodStats.hasRecords ? `Média: ${prodStats.mediaFormatada} ovos/dia` : 'Sem registros'} &bull; Desde {formatDate(lot.dataInicio)}
          </p>
          {femeaNomes ? (
            <p className="text-[10px] text-theme-text-muted/80 mt-0.5 truncate">
              Aves: <span className="text-white/90 font-medium">{femeaNomes}</span>
              {avulsasCount > 0 && <span className="text-amber-400 font-bold ml-1.5">+ {avulsasCount} não cadastrada(s)</span>}
            </p>
          ) : avulsasCount > 0 ? (
            <p className="text-[10px] text-theme-text-muted/80 mt-0.5 truncate">
              {avulsasCount} ave(s) não cadastradas individualmente no plantel
            </p>
          ) : null}
        </div>
      </div>

      {/* ── CARD AVISO DE SEM REGISTROS (IGUAL DA ABA LOTES) ── */}
      {(!prodStats.hasRecords || records.length === 0) && (
        <div className="mx-4 mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
              <Egg size={16} />
            </div>
            <div>
              <p className="font-black text-amber-300 text-xs">Sem registros</p>
              <p className="text-[11px] text-theme-text-muted">Nenhuma coleta registrada para este lote ainda. Lance o primeiro dia de postura.</p>
            </div>
          </div>
          {isAtivo && (
            <button
              type="button"
              onClick={() => onRegister(lot)}
              className="px-3 py-1.5 bg-theme-primary hover:bg-amber-400 text-black text-xs font-black rounded-lg transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
            >
              <Plus size={13} />
              <span>Lançar Dia</span>
            </button>
          )}
        </div>
      )}

      {/* ── CARD ALERTA DE QUEDA DE POSTURA ── */}
      {anomalyInfo && (
        <div className="mx-4 mb-3 p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300 animate-pulse">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-black text-red-400 uppercase text-[10px] tracking-wider">
              ⚠️ Alerta: Queda de {anomalyInfo.dropPct}% na Postura
            </p>
            <p className="text-[11px] leading-relaxed text-red-200/90">
              A produção recente caiu para <strong>{anomalyInfo.avgRecent} ovos/dia</strong> (Média da baia: <strong>{anomalyInfo.avgOverall}/dia</strong>). Verifique alimentação, água ou sintomas de estresse/doença.
            </p>
          </div>
        </div>
      )}

      {/* Grid de 4 colunas: Coletados, Estoque, Vendidos, Perdidos */}
      <div className="grid grid-cols-4 divide-x divide-theme-border border-t border-theme-border min-w-0 overflow-hidden">
        {[{ label: 'Coletados', value: total, color: 'text-amber-400' },
          { label: 'Estoque', value: totalEstoque, color: 'text-blue-400' },
          { label: 'Vendidos', value: totalVendidos, color: 'text-green-400' },
          { label: 'Perdidos', value: totalPerdidos, color: 'text-red-400' }
        ].map(s => (
          <div key={s.label} className="py-2 px-1 sm:p-2 text-center min-w-0 overflow-hidden">
            <p className={`text-xs sm:text-base font-black ${s.color} truncate`}>{s.value}</p>
            <p className="text-[7.5px] sm:text-[9px] text-theme-text-muted uppercase font-extrabold tracking-tighter sm:tracking-normal truncate" title={s.label}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 border-t border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-theme-base/20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
            <BarChart2 size={13} />
          </div>
          <div>
            <span className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider block">
              Média de Produção
            </span>
            {prodStats.hasRecords ? (
              <p className="text-[11px] text-theme-text-muted">
                Diferença de <strong className="text-white">{prodStats.diasProducao} {prodStats.diasProducao === 1 ? 'dia' : 'dias'} de produção</strong> ({prodStats.totalOvos} ovos)
              </p>
            ) : (
              <p className="text-[11px] text-theme-text-muted italic">
                Nenhuma coleta registrada para cálculo
              </p>
            )}
          </div>
        </div>

        {prodStats.hasRecords ? (
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="text-right">
              <span className="text-xs sm:text-sm font-black text-amber-400">
                {prodStats.mediaFormatada} <span className="text-[10px] font-bold text-white/80">ovos/dia</span>
              </span>
              {totalFemeas > 0 && (
                <span className="text-[10px] text-emerald-400 font-bold block">
                  {prodStats.taxaPostura}% de postura
                </span>
              )}
            </div>
            {totalFemeas > 0 && (
              <div className="w-16 sm:w-20 h-2 rounded-full bg-theme-base overflow-hidden border border-theme-border/40">
                <div
                  className={`h-full rounded-full transition-all ${
                    prodStats.taxaPostura >= 70 ? 'bg-emerald-400' : prodStats.taxaPostura >= 40 ? 'bg-amber-400' : 'bg-blue-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(8, prodStats.taxaPostura))}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-theme-text-muted font-medium italic">
            Sem registros ainda
          </span>
        )}
      </div>

      {/* Ações Rápidas do Lote */}
      <div className="px-4 pb-3 pt-2 flex items-center gap-1.5 flex-wrap border-t border-theme-border">
        {isAtivo && (
          <button onClick={() => onRegister(lot)} className="flex-1 btn-primary py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400 min-w-[110px]">
            <Plus size={14} />
            <span>Registrar Dia</span>
          </button>
        )}

        {totalEstoque > 0 && isAtivo && (
          <button
            onClick={() => onSellFromStock(lot, totalEstoque)}
            className="px-2.5 py-2 rounded-xl border border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1 active:scale-95 cursor-pointer"
            title="Registrar venda de ovos do estoque"
          >
            <ShoppingCart size={13} />
            <span>Vender ({totalEstoque})</span>
          </button>
        )}

        {onOpenMovement && (
          <button
            type="button"
            onClick={() => onOpenMovement(lot)}
            className="px-2.5 py-2 rounded-xl border border-theme-border/70 bg-theme-surface hover:bg-theme-surface-hover text-theme-primary transition-all text-xs font-bold flex items-center gap-1 active:scale-95 cursor-pointer"
            title="Registrar entradas, saídas e baixas de aves deste lote"
          >
            <Activity size={13} />
            <span>Baixas (+/-)</span>
          </button>
        )}

        {onOpenNotes && (
          <button
            type="button"
            onClick={() => onOpenNotes(lot)}
            className="px-2.5 py-2 rounded-xl border border-theme-border/70 bg-theme-surface hover:bg-theme-surface-hover text-theme-primary transition-all text-xs font-bold flex items-center gap-1 active:scale-95 cursor-pointer"
            title="Ver e adicionar observações adicionais deste lote"
          >
            <FileText size={13} />
            <span>Observações</span>
            {((lot.observacoesAdicionais?.length || 0) + (lot.observacao ? 1 : 0)) > 0 && (
              <span className="ml-0.5 text-[10px] px-1 rounded-full bg-theme-primary/20 text-theme-primary font-bold">
                {(lot.observacoesAdicionais?.length || 0) + (lot.observacao ? 1 : 0)}
              </span>
            )}
          </button>
        )}

        <button onClick={() => setExpanded(v => !v)} className="px-2.5 py-2 rounded-xl border border-theme-border text-theme-text-muted hover:text-white hover:border-theme-primary transition-all text-xs font-bold flex items-center gap-1 active:scale-95">
          <BarChart2 size={13} />
          <span>Análise</span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-theme-border bg-theme-base/40 px-4 py-4 space-y-4 animate-fade-in">
          <div>
            <EggProductionChart
              lot={lot}
              records={records}
              totalFemeas={totalFemeas}
              expectativaDiaria={lot.expectativaDiaria}
              onOpenRegister={(targetLot, initialDate, existing) => {
                if (existing) {
                  onEditRecord(targetLot, existing);
                } else if (onRegisterWithDate) {
                  onRegisterWithDate(targetLot, initialDate || todayISO());
                } else {
                  onRegister(targetLot);
                }
              }}
              onEditRecord={onEditRecord}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
              <p className="text-[10px] text-green-400 font-bold uppercase mb-1">Receita Total</p>
              <p className="text-lg font-black text-white">{fmtBRL(receita)}</p>
              <p className="text-[10px] text-theme-text-muted">{totalVendidos} ovos vendidos</p>
            </div>
            <div className={`rounded-xl p-3 border ${lucro >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <p className={`text-[10px] font-bold uppercase mb-1 ${lucro >= 0 ? 'text-blue-400' : 'text-red-400'}`}>Lucro Líquido</p>
              <p className={`text-lg font-black ${lucro >= 0 ? 'text-white' : 'text-red-400'}`}>{fmtBRL(lucro)}</p>
              <p className="text-[10px] text-theme-text-muted">Custo: {fmtBRL(custo)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[{ label: 'Dias ativos', value: `${dias}d` }, { label: 'Lançamentos', value: records.length }, { label: 'Média/dia', value: prodStats.hasRecords ? prodStats.mediaFormatada : '0' }].map(m => (
              <div key={m.label} className="rounded-xl bg-theme-surface border border-theme-border p-2 text-center">
                <p className="text-sm font-black text-white">{m.value}</p>
                <p className="text-[9px] text-theme-text-muted uppercase font-bold">{m.label}</p>
              </div>
            ))}
          </div>

          {records.length > 0 && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowRecordsModal(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-theme-border/80 bg-theme-surface hover:bg-theme-surface-hover text-white font-bold text-xs flex items-center justify-between transition-all hover:border-theme-primary/50 group active:scale-[0.99] cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} className="text-amber-400 group-hover:scale-110 transition-transform" />
                  <span>Ver Histórico de Registros ({records.length} {records.length === 1 ? 'dia' : 'dias'})</span>
                </div>
                <div className="flex items-center gap-1.5 text-theme-text-muted group-hover:text-white transition-colors">
                  <span className="text-[11px] font-medium">Abrir Histórico</span>
                  <ChevronRight size={14} className="text-amber-400" />
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      {showRecordsModal && (
        <EggLotRecordsModal
          lot={lot}
          records={records}
          prodStats={prodStats}
          onClose={() => setShowRecordsModal(false)}
          onEditRecord={(l, r) => {
            setShowRecordsModal(false);
            onEditRecord(l, r);
          }}
          onRequestDeleteRecord={onRequestDeleteRecord}
          onDeleteRecord={onDeleteRecord}
          onRegisterWithDate={onRegisterWithDate}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal: Eggs
// ─────────────────────────────────────────────────────────────────────────────
export function Eggs() {
  const { hasModuleAccess } = useAuth();
  const { eggLots, addEggLot, editEggLot, removeEggLot, birds, editBird, editMeatLot, showToast } = useAppContext();
  const location = useLocation();

  if (!hasModuleAccess('eggs')) {
    return <ModuleLockedPaywall module="eggs" />;
  }

  const [registerTarget, setRegisterTarget] = useState<EggLot | null>(null);
  const [editingRecord, setEditingRecord] = useState<EggDailyRecord | null>(null);
  const [registerInitialDate, setRegisterInitialDate] = useState<string | undefined>(undefined);
  const [isCreateLotModalOpen, setIsCreateLotModalOpen] = useState(false);
  const [period, setPeriod] = useState<7 | 30 | 999>(30);

  // Estados para exclusão com ConfirmDialog e modal de movimentações
  const [deleteLotConfirm, setDeleteLotConfirm] = useState<EggLot | null>(null);
  const [toggleStatusConfirm, setToggleStatusConfirm] = useState<{ lot: EggLot; nextStatus: 'Ativo' | 'Encerrado' } | null>(null);
  const [deleteRecordConfirm, setDeleteRecordConfirm] = useState<{ lot: EggLot; recordId: string; date: string } | null>(null);
  const [movementModal, setMovementModal] = useState<{ isOpen: boolean; lote: EggLot | null }>({ isOpen: false, lote: null });
  const [notesModal, setNotesModal] = useState<{ isOpen: boolean; lote: EggLot | null }>({ isOpen: false, lote: null });

  // Modal de Venda Direta do Estoque
  const [sellStockTarget, setSellStockTarget] = useState<{ lot: EggLot; stock: number } | null>(null);

  // Rola para o topo apenas no carregamento inicial da página (nunca durante edição de registros)
  useEffect(() => {
    window.scrollTo(0, 0);
    const scrollContainers = document.querySelectorAll('.overflow-y-auto');
    scrollContainers.forEach(el => { el.scrollTop = 0; });
  }, []);

  // Sincroniza lembrete diário sem rolar a página
  useEffect(() => {
    const today = todayISO();
    const hasRegisteredToday = eggLots.some(lot => (lot.registros || []).some(r => r.data === today));
    syncDailyEggReminder(hasRegisteredToday);
  }, [eggLots]);

  // Rola até o lote específico quando vindo da aba Lotes
  useEffect(() => {
    const state = location.state as { scrollToLotId?: string } | null;
    if (state?.scrollToLotId) {
      const id = state.scrollToLotId;
      // Aguarda o DOM renderizar os cards antes de rolar
      const attempt = (tries: number) => {
        const el = document.getElementById(`egg-lot-${id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Destaca brevemente o card
          el.classList.add('ring-2', 'ring-theme-primary', 'ring-offset-2');
          setTimeout(() => el.classList.remove('ring-2', 'ring-theme-primary', 'ring-offset-2'), 2000);
        } else if (tries > 0) {
          setTimeout(() => attempt(tries - 1), 200);
        }
      };
      setTimeout(() => attempt(5), 300);
    }
  }, [location.state]);

  const { kpiColetados, kpiVendidos, kpiPerdidos, kpiReceita, kpiCusto, kpiLucro } = useMemo(() => {
    const cutoff = period === 999 ? '2000-01-01' : new Date(Date.now() - period * 86400000).toISOString().split('T')[0];
    let col = 0, vend = 0, perd = 0, rec = 0, cst = 0;
    for (const lot of eggLots) {
      for (const r of (lot.registros ?? [])) {
        if (r.data < cutoff) continue;
        col += r.coletados;
        vend += r.vendidos;
        perd += r.perdidos;
        rec += (r.vendidos / 12) * r.precoVenda;
        cst += r.vendidos * r.custoProd;
      }
    }
    return { kpiColetados: col, kpiVendidos: vend, kpiPerdidos: perd, kpiReceita: rec, kpiCusto: cst, kpiLucro: rec - cst };
  }, [eggLots, period]);

  const aproveitamento = kpiColetados > 0 ? Math.round(((kpiColetados - kpiPerdidos) / kpiColetados) * 100) : 0;
  const activeLots = eggLots.filter(l => l.status === 'Ativo');
  const endedLots = eggLots.filter(l => l.status === 'Encerrado');

  // Salva ou atualiza um registro diário
  const handleSaveRecord = (rec: EggDailyRecord) => {
    if (!registerTarget) return;

    // Busca sempre o lote atualizado do estado global para evitar perda de dados por closure desatualizada
    const currentLot = eggLots.find(l => l.id === registerTarget.id) || registerTarget;
    const existingIndex = (currentLot.registros || []).findIndex(r => r.id === rec.id || r.data === rec.data);
    let updatedRegistros: EggDailyRecord[];

    if (existingIndex >= 0) {
      updatedRegistros = [...(currentLot.registros || [])];
      updatedRegistros[existingIndex] = {
        ...updatedRegistros[existingIndex],
        ...rec
      };
    } else {
      updatedRegistros = [...(currentLot.registros || []), rec];
    }

    updatedRegistros.sort((a, b) => (b.data || '').localeCompare(a.data || ''));

    editEggLot(currentLot.id, { registros: updatedRegistros });
    showToast(`Coleta de ${rec.coletados} ovos salva com sucesso!`, 'success');
  };

  // Exclui um registro diário
  const handleDeleteRecord = (lot: EggLot, recordId: string) => {
    const updatedRegistros = (lot.registros || []).filter(r => r.id !== recordId);
    editEggLot(lot.id, { registros: updatedRegistros });
  };

  const handleRequestToggleStatus = (lot: EggLot) => {
    const nextStatus = lot.status === 'Ativo' ? 'Encerrado' : 'Ativo';
    setToggleStatusConfirm({ lot, nextStatus });
  };

  const handleExecuteToggleStatus = () => {
    if (!toggleStatusConfirm) return;
    const { lot, nextStatus } = toggleStatusConfirm;
    editEggLot(lot.id, { status: nextStatus });
    showToast(
      nextStatus === 'Encerrado'
        ? `Lote Baia ${lot.baia} foi encerrado com sucesso!`
        : `Lote Baia ${lot.baia} foi reativado com sucesso!`,
      nextStatus === 'Ativo' ? 'success' : 'info'
    );
    setToggleStatusConfirm(null);
  };

  const handleExecuteDeleteLot = () => {
    if (!deleteLotConfirm) return;
    removeEggLot(deleteLotConfirm.id);
    showToast(`Lote Baia ${deleteLotConfirm.baia} excluído com sucesso!`, 'info');
    setDeleteLotConfirm(null);
  };

  const handleExecuteDeleteRecord = () => {
    if (!deleteRecordConfirm) return;
    const { lot, recordId } = deleteRecordConfirm;
    handleDeleteRecord(lot, recordId);
    showToast('Registro diário excluído com sucesso!', 'info');
    setDeleteRecordConfirm(null);
  };

  // Confirmação de venda direta do estoque
  const handleConfirmSellStock = (count: number, pricePerDozen: number) => {
    if (!sellStockTarget) return;
    const { lot } = sellStockTarget;

    const records = [...(lot.registros || [])].sort((a, b) => b.data.localeCompare(a.data));
    if (records.length > 0) {
      records[0].vendidos = (records[0].vendidos || 0) + count;
      records[0].precoVenda = pricePerDozen;
      editEggLot(lot.id, { registros: records });
    } else {
      const newRecord: EggDailyRecord = {
        id: uid(),
        data: todayISO(),
        coletados: 0,
        vendidos: count,
        perdidos: 0,
        precoVenda: pricePerDozen,
        custoProd: lot.custoProdPadrao !== undefined ? lot.custoProdPadrao : 0.30,
        observacao: 'Venda de estoque'
      };
      editEggLot(lot.id, { registros: [newRecord] });
    }
    showToast(`${count} ovos vendidos registrados com sucesso!`, 'success');
  };

  const periodLabel = period === 7 ? '7 dias' : period === 30 ? '30 dias' : 'Tudo';

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-10 animate-fade-in overflow-x-hidden">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Egg size={24} className="text-amber-400" />
            <span>Gestão de Ovos</span>
          </h2>
          <p className="text-xs text-theme-text-muted mt-0.5">
            {activeLots.length} lote(s) ativo(s) &bull; {eggLots.reduce((s, l) => s + (l.registros?.length ?? 0), 0)} lançamentos
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Seletor de Período */}
          <div className="flex bg-theme-surface border border-theme-border rounded-xl p-1 gap-1">
            {([7, 30, 999] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${period === p ? 'bg-amber-400 text-black' : 'text-theme-text-muted hover:text-white'}`}
              >
                {p === 999 ? 'Tudo' : `${p}d`}
              </button>
            ))}
          </div>

          {/* Botão Novo Lote */}
          <button
            onClick={() => setIsCreateLotModalOpen(true)}
            className="btn-primary px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400 shadow-md shrink-0"
          >
            <Plus size={14} />
            <span>Novo Lote</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard icon={Egg} label="Coletados" value={String(kpiColetados)} sub={`${aproveitamento}% aproveitamento (${periodLabel})`} color="amber" />
        <KpiCard icon={ShoppingCart} label="Vendidos" value={String(kpiVendidos)} sub={`${Math.max(0, kpiColetados - kpiVendidos - kpiPerdidos)} em estoque`} color="green" />
        <KpiCard icon={DollarSign} label="Receita Total" value={fmtBRL(kpiReceita)} sub={`Custo ${fmtBRL(kpiCusto)}`} color="blue" />
        <KpiCard icon={kpiLucro >= 0 ? TrendingUp : TrendingDown} label="Lucro Líquido" value={fmtBRL(kpiLucro)} sub={`${kpiVendidos} vendidos`} color={kpiLucro >= 0 ? 'green' : 'red'} />
      </div>

      {/* Sem Lotes */}
      {eggLots.length === 0 && (
        <div className="rounded-2xl border border-dashed border-theme-border bg-theme-surface/40 p-10 text-center space-y-4">
          <Egg size={44} className="text-amber-400/40 mx-auto" />
          <div className="space-y-1">
            <p className="text-white font-black text-lg">Nenhum lote de postura cadastrado</p>
            <p className="text-theme-text-muted text-xs max-w-xs mx-auto">
              Cadastre um lote para começar a registrar as coletas diárias e acompanhar os lucros do seu criatório.
            </p>
          </div>
          <button
            onClick={() => setIsCreateLotModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400 shadow-lg shadow-amber-500/10"
          >
            <Plus size={16} />
            <span>Criar Primeiro Lote de Postura</span>
          </button>
        </div>
      )}

      {/* Lotes Ativos */}
      {activeLots.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-muted flex items-center gap-2">
            <Layers size={12} />
            <span>Lotes Ativos ({activeLots.length})</span>
          </h3>
          {activeLots.map(lot => (
            <LotCard
              key={lot.id}
              lot={lot}
              birds={birds}
              onRegister={l => { setRegisterInitialDate(undefined); setEditingRecord(null); setRegisterTarget(l); }}
              onRegisterWithDate={(l, dt) => { setRegisterInitialDate(dt); setEditingRecord(null); setRegisterTarget(l); }}
              onEditRecord={(l, r) => { setRegisterInitialDate(undefined); setEditingRecord(r); setRegisterTarget(l); }}
              onDeleteRecord={handleDeleteRecord}
              onSellFromStock={(l, s) => setSellStockTarget({ lot: l, stock: s })}
              onToggleStatus={handleRequestToggleStatus}
              onDeleteLot={l => setDeleteLotConfirm(l)}
              onOpenMovement={l => setMovementModal({ isOpen: true, lote: l })}
              onOpenNotes={l => setNotesModal({ isOpen: true, lote: l })}
              onRequestDeleteRecord={(l, recId, dt) => setDeleteRecordConfirm({ lot: l, recordId: recId, date: dt })}
            />
          ))}
        </div>
      )}

      {/* Lotes Encerrados */}
      {endedLots.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-muted flex items-center gap-2">
            <Layers size={12} />
            <span>Lotes Encerrados ({endedLots.length})</span>
          </h3>
          {endedLots.map(lot => (
            <LotCard
              key={lot.id}
              lot={lot}
              birds={birds}
              onRegister={l => { setRegisterInitialDate(undefined); setEditingRecord(null); setRegisterTarget(l); }}
              onRegisterWithDate={(l, dt) => { setRegisterInitialDate(dt); setEditingRecord(null); setRegisterTarget(l); }}
              onEditRecord={(l, r) => { setRegisterInitialDate(undefined); setEditingRecord(r); setRegisterTarget(l); }}
              onDeleteRecord={handleDeleteRecord}
              onSellFromStock={(l, s) => setSellStockTarget({ lot: l, stock: s })}
              onToggleStatus={handleRequestToggleStatus}
              onDeleteLot={l => setDeleteLotConfirm(l)}
              onOpenMovement={l => setMovementModal({ isOpen: true, lote: l })}
              onOpenNotes={l => setNotesModal({ isOpen: true, lote: l })}
              onRequestDeleteRecord={(l, recId, dt) => setDeleteRecordConfirm({ lot: l, recordId: recId, date: dt })}
            />
          ))}
        </div>
      )}

      {/* Modal: Registrar / Editar Dia */}
      {registerTarget && (
        <RegisterDaySheet
          lot={registerTarget}
          editingRecord={editingRecord}
          initialDate={registerInitialDate}
          onClose={() => { setRegisterTarget(null); setEditingRecord(null); setRegisterInitialDate(undefined); }}
          onSave={handleSaveRecord}
        />
      )}

      {/* Modal: Registrar Venda do Estoque */}
      {sellStockTarget && (
        <SellFromStockModal
          lot={sellStockTarget.lot}
          availableStock={sellStockTarget.stock}
          onClose={() => setSellStockTarget(null)}
          onConfirm={handleConfirmSellStock}
        />
      )}

      {/* Modal: Criar Lote de Postura */}
      {isCreateLotModalOpen && (
        <CreateEggLotModal
          onClose={() => setIsCreateLotModalOpen(false)}
          onSave={addEggLot}
        />
      )}

      {/* Modal de Movimentações & Baixas (+/-) de Fêmeas */}
      {movementModal.isOpen && movementModal.lote && (
        <LotMovementModal
          isOpen={movementModal.isOpen}
          onClose={() => setMovementModal({ isOpen: false, lote: null })}
          lote={movementModal.lote}
          loteType="postura"
          birds={birds}
          editBird={editBird}
          editEggLot={editEggLot}
          editMeatLot={editMeatLot}
          showToast={showToast}
        />
      )}

      {/* Modal de Observações Adicionais do Lote de Postura */}
      {(() => {
        const liveLot = notesModal.lote ? eggLots.find(l => l.id === notesModal.lote?.id) || notesModal.lote : null;
        return (
          <LotNotesModal
            isOpen={notesModal.isOpen && !!liveLot}
            onClose={() => setNotesModal({ isOpen: false, lote: null })}
            lote={liveLot}
            lotType="postura"
            editEggLot={editEggLot}
            editMeatLot={editMeatLot}
            showToast={showToast}
          />
        );
      })()}

      {/* Confirmação de Encerramento / Reativação do Lote */}
      <ConfirmDialog
        isOpen={!!toggleStatusConfirm}
        title={toggleStatusConfirm?.nextStatus === 'Encerrado' ? `Encerrar Lote da Baia ${toggleStatusConfirm?.lot.baia || ''}?` : `Reativar Lote da Baia ${toggleStatusConfirm?.lot.baia || ''}?`}
        message={
          toggleStatusConfirm?.nextStatus === 'Encerrado'
            ? `Tem certeza que deseja encerrar as atividades do Lote da Baia ${toggleStatusConfirm?.lot.baia}? O lote será arquivado na seção de Lotes Encerrados.`
            : `Deseja reativar o Lote da Baia ${toggleStatusConfirm?.lot.baia}? Ele voltará para a lista de Lotes Ativos para novas coletas.`
        }
        variant={toggleStatusConfirm?.nextStatus === 'Encerrado' ? 'warning' : 'info'}
        confirmText={toggleStatusConfirm?.nextStatus === 'Encerrado' ? 'Sim, encerrar lote' : 'Sim, reativar lote'}
        onConfirm={handleExecuteToggleStatus}
        onCancel={() => setToggleStatusConfirm(null)}
      />

      {/* Confirmação de Exclusão do Lote de Postura */}
      <ConfirmDialog
        isOpen={!!deleteLotConfirm}
        title="Excluir Lote de Postura"
        message={`Deseja realmente excluir o Lote da Baia ${deleteLotConfirm?.baia || ''}? Todo o histórico de produção diária deste lote será apagado.`}
        variant="danger"
        confirmText="Sim, excluir lote"
        onConfirm={handleExecuteDeleteLot}
        onCancel={() => setDeleteLotConfirm(null)}
      />

      {/* Confirmação de Exclusão de Registro Diário */}
      <ConfirmDialog
        isOpen={!!deleteRecordConfirm}
        title="Excluir Lançamento Diário"
        message={`Deseja realmente excluir o registro de ovos do dia ${deleteRecordConfirm ? formatDate(deleteRecordConfirm.date) : ''}?`}
        variant="danger"
        confirmText="Sim, excluir"
        onConfirm={handleExecuteDeleteRecord}
        onCancel={() => setDeleteRecordConfirm(null)}
      />
    </div>
  );
}
