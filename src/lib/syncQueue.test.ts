import { describe, it, expect, beforeEach, vi } from 'vitest';

// Polyfills in-memory para ambiente de testes Node.js
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => { store.set(key, String(val)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    length: 0
  } as any;
}

if (typeof globalThis.window === 'undefined') {
  const listeners = new Map<string, Set<Function>>();
  globalThis.window = {
    addEventListener: (ev: string, fn: Function) => {
      if (!listeners.has(ev)) listeners.set(ev, new Set());
      listeners.get(ev)!.add(fn);
    },
    removeEventListener: (ev: string, fn: Function) => {
      listeners.get(ev)?.delete(fn);
    },
    dispatchEvent: (ev: any) => {
      const set = listeners.get(ev.type);
      if (set) set.forEach(fn => fn(ev));
      return true;
    }
  } as any;
}

if (typeof globalThis.CustomEvent === 'undefined') {
  globalThis.CustomEvent = class CustomEvent {
    type: string;
    detail: any;
    constructor(type: string, opts?: any) {
      this.type = type;
      this.detail = opts?.detail;
    }
  } as any;
}

// Mock Supabase client
vi.mock('./supabaseClient', () => {
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: vi.fn()
    }
  };
});

import { supabase } from './supabaseClient';
import {
  enqueueMutation,
  getSyncQueueLength,
  clearSyncQueue,
  processSyncQueue,
  getDeadLetterQueue,
  clearDeadLetterQueue,
  SYNC_QUEUE_CHANGED_EVENT,
  SYNC_DROPPED_EVENT
} from './syncQueue';

describe('syncQueue module', () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearSyncQueue();
    await clearDeadLetterQueue();
    vi.clearAllMocks();
  });

  it('enfileira mutações e emite evento de alteração na fila', async () => {
    const queueEventSpy = vi.fn();
    window.addEventListener(SYNC_QUEUE_CHANGED_EVENT, queueEventSpy);

    await enqueueMutation('birds', 'insert', { id: 'bird-1', anilha: 'BR-01' });
    const len1 = await getSyncQueueLength();
    expect(len1).toBe(1);
    expect(queueEventSpy).toHaveBeenCalled();

    window.removeEventListener(SYNC_QUEUE_CHANGED_EVENT, queueEventSpy);
  });

  it('coalesce updates consecutivos para o mesmo alvo', async () => {
    await enqueueMutation('birds', 'update', { nome: 'Galo 1' }, { column: 'id', value: 'bird-1' });
    await enqueueMutation('birds', 'update', { nome: 'Galo 2' }, { column: 'id', value: 'bird-1' });

    const len = await getSyncQueueLength();
    expect(len).toBe(1); // deve ter coalescido para 1 item
  });

  it('processa a fila com sucesso e remove itens processados', async () => {
    const mockDbOp = vi.fn().mockResolvedValue({ error: null });
    (supabase!.from as any).mockReturnValue({
      insert: mockDbOp,
      upsert: mockDbOp,
      update: vi.fn().mockReturnValue({ eq: mockDbOp }),
      delete: vi.fn().mockReturnValue({ eq: mockDbOp })
    });

    await enqueueMutation('birds', 'insert', { id: 'bird-10', anilha: 'BR-10' });
    expect(await getSyncQueueLength()).toBe(1);

    await processSyncQueue();

    expect(await getSyncQueueLength()).toBe(0);
    expect(mockDbOp).toHaveBeenCalled();
  });

  it('move para dead-letter se falhar com erro permanente ou atingir 5 tentativas', async () => {
    const droppedSpy = vi.fn();
    window.addEventListener(SYNC_DROPPED_EVENT, droppedSpy);

    // Erro permanente (ex: chave estrangeira 23503)
    const mockDbError = vi.fn().mockResolvedValue({
      error: { code: '23503', message: 'foreign key constraint' }
    });
    (supabase!.from as any).mockReturnValue({
      insert: mockDbError,
      upsert: mockDbError,
      update: vi.fn().mockReturnValue({ eq: mockDbError }),
      delete: vi.fn().mockReturnValue({ eq: mockDbError })
    });

    await enqueueMutation('birds', 'insert', { id: 'bird-invalid', anilha: 'BR-X' });
    await processSyncQueue();

    // A mutação deve ter sido descartada da fila principal
    expect(await getSyncQueueLength()).toBe(0);

    // E movida para o dead-letter
    const deadLetters = await getDeadLetterQueue();
    expect(deadLetters.length).toBe(1);
    expect(deadLetters[0].mutation.table).toBe('birds');
    expect(droppedSpy).toHaveBeenCalled();

    window.removeEventListener(SYNC_DROPPED_EVENT, droppedSpy);
  });
});
