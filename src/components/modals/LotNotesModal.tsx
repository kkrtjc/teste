import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X, Plus, Calendar, Trash2, Check, Clock, MessageSquare } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import type { LotNote } from '../../lib/AppContext';

interface LotNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lote: any;
  lotType: 'postura' | 'engorda' | 'pintinhos' | 'crescimento';
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

export function LotNotesModal({
  isOpen,
  onClose,
  lote,
  lotType,
  editEggLot,
  editMeatLot,
  showToast
}: LotNotesModalProps) {
  const [activeTab, setActiveTab] = useState<'existentes' | 'adicionar'>('existentes');
  const [noteDate, setNoteDate] = useState(todayISO());
  const [noteText, setNoteText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (!isOpen || !lote) return null;

  const lotTitleMap: Record<string, string> = {
    postura: 'Lote de Postura',
    engorda: 'Lote de Engorda',
    pintinhos: 'Lote de Pintinhos',
    crescimento: 'Lote de Crescimento'
  };

  const adicNotes: LotNote[] = lote.observacoesAdicionais || [];
  const initialObs: string | undefined = lote.observacao?.trim() ? lote.observacao.trim() : undefined;
  const totalNotesCount = adicNotes.length + (initialObs ? 1 : 0);

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) {
      showToast('Por favor, digite o texto da observação.', 'warning');
      return;
    }

    const newNote: LotNote = {
      id: uid(),
      data: noteDate || todayISO(),
      texto: noteText.trim()
    };

    const updatedNotes = [newNote, ...adicNotes];

    if (lotType === 'postura') {
      editEggLot(lote.id, { observacoesAdicionais: updatedNotes });
    } else {
      editMeatLot(lote.id, { observacoesAdicionais: updatedNotes });
    }

    showToast('Observação adicionada com sucesso!', 'success');
    setNoteText('');
    setNoteDate(todayISO());
    setActiveTab('existentes');
  };

  const handleDeleteNote = (noteId: string) => {
    if (noteId === '__initial_obs__') {
      if (lotType === 'postura') {
        editEggLot(lote.id, { observacao: '' });
      } else {
        editMeatLot(lote.id, { observacao: '' });
      }
      showToast('Observação inicial excluída com sucesso!', 'info');
      setDeleteConfirm(null);
      return;
    }

    const updatedNotes = adicNotes.filter(n => n.id !== noteId);

    if (lotType === 'postura') {
      editEggLot(lote.id, { observacoesAdicionais: updatedNotes });
    } else {
      editMeatLot(lote.id, { observacoesAdicionais: updatedNotes });
    }

    showToast('Observação excluída com sucesso!', 'info');
    setDeleteConfirm(null);
  };

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
          onTouchMove={e => {
            if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
          }}
        >
          <div
            className="bg-theme-surface border border-theme-border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-up my-auto max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-theme-border pb-4 shrink-0">
              <div>
                <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wider block">
                  Baia {lote.baia} · {lotTitleMap[lotType] || 'Lote'}
                </span>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <FileText size={18} className="text-theme-primary" />
                  Observações Adicionais
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-theme-text-muted hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Abas */}
            <div className="bg-theme-base/80 border border-theme-border rounded-2xl p-1.5 grid grid-cols-2 gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('existentes')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'existentes'
                    ? 'bg-theme-primary text-black font-black shadow-md'
                    : 'text-theme-text-muted hover:text-white'
                }`}
              >
                <MessageSquare size={14} />
                <span>Observações Existentes</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'existentes' ? 'bg-black/20 text-black' : 'bg-theme-surface text-theme-primary'
                }`}>
                  {totalNotesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('adicionar')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'adicionar'
                    ? 'bg-theme-primary text-black font-black shadow-md'
                    : 'text-theme-text-muted hover:text-white'
                }`}
              >
                <Plus size={14} />
                <span>Adicionar Observação</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1 modal-scrollable-content touch-pan-y">
              {activeTab === 'existentes' ? (
                <div className="space-y-3">
                  {/* Observação Inicial do Cadastro (se houver) */}
                  {initialObs && (
                    <div className="p-3.5 bg-theme-base/60 border border-theme-border/70 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock size={11} />
                            Cadastro Inicial
                          </span>
                          {lote.dataInicio && (
                            <span className="text-[11px] text-theme-text-muted font-medium flex items-center gap-1">
                              <Calendar size={11} />
                              {fmtDate(lote.dataInicio)}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm('__initial_obs__')}
                          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Apagar observação inicial"
                        >
                          <Trash2 size={12} />
                          <span>Apagar</span>
                        </button>
                      </div>
                      <p className="text-xs text-theme-text-light leading-relaxed whitespace-pre-wrap">
                        {initialObs}
                      </p>
                    </div>
                  )}

                  {/* Observações Adicionais */}
                  {adicNotes.map((nota) => (
                    <div
                      key={nota.id}
                      className="p-3.5 bg-theme-base/80 border border-theme-border rounded-2xl space-y-2 hover:border-theme-border/80 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-theme-primary font-bold flex items-center gap-1">
                          <Calendar size={12} />
                          {fmtDate(nota.data)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(nota.id)}
                          className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Apagar observação"
                        >
                          <Trash2 size={12} />
                          <span>Apagar</span>
                        </button>
                      </div>
                      <p className="text-xs text-white leading-relaxed whitespace-pre-wrap">
                        {nota.texto}
                      </p>
                    </div>
                  ))}

                  {/* Vazio */}
                  {totalNotesCount === 0 && (
                    <div className="text-center py-10 px-4 bg-theme-base/30 rounded-2xl border border-dashed border-theme-border text-theme-text-muted space-y-3">
                      <FileText size={36} className="mx-auto opacity-40 text-theme-primary" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">Nenhuma observação registrada</p>
                        <p className="text-xs text-theme-text-muted max-w-xs mx-auto">
                          Adicione anotações de manejo, ocorrências, pesagens informais ou observações deste lote.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('adicionar')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-theme-primary text-black font-black text-xs rounded-xl shadow hover:bg-amber-400 transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Adicionar Primeira Observação</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSaveNote} className="space-y-4">
                  <div>
                    <SectionLabel>Data da Observação</SectionLabel>
                    <input
                      type="date"
                      value={noteDate}
                      onChange={e => setNoteDate(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>

                  <div>
                    <SectionLabel>Texto da Observação</SectionLabel>
                    <textarea
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      rows={5}
                      placeholder="Descreva detalhes do lote, manejo aplicado, anotações de saúde, comportamento ou outras informações relevantes..."
                      className={inputCls + " resize-none"}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-theme-border/60">
                    <button
                      type="button"
                      onClick={() => setActiveTab('existentes')}
                      className="px-4 py-2.5 rounded-xl border border-theme-border text-xs font-bold text-theme-text-muted hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-theme-primary hover:bg-amber-400 text-black text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Check size={15} />
                      <span>Salvar Observação</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirm)}
        title="Excluir Observação"
        message="Tem certeza de que deseja remover esta observação do lote? Essa ação não pode ser desfeita."
        confirmLabel="Sim, excluir"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteConfirm) handleDeleteNote(deleteConfirm);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
