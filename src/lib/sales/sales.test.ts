import { describe, it, expect } from 'vitest';
import { parseMoneyToCents, formatBRL, centsToInput, sumCents, MAX_CENTS } from './money';
import {
  registerMovement, reverseMovement, markReceived, reconcileLedger, mergeLedgers,
  isBirdActive, findActiveTerminal, isValidISODate, addDaysISO, sanitizeText, normalizePhone,
} from './ledger';
import { summarize, monthlySeries, pendingReceivables, filterHistory, rangeForPeriod, csvCell, movementsToCSV } from './aggregate';
import type { BirdLike, BirdMovement, LedgerContext, NewMovementInput } from './types';

const ctx: LedgerContext = { now: 1_700_000_000_000, deviceId: 'dev-A', today: '2026-10-26' };
const birds = (list: BirdLike[]) => new Map(list.map(b => [b.id, b]));
const bird = (over: Partial<BirdLike> = {}): BirdLike => ({ id: 'b1', anilha: 'A-001', nome: 'Pedro', raca: 'Índio Gigante', sexo: 'Macho', status: 'Adulto', ...over });
const sale = (over: Partial<NewMovementInput> = {}): NewMovementInput => ({
  id: 'm1', birdId: 'b1', tipo: 'venda', motivo: 'venda', data: '2026-10-20', valorCentavos: 15000, ...over,
});

