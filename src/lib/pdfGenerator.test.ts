import { describe, it, expect } from 'vitest';
import { generateBirdPdf } from './pdfGenerator';
import type { Bird, FarmSettings } from './AppContext';

describe('PDF Generation Engine (pdfGenerator.ts)', () => {
  const mockFarmSettings: FarmSettings = {
    name: 'Criatório Recanto dos Galos',
    responsible: 'João Criador',
    photo: '',
    phone: '11988887777\n[[PROFILE_META:{"city":"Sorocaba","state":"SP"}]]',
    email: 'criatorio@exemplo.com',
    city: 'Sorocaba',
    state: 'SP',
  };

  const mockBird: Bird = {
    id: 'bird-pdf-01',
    anilha: 'BR-2026-999',
    nome: 'Imperador',
    sexo: 'Macho',
    raca: 'Mura Brasileiro',
    baia: 'Baia Nobre 01',
    status: 'Reprodutor',
    origem: 'Criatório',
    dataNascimento: '2024-05-10',
    peso: '3.45',
    observacoes: 'Galo reprodutor de linhagem pura com excelente esporão.\n[[VITRINE:{"inVitrine":true,"price":"1500"}]]',
  };

  it('generates a valid application/pdf Blob successfully', async () => {
    const blob = await generateBirdPdf({
      bird: mockBird,
      farmSettings: mockFarmSettings,
      pai: null,
      mae: null,
      inbreeding: 0,
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(100);
  });

  it('handles birds with parents and calculated inbreeding rate', async () => {
    const mockPai: Bird = {
      id: 'pai-01',
      anilha: 'PAI-001',
      nome: 'Galo Pai',
      sexo: 'Macho',
      raca: 'Mura',
      baia: '01',
      status: 'Reprodutor',
    };

    const mockMae: Bird = {
      id: 'mae-01',
      anilha: 'MAE-001',
      nome: 'Matriz Mãe',
      sexo: 'Fêmea',
      raca: 'Mura',
      baia: '02',
      status: 'Matriz',
    };

    const blob = await generateBirdPdf({
      bird: mockBird,
      farmSettings: mockFarmSettings,
      pai: mockPai,
      mae: mockMae,
      inbreeding: 12.5,
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(100);
  });
});
