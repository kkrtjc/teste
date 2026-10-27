/**
 * tombstones.ts — Gestão Universal de Exclusões Permanentes (Tombstones).
 *
 * Evita a ressurreição de registros deletados:
 *  - Se você apaga um lote ou ave offline, a deleção fica guardada no IndexedDB/localStorage.
 *  - Na próxima sincronização com a nuvem, o registro deletado não reaparece.
 *  - Se outro aparelho ainda possuía o registro, ele é filtrado e não é re-enviado.
 */
import localforage from 'localforage';

export type EntityType = 
  | 'birds' 
  | 'couples' 
  | 'couple_eggs' 
  | 'incubation_lots' 
  | 'breeds'
  | 'bird_movements';

function getKey(entity: EntityType, scope: string, type: 'tombstones' | 'pending-deletes'): string {
  return `@mura-manager:${scope}:${type}:${entity}`;
}

/**
 * Lê tombstones sincronamente do localStorage (fallback rápido para render inicial)
 */
export function getTombstonesSync(entity: EntityType, scope = 'guest'): Set<string> {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    const raw = localStorage.getItem(getKey(entity, scope, 'tombstones'));
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

/**
 * Lê tombstones do IndexedDB (fonte primária persistente) com sincronização para o localStorage
 */
export async function getTombstonesAsync(entity: EntityType, scope = 'guest'): Promise<Set<string>> {
  try {
    const fromIDB = await localforage.getItem<string[]>(getKey(entity, scope, 'tombstones'));
    if (fromIDB && Array.isArray(fromIDB)) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(getKey(entity, scope, 'tombstones'), JSON.stringify(fromIDB));
        }
      } catch {}
      return new Set(fromIDB);
    }
  } catch {}
  return getTombstonesSync(entity, scope);
}

/**
 * Registra um tombstone permanente para uma entidade excluída
 */
export async function recordTombstone(entity: EntityType, id: string, scope = 'guest'): Promise<void> {
  try {
    const set = await getTombstonesAsync(entity, scope);
    set.add(id);
    const arr = Array.from(set).slice(-2000); // guarda até 2000 exclusões históricas
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(getKey(entity, scope, 'tombstones'), JSON.stringify(arr));
      }
    } catch {}
    try {
      await localforage.setItem(getKey(entity, scope, 'tombstones'), arr);
    } catch {}
  } catch (err) {
    console.warn(`[Tombstones] Erro ao gravar tombstone para ${entity}/${id}:`, err);
  }
}

/**
 * Limpa um tombstone (caso o usuário restaure ou recrie)
 */
export async function clearTombstone(entity: EntityType, id: string, scope = 'guest'): Promise<void> {
  try {
    const set = await getTombstonesAsync(entity, scope);
    if (set.has(id)) {
      set.delete(id);
      const arr = Array.from(set);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(getKey(entity, scope, 'tombstones'), JSON.stringify(arr));
        }
      } catch {}
      try {
        await localforage.setItem(getKey(entity, scope, 'tombstones'), arr);
      } catch {}
    }
  } catch (err) {
    console.warn(`[Tombstones] Erro ao limpar tombstone para ${entity}/${id}:`, err);
  }
}

/**
 * Rastreamento de exclusões pendentes para envio em lote ao Supabase
 */
export async function getPendingDeletes(entity: EntityType, scope = 'guest'): Promise<Set<string>> {
  try {
    const arr = await localforage.getItem<string[]>(getKey(entity, scope, 'pending-deletes'));
    if (arr && Array.isArray(arr)) return new Set(arr);
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(getKey(entity, scope, 'pending-deletes'));
      if (raw) return new Set(JSON.parse(raw));
    }
  } catch {}
  return new Set();
}

export async function markPendingDelete(entity: EntityType, id: string, scope = 'guest'): Promise<void> {
  try {
    const set = await getPendingDeletes(entity, scope);
    set.add(id);
    const arr = Array.from(set);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(getKey(entity, scope, 'pending-deletes'), JSON.stringify(arr));
      }
    } catch {}
    try {
      await localforage.setItem(getKey(entity, scope, 'pending-deletes'), arr);
    } catch {}
  } catch (err) {
    console.warn(`[Tombstones] Erro ao marcar deleção pendente para ${entity}/${id}:`, err);
  }
}

export async function clearPendingDelete(entity: EntityType, id: string, scope = 'guest'): Promise<void> {
  try {
    const set = await getPendingDeletes(entity, scope);
    if (set.has(id)) {
      set.delete(id);
      const arr = Array.from(set);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(getKey(entity, scope, 'pending-deletes'), JSON.stringify(arr));
        }
      } catch {}
      try {
        await localforage.setItem(getKey(entity, scope, 'pending-deletes'), arr);
      } catch {}
    }
  } catch (err) {
    console.warn(`[Tombstones] Erro ao limpar deleção pendente para ${entity}/${id}:`, err);
  }
}
