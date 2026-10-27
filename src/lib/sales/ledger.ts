/**
 * Livro-razão de movimentações de aves — regras de negócio PURAS (sem React, sem I/O).
 *
 * Toda função recebe o estado atual e devolve um NOVO estado (imutável). Isso permite:
 *  - testar exaustivamente (vitest) sem navegador;
 *  - aplicar a mesma lógica no store local e na reconciliação pós-sync;
 *  - garantir atomicidade: o chamador grava ledger + status da ave juntos, ou nada.
 */
import {
  MAX_CENTS,
} from './money';
import { parseMoneyToCents, getMovementCents } from './money';
import { normalizeDateToISO } from '../dates';
import {
  MOVEMENT_REASONS,
  PAYMENT_METHODS,
  TERMINAL_TYPES,
  type BirdLike,
  type BirdMovement,
  type BirdStatusPatch,
  type LedgerContext,
  type MovementType,
  type NewMovementInput,
  type ReconcileReport,
  type Result,
} from './types';

// ── Status das aves ──────────────────────────────────────────────────────────

/** Status que tiram a ave do plantel ativo. Fonte única — não duplicar listas pelo app. */
export const INACTIVE_STATUSES = ['vendido', 'faleceu', 'abatido', 'morto', 'baixado'] as const;

export function isBirdActive(status: string | undefined | null): boolean {
  return !INACTIVE_STATUSES.includes(String(status ?? '').trim().toLowerCase() as typeof INACTIVE_STATUSES[number]);
}

/** Status que a ave assume depois de um movimento terminal. */
export function statusForMovement(tipo: MovementType, motivo: string): string | null {
  if (tipo === 'venda') return 'Vendido';
  if (tipo === 'perda') return 'Faleceu';
  if (tipo === 'saida') return motivo === 'abate' ? 'Abatido' : 'Baixado';
  return null;
}

