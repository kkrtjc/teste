import { supabase, isSupabaseConfigured } from './supabaseClient';
import { compressImageToBlob } from './imageCompression';
import { cacheLocalBirdImage } from './birdImageCache';

const BUCKET_NAME = 'birds';

/**
 * Checks if a string is already a remote URL (Supabase CDN, external URL) rather than local base64.
 */
export function isStorageUrl(url?: string | null): boolean {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Uploads a bird photo to Supabase Storage.
 *
 * Benefits:
 * - Stored in Supabase CDN bucket rather than bloating the PostgreSQL database rows
 * - Fast loading and cached on the user's mobile device
 * - Returns a public CDN URL (e.g., https://.../birds/userId/birdId_0.webp)
 *
 * Local First Guarantee:
 * - Always saves the compressed local version directly in the client device's IndexedDB.
 * - The device that took the photo will NEVER need to download it from the cloud.
 */
export async function uploadBirdPhoto(
  photo: string | File,
  userId: string,
  birdId: string,
  photoIndex = 0
): Promise<string> {
  // If it's already a remote CDN URL, no re-upload needed
  if (typeof photo === 'string' && isStorageUrl(photo)) {
    return photo;
  }

  let localDataUrl = typeof photo === 'string' && photo.startsWith('data:') ? photo : '';

  // If Supabase is not configured or client is offline, keep as-is (base64)
  if (!isSupabaseConfigured || !supabase || !navigator.onLine || !userId) {
    if (localDataUrl) {
      cacheLocalBirdImage(`bird_local:${birdId}_${photoIndex}`, localDataUrl).catch(() => {});
    }
    return typeof photo === 'string' ? photo : '';
  }

  try {
    const { blob, mimeType } = await compressImageToBlob(photo, 1000, 1000, 0.80);
    const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
    const cleanBirdId = birdId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${userId}/${cleanBirdId}_${photoIndex}_${Date.now()}.${ext}`;

    // Se ainda não tinha dataUrl (ex: era File), converte o blob para salvar no cache local do aparelho
    if (!localDataUrl) {
      localDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    }

    if (localDataUrl) {
      cacheLocalBirdImage(`bird_local:${birdId}_${photoIndex}`, localDataUrl).catch(() => {});
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 ano de cache CDN
        upsert: true
      });

    if (error) {
      console.warn('[Storage] Upload para Supabase Storage falhou, mantendo base64 defensivo:', error.message);
      return localDataUrl || (typeof photo === 'string' ? photo : '');
    }

    if (data?.path) {
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        // Vincula a URL pública diretamente ao arquivo local no aparelho do usuário
        if (localDataUrl) {
          cacheLocalBirdImage(publicData.publicUrl, localDataUrl).catch(() => {});
        }
        return publicData.publicUrl;
      }
    }

    return localDataUrl || (typeof photo === 'string' ? photo : '');
  } catch (err) {
    console.warn('[Storage] Falha não-bloqueante no upload para o storage:', err);
    return localDataUrl || (typeof photo === 'string' ? photo : '');
  }
}

/**
 * Uploads a breed photo to Supabase Storage.
 */
export async function uploadBreedPhoto(
  photo: string | File,
  userId: string,
  breedId: string
): Promise<string> {
  if (typeof photo === 'string' && isStorageUrl(photo)) {
    return photo;
  }

  let localDataUrl = typeof photo === 'string' && photo.startsWith('data:') ? photo : '';

  if (!isSupabaseConfigured || !supabase || !navigator.onLine || !userId) {
    if (localDataUrl) {
      cacheLocalBirdImage(`breed_local:${breedId}`, localDataUrl).catch(() => {});
    }
    return typeof photo === 'string' ? photo : '';
  }

  try {
    const { blob, mimeType } = await compressImageToBlob(photo, 800, 800, 0.80);
    const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
    const cleanBreedId = breedId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = `${userId}/breeds/${cleanBreedId}_${Date.now()}.${ext}`;

    if (!localDataUrl) {
      localDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    }

    if (localDataUrl) {
      cacheLocalBirdImage(`breed_local:${breedId}`, localDataUrl).catch(() => {});
    }

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: true
      });

    if (error) {
      console.warn('[Storage] Upload da foto da raça falhou, mantendo base64:', error.message);
      return localDataUrl || (typeof photo === 'string' ? photo : '');
    }

    if (data?.path) {
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        if (localDataUrl) {
          cacheLocalBirdImage(publicData.publicUrl, localDataUrl).catch(() => {});
        }
        return publicData.publicUrl;
      }
    }

    return localDataUrl || (typeof photo === 'string' ? photo : '');
  } catch (err) {
    console.warn('[Storage] Falha no upload da foto da raça:', err);
    return localDataUrl || (typeof photo === 'string' ? photo : '');
  }
}

/**
 * Uploads farm logo/photo to Supabase Storage.
 */
export async function uploadFarmLogo(
  photo: string | File,
  userId: string
): Promise<string> {
  if (typeof photo === 'string' && isStorageUrl(photo)) {
    return photo;
  }

  if (!isSupabaseConfigured || !supabase || !navigator.onLine || !userId) {
    return typeof photo === 'string' ? photo : '';
  }

  try {
    const { blob, mimeType } = await compressImageToBlob(photo, 500, 500, 0.82);
    const ext = mimeType.includes('webp') ? 'webp' : 'jpg';
    const filePath = `${userId}/profile/logo_${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, blob, {
        contentType: mimeType,
        cacheControl: '31536000',
        upsert: true
      });

    if (error) {
      console.warn('[Storage] Upload do logo falhou, mantendo base64:', error.message);
      return typeof photo === 'string' ? photo : '';
    }

    if (data?.path) {
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        return publicData.publicUrl;
      }
    }

    return typeof photo === 'string' ? photo : '';
  } catch (err) {
    console.warn('[Storage] Falha no upload do logo:', err);
    return typeof photo === 'string' ? photo : '';
  }
}
