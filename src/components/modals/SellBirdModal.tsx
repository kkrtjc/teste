import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, Calendar, User, Phone, CheckCircle } from 'lucide-react';
import { useAppContext, type Bird } from '../../lib/AppContext';
import { useHaptics } from '../../hooks/useHaptics';

interface SellBirdModalProps {
  bird: Bird;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SellBirdModal({ bird, isOpen, onClose, onSuccess }: SellBirdModalProps) {
  const { editBird, showToast } = useAppContext();
  const { triggerSuccess } = useHaptics();

  const initialPrice = bird.valorEstimado 
    ? String(bird.valorEstimado) 
    : (bird.vitrinePrice ? bird.vitrinePrice.replace(/[^0-9.]/g, '') : '');

  const [valorVenda, setValorVenda] = useState(initialPrice);
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0]);
  const [compradorNome, setCompradorNome] = useState('');
  const [compradorContato, setCompradorContato] = useState('');
  const [obsVenda, setObsVenda] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valorVenda || isNaN(Number(valorVenda.replace(',', '.')))) {
      showToast('Por favor, informe um valor válido de venda.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const numValor = parseFloat(valorVenda.replace(',', '.'));
      const observacaoAdicional = obsVenda.trim() 
        ? `\n[Venda em ${dataVenda}]: ${obsVenda.trim()}` 
        : '';

      editBird(bird.id, {
        status: 'Vendido',
        valorVenda: numValor,
        dataVenda: dataVenda || new Date().toISOString().split('T')[0],
        compradorNome: compradorNome.trim() || undefined,
        compradorContato: compradorContato.trim() || undefined,
        dataBaixa: dataVenda || new Date().toISOString().split('T')[0],
        observacoes: (bird.observacoes || '') + observacaoAdicional,
      });

      triggerSuccess();
      showToast(`Ave ${bird.anilha} registrada como VENDIDA por R$ ${numValor.toFixed(2)}!`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Erro ao registrar venda da ave:', err);
      showToast('Erro ao registrar venda. Tente novamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      onTouchMove={e => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div 
        className="bg-theme-surface border border-theme-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[92dvh] animate-scale-up relative"
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Registrar Venda da Ave</h3>
              <p className="text-[11px] text-theme-text-muted">A ave sairá do plantel ativo e irá para o histórico</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0 modal-scrollable-content touch-pan-y">
          {/* Card Resumo da Ave */}
          <div className="flex items-center gap-3 p-3 bg-theme-base/60 border border-theme-border rounded-xl">
            <div className="w-12 h-12 rounded-lg bg-theme-surface overflow-hidden border border-theme-border shrink-0 flex items-center justify-center">
              {bird.imagem || (bird.imagens && bird.imagens[0]) ? (
                <img 
                  src={bird.imagem || bird.imagens![0]} 
                  alt={bird.anilha} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-xl">{bird.sexo === 'Macho' ? '🐓' : '🐔'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-theme-primary">{bird.anilha}</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-white/10 text-white font-bold">{bird.sexo}</span>
              </div>
              <p className="text-xs text-white font-bold truncate mt-0.5">{bird.nome || 'Sem nome'}</p>
              <p className="text-[11px] text-theme-text-muted truncate">{bird.raca} {bird.baia ? `• Baia ${bird.baia}` : ''}</p>
            </div>
          </div>

          {/* Valor da Venda */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center justify-between">
              <span>Valor Negociado (R$) *</span>
              {bird.valorEstimado && (
                <span className="text-[10px] text-emerald-400 font-semibold lowercase">
                  (Estimado: R$ {Number(bird.valorEstimado).toFixed(2)})
                </span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">R$</span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={valorVenda}
                onChange={e => setValorVenda(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="0,00"
                className="w-full bg-theme-base border border-theme-border focus:border-emerald-500 rounded-xl py-3 pl-10 pr-3 text-base font-bold text-white outline-none transition-colors"
              />
            </div>
          </div>

          {/* Data da Venda */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
              <Calendar size={13} className="text-theme-primary" />
              <span>Data da Venda *</span>
            </label>
            <input
              type="date"
              required
              value={dataVenda}
              onChange={e => setDataVenda(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none [color-scheme:dark]"
            />
          </div>

          {/* Comprador (Nome e Contato) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <User size={13} />
                <span>Comprador</span>
              </label>
              <input
                type="text"
                value={compradorNome}
                onChange={e => setCompradorNome(e.target.value)}
                placeholder="Ex: Carlos Andrade"
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                <Phone size={13} />
                <span>WhatsApp / Fone</span>
              </label>
              <input
                type="text"
                value={compradorContato}
                onChange={e => setCompradorContato(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
              />
            </div>
          </div>

          {/* Observações da Venda */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
              Observações / Condições de Pagamento
            </label>
            <textarea
              value={obsVenda}
              onChange={e => setObsVenda(e.target.value)}
              placeholder="Ex: Pago à vista no Pix, retirada na fazenda..."
              rows={2}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-xs text-white focus:border-theme-primary outline-none resize-none"
            />
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300">
            <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-400" />
            <p>
              Ao confirmar, a ave deixará a lista ativa de baias, entrará no seu <b>Balanço Financeiro</b> e todo o pedigree dos descendentes continuará 100% preservado.
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-theme-border text-theme-text-muted hover:text-white font-bold text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle size={16} />
              <span>{isSubmitting ? 'Salvando...' : 'Confirmar Venda'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
