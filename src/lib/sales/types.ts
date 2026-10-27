/**
 * Tipos do livro-razão de movimentações de aves (entradas, vendas, perdas, saídas).
 *
 * O livro-razão é APPEND-ONLY: valores nunca são editados nem apagados. Correções são feitas
 * por estorno, preservando a trilha de auditoria.
 */

export type MovementType = 'entrada' | 'venda' | 'perda' | 'saida';

/** Movimentos que "fecham" a ave (ela sai do plantel ativo). Só pode existir um ativo por ave. */
export const TERMINAL_TYPES: readonly MovementType[] = ['venda', 'perda', 'saida'];

export const MOVEMENT_REASONS: Record<MovementType, readonly string[]> = {
  entrada: ['nascimento', 'compra', 'troca', 'doacao_recebida', 'cadastro_inicial'],
  venda: ['venda'],
  perda: ['morte', 'doenca', 'predador', 'fuga', 'furto', 'acidente', 'outro'],
  saida: ['doacao', 'troca', 'abate', 'outro'],
};

export const REASON_LABELS: Record<string, string> = {
  nascimento: 'Nascimento no criatório',
  compra: 'Compra',
  troca: 'Troca',
  doacao_recebida: 'Doação recebida',
  cadastro_inicial: 'Cadastro inicial',
  venda: 'Venda',
  morte: 'Morte',
  doenca: 'Doença',
  predador: 'Predador',
  fuga: 'Fuga',
  furto: 'Furto',
  acidente: 'Acidente',
  doacao: 'Doação',
  abate: 'Abate',
  outro: 'Outro',
};

export const TYPE_LABELS: Record<MovementType, string> = {
  entrada: 'Entrada',
  venda: 'Venda',
  perda: 'Perda',
  saida: 'Saída',
};

export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao' | 'transferencia' | 'troca' | 'outro';
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['pix', 'dinheiro', 'cartao', 'transferencia', 'troca', 'outro'];
export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: 'Pix',
  dinheiro: 'Dinheiro',
  cartao: 'Cartão',
  transferencia: 'Transferência',
  troca: 'Troca',
  outro: 'Outro',
};

export type PaymentStatus = 'pago' | 'pendente';

export interface BirdSnapshot {
  anilha: string;
  nome: string;
  raca: string;
  sexo: string;
}

export interface BirdMovement {
  /** Chave de idempotência: gerada ao abrir a folha de registro e reaproveitada em qualquer reenvio. */
  id: string;
  birdId: string;
  tipo: MovementType;
  motivo: string;
  /** YYYY-MM-DD no fuso local. */
  data: string;
  /** Centavos inteiros. venda = receita; entrada = custo de aquisição; perda = prejuízo estimado. */
  valorCentavos: number;
  comprador?: { nome?: string; contato?: string };
  pagamento?: PaymentMethod;
  statusPagamento?: PaymentStatus;
  dataRecebimento?: string;
  observacao?: string;
  snapshot: BirdSnapshot;
  /** Status da ave antes do movimento (usado para restaurar no estorno). */
  statusAnterior?: string;
  estornado?: boolean;
  estornadoEm?: string;
  estornoMotivo?: string;
  flags?: { conflito?: boolean; duplicado?: boolean; legado?: boolean };
  createdAt: number;
  updatedAt: number;
  deviceId: string;
}

/** Subconjunto de `Bird` que o domínio precisa (mantém este módulo puro e testável). */
export interface BirdLike {
  id: string;
  anilha: string;
  nome?: string;
  raca?: string;
  sexo?: string;
  baia?: string | null;
  status: string;
  dataCadastro?: string;
  valorVenda?: number | string;
  valorEstimado?: number | string;
  vitrinePrice?: string;
  dataVenda?: string;
  dataBaixa?: string;
  compradorNome?: string;
  compradorContato?: string;
  motivoBaixa?: string;
}

export interface NewMovementInput {
  id: string;
  birdId: string;
  tipo: MovementType;
  motivo: string;
  data: string;
  valorCentavos: number;
  comprador?: { nome?: string; contato?: string };
  pagamento?: PaymentMethod;
  statusPagamento?: PaymentStatus;
  dataRecebimento?: string;
  observacao?: string;
}

export interface LedgerContext {
  now: number;
  deviceId: string;
  /** Hoje (YYYY-MM-DD, fuso local). */
  today: string;
}

export type LedgerErrorCode =
  | 'INVALID_INPUT'
  | 'BIRD_NOT_FOUND'
  | 'ALREADY_CLOSED'
  | 'DUPLICATE_ENTRY'
  | 'INVALID_VALUE'
  | 'INVALID_DATE'
  | 'NOT_FOUND'
  | 'ALREADY_REVERSED'
  | 'HAS_ACTIVE_EXIT'
  | 'NOT_PENDING';

export type Result<T> =
  | { ok: true; value: T; replay?: boolean }
  | { ok: false; code: LedgerErrorCode; error: string };

export interface BirdStatusPatch {
  birdId: string;
  status: string;
}

export interface ReconcileReport {
  legacyCreated: number;
  duplicatesFlagged: number;
  statusFixed: number;
}

export interface Range {
  from?: string;
  to?: string;
}

export interface SalesSummary {
  receita: number;
  recebido: number;
  aReceber: number;
  custoVendidas: number;
  lucro: number;
  vendasCount: number;
  vendasSemCusto: number;
  ticketMedio: number;
  perdasCount: number;
  perdasValor: number;
  saidasCount: number;
  entradasCount: number;
  entradasCusto: number;
}

export interface MonthPoint {
  key: string; // YYYY-MM
  receita: number;
  vendas: number;
  perdas: number;
}
