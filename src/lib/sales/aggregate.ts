/**
 * Agregações do livro-razão. Tudo em UMA passada, sem arrays intermediários — barato em celular fraco.
 */
import { isCounted } from './ledger';
import {
  REASON_LABELS,
  TYPE_LABELS,
  PAYMENT_LABELS,
  type BirdMovement,
  type MonthPoint,
  type MovementType,
  type Range,
  type SalesSummary,
} from './types';

const inRange = (data: string, range: Range) =>
  (!range.from || data >= range.from) && (!range.to || data <= range.to);

/** Custo de aquisição por ave (soma das entradas contadas). */
export function costByBird(ledger: readonly BirdMovement[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < ledger.length; i++) {
    const m = ledger[i];
    if (m.tipo !== 'entrada' || !isCounted(m)) continue;
    map.set(m.birdId, (map.get(m.birdId) || 0) + m.valorCentavos);
  }
  return map;
}

export function summarize(ledger: readonly BirdMovement[], range: Range = {}): SalesSummary {
  const cost = costByBird(ledger);
  const s: SalesSummary = {
    receita: 0, recebido: 0, aReceber: 0, custoVendidas: 0, lucro: 0,
    vendasCount: 0, vendasSemCusto: 0, ticketMedio: 0,
    perdasCount: 0, perdasValor: 0, saidasCount: 0, entradasCount: 0, entradasCusto: 0,
  };
  for (let i = 0; i < ledger.length; i++) {
    const m = ledger[i];
    if (!isCounted(m) || !inRange(m.data, range)) continue;
    switch (m.tipo) {
      case 'venda': {
        s.vendasCount++;
        s.receita += m.valorCentavos;
        if (m.statusPagamento === 'pendente') s.aReceber += m.valorCentavos;
        else s.recebido += m.valorCentavos;
        const c = cost.get(m.birdId);
        if (c === undefined || c === 0) s.vendasSemCusto++;
        s.custoVendidas += c || 0;
        break;
      }
      case 'perda': s.perdasCount++; s.perdasValor += m.valorCentavos; break;
      case 'saida': s.saidasCount++; break;
      case 'entrada': s.entradasCount++; s.entradasCusto += m.valorCentavos; break;
    }
  }
  s.lucro = s.receita - s.custoVendidas;
  s.ticketMedio = s.vendasCount > 0 ? Math.round(s.receita / s.vendasCount) : 0;
  return s;
}

/** Série mensal dos últimos `months` meses (inclui o mês de `today`), do mais antigo ao mais novo. */
export function monthlySeries(ledger: readonly BirdMovement[], today: string, months = 6): MonthPoint[] {
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
    const p = index.get(m.data.slice(0, 7));
    if (!p) continue;
    if (m.tipo === 'venda') { p.receita += m.valorCentavos; p.vendas++; }
    else if (m.tipo === 'perda') p.perdas++;
  }
  return points;
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
      const hay = norm(`${m.snapshot.anilha} ${m.snapshot.nome} ${m.snapshot.raca} ${m.comprador?.nome ?? ''} ${m.comprador?.contato ?? ''} ${m.observacao ?? ''}`);
      if (!hay.includes(q)) continue;
    }
    out.push(m);
  }
  return out.sort((a, b) => b.data.localeCompare(a.data) || b.createdAt - a.createdAt);
}

/** Intervalos prontos (datas locais YYYY-MM-DD). */
export type PeriodKey = 'mes' | '30d' | 'ano' | 'tudo';
export function rangeForPeriod(period: PeriodKey, today: string): Range {
  if (period === 'tudo') return {};
  if (period === 'mes') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (period === 'ano') return { from: `${today.slice(0, 4)}-01-01`, to: today };
  const [y, m, d] = today.split('-').map(Number);
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
    m.snapshot.anilha,
    m.snapshot.nome,
    m.snapshot.raca,
    m.snapshot.sexo,
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
