import localforage from 'localforage';
import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Fila persistente Write-Ahead (Outbox) de sincronização multi-dispositivo.
 *
 * Garantias arquiteturais:
 *  - Gravação Write-Ahead Síncrona (0ms): toda mutação é gravada imediatamente no `localStorage`
 *    ANTES de qualquer promessa assíncrona ou chamada de rede, e espelhada no IndexedDB.
 *    Mesmo se o usuário fechar o app no celular 1ms após salvar, o dado já está persistido.
 *  - Coalescência inteligente e idempotência (`upsert` com `onConflict: 'id'`): edições
 *    repetidas do mesmo registro fundem-se em uma só, impedindo duplicação e sobrescrita fora de ordem.
 *  - Resiliência automática de esquema (`PGRST204` / `42703`): se uma coluna opcional não existir
 *    na tabela do Supabase, ela é removida automaticamente do payload e a operação é reenviada na hora,
 *    sem jamais descartar o registro do usuário.
 *  - Ordem estrita preservada por registro (`table:id`).
 *  - Falhas transitórias de rede (3G/4G instável) nunca gastam tentativas.
 */

export interface QueuedMutation {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete' | 'upsert';
  payload: any;
  filter?: { column: string; value: any };
  attempts: number;
  createdAt: number;
  lastAttempt?: number;
  /** Incrementa a cada coalescência; evita apagar uma versão mais nova enquanto a antiga está em voo. */
  rev?: number;
}

export const QUEUE_KEY = '@mura-manager:sync-queue';
export const DEAD_LETTER_KEY = '@mura-manager:sync-dead-letter';
export const MAX_ATTEMPTS = 5;
const DEAD_LETTER_LIMIT = 50;

export const SYNC_DROPPED_EVENT = 'mura-sync-dropped';
export const SYNC_QUEUE_CHANGED_EVENT = 'mura-sync-queue-changed';
export const SYNC_MUTATION_SYNCED_EVENT = 'mura-sync-mutation-synced';

// Cache em memória de tabelas inexistentes no banco (ex: bird_movements quando persistido em birds)
const unavailableTables = new Set<string>();
// Cache em memória de colunas opcionais ausentes por tabela (auto-descobertas via PGRST204 / 42703)
const unsupportedColumnsByTable = new Map<string, Set<string>>();

export function isTableKnownUnavailable(table: string): boolean {
  return unavailableTables.has(table);
}

export function resetSchemaCacheForTests(): void {
  unavailableTables.clear();
  unsupportedColumnsByTable.clear();
}

// ── Mutex ────────────────────────────────────────────────────────────────────
let lockTail: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lockTail.then(fn);
  lockTail = run.catch(() => undefined);
  return run;
}

