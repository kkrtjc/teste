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

/**
 * Normaliza o valor digitado no input de moeda:
 * - Troca ponto por vírgula
 * - Aceita somente dígitos e vírgula
 * - Garante apenas 1 vírgula
 * - Limita a 2 casas decimais após a vírgula
 */
export function sanitizeMoneyInput(raw: string): string {
  if (!raw) return '';
  let s = raw.replace(/\./g, ',').replace(/[^0-9,]/g, '');
  const parts = s.split(',');
  if (parts.length > 2) {
    s = `${parts[0]},${parts.slice(1).join('')}`;
  }
  const commaIdx = s.indexOf(',');
  if (commaIdx >= 0) {
    const intPart = s.slice(0, commaIdx);
    const decPart = s.slice(commaIdx + 1).slice(0, 2);
    s = `${intPart},${decPart}`;
  }
  return s;
}

/**
 * Ao perder o foco (onBlur), formata com duas casas decimais limpas (ex: "150" -> "150,00").
 */
export function formatMoneyOnBlur(raw: string): string {
  if (!raw || !raw.trim()) return '';
  const cents = parseMoneyToCents(raw);
  if (cents === null || cents === 0) return '0,00';
  const reais = Math.floor(cents / 100);
  const centavos = String(cents % 100).padStart(2, '0');
  return `${reais},${centavos}`;
}

/**
 * Extrai e formata o preço cadastrado previamente na ave (valorEstimado ou vitrinePrice).
 */
export function getBirdPredefinedPrice(bird: any): string {
  if (!bird) return '';
  if (bird.valorEstimado !== undefined && bird.valorEstimado !== null && bird.valorEstimado !== '') {
    const num = Number(bird.valorEstimado);
    if (!isNaN(num) && num > 0) {
      return num.toFixed(2).replace('.', ',');
    }
  }
  if (bird.vitrinePrice) {
    const cents = parseMoneyToCents(bird.vitrinePrice);
    if (cents !== null && cents > 0) {
      const reais = Math.floor(cents / 100);
      const centavos = String(cents % 100).padStart(2, '0');
      return `${reais},${centavos}`;
    }
  }
  return '';
}

/**
 * Higieniza o campo de contato telefônico/WhatsApp aceitando SOMENTE números
 * e aplicando máscara brasileira dinâmica (XX) XXXXX-XXXX.
 */
export function formatPhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Garante extração segura de centavos de uma movimentação (mesmo legado, string ou objeto antigo).
 * Retorna sempre um número inteiro >= 0, NUNCA NaN ou undefined.
 */
export function getMovementCents(m: any): number {
  if (!m) return 0;
  if (typeof m.valorCentavos === 'number' && Number.isFinite(m.valorCentavos)) {
    return Math.max(0, Math.round(m.valorCentavos));
  }
  if (m.valorCentavos !== undefined && m.valorCentavos !== null) {
    const n = Number(m.valorCentavos);
    if (Number.isFinite(n)) return Math.max(0, Math.round(n));
  }
  if (m.valor_centavos !== undefined && m.valor_centavos !== null) {
    const n = Number(m.valor_centavos);
    if (Number.isFinite(n)) return Math.max(0, Math.round(n));
  }
  // Fallbacks de migração para registros legados que tinham valor em reais
  if (m.valor !== undefined && m.valor !== null) {
    const c = parseMoneyToCents(m.valor);
    if (c !== null) return c;
  }
  if (m.valorVenda !== undefined && m.valorVenda !== null) {
    const c = parseMoneyToCents(m.valorVenda);
    if (c !== null) return c;
  }
  return 0;
}
