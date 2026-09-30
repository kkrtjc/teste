/**
 * Vaccination protocols for poultry (Brazil standard).
 * Each protocol defines when to apply a vaccine based on bird age in days.
 */

export interface VaccineProtocol {
  id: string;
  nome: string;           // Vaccine name
  descricao?: string;     // Brief description
  idadeAplicacaoDias: number; // Recommended age for first dose in days
  intervaloReforco?: number;  // Days until booster dose (if applicable)
  obrigatoria?: boolean;      // Considered essential
}

export const POULTRY_VACCINE_PROTOCOLS: VaccineProtocol[] = [
  {
    id: 'marek',
    nome: 'Marek',
    descricao: 'Aplicar com 1 dia de vida (pintinhos). Protege contra doença de Marek.',
    idadeAplicacaoDias: 1,
    obrigatoria: true,
  },
  {
    id: 'newcastle',
    nome: 'Newcastle',
    descricao: 'Aplicar com 7 dias. Reforço a cada 21 dias em lotes de postura.',
    idadeAplicacaoDias: 7,
    intervaloReforco: 21,
    obrigatoria: true,
  },
  {
    id: 'gumboro',
    nome: 'Gumboro (Bursite)',
    descricao: 'Aplicar aos 14 dias. Reforço aos 28 dias.',
    idadeAplicacaoDias: 14,
    intervaloReforco: 14,
    obrigatoria: true,
  },
  {
    id: 'bouba',
    nome: 'Bouba Aviária',
    descricao: 'Aplicar a partir dos 21 dias.',
    idadeAplicacaoDias: 21,
    obrigatoria: false,
  },
  {
    id: 'bronquite',
    nome: 'Bronquite Infecciosa',
    descricao: 'Aplicar aos 10 dias. Reforço aos 30 dias.',
    idadeAplicacaoDias: 10,
    intervaloReforco: 20,
    obrigatoria: false,
  },
  {
    id: 'laringotraqueite',
    nome: 'Laringotraqueíte',
    descricao: 'Aplicar a partir de 4 semanas em regiões de risco.',
    idadeAplicacaoDias: 28,
    obrigatoria: false,
  },
  {
    id: 'salmonela',
    nome: 'Salmonela',
    descricao: 'Recomendada para lotes de postura. Aplicar conforme protocolo do veterinário.',
    idadeAplicacaoDias: 42,
    obrigatoria: false,
  },
];

/**
 * Given lot age in days and applied vaccine IDs,
 * returns a list of suggestions: upcoming vaccines (next 7 days) and overdue ones.
 */
export function getVaccineSuggestions(
  lotAgeDays: number,
  appliedVaccineIds: string[]
): { overdue: VaccineProtocol[]; upcoming: VaccineProtocol[] } {
  const overdue: VaccineProtocol[] = [];
  const upcoming: VaccineProtocol[] = [];

  for (const v of POULTRY_VACCINE_PROTOCOLS) {
    // Skip if already applied (by protocol id)
    if (appliedVaccineIds.includes(v.id)) continue;

    const daysUntil = v.idadeAplicacaoDias - lotAgeDays;

    if (daysUntil < 0) {
      // Past due
      overdue.push(v);
    } else if (daysUntil <= 7) {
      // Due within 7 days
      upcoming.push(v);
    }
  }

  return { overdue, upcoming };
}
