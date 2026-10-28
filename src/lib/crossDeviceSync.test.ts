import { describe, it, expect } from 'vitest';
import {
  isValidUuid,
  generateId,
  deterministicUuid,
  dedupeById,
} from './id';
import {
  parseBreedMeta,
  formatBreedDescricaoWithMeta,
  parseCoupleMeta,
  formatCoupleObjetivoWithMeta,
  parseProfilePhoneMeta,
  formatProfilePhoneWithMeta,
  parseBirdVitrine,
  formatBirdObservacoesWithVitrine,
  getDefaultBreedsForUser,
} from './AppContext';
import type { BirdMovement } from './sales/types';

describe('Cross-Device Identification & Deduplication (id.ts)', () => {
  it('generateId produces valid RFC-4122 v4 UUIDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(isValidUuid(id1)).toBe(true);
    expect(isValidUuid(id2)).toBe(true);
    expect(id1).not.toBe(id2);
  });

  it('deterministicUuid produces idempotent UUIDs on any device for identical seeds', () => {
    const seed = 'default-breed:user-123:rhode island red';
    const uuidPhone = deterministicUuid(seed);
    const uuidPc = deterministicUuid(seed);

    expect(uuidPhone).toBe(uuidPc);
    expect(isValidUuid(uuidPhone)).toBe(true);
    // Version 5 check (digit at index 14 is '5')
    expect(uuidPhone.charAt(14)).toBe('5');

    // Different seed produces different UUID
    const otherUuid = deterministicUuid('default-breed:user-456:rhode island red');
    expect(otherUuid).not.toBe(uuidPhone);
  });

  it('dedupeById preserves original order while updating to latest record', () => {
    const items = [
      { id: '1', name: 'Galo Antigo' },
      { id: '2', name: 'Galinha B' },
      { id: '1', name: 'Galo Atualizado' },
      { id: '3', name: 'Pintinho C' },
    ];

    const deduped = dedupeById(items);
    expect(deduped).toHaveLength(3);
    expect(deduped.map(i => i.id)).toEqual(['1', '2', '3']);
    // ID 1 should have received the updated name
    expect(deduped[0].name).toBe('Galo Atualizado');
  });
});

