import localforage from 'localforage';
import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Fila persistente de sincronização offline (IndexedDB).
 *
 * Garantias:
 *  - Nenhum item se perde: toda leitura/escrita da fila passa por um mutex (`withLock`) e o
 *    processamento nunca regrava a fila inteira — só remove/atualiza o item que acabou de enviar.
 *  - Ordem preservada por registro: se um item falha, os seguintes do MESMO registro esperam.
 *  - Edições repetidas do mesmo registro viram uma só (coalescência) → menos tráfego e
 *    nunca reenvia um estado antigo por cima de um novo que está na fila.
 *  - Exclusão cancela edições pendentes do mesmo registro.
 *  - Falha de rede NÃO gasta tentativas (sítio com sinal ruim); só erro permanente gasta.
 *  - Nada é descartado em silêncio: itens esgotados vão para a "caixa de falhas" e disparam
 *    o evento `mura-sync-dropped` para a interface avisar o usuário.
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

// ── Mutex ────────────────────────────────────────────────────────────────────
let lockTail: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lockTail.then(fn);
  lockTail = run.catch(() => undefined);
  return run;
}

const readQueue = async (): Promise<QueuedMutation[]> => {
  try {
    const fromIDB = await localforage.getItem<QueuedMutation[]>(QUEUE_KEY);
    if (fromIDB && Array.isArray(fromIDB)) return fromIDB;
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return [];
};

async function writeQueue(queue: QueuedMutation[]): Promise<void> {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  } catch {}
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
function targetKey(item: Pick<QueuedMutation, 'id' | 'table' | 'payload' | 'filter'>): string {
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
  if (/failed to fetch|networkerror|network request failed|load failed|timeout|timed out|fetch/.test(msg)) return true;
  const status = typeof err?.status === 'number' ? err.status : undefined;
  return status !== undefined && (status === 0 || status === 408 || status === 429 || status >= 500);
}

// ── Enfileirar ───────────────────────────────────────────────────────────────

/**
 * Adiciona uma mutação na fila persistente. Edições do mesmo registro são fundidas.
 */
export async function enqueueMutation(
  table: string,
  action: 'insert' | 'update' | 'delete' | 'upsert',
  payload: any,
  filter?: { column: string; value: any }
): Promise<void> {
  try {
    await withLock(async () => {
      let queue = await readQueue();
      const item: QueuedMutation = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        table, action, payload, filter,
        attempts: 0,
        createdAt: Date.now(),
        rev: 0,
      };
      const key = targetKey(item);

      if (action === 'delete') {
        // Exclusão torna qualquer escrita pendente do mesmo registro inútil.
        queue = queue.filter(q => targetKey(q) !== key);
        queue.push(item);
      } else if (action === 'update') {
        // Funde no último item pendente do mesmo registro (insert/upsert/update).
        let merged = false;
        for (let i = queue.length - 1; i >= 0; i--) {
          const q = queue[i];
          if (targetKey(q) !== key) continue;
          if (q.action === 'delete') break; // registro já será apagado; mantém o update (será inócuo)
          if (q.action === 'update' && !sameFilter(q.filter, filter)) continue;
          q.payload = { ...(q.payload || {}), ...(payload || {}) };
          q.rev = (q.rev || 0) + 1;
          merged = true;
          break;
        }
        if (!merged) queue.push(item);
      } else {
        // insert/upsert: substitui um insert/upsert anterior do mesmo registro (estado mais novo).
        const idx = queue.findIndex(q => targetKey(q) === key && (q.action === 'insert' || q.action === 'upsert'));
        if (idx >= 0) {
          queue[idx].payload = { ...(queue[idx].payload || {}), ...(payload || {}) };
          queue[idx].rev = (queue[idx].rev || 0) + 1;
        } else {
          queue.push(item);
        }
      }
      await writeQueue(queue);
    });

    if (typeof navigator !== 'undefined' && navigator.onLine === true) {
      processSyncQueue().catch(() => {});
    }
  } catch (err) {
    console.warn('[SyncQueue] Falha ao enfileirar operacao offline:', err);
  }
}

// ── Processar ────────────────────────────────────────────────────────────────

async function execute(item: QueuedMutation): Promise<any | null> {
  let result: any = null;
  if (item.action === 'insert' || item.action === 'upsert') {
    result = item.payload && item.payload.id
      ? await supabase!.from(item.table).upsert(item.payload, { onConflict: 'id' })
      : await supabase!.from(item.table).insert(item.payload);
  } else if (item.action === 'update' && item.filter) {
    result = await supabase!.from(item.table).update(item.payload).eq(item.filter.column, item.filter.value);
  } else if (item.action === 'delete' && item.filter) {
    result = await supabase!.from(item.table).delete().eq(item.filter.column, item.filter.value);
  } else {
    return { message: `Operação ${item.action} sem filtro/payload válido`, permanent: true };
  }
  return result?.error ? { ...result.error, status: result.status } : null;
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
 * Processa a fila. Seguro para ser chamado várias vezes ao mesmo tempo.
 */
export async function processSyncQueue(): Promise<{ processed: number; remaining: number }> {
  if (!isSupabaseConfigured || !supabase) return { processed: 0, remaining: 0 };
  if (!isOnlineFlag()) return { processed: 0, remaining: await getPendingSyncCount() };
  if (running) { rerun = true; return { processed: 0, remaining: await getPendingSyncCount() }; }

  running = true;
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

        await withLock(async () => {
          const queue = await readQueue();
          const idx = queue.findIndex(q => q.id === item.id);
          if (idx < 0) return; // foi fundido/removido durante o envio

          if (!error) {
            if ((queue[idx].rev || 0) === sentRev) { queue.splice(idx, 1); processed++; }
            // se houve coalescência durante o envio, mantém o item com o conteúdo mais novo
          } else if (transient) {
            blocked.add(key);
            stop = true; // sem rede: não adianta tentar o resto agora
          } else {
            queue[idx].attempts += 1;
            queue[idx].lastAttempt = Date.now();
            blocked.add(key);
            const isPermanent = error?.permanent === true || (error?.code && ['23503', '23505', '42P01', '42703', 'PGRST100'].includes(String(error.code)));
            if (isPermanent || queue[idx].attempts >= MAX_ATTEMPTS) {
              const [dropped] = queue.splice(idx, 1);
              await moveToDeadLetter(dropped, error);
            }
          }
          await writeQueue(queue);
        });
      }
      if (stop) rerun = false;
    } while (rerun);

    return { processed, remaining: await getPendingSyncCount() };
  } catch (err) {
    console.warn('[SyncQueue] Erro ao processar fila offline:', err);
    return { processed, remaining: 0 };
  } finally {
    running = false;
  }
}

// Sincroniza em segundo plano quando a rede volta ou o app volta ao primeiro plano.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processSyncQueue().catch(() => {});
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      processSyncQueue().catch(() => {});
    }
  });
}
