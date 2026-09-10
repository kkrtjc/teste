import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, X, Plus, History, TrendingDown, TrendingUp, CheckCircle, Trash2, Search, Check } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface LotMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  lote: any;
  loteType: 'postura' | 'engorda' | 'pintinhos' | 'crescimento';
  birds: any[];
  editBird: (id: string, updated: any) => void;
  editEggLot: (id: string, updated: any) => void;
  editMeatLot: (id: string, updated: any) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-theme-text-muted/50 focus:border-theme-primary outline-none transition-colors";
const labelCls = "block text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1.5";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <label className={labelCls}>{children}</label>;
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
}

function onlyNumericKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
  if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
}

function sanitizeNumeric(val: string): string {
  return val.replace(/\D/g, '');
}

function BirdPicker({
  birds,
  selected,
  onToggle,
  onSelectAll,
  search,
  onSearch,
  emptyMsg
}: {
  birds: { id: string; anilha: string; nome: string; raca: string; sexo: string; status: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  search: string;
  onSearch: (v: string) => void;
  emptyMsg: string;
}) {
  const filtered = birds.filter(b =>
    b.anilha.toLowerCase().includes(search.toLowerCase()) ||
    b.raca.toLowerCase().includes(search.toLowerCase()) ||
    b.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={labelCls}>{selected.length} selecionada(s)</span>
        {filtered.length > 0 && (
          <button
            type="button"
            onClick={() => onSelectAll(filtered.map(b => b.id))}
            className="text-[10px] text-theme-primary font-bold hover:underline"
          >
            {filtered.every(b => selected.includes(b.id)) ? 'Desmarcar todas' : 'Selecionar filtradas'}
          </button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={13} />
        <input
          type="text"
          placeholder="Buscar por anilha, raça ou nome..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="w-full bg-theme-base border border-theme-border rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:border-theme-primary outline-none"
        />
      </div>
      <div className="border border-theme-border rounded-xl max-h-44 overflow-y-auto divide-y divide-theme-border/40 bg-theme-base/30">
        {filtered.map(b => {
          const sel = selected.includes(b.id);
          return (
            <div
              key={b.id}
              onClick={() => onToggle(b.id)}
              className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div>
                <p className="text-xs font-bold text-white">Anilha: {b.anilha}{b.nome ? ` - ${b.nome}` : ''}</p>
                <p className="text-[10px] text-theme-text-muted">{b.raca} | {b.sexo} | {b.status}</p>
              </div>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${sel ? 'bg-theme-primary border-theme-primary text-black' : 'border-theme-border bg-theme-surface'}`}>
                {sel && <Check size={11} strokeWidth={3} />}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="p-4 text-center text-xs text-theme-text-muted italic">{emptyMsg}</p>
        )}
      </div>
    </div>
  );
}

export function LotMovementModal({
  isOpen,
  onClose,
  lote,
  loteType,
  birds,
  editBird,
  editEggLot,
  editMeatLot,
  showToast
}: LotMovementModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'novo' | 'historico'>('novo');
  const [tipo, setTipo] = useState<'saida' | 'entrada'>('saida');
  const [isRegistered, setIsRegistered] = useState<'yes' | 'no'>('yes');
  const [selectedBirdIds, setSelectedBirdIds] = useState<string[]>([]);
  const [birdSearch, setBirdSearch] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('Mortalidade / Óbito');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  const [data, setData] = useState(todayISO());
  const [observacao, setObservacao] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen || !lote) return null;

  const currentCount = loteType === 'postura'
    ? Math.max(lote.qtdFemeas || 0, lote.femeasIds?.length || 0)
    : Math.max(lote.qtdAves || 0, lote.avesIds?.length || 0);

  const motivosSaida = [
    'Mortalidade / Óbito',
    'Abate',
    'Venda',
    'Transferência de Baia',
    'Ajuste de Inventário',
    'Outro'
  ];

  const motivosEntrada = [
    'Introdução / Nova Ave',
    'Nascimento / Eclosão',
    'Retorno de Baia',
    'Ajuste de Inventário',
    'Outro'
  ];

  const motivosDisponiveis = tipo === 'saida' ? motivosSaida : motivosEntrada;

  const handleTipoChange = (newTipo: 'saida' | 'entrada') => {
    setTipo(newTipo);
    setMotivo(newTipo === 'saida' ? 'Mortalidade / Óbito' : 'Introdução / Nova Ave');
    setMotivoPersonalizado('');
    if (newTipo === 'entrada') {
      setIsRegistered('yes');
      setSelectedBirdIds([]);
    }
  };

  const availableBirds = birds.filter(b => {
    if (b.status === 'Vendido' || b.status === 'Faleceu') return false;
    if (loteType === 'postura' && b.sexo !== 'Fêmea') return false;
    const existingIds = lote.femeasIds || lote.avesIds || [];
    if (existingIds.includes(b.id)) return false;
    return true;
  });

  const handleToggleBird = (id: string) => {
    setSelectedBirdIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllBirds = (ids: string[]) => {
    if (ids.every(id => selectedBirdIds.includes(id))) {
      setSelectedBirdIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedBirdIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const isAddingRegistered = tipo === 'entrada' && isRegistered === 'yes';

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    let qtyNum = 0;

    if (isAddingRegistered) {
      if (selectedBirdIds.length === 0) {
        showToast('Por favor, selecione ao menos uma ave da lista para adicionar.', 'warning');
        return;
      }
      qtyNum = selectedBirdIds.length;
    } else {
      qtyNum = parseInt(quantidade);
      if (!qtyNum || qtyNum <= 0) {
        showToast('Por favor, informe uma quantidade válida maior que 0.', 'warning');
        return;
      }
    }

    const finalMotivo = motivo === 'Outro' ? (motivoPersonalizado.trim() || 'Outro') : motivo;

    const newRecord: any = {
      id: uid(),
      tipo,
      quantidade: qtyNum,
      motivo: finalMotivo,
      data: data || todayISO(),
      observacao: observacao.trim() || undefined
    };

    if (isAddingRegistered) {
      newRecord.avesIds = selectedBirdIds;
    }

    const updatedMovimentacoes = [newRecord, ...(lote.movimentacoes || [])];

    const newTotal = tipo === 'entrada'
      ? currentCount + qtyNum
      : Math.max(0, currentCount - qtyNum);

    // Se adicionou aves registradas, atualiza a baia de cada uma das aves no sistema
    if (isAddingRegistered && selectedBirdIds.length > 0) {
      selectedBirdIds.forEach(birdId => {
        editBird(birdId, { baia: lote.baia });
      });
    }

    if (loteType === 'postura') {
      const updatedFemeas = isAddingRegistered
        ? Array.from(new Set([...(lote.femeasIds || []), ...selectedBirdIds]))
        : (lote.femeasIds || []);

      editEggLot(lote.id, {
        qtdFemeas: newTotal,
        ...(isAddingRegistered ? { femeasIds: updatedFemeas } : {}),
        movimentacoes: updatedMovimentacoes
      });
    } else {
      const updatedAves = isAddingRegistered
        ? Array.from(new Set([...(lote.avesIds || []), ...selectedBirdIds]))
        : (lote.avesIds || []);

      editMeatLot(lote.id, {
        qtdAves: newTotal,
        ...(isAddingRegistered ? { avesIds: updatedAves } : {}),
        movimentacoes: updatedMovimentacoes
      });
    }

    showToast(
      tipo === 'saida'
        ? `Baixa de ${qtyNum} ave(s) registrada com sucesso (-${qtyNum})`
        : `Entrada de ${qtyNum} ave(s) ${isAddingRegistered ? 'cadastrada(s)' : ''} registrada com sucesso (+${qtyNum})`,
      'success'
    );

    setQuantidade('');
    setSelectedBirdIds([]);
    setObservacao('');
    setMotivoPersonalizado('');
    setActiveSubTab('historico');
  };

  const handleConfirmDeleteMovement = () => {
    if (!deleteConfirmId) return;
    const targetMov = lote.movimentacoes?.find((m: any) => m.id === deleteConfirmId);
    if (!targetMov) {
      setDeleteConfirmId(null);
      return;
    }

    const updatedMovimentacoes = (lote.movimentacoes || []).filter((m: any) => m.id !== deleteConfirmId);

    const newTotal = targetMov.tipo === 'entrada'
      ? Math.max(0, currentCount - targetMov.quantidade)
      : currentCount + targetMov.quantidade;

    if (loteType === 'postura') {
      editEggLot(lote.id, {
        qtdFemeas: newTotal,
        movimentacoes: updatedMovimentacoes
      });
    } else {
      editMeatLot(lote.id, {
        qtdAves: newTotal,
        movimentacoes: updatedMovimentacoes
      });
    }

    showToast('Movimentação removida e saldo atualizado!', 'info');
    setDeleteConfirmId(null);
  };

  const lotTitleMap = {
    postura: 'Lote de Postura',
    engorda: 'Lote de Engorda',
    pintinhos: 'Lote de Pintinhos',
    crescimento: 'Lote de Crescimento'
  };

  const effectiveQty = isAddingRegistered ? selectedBirdIds.length : (parseInt(quantidade) || 0);

  return (
    <>
      {createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
          <div className="bg-theme-surface border border-theme-border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-up my-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-theme-border pb-4">
              <div>
                <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wider block">
                  Baia {lote.baia} · {lotTitleMap[loteType]}
                </span>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Activity size={18} className="text-theme-primary" />
                  Ajuste & Baixas de Aves
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-theme-text-muted hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info Card current count */}
            <div className="bg-theme-base border border-theme-border rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-theme-text-muted uppercase">Quantidade Atual no Lote</p>
                <p className="text-2xl font-black text-white">{currentCount} <span className="text-xs font-bold text-theme-text-muted">aves</span></p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('novo')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeSubTab === 'novo' ? 'bg-theme-primary text-black' : 'bg-theme-surface text-theme-text-muted border border-theme-border'}`}
                >
                  <Plus size={13} /> Nova Movimentação
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('historico')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeSubTab === 'historico' ? 'bg-theme-primary text-black' : 'bg-theme-surface text-theme-text-muted border border-theme-border'}`}
                >
                  <History size={13} /> Histórico ({lote.movimentacoes?.length || 0})
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {activeSubTab === 'novo' ? (
                <form onSubmit={handleSaveMovement} className="space-y-4">
                  {/* Toggle Tipo */}
                  <div>
                    <SectionLabel>Tipo de Movimentação</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleTipoChange('saida')}
                        className={`py-3 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                          tipo === 'saida'
                            ? 'bg-red-500/20 border-red-500 text-red-400 shadow-lg shadow-red-900/30'
                            : 'bg-theme-base border-theme-border text-theme-text-muted hover:text-white'
                        }`}
                      >
                        <TrendingDown size={16} /> Baixa / Saída (-)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTipoChange('entrada')}
                        className={`py-3 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                          tipo === 'entrada'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-900/30'
                            : 'bg-theme-base border-theme-border text-theme-text-muted hover:text-white'
                        }`}
                      >
                        <TrendingUp size={16} /> Entrada / Adição (+)
                      </button>
                    </div>
                  </div>

                  {/* Se for Entrada, Pergunta se as aves estão cadastradas */}
                  {tipo === 'entrada' && (
                    <div className="bg-theme-base/60 border border-theme-border rounded-xl p-3 space-y-2">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CheckCircle size={14} className="text-theme-primary" />
                        As aves sendo adicionadas já estão cadastradas no sistema?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setIsRegistered('yes')}
                          className={`py-2 px-3 rounded-lg border text-xs font-extrabold transition-all ${
                            isRegistered === 'yes'
                              ? 'bg-theme-primary text-black border-theme-primary'
                              : 'bg-theme-surface border-theme-border text-theme-text-muted hover:text-white'
                          }`}
                        >
                          Sim (Selecionar da Lista)
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsRegistered('no')}
                          className={`py-2 px-3 rounded-lg border text-xs font-extrabold transition-all ${
                            isRegistered === 'no'
                              ? 'bg-theme-primary text-black border-theme-primary'
                              : 'bg-theme-surface border-theme-border text-theme-text-muted hover:text-white'
                          }`}
                        >
                          Não (Informar Quantidade)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Se Entrada & Cadastrada: Exibe Selecionador de Aves */}
                  {isAddingRegistered ? (
                    <div className="space-y-2">
                      <SectionLabel>Selecionar Aves Cadastradas ({selectedBirdIds.length} selecionada(s))</SectionLabel>
                      <BirdPicker
                        birds={availableBirds}
                        selected={selectedBirdIds}
                        onToggle={handleToggleBird}
                        onSelectAll={handleSelectAllBirds}
                        search={birdSearch}
                        onSearch={setBirdSearch}
                        emptyMsg="Nenhuma ave disponível no sistema para vincular a este lote."
                      />
                      <div>
                        <SectionLabel>Data da Ocorrência</SectionLabel>
                        <input
                          type="date"
                          value={data}
                          onChange={e => setData(e.target.value)}
                          className={inputCls}
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    /* Quantidade & Data Manual */
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <SectionLabel>Quantidade de Aves</SectionLabel>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Ex: 3"
                          value={quantidade}
                          onKeyDown={onlyNumericKeyDown}
                          onChange={e => setQuantidade(sanitizeNumeric(e.target.value))}
                          className={inputCls}
                          required
                        />
                      </div>
                      <div>
                        <SectionLabel>Data da Ocorrência</SectionLabel>
                        <input
                          type="date"
                          value={data}
                          onChange={e => setData(e.target.value)}
                          className={inputCls}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Motivo */}
                  <div>
                    <SectionLabel>Motivo da Movimentação</SectionLabel>
                    <select
                      value={motivo}
                      onChange={e => setMotivo(e.target.value)}
                      className={inputCls}
                    >
                      {motivosDisponiveis.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {motivo === 'Outro' && (
                    <div>
                      <SectionLabel>Especifique o Motivo</SectionLabel>
                      <input
                        type="text"
                        placeholder="Descreva o motivo..."
                        value={motivoPersonalizado}
                        onChange={e => setMotivoPersonalizado(e.target.value)}
                        className={inputCls}
                        required
                      />
                    </div>
                  )}

                  {/* Observações */}
                  <div>
                    <SectionLabel>Observações Adicionais (Opcional)</SectionLabel>
                    <textarea
                      rows={2}
                      placeholder="Ex: 2 morreram de frio e 1 foi separada por machucado..."
                      value={observacao}
                      onChange={e => setObservacao(e.target.value)}
                      className={inputCls + " resize-none"}
                    />
                  </div>

                  {/* Preview de Resultado */}
                  {effectiveQty > 0 && (
                    <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      tipo === 'saida' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    }`}>
                      <span>Saldo estimado do lote após registrar:</span>
                      <span className="text-sm font-black">
                        {currentCount} {tipo === 'saida' ? '-' : '+'} {effectiveQty} = {
                          tipo === 'saida' ? Math.max(0, currentCount - effectiveQty) : currentCount + effectiveQty
                        } aves
                      </span>
                    </div>
                  )}

                  {/* Submit */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-3 bg-theme-base border border-theme-border rounded-xl text-xs font-bold text-theme-text-muted hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                        tipo === 'saida' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-emerald-500 text-black hover:bg-emerald-400'
                      }`}
                    >
                      {tipo === 'saida' ? 'Confirmar Baixa' : 'Confirmar Entrada'}
                    </button>
                  </div>
                </form>
              ) : (
                /* Histórico */
                <div className="space-y-3">
                  <SectionLabel>Histórico de Entradas e Baixas</SectionLabel>
                  {(!lote.movimentacoes || lote.movimentacoes.length === 0) ? (
                    <div className="text-center p-8 bg-theme-base rounded-2xl border border-dashed border-theme-border text-theme-text-muted">
                      <History size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="font-bold text-xs text-white">Nenhuma movimentação registrada</p>
                      <p className="text-[11px]">As baixas e entradas de aves neste lote aparecerão aqui.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {lote.movimentacoes.map((mov: any) => (
                        <div
                          key={mov.id}
                          className="bg-theme-base border border-theme-border/60 rounded-2xl p-3.5 flex items-start justify-between gap-3 hover:border-theme-border transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              mov.tipo === 'saida' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {mov.tipo === 'saida' ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-black ${mov.tipo === 'saida' ? 'text-red-400' : 'text-emerald-400'}`}>
                                  {mov.tipo === 'saida' ? `-${mov.quantidade} ave(s)` : `+${mov.quantidade} ave(s)`}
                                </span>
                                <span className="text-[10px] text-theme-text-muted">· {fmtDate(mov.data)}</span>
                              </div>
                              <p className="text-xs font-bold text-white mt-0.5">{mov.motivo}</p>
                              {mov.observacao && (
                                <p className="text-[11px] text-theme-text-muted mt-1 italic">Obs: {mov.observacao}</p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(mov.id)}
                            className="text-theme-text-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                            title="Remover este registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmação de exclusão sem window.confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmId)}
        title="Remover Movimentação?"
        message="Esta ação irá estornar esta movimentação do histórico e atualizar o saldo de aves do lote."
        confirmLabel="Remover do Histórico"
        confirmVariant="danger"
        onConfirm={handleConfirmDeleteMovement}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </>
  );
}
