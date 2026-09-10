import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';
import { useHaptics } from '../../hooks/useHaptics';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string | React.ReactNode;
  message?: string | React.ReactNode;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmVariant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  message,
  confirmText = 'Confirmar',
  confirmLabel,
  cancelText = 'Cancelar',
  variant = 'danger',
  confirmVariant,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmDialogProps) {
  const { triggerLight, triggerHeavy, triggerWarning, triggerMedium } = useHaptics();

  if (!isOpen) return null;

  const actualVariant = confirmVariant || variant;
  const actualDescription = message ?? description;
  const actualConfirmText = confirmLabel || confirmText;

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      Icon: Trash2,
      confirmBtn: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30',
    },
    warning: {
      iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      Icon: AlertTriangle,
      confirmBtn: 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-900/30',
    },
    info: {
      iconBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      Icon: Info,
      confirmBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30',
    },
  }[actualVariant];

  const { iconBg, Icon, confirmBtn } = variantStyles;

  const handleConfirm = () => {
    if (actualVariant === 'danger') {
      triggerHeavy();
    } else if (actualVariant === 'warning') {
      triggerWarning();
    } else {
      triggerMedium();
    }
    onConfirm();
  };

  const handleCancel = () => {
    triggerLight();
    onCancel();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-fade-in"
      onClick={handleCancel}
    >
      <div
        className="bg-theme-surface border border-theme-border/80 w-full max-w-sm sm:max-w-md rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 animate-scale-up relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow de fundo */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-theme-primary/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5">
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 shadow-md ${iconBg}`}>
            <Icon size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-white leading-tight">{title}</h3>
            <div className="text-xs text-theme-text-muted mt-1.5 leading-relaxed">
              {actualDescription}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="text-theme-text-muted hover:text-white transition-colors p-1 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="pt-2 flex gap-2.5 sm:gap-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleCancel}
            className="flex-1 py-2.5 px-3 bg-theme-base hover:bg-theme-surface-hover border border-theme-border rounded-xl text-xs font-bold text-white transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={handleConfirm}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5 ${confirmBtn}`}
          >
            {actualConfirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
