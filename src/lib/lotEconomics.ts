/**
 * lotEconomics.ts — Calculadora de custo e lucro por lote.
 *
 * Princípios de desempenho (celular fraco + centenas de lotes):
 *  - Funções puras, sem dependência de React: testáveis e reaproveitáveis em Workers.
 *  - Uma única passada O(n) por coleção, sem arrays intermediários (sem filter/map encadeados).
 *  - Memoização por referência via WeakMap: como o estado é imutável, um lote que não mudou
 *    devolve o resultado em O(1); lotes descartados são coletados automaticamente pelo GC.
 *  - Datas comparadas como strings ISO (YYYY-MM-DD), evitando criar objetos Date em laços.
 */
import type { EggLot, MeatLot, ExtraCostCategory } from './AppContext';

export type EconomicsPeriod = 'tudo' | '30d' | 'mes';

export type CostBreakdownItem = { label: string; valor: number };

export type MeatLotEconomics = {
  // Custos
  custoRacao: number;
  custoExtras: number;
  custoTotal: number;
  breakdown: CostBreakdownItem[];
  kgRacao: number;
  custoMedioDia: number;
  diasLote: number;
  // Plantel
  avesAtuais: number;
  avesIniciais: number;
  mortes: number;
  avesVendidasOuAbatidas: number;
  mortalidadePct: number;
  // Produção
  pesoAtualG: number | null;
  pesoInicialG: number | null;
  biomassaAtualKg: number;
  kgVendidos: number;
  conversaoAlimentar: number | null;
  // Receitas e resultado
  receitaRealizada: number;
  receitaProjetada: number;
  precoVendaKg: number | null;
  lucroRealizado: number;
  lucroProjetado: number | null;
  margemProjetadaPct: number | null;
  custoPorAve: number | null;
  custoPorKg: number | null;
  pontoEquilibrioKg: number | null;
  temDados: boolean;
};

export type EggLotEconomics = {
  custoRacao: number;
  custoExtras: number;
  custoTotal: number;
  custoEstimado: boolean;
  breakdown: CostBreakdownItem[];
  kgRacao: number;
  ovosColetados: number;
  ovosVendidos: number;
  ovosPerdidos: number;
  receita: number;
  precoMedioDuzia: number | null;
  lucro: number;
  margemPct: number | null;
  custoPorOvo: number | null;
  custoPorDuzia: number | null;
  perdaPct: number;
  dias: number;
  temDados: boolean;
};

// ── Utilitários ─────────────────────────────────────────────────────────────

const toNum = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Data ISO local (YYYY-MM-DD) — evita o deslocamento de fuso de toISOString(). */
export function localISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Data de corte (inclusiva) para o período informado. `null` = sem corte. */
export function periodCutoff(period: EconomicsPeriod, today: Date = new Date()): string | null {
  if (period === 'tudo') return null;
  if (period === 'mes') return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
  return localISO(d);
}

function daysBetween(startISO: string | undefined, endISO: string): number {
  if (!startISO) return 0;
  const s = Date.parse(`${startISO.slice(0, 10)}T12:00:00`);
  const e = Date.parse(`${endISO}T12:00:00`);
  if (!Number.isFinite(s) || !Number.isFinite(e)) return 0;
  return Math.max(1, Math.round((e - s) / 86_400_000) + 1);
}

/**
 * Converte textos livres de peso em gramas.
 * "45g" → 45 | "1,2 kg" → 1200 | "2.4" → 2400 (sem unidade e < 20 = kg) | "850" → 850
 */
