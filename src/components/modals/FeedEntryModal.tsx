import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Wheat, Plus, Trash2, Calendar, Scale, DollarSign } from 'lucide-react';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import type { FeedEntry } from '../../lib/AppContext';

interface FeedEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lotName: string;          // ex: "Lote de Postura - Baia 3"
  feedEntries: FeedEntry[];
  onSave: (entries: FeedEntry[]) => void;
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function fmtCurrency(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors placeholder-theme-text-muted";
const labelCls = "text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1 block";

export function FeedEntryModal({
  isOpen,
  onClose,
  lotName,
  feedEntries,
  onSave
}: FeedEntryModalProps) {
  useModalScrollLock(isOpen);

  const [localEntries, setLocalEntries] = useState<FeedEntry[]>([]);
  const [form, setForm] = useState({
    data: todayISO(),
    kgRacao: '',
    custoKg: '',
    tipoRacao: '',
    observacao: '',
  });
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLocalEntries([...(feedEntries || [])]);
      // Pre-fill custoKg from last entry
      const lastEntry = feedEntries && feedEntries.length > 0 ? feedEntries[feedEntries.length - 1] : null;
      setForm(prev => ({
        ...prev,
        data: todayISO(),
        kgRacao: '',
        custoKg: lastEntry ? String(lastEntry.custoKg) : '',
        tipoRacao: lastEntry?.tipoRacao || '',
        observacao: '',
      }));
    }
  }, [isOpen, feedEntries]);

  if (!isOpen) return null;

  const kg = parseFloat(form.kgRacao.replace(',', '.')) || 0;
  const custo = parseFloat(form.custoKg.replace(',', '.')) || 0;
  const totalCusto = kg > 0 && custo > 0 ? kg * custo : 0;

  const canAdd = kg > 0 && Boolean(form.data);

  const handleAdd = () => {
    if (!canAdd) return;
    const entry: FeedEntry = {
      id: uid(),
      data: form.data,
      kgRacao: kg,
      custoKg: custo,
      totalCusto,
      tipoRacao: form.tipoRacao.trim() || undefined,
      observacao: form.observacao.trim() || undefined,
    };
    const updated = [...localEntries, entry].sort((a, b) => a.data.localeCompare(b.data));
    setLocalEntries(updated);
    setForm(prev => ({ ...prev, kgRacao: '', observacao: '' }));
  };

  const handleDelete = (id: string) => {
    setLocalEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleSave = () => {
    let finalEntries = [...localEntries];
    if (canAdd) {
      const entry: FeedEntry = {
        id: uid(),
        data: form.data,
        kgRacao: kg,
        custoKg: custo,
        totalCusto,
        tipoRacao: form.tipoRacao.trim() || undefined,
        observacao: form.observacao.trim() || undefined,
      };
      finalEntries = [...finalEntries, entry].sort((a, b) => a.data.localeCompare(b.data));
    }
    onSave(finalEntries);
    onClose();
  };

  // Aggregates
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthEntries = localEntries.filter(e => e.data.startsWith(thisMonth));
  const totalKgMonth = monthEntries.reduce((s, e) => s + e.kgRacao, 0);
  const totalCustoMonth = monthEntries.reduce((s, e) => s + e.totalCusto, 0);
  const totalKgAll = localEntries.reduce((s, e) => s + e.kgRacao, 0);
  const totalCustoAll = localEntries.reduce((s, e) => s + e.totalCusto, 0);

  const recentEntries = [...localEntries].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 10);

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface border border-theme-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-theme-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Wheat size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Gasto de Ração</h2>
              <p className="text-[11px] text-theme-text-muted">{lotName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-theme-text-muted hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-theme-base border border-theme-border rounded-2xl p-4">
              <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1">Este Mês</p>
              <p className="text-lg font-black text-white">{totalKgMonth.toFixed(1)} kg</p>
              <p className="text-xs text-amber-400 font-bold">{fmtCurrency(totalCustoMonth)}</p>
            </div>
            <div className="bg-theme-base border border-theme-border rounded-2xl p-4">
              <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1">Total Geral</p>
              <p className="text-lg font-black text-white">{totalKgAll.toFixed(1)} kg</p>
              <p className="text-xs text-amber-400 font-bold">{fmtCurrency(totalCustoAll)}</p>
            </div>
          </div>

          {/* Add Entry Form */}
          <div className="bg-theme-base border border-theme-border rounded-2xl p-4 space-y-4">
            <p className="text-xs font-black text-white flex items-center gap-2">
              <Plus size={14} className="text-theme-primary" />
              Registrar Consumo de Ração
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}><Calendar size={10} className="inline mr-1" />Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}><Scale size={10} className="inline mr-1" />Quantidade (kg)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Ex: 5"
                  value={form.kgRacao}
                  onChange={e => setForm(p => ({ ...p, kgRacao: e.target.value }))}
                  className={inputCls}
                  min="0"
                  step="0.1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}><DollarSign size={10} className="inline mr-1" />Preço por kg (R$, opcional)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Ex: 3.50 (ou deixe vazio)"
                  value={form.custoKg}
                  onChange={e => setForm(p => ({ ...p, custoKg: e.target.value }))}
                  className={inputCls}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className={labelCls}>Tipo de Ração (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Postura Fase 1"
                  value={form.tipoRacao}
                  onChange={e => setForm(p => ({ ...p, tipoRacao: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Live calculation */}
            {totalCusto > 0 && (
              <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <span className="text-xs text-amber-300 font-bold">
                  {kg.toFixed(1)} kg × {fmtCurrency(custo)}/kg
                </span>
                <span className="text-base font-black text-amber-400">
                  = {fmtCurrency(totalCusto)}
                </span>
              </div>
            )}
            {kg > 0 && custo === 0 && (
              <div className="flex items-center justify-between p-3 bg-theme-surface border border-theme-border rounded-xl">
                <span className="text-xs text-theme-text-muted">
                  {kg.toFixed(1)} kg registrados (sem custo financeiro)
                </span>
                <span className="text-xs font-bold text-zinc-300">
                  Apenas consumo em kg
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleAdd}
              disabled={!canAdd}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Registrar
            </button>
          </div>

          {/* History */}
          {recentEntries.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowHistory(p => !p)}
                className="flex items-center justify-between w-full text-xs font-black text-white"
              >
                <span>Histórico ({localEntries.length} registros)</span>
                <span className="text-theme-text-muted">{showHistory ? '▲' : '▼'}</span>
              </button>
              {showHistory && (
                <div className="space-y-2 animate-fade-in">
                  {recentEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 bg-theme-base border border-theme-border rounded-xl"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-white">{fmtDate(entry.data)}</span>
                          <span className="text-xs text-amber-400 font-bold">{entry.kgRacao} kg</span>
                          {entry.tipoRacao && (
                            <span className="text-[10px] text-theme-text-muted">{entry.tipoRacao}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-theme-text-muted">
                          {fmtCurrency(entry.custoKg)}/kg → <strong className="text-white">{fmtCurrency(entry.totalCusto)}</strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2 shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {localEntries.length > 10 && (
                    <p className="text-[10px] text-center text-theme-text-muted">
                      Mostrando os 10 mais recentes de {localEntries.length} registros.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-theme-border shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-theme-border text-theme-text-muted hover:text-white hover:border-white/20 text-sm font-bold transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl bg-theme-primary hover:bg-amber-400 text-black font-black text-sm transition-all active:scale-[0.98]"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
