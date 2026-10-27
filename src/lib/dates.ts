/**
 * dates.ts — Datas "só dia" (YYYY-MM-DD) no fuso LOCAL do aparelho.
 *
 * Por que existe: `new Date().toISOString().split('T')[0]` devolve a data em UTC.
 * No Brasil (UTC-3), depois das 21h isso já é "amanhã": ração, coletas de ovos,
 * vacinas e o "trato feito do dia" ficavam gravados no dia errado à noite.
 * Use sempre estas funções para datas de calendário.
 */

/** Converte um Date ou string para YYYY-MM-DD usando o fuso local. */
export function toLocalISO(d: Date | string): string {
  if (typeof d === 'string') {
    return normalizeDateToISO(d);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Normaliza qualquer formato de data (YYYY-MM-DD, ISO com T, DD/MM/YYYY, DD-MM-YYYY)
 * para a forma canônica YYYY-MM-DD no fuso local. Retorna string vazia se inválido ou nulo.
 */
export function normalizeDateToISO(value: unknown): string {
  if (!value) return '';
  const s = String(value).trim();
  if (!s) return '';

  // 1. Já está no formato canônico YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }

  // 2. Formato ISO com horário (ex: 2026-10-26T21:30:00.000Z)
  if (s.includes('T')) {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return s.slice(0, 10);
  }

  // 3. Formato brasileiro DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 4. Formato YYYY-MM-DD seguido de espaço/hora
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }

  // 5. Fallback para Date parse
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return s.slice(0, 10);
}

/** Hoje (YYYY-MM-DD) no fuso local. */
export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Formata YYYY-MM-DD (ou qualquer string de data) para DD/MM/AAAA no padrão brasileiro. */
export function formatDateBR(value: unknown): string {
  const iso = normalizeDateToISO(value);
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(value || '');
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
