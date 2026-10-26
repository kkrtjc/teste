import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, RotateCcw } from 'lucide-react';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import type { BirdMovement } from '../../lib/sales/types';
import { formatBRL } from '../../lib/sales/money';

interface ReverseMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: BirdMovement | null;
  onConfirm: (movementId: string, motivo: string) => Promise<void>;
}

export function ReverseMovementModal({
  isOpen,
  onClose,
  movement,
  onConfirm
}: ReverseMovementModalProps) {
  useModalScrollLock(isOpen);
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !movement) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onConfirm(movement.id, motivo.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[10002] flex items-end sm:items-center justify-center p-0 sm:p-4 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),0px)] bg-black/85 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-theme-surface border border-theme-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-scale-up"
        style={{ contain: 'paint' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-theme-border flex justify-between items-center bg-rose-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Estornar Movimentação</h3>
              <p className="text-[11px] text-theme-text-muted">A ave retornará para o plantel ativo</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer touch-manipulation"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-theme-base/60 border border-theme-border rounded-xl text-xs space-y-1">
            <p className="text-theme-text-muted">
              Movimento: <span className="text-white font-bold uppercase">{movement.tipo}</span>
            </p>
            <p className="text-theme-text-muted">
              Ave: <span className="text-theme-primary font-mono font-bold">{movement.snapshot?.anilha || movement.snapshot?.nome || movement.birdId}</span>
            </p>
            {movement.valorCentavos > 0 && (
              <p className="text-theme-text-muted">
                Valor: <span className="text-emerald-400 font-bold">{formatBRL(movement.valorCentavos)}</span>
              </p>
            )}
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              O estorno não apaga o registro original. Ele cria uma contrapartida de auditoria contábil e reativa o status da ave para <strong>Ativa</strong>.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
              Motivo do Estorno *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ex: Cliente desistiu da compra, devolução, erro de digitação..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className="w-full bg-theme-base border border-theme-border focus:border-rose-500 rounded-xl p-3 text-xs text-white outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-theme-text-muted hover:text-white rounded-xl transition-colors cursor-pointer touch-manipulation"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !motivo.trim()}
              className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-950/40 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {isSubmitting ? 'Estornando...' : 'Confirmar Estorno'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