describe('money', () => {
  it.each([
    ['1.234,56', 123456], ['1234,5', 123450], ['1234.56', 123456], ['R$ 50', 5000], ['50', 5000],
    ['0,99', 99], ['1.000', 100000], ['10,005', 1001], ['  7,1 ', 710], ['1.234.567,89', 123456789],
  ])('parse %s -> %i', (input, expected) => {
    expect(parseMoneyToCents(input)).toBe(expected);
  });

  it('rejeita lixo e negativos', () => {
    for (const bad of ['', 'abc', '-5', '1,2,3x', null, undefined, NaN, -1, Infinity]) {
      expect(parseMoneyToCents(bad as never)).toBeNull();
    }
  });

  it('soma sem erro de ponto flutuante', () => {
    expect(sumCents([parseMoneyToCents('0,10')!, parseMoneyToCents('0,20')!])).toBe(30);
  });

  it('formata e converte para campo', () => {
    expect(formatBRL(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
    expect(centsToInput(123456)).toBe('1234,56');
    expect(centsToInput(5)).toBe('0,05');
  });
});

describe('datas e texto', () => {
  it('valida calendário real', () => {
    expect(isValidISODate('2024-02-29')).toBe(true);
    expect(isValidISODate('2025-02-29')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('26-01-01')).toBe(false);
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('sanitiza', () => {
    expect(sanitizeText('  a\u0000b \n c ', 10)).toBe('ab c');
    expect(sanitizeText('x'.repeat(50), 5)).toBe('xxxxx');
    expect(normalizePhone('(11) 91234-5678 ')).toBe('11912345678');
  });
  it('status ativo', () => {
    expect(isBirdActive('Adulto')).toBe(true);
    expect(isBirdActive('Vendido')).toBe(false);
    expect(isBirdActive('baixado')).toBe(false);
  });
});

describe('registerMovement — venda', () => {
  it('registra venda, fecha a ave e guarda snapshot', () => {
    const r = registerMovement([], birds([bird()]), sale({ comprador: { nome: ' Carlos ', contato: '(11) 9999-0000' } }), ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.birdPatch).toEqual({ birdId: 'b1', status: 'Vendido' });
    expect(r.value.movement.snapshot.anilha).toBe('A-001');
    expect(r.value.movement.comprador).toEqual({ nome: 'Carlos', contato: '119999000' + '0' });
    expect(r.value.movement.statusPagamento).toBe('pago');
    expect(r.value.movement.dataRecebimento).toBe('2026-10-20');
    expect(r.value.movement.statusAnterior).toBe('Adulto');
  });

  it('IDEMPOTENTE: mesmo ID duas vezes não duplica', () => {
    const first = registerMovement([], birds([bird()]), sale(), ctx);
    if (!first.ok) throw new Error('x');
    const again = registerMovement(first.value.ledger, birds([bird({ status: 'Vendido' })]), sale(), ctx);
    expect(again.ok).toBe(true);
    if (again.ok) {
      expect(again.replay).toBe(true);
      expect(again.value.ledger).toHaveLength(1);
      expect(again.value.birdPatch).toBeNull();
    }
  });

  it('bloqueia 2ª venda da mesma ave com ID diferente (duplo toque / 2 abas)', () => {
    const first = registerMovement([], birds([bird()]), sale(), ctx);
    if (!first.ok) throw new Error('x');
    const second = registerMovement(first.value.ledger, birds([bird()]), sale({ id: 'm2' }), ctx);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.code).toBe('ALREADY_CLOSED');
  });

  it('bloqueia ave inexistente, ave já fechada por status, valor zero e valor acima do teto', () => {
    const code = (r: ReturnType<typeof registerMovement>) => (r.ok ? 'OK' : r.code);
    expect(code(registerMovement([], birds([]), sale(), ctx))).toBe('BIRD_NOT_FOUND');
    expect(code(registerMovement([], birds([bird({ status: 'Vendido' })]), sale(), ctx))).toBe('ALREADY_CLOSED');
    expect(code(registerMovement([], birds([bird()]), sale({ valorCentavos: 0 }), ctx))).toBe('INVALID_VALUE');
    expect(code(registerMovement([], birds([bird()]), sale({ valorCentavos: MAX_CENTS + 1 }), ctx))).toBe('INVALID_VALUE');
    expect(code(registerMovement([], birds([bird()]), sale({ valorCentavos: 10.5 }), ctx))).toBe('INVALID_VALUE');
    expect(code(registerMovement([], birds([bird()]), sale({ valorCentavos: -1 }), ctx))).toBe('INVALID_VALUE');
  });

  it('permite valor zero apenas em troca', () => {
    expect(registerMovement([], birds([bird()]), sale({ valorCentavos: 0, pagamento: 'troca' }), ctx).ok).toBe(true);
  });

  it('valida datas e motivos', () => {
    const code = (r: ReturnType<typeof registerMovement>) => (r.ok ? 'OK' : r.code);
    expect(code(registerMovement([], birds([bird()]), sale({ data: '2026-10-28' }), ctx))).toBe('INVALID_DATE');
    expect(code(registerMovement([], birds([bird()]), sale({ data: '2026-10-27' }), ctx))).toBe('OK'); // tolerância de 1 dia
    expect(code(registerMovement([], birds([bird()]), sale({ data: '1999-01-01' }), ctx))).toBe('INVALID_DATE');
    expect(code(registerMovement([], birds([bird()]), sale({ data: '2026-02-30' }), ctx))).toBe('INVALID_DATE');
    expect(code(registerMovement([], birds([bird()]), sale({ motivo: 'morte' }), ctx))).toBe('INVALID_INPUT');
  });

  it('venda pendente não define data de recebimento', () => {
    const r = registerMovement([], birds([bird()]), sale({ statusPagamento: 'pendente' }), ctx);
    if (!r.ok) throw new Error('x');
    expect(r.value.movement.statusPagamento).toBe('pendente');
    expect(r.value.movement.dataRecebimento).toBeUndefined();
  });
});

describe('perdas, saídas e entradas', () => {
  it('perda -> Faleceu; abate -> Abatido; doação -> Baixado', () => {
    const p = registerMovement([], birds([bird()]), { id: 'p', birdId: 'b1', tipo: 'perda', motivo: 'predador', data: '2026-10-25', valorCentavos: 0 }, ctx);
    const a = registerMovement([], birds([bird()]), { id: 'a', birdId: 'b1', tipo: 'saida', motivo: 'abate', data: '2026-10-25', valorCentavos: 0 }, ctx);
    const d = registerMovement([], birds([bird()]), { id: 'd', birdId: 'b1', tipo: 'saida', motivo: 'doacao', data: '2026-10-25', valorCentavos: 0 }, ctx);
    expect(p.ok && p.value.birdPatch?.status).toBe('Faleceu');
    expect(a.ok && a.value.birdPatch?.status).toBe('Abatido');
    expect(d.ok && d.value.birdPatch?.status).toBe('Baixado');
  });

  it('entrada não altera status e não pode duplicar', () => {
    const e1 = registerMovement([], birds([bird()]), { id: 'e1', birdId: 'b1', tipo: 'entrada', motivo: 'compra', data: '2026-09-01', valorCentavos: 8000 }, ctx);
    if (!e1.ok) throw new Error('x');
    expect(e1.value.birdPatch).toBeNull();
    const e2 = registerMovement(e1.value.ledger, birds([bird()]), { id: 'e2', birdId: 'b1', tipo: 'entrada', motivo: 'compra', data: '2026-09-02', valorCentavos: 100 }, ctx);
    expect(e2.ok).toBe(false);
  });
});

describe('estorno e recebimento', () => {
  const setup = () => {
    const r = registerMovement([], birds([bird()]), sale({ statusPagamento: 'pendente' }), ctx);
    if (!r.ok) throw new Error('x');
    return r.value.ledger;
  };

  it('estorna venda, restaura a ave e libera nova venda', () => {
    const ledger = setup();
    const rev = reverseMovement(ledger, { movementId: 'm1', motivo: 'Cliente desistiu' }, ctx);
    expect(rev.ok).toBe(true);
    if (!rev.ok) return;
    expect(rev.value.birdPatch).toEqual({ birdId: 'b1', status: 'Adulto' });
    expect(rev.value.movement.estornado).toBe(true);
    expect(findActiveTerminal(rev.value.ledger, 'b1')).toBeUndefined();
    const again = registerMovement(rev.value.ledger, birds([bird()]), sale({ id: 'm2' }), ctx);
    expect(again.ok).toBe(true);
  });

  it('estorno é idempotente e nunca apaga', () => {
    const ledger = setup();
    const r1 = reverseMovement(ledger, { movementId: 'm1' }, ctx);
    if (!r1.ok) throw new Error('x');
    const r2 = reverseMovement(r1.value.ledger, { movementId: 'm1' }, ctx);
    expect(r2.ok && r2.replay).toBe(true);
    expect(r2.ok && r2.value.ledger).toHaveLength(1);
    expect(reverseMovement(ledger, { movementId: 'zzz' }, ctx).ok).toBe(false);
  });

  it('não estorna entrada com venda ativa', () => {
    const e = registerMovement([], birds([bird()]), { id: 'e1', birdId: 'b1', tipo: 'entrada', motivo: 'compra', data: '2026-09-01', valorCentavos: 100 }, ctx);
    if (!e.ok) throw new Error('x');
    const s = registerMovement(e.value.ledger, birds([bird()]), sale(), ctx);
    if (!s.ok) throw new Error('x');
    const r = reverseMovement(s.value.ledger, { movementId: 'e1' }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('HAS_ACTIVE_EXIT');
  });

  it('marca como recebido (idempotente) e rejeita o que não é venda pendente', () => {
    const ledger = setup();
    const ok = markReceived(ledger, { movementId: 'm1', data: '2026-10-26' }, ctx);
    if (!ok.ok) throw new Error('x');
    expect(ok.value.movement.statusPagamento).toBe('pago');
    const again = markReceived(ok.value.ledger, { movementId: 'm1', data: '2026-10-26' }, ctx);
    expect(again.ok && again.replay).toBe(true);
    expect(markReceived(ledger, { movementId: 'nope', data: '2026-10-26' }, ctx).ok).toBe(false);
  });
});

describe('reconcileLedger', () => {
  const legacySold = bird({ id: 'b9', anilha: 'L-9', status: 'Vendido', valorVenda: '1.250,00', dataVenda: '2026-08-10', compradorNome: 'Ana' });

  it('migra venda legada (valor e data da ave) de forma idempotente', () => {
    const r1 = reconcileLedger([], [legacySold], ctx);
    expect(r1.report.legacyCreated).toBe(1);
    const m = r1.ledger[0];
    expect(m).toMatchObject({ id: 'legacy-b9-venda', tipo: 'venda', valorCentavos: 125000, data: '2026-08-10' });
    expect(m.flags?.legado).toBe(true);
    const r2 = reconcileLedger(r1.ledger, [legacySold], ctx);
    expect(r2.report.legacyCreated).toBe(0);
    expect(r2.ledger).toHaveLength(1);
  });

  it('cria perda/saída legadas conforme o status', () => {
    const r = reconcileLedger([], [bird({ id: 'x', status: 'Faleceu' }), bird({ id: 'y', status: 'Abatido' })], ctx);
    expect(r.ledger.map(m => `${m.tipo}:${m.motivo}`).sort()).toEqual(['perda:morte', 'saida:abate']);
  });

  it('sinaliza duplicados: prefere real sobre legado, depois o mais antigo', () => {
    const legacy: BirdMovement = { id: 'legacy-b1-venda', birdId: 'b1', tipo: 'venda', motivo: 'venda', data: '2026-10-01', valorCentavos: 0, snapshot: { anilha: 'A', nome: '', raca: '', sexo: '' }, flags: { legado: true }, createdAt: 1, updatedAt: 1, deviceId: 'd' };
    const real: BirdMovement = { ...legacy, id: 'real', valorCentavos: 9900, flags: undefined, createdAt: 50, updatedAt: 50 };
    const r = reconcileLedger([legacy, real], [bird({ status: 'Vendido' })], ctx);
    expect(r.report.duplicatesFlagged).toBe(1);
    expect(r.ledger.find(m => m.id === 'legacy-b1-venda')?.flags?.duplicado).toBe(true);
    expect(summarize(r.ledger).receita).toBe(9900);
    expect(summarize(r.ledger).vendasCount).toBe(1);
  });

  it('corrige ave ainda ativa quando existe venda contada (sync de outro aparelho)', () => {
    const r1 = registerMovement([], birds([bird()]), sale(), ctx);
    if (!r1.ok) throw new Error('x');
    const r = reconcileLedger(r1.value.ledger, [bird({ status: 'Adulto' })], ctx);
    expect(r.patches).toEqual([{ birdId: 'b1', status: 'Vendido' }]);
  });

  it('cria entradas legadas só quando pedido', () => {
    expect(reconcileLedger([], [bird({ dataCadastro: '2026-01-05' })], ctx).ledger).toHaveLength(0);
    const r = reconcileLedger([], [bird({ dataCadastro: '2026-01-05' })], ctx, { createLegacyEntries: true });
    expect(r.ledger[0]).toMatchObject({ tipo: 'entrada', data: '2026-01-05', id: 'legacy-b1-entrada' });
  });
});

describe('mergeLedgers', () => {
  it('une por ID e o mais novo vence', () => {
    const base = (id: string, updatedAt: number, valor = 100): BirdMovement => ({ id, birdId: 'b', tipo: 'venda', motivo: 'venda', data: '2026-10-01', valorCentavos: valor, snapshot: { anilha: 'A', nome: '', raca: '', sexo: '' }, createdAt: 1, updatedAt, deviceId: 'd' });
    const merged = mergeLedgers([base('a', 1), base('b', 5, 500)], [base('a', 9, 900), base('b', 2, 200), base('c', 1)]);
    expect(merged).toHaveLength(3);
    expect(merged.find(m => m.id === 'a')?.valorCentavos).toBe(900);
    expect(merged.find(m => m.id === 'b')?.valorCentavos).toBe(500);
  });
});

describe('aggregate', () => {
  const build = () => {
    let ledger: BirdMovement[] = [];
    const list = [bird({ id: 'b1' }), bird({ id: 'b2', anilha: 'A-002' }), bird({ id: 'b3', anilha: 'A-003' }), bird({ id: 'b4', anilha: 'A-004' })];
    const apply = (input: NewMovementInput) => {
      const r = registerMovement(ledger, birds(list), input, ctx);
      if (!r.ok) throw new Error(r.error);
      ledger = r.value.ledger;
    };
    apply({ id: 'e1', birdId: 'b1', tipo: 'entrada', motivo: 'compra', data: '2026-09-01', valorCentavos: 4000 });
    apply({ id: 's1', birdId: 'b1', tipo: 'venda', motivo: 'venda', data: '2026-10-10', valorCentavos: 15000 });
    apply({ id: 's2', birdId: 'b2', tipo: 'venda', motivo: 'venda', data: '2026-10-12', valorCentavos: 10000, statusPagamento: 'pendente' });
    apply({ id: 'p1', birdId: 'b3', tipo: 'perda', motivo: 'doenca', data: '2026-10-05', valorCentavos: 2500 });
    apply({ id: 's3', birdId: 'b4', tipo: 'venda', motivo: 'venda', data: '2026-07-01', valorCentavos: 7000 });
    return ledger;
  };

  it('resume receita, recebido, a receber, lucro e perdas', () => {
    const s = summarize(build(), rangeForPeriod('mes', '2026-10-26'));
    expect(s).toMatchObject({ receita: 25000, recebido: 15000, aReceber: 10000, vendasCount: 2, ticketMedio: 12500, perdasCount: 1, perdasValor: 2500 });
    expect(s.custoVendidas).toBe(4000);
    expect(s.lucro).toBe(21000);
    expect(s.vendasSemCusto).toBe(1);
  });

  it('estorno remove do total', () => {
    const ledger = build();
    const rev = reverseMovement(ledger, { movementId: 's1' }, ctx);
    if (!rev.ok) throw new Error('x');
    expect(summarize(rev.value.ledger, rangeForPeriod('mes', '2026-10-26')).receita).toBe(10000);
  });

  it('série mensal e período', () => {
    const series = monthlySeries(build(), '2026-10-26', 4);
    expect(series.map(p => p.key)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
    expect(series[0].receita).toBe(7000);
    expect(series[3].receita).toBe(25000);
    expect(rangeForPeriod('30d', '2026-10-26')).toEqual({ from: '2026-09-27', to: '2026-10-26' });
    expect(rangeForPeriod('ano', '2026-10-26').from).toBe('2026-01-01');
  });

  it('a receber e filtros', () => {
    const ledger = build();
    expect(pendingReceivables(ledger).map(m => m.id)).toEqual(['s2']);
    expect(filterHistory(ledger, { tipos: ['perda'] }).map(m => m.id)).toEqual(['p1']);
    expect(filterHistory(ledger, { query: 'a-002' }).map(m => m.id)).toEqual(['s2']);
    expect(filterHistory(ledger)[0].id).toBe('s2'); // mais recente primeiro
  });
});

describe('CSV seguro', () => {
  it('neutraliza fórmulas e escapa separador/aspas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+5511')).toBe("'+5511");
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('normal')).toBe('normal');
    expect(csvCell(null)).toBe('');
  });
  it('gera cabeçalho e linhas com vírgula decimal', () => {
    const r = registerMovement([], birds([bird()]), sale({ valorCentavos: 123456, comprador: { nome: '=cmd' } }), ctx);
    if (!r.ok) throw new Error('x');
    const csv = movementsToCSV(r.value.ledger);
    const [head, line] = csv.split('\r\n');
    expect(head.startsWith('Data;Tipo;Motivo')).toBe(true);
    expect(line).toContain('1234,56');
    expect(line).toContain("'=cmd");
    expect(line.startsWith('20/10/2026;Venda;Venda;A-001')).toBe(true);
  });
});
