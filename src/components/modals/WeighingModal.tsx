import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Scale, History, Check, Trash2, X, Calculator } from 'lucide-react';
import { useAppContext, type MeatLot, type WeightRecord } from '../../lib/AppContext';

interface WeighingModalProps {
  isOpen: boolean;
  lote: MeatLot | null;
  onClose: () => void;
}

function parseWeightG(val: string | number | undefined, isChick?: boolean): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).toLowerCase().replace(',', '.').trim();
  const match = clean.match(/([\d.]+)/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return 0;
  if (clean.includes('kg')) {
    return Math.round(num * 1000);
  }
  if (clean.includes('g')) {
    return Math.round(num);
  }
  if (isChick) {
    if (num < 1) return Math.round(num * 1000);
    return Math.round(num);
  }
  if (num < 20) {
    return Math.round(num * 1000);
  }
  return Math.round(num);
}

function formatWeightG(grams: number): string {
  if (!grams || grams <= 0) return '0g';
  if (grams >= 1000) {
    return (grams / 1000).toFixed(2).replace('.', ',') + ' kg';
  }
  return Math.round(grams) + 'g';
}

function fmtDate(iso: string) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}

export function WeighingModal({ isOpen, lote, onClose }: WeighingModalProps) {
  const { editMeatLot, showToast } = useAppContext();

  const [wData, setWData] = useState(() => new Date().toISOString().split('T')[0]);
  const [wPesoMedio, setWPesoMedio] = useState('');
  const [wPesoTotal5, setWPesoTotal5] = useState('');
  const [wObs, setWObs] = useState('');

  if (!isOpen || !lote) return null;

  const currentPesagens = lote.pesagens || [];

  // Se digitar a soma das 5 aves na balança, auto-calcula a divisão por 5 na hora!
  const handleTotal5Change = (val: string) => {
    setWPesoTotal5(val);
    const totalG = parseWeightG(val);
    if (totalG > 0) {
      const avg = Math.round(totalG / 5);
      setWPesoMedio(formatWeightG(avg));
    }
  };

  const handleSaveWeightRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const pesoG = parseWeightG(wPesoMedio);
    if (pesoG <= 0) {
      showToast('Informe um peso válido (ex: 2.1kg ou 2100g)', 'warning');
      return;
    }

    const newRecord: WeightRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      data: wData,
      pesoMedioG: pesoG,
      observacao: wObs.trim() || undefined,
      avesPesadas: 5
    };

    const updatedPesagens = [...currentPesagens, newRecord].sort((a, b) => a.data.localeCompare(b.data));
    editMeatLot(lote.id, { pesagens: updatedPesagens });
    setWPesoMedio('');
    setWPesoTotal5('');
    setWObs('');
    showToast('Pesagem registrada com sucesso!', 'success');
    onClose();
  };

  const handleDeleteWeightRecord = (recordId: string) => {
    const updated = currentPesagens.filter(p => p.id !== recordId);
    editMeatLot(lote.id, { pesagens: updated });
    showToast('Registro de pesagem removido.', 'info');
  };

  const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors placeholder-theme-text-muted";
  const labelCls = "text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1 block";

  return createPortal(
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 overflow-hidden animate-fade-in"
      onClick={onClose}
      onTouchMove={e => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div 
        className="bg-theme-surface border border-theme-border/80 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-theme-border flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wider block">
              Lote de Engorda · Baia {lote.baia}{lote.raca ? ` · ${lote.raca}` : ''}
            </span>
            <h3 className="font-black text-lg text-white flex items-center gap-2">
              <Scale className="text-theme-primary" size={20} />
              Acompanhamento de Pesagem
            </h3>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-theme-text-muted hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0 modal-scrollable-content touch-pan-y">
          
          {/* Instrução simples */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <Scale className="text-amber-400 shrink-0 mt-0.5" size={20} />
            <div className="text-xs text-amber-200 leading-relaxed">
              <p className="font-black text-white text-sm">
                Aferição de Peso do Lote:
              </p>
              <p className="mt-1 text-white/90">
                Pese uma amostra de aves (ex: 5 aves), tire a média e informe abaixo para acompanhar o ganho diário e estimativa de abate.
              </p>
            </div>
          </div>

          {/* Formulário Simples e Direto */}
          <form onSubmit={handleSaveWeightRecord} className="bg-theme-base/60 border border-theme-border/70 rounded-2xl p-4 space-y-3.5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Data da Pesagem</label>
                <input
                  required
                  type="date"
                  value={wData}
                  onChange={e => setWData(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="space-y-1">
                <label className={labelCls}>
                  Peso Médio <span className="text-theme-primary">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: 2.1kg ou 2100g"
                  value={wPesoMedio}
                  onChange={e => setWPesoMedio(e.target.value)}
                  className={inputCls + " text-base font-bold text-white"}
                />
              </div>
            </div>

            {/* Sugestões rápidas de peso */}
            <div className="flex items-center justify-between text-[11px] text-theme-text-muted pt-0.5">
              <span>Atalhos rápidos:</span>
              <div className="flex flex-wrap gap-1">
                {['1.5kg', '1.8kg', '2.0kg', '2.2kg', '2.5kg', '2.8kg'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setWPesoMedio(p)}
                    className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                      wPesoMedio === p
                        ? 'bg-theme-primary text-black font-black border-theme-primary'
                        : 'bg-theme-surface border-theme-border hover:border-theme-primary/50 text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Opção prática: Colocar as aves juntas na balança e o sistema divide automaticamente */}
            <div className="p-3 rounded-xl bg-theme-surface/70 border border-theme-border/60 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-theme-text-muted">
                <Calculator size={13} className="text-theme-primary" />
                <span>Quer pesar 5 aves juntas na balança? (Opcional)</span>
              </div>
              <p className="text-[11px] text-theme-text-muted">
                Digite o peso total das 5 aves que o sistema divide por 5 para você:
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Ex: 11kg (total das 5 aves)"
                  value={wPesoTotal5}
                  onChange={e => handleTotal5Change(e.target.value)}
                  className="flex-1 bg-theme-base border border-theme-border rounded-lg p-2 text-xs text-white focus:border-theme-primary outline-none"
                />
                <span className="text-xs text-theme-text-muted font-bold">÷ 5 =</span>
                <span className="bg-theme-primary/10 border border-theme-primary/30 text-theme-primary font-black px-3 py-2 rounded-lg text-xs min-w-[70px] text-center">
                  {wPesoMedio || '0kg'}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Observações (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Pintinhos bem desenvolvidos..."
                value={wObs}
                onChange={e => setWObs(e.target.value)}
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-theme-primary hover:bg-theme-primary-hover text-black font-black text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 active:scale-95"
            >
              <Check size={16} /> Salvar Pesagem do Lote
            </button>
          </form>

          {/* Histórico das Pesagens */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-white flex items-center gap-1.5">
                <History size={14} className="text-theme-primary" />
                Histórico de Pesagens ({currentPesagens.length})
              </p>
              <span className="text-[10px] text-theme-text-muted">
                Inicial: <strong>{lote.pesoMedioInicial || '—'}</strong>
              </span>
            </div>

            {currentPesagens.length === 0 ? (
              <div className="text-center p-5 bg-theme-base/30 rounded-xl border border-dashed border-theme-border/60 text-theme-text-muted text-xs">
                Nenhuma pesagem registrada ainda. Realize a cada 15 dias para acompanhar a evolução do lote.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 modal-scrollable-content touch-pan-y">
                {[...currentPesagens]
                  .sort((a, b) => b.data.localeCompare(a.data))
                  .map((p, idx, arr) => {
                    const nextOldest = arr[idx + 1];
                    const diff = nextOldest ? p.pesoMedioG - nextOldest.pesoMedioG : null;
                    return (
                      <div key={p.id} className="p-3 bg-theme-base/80 border border-theme-border/60 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{fmtDate(p.data)}</span>
                            <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/20">
                              {formatWeightG(p.pesoMedioG)}
                            </span>
                            {diff !== null && (
                              <span className={`text-[10px] font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {diff >= 0 ? `+${formatWeightG(diff)}` : `-${formatWeightG(Math.abs(diff))}`}
                              </span>
                            )}
                          </div>
                          {p.observacao && (
                            <p className="text-[10px] text-theme-text-muted mt-0.5 italic">{p.observacao}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteWeightRecord(p.id)}
                          className="p-1.5 text-theme-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                          title="Remover pesagem"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-theme-border flex justify-end shrink-0 bg-theme-surface/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-theme-surface border border-theme-border rounded-xl text-xs font-bold text-white hover:border-theme-primary transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
