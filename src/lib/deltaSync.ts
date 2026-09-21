import localforage from 'localforage';

const SYNC_TIMESTAMPS_KEY = '@mura-manager:last-sync-timestamps';

export interface SyncTimestamps {
  birds?: number;
  breeds?: number;
  couples?: number;
  couple_eggs?: number;
  egg_lots?: number;
  meat_lots?: number;
  incubation_lots?: number;
  profiles?: number;
  [key: string]: number | undefined;
}

/**
 * Gets the last sync timestamps for all entities.
 * Returns empty object if never synced (forces full sync).
 */
export async function getSyncTimestamps(userId: string): Promise<SyncTimestamps> {
  try {
    const key = `${SYNC_TIMESTAMPS_KEY}:${userId}`;
    const stored = await localforage.getItem<SyncTimestamps>(key);
    return stored || {};
  } catch {
    return {};
  }
}

/**
 * Updates the last sync timestamp for a specific entity.
 */
export async function updateSyncTimestamp(
  userId: string,
  entity: string,
  timestamp?: number
): Promise<void> {
  try {
    const key = `${SYNC_TIMESTAMPS_KEY}:${userId}`;
    const stored = (await localforage.getItem<SyncTimestamps>(key)) || {};
    stored[entity] = timestamp || Date.now();
    await localforage.setItem(key, stored);
  } catch { /* silent */ }
}

/**
 * Resets all sync timestamps (forces full re-sync on next sync).
 */
export async function resetSyncTimestamps(userId: string): Promise<void> {
  try {
    const key = `${SYNC_TIMESTAMPS_KEY}:${userId}`;
    await localforage.removeItem(key);
  } catch { /* silent */ }
}

/**
 * Converts a timestamp (ms) to an ISO string with timezone for Supabase comparison.
 * Subtracts a buffer to avoid missing records due to clock skew.
 */
export function timestampToIso(ts: number | undefined, bufferMs = 5000): string | null {
  if (!ts) return null;
  // Subtract buffer to catch records that may have been missed at the boundary
  return new Date(ts - bufferMs).toISOString();
}

/**
 * Returns current time in milliseconds for use as a sync checkpoint.
 */
export function nowMs(): number {
  return Date.now();
}
