import { describe, it, expect } from 'vitest';
import {
  computeMeatLotEconomics, computeEggLotEconomics, parseWeightToGrams, parseBRNumber, periodCutoff,
} from './lotEconomics';
import type { MeatLot, EggLot } from './AppContext';

const TODAY = '2026-10-04';

function meatLot(over: Partial<MeatLot> = {}): MeatLot {
  return {
    id: 'm1', baia: '1', avesIds: [], dataInicio: '2026-09-05', status: 'Crescimento',
    qtdAves: 95, pesoMedioInicial: '50g',
    ...over,
  };
}

describe('parseBRNumber', () => {
  it('aceita formatos brasileiros e internacionais', () => {
    expect(parseBRNumber('1.234,56')).toBeCloseTo(1234.56);
    expect(parseBRNumber('12,5')).toBe(12.5);
    expect(parseBRNumber('12.5')).toBe(12.5);
    expect(parseBRNumber('R$ 30')).toBe(30);
    expect(Number.isNaN(parseBRNumber(''))).toBe(true);
  });
});

describe('parseWeightToGrams', () => {
  it('interpreta unidades e números soltos', () => {
    expect(parseWeightToGrams('45g')).toBe(45);
    expect(parseWeightToGrams('1,2 kg')).toBe(1200);
    expect(parseWeightToGrams('2.4')).toBe(2400);
    expect(parseWeightToGrams('850')).toBe(850);
    expect(parseWeightToGrams('')).toBeNull();
    expect(parseWeightToGrams(undefined)).toBeNull();
  });
});

describe('periodCutoff', () => {
  it('calcula início do mês e janela de 30 dias', () => {
    const d = new Date(2026, 9, 4, 12);
    expect(periodCutoff('tudo', d)).toBeNull();
    expect(periodCutoff('mes', d)).toBe('2026-10-01');
    expect(periodCutoff('30d', d)).toBe('2026-09-05');
  });
});

describe('computeMeatLotEconomics', () => {
  it('lote vazio não inventa números', () => {
    const e = computeMeatLotEconomics(meatLot(), TODAY);
    expect(e.custoTotal).toBe(0);
    expect(e.temDados).toBe(false);
    expect(e.lucroProjetado).toBeNull();
    expect(e.custoPorAve).toBeNull();
  });

  it('reconstrói plantel inicial e mortalidade a partir das movimentações', () => {
    const e = computeMeatLotEconomics(meatLot({
      qtdAves: 90,
      movimentacoes: [
        { id: 'a', tipo: 'saida', quantidade: 5, motivo: 'Mortalidade / Óbito', data: '2026-09-10' },
        { id: 'b', tipo: 'saida', quantidade: 5, motivo: 'Venda', data: '2026-09-20' },
      ],
    }), TODAY);
    expect(e.avesIniciais).toBe(100);
    expect(e.mortes).toBe(5);
    expect(e.mortalidadePct).toBeCloseTo(5);
    expect(e.avesVendidasOuAbatidas).toBe(5);
  });

  it('calcula custo, lucro previsto, conversão e ponto de equilíbrio', () => {
    const lot = meatLot({
      qtdAves: 100,
      pesoMedioInicial: '50g',
      feedEntries: [
        { id: 'f1', data: '2026-09-10', kgRacao: 200, custoKg: 2.5, totalCusto: 500 },
        { id: 'f2', data: '2026-09-25', kgRacao: 100, custoKg: 3, totalCusto: 300 },
      ],
      custosExtras: [{ id: 'c1', data: '2026-09-05', categoria: 'Aquisição de aves', valor: 400 }],
      pesagens: [
        { id: 'p1', data: '2026-09-20', pesoMedioG: 900 },
        { id: 'p2', data: '2026-10-01', pesoMedioG: 1550 },
      ],
      precoVendaKg: 10,
    });
    const e = computeMeatLotEconomics(lot, TODAY);
    expect(e.custoRacao).toBe(800);
    expect(e.custoTotal).toBe(1200);
    expect(e.kgRacao).toBe(300);
    expect(e.pesoAtualG).toBe(1550);
    expect(e.biomassaAtualKg).toBeCloseTo(155);
    expect(e.receitaProjetada).toBeCloseTo(1550);
    expect(e.lucroProjetado).toBeCloseTo(350);
    expect(e.custoPorAve).toBeCloseTo(12);
    expect(e.custoPorKg).toBeCloseTo(1200 / 155);
    expect(e.conversaoAlimentar).toBeCloseTo(300 / 150);
    expect(e.pontoEquilibrioKg).toBeCloseTo(1200 / 155);
    expect(e.breakdown[0]).toEqual({ label: 'Ração', valor: 800 });
    expect(e.diasLote).toBe(30);
  });

  it('considera vendas realizadas no resultado', () => {
    const e = computeMeatLotEconomics(meatLot({
      qtdAves: 0, status: 'Abatido',
      feedEntries: [{ id: 'f', data: '2026-09-10', kgRacao: 100, custoKg: 3, totalCusto: 300 }],
      vendas: [{ id: 'v', data: '2026-10-01', valorTotal: 1000, quantidadeAves: 50, kgTotal: 120 }],
    }), TODAY);
    expect(e.receitaRealizada).toBe(1000);
    expect(e.lucroProjetado).toBe(700);
    expect(e.receitaProjetada).toBe(0);
  });

  it('memoiza por referência e recalcula quando o lote muda', () => {
    const lot = meatLot({ feedEntries: [{ id: 'f', data: TODAY, kgRacao: 10, custoKg: 2, totalCusto: 20 }] });
    const a = computeMeatLotEconomics(lot, TODAY);
    expect(computeMeatLotEconomics(lot, TODAY)).toBe(a);
    const edited = { ...lot, feedEntries: [...(lot.feedEntries || []), { id: 'g', data: TODAY, kgRacao: 5, custoKg: 2, totalCusto: 10 }] };
    expect(computeMeatLotEconomics(edited, TODAY).custoTotal).toBe(30);
  });

  it('aguenta lotes grandes rapidamente (celular fraco)', () => {
    const feed = Array.from({ length: 5000 }, (_, i) => ({ id: `f${i}`, data: '2026-09-10', kgRacao: 1, custoKg: 2, totalCusto: 2 }));
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) computeMeatLotEconomics(meatLot({ id: `m${i}`, feedEntries: feed }), TODAY);
    expect(performance.now() - t0).toBeLessThan(1500);
  });
});

