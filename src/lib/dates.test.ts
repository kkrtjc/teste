import { describe, it, expect } from 'vitest';
import { toLocalISO, todayLocalISO } from './dates';

describe('dates module', () => {
  it('formata datas para YYYY-MM-DD usando horário local', () => {
    // 5 de janeiro de 2026
    const d1 = new Date(2026, 0, 5, 23, 45, 0);
    expect(toLocalISO(d1)).toBe('2026-01-05');

    // 29 de fevereiro de ano bissexto (2024)
    const d2 = new Date(2024, 1, 29, 10, 0, 0);
    expect(toLocalISO(d2)).toBe('2024-02-29');

    // 31 de dezembro
    const d3 = new Date(2025, 11, 31, 23, 59, 59);
    expect(toLocalISO(d3)).toBe('2025-12-31');
  });

  it('aceita strings ISO parciais ou inválidas defensivamente', () => {
    expect(toLocalISO('2026-05-12')).toBe('2026-05-12');
    expect(toLocalISO('2026-08-20T15:30:00Z')).toBe('2026-08-20');
  });

  it('todayLocalISO retorna o dia de hoje no formato YYYY-MM-DD', () => {
    const today = todayLocalISO();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const now = new Date();
    const expectedYear = now.getFullYear();
    const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');
    const expectedDay = String(now.getDate()).padStart(2, '0');
    expect(today).toBe(`${expectedYear}-${expectedMonth}-${expectedDay}`);
  });
});
