import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Verifica se as chaves foram preenchidas com dados reais e não são placeholders
export const isSupabaseConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  !supabaseUrl.includes('placeholder') && 
  !supabaseUrl.includes('seu-projeto') &&
  !supabaseAnonKey.includes('placeholder') &&
  !supabaseAnonKey.includes('sua-chave');

// Limite seguro abaixo do teto de 64 KiB imposto pelos navegadores para requisições `keepalive`
const KEEPALIVE_MAX_BYTES = 58_000;

/**
 * Wrapper de transporte resiliente ao fechamento imediato do app/aba no celular.
 * Para mutações REST (POST/PATCH/PUT/DELETE) com payload compacto, ativa `keepalive: true`,
 * permitindo que a pilha de rede nativa do sistema operacional conclua o envio ao Supabase
 * mesmo se o usuário fechar o app milissegundos após salvar.
 */
const resilientFetch: typeof fetch = async (input, init) => {
  if (!init || typeof fetch === 'undefined') {
    return fetch(input, init);
  }
  const method = (init.method || 'GET').toUpperCase();
  const isMutation = method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE';

  if (isMutation && init.keepalive === undefined) {
    let bodyBytes = 0;
    if (typeof init.body === 'string') {
      bodyBytes = typeof Blob !== 'undefined' ? new Blob([init.body]).size : init.body.length * 2;
    } else if (init.body instanceof URLSearchParams) {
      bodyBytes = init.body.toString().length;
    } else if (init.body != null) {
      // FormData / Blob / ArrayBuffer (ex: upload de foto no Storage) -> usa fetch normal sem limite de 64KB
      bodyBytes = KEEPALIVE_MAX_BYTES + 1;
    }

    if (bodyBytes <= KEEPALIVE_MAX_BYTES) {
      try {
        return await fetch(input, { ...init, keepalive: true });
      } catch {
        // Fallback caso algum WebView antigo rejeite keepalive
        return fetch(input, init);
      }
    }
  }

  return fetch(input, init);
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined
      },
      global: {
        fetch: resilientFetch
      }
    })
  : null;