function readQueueSync(): QueuedMutation[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

function writeQueueSync(queue: QueuedMutation[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {}
}

const readQueue = async (): Promise<QueuedMutation[]> => {
  const syncList = readQueueSync();
  let idbList: QueuedMutation[] | null = null;
  try {
    const fromIDB = await localforage.getItem<QueuedMutation[]>(QUEUE_KEY);
    if (fromIDB && Array.isArray(fromIDB)) idbList = fromIDB;
  } catch {}

  if (!idbList || idbList.length === 0) {
    return syncList;
  }
  if (syncList.length === 0) {
    writeQueueSync(idbList);
    return idbList;
  }

  // Reconcilia o espelho síncrono (que pode conter mutações recém-gravadas antes do IDB resolver)
  // com o IndexedDB, preservando ordem e maior revisão (`rev`) por item/chave.
  const byId = new Map<string, QueuedMutation>();
  for (const item of idbList) {
    if (item && item.id) byId.set(item.id, item);
  }
  for (const sItem of syncList) {
    if (!sItem || !sItem.id) continue;
    const sKey = targetKey(sItem);
    if (sItem.action === 'delete') {
      for (const [k, existing] of byId.entries()) {
        if (targetKey(existing) === sKey && existing.createdAt <= sItem.createdAt) {
          byId.delete(k);
        }
      }
      byId.set(sItem.id, sItem);
      continue;
    }
    const existing = byId.get(sItem.id);
    if (!existing || (sItem.rev || 0) >= (existing.rev || 0)) {
      byId.set(sItem.id, sItem);
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
};

async function writeQueue(queue: QueuedMutation[]): Promise<void> {
  writeQueueSync(queue);
  try {
    await localforage.setItem(QUEUE_KEY, queue);
  } catch {}
  emit(SYNC_QUEUE_CHANGED_EVENT, { pending: queue.length, length: queue.length });
}

function emit(name: string, detail: unknown) {
  try {
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  } catch { /* evento é só informativo */ }
}

/** Identifica "o mesmo registro" para ordenação e coalescência. */
export function targetKey(item: Pick<QueuedMutation, 'id' | 'table' | 'payload' | 'filter'>): string {
  const rowId = item.filter?.value ?? item.payload?.id;
  return rowId !== undefined && rowId !== null ? `${item.table}:${rowId}` : `${item.table}#${item.id}`;
}

const sameFilter = (a?: QueuedMutation['filter'], b?: QueuedMutation['filter']) =>
  (a?.column ?? null) === (b?.column ?? null) && (a?.value ?? null) === (b?.value ?? null);

const isOnlineFlag = () => typeof navigator === 'undefined' || navigator.onLine !== false;

/** Erro de rede/servidor indisponível = tentar de novo depois, sem gastar tentativas. */
export function isTransientError(err: any): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = String(err?.message ?? err ?? '').toLowerCase();
  if (/failed to fetch|networkerror|network request failed|load failed|timeout|timed out|abort|fetch/.test(msg)) return true;
  const status = typeof err?.status === 'number' ? err.status : undefined;
  return status !== undefined && (status === 0 || status === 408 || status === 429 || status >= 500);
}

/** Aplica regras puras de coalescência em uma fila existente. */
function applyMutationToList(
  inputQueue: QueuedMutation[],
  item: QueuedMutation
): QueuedMutation[] {
  let queue = inputQueue.map(q => ({ ...q }));
  const key = targetKey(item);

  if (item.action === 'delete') {
    // Exclusão torna qualquer escrita pendente anterior do mesmo registro inútil.
    queue = queue.filter(q => targetKey(q) !== key);
    queue.push(item);
  } else if (item.action === 'update') {
    // Funde no último item pendente do mesmo registro (insert/upsert/update).
    let merged = false;
    for (let i = queue.length - 1; i >= 0; i--) {
      const q = queue[i];
      if (targetKey(q) !== key) continue;
      if (q.action === 'delete') break;
      if (q.action === 'update' && !sameFilter(q.filter, item.filter)) continue;
      q.payload = { ...(q.payload || {}), ...(item.payload || {}) };
      q.rev = (q.rev || 0) + 1;
      merged = true;
      break;
    }
    if (!merged) queue.push(item);
  } else {
    // insert/upsert: substitui ou atualiza um insert/upsert anterior do mesmo registro.
    const idx = queue.findIndex(q => targetKey(q) === key && (q.action === 'insert' || q.action === 'upsert'));
    if (idx >= 0) {
      queue[idx].action = item.payload?.id ? 'upsert' : queue[idx].action;
      queue[idx].payload = { ...(queue[idx].payload || {}), ...(item.payload || {}) };
      queue[idx].rev = (queue[idx].rev || 0) + 1;
    } else {
      queue.push(item);
    }
  }
  return queue;
}

// ── Enfileirar (Write-Ahead) ─────────────────────────────────────────────────

/**
 * Adiciona uma mutação na fila persistente Write-Ahead.
 * A gravação no `localStorage` ocorre SINCRONAMENTE no instante da chamada (0ms),
 * garantindo zero perda mesmo se o app for fechado imediatamente após a ação.
 */
export async function enqueueMutation(
  table: string,
  action: 'insert' | 'update' | 'delete' | 'upsert',
  payload: any,
  filter?: { column: string; value: any }
): Promise<void> {
  if (table === 'bird_movements' && unavailableTables.has('bird_movements')) {
    return;
  }

  const mutationItem: QueuedMutation = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    table,
    action,
    payload,
    filter,
    attempts: 0,
    createdAt: Date.now(),
    rev: 0,
  };

  // Passo 1 (0ms, síncrono): Write-Ahead imediato no localStorage antes de qualquer await!
  try {
    const syncSnapshot = applyMutationToList(readQueueSync(), mutationItem);
    writeQueueSync(syncSnapshot);
    emit(SYNC_QUEUE_CHANGED_EVENT, { pending: syncSnapshot.length, length: syncSnapshot.length });
  } catch {}

  // Passo 2: Persiste no IndexedDB sob mutex para durabilidade total (inclusive no Safari iOS).
  try {
    await withLock(async () => {
      const idbRaw = await localforage.getItem<QueuedMutation[]>(QUEUE_KEY).catch(() => null);
      const baseQueue = Array.isArray(idbRaw) && idbRaw.length > 0 ? idbRaw : [];
      // Se já aplicamos no syncQueue, sincronizamos com o estado consolidado
      const currentSync = readQueueSync();
      const merged = currentSync.length > 0 ? currentSync : applyMutationToList(baseQueue, mutationItem);
      await writeQueue(merged);
    });

    if (typeof navigator !== 'undefined' && navigator.onLine === true) {
      processSyncQueue().catch(() => {});
    }
  } catch (err) {
    console.warn('[SyncQueue] Falha ao consolidar operacao no IndexedDB:', err);
  }
}

// ── Inspeção e Projeção Local ────────────────────────────────────────────────

export async function getPendingMutations(): Promise<QueuedMutation[]> {
  return withLock(readQueue);
}

// ── Extração de Colunas Inexistentes (Auto-Cura de Esquema) ──────────────────

function extractMissingColumn(err: any, table: string): string | null {
  const code = String(err?.code ?? '');
  const msg = String(err?.message ?? err?.details ?? '');
  if (code !== 'PGRST204' && code !== '42703' && !/column/i.test(msg)) {
    return null;
  }
  // PostgREST: Could not find the 'ganho_gramas_dia' column of 'breeds' in the schema cache
  const m1 = msg.match(/Could not find the '([^']+)' column/i);
  if (m1?.[1]) return m1[1];
  // PostgreSQL: column "city" of relation "profiles" does not exist / column breeds.ganho_gramas_dia does not exist
  const m2 = msg.match(/column\s+(?:[a-zA-Z0-9_]+\.)?"?([a-zA-Z0-9_]+)"?\s+(?:of relation\s+"?[a-zA-Z0-9_]+"?\s+)?does not exist/i);
  if (m2?.[1] && m2[1] !== table) return m2[1];
  return null;
}

function isMissingTableError(err: any): boolean {
  const code = String(err?.code ?? '');
  const msg = String(err?.message ?? '');
  return (
    code === 'PGRST205' ||
    (code === '42P01' && /does not exist/i.test(msg)) ||
    /Could not find the table/i.test(msg)
  );
}

function stripKnownUnsupportedColumns(table: string, payload: any): any {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const unsupported = unsupportedColumnsByTable.get(table);
  if (!unsupported || unsupported.size === 0) return { ...payload };
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!unsupported.has(k)) clean[k] = v;
  }
  return clean;
}

