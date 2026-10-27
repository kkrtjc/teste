/**
 * Agregações do livro-razão. Tudo em UMA passada, sem arrays intermediários — barato em celular fraco.
 */
import { isCounted } from './ledger';
import { getMovementCents, getMovementCentsWithFallback, formatBRL } from './money';
import { normalizeDateToISO } from '../dates';
import {
  REASON_LABELS,
  TYPE_LABELS,
  PAYMENT_LABELS,
  type BirdMovement,
  type MonthPoint,
  type MovementType,
  type Range,
  type SalesSummary,
  type BirdLike,
} from './types';

const inRange = (data: string, range: Range) => {
  if (!data) return false;
  const clean = normalizeDateToISO(data);
  if (!clean) return false;
  if (range.from && clean < range.from) return false;
  if (range.to && clean > range.to) return false;
  return true;
};

/** Custo de aquisição por ave (soma das entradas contadas). */
export function costByBird(ledger: readonly BirdMovement[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < ledger.length; i++) {
    const m = ledger[i];
    if (m.tipo !== 'entrada' || !isCounted(m)) continue;
    map.set(m.birdId, (map.get(m.birdId) || 0) + getMovementCents(m));
  }
  return map;
}

export function summarize(
  ledger: readonly BirdMovement[], 
  range: Range = {}, 
  birds?: readonly BirdLike[]
): SalesSummary {
  const birdsList = Array.isArray(birds) ? birds : undefined;
  const cost = costByBird(ledger);
  const s: SalesSummary = {
    receita: 0, recebido: 0, aReceber: 0, custoVendidas: 0, lucro: 0,
    vendasCount: 0, vendasSemCusto: 0, ticketMedio: 0,
    perdasCount: 0, perdasValor: 0, saidasCount: 0, entradasCount: 0, entradasCusto: 0,
  };
  for (let i = 0; i < ledger.length; i++) {
    const m = ledger[i];
    if (!isCounted(m) || !inRange(m.data, range)) continue;
    const cents = getMovementCentsWithFallback(m, birdsList);
    switch (m.tipo) {
      case 'venda': {
        s.vendasCount++;
        s.receita += cents;
        if (m.statusPagamento === 'pendente') s.aReceber += cents;
        else s.recebido += cents;
        const c = cost.get(m.birdId);
        if (c === undefined || c === 0) s.vendasSemCusto++;
        s.custoVendidas += c || 0;
        break;
      }
      case 'perda': s.perdasCount++; s.perdasValor += cents; break;
      case 'saida': s.saidasCount++; break;
      case 'entrada': s.entradasCount++; s.entradasCusto += cents; break;
    }
  }
  s.lucro = s.receita - s.custoVendidas;
  s.ticketMedio = s.vendasCount > 0 ? Math.round(s.receita / s.vendasCount) : 0;
  return s;
}

/** Série mensal dos últimos `months` meses (inclui o mês de `today`), do mais antigo ao mais novo. */
export function monthlySeries(
  ledger: readonly BirdMovement[], 
  today: string, 
  months = 6, 
  birds?: readonly BirdLike[]
): MonthPoint[] {
  const birdsList = Array.isArray(birds) ? birds : undefined;
  const [ty, tm] = today.split('-').map(Number);
  const points: MonthPoint[] = [];
  const index = new Map<string, MonthPoint>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(ty, tm - 1 - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const p: MonthPoint = { key, receita: 0, vendas: 0, perdas: 0 };
    points.push(p);
    index.set(key, p);
  }
  for (let i = 0; i < ledger.length; i++) {
    const m = ledger[i];
    if (!isCounted(m)) continue;
    const cleanData = normalizeDateToISO(m.data);
    const monthKey = cleanData ? cleanData.slice(0, 7) : '';
    const p = index.get(monthKey);
    if (!p) continue;
    const cents = getMovementCentsWithFallback(m, birdsList);
    if (m.tipo === 'venda') { p.receita += cents; p.vendas++; }
    else if (m.tipo === 'perda') p.perdas++;
  }
  return points;
}

