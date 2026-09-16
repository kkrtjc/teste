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
  vitrineBirds?: Bird[];
  ownerId?: string;
  createdAt: string;
};

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

  // Salva no cache local do dispositivo
  try {
    await localforage.setItem(`@mura-manager:showcase:${shareId}`, payload);
  } catch (e) {
    console.warn('Erro ao salvar showcase no localforage:', e);
  }

  // Tenta publicar na API online do Cloudflare Worker (com timeout de 8s)
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

  // Retorna o link universal da ficha pública
  const baseUrl = window.location.origin;
  return `${baseUrl}/p/ave/${shareId}`;
}

/**
 * Busca os dados de uma ficha pública por ID (primeiro local, depois online)
 */
export async function fetchShowcase(id: string): Promise<PublicShowcaseData | null> {
  if (!id) return null;

  // 1. Tenta pegar do cache local
  try {
    const cached = await localforage.getItem<PublicShowcaseData>(`@mura-manager:showcase:${id}`);
    if (cached && cached.bird) {
      return cached;
    }
  } catch (e) {
    console.warn('Erro ao ler cache local de showcase:', e);
  }

  // 2. Busca na API online com timeout de segurança (7s)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(`${SHOWCASE_API_URL}/${id}`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.bird) {
        // Atualiza cache local
        localforage.setItem(`@mura-manager:showcase:${id}`, data).catch(() => {});
        return data;
      }
    }
  } catch (err) {
    console.error('Erro ao buscar showcase online:', err);
  }

  return null;
}

/**
 * Gera URL do QR Code estilizado em alta definição
 */
export function generateQrCodeUrl(targetUrl: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(targetUrl)}&bgcolor=121214&color=f59e0b&margin=8&qzone=2`;
}
