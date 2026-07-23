import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../lib/AppContext';
import type { EggDailyRecord, EggLot, IncubationLot } from '../lib/AppContext';
import {
  Egg, Plus, TrendingUp, TrendingDown, DollarSign,
  ChevronDown, ChevronUp, X, Check, BarChart2,
  CalendarDays, Layers, AlertCircle, Info, Edit2, Trash2,
  AlertTriangle, ShoppingCart, Sparkles
} from 'lucide-react';
import { syncDailyEggReminder } from '../lib/pushNotifications';

// helpers
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function formatDate(iso: string) {
  if (!iso || !iso.includes('-')) return iso;
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function daysBetween(a: string, b: string) {
  if (!a || !b) return 1;
  return Math.max(1, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1);
}
function fmtBRL(n: number) { return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

const onlyNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', '.', ','];
  if (allowed.includes(e.key)) return;
  if (e.ctrlKey || e.metaKey) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
};

// ─────────────────────────────────────────────────────────────────────────────
// BarChart — Gráfico Interativo de Produção (Últimos 14 dias)
// ─────────────────────────────────────────────────────────────────────────────
function BarChart({ records }: { records: EggDailyRecord[] }) {
  const last14 = [...records].sort((a, b) => a.data.localeCompare(b.data)).slice(-14);
  if (last14.length === 0) return (
    <div className="h-32 flex items-center justify-center text-xs text-theme-text-muted">
      Nenhum registro de produção ainda
    </div>
  );

  const max = Math.max(...last14.map(r => r.coletados), 1);
  const W = 280;
  const H = 96;
  const BAR_W = Math.floor((W - 20) / last14.length) - 2;

  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" style={{ maxHeight: 130 }}>
      {last14.map((r, i) => {
        const barH = Math.max(4, (r.coletados / max) * H);
        const vendH = Math.max(0, (r.vendidos / max) * H);
        const perdH = Math.max(0, (r.perdidos / max) * H);
        const incH = Math.max(0, ((r.incubados || 0) / max) * H);
        const x = 10 + i * (BAR_W + 2);
        const isPeak = r.coletados === max && max > 0;

        return (
          <g key={r.id || i}>
            {/* Fundo do pilar */}
            <rect x={x} y={H - barH} width={BAR_W} height={barH} rx="2" fill={isPeak ? "#F59E0B44" : "#F59E0B22"} />
            {/* Ovos Vendidos */}
            <rect x={x} y={H - vendH} width={BAR_W} height={vendH} rx="2" fill="#10B981" opacity="0.75" />
            {/* Ovos Incubados (Choco) */}
            <rect x={x + BAR_W * 0.3} y={H - incH} width={BAR_W * 0.4} height={incH} rx="2" fill="#8B5CF6" opacity="0.8" />
            {/* Ovos Perdidos */}
            <rect x={x + BAR_W * 0.65} y={H - perdH} width={BAR_W * 0.35} height={perdH} rx="2" fill="#EF4444" opacity="0.8" />

            {/* Indicador de Pico de Postura */}
            {isPeak && (
              <circle cx={x + BAR_W / 2} cy={H - barH - 4} r="2" fill="#F59E0B" />
            )}

            {/* Data (Dia) */}
            <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle" fontSize="7" fill="#9CA3AF" fontWeight="bold">
              {r.data ? r.data.slice(8) : ''}
            </text>
          </g>
        );
      })}
      <line x1="10" y1={H} x2={W - 10} y2={H} stroke="#374151" strokeWidth="1" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'amber', icon: Icon }: { label: string; value: string; sub?: string; color?: 'amber' | 'green' | 'red' | 'blue' | 'purple'; icon: any }) {
  const colors: Record<string, string> = {
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    green: 'text-green-400 bg-green-400/10 border-green-400/20',
    red: 'text-red-400 bg-red-400/10 border-red-400/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  };

  return (
    <div className={`rounded-2xl border p-4 flex flex-col justify-between ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">{label}</span>
        <Icon size={14} />
      </div>
      <p className="text-xl sm:text-2xl font-black text-white mt-1">{value}</p>
      {sub && <p className="text-[10px] opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Criar Novo Lote de Postura
// ─────────────────────────────────────────────────────────────────────────────
function CreateEggLotModal({ onClose, onSave }: { onClose: () => void; onSave: (lot: EggLot) => void }) {
  const { birds, breeds } = useAppContext();
  const [baia, setBaia] = useState('');
  const [qtdFemeas, setQtdFemeas] = useState('');
  const [expectativaDiaria, setExpectativaDiaria] = useState('');
  const [raca, setRaca] = useState('');
  const [precoVendaPadrao, setPrecoVendaPadrao] = useState('6.00');
  const [custoProdPadrao, setCustoProdPadrao] = useState('0.30');
  const [observacao, setObservacao] = useState('');
  const [selectedFemeas, setSelectedFemeas] = useState<string[]>([]);
  const [error, setError] = useState('');

  const availableFemeas = useMemo(() => {
    return birds.filter(b => b.sexo === 'Fêmea' && b.status !== 'Vendido' && b.status !== 'Faleceu');
  }, [birds]);

  const handleFemeasChange = (num: number) => {
    if (num > 0) {
      const recExp = Math.max(1, Math.round(num * 0.8));
      setExpectativaDiaria(String(recExp));
    }
  };

  const handleSave = () => {
    if (!baia.trim()) {
      setError('Informe a identificação da Baia.');
      return;
    }

    const countFemeas = selectedFemeas.length > 0 ? selectedFemeas.length : (parseInt(qtdFemeas) || 0);
    if (countFemeas <= 0) {
      setError('Informe a quantidade de fêmeas ou selecione as galinhas vinculadas.');
      return;
    }

    const exp = parseInt(expectativaDiaria) || Math.max(1, Math.round(countFemeas * 0.8));

    const newLot: EggLot = {
      id: uid(),
      baia: baia.trim(),
      femeasIds: selectedFemeas,
      qtdFemeas: countFemeas,
      expectativaDiaria: exp,
      dataInicio: todayISO(),
      status: 'Ativo',
      raca: raca || undefined,
      precoVendaPadrao: parseFloat(precoVendaPadrao) || 6.0,
      custoProdPadrao: parseFloat(custoProdPadrao) || 0.30,
      observacao: observacao.trim() || undefined,
      registros: []
    };

    onSave(newLot);
    onClose();
  };

  const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2.5 text-xs text-white placeholder-theme-text-muted focus:border-theme-primary outline-none transition-colors";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-theme-surface w-full sm:max-w-md rounded-2xl border border-theme-border/60 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up gpu-accelerated" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-theme-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-white flex items-center gap-2 text-sm">
              <Egg size={18} className="text-amber-400" />
              <span>Novo Lote de Postura</span>
            </h3>
            <p className="text-[11px] text-theme-text-muted mt-0.5">Cadastre uma baia para controle diário de ovos</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-theme-text-muted hover:text-white rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto smooth-scroll flex-1 p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 font-bold">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Baia / Local <span className="text-amber-400">*</span></label>
              <input type="text" placeholder="Ex: Baia 01" value={baia} onChange={e => setBaia(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Raça Predominante</label>
              <select value={raca} onChange={e => setRaca(e.target.value)} className={inputCls}>
                <option value="">Selecione...</option>
                {breeds.map(b => (
                  <option key={b.id} value={b.nome}>{b.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Nº de Fêmeas na Baia <span className="text-amber-400">*</span></label>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="Ex: 5"
              value={qtdFemeas}
              onChange={e => {
                const val = e.target.value;
                setQtdFemeas(val);
                handleFemeasChange(parseInt(val) || 0);
              }}
              onKeyDown={onlyNumericKeyDown}
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Expectativa Diária (Ovos/dia)</label>
              <span className="text-[9px] text-amber-400 font-bold">Recomendado: 80%</span>
            </div>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="Ex: 4"
              value={expectativaDiaria}
              onChange={e => setExpectativaDiaria(e.target.value)}
              onKeyDown={onlyNumericKeyDown}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Preço Padrão / Dúzia (R$)</label>
              <input type="number" step="0.01" inputMode="decimal" value={precoVendaPadrao} onChange={e => setPrecoVendaPadrao(e.target.value)} onKeyDown={onlyNumericKeyDown} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Custo Padrão / Ovo (R$)</label>
              <input type="number" step="0.01" inputMode="decimal" value={custoProdPadrao} onChange={e => setCustoProdPadrao(e.target.value)} onKeyDown={onlyNumericKeyDown} className={inputCls} />
            </div>
          </div>

          {availableFemeas.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-theme-border">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Vincular Galinhas Cadastradas (Opcional)</label>
              <div className="border border-theme-border rounded-xl max-h-32 overflow-y-auto p-2 divide-y divide-theme-border/50">
                {availableFemeas.map(f => {
                  const isChecked = selectedFemeas.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => {
                        setSelectedFemeas(prev => {
                          const next = isChecked ? prev.filter(id => id !== f.id) : [...prev, f.id];
                          setQtdFemeas(String(next.length || qtdFemeas));
                          handleFemeasChange(next.length || parseInt(qtdFemeas) || 0);
                          return next;
                        });
                      }}
                      className="py-1.5 px-2 flex items-center justify-between cursor-pointer hover:bg-theme-base/50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{f.nome || f.anilha}</span>
                        <span className="text-[10px] text-theme-text-muted">Anilha: {f.anilha}</span>
                      </div>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'border-amber-400 bg-amber-400 text-black' : 'border-theme-border'}`}>
                        {isChecked && <Check size={10} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Observações</label>
            <textarea rows={2} placeholder="Ex: Galinhas em início de postura..." value={observacao} onChange={e => setObservacao(e.target.value)} className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="p-4 border-t border-theme-border shrink-0">
          <button onClick={handleSave} className="w-full btn-primary py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400">
            <Check size={16} />
            <span>Salvar Lote de Postura</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Enviar Ovos do Estoque para Incubação / Choco
// ─────────────────────────────────────────────────────────────────────────────
function SendToIncubationModal({
  lot,
  availableStock,
  onClose,
  onConfirm
}: {
  lot: EggLot;
  availableStock: number;
  onClose: () => void;
  onConfirm: (count: number) => void;
}) {
  const [quantity, setQuantity] = useState(String(availableStock));
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const qty = parseInt(quantity) || 0;
    if (qty <= 0) {
      setError('Informe uma quantidade válida de ovos.');
      return;
    }
    if (qty > availableStock) {
      setError(`Quantidade não pode exceder o estoque disponível (${availableStock} ovos).`);
      return;
    }
    onConfirm(qty);
    onClose();
  };

  const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2.5 text-sm text-white focus:border-theme-primary outline-none text-center font-black text-2xl text-purple-400";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fade-in" onClick={onClose}>
      <div className="bg-theme-surface w-full sm:max-w-sm rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden animate-scale-up p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-theme-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Enviar p/ Incubação / Choco</h3>
              <p className="text-[10px] text-theme-text-muted">Baia {lot.baia}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-theme-text-muted hover:text-white rounded-lg">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-bold text-center">
            {error}
          </div>
        )}

        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center space-y-1">
          <p className="text-[10px] font-bold text-purple-300 uppercase">Estoque Disponível na Baia</p>
          <p className="text-2xl font-black text-white">{availableStock} <span className="text-xs font-normal text-theme-text-muted">ovos</span></p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Quantidade a Enviar</label>
            <button
              onClick={() => setQuantity(String(availableStock))}
              className="text-[10px] text-purple-400 hover:text-purple-300 font-bold underline"
            >
              Enviar Todos ({availableStock})
            </button>
          </div>
          <input
            type="number"
            min="1"
            max={availableStock}
            inputMode="numeric"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            onKeyDown={onlyNumericKeyDown}
            className={inputCls}
          />
        </div>

        <div className="pt-2">
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
          >
            <Sparkles size={16} />
            <span>Criar Lote de Incubação</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Registrar Venda Direta do Estoque
// ─────────────────────────────────────────────────────────────────────────────
function SellFromStockModal({
  lot,
  availableStock,
  onClose,
  onConfirm
}: {
  lot: EggLot;
  availableStock: number;
  onClose: () => void;
  onConfirm: (count: number, pricePerDozen: number) => void;
}) {
  const [quantity, setQuantity] = useState(String(availableStock));
  const [pricePerDozen, setPricePerDozen] = useState(String(lot.precoVendaPadrao || 6.0));
  const [error, setError] = useState('');

  const qtyNum = parseInt(quantity) || 0;
  const priceNum = parseFloat(pricePerDozen) || 0;
  const totalRevenue = (qtyNum / 12) * priceNum;

  const handleConfirm = () => {
    if (qtyNum <= 0) {
      setError('Informe uma quantidade válida de ovos.');
      return;
    }
    if (qtyNum > availableStock) {
      setError(`Quantidade não pode exceder o estoque disponível (${availableStock} ovos).`);
      return;
    }
    onConfirm(qtyNum, priceNum);
    onClose();
  };

  const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2 text-xs text-white focus:border-theme-primary outline-none";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fade-in" onClick={onClose}>
      <div className="bg-theme-surface w-full sm:max-w-sm rounded-2xl border border-green-500/30 shadow-2xl overflow-hidden animate-scale-up p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-theme-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3 className="font-black text-sm text-white">Registrar Venda do Estoque</h3>
              <p className="text-[10px] text-theme-text-muted">Baia {lot.baia}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-theme-text-muted hover:text-white rounded-lg">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-bold text-center">
            {error}
          </div>
        )}

        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center space-y-1">
          <p className="text-[10px] font-bold text-green-300 uppercase">Receita Estimada da Venda</p>
          <p className="text-2xl font-black text-white">{fmtBRL(totalRevenue)}</p>
          <p className="text-[10px] text-theme-text-muted">({qtyNum} ovos = {(qtyNum / 12).toFixed(1)} dúzias)</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Qtd de Ovos</label>
            <input
              type="number"
              min="1"
              max={availableStock}
              inputMode="numeric"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              onKeyDown={onlyNumericKeyDown}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Preço / Dúzia (R$)</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={pricePerDozen}
              onChange={e => setPricePerDozen(e.target.value)}
              onKeyDown={onlyNumericKeyDown}
              className={inputCls}
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
          >
            <DollarSign size={16} />
            <span>Confirmar Venda</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal: Registrar / Editar Dia de Produção
// ─────────────────────────────────────────────────────────────────────────────
type RegForm = {
  data: string;
  coletados: string;
  vendidos: string;
  perdidos: string;
  precoVenda: string;
  custoProd: string;
  observacao: string;
};

function RegisterDaySheet({
  lot,
  editingRecord,
  onClose,
  onSave
}: {
  lot: EggLot;
  editingRecord?: EggDailyRecord | null;
  onClose: () => void;
  onSave: (rec: EggDailyRecord) => void;
}) {
  const [form, setForm] = useState<RegForm>({
    data: editingRecord?.data || todayISO(),
    coletados: editingRecord ? String(editingRecord.coletados) : '',
    vendidos: editingRecord ? String(editingRecord.vendidos) : '0',
    perdidos: editingRecord ? String(editingRecord.perdidos) : '0',
    precoVenda: editingRecord ? String(editingRecord.precoVenda) : String(lot.precoVendaPadrao ?? 6),
    custoProd: editingRecord ? String(editingRecord.custoProd) : String(lot.custoProdPadrao ?? 0.30),
    observacao: editingRecord?.observacao || ''
  });

  const [error, setError] = useState('');
  const [existingRecordAlert, setExistingRecordAlert] = useState(false);

  useEffect(() => {
    if (editingRecord) return;
    const existing = (lot.registros || []).find(r => r.data === form.data);
    if (existing) {
      setExistingRecordAlert(true);
      setForm(prev => ({
        ...prev,
        coletados: String(existing.coletados),
        vendidos: String(existing.vendidos),
        perdidos: String(existing.perdidos),
        precoVenda: String(existing.precoVenda),
        custoProd: String(existing.custoProd),
        observacao: existing.observacao || ''
      }));
    } else {
      setExistingRecordAlert(false);
    }
  }, [form.data, lot.registros, editingRecord]);

  const set = (k: keyof RegForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = () => {
    const col = parseFloat(form.coletados) || 0;
    const vend = parseFloat(form.vendidos) || 0;
    const perd = parseFloat(form.perdidos) || 0;
    const preco = parseFloat(form.precoVenda) || 0;
    const custo = parseFloat(form.custoProd) || 0;

    if (!col || col <= 0 || isNaN(col)) {
      setError('Informe a quantidade válida de ovos coletados.');
      return;
    }
    if ((vend + perd) > col) {
      setError('A soma de Vendidos + Perdidos não pode ser maior que o total coletado.');
      return;
    }

    onSave({
      id: editingRecord?.id || uid(),
      data: form.data,
      coletados: col,
      vendidos: vend,
      perdidos: perd,
      incubados: editingRecord?.incubados || 0,
      precoVenda: preco,
      custoProd: custo,
      observacao: form.observacao.trim() || undefined
    });
    onClose();
  };

  const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-theme-text-muted focus:border-theme-primary outline-none transition-colors";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-fade-in" onClick={onClose}>
      <div className="bg-theme-surface w-full sm:max-w-md rounded-2xl border border-theme-border/60 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up gpu-accelerated" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 border-b border-theme-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-white text-sm flex items-center gap-2">
              <Egg size={16} className="text-amber-400" />
              <span>{editingRecord ? 'Editar Registro Diário' : 'Registrar Dia de Produção'}</span>
            </h3>
            <p className="text-[11px] text-theme-text-muted mt-0.5">Baia {lot.baia}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-theme-text-muted hover:text-white rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto smooth-scroll flex-1 p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400 font-bold">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {existingRecordAlert && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-300 font-bold">
              <Info size={14} />
              <span>Já existe um registro para esta data. Os dados foram carregados para atualização.</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Data da Coleta</label>
            <input type="date" value={form.data} onChange={set('data')} className={inputCls} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Ovos Coletados <span className="text-amber-400">*</span></label>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="Ex: 24"
              value={form.coletados}
              onChange={set('coletados')}
              onKeyDown={onlyNumericKeyDown}
              className={`${inputCls} text-3xl font-black text-center text-amber-400 py-3`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Vendidos</label>
              <input type="number" min="0" inputMode="numeric" placeholder="0" value={form.vendidos} onChange={set('vendidos')} onKeyDown={onlyNumericKeyDown} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Perdidos / Trincados</label>
              <input type="number" min="0" inputMode="numeric" placeholder="0" value={form.perdidos} onChange={set('perdidos')} onKeyDown={onlyNumericKeyDown} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Preço / Dúzia (R$)</label>
              <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="6.00" value={form.precoVenda} onChange={set('precoVenda')} onKeyDown={onlyNumericKeyDown} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Custo / Ovo (R$)</label>
              <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.30" value={form.custoProd} onChange={set('custoProd')} onKeyDown={onlyNumericKeyDown} className={inputCls} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Observação (opcional)</label>
            <textarea rows={2} placeholder="Ex: Postura normal, raça bem alimentada..." value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="p-4 border-t border-theme-border shrink-0">
          <button onClick={handleSave} className="w-full btn-primary py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400">
            <Check size={16} />
            <span>{editingRecord ? 'Atualizar Registro' : 'Salvar Coleta'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LotCard — Card Principal do Lote com Detecção de Anomalias & Gestão de Estoque
// ─────────────────────────────────────────────────────────────────────────────
function LotCard({
  lot,
  birds,
  onRegister,
  onEditRecord,
  onDeleteRecord,
  onSendToIncubation,
  onSellFromStock
}: {
  lot: EggLot;
  birds: ReturnType<typeof useAppContext>['birds'];
  onRegister: (lot: EggLot) => void;
  onEditRecord: (lot: EggLot, record: EggDailyRecord) => void;
  onDeleteRecord: (lot: EggLot, recordId: string) => void;
  onSendToIncubation: (lot: EggLot, stock: number) => void;
  onSellFromStock: (lot: EggLot, stock: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const records = lot.registros ?? [];

  const total = records.reduce((s, r) => s + r.coletados, 0);
  const totalVendidos = records.reduce((s, r) => s + r.vendidos, 0);
  const totalPerdidos = records.reduce((s, r) => s + r.perdidos, 0);
  const totalIncubados = records.reduce((s, r) => s + (r.incubados || 0), 0);
  const totalEstoque = Math.max(0, total - totalVendidos - totalPerdidos - totalIncubados);

  const receita = records.reduce((s, r) => s + (r.vendidos / 12) * r.precoVenda, 0);
  const custo = records.reduce((s, r) => s + r.vendidos * r.custoProd, 0);
  const lucro = receita - custo;
  const dias = daysBetween(lot.dataInicio, todayISO());
  const mediaReal = records.length > 0 ? (total / records.length) : 0;
  const eficiencia = lot.expectativaDiaria > 0 ? Math.min(100, (mediaReal / lot.expectativaDiaria) * 100) : 0;
  const femeaNomes = lot.femeasIds.map(id => birds.find(b => b.id === id)).filter(Boolean).map(b => b!.nome || b!.anilha).join(', ');
  const isAtivo = lot.status === 'Ativo';
  const efBar = Math.min(100, eficiencia);

  // ── DETECTOR DE ANOMALIA / QUEDA DE POSTURA ──
  // Compara a média recente (últimos 3 lançamentos) com a média histórica da baia (últimos 14)
  const anomalyInfo = useMemo(() => {
    if (records.length < 3) return null;
    const sorted = [...records].sort((a, b) => b.data.localeCompare(a.data));
    const recent3 = sorted.slice(0, 3);
    const avgRecent = recent3.reduce((s, r) => s + r.coletados, 0) / 3;
    const avgOverall = total / records.length;

    if (avgOverall >= 2 && avgRecent <= avgOverall * 0.6) {
      const dropPct = Math.round(((avgOverall - avgRecent) / avgOverall) * 100);
      return {
        dropPct,
        avgOverall: avgOverall.toFixed(1),
        avgRecent: avgRecent.toFixed(1)
      };
    }
    return null;
  }, [records, total]);

  return (
    <div className="rounded-2xl border border-theme-border/60 bg-theme-surface overflow-hidden shadow-lg transition-all hover:border-theme-border">
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
          <Egg size={18} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-white text-sm">Baia {lot.baia}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAtivo ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {lot.status}
            </span>
          </div>
          <p className="text-xs text-theme-text-muted mt-0.5 truncate">
            {lot.femeasIds.length || lot.qtdFemeas || 0} fêmea(s) &bull; Exp. {lot.expectativaDiaria}/dia &bull; Desde {formatDate(lot.dataInicio)}
          </p>
          {femeaNomes && <p className="text-[10px] text-theme-text-muted/70 truncate mt-0.5">{femeaNomes}</p>}
        </div>
      </div>

      {/* ── CARD ALERTA DE QUEDA DE POSTURA ── */}
      {anomalyInfo && (
        <div className="mx-4 mb-3 p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-300 animate-pulse">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-black text-red-400 uppercase text-[10px] tracking-wider">
              ⚠️ Alerta: Queda de {anomalyInfo.dropPct}% na Postura
            </p>
            <p className="text-[11px] leading-relaxed text-red-200/90">
              A produção recente caiu para <strong>{anomalyInfo.avgRecent} ovos/dia</strong> (Média da baia: <strong>{anomalyInfo.avgOverall}/dia</strong>). Verifique alimentação, água ou sintomas de estresse/doença.
            </p>
          </div>
        </div>
      )}

      {/* Grid de 5 colunas: Coletados, Estoque, Choco, Vendidos, Perdidos */}
      <div className="grid grid-cols-5 divide-x divide-theme-border border-t border-theme-border">
        {[{ label: 'Coletados', value: total, color: 'text-amber-400' },
          { label: 'Estoque', value: totalEstoque, color: 'text-blue-400' },
          { label: 'Em Choco', value: totalIncubados, color: 'text-purple-400' },
          { label: 'Vendidos', value: totalVendidos, color: 'text-green-400' },
          { label: 'Perdidos', value: totalPerdidos, color: 'text-red-400' }
        ].map(s => (
          <div key={s.label} className="p-2 text-center">
            <p className={`text-sm sm:text-base font-black ${s.color}`}>{s.value}</p>
            <p className="text-[8px] sm:text-[9px] text-theme-text-muted uppercase font-bold truncate">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-theme-border flex items-center gap-3">
        <span className="text-[10px] text-theme-text-muted font-bold whitespace-nowrap">Eficiência de Postura</span>
        <div className="flex-1 h-1.5 rounded-full bg-theme-base overflow-hidden">
          <div className={`h-full rounded-full transition-all ${efBar >= 80 ? 'bg-green-400' : efBar >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${efBar}%` }} />
        </div>
        <span className={`text-[10px] font-black ${efBar >= 80 ? 'text-green-400' : efBar >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{eficiencia.toFixed(0)}%</span>
      </div>

      {/* Ações Rápidas do Lote */}
      <div className="px-4 pb-3 pt-2 flex items-center gap-1.5 flex-wrap border-t border-theme-border">
        {isAtivo && (
          <button onClick={() => onRegister(lot)} className="flex-1 btn-primary py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400 min-w-[110px]">
            <Plus size={14} />
            <span>Registrar Dia</span>
          </button>
        )}

        {totalEstoque > 0 && isAtivo && (
          <>
            <button
              onClick={() => onSendToIncubation(lot, totalEstoque)}
              className="px-2.5 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1 active:scale-95"
              title="Enviar ovos do estoque para incubação/chocadeira"
            >
              <Sparkles size={13} />
              <span>Choco ({totalEstoque})</span>
            </button>

            <button
              onClick={() => onSellFromStock(lot, totalEstoque)}
              className="px-2.5 py-2 rounded-xl border border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500 hover:text-white transition-all text-xs font-bold flex items-center gap-1 active:scale-95"
              title="Registrar venda de ovos do estoque"
            >
              <ShoppingCart size={13} />
              <span>Vender</span>
            </button>
          </>
        )}

        <button onClick={() => setExpanded(v => !v)} className="px-2.5 py-2 rounded-xl border border-theme-border text-theme-text-muted hover:text-white hover:border-theme-primary transition-all text-xs font-bold flex items-center gap-1 active:scale-95">
          <BarChart2 size={13} />
          <span>Análise</span>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-theme-border bg-theme-base/40 px-4 py-4 space-y-4 animate-fade-in">
          <div>
            <p className="text-[10px] font-bold uppercase text-theme-text-muted mb-2 flex items-center gap-1.5">
              <BarChart2 size={11} /> Produção Diária (últimos 14 dias)
            </p>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {[{ color: 'bg-amber-400/40', label: 'Coletados' }, { color: 'bg-green-400/70', label: 'Vendidos' }, { color: 'bg-purple-400/70', label: 'Incubados' }, { color: 'bg-red-400/70', label: 'Perdidos' }].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`} />
                  <span className="text-[10px] text-theme-text-muted font-bold">{l.label}</span>
                </div>
              ))}
            </div>
            <BarChart records={records} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
              <p className="text-[10px] text-green-400 font-bold uppercase mb-1">Receita Total</p>
              <p className="text-lg font-black text-white">{fmtBRL(receita)}</p>
              <p className="text-[10px] text-theme-text-muted">{totalVendidos} ovos vendidos</p>
            </div>
            <div className={`rounded-xl p-3 border ${lucro >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <p className={`text-[10px] font-bold uppercase mb-1 ${lucro >= 0 ? 'text-blue-400' : 'text-red-400'}`}>Lucro Líquido</p>
              <p className={`text-lg font-black ${lucro >= 0 ? 'text-white' : 'text-red-400'}`}>{fmtBRL(lucro)}</p>
              <p className="text-[10px] text-theme-text-muted">Custo: {fmtBRL(custo)}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[{ label: 'Dias ativos', value: `${dias}d` }, { label: 'Lançamentos', value: records.length }, { label: 'Média/dia', value: mediaReal.toFixed(1) }].map(m => (
              <div key={m.label} className="rounded-xl bg-theme-surface border border-theme-border p-2 text-center">
                <p className="text-sm font-black text-white">{m.value}</p>
                <p className="text-[9px] text-theme-text-muted uppercase font-bold">{m.label}</p>
              </div>
            ))}
          </div>

          {records.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase text-theme-text-muted mb-2">Histórico de Registros (Clique para Editar ou Excluir)</p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 smooth-scroll">
                {[...records].sort((a, b) => b.data.localeCompare(a.data)).map(r => (
                  <div key={r.id || r.data} className="flex items-center justify-between text-xs bg-theme-surface border border-theme-border hover:border-theme-primary/40 rounded-xl px-3 py-2 transition-colors">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CalendarDays size={12} className="text-amber-400 shrink-0" />
                      <span className="text-theme-text-muted w-16 shrink-0 font-mono text-[11px]">{formatDate(r.data)}</span>
                      <span className="text-amber-400 font-bold shrink-0">{r.coletados} ovos</span>
                      {r.vendidos > 0 && <span className="text-green-400 shrink-0">+{r.vendidos}v</span>}
                      {(r.incubados || 0) > 0 && <span className="text-purple-400 shrink-0">+{r.incubados}c</span>}
                      {r.perdidos > 0 && <span className="text-red-400 shrink-0">-{r.perdidos}p</span>}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => onEditRecord(lot, r)}
                        className="p-1 text-theme-text-muted hover:text-amber-400 rounded-lg hover:bg-amber-400/10 transition-colors"
                        title="Editar lançamento"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir o registro do dia ${formatDate(r.data)}?`)) {
                            onDeleteRecord(lot, r.id);
                          }
                        }}
                        className="p-1 text-theme-text-muted hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Excluir lançamento"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente Principal: Eggs
// ─────────────────────────────────────────────────────────────────────────────
export function Eggs() {
  const { eggLots, addEggLot, editEggLot, birds, addIncubationLot } = useAppContext();

  const [registerTarget, setRegisterTarget] = useState<EggLot | null>(null);
  const [editingRecord, setEditingRecord] = useState<EggDailyRecord | null>(null);
  const [isCreateLotModalOpen, setIsCreateLotModalOpen] = useState(false);
  const [period, setPeriod] = useState<7 | 30 | 999>(30);

  // Modais de Destino dos Ovos
  const [incubationTarget, setIncubationTarget] = useState<{ lot: EggLot; stock: number } | null>(null);
  const [sellStockTarget, setSellStockTarget] = useState<{ lot: EggLot; stock: number } | null>(null);

  // Sincroniza lembrete de coleta diária no celular (Push)
  useEffect(() => {
    const today = todayISO();
    const hasRegisteredToday = eggLots.some(lot => (lot.registros || []).some(r => r.data === today));
    syncDailyEggReminder(hasRegisteredToday);
  }, [eggLots]);

  const { kpiColetados, kpiVendidos, kpiPerdidos, kpiIncubados, kpiReceita, kpiCusto, kpiLucro } = useMemo(() => {
    const cutoff = period === 999 ? '2000-01-01' : new Date(Date.now() - period * 86400000).toISOString().split('T')[0];
    let col = 0, vend = 0, perd = 0, inc = 0, rec = 0, cst = 0;
    for (const lot of eggLots) {
      for (const r of (lot.registros ?? [])) {
        if (r.data < cutoff) continue;
        col += r.coletados;
        vend += r.vendidos;
        perd += r.perdidos;
        inc += (r.incubados || 0);
        rec += (r.vendidos / 12) * r.precoVenda;
        cst += r.vendidos * r.custoProd;
      }
    }
    return { kpiColetados: col, kpiVendidos: vend, kpiPerdidos: perd, kpiIncubados: inc, kpiReceita: rec, kpiCusto: cst, kpiLucro: rec - cst };
  }, [eggLots, period]);

  const aproveitamento = kpiColetados > 0 ? Math.round(((kpiColetados - kpiPerdidos) / kpiColetados) * 100) : 0;
  const activeLots = eggLots.filter(l => l.status === 'Ativo');
  const endedLots = eggLots.filter(l => l.status === 'Encerrado');

  // Salva ou atualiza um registro diário
  const handleSaveRecord = (rec: EggDailyRecord) => {
    if (!registerTarget) return;

    const existingIndex = (registerTarget.registros || []).findIndex(r => r.id === rec.id || r.data === rec.data);
    let updatedRegistros: EggDailyRecord[];

    if (existingIndex >= 0) {
      updatedRegistros = [...(registerTarget.registros || [])];
      updatedRegistros[existingIndex] = rec;
    } else {
      updatedRegistros = [...(registerTarget.registros || []), rec];
    }

    editEggLot(registerTarget.id, { registros: updatedRegistros });
  };

  // Exclui um registro diário
  const handleDeleteRecord = (lot: EggLot, recordId: string) => {
    const updatedRegistros = (lot.registros || []).filter(r => r.id !== recordId);
    editEggLot(lot.id, { registros: updatedRegistros });
  };

  // Confirmação de envio para incubação / choco
  const handleConfirmIncubation = (count: number) => {
    if (!incubationTarget) return;
    const { lot } = incubationTarget;

    // 1. Cria o Lote de Incubação
    const newIncubationLot: IncubationLot = {
      id: uid(),
      coupleId: '',
      numeroLote: `Baia ${lot.baia}`,
      quantidadeOvos: count,
      dataInicio: todayISO(),
      baia: lot.baia,
      ovoscopia1Realizada: false,
      ovoscopia2Realizada: false,
      ovosDescartados1: 0,
      ovosDescartados2: 0,
      eclodido: false
    };
    addIncubationLot(newIncubationLot);

    // 2. Abate do estoque acumulando em `incubados` nos registros do lote
    const records = [...(lot.registros || [])].sort((a, b) => b.data.localeCompare(a.data));
    if (records.length > 0) {
      records[0].incubados = (records[0].incubados || 0) + count;
      editEggLot(lot.id, { registros: records });
    }
  };

  // Confirmação de venda direta do estoque
  const handleConfirmSellStock = (count: number, pricePerDozen: number) => {
    if (!sellStockTarget) return;
    const { lot } = sellStockTarget;

    const records = [...(lot.registros || [])].sort((a, b) => b.data.localeCompare(a.data));
    if (records.length > 0) {
      records[0].vendidos = (records[0].vendidos || 0) + count;
      records[0].precoVenda = pricePerDozen;
      editEggLot(lot.id, { registros: records });
    }
  };

  const periodLabel = period === 7 ? '7 dias' : period === 30 ? '30 dias' : 'Tudo';

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Egg size={24} className="text-amber-400" />
            <span>Gestão de Ovos</span>
          </h2>
          <p className="text-xs text-theme-text-muted mt-0.5">
            {activeLots.length} lote(s) ativo(s) &bull; {eggLots.reduce((s, l) => s + (l.registros?.length ?? 0), 0)} lançamentos
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Seletor de Período */}
          <div className="flex bg-theme-surface border border-theme-border rounded-xl p-1 gap-1">
            {([7, 30, 999] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${period === p ? 'bg-amber-400 text-black' : 'text-theme-text-muted hover:text-white'}`}
              >
                {p === 999 ? 'Tudo' : `${p}d`}
              </button>
            ))}
          </div>

          {/* Botão Novo Lote */}
          <button
            onClick={() => setIsCreateLotModalOpen(true)}
            className="btn-primary px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400 shadow-md shrink-0"
          >
            <Plus size={14} />
            <span>Novo Lote</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard icon={Egg} label="Coletados" value={String(kpiColetados)} sub={`${aproveitamento}% aproveitamento (${periodLabel})`} color="amber" />
        <KpiCard icon={Sparkles} label="Em Choco" value={String(kpiIncubados)} sub={`${kpiColetados - kpiVendidos - kpiPerdidos - kpiIncubados} estoque`} color="purple" />
        <KpiCard icon={DollarSign} label="Receita Total" value={fmtBRL(kpiReceita)} sub={`Custo ${fmtBRL(kpiCusto)}`} color="blue" />
        <KpiCard icon={kpiLucro >= 0 ? TrendingUp : TrendingDown} label="Lucro Líquido" value={fmtBRL(kpiLucro)} sub={`${kpiVendidos} vendidos`} color={kpiLucro >= 0 ? 'green' : 'red'} />
      </div>

      {/* Sem Lotes */}
      {eggLots.length === 0 && (
        <div className="rounded-2xl border border-dashed border-theme-border bg-theme-surface/40 p-10 text-center space-y-4">
          <Egg size={44} className="text-amber-400/40 mx-auto" />
          <div className="space-y-1">
            <p className="text-white font-black text-lg">Nenhum lote de postura cadastrado</p>
            <p className="text-theme-text-muted text-xs max-w-xs mx-auto">
              Cadastre um lote para começar a registrar as coletas diárias e acompanhar os lucros do seu criatório.
            </p>
          </div>
          <button
            onClick={() => setIsCreateLotModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400 shadow-lg shadow-amber-500/10"
          >
            <Plus size={16} />
            <span>Criar Primeiro Lote de Postura</span>
          </button>
        </div>
      )}

      {/* Lotes Ativos */}
      {activeLots.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-muted flex items-center gap-2">
            <Layers size={12} />
            <span>Lotes Ativos ({activeLots.length})</span>
          </h3>
          {activeLots.map(lot => (
            <LotCard
              key={lot.id}
              lot={lot}
              birds={birds}
              onRegister={l => { setEditingRecord(null); setRegisterTarget(l); }}
              onEditRecord={(l, r) => { setEditingRecord(r); setRegisterTarget(l); }}
              onDeleteRecord={handleDeleteRecord}
              onSendToIncubation={(l, s) => setIncubationTarget({ lot: l, stock: s })}
              onSellFromStock={(l, s) => setSellStockTarget({ lot: l, stock: s })}
            />
          ))}
        </div>
      )}

      {/* Lotes Encerrados */}
      {endedLots.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-muted flex items-center gap-2">
            <Layers size={12} />
            <span>Lotes Encerrados ({endedLots.length})</span>
          </h3>
          {endedLots.map(lot => (
            <LotCard
              key={lot.id}
              lot={lot}
              birds={birds}
              onRegister={l => { setEditingRecord(null); setRegisterTarget(l); }}
              onEditRecord={(l, r) => { setEditingRecord(r); setRegisterTarget(l); }}
              onDeleteRecord={handleDeleteRecord}
              onSendToIncubation={(l, s) => setIncubationTarget({ lot: l, stock: s })}
              onSellFromStock={(l, s) => setSellStockTarget({ lot: l, stock: s })}
            />
          ))}
        </div>
      )}

      {/* Modal: Registrar / Editar Dia */}
      {registerTarget && (
        <RegisterDaySheet
          lot={registerTarget}
          editingRecord={editingRecord}
          onClose={() => { setRegisterTarget(null); setEditingRecord(null); }}
          onSave={handleSaveRecord}
        />
      )}

      {/* Modal: Enviar para Incubação */}
      {incubationTarget && (
        <SendToIncubationModal
          lot={incubationTarget.lot}
          availableStock={incubationTarget.stock}
          onClose={() => setIncubationTarget(null)}
          onConfirm={handleConfirmIncubation}
        />
      )}

      {/* Modal: Registrar Venda do Estoque */}
      {sellStockTarget && (
        <SellFromStockModal
          lot={sellStockTarget.lot}
          availableStock={sellStockTarget.stock}
          onClose={() => setSellStockTarget(null)}
          onConfirm={handleConfirmSellStock}
        />
      )}

      {/* Modal: Criar Lote de Postura */}
      {isCreateLotModalOpen && (
        <CreateEggLotModal
          onClose={() => setIsCreateLotModalOpen(false)}
          onSave={addEggLot}
        />
      )}
    </div>
  );
}
