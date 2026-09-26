/**
 * Utilitário de Síntese de Voz para o Assistente Inteligente Mura IA
 * Suporta Web Speech API com fallback seguro, seleção de voz pt-BR e controle de mudo.
 */

const MUTED_STORAGE_KEY = '@mura-manager:assistant-muted';

let currentUtterance: SpeechSynthesisUtterance | null = null;
let cachedVoice: SpeechSynthesisVoice | null = null;

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function isVoiceMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setVoiceMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MUTED_STORAGE_KEY, muted ? 'true' : 'false');
  } catch {}
}

/**
 * Seleciona a melhor voz em Português disponível no dispositivo do usuário
 */
function getBestPtVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) return null;
  if (cachedVoice) return cachedVoice;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Vozes pt-BR de alta fidelidade
  const ptBrVoices = voices.filter(v => v.lang === 'pt-BR' || v.lang === 'pt_BR');
  const preferredNames = ['Google', 'Luciana', 'Maria', 'Daniel', 'Felipe', 'Heloisa', 'Francisca', 'Portuguese'];

  for (const name of preferredNames) {
    const match = ptBrVoices.find(v => v.name.includes(name));
    if (match) {
      cachedVoice = match;
      return match;
    }
  }

  if (ptBrVoices.length > 0) {
    cachedVoice = ptBrVoices[0];
    return ptBrVoices[0];
  }

  // 2. Qualquer voz em português (ex: pt-PT)
  const anyPt = voices.find(v => v.lang.startsWith('pt'));
  if (anyPt) {
    cachedVoice = anyPt;
    return anyPt;
  }

  return null;
}

// Inicializa a lista de vozes assim que estiver pronta no navegador
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    getBestPtVoice();
  };
}

/**
 * Limpa marcadores Markdown e caracteres especiais para a fala soar 100% natural
 */
export function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // remove **negrito**
    .replace(/\*(.*?)\*/g, '$1')     // remove *itálico*
    .replace(/[`_#~]/g, '')           // remove símbolos markdown
    .replace(/[🐓🥚🥩⚔️🌸📍⚠️👑✨⏱️⚖️✓👇👉]/g, '') // remove emojis da leitura
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fala o texto em voz alta com velocidade calibrada para compreensão zootécnica
 */
export function speakAssistant(
  text: string,
  callbacks?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): void {
  if (!isSpeechSupported()) {
    callbacks?.onEnd?.();
    return;
  }

  stopAssistantSpeech();

  if (isVoiceMuted()) {
    callbacks?.onEnd?.();
    return;
  }

  try {
    const clean = cleanTextForSpeech(text);
    if (!clean) {
      callbacks?.onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    currentUtterance = utterance;

    utterance.lang = 'pt-BR';
    utterance.rate = 1.02; // Cadência natural, sem pressa
    utterance.pitch = 1.0;

    const voice = getBestPtVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      callbacks?.onStart?.();
    };

    utterance.onend = () => {
      currentUtterance = null;
      callbacks?.onEnd?.();
    };

    utterance.onerror = (e) => {
      currentUtterance = null;
      // 'canceled' ou 'interrupted' são normais ao trocar de passo
      callbacks?.onError?.(e);
      callbacks?.onEnd?.();
    };

    // Pequeno timeout para contornar bug do Safari onde speechSynthesis congela
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        callbacks?.onEnd?.();
      }
    }, 50);

  } catch (err) {
    callbacks?.onEnd?.();
  }
}

/**
 * Verifica se há áudio da assistente sendo falado no momento
 */
export function isCurrentlySpeaking(): boolean {
  return currentUtterance !== null;
}

/**
 * Interrompe imediatamente qualquer fala em andamento (0ms de atraso)
 */
export function stopAssistantSpeech(): void {
  if (!isSpeechSupported()) return;
  try {
    currentUtterance = null;
    window.speechSynthesis.cancel();
  } catch {}
}
