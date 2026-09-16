import localforage from 'localforage';
import type { Bird } from './AppContext';

export const SHOWCASE_API_URL = 'https://mura-api.joaopaulojaguar.workers.dev/api/showcase';

export type PublicShowcaseData = {
  id: string;
  bird: Bird;
  farmSettings?: {
    name?: string;
    responsible?: string;
    phone?: string;
    city?: string;
    state?: string;
    logo?: string;
    whatsapp?: string;
  };
  pai?: Bird | null;
  mae?: Bird | null;
  inbreeding?: number;
  mode: 'private' | 'public';
  vitrineBirds?: (Partial<Bird> & { id: string; anilha: string })[];
  ownerId?: string;
  createdAt: string;
};

/**
 * Publica os dados da ficha da ave na API e guarda cópia local
 */
/**
 * Publica os dados da ficha da ave na API e guarda cópia local
 */
export async function publishShowcase(data: PublicShowcaseData): Promise<string> {
  const shareId = data.id || `ave-${Date.now()}`;
  const payload: PublicShowcaseData = {
    ...data,
    id: shareId,
    createdAt: data.createdAt || new Date().toISOString()
  };

  // Salva no cache local do dispositivo imediatamente
  try {
    await localforage.setItem(`@mura-manager:showcase:${shareId}`, payload);
  } catch (e) {
    console.warn('Erro ao salvar showcase no localforage:', e);
  }

  // Publica na API online do Cloudflare Worker (timeout de 8s)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    await fetch(SHOWCASE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (err) {
    console.warn('Erro ao enviar showcase para a API online:', err);
  }

  // Retorna o link universal da ficha pública com parâmetro explícito do modo
  const baseUrl = window.location.origin;
  const modeParam = data.mode === 'public' ? '?modo=vitrine' : '?modo=privado';
  return `${baseUrl}/p/ave/${shareId}${modeParam}`;
}

/**
 * Busca os dados de uma ficha pública por ID (busca online prioritária com fallback para cache local)
 */
export async function fetchShowcase(id: string): Promise<PublicShowcaseData | null> {
  if (!id) return null;

  // Verifica se há parâmetro de URL explícito (?modo=vitrine ou ?modo=privado)
  let urlMode: 'private' | 'public' | null = null;
  try {
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const modo = params.get('modo');
      if (modo === 'vitrine' || modo === 'public') urlMode = 'public';
      else if (modo === 'privado' || modo === 'private') urlMode = 'private';
    }
  } catch {}

  // 1. Tenta buscar da API online primeiro para garantir os dados mais recentes
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${SHOWCASE_API_URL}/${id}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data: PublicShowcaseData = await res.json();
      if (data && data.bird) {
        if (urlMode) data.mode = urlMode;
        // Atualiza cache local com os dados mais frescos
        localforage.setItem(`@mura-manager:showcase:${id}`, data).catch(() => {});
        return data;
      }
    }
  } catch (err) {
    console.warn('Busca online falhou ou timeout, tentando cache local:', err);
  }

  // 2. Fallback: Lê do cache local (offline ou se a rede falhar)
  try {
    const cached = await localforage.getItem<PublicShowcaseData>(`@mura-manager:showcase:${id}`);
    if (cached && cached.bird) {
      if (urlMode) cached.mode = urlMode;
      return cached;
    }
  } catch (e) {
    console.warn('Erro ao ler cache local de showcase:', e);
  }

  return null;
}

/**
 * Gera URL do QR Code estilizado em alta definição
 */
export function generateQrCodeUrl(targetUrl: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(targetUrl)}&bgcolor=121214&color=f59e0b&margin=8&qzone=2`;
}
