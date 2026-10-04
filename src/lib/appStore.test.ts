import { describe, it, expect, vi } from 'vitest';
import { AtomicStore, shallowEqual } from './appStore';

type S = { count: number; items: string[]; inc: () => number };

describe('shallowEqual', () => {
  it('compara objetos e arrays rasos', () => {
    const arr = [1];
    expect(shallowEqual({ a: 1, b: arr }, { a: 1, b: arr })).toBe(true);
    expect(shallowEqual({ a: 1, b: [1] }, { a: 1, b: [1] })).toBe(false);
    expect(shallowEqual([1, 2], [1, 2])).toBe(true);
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqual(null, null)).toBe(true);
  });
});

describe('AtomicStore', () => {
  it('init semeia sem notificar e não sobrescreve', () => {
    const store = new AtomicStore<S>();
    const listener = vi.fn();
    store.subscribe(listener);
    store.init({ count: 1, items: [], inc: () => 1 });
    store.init({ count: 99, items: [], inc: () => 1 });
    expect(store.getState()?.count).toBe(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('setState notifica apenas quando a referência muda', () => {
    const store = new AtomicStore<S>();
    const s1 = { count: 1, items: [], inc: () => 1 };
    store.init(s1);
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    store.setState(s1);
    expect(listener).not.toHaveBeenCalled();
    store.setState({ ...s1, count: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    store.setState({ ...s1, count: 3 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('funções viram wrappers estáveis que chamam sempre a versão mais nova', () => {
    const store = new AtomicStore<S>();
    store.init({ count: 0, items: [], inc: () => 1 });
    const wrapper = store.getState()!.inc;
    store.setState({ count: 0, items: [], inc: () => 2 });
    expect(store.getState()!.inc).toBe(wrapper);
    expect(wrapper()).toBe(2);
  });

  it('dados preservam identidade (permite comparação rasa por fatia)', () => {
    const items = ['a'];
    const store = new AtomicStore<S>();
    store.init({ count: 0, items, inc: () => 1 });
    store.setState({ count: 1, items, inc: () => 1 });
    expect(store.getState()!.items).toBe(items);
  });

  it('um listener com erro não impede os demais', () => {
    const store = new AtomicStore<S>();
    store.init({ count: 0, items: [], inc: () => 1 });
    const ok = vi.fn();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    store.subscribe(() => { throw new Error('x'); });
    store.subscribe(ok);
    store.setState({ count: 1, items: [], inc: () => 1 });
    expect(ok).toHaveBeenCalled();
    spy.mockRestore();
  });
});
