import { describe, it, expect, beforeEach } from 'vitest';

// Polyfill in-memory localStorage se executado em ambiente Node.js
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

import {
  recordTombstone,
  clearTombstone,
  getTombstonesSync,
  getTombstonesAsync,
  markPendingDelete,
  clearPendingDelete,
  getPendingDeletes
} from './tombstones';

describe('tombstones module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('registra e recupera tombstones síncrona e assincronamente', async () => {
    const scope = 'test-user-1';
    await recordTombstone('birds', 'bird-123', scope);
    await recordTombstone('birds', 'bird-456', scope);

    const syncSet = getTombstonesSync('birds', scope);
    expect(syncSet.has('bird-123')).toBe(true);
    expect(syncSet.has('bird-456')).toBe(true);
    expect(syncSet.has('bird-999')).toBe(false);

    const asyncSet = await getTombstonesAsync('birds', scope);
    expect(asyncSet.has('bird-123')).toBe(true);
    expect(asyncSet.has('bird-456')).toBe(true);
  });

  it('limpa tombstone quando solicitado', async () => {
    const scope = 'test-user-2';
    await recordTombstone('couples', 'couple-001', scope);
    let set = await getTombstonesAsync('couples', scope);
    expect(set.has('couple-001')).toBe(true);

    await clearTombstone('couples', 'couple-001', scope);
    set = await getTombstonesAsync('couples', scope);
    expect(set.has('couple-001')).toBe(false);
  });

  it('segrega entidades e escopos diferentes', async () => {
    await recordTombstone('breeds', 'breed-x', 'user-a');
    await recordTombstone('birds', 'bird-y', 'user-b');

    const breedsA = await getTombstonesAsync('breeds', 'user-a');
    const breedsB = await getTombstonesAsync('breeds', 'user-b');
    const birdsA = await getTombstonesAsync('birds', 'user-a');

    expect(breedsA.has('breed-x')).toBe(true);
    expect(breedsB.has('breed-x')).toBe(false);
    expect(birdsA.has('bird-y')).toBe(false);
  });

  it('gerencia exclusões pendentes para sync', async () => {
    const scope = 'test-user-3';
    await markPendingDelete('couples', 'couple-10', scope);
    await markPendingDelete('couples', 'couple-20', scope);

    let pending = await getPendingDeletes('couples', scope);
    expect(pending.has('couple-10')).toBe(true);
    expect(pending.has('couple-20')).toBe(true);

    await clearPendingDelete('couples', 'couple-10', scope);
    pending = await getPendingDeletes('couples', scope);
    expect(pending.has('couple-10')).toBe(false);
    expect(pending.has('couple-20')).toBe(true);
  });
});