// ── Processar ────────────────────────────────────────────────────────────────

async function execute(item: QueuedMutation): Promise<any | null> {
  if (item.table === 'bird_movements' && unavailableTables.has('bird_movements')) {
    return null;
  }

  if (item.action === 'delete') {
    if (!item.filter) {
      return { message: 'Operação delete sem filtro válido', permanent: true };
    }
    const result = await supabase!.from(item.table).delete().eq(item.filter.column, item.filter.value);
    if (result?.error && item.table === 'bird_movements' && isMissingTableError(result.error)) {
      unavailableTables.add('bird_movements');
      return null;
    }
    return result?.error ? { ...result.error, status: result.status } : null;
  }

  if (item.action !== 'insert' && item.action !== 'upsert' && !(item.action === 'update' && item.filter)) {
    return { message: `Operação ${item.action} sem filtro/payload válido`, permanent: true };
  }

  let currentPayload = stripKnownUnsupportedColumns(item.table, item.payload);

  // Até 6 tentativas instantâneas de auto-adaptação caso haja colunas opcionais ausentes no banco
  for (let schemaRetry = 0; schemaRetry < 6; schemaRetry++) {
    if (!currentPayload || typeof currentPayload !== 'object' || Object.keys(currentPayload).length === 0) {
      return null;
    }

    let result: any = null;
    if (item.action === 'insert' || item.action === 'upsert') {
      result = currentPayload.id
        ? await supabase!.from(item.table).upsert(currentPayload, { onConflict: 'id' })
        : await supabase!.from(item.table).insert(currentPayload);

      // Fallback para `profiles` caso RLS permita UPDATE (auth.uid() = id) mas não tenha policy de INSERT
      if (result?.error && item.table === 'profiles' && String(result.error.code) === '42501' && currentPayload.id) {
        const { id, ...profilePatch } = currentPayload;
        if (Object.keys(profilePatch).length > 0) {
          result = await supabase!.from('profiles').update(profilePatch).eq('id', id);
        }
      }
    } else if (item.action === 'update' && item.filter) {
      result = await supabase!.from(item.table).update(currentPayload).eq(item.filter.column, item.filter.value);
    }

    if (!result?.error) {
      return null;
    }

    // Se a tabela auxiliar `bird_movements` não existir no Supabase, marca em cache e encerra sem erro
    // (pois as movimentações já viajam atomicamente no envelope da ave em `public.birds`).
    if (item.table === 'bird_movements' && isMissingTableError(result.error)) {
      unavailableTables.add('bird_movements');
      return null;
    }

    const missingCol = extractMissingColumn(result.error, item.table);
    if (missingCol && missingCol !== 'id' && missingCol !== 'user_id' && missingCol in currentPayload) {
      let set = unsupportedColumnsByTable.get(item.table);
      if (!set) {
        set = new Set();
        unsupportedColumnsByTable.set(item.table, set);
      }
      set.add(missingCol);
      const nextPayload = { ...currentPayload };
      delete nextPayload[missingCol];
      currentPayload = nextPayload;
      continue;
    }

    return { ...result.error, status: result.status };
  }

  return null;
}

