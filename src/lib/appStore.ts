/**
 * appStore.ts — Store atômico com seletores finos (padrão useSyncExternalStore).
 *
 * Por que existe: o AppContext guarda TODO o estado do app (aves, lotes, ovos, modais...).
 * Com useContext, qualquer mudança (ex.: registrar 1 ovo) re-renderiza todos os
 * componentes que leem o contexto — inclusive o Layout e a tela atual inteira.
 * Em celular fraco com muitas aves isso trava a interface.
 *
 * Com o store, cada componente assina só as chaves que usa (useAppSlice('birds', ...)).
 * Se a fatia não mudou (comparação rasa), o componente NÃO re-renderiza.
 *
 * Detalhe importante: várias ações do contexto são funções recriadas a cada render.
 * O store as troca por "wrappers estáveis" que sempre chamam a versão mais recente —
 * assim, pegar uma ação numa fatia nunca causa re-render e nunca usa closure velha.
 */

type Listener = () => void;
type AnyFn = (...args: any[]) => any;

export class AtomicStore<T extends object> {
  private raw: T | null = null;
  private derived: T | null = null;
  private stableFns = new Map<string, AnyFn>();
  private listeners = new Set<Listener>();

  private derive(next: T): T {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(next)) {
      const value = (next as Record<string, unknown>)[key];
      if (typeof value === 'function') {
        let wrapper = this.stableFns.get(key);
        if (!wrapper) {
          wrapper = (...args: any[]) => {
            const fn = (this.raw as Record<string, unknown> | null)?.[key];
            return typeof fn === 'function' ? (fn as AnyFn)(...args) : undefined;
          };
          this.stableFns.set(key, wrapper);
        }
        out[key] = wrapper;
      } else {
        out[key] = value;
      }
    }
    return out as T;
  }

  /** Semeia o estado inicial sem notificar (seguro durante o render). */
  init(next: T) {
    if (this.raw !== null) return;
    this.raw = next;
    this.derived = this.derive(next);
  }

  setState(next: T) {
    if (this.raw === next) return;
    this.raw = next;
    this.derived = this.derive(next);
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        console.error('[AtomicStore] Erro ao notificar listener:', e);
      }
    });
  }

  getState(): T | null {
    return this.derived;
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

/** Comparação rasa de alta velocidade para objetos e arrays. */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is((a as any)[key], (b as any)[key])) {
      return false;
    }
  }
  return true;
}
