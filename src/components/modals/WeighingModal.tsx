import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Scale, Plus, History, Check, Trash2, X } from 'lucide-react';
import { useAppContext, type MeatLot, type WeightRecord } from '../../lib/AppContext';

interface WeighingModalProps {
  isOpen: boolean;
  lote: MeatLot | null;
  onClose: () => void;
}

function parseWeightG(val: string | number | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).toLowerCase().replace(',', '.').trim();
  const match = clean.match(/([\d.]+)/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return 0;
  if (clean.includes('kg') || (!clean.includes('g') && num < 20)) {
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
  const [wPeso, setWPeso] = useState('');
  const [wObs, setWObs] = useState('');

  if (!isOpen || !lote) return null;

  const currentPesagens = lote.pesagens || [];

  const handleSaveWeightRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const pesoG = parseWeightG(wPeso);
    if (pesoG <= 0) {
      showToast('Informe um peso válido (ex: 2.1kg ou 2100g)', 'warning');
      return;
    }

    const newRecord: WeightRecord = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      data: wData,
      pesoMedioG: pesoG,
      observacao: wObs.trim() || undefined
    };

    const updatedPesagens = [...currentPesagens, newRecord].sort((a, b) => a.data.localeCompare(b.data));
    editMeatLot(lote.id, { pesagens: updatedPesagens });
    setWPeso('');
    setWObs('');
    showToast('Pesagem registrada com sucesso!', 'success');
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
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 overflow-hidden select-none animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-theme-surface border border-theme-border/80 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-theme-border flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wider block">
              Baia {lote.baia}{lote.raca ? ` · ${lote.raca}` : ''}
            </span>
            <h3 className="font-black text-lg text-white flex items-center gap-2">
              <Scale className="text-theme-primary" size={18} />
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

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Formulário de Nova Pesagem */}
          <form onSubmit={handleSaveWeightRecord} className="bg-theme-base/60 border border-theme-border/70 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black text-white flex items-center gap-1.5">
              <Plus size={14} className="text-theme-primary" />
              Nova Aferição de Peso
            </p>

            <div className="grid grid-cols-2 gap-3">
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
                <label className={labelCls}>Peso Médio Aferido *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: 2.1kg ou 2100g"
                  value={wPeso}
                  onChange={e => setWPeso(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Observações (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Amostragem de 10 aves na balança"
                value={wObs}
                onChange={e => setWObs(e.target.value)}
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-black text-xs rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/10 flex items-center justify-center gap-1.5"
            >
              <Check size={14} /> Salvar Registro de Peso
            </button>
          </form>

          {/* Histórico de Pesagens Anteriores */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-white flex items-center gap-1.5">
                <History size={14} className="text-theme-primary" />
                Histórico de Pesagens ({currentPesagens.length})
              </p>
              <span className="text-[10px] text-theme-text-muted">
                Inicial: <strong>{lote.pesoMedioInicial}</strong>
              </span>
            </div>

            {currentPesagens.length === 0 ? (
              <div className="text-center p-6 bg-theme-base/30 rounded-xl border border-dashed border-theme-border/60 text-theme-text-muted text-xs">
                Nenhuma pesagem manual registrada ainda. Registre acima para acompanhar o ganho real do lote.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
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