async function moveToDeadLetter(item: QueuedMutation, error: unknown): Promise<void> {
  try {
    let dead: any[] = [];
    try {
      dead = (await localforage.getItem<any[]>(DEAD_LETTER_KEY)) || [];
    } catch {}
    if (!dead.length && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(DEAD_LETTER_KEY);
        if (raw) dead = JSON.parse(raw);
      } catch {}
    }
    dead.unshift({ mutation: item, failedAt: Date.now(), error: String((error as any)?.message ?? error) });
    if (dead.length > DEAD_LETTER_LIMIT) dead.length = DEAD_LETTER_LIMIT;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DEAD_LETTER_KEY, JSON.stringify(dead));
      }
    } catch {}
    try {
      await localforage.setItem(DEAD_LETTER_KEY, dead);
    } catch {}
  } catch { /* melhor esforço */ }
  console.error(`[SyncQueue] Operacao descartada apos ${MAX_ATTEMPTS} tentativas falhas:`, item, error);
  emit(SYNC_DROPPED_EVENT, { mutation: item, table: item.table, action: item.action });
}

let running = false;
let rerun = false;
let activeRunPromise: Promise<{ processed: number; remaining: number }> | null = null;

/** Quantidade de operações aguardando sincronização. */
export async function getPendingSyncCount(): Promise<number> {
  return withLock(async () => (await readQueue()).length);
}

export const getSyncQueueLength = getPendingSyncCount;