export interface ChartBarData {
  key: string;
  label: string;
  sublabel?: string;
  receita: number;
  vendas: number;
  isHighlight?: boolean;
}

export interface DynamicChartReport {
  title: string;
  subtitle: string;
  bars: ChartBarData[];
  totalReceita: number;
}

/**
 * Constrói dinamicamente o gráfico conforme o período ativo:
 * - 'hoje': 7 dias com o dia de Hoje destacado
 * - '7d': os 7 dias individuais dos últimos 7 dias
 * - '30d': as 4 semanas dos últimos 30 dias
 * - 'tudo': meses históricos
 * - 'custom': dias ou semanas do intervalo personalizado
 */
export function buildDynamicChartSeries(
  movements: readonly BirdMovement[],
  period: PeriodKey,
  today: string,
  customRange?: Range,
  birds?: readonly BirdLike[]
): DynamicChartReport {
  const birdsList = Array.isArray(birds) ? birds : undefined;
  const countedSales = movements.filter(m => m.tipo === 'venda' && isCounted(m));
  const getCleanDay = (d: string | undefined | null) => (d ? normalizeDateToISO(d) : '');
  const getCents = (m: BirdMovement) => getMovementCentsWithFallback(m, birdsList);

  const [ty, tm, td] = today.split('-').map(Number);
  const yesterdayDt = new Date(Date.UTC(ty, tm - 1, td - 1));
  const yesterdayIso = `${yesterdayDt.getUTCFullYear()}-${String(yesterdayDt.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterdayDt.getUTCDate()).padStart(2, '0')}`;

  const todaySales = countedSales.filter(m => getCleanDay(m.data) === today);
  const todayTotal = todaySales.reduce((acc, m) => acc + getCents(m), 0);
  const yesterdaySales = countedSales.filter(m => getCleanDay(m.data) === yesterdayIso);
  const yesterdayTotal = yesterdaySales.reduce((acc, m) => acc + getCents(m), 0);

  if (period === 'hoje') {
    const bars: ChartBarData[] = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(Date.UTC(ty, tm - 1, td - i));
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
      const daySales = countedSales.filter(m => getCleanDay(m.data) === iso);
      const isToday = iso === today;
      const isYesterday = iso === yesterdayIso;
      const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dt.getUTCDay()];
      const dayMonth = `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      bars.push({
        key: iso,
        label: isToday ? 'Hoje' : isYesterday ? 'Ontem' : dayName,
        sublabel: dayMonth,
        receita: daySales.reduce((acc, m) => acc + getCents(m), 0),
        vendas: daySales.length,
        isHighlight: isToday
      });
    }
    return {
      title: `Vendas de Hoje (${today.split('-').reverse().join('/')})`,
      subtitle: `${todaySales.length} venda(s) hoje (${formatBRL(todayTotal)}) • Ontem: ${formatBRL(yesterdayTotal)} (${yesterdaySales.length} venda(s))`,
      bars,
      totalReceita: todayTotal
    };
  }

  if (period === '7d') {
    const bars: ChartBarData[] = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(Date.UTC(ty, tm - 1, td - i));
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
      const daySales = countedSales.filter(m => getCleanDay(m.data) === iso);
      const isToday = iso === today;
      const isYesterday = iso === yesterdayIso;
      const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dt.getUTCDay()];
      const dayMonth = `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      bars.push({
        key: iso,
        label: isToday ? 'Hoje' : isYesterday ? 'Ontem' : dayName,
        sublabel: dayMonth,
        receita: daySales.reduce((acc, m) => acc + getCents(m), 0),
        vendas: daySales.length,
        isHighlight: isToday
      });
    }
    const total = bars.reduce((acc, b) => acc + b.receita, 0);
    const totalVendas = bars.reduce((acc, b) => acc + b.vendas, 0);
    return {
      title: 'Vendas dos Últimos 7 Dias (Por Dia)',
      subtitle: `${totalVendas} venda(s) no período • Ontem: ${formatBRL(yesterdayTotal)} • Hoje: ${formatBRL(todayTotal)}`,
      bars,
      totalReceita: total
    };
  }

  if (period === '30d') {
    // Para 30 dias, geramos os últimos 14 dias individuais para alta resolução diária dos dias mais recentes
    const bars: ChartBarData[] = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(Date.UTC(ty, tm - 1, td - i));
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
      const daySales = countedSales.filter(m => getCleanDay(m.data) === iso);
      const isToday = iso === today;
      const isYesterday = iso === yesterdayIso;
      const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dt.getUTCDay()];
      const dayMonth = `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      bars.push({
        key: iso,
        label: isToday ? 'Hoje' : isYesterday ? 'Ontem' : dayName,
        sublabel: dayMonth,
        receita: daySales.reduce((acc, m) => acc + getCents(m), 0),
        vendas: daySales.length,
        isHighlight: isToday
      });
    }
    const total = countedSales
      .filter(m => {
        const d = getCleanDay(m.data);
        const dt30 = new Date(Date.UTC(ty, tm - 1, td - 29));
        const iso30 = `${dt30.getUTCFullYear()}-${String(dt30.getUTCMonth() + 1).padStart(2, '0')}-${String(dt30.getUTCDate()).padStart(2, '0')}`;
        return d >= iso30 && d <= today;
      })
      .reduce((acc, m) => acc + getCents(m), 0);

    return {
      title: 'Vendas dos Últimos 30 Dias (Diário Recente)',
      subtitle: `Visão diária detalhada • Ontem: ${formatBRL(yesterdayTotal)} • Hoje: ${formatBRL(todayTotal)}`,
      bars,
      totalReceita: total
    };
  }

  if (period === 'custom') {
    const from = customRange?.from || today;
    const to = customRange?.to || from;
    const [fy, fm, fd] = from.split('-').map(Number);
    const [toy, tom, tod] = to.split('-').map(Number);
    const startDt = new Date(Date.UTC(fy, fm - 1, fd));
    const endDt = new Date(Date.UTC(toy, tom - 1, tod));
    const diffDays = Math.max(1, Math.round((endDt.getTime() - startDt.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    if (diffDays <= 21) {
      const bars: ChartBarData[] = [];
      for (let i = 0; i < diffDays; i++) {
        const cur = new Date(Date.UTC(fy, fm - 1, fd + i));
        const iso = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, '0')}-${String(cur.getUTCDate()).padStart(2, '0')}`;
        const daySales = countedSales.filter(m => getCleanDay(m.data) === iso);
        const isToday = iso === today;
        const isYesterday = iso === yesterdayIso;
        const dayMonth = `${String(cur.getUTCDate()).padStart(2, '0')}/${String(cur.getUTCMonth() + 1).padStart(2, '0')}`;
        bars.push({
          key: iso,
          label: isToday ? 'Hoje' : isYesterday ? 'Ontem' : dayMonth,
          sublabel: isToday || isYesterday ? dayMonth : undefined,
          receita: daySales.reduce((acc, m) => acc + getCents(m), 0),
          vendas: daySales.length,
          isHighlight: isToday
        });
      }
      const total = bars.reduce((acc, b) => acc + b.receita, 0);
      return {
        title: diffDays === 1 
          ? `Vendas do Dia ${from.split('-').reverse().join('/')}`
          : `Vendas de ${from.split('-').reverse().join('/')} a ${to.split('-').reverse().join('/')}`,
        subtitle: `${total > 0 ? `${bars.reduce((acc, b) => acc + b.vendas, 0)} venda(s) no período` : 'Sem movimentação no intervalo'}`,
        bars,
        totalReceita: total
      };
    }

    const monthly = monthlySeries(movements, to, Math.min(12, Math.max(2, Math.ceil(diffDays / 30))), birdsList);
    const bars: ChartBarData[] = monthly.map(m => {
      const label = m.key.slice(5) + '/' + m.key.slice(2, 4);
      return {
        key: m.key,
        label,
        receita: m.receita,
        vendas: m.vendas,
        isHighlight: m.key === today.slice(0, 7)
      };
    });
    return {
      title: `Vendas de ${from.split('-').reverse().join('/')} a ${to.split('-').reverse().join('/')}`,
      subtitle: 'Visão mensal do intervalo selecionado',
      bars,
      totalReceita: bars.reduce((acc, b) => acc + b.receita, 0)
    };
  }

  // 'tudo' (Todo o histórico)
  // Inteligência de Plantel: se o histórico é recente (<= 30 dias), exibe barras diárias
  // para que as vendas de ontem e hoje apareçam com total clareza e destaque!
  const allDates = countedSales.map(m => getCleanDay(m.data)).filter(Boolean).sort();
  const earliestDate = allDates[0] || today;
  const [ey, em, ed] = earliestDate.split('-').map(Number);
  const earliestDt = new Date(Date.UTC(ey, em - 1, ed));
  const todayDt = new Date(Date.UTC(ty, tm - 1, td));
  const spanDays = Math.max(1, Math.round((todayDt.getTime() - earliestDt.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  if (spanDays <= 30) {
    // Histórico recente: renderiza os últimos 10 dias diários onde o usuário vê Ontem e Hoje com clareza
    const daysToShow = Math.max(7, Math.min(14, spanDays + 2));
    const bars: ChartBarData[] = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const dt = new Date(Date.UTC(ty, tm - 1, td - i));
      const iso = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
      const daySales = countedSales.filter(m => getCleanDay(m.data) === iso);
      const isToday = iso === today;
      const isYesterday = iso === yesterdayIso;
      const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dt.getUTCDay()];
      const dayMonth = `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      bars.push({
        key: iso,
        label: isToday ? 'Hoje' : isYesterday ? 'Ontem' : dayName,
        sublabel: dayMonth,
        receita: daySales.reduce((acc, m) => acc + getCents(m), 0),
        vendas: daySales.length,
        isHighlight: isToday
      });
    }
    const totalAll = countedSales.reduce((acc, m) => acc + getCents(m), 0);
    return {
      title: 'Histórico Geral de Vendas (Diário Recente)',
      subtitle: `${countedSales.length} venda(s) registrada(s) • Ontem: ${formatBRL(yesterdayTotal)} • Hoje: ${formatBRL(todayTotal)}`,
      bars,
      totalReceita: totalAll
    };
  }

  const monthly = monthlySeries(movements, today, 6, birdsList);
  const bars: ChartBarData[] = monthly.map(m => {
    const label = m.key.slice(5) + '/' + m.key.slice(2, 4);
    return {
      key: m.key,
      label,
      receita: m.receita,
      vendas: m.vendas,
      isHighlight: m.key === today.slice(0, 7)
    };
  });
  const totalAll = countedSales.reduce((acc, m) => acc + getCents(m), 0);
  return {
    title: 'Histórico Geral de Vendas (Últimos Meses)',
    subtitle: `${countedSales.length} venda(s) no total • Ontem: ${formatBRL(yesterdayTotal)} • Hoje: ${formatBRL(todayTotal)}`,
    bars,
    totalReceita: totalAll
  };
}

export function pendingReceivables(ledger: readonly BirdMovement[]): BirdMovement[] {
  return ledger
    .filter(m => m.tipo === 'venda' && isCounted(m) && m.statusPagamento === 'pendente')
    .sort((a, b) => a.data.localeCompare(b.data));
}

export interface HistoryFilter {
  tipos?: readonly MovementType[];
  query?: string;
  range?: Range;
  includeReversed?: boolean;
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Linha do tempo (mais recente primeiro). Estornados aparecem (auditoria) quando pedido. */
export function filterHistory(ledger: readonly BirdMovement[], f: HistoryFilter = {}): BirdMovement[] {
  const q = f.query ? norm(f.query.trim()) : '';
  const out: BirdMovement[] = [];
  for (let i = 0; i < ledger.length; i++) {
    const m = ledger[i];
    if (m.flags?.duplicado) continue;
    if (!f.includeReversed && m.estornado) continue;
    if (f.tipos && f.tipos.length && !f.tipos.includes(m.tipo)) continue;
    if (f.range && !inRange(m.data, f.range)) continue;
    if (q) {
      const anilha = m.snapshot?.anilha ?? '';
      const nome = m.snapshot?.nome ?? '';
      const raca = m.snapshot?.raca ?? '';
      const compNome = m.comprador?.nome ?? '';
      const compContato = m.comprador?.contato ?? '';
      const obs = m.observacao ?? '';
      const hay = norm(`${anilha} ${nome} ${raca} ${compNome} ${compContato} ${obs}`);
      if (!hay.includes(q)) continue;
    }
    out.push(m);
  }
  return out.sort((a, b) => b.data.localeCompare(a.data) || b.createdAt - a.createdAt);
}

/** Intervalos prontos (datas locais YYYY-MM-DD). */
export type PeriodKey = 'hoje' | '7d' | '30d' | 'tudo' | 'custom' | 'mes' | 'ano';

export function rangeForPeriod(period: PeriodKey, today: string, customRange?: Range): Range {
  if (period === 'tudo') return {};
  if (period === 'hoje') return { from: today, to: today };
  if (period === 'custom') {
    if (!customRange || (!customRange.from && !customRange.to)) return {};
    const from = customRange.from || undefined;
    const to = customRange.to || customRange.from || undefined;
    return { from, to };
  }
  if (period === 'mes') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (period === 'ano') return { from: `${today.slice(0, 4)}-01-01`, to: today };
  const [y, m, d] = today.split('-').map(Number);
  if (period === '7d') {
    const from = new Date(Date.UTC(y, m - 1, d - 6));
    const iso = `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, '0')}-${String(from.getUTCDate()).padStart(2, '0')}`;
    return { from: iso, to: today };
  }
  // 30d
  const from = new Date(Date.UTC(y, m - 1, d - 29));
  const iso = `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, '0')}-${String(from.getUTCDate()).padStart(2, '0')}`;
  return { from: iso, to: today };
}

// ── CSV seguro ───────────────────────────────────────────────────────────────

/** Neutraliza injeção de fórmula (= + - @ TAB CR) e escapa aspas/separador/quebra de linha. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[";\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

const centsToCsv = (c: number) => (c / 100).toFixed(2).replace('.', ',');

export function movementsToCSV(movements: readonly BirdMovement[]): string {
  const header = ['Data', 'Tipo', 'Motivo', 'Anilha', 'Nome', 'Raça', 'Sexo', 'Valor (R$)', 'Pagamento', 'Situação do pagamento', 'Recebido em', 'Comprador', 'Contato', 'Observação', 'Estornado'];
  const rows = movements.map(m => [
    m.data.split('-').reverse().join('/'),
    TYPE_LABELS[m.tipo],
    REASON_LABELS[m.motivo] ?? m.motivo,
    m.snapshot?.anilha ?? '',
    m.snapshot?.nome ?? '',
    m.snapshot?.raca ?? '',
    m.snapshot?.sexo ?? '',
    centsToCsv(m.valorCentavos),
    m.pagamento ? PAYMENT_LABELS[m.pagamento] : '',
    m.statusPagamento === 'pendente' ? 'Pendente' : m.statusPagamento === 'pago' ? 'Pago' : '',
    m.dataRecebimento ? m.dataRecebimento.split('-').reverse().join('/') : '',
    m.comprador?.nome ?? '',
    m.comprador?.contato ?? '',
    m.observacao ?? '',
    m.estornado ? 'Sim' : 'Não',
  ].map(csvCell).join(';'));
  return [header.map(csvCell).join(';'), ...rows].join('\r\n');
}
