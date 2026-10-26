/**
 * Dinheiro em CENTAVOS INTEIROS. Nunca use float para somar valores: 0.1 + 0.2 !== 0.3.
 */

/** Teto de segurança por movimentação: R$ 10 milhões. Protege contra digitação errada e overflow. */
export const MAX_CENTS = 1_000_000_000;

/**
 * Converte texto digitado (pt-BR ou en) em centavos, sem passar por float.
 * Aceita: "1.234,56" · "1234,5" · "1234.56" · "R$ 50" · "50". Retorna null se inválido.
 */
export function parseMoneyToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input < 0) return null;
    return Math.round(input * 100);
  }
  let s = String(input).replace(/R\$/gi, '').replace(/\s+/g, '');
  if (!s || /[^0-9.,]/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let intPart: string;
  let fracPart = '';

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const idx = s.lastIndexOf(decimalSep);
    intPart = s.slice(0, idx).replace(/[.,]/g, '');
    fracPart = s.slice(idx + 1);
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.';
    const parts = s.split(sep);
    const isThousands = parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && sep === '.');
    if (isThousands) {
      intPart = parts.join('');
    } else {
      intPart = parts[0];
      fracPart = parts[1] ?? '';
    }
  } else {
    intPart = s;
  }

  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) return null;
  if (!intPart && !fracPart) return null;

  const reais = intPart ? Number(intPart) : 0;
  if (!Number.isSafeInteger(reais)) return null;
  let centavos = Number((fracPart + '00').slice(0, 2));
  // Arredonda pela 3ª casa (meio para cima), de forma determinística.
  if (fracPart.length > 2 && Number(fracPart[2]) >= 5) centavos += 1;

  const total = reais * 100 + centavos;
  return Number.isSafeInteger(total) ? total : null;
}

let brlFormatter: Intl.NumberFormat | null = null;

/** Formata centavos como "R$ 1.234,56". Formatter é cacheado (barato em aparelhos fracos). */
export function formatBRL(cents: number): string {
  if (!brlFormatter) {
    brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  const safe = Number.isFinite(cents) ? cents : 0;
  return brlFormatter.format(safe / 100);
}

/** Centavos como texto de campo editável: 123456 -> "1234,56". */
export function centsToInput(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100);
  const c = String(abs % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}${reais},${c}`;
}

export function sumCents(values: readonly number[]): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) total += values[i];
  return total;
}