export function parseWeightToGrams(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw > 0 ? (raw < 20 ? raw * 1000 : raw) : null;
  const s = String(raw).toLowerCase().replace(/\[\[.*$/s, '').trim();
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return null;
  if (/kg/.test(s)) return n * 1000;
  if (/\d\s*g\b|gramas?/.test(s)) return n;
  return n < 20 ? n * 1000 : n;
}

/**
 * Converte o que o usuário digitou em número, aceitando padrão brasileiro.
 * "1.234,56" → 1234.56 | "12,5" → 12.5 | "12.5" → 12.5 | "R$ 30" → 30
 */
export function parseBRNumber(raw: string): number {
  const s = (raw || '').replace(/[^\d.,-]/g, '');
  if (!s) return NaN;
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return Number(normalized);
}

const MORTE_RE = /mort|óbito|obito/i;
const SAIDA_PRODUTIVA_RE = /venda|abate/i;

function sortBreakdown(map: Map<string, number>): CostBreakdownItem[] {
  const out: CostBreakdownItem[] = [];
  map.forEach((valor, label) => { if (valor > 0) out.push({ label, valor }); });
  out.sort((a, b) => b.valor - a.valor);
  return out;
}

// ── Memoização por referência ────────────────────────────────────────────────

type Cache<T> = WeakMap<object, Map<string, T>>;
const meatCache: Cache<MeatLotEconomics> = new WeakMap();
const eggCache: Cache<EggLotEconomics> = new WeakMap();

function memo<T>(cache: Cache<T>, obj: object, key: string, compute: () => T): T {
  let byKey = cache.get(obj);
  if (!byKey) { byKey = new Map(); cache.set(obj, byKey); }
  const hit = byKey.get(key);
  if (hit) return hit;
  const value = compute();
  byKey.set(key, value);
  return value;
}

// ── Lote de corte (engorda / pintinhos) ───────────────────────────────────────

export function computeMeatLotEconomics(lot: MeatLot, todayISO: string = localISO()): MeatLotEconomics {
  return memo(meatCache, lot, todayISO, () => computeMeat(lot, todayISO));
}

function computeMeat(lot: MeatLot, today: string): MeatLotEconomics {
  const breakdown = new Map<string, number>();

  // Ração
  let custoRacao = 0;
  let kgRacao = 0;
  const feed = lot.feedEntries || [];
  for (let i = 0; i < feed.length; i++) {
    const f = feed[i];
    const total = toNum(f.totalCusto) || toNum(f.kgRacao) * toNum(f.custoKg);
    custoRacao += total;
    kgRacao += toNum(f.kgRacao);
  }
  if (custoRacao > 0) breakdown.set('Ração', custoRacao);

  // Custos extras
  let custoExtras = 0;
  const extras = lot.custosExtras || [];
  for (let i = 0; i < extras.length; i++) {
    const c = extras[i];
    const v = toNum(c.valor);
    custoExtras += v;
    const k: ExtraCostCategory | string = c.categoria || 'Outro';
    breakdown.set(k, (breakdown.get(k) || 0) + v);
  }

  // Plantel (qtdAves já reflete as movimentações → reconstruímos o inicial)
  const avesAtuais = lot.qtdAves !== undefined && lot.qtdAves !== null
    ? Math.max(0, toNum(lot.qtdAves))
    : (lot.avesIds?.length || 0);
  let mortes = 0;
  let saidasProdutivas = 0;
  let saidasTotal = 0;
  let entradas = 0;
  const movs = lot.movimentacoes || [];
  for (let i = 0; i < movs.length; i++) {
    const m = movs[i];
    const q = Math.max(0, toNum(m.quantidade));
    if (m.tipo === 'saida') {
      saidasTotal += q;
      if (MORTE_RE.test(m.motivo || '')) mortes += q;
      else if (SAIDA_PRODUTIVA_RE.test(m.motivo || '')) saidasProdutivas += q;
    } else if (m.tipo === 'entrada') {
      entradas += q;
    }
  }
  const avesIniciais = Math.max(avesAtuais, avesAtuais + saidasTotal - entradas);
  const baseMortalidade = avesIniciais + entradas;
  const mortalidadePct = baseMortalidade > 0 ? (mortes / baseMortalidade) * 100 : 0;

  // Peso: pesagem mais recente (por data) ou peso inicial informado
  const pesagens = lot.pesagens || [];
  let ultimaData = '';
  let pesoAtualG: number | null = null;
  for (let i = 0; i < pesagens.length; i++) {
    const p = pesagens[i];
    const g = toNum(p.pesoMedioG);
    if (g > 0 && (p.data || '') >= ultimaData) { ultimaData = p.data || ''; pesoAtualG = g; }
  }
  const pesoInicialG = parseWeightToGrams(lot.pesoMedioInicial);
  if (pesoAtualG === null) pesoAtualG = pesoInicialG;
  const biomassaAtualKg = pesoAtualG ? (avesAtuais * pesoAtualG) / 1000 : 0;

  // Vendas
  let receitaRealizada = 0;
  let kgVendidos = 0;
  const vendas = lot.vendas || [];
  for (let i = 0; i < vendas.length; i++) {
    receitaRealizada += toNum(vendas[i].valorTotal);
    kgVendidos += toNum(vendas[i].kgTotal);
  }

  const custoTotal = custoRacao + custoExtras;
  const diasLote = daysBetween(lot.dataInicio, today);
  const precoVendaKg = toNum(lot.precoVendaKg) > 0 ? toNum(lot.precoVendaKg) : null;
  const ativo = lot.status !== 'Abatido';
  const receitaProjetada = ativo && precoVendaKg ? biomassaAtualKg * precoVendaKg : 0;

  // Conversão alimentar = kg de ração / kg de peso ganho (só exibimos quando faz sentido)
  let conversaoAlimentar: number | null = null;
  if (kgRacao > 0 && pesoAtualG && pesoInicialG !== null && pesoAtualG > pesoInicialG) {
    const ganhoKg = ((pesoAtualG - pesoInicialG) / 1000) * avesAtuais + kgVendidos;
    const ca = ganhoKg > 0 ? kgRacao / ganhoKg : 0;
    if (ca >= 0.8 && ca <= 12) conversaoAlimentar = ca;
  }

  const kgProduzidos = biomassaAtualKg + kgVendidos;
  const lucroRealizado = receitaRealizada - custoTotal;
  const lucroProjetado = precoVendaKg || receitaRealizada > 0 ? receitaRealizada + receitaProjetada - custoTotal : null;
  const receitaTotal = receitaRealizada + receitaProjetada;
  const custoRestante = custoTotal - receitaRealizada;

  return {
    custoRacao,
    custoExtras,
    custoTotal,
    breakdown: sortBreakdown(breakdown),
    kgRacao,
    custoMedioDia: diasLote > 0 ? custoTotal / diasLote : 0,
    diasLote,
    avesAtuais,
    avesIniciais,
    mortes,
    avesVendidasOuAbatidas: saidasProdutivas,
    mortalidadePct,
    pesoAtualG,
    pesoInicialG,
    biomassaAtualKg,
    kgVendidos,
    conversaoAlimentar,
    receitaRealizada,
    receitaProjetada,
    precoVendaKg,
    lucroRealizado,
    lucroProjetado,
    margemProjetadaPct: lucroProjetado !== null && receitaTotal > 0 ? (lucroProjetado / receitaTotal) * 100 : null,
    custoPorAve: avesAtuais + saidasProdutivas > 0 && custoTotal > 0 ? custoTotal / (avesAtuais + saidasProdutivas) : null,
    custoPorKg: kgProduzidos > 0 && custoTotal > 0 ? custoTotal / kgProduzidos : null,
    pontoEquilibrioKg: biomassaAtualKg > 0 && custoRestante > 0 ? custoRestante / biomassaAtualKg : (custoRestante <= 0 && custoTotal > 0 ? 0 : null),
    temDados: custoTotal > 0 || receitaRealizada > 0,
  };
}

// ── Lote de postura ──────────────────────────────────────────────────────────

export function computeEggLotEconomics(
  lot: EggLot,
  period: EconomicsPeriod = 'tudo',
  todayISO: string = localISO()
): EggLotEconomics {
  return memo(eggCache, lot, `${period}|${todayISO}`, () => computeEgg(lot, period, todayISO));
}

function computeEgg(lot: EggLot, period: EconomicsPeriod, today: string): EggLotEconomics {
  const cutoff = periodCutoff(period, new Date(`${today}T12:00:00`));
  const inPeriod = (d: string | undefined) => !cutoff || (d || '') >= cutoff;
  const breakdown = new Map<string, number>();

  let custoRacao = 0;
  let kgRacao = 0;
  const feed = lot.feedEntries || [];
  for (let i = 0; i < feed.length; i++) {
    const f = feed[i];
    if (!inPeriod(f.data)) continue;
    custoRacao += toNum(f.totalCusto) || toNum(f.kgRacao) * toNum(f.custoKg);
    kgRacao += toNum(f.kgRacao);
  }
  if (custoRacao > 0) breakdown.set('Ração', custoRacao);

  let custoExtras = 0;
  const extras = lot.custosExtras || [];
  for (let i = 0; i < extras.length; i++) {
    const c = extras[i];
    if (!inPeriod(c.data)) continue;
    const v = toNum(c.valor);
    custoExtras += v;
    const k = c.categoria || 'Outro';
    breakdown.set(k, (breakdown.get(k) || 0) + v);
  }

  let ovosColetados = 0;
  let ovosVendidos = 0;
  let ovosPerdidos = 0;
  let receita = 0;
  let custoManual = 0;
  let primeiraData = '';
  const regs = lot.registros || [];
  for (let i = 0; i < regs.length; i++) {
    const r = regs[i];
    if (!inPeriod(r.data)) continue;
    const col = toNum(r.coletados);
    const vend = toNum(r.vendidos);
    ovosColetados += col;
    ovosVendidos += vend;
    ovosPerdidos += toNum(r.perdidos);
    receita += (vend * toNum(r.precoVenda)) / 12;
    custoManual += col * toNum(r.custoProd);
    if (col > 0 && (!primeiraData || r.data < primeiraData)) primeiraData = r.data;
  }

  // Sem ração/custos lançados, usamos o custo por ovo informado nos registros como estimativa
  let custoTotal = custoRacao + custoExtras;
  let custoEstimado = false;
  if (custoTotal === 0 && custoManual > 0) {
    custoTotal = custoManual;
    custoEstimado = true;
    breakdown.set('Custo por ovo (estimado)', custoManual);
  }

  const lucro = receita - custoTotal;
  const startForDays = cutoff && (!lot.dataInicio || cutoff > lot.dataInicio) ? cutoff : (lot.dataInicio || primeiraData);

  return {
    custoRacao,
    custoExtras,
    custoTotal,
    custoEstimado,
    breakdown: sortBreakdown(breakdown),
    kgRacao,
    ovosColetados,
    ovosVendidos,
    ovosPerdidos,
    receita,
    precoMedioDuzia: ovosVendidos > 0 ? (receita / ovosVendidos) * 12 : null,
    lucro,
    margemPct: receita > 0 ? (lucro / receita) * 100 : null,
    custoPorOvo: ovosColetados > 0 && custoTotal > 0 ? custoTotal / ovosColetados : null,
    custoPorDuzia: ovosColetados > 0 && custoTotal > 0 ? (custoTotal / ovosColetados) * 12 : null,
    perdaPct: ovosColetados > 0 ? (ovosPerdidos / ovosColetados) * 100 : 0,
    dias: daysBetween(startForDays, today),
    temDados: custoTotal > 0 || receita > 0,
  };
}

// ── Formatação (Intl reaproveitado: criar formatadores é caro em celular fraco) ──

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dec1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const dec2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtBRL = (v: number) => brl.format(Number.isFinite(v) ? v : 0);
export const fmtDec1 = (v: number) => dec1.format(Number.isFinite(v) ? v : 0);
export const fmtDec2 = (v: number) => dec2.format(Number.isFinite(v) ? v : 0);