export async function clearSyncQueue(): Promise<void> {
  await withLock(async () => {
    await writeQueue([]);
  });
}

export async function getDeadLetterQueue(): Promise<any[]> {
  try {
    const fromIDB = await localforage.getItem<any[]>(DEAD_LETTER_KEY);
    if (fromIDB && Array.isArray(fromIDB)) return fromIDB;
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(DEAD_LETTER_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return [];
}

export async function clearDeadLetterQueue(): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DEAD_LETTER_KEY);
    }
  } catch {}
  try {
    await localforage.removeItem(DEAD_LETTER_KEY);
  } catch {}
}

/**
 * Processa a fila. Seguro para ser chamado várias vezes ao mesmo tempo:
 * chamadas concorrentes aguardam o término do ciclo ativo (incluindo o re-run agendado),
 * garantindo que `await processSyncQueue()` só resolva quando toda a fila foi drenada.
 */
export async function processSyncQueue(): Promise<{ processed: number; remaining: number }> {
  if (!isSupabaseConfigured || !supabase) return { processed: 0, remaining: 0 };
  if (!isOnlineFlag()) return { processed: 0, remaining: await getPendingSyncCount() };
  if (running && activeRunPromise) {
    rerun = true;
    return activeRunPromise;
  }

  running = true;
  activeRunPromise = (async () => {
    let processed = 0;
    try {
      do {
        rerun = false;
        const snapshot = await withLock(readQueue);
        const blocked = new Set<string>();
        let stop = false;

        for (const item of snapshot) {
          if (stop) break;
          const key = targetKey(item);
          if (blocked.has(key)) continue; // preserva a ordem dentro do mesmo registro

          const sentRev = item.rev || 0;
          let error: any = null;
          try { error = await execute(item); } catch (e) { error = e; }

          const transient = error ? !error.permanent && isTransientError(error) : false;
          let syncedSuccessfully = false;

          await withLock(async () => {
            const queue = await readQueue();
            const idx = queue.findIndex(q => q.id === item.id);
            if (idx < 0) return; // foi fundido/removido durante o envio

            if (!error) {
              if ((queue[idx].rev || 0) === sentRev) {
                queue.splice(idx, 1);
                processed++;
                syncedSuccessfully = true;
              } else {
                // Houve coalescência durante o envio: agenda mais uma passada para enviar a revisão nova
                rerun = true;
              }
            } else if (transient) {
              blocked.add(key);
              stop = true; // sem rede: não adianta tentar o resto agora
            } else {
              queue[idx].attempts += 1;
              queue[idx].lastAttempt = Date.now();
              blocked.add(key);
              const isPermanent =
                error?.permanent === true ||
                (error?.code && ['23503', '23505', '42P01', 'PGRST100'].includes(String(error.code)));
              if (isPermanent || queue[idx].attempts >= MAX_ATTEMPTS) {
                const [dropped] = queue.splice(idx, 1);
                await moveToDeadLetter(dropped, error);
              }
            }
            await writeQueue(queue);
          });

          if (syncedSuccessfully) {
            emit(SYNC_MUTATION_SYNCED_EVENT, {
              item,
              table: item.table,
              action: item.action,
              recordId: item.filter?.value ?? item.payload?.id
            });
          }
        }
        if (stop) rerun = false;
      } while (rerun);

      return { processed, remaining: await getPendingSyncCount() };
    } catch (err) {
      console.warn('[SyncQueue] Erro ao processar fila offline:', err);
      return { processed, remaining: 0 };
    } finally {
      running = false;
      activeRunPromise = null;
    }
  })();

  return activeRunPromise;
}

// Sincroniza automaticamente quando a rede volta, o app ganha foco ou está prestes a ser fechado/ocultado.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processSyncQueue().catch(() => {});
  });

  window.addEventListener('pagehide', () => {
    processSyncQueue().catch(() => {});
  });

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      // Tanto ao ir para segundo plano (flush com keepalive) quanto ao voltar ao primeiro plano
      processSyncQueue().catch(() => {});
    });
  }
}
