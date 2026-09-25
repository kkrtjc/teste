import localforage from 'localforage';

/**
 * Dedicated IndexedDB instance for high-speed offline image storage.
 * Completely decoupled from app metadata storage to avoid quota collisions.
 */
const imageDb = localforage.createInstance({
  name: 'mura-manager',
  storeName: 'bird-images-cache'
});

// Fast in-memory cache for synchronous 0ms lookups during UI renders
const memoryCache = new Map<string, string>();
const pendingFetches = new Map<string, Promise<string | null>>();

/**
 * Synchronous memory cache check (0ms).
 */
export function getSyncCachedImage(urlOrKey?: string | null): string | null {
  if (!urlOrKey) return null;
  if (urlOrKey.startsWith('data:')) return urlOrKey;
  return memoryCache.get(urlOrKey) || null;
}

/**
 * Saves an image to the local device storage (IndexedDB) and in-memory cache.
 */
export async function cacheLocalBirdImage(keyOrUrl: string, dataUrl: string): Promise<void> {
  if (!keyOrUrl || !dataUrl) return;
  memoryCache.set(keyOrUrl, dataUrl);
  try {
    await imageDb.setItem(keyOrUrl, dataUrl);
  } catch (err) {
    console.warn('[ImageCache] Falha ao persistir imagem no IndexedDB:', err);
  }
}

/**
 * Retrieves a cached image:
 * 1. Checks in-memory cache (0ms)
 * 2. Checks IndexedDB (instant local disk read)
 * 3. If remote URL and not yet cached: downloads in background and caches locally for next time.
 */
export async function getCachedBirdImage(urlOrKey?: string | null): Promise<string | null> {
  if (!urlOrKey) return null;

  // Base64 already local
  if (urlOrKey.startsWith('data:')) {
    memoryCache.set(urlOrKey, urlOrKey);
    return urlOrKey;
  }

  // 1. In-memory check
  const inMem = memoryCache.get(urlOrKey);
  if (inMem) return inMem;

  // 2. IndexedDB local storage check
  try {
    const fromDb = await imageDb.getItem<string>(urlOrKey);
    if (fromDb) {
      memoryCache.set(urlOrKey, fromDb);
      return fromDb;
    }
  } catch (err) {
    console.warn('[ImageCache] Erro ao ler IndexedDB:', err);
  }

  // 3. If remote URL (Supabase CDN), fetch in background and persist locally
  if (urlOrKey.startsWith('http://') || urlOrKey.startsWith('https://')) {
    // Avoid duplicate parallel fetches for the same image
    if (pendingFetches.has(urlOrKey)) {
      return pendingFetches.get(urlOrKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const response = await fetch(urlOrKey, { mode: 'cors', cache: 'force-cache' });
        if (!response.ok) return urlOrKey;

        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (base64) {
          memoryCache.set(urlOrKey, base64);
          await imageDb.setItem(urlOrKey, base64);
          return base64;
        }
      } catch (e) {
        // If offline or network error, fallback to original URL (browser or service worker cache)
        return urlOrKey;
      } finally {
        pendingFetches.delete(urlOrKey);
      }
      return urlOrKey;
    })();

    pendingFetches.set(urlOrKey, fetchPromise);
    return fetchPromise;
  }

  return urlOrKey;
}

/**
 * Pre-caches images for a list of birds silently in the background when app is idle.
 */
export function preloadBirdImagesInBackground(birds: Array<{ id: string; imagem?: string; imagens?: string[] }>): void {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  const runPreload = () => {
    const urlsToCache: string[] = [];
    birds.forEach(b => {
      if (b.imagem && (b.imagem.startsWith('http://') || b.imagem.startsWith('https://'))) {
        if (!memoryCache.has(b.imagem)) urlsToCache.push(b.imagem);
      }
      if (Array.isArray(b.imagens)) {
        b.imagens.forEach(img => {
          if (img && (img.startsWith('http://') || img.startsWith('https://'))) {
            if (!memoryCache.has(img)) urlsToCache.push(img);
          }
        });
      }
    });

    const uniqueUrls = Array.from(new Set(urlsToCache)).slice(0, 50); // Batch up to 50 photos
    let index = 0;

    const processNext = () => {
      if (index >= uniqueUrls.length) return;
      const url = uniqueUrls[index++];
      getCachedBirdImage(url).catch(() => {});
      setTimeout(processNext, 120); // Small interval to leave CPU free for user gestures
    };

    setTimeout(processNext, 1500); // Wait for initial render to settle
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runPreload, { timeout: 4000 });
  } else {
    setTimeout(runPreload, 2000);
  }
}

/**
 * Clears cache for a specific URL or all images when requested.
 */
export async function clearCachedImage(urlOrKey: string): Promise<void> {
  memoryCache.delete(urlOrKey);
  try {
    await imageDb.removeItem(urlOrKey);
  } catch {}
}