describe('Metadata Envelopes (AppContext)', () => {
  describe('Breed metadata envelope (descricao)', () => {
    it('serializes and parses ganhoGramasDia and conversaoAlimentar cleanly', () => {
      const cleanDesc = 'Raça de corte com crescimento rápido.';
      const formatted = formatBreedDescricaoWithMeta(cleanDesc, {
        ganhoGramasDia: 45.5,
        conversaoAlimentar: 1.85,
      });

      expect(formatted).toContain(cleanDesc);
      expect(formatted).toContain('[[BREED_META:');

      const parsed = parseBreedMeta(formatted);
      expect(parsed.cleanDescricao).toBe(cleanDesc);
      expect(parsed.meta.ganhoGramasDia).toBe(45.5);
      expect(parsed.meta.conversaoAlimentar).toBe(1.85);
    });

    it('handles legacy plain descriptions without metadata without errors', () => {
      const plain = 'Apenas uma descrição comum sem meta tags';
      const parsed = parseBreedMeta(plain);
      expect(parsed.cleanDescricao).toBe(plain);
      expect(parsed.meta.ganhoGramasDia).toBeUndefined();
      expect(parsed.meta.conversaoAlimentar).toBeUndefined();
    });

    it('handles empty or undefined descriptions', () => {
      const parsed = parseBreedMeta(undefined);
      expect(parsed.cleanDescricao).toBe('');
      expect(parsed.meta.ganhoGramasDia).toBeUndefined();
    });
  });

  describe('Couple metadata envelope (objetivo)', () => {
    it('serializes and deserializes femeaIds, cageName, raca, isHibrido and racaFemea', () => {
      const cleanObjetivo = 'Produzir aves de alta postura para 2026';
      const meta = {
        femeaIds: ['femea-1', 'femea-2', 'femea-3'],
        cageName: 'Gaiola Reprodução 04',
        raca: 'Indio Gigante',
        isHibrido: true,
        racaFemea: 'Sedosa do Japão',
      };

      const formatted = formatCoupleObjetivoWithMeta(cleanObjetivo, meta);
      expect(formatted).toContain(cleanObjetivo);
      expect(formatted).toContain('[[COUPLE_META:');

      const parsed = parseCoupleMeta(formatted);
      expect(parsed.cleanObjetivo).toBe(cleanObjetivo);
      expect(parsed.meta.femeaIds).toEqual(meta.femeaIds);
      expect(parsed.meta.cageName).toBe(meta.cageName);
      expect(parsed.meta.raca).toBe(meta.raca);
      expect(parsed.meta.isHibrido).toBe(true);
      expect(parsed.meta.racaFemea).toBe(meta.racaFemea);
    });

    it('falls back cleanly for pure objective strings', () => {
      const parsed = parseCoupleMeta('Apenas melhoramento genético');
      expect(parsed.cleanObjetivo).toBe('Apenas melhoramento genético');
      expect(parsed.meta.femeaIds).toBeUndefined();
      expect(parsed.meta.cageName).toBeUndefined();
      expect(parsed.meta.isHibrido).toBeUndefined();
    });
  });

  describe('Profile metadata envelope (phone)', () => {
    it('serializes and parses city, state, responsible and whatsapp in phone', () => {
      const cleanPhone = '11999998888';
      const meta = {
        city: 'Campinas',
        state: 'SP',
        responsible: 'Carlos Criador',
        whatsapp: '11999998888',
      };

      const formatted = formatProfilePhoneWithMeta(cleanPhone, meta);
      expect(formatted).toContain(cleanPhone);
      expect(formatted).toContain('[[PROFILE_META:');

      const parsed = parseProfilePhoneMeta(formatted);
      expect(parsed.cleanPhone).toBe(cleanPhone);
      expect(parsed.meta.city).toBe('Campinas');
      expect(parsed.meta.state).toBe('SP');
      expect(parsed.meta.responsible).toBe('Carlos Criador');
      expect(parsed.meta.whatsapp).toBe('11999998888');
    });

    it('parses raw phone string without envelope', () => {
      const parsed = parseProfilePhoneMeta('21987654321');
      expect(parsed.cleanPhone).toBe('21987654321');
      expect(parsed.meta.city).toBeUndefined();
      expect(parsed.meta.state).toBeUndefined();
    });
  });

  describe('Bird Vitrine & Dual-Channel Movement envelope (observacoes)', () => {
    it('serializes and parses movements and registration dates inside observacoes', () => {
      const cleanObs = 'Ave com excelente plumagem e esporão firme.';
      const movements: BirdMovement[] = [
        {
          id: 'mov-1',
          birdId: 'bird-abc',
          tipo: 'venda',
          data: '2026-10-27',
          motivo: 'venda',
          valorCentavos: 35000,
          snapshot: {
            anilha: 'BR-1234',
            nome: 'Campeão',
            raca: 'Indio Gigante',
            sexo: 'Macho',
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deviceId: 'device-test',
        },
      ];

      const formatted = formatBirdObservacoesWithVitrine(
        cleanObs,
        true,
        '400',
        'Destaque',
        {
          dataCadastro: '2026-01-15',
          movements,
        }
      );

      expect(formatted).toContain(cleanObs);
      expect(formatted).toContain('[[VITRINE:');

      const parsed = parseBirdVitrine(formatted);
      expect(parsed.cleanObservacoes).toBe(cleanObs);
      expect(parsed.inVitrine).toBe(true);
      expect(parsed.vitrinePrice).toBe('400');
      expect(parsed.vitrineStatus).toBe('Destaque');
      expect(parsed.dataCadastro).toBe('2026-01-15');
      expect(parsed.movements).toBeDefined();
      expect(parsed.movements).toHaveLength(1);
      expect(parsed.movements![0].tipo).toBe('venda');
      expect(parsed.movements![0].valorCentavos).toBe(35000);
    });
  });

  describe('Seed Breeds Partitioning (getDefaultBreedsForUser)', () => {
    it('allocates deterministic, per-user UUIDs for non-admin users to satisfy RLS and prevent duplication', () => {
      const userIdA = 'user-uuid-1111';
      const userIdB = 'user-uuid-2222';

      const breedsA = getDefaultBreedsForUser(userIdA, false);
      const breedsB = getDefaultBreedsForUser(userIdB, false);

      expect(breedsA.length).toBeGreaterThan(0);
      expect(breedsA.length).toBe(breedsB.length);

      // IDs for User A must all be valid UUIDs
      breedsA.forEach(b => expect(isValidUuid(b.id)).toBe(true));

      // User A and User B must receive different deterministic IDs (no primary key collisions)
      expect(breedsA[0].id).not.toBe(breedsB[0].id);

      // Re-running for User A must yield identical IDs (idempotent / no duplicate entries)
      const breedsA2 = getDefaultBreedsForUser(userIdA, false);
      expect(breedsA.map(b => b.id)).toEqual(breedsA2.map(b => b.id));
    });

    it('maintains canonical system UUIDs for admin users', () => {
      const adminBreeds = getDefaultBreedsForUser('admin-user', true);
      expect(adminBreeds.length).toBeGreaterThan(0);
      expect(adminBreeds[0].id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567001');
    });
  });
});
