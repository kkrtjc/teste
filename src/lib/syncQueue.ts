import localforage from 'localforage';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface QueuedMutation {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete' | 'upsert';
  payload: any;
  filter?: { column: string; value: any };
  attempts: number;
  createdAt: number;
  lastAttempt?: number;
}

const QUEUE_KEY = '@mura-manager:sync-queue';
const MAX_ATTEMPTS = 5;

let isProcessing = false;

/**
 * Adiciona uma mutacao que falhou ou precisa de sincronizacao segura na fila persistente (IndexedDB).
 */
export async function enqueueMutation(
  table: string,
  action: 'insert' | 'update' | 'delete' | 'upsert',
  payload: any,
  filter?: { column: string; value: any }
): Promise<void> {
  try {
    const queue = (await localforage.getItem<QueuedMutation[]>(QUEUE_KEY)) || [];
    const item: QueuedMutation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      table,
      action,
      payload,
      filter,
      attempts: 0,
      createdAt: Date.now(),
    };
    queue.push(item);
    await localforage.setItem(QUEUE_KEY, queue);

    // Se estiver online, tenta processar imediatamente
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      processSyncQueue().catch(() => {});
    }
  } catch (err) {
    console.warn('[SyncQueue] Falha ao enfileirar operacao offline:', err);
  }
}

/**
 * Processa a fila de sincronizacao pendente com Supabase (com retry exponencial).
 */
export async function processSyncQueue(): Promise<{ processed: number; remaining: number }> {
  if (isProcessing) return { processed: 0, remaining: 0 };
  if (!isSupabaseConfigured || !supabase) return { processed: 0, remaining: 0 };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { processed: 0, remaining: 0 };

  isProcessing = true;

  try {
    const queue = (await localforage.getItem<QueuedMutation[]>(QUEUE_KEY)) || [];
    if (queue.length === 0) {
      isProcessing = false;
      return { processed: 0, remaining: 0 };
    }

    const remaining: QueuedMutation[] = [];
    let processedCount = 0;

    for (const item of queue) {
      try {
        let result: any = null;

        if (item.action === 'insert' || item.action === 'upsert') {
          if (item.payload && item.payload.id) {
            result = await supabase.from(item.table).upsert(item.payload, { onConflict: 'id' });
          } else {
            result = await supabase.from(item.table).insert(item.payload);
          }
        } else if (item.action === 'update' && item.filter) {
          result = await supabase.from(item.table).update(item.payload).eq(item.filter.column, item.filter.value);
        } else if (item.action === 'delete' && item.filter) {
          result = await supabase.from(item.table).delete().eq(item.filter.column, item.filter.value);
        }

        if (result && result.error) {
          throw result.error;
        }

        processedCount++;
      } catch (err) {
        item.attempts += 1;
        item.lastAttempt = Date.now();

        if (item.attempts < MAX_ATTEMPTS) {
          remaining.push(item);
        } else {
          console.error(`[SyncQueue] Operacao descartada apos ${MAX_ATTEMPTS} tentativas falhas:`, item, err);
        }
      }
    }

    await localforage.setItem(QUEUE_KEY, remaining);
    return { processed: processedCount, remaining: remaining.length };
  } catch (err) {
    console.warn('[SyncQueue] Erro ao processar fila offline:', err);
    return { processed: 0, remaining: 0 };
  } finally {
    isProcessing = false;
  }
}

// Inicializa listeners de rede para sincronizacao automatica em background
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
