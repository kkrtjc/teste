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
    if (d.includes('T')) {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        return toLocalISO(parsed);
      }
    }
    return d.slice(0, 10);
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Hoje (YYYY-MM-DD) no fuso local. */
export function todayLocalISO(): string {
  return toLocalISO(new Date());
}
