import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateInbreedingCoefficient,
  calculatePairInbreeding,
  findRelatedBirds,
  clearGenealogyCache,
} from './genealogy';
import type { Bird } from './AppContext';

describe('Genealogy Engine (genealogy.ts)', () => {
  beforeEach(() => {
    clearGenealogyCache();
  });

  const baseBird = (id: string, sexo: 'Macho' | 'Fêmea', paiId?: string, maeId?: string): Bird => ({
    id,
    anilha: `ANILHA-${id}`,
    nome: `Ave ${id}`,
    sexo,
    raca: 'Mura',
    baia: '01',
    status: 'Reprodutor',
    paiId,
    maeId,
    isPaiExterno: false,
    isMaeExterno: false,
  });

  describe('Wright Inbreeding Coefficient (calculateInbreedingCoefficient)', () => {
    it('returns 0% for birds with no known ancestors', () => {
      const birds: Bird[] = [
        baseBird('b1', 'Macho'),
        baseBird('b2', 'Fêmea'),
      ];
      expect(calculateInbreedingCoefficient('b1', birds)).toBe(0);
      expect(calculateInbreedingCoefficient('b2', birds)).toBe(0);
    });

    it('returns 0% for offspring of completely unrelated parents', () => {
      const birds: Bird[] = [
        baseBird('p1', 'Macho'),
        baseBird('m1', 'Fêmea'),
        baseBird('f1', 'Macho', 'p1', 'm1'),
      ];
      expect(calculateInbreedingCoefficient('f1', birds)).toBe(0);
    });

    it('returns 25% inbreeding for brother-sister mating', () => {
      // Common grandparents: P0 and M0
      // Parents: P1 and M1 are full siblings (both have P0, M0)
      // Offspring: Child has parents P1 and M1
      const birds: Bird[] = [
        baseBird('p0', 'Macho'),
        baseBird('m0', 'Fêmea'),
        baseBird('p1', 'Macho', 'p0', 'm0'),
        baseBird('m1', 'Fêmea', 'p0', 'm0'),
        baseBird('child', 'Macho', 'p1', 'm1'),
      ];

      const f = calculateInbreedingCoefficient('child', birds);
      // Brother x sister mating gives F = 25%
      expect(f).toBeCloseTo(25, 1);
    });

    it('returns 25% inbreeding for parent-offspring mating (Father x Daughter)', () => {
      // P0 and M0 mate -> produce D1 (Daughter)
      // P0 mates with his daughter D1 -> produces InbredChild
      const birds: Bird[] = [
        baseBird('p0', 'Macho'),
        baseBird('m0', 'Fêmea'),
        baseBird('d1', 'Fêmea', 'p0', 'm0'),
        baseBird('inbred', 'Macho', 'p0', 'd1'),
      ];

      const f = calculateInbreedingCoefficient('inbred', birds);
      // Father x daughter mating gives F = 25%
      expect(f).toBeCloseTo(25, 1);
    });

    it('returns 12.5% inbreeding for half-sibling mating', () => {
      // Common father P0, different mothers M1 and M2
      // Offspring: Child has parents P1 (P0, M1) and M_half (P0, M2)
      const birds: Bird[] = [
        baseBird('p0', 'Macho'),
        baseBird('m1', 'Fêmea'),
        baseBird('m2', 'Fêmea'),
        baseBird('p1', 'Macho', 'p0', 'm1'),
        baseBird('m_half', 'Fêmea', 'p0', 'm2'),
        baseBird('child_half', 'Macho', 'p1', 'm_half'),
      ];

      const f = calculateInbreedingCoefficient('child_half', birds);
      expect(f).toBeCloseTo(12.5, 1);
    });

    it('safely handles circular pedigree loops without infinite recursion', () => {
      // Malformed or looped data: A is father of B, B is father of A
      const birds: Bird[] = [
        baseBird('loopA', 'Macho', 'loopB', 'unrelatedM'),
        baseBird('loopB', 'Macho', 'loopA', 'unrelatedM'),
        baseBird('unrelatedM', 'Fêmea'),
        baseBird('child', 'Macho', 'loopA', 'unrelatedM'),
      ];

      // Must complete and return a number without RangeError / Maximum call stack exceeded
      expect(() => calculateInbreedingCoefficient('child', birds)).not.toThrow();
    });

    it('uses LRU cache for subsequent calls', () => {
      const birds: Bird[] = [
        baseBird('p0', 'Macho'),
        baseBird('m0', 'Fêmea'),
        baseBird('p1', 'Macho', 'p0', 'm0'),
        baseBird('m1', 'Fêmea', 'p0', 'm0'),
        baseBird('c1', 'Macho', 'p1', 'm1'),
      ];

      const first = calculateInbreedingCoefficient('c1', birds);
      const cached = calculateInbreedingCoefficient('c1', birds);
      expect(first).toBe(cached);
    });
  });

  describe('Projected Pair Inbreeding (calculatePairInbreeding)', () => {
    it('simulates hypothetical mating between brother and sister accurately', () => {
      const birds: Bird[] = [
        baseBird('p0', 'Macho'),
        baseBird('m0', 'Fêmea'),
        baseBird('brother', 'Macho', 'p0', 'm0'),
        baseBird('sister', 'Fêmea', 'p0', 'm0'),
      ];

      const projectedF = calculatePairInbreeding('brother', 'sister', birds);
      expect(projectedF).toBeCloseTo(25, 1);
    });

    it('returns 0% for unrelated pair', () => {
      const birds: Bird[] = [
        baseBird('machoA', 'Macho'),
        baseBird('femeaB', 'Fêmea'),
      ];

      const projectedF = calculatePairInbreeding('machoA', 'femeaB', birds);
      expect(projectedF).toBe(0);
    });
  });

  describe('Relationship Discovery (findRelatedBirds)', () => {
    it('identifies parents, siblings, and offspring correctly', () => {
      const pai = baseBird('pai', 'Macho');
      const mae = baseBird('mae', 'Fêmea');
      const target = baseBird('target', 'Macho', 'pai', 'mae');
      const irmao = baseBird('irmao', 'Macho', 'pai', 'mae');
      const filho = baseBird('filho', 'Macho', 'target', 'maeExterna');

      const birds: Bird[] = [pai, mae, target, irmao, filho];
      const related = findRelatedBirds(target, birds);

      const relationships = related.map(r => ({
        id: r.bird.id,
        relationship: r.relationship,
        group: r.relationshipGroup,
        share: r.geneticsSharePercent,
      }));

      expect(relationships).toContainEqual({
        id: 'pai',
        relationship: 'Pai',
        group: 'Pais',
        share: 50,
      });

      expect(relationships).toContainEqual({
        id: 'mae',
        relationship: 'Mãe',
        group: 'Pais',
        share: 50,
      });

      expect(relationships).toContainEqual({
        id: 'irmao',
        relationship: 'Irmão Pleno',
        group: 'Irmãos',
        share: 50,
      });

      expect(relationships).toContainEqual({
        id: 'filho',
        relationship: 'Filho',
        group: 'Filhos',
        share: 50,
      });
    });
  });
});