// ── Sanitização e validação ──────────────────────────────────────────────────

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeText(value: unknown, max: number): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Mantém só dígitos e "+"; limita o tamanho. */
export function normalizePhone(value: unknown): string {
  return sanitizeText(value, 40).replace(/[^\d+]/g, '').slice(0, 20);
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

// ── Predicados ───────────────────────────────────────────────────────────────

/** Conta nos totais: não estornado, sem conflito e sem duplicidade. */
export function isCounted(m: BirdMovement): boolean {
  return !m.estornado && !m.flags?.conflito && !m.flags?.duplicado;
}

export function isActiveTerminal(m: BirdMovement): boolean {
  return TERMINAL_TYPES.includes(m.tipo) && isCounted(m);
}

export function findActiveTerminal(ledger: readonly BirdMovement[], birdId: string): BirdMovement | undefined {
  for (let i = 0; i < ledger.length; i++) {
    const m = ledger[i];
    if (m.birdId === birdId && isActiveTerminal(m)) return m;
  }
  return undefined;
}

// ── Registro ─────────────────────────────────────────────────────────────────

const fail = <T>(code: Extract<Result<T>, { ok: false }>['code'], error: string): Result<T> => ({ ok: false, code, error });

export interface RegisterOutcome {
  movement: BirdMovement;
  ledger: BirdMovement[];
  birdPatch: BirdStatusPatch | null;
}

export function registerMovement(
  ledger: readonly BirdMovement[],
  birds: ReadonlyMap<string, BirdLike>,
  input: NewMovementInput,
  ctx: LedgerContext
): Result<RegisterOutcome> {
  // Idempotência: mesmo ID já gravado = reenvio. Devolve o existente sem alterar nada.
  const existing = ledger.find(m => m.id === input.id);
  if (existing) {
    return { ok: true, replay: true, value: { movement: existing, ledger: [...ledger], birdPatch: null } };
  }

  if (!input.id || typeof input.id !== 'string' || input.id.length > 80) {
    return fail('INVALID_INPUT', 'Identificador da movimentação inválido.');
  }
  const bird = birds.get(input.birdId);
  if (!bird) return fail('BIRD_NOT_FOUND', 'Ave não encontrada no plantel.');

  if (!(input.tipo in MOVEMENT_REASONS)) return fail('INVALID_INPUT', 'Tipo de movimentação inválido.');
  if (!MOVEMENT_REASONS[input.tipo].includes(input.motivo)) {
    return fail('INVALID_INPUT', 'Motivo inválido para este tipo de movimentação.');
  }

  if (!Number.isSafeInteger(input.valorCentavos) || input.valorCentavos < 0) {
    return fail('INVALID_VALUE', 'Informe um valor válido (zero ou maior).');
  }
  if (input.valorCentavos > MAX_CENTS) {
    return fail('INVALID_VALUE', 'Valor acima do limite permitido (R$ 10.000.000,00).');
  }
  if (input.tipo === 'venda' && input.valorCentavos === 0 && input.pagamento !== 'troca') {
    return fail('INVALID_VALUE', 'O valor da venda deve ser maior que zero.');
  }

  if (!isValidISODate(input.data) || input.data < '2000-01-01') {
    return fail('INVALID_DATE', 'Data inválida.');
  }
  if (input.data > addDaysISO(ctx.today, 1)) {
    return fail('INVALID_DATE', 'A data não pode estar no futuro.');
  }
  if (input.dataRecebimento && !isValidISODate(input.dataRecebimento)) {
    return fail('INVALID_DATE', 'Data de recebimento inválida.');
  }
  if (input.pagamento && !PAYMENT_METHODS.includes(input.pagamento)) {
    return fail('INVALID_INPUT', 'Forma de pagamento inválida.');
  }

  if (TERMINAL_TYPES.includes(input.tipo)) {
    const open = findActiveTerminal(ledger, input.birdId);
    if (open) {
      return fail('ALREADY_CLOSED', `Esta ave já tem ${open.tipo === 'venda' ? 'uma venda' : 'uma baixa'} registrada. Estorne antes de registrar outra.`);
    }
    if (!isBirdActive(bird.status)) {
      return fail('ALREADY_CLOSED', 'Esta ave já está fora do plantel ativo.');
    }
  } else {
    const hasEntry = ledger.some(m => m.birdId === input.birdId && m.tipo === 'entrada' && isCounted(m));
    if (hasEntry) return fail('DUPLICATE_ENTRY', 'Esta ave já tem uma entrada registrada.');
  }

  const isSale = input.tipo === 'venda';
  const statusPagamento = isSale ? (input.statusPagamento === 'pendente' ? 'pendente' : 'pago') : undefined;
  const nome = sanitizeText(input.comprador?.nome, 80);
  const contato = normalizePhone(input.comprador?.contato);

  const movement: BirdMovement = {
    id: input.id,
    birdId: input.birdId,
    tipo: input.tipo,
    motivo: input.motivo,
    data: input.data,
    valorCentavos: input.valorCentavos,
    comprador: nome || contato ? { ...(nome ? { nome } : {}), ...(contato ? { contato } : {}) } : undefined,
    pagamento: isSale ? (input.pagamento ?? 'pix') : undefined,
    statusPagamento,
    dataRecebimento: isSale && statusPagamento === 'pago' ? (input.dataRecebimento || input.data) : undefined,
    observacao: sanitizeText(input.observacao, 500) || undefined,
    snapshot: {
      anilha: sanitizeText(bird.anilha, 40),
      nome: sanitizeText(bird.nome, 80),
      raca: sanitizeText(bird.raca, 80),
      sexo: sanitizeText(bird.sexo, 20),
    },
    statusAnterior: TERMINAL_TYPES.includes(input.tipo) ? bird.status : undefined,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    deviceId: ctx.deviceId,
  };

  const newStatus = statusForMovement(input.tipo, input.motivo);
  return {
    ok: true,
    value: {
      movement,
      ledger: [...ledger, movement],
      birdPatch: newStatus ? { birdId: input.birdId, status: newStatus } : null,
    },
  };
}

// ── Estorno ──────────────────────────────────────────────────────────────────

export function reverseMovement(
  ledger: readonly BirdMovement[],
  input: { movementId: string; motivo?: string },
  ctx: LedgerContext
): Result<RegisterOutcome> {
  const target = ledger.find(m => m.id === input.movementId);
  if (!target) return fail('NOT_FOUND', 'Movimentação não encontrada.');

  if (target.estornado) {
    return { ok: true, replay: true, value: { movement: target, ledger: [...ledger], birdPatch: null } };
  }
  if (target.tipo === 'entrada' && findActiveTerminal(ledger, target.birdId)) {
    return fail('HAS_ACTIVE_EXIT', 'Estorne primeiro a venda/baixa desta ave para poder estornar a entrada.');
  }

  const updated: BirdMovement = {
    ...target,
    estornado: true,
    estornadoEm: ctx.today,
    estornoMotivo: sanitizeText(input.motivo, 200) || undefined,
    updatedAt: ctx.now,
  };
  const next = ledger.map(m => (m.id === target.id ? updated : m));
  const restore = TERMINAL_TYPES.includes(target.tipo)
    ? { birdId: target.birdId, status: target.statusAnterior && isBirdActive(target.statusAnterior) ? target.statusAnterior : 'Adulto' }
    : null;
  return { ok: true, value: { movement: updated, ledger: next, birdPatch: restore } };
}

// ── Recebimento de venda pendente ────────────────────────────────────────────

export function markReceived(
  ledger: readonly BirdMovement[],
  input: { movementId: string; data: string },
  ctx: LedgerContext
): Result<RegisterOutcome> {
  const target = ledger.find(m => m.id === input.movementId);
  if (!target) return fail('NOT_FOUND', 'Venda não encontrada.');
  if (target.tipo !== 'venda' || target.estornado) return fail('NOT_PENDING', 'Esta venda não está pendente.');
  if (target.statusPagamento === 'pago') {
    return { ok: true, replay: true, value: { movement: target, ledger: [...ledger], birdPatch: null } };
  }
  if (!isValidISODate(input.data) || input.data > addDaysISO(ctx.today, 1)) {
    return fail('INVALID_DATE', 'Data de recebimento inválida.');
  }
  const updated: BirdMovement = { ...target, statusPagamento: 'pago', dataRecebimento: input.data, updatedAt: ctx.now };
  return {
    ok: true,
    value: { movement: updated, ledger: ledger.map(m => (m.id === target.id ? updated : m)), birdPatch: null },
  };
}

// ── Reconciliação ────────────────────────────────────────────────────────────

const legacyKey = (birdId: string, tipo: MovementType) => `legacy-${birdId}-${tipo}`;

function legacyTerminalFor(bird: BirdLike, ctx: LedgerContext): Omit<BirdMovement, 'id'> | null {
  const s = String(bird.status).trim().toLowerCase();
  const rawDate = [bird.dataVenda, bird.dataBaixa].find(d => Boolean(d));
  const normDate = rawDate ? normalizeDateToISO(rawDate) : '';
  const data = (normDate && isValidISODate(normDate)) ? normDate : ctx.today;
  const base = {
    birdId: bird.id,
    data,
    snapshot: { anilha: bird.anilha, nome: bird.nome || '', raca: bird.raca || '', sexo: bird.sexo || '' },
    flags: { legado: true },
    createdAt: ctx.now,
    updatedAt: ctx.now,
    deviceId: ctx.deviceId,
  };
  if (s === 'vendido') {
    const rawVal = bird.valorVenda ?? bird.valorEstimado ?? bird.vitrinePrice;
    const cents = parseMoneyToCents(rawVal) ?? 0;
    const nome = sanitizeText(bird.compradorNome, 80);
    const contato = normalizePhone(bird.compradorContato);
    return {
      ...base,
      tipo: 'venda',
      motivo: 'venda',
      valorCentavos: Math.min(cents, MAX_CENTS),
      comprador: nome || contato ? { ...(nome ? { nome } : {}), ...(contato ? { contato } : {}) } : undefined,
      pagamento: 'outro',
      statusPagamento: 'pago',
      dataRecebimento: data,
    };
  }
  if (s === 'faleceu' || s === 'morto') {
    return { ...base, tipo: 'perda', motivo: 'morte', valorCentavos: 0, observacao: sanitizeText(bird.motivoBaixa, 500) || undefined };
  }
  if (s === 'abatido') return { ...base, tipo: 'saida', motivo: 'abate', valorCentavos: 0 };
  if (s === 'baixado') return { ...base, tipo: 'saida', motivo: 'outro', valorCentavos: 0 };
  return null;
}

/**
 * Deixa ave e livro-razão coerentes. Idempotente: rodar N vezes dá o mesmo resultado.
 * IMPORTANTE: rodar só depois do pull inicial da nuvem, para não gerar legado em cima de dado real.
 */
export function reconcileLedger(
  ledger: readonly BirdMovement[],
  birds: readonly BirdLike[],
  ctx: LedgerContext,
  options: { createLegacyEntries?: boolean } = {}
): { ledger: BirdMovement[]; patches: BirdStatusPatch[]; report: ReconcileReport; changed: boolean } {
  const report: ReconcileReport = { legacyCreated: 0, duplicatesFlagged: 0, statusFixed: 0 };
  let next: BirdMovement[] = ledger.map(m => m);
  const ids = new Set(next.map(m => m.id));
  const birdById = new Map(birds.map(b => [b.id, b]));

  // 1) Terminais duplicados: mantém o "melhor" (real > legado, depois o mais antigo).
  const byBird = new Map<string, BirdMovement[]>();
  for (const m of next) {
    if (!isActiveTerminal(m)) continue;
    const arr = byBird.get(m.birdId);
    if (arr) arr.push(m); else byBird.set(m.birdId, [m]);
  }
  const flagged = new Set<string>();
  for (const arr of byBird.values()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => {
      // 1. Quem tem valor financeiro > 0 sempre tem prioridade (não descartar faturamento real)
      const valA = getMovementCents(a) > 0 ? 1 : 0;
      const valB = getMovementCents(b) > 0 ? 1 : 0;
      if (valA !== valB) return valB - valA;

      // 2. Dado real tem prioridade sobre legado
      const la = a.flags?.legado ? 1 : 0;
      const lb = b.flags?.legado ? 1 : 0;
      if (la !== lb) return la - lb;

      // 3. Mais recente por criação tem prioridade
      return b.createdAt - a.createdAt || a.id.localeCompare(b.id);
    });
    for (let i = 1; i < arr.length; i++) flagged.add(arr[i].id);
  }
  if (flagged.size) {
    next = next.map(m => (flagged.has(m.id) ? { ...m, flags: { ...m.flags, duplicado: true }, updatedAt: ctx.now } : m));
    report.duplicatesFlagged = flagged.size;
  }

  // 2) Legado: ave fechada sem movimento terminal contado → cria (id determinístico).
  const activeTerminalBirds = new Set(next.filter(isActiveTerminal).map(m => m.birdId));
  for (const bird of birds) {
    if (isBirdActive(bird.status) || activeTerminalBirds.has(bird.id)) continue;
    const draft = legacyTerminalFor(bird, ctx);
    if (!draft) continue;
    const id = legacyKey(bird.id, draft.tipo);
    if (ids.has(id)) continue;
    next.push({ ...draft, id });
    ids.add(id);
    activeTerminalBirds.add(bird.id);
    report.legacyCreated++;
  }

  // 2b) Legado de entrada: cada ave sem entrada ganha uma, para o histórico ser completo.
  if (options.createLegacyEntries) {
    const hasEntry = new Set(next.filter(m => m.tipo === 'entrada').map(m => m.birdId));
    for (const bird of birds) {
      if (hasEntry.has(bird.id)) continue;
      const id = legacyKey(bird.id, 'entrada');
      if (ids.has(id)) continue;
      const data = [bird.dataCadastro].find(d => d && isValidISODate(d)) || ctx.today;
      next.push({
        id,
        birdId: bird.id,
        tipo: 'entrada',
        motivo: 'cadastro_inicial',
        data,
        valorCentavos: 0,
        snapshot: { anilha: bird.anilha, nome: bird.nome || '', raca: bird.raca || '', sexo: bird.sexo || '' },
        flags: { legado: true },
        createdAt: ctx.now,
        updatedAt: ctx.now,
        deviceId: ctx.deviceId,
      });
      ids.add(id);
      report.legacyCreated++;
    }
  }

  // 3) Movimento terminal contado, mas ave ainda ativa → corrige o status da ave.
  const patches: BirdStatusPatch[] = [];
  for (const m of next) {
    if (!isActiveTerminal(m)) continue;
    const bird = birdById.get(m.birdId);
    if (!bird || !isBirdActive(bird.status)) continue;
    const status = statusForMovement(m.tipo, m.motivo);
    if (status) { patches.push({ birdId: bird.id, status }); report.statusFixed++; }
  }

  const changed = report.legacyCreated > 0 || report.duplicatesFlagged > 0;
  return { ledger: next, patches, report, changed };
}

// ── Merge com a nuvem ────────────────────────────────────────────────────────

/**
 * Une ledger local e remoto por ID. Em caso de mesmo ID vence o mais recente (`updatedAt`);
 * como o ledger é append-only, a única edição legítima é estorno/recebimento (sempre mais novo).
 */
export function mergeLedgers(local: readonly BirdMovement[], remote: readonly BirdMovement[]): BirdMovement[] {
  const map = new Map<string, BirdMovement>();
  for (const m of local) map.set(m.id, m);
  for (const r of remote) {
    const cur = map.get(r.id);
    if (!cur || r.updatedAt > cur.updatedAt) map.set(r.id, r);
  }
  return Array.from(map.values());
}
