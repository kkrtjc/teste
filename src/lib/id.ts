/**
 * Utilitários de Identificação Canônica, UUIDv4 Criptográfico e Deduplicação O(n).
 *
 * Garante:
 *  - Zero colisão entre dispositivos (celular vs PC) e cliques rápidos.
 *  - Compatibilidade universal com colunas PostgreSQL `uuid` e `text`.
 *  - IDs determinísticos (idempotentes) para entidades semeadas por usuário
 *    (ex: raças padrão e casais automáticos de genealogia), evitando duplicação
 *    em sincronizações simultâneas e colisões de chave primária entre contas (RLS).
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

/**
 * Gera um UUID v4 RFC-4122 globalmente único.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    let now = Date.now();
    for (let i = 0; i < 16; i++) {
      bytes[i] = (now + Math.random() * 256) & 0xff;
      now = Math.floor(now / 2);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC-4122

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Mistura avalanche de 32 bits estilo MurmurHash3 fmix32.
 */
function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Gera um UUID determinístico (formato RFC-4122 v5) a partir de uma chave textual.
 * Dado o mesmo `seed`, celular e PC produzem exatamente o mesmo UUID sem precisar de rede.
 */
export function deterministicUuid(seed: string): string {
  const input = String(seed);
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x6a09e667;
  let h4 = 0xbb67ae85;

  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ ((c << 5) | (c >>> 3)), 0x1b873593) >>> 0;
    h3 = Math.imul(h3 ^ (c + i), 0xcc9e2d51) >>> 0;
    h4 = Math.imul(h4 ^ (c * 31 + i), 0x85ebca6b) >>> 0;
  }

  const w1 = fmix32(h1 ^ input.length);
  const w2 = fmix32(h2 ^ w1);
  const w3 = fmix32(h3 ^ w2);
  const w4 = fmix32(h4 ^ w3);

  const bytes = new Uint8Array(16);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, w1, false);
  view.setUint32(4, w2, false);
  view.setUint32(8, w3, false);
  view.setUint32(12, w4, false);

  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5 (name-based)
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC-4122

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Deduplica uma coleção por `id` em tempo O(n), preservando a ordem da primeira aparição
 * mas mantendo sempre a versão mais recente (última ocorrência) de cada registro.
 */
export function dedupeById<T extends { id: string }>(items: readonly T[]): T[] {
  const indexById = new Map<string, number>();
  const result: T[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || !item.id) continue;
    const existingIdx = indexById.get(item.id);
    if (existingIdx !== undefined) {
      result[existingIdx] = item;
    } else {
      indexById.set(item.id, result.length);
      result.push(item);
    }
  }
  return result;
}