describe('computeEggLotEconomics', () => {
  const lot: EggLot = {
    id: 'e1', baia: '2', femeasIds: [], dataInicio: '2026-08-01', status: 'Ativo',
    registros: [
      { id: 'r1', data: '2026-09-01', coletados: 120, vendidos: 96, perdidos: 6, precoVenda: 12, custoProd: 0.3 },
      { id: 'r2', data: '2026-10-02', coletados: 60, vendidos: 48, perdidos: 0, precoVenda: 15, custoProd: 0.3 },
    ],
    feedEntries: [
      { id: 'f1', data: '2026-09-01', kgRacao: 30, custoKg: 2, totalCusto: 60 },
      { id: 'f2', data: '2026-10-01', kgRacao: 10, custoKg: 2, totalCusto: 20 },
    ],
  };

  it('calcula receita por dúzia, custo por ovo e lucro', () => {
    const e = computeEggLotEconomics(lot, 'tudo', TODAY);
    expect(e.receita).toBeCloseTo(96 / 12 * 12 + 48 / 12 * 15);
    expect(e.custoTotal).toBe(80);
    expect(e.ovosColetados).toBe(180);
    expect(e.custoPorOvo).toBeCloseTo(80 / 180);
    expect(e.lucro).toBeCloseTo(156 - 80);
    expect(e.perdaPct).toBeCloseTo(6 / 180 * 100);
    expect(e.custoEstimado).toBe(false);
  });

  it('filtra pelo período', () => {
    const e = computeEggLotEconomics(lot, 'mes', TODAY);
    expect(e.ovosColetados).toBe(60);
    expect(e.custoTotal).toBe(20);
  });

  it('usa custo por ovo dos registros como estimativa quando não há ração lançada', () => {
    const e = computeEggLotEconomics({ ...lot, feedEntries: [] }, 'tudo', TODAY);
    expect(e.custoEstimado).toBe(true);
    expect(e.custoTotal).toBeCloseTo(180 * 0.3);
  });
});
