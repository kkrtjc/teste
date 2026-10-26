import { useState, useMemo, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, DollarSign, Calendar, User, Phone, CheckCircle2, 
  AlertTriangle, CreditCard, HeartCrack, 
  ArrowRightLeft, FileText, ChevronRight
} from 'lucide-react';
import { useAppSlice } from '../../lib/AppContext';
import { useHaptics } from '../../hooks/useHaptics';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import { todayLocalISO } from '../../lib/dates';
import { parseMoneyToCents } from '../../lib/sales/money';
import type { MovementType, PaymentMethod, PaymentStatus } from '../../lib/sales/types';

interface RegisterSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedBirdId?: string;
  defaultType?: MovementType;
  onSuccess?: () => void;
}

// ── Sub-componente isolado para Seleção de Ave ─────────────────────────────
// Mantém seu próprio estado de busca e slice para NÃO provocar re-renders do formulário ao digitar
interface BirdSelectorProps {
  birds: readonly any[];
  selectedBirdId: string;
  onSelect: (id: string) => void;
}

const BirdSelector = memo(function BirdSelector({ birds, selectedBirdId, onSelect }: BirdSelectorProps) {
  const [search, setSearch] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const selectedBird = useMemo(() => {
    return birds.find(b => b.id === selectedBirdId) || null;
  }, [birds, selectedBirdId]);

  const filteredBirds = useMemo(() => {
    if (!search.trim()) return birds.slice(0, 15);
    const term = search.toLowerCase().trim();
    return birds.filter(b => 
      (b.anilha && b.anilha.toLowerCase().includes(term)) ||
      (b.nome && b.nome.toLowerCase().includes(term)) ||
      (b.raca && b.raca.toLowerCase().includes(term))
    ).slice(0, 15);
  }, [birds, search]);

  // Se já há ave selecionada e o usuário não clicou para trocar, mostra o card compacto
  if (selectedBird && !isChanging) {
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[11px] font-bold text-theme-text-muted uppercase tracking-wider">
          <span>Ave Selecionada</span>
          <button
            type="button"
            onClick={() => setIsChanging(true)}
            className="text-theme-primary hover:underline lowercase font-mono cursor-pointer touch-manipulation"
          >
            [trocar ave]
          </button>
        </div>
        <div className="p-2.5 rounded-xl border border-theme-primary/40 bg-theme-primary/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg shrink-0">{selectedBird.sexo === 'Macho' ? '🐓' : '🐔'}</span>
            <div className="min-w-0">
              <p className="font-mono text-xs font-black text-white truncate">
                {selectedBird.anilha} <span className="font-normal text-[11px] text-theme-text-muted">({selectedBird.nome || 'Sem nome'})</span>
              </p>
              <p className="text-[10px] text-theme-text-muted truncate">
                {selectedBird.raca} {selectedBird.baia ? `• Baia ${selectedBird.baia}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsChanging(true)}
            className="px-2.5 py-1 text-[11px] font-bold bg-theme-surface border border-theme-border text-white rounded-lg hover:border-theme-primary cursor-pointer shrink-0 touch-manipulation"
          >
            Alterar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[11px] font-bold text-theme-text-muted uppercase tracking-wider">
        <span>Selecione a Ave ({birds.length} disponíveis)</span>
        {selectedBird && (
          <button
            type="button"
            onClick={() => setIsChanging(false)}
            className="text-theme-text-muted hover:text-white lowercase font-mono cursor-pointer touch-manipulation"
          >
            cancelar
          </button>
        )}
      </div>

      <input
        type="text"
        placeholder="Buscar por anilha, nome ou raça..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-theme-primary"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />

      <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-theme-border bg-theme-base/40 p-1 overscroll-contain">
        {filteredBirds.length === 0 ? (
          <p className="text-center text-xs text-theme-text-muted py-3">Nenhuma ave disponível encontrada</p>
        ) : (
          filteredBirds.map(bird => {
            const isSelected = selectedBirdId === bird.id;
            return (
              <div
                key={bird.id}
                onClick={() => {
                  onSelect(bird.id);
                  setIsChanging(false);
                }}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors touch-manipulation ${
                  isSelected 
                    ? 'bg-theme-primary/15 border border-theme-primary/50 text-white' 
                    : 'hover:bg-white/5 border border-transparent text-theme-text-muted'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-sm shrink-0">{bird.sexo === 'Macho' ? '🐓' : '🐔'}</span>
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-white truncate">
                      {bird.anilha} <span className="font-normal text-[11px] text-theme-text-muted">({bird.nome || 'Sem nome'})</span>
                    </p>
                    <p className="text-[10px] text-theme-text-muted truncate">{bird.raca} {bird.baia ? `• Baia ${bird.baia}` : ''}</p>
                  </div>
                </div>
                {isSelected && <CheckCircle2 size={16} className="text-theme-primary shrink-0" />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export function RegisterSaleModal({
  isOpen,
  onClose,
  preSelectedBirdId,
  defaultType = 'venda',
  onSuccess
}: RegisterSaleModalProps) {
  useModalScrollLock(isOpen);
  const { birds, registerBirdMovement, showToast } = useAppSlice('birds', 'registerBirdMovement', 'showToast');
  const { triggerSuccess, triggerWarning } = useHaptics();

  // Filtra apenas aves ativas que podem ser vendidas/movimentadas
  const activeBirds = useMemo(() => {
    return birds.filter(b => {
      const s = (b.status || '').toLowerCase().trim();
      return s !== 'vendido' && s !== 'morta' && s !== 'baixa' && s !== 'faleceu' && s !== 'abatido';
    });
  }, [birds]);

  const [selectedBirdId, setSelectedBirdId] = useState<string>(preSelectedBirdId || (activeBirds[0]?.id || ''));
  const [tipo, setTipo] = useState<MovementType>(defaultType);
  
  // Dados da Venda
  const [valorInput, setValorInput] = useState('');
  const [dataMovimento, setDataMovimento] = useState(todayLocalISO());
  const [compradorNome, setCompradorNome] = useState('');
  const [compradorContato, setCompradorContato] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<PaymentMethod>('pix');
  const [statusPagamento, setStatusPagamento] = useState<PaymentStatus>('pago');
  
  // Dados de Perda / Saída
  const [motivoPerda, setMotivoPerda] = useState('morte');
  const [motivoSaida, setMotivoSaida] = useState('doacao');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A ave atualmente selecionada
  const selectedBird = useMemo(() => {
    return birds.find(b => b.id === selectedBirdId) || null;
  }, [birds, selectedBirdId]);

  const handleSelectBird = useCallback((id: string) => {
    setSelectedBirdId(id);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedBird) {
      showToast('Selecione uma ave para registrar o movimento.', 'warning');
      return;
    }

    const cents = parseMoneyToCents(valorInput);
    const valorCentavos = cents ?? 0;

    if (tipo === 'venda' && valorCentavos <= 0) {
      showToast('Informe um valor de venda válido superior a zero.', 'warning');
      triggerWarning();
      return;
    }

    const motivoFinal = tipo === 'venda' ? 'venda' : tipo === 'perda' ? motivoPerda : motivoSaida;

    setIsSubmitting(true);
    try {
      const res = await registerBirdMovement({
        id: crypto.randomUUID(),
        birdId: selectedBird.id,
        tipo,
        motivo: motivoFinal,
        data: dataMovimento || todayLocalISO(),
        valorCentavos,
        comprador: (compradorNome.trim() || compradorContato.trim())
          ? { nome: compradorNome.trim() || undefined, contato: compradorContato.trim() || undefined }
          : undefined,
        pagamento: tipo === 'venda' ? formaPagamento : undefined,
        statusPagamento: tipo === 'venda' ? statusPagamento : undefined,
        dataRecebimento: tipo === 'venda' && statusPagamento === 'pago' ? (dataMovimento || todayLocalISO()) : undefined,
        observacao: observacoes.trim() || undefined
      });

      if (res.success) {
        triggerSuccess();
        if (onSuccess) onSuccess();
        onClose();
      } else {
        triggerWarning();
        showToast(res.error || 'Não foi possível registrar o movimento.', 'error');
      }
    } catch (err: any) {
      console.error('Erro ao submeter movimento:', err);
      showToast('Erro interno ao registrar.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-0 sm:p-4 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),0px)] bg-black/80 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-theme-surface border border-theme-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[calc(100dvh-max(env(safe-area-inset-top),16px)-max(env(safe-area-inset-bottom),16px)-16px)] animate-scale-up relative"
        style={{ contain: 'paint' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/80">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              tipo === 'venda' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' :
              tipo === 'perda' ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400' :
              'bg-amber-500/15 border border-amber-500/30 text-amber-400'
            }`}>
              {tipo === 'venda' ? <DollarSign size={20} /> :
               tipo === 'perda' ? <HeartCrack size={20} /> :
               <ArrowRightLeft size={20} />}
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {tipo === 'venda' ? 'Registrar Venda de Ave' : 
                 tipo === 'perda' ? 'Registrar Perda / Morte' : 
                 'Registrar Saída do Plantel'}
              </h3>
              <p className="text-[11px] text-theme-text-muted">
                Registro imutável no livro de movimentações
              </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0 modal-scrollable-content touch-pan-y">
          {/* Seletor de Tipo de Movimento */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider">
              Tipo de Movimentação
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'venda', label: 'Venda' },
                { key: 'perda', label: 'Perda / Morte' },
                { key: 'saida', label: 'Saída / Doação' }
              ].map(opt => {
                const active = tipo === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTipo(opt.key as MovementType)}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all text-center touch-manipulation ${
                      active 
                        ? 'bg-theme-primary/15 border-theme-primary text-theme-primary shadow-sm'
                        : 'bg-theme-base/60 border-theme-border text-theme-text-muted hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seleção da Ave isolada em sub-componente memoizado */}
          <BirdSelector
            birds={activeBirds}
            selectedBirdId={selectedBirdId}
            onSelect={handleSelectBird}
          />

          {/* Data do Movimento */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={13} className="text-theme-primary" />
              <span>Data do Registro *</span>
            </label>
            <input
              type="date"
              required
              value={dataMovimento}
              onChange={e => setDataMovimento(e.target.value)}
              className="w-full bg-theme-base border border-theme-border focus:border-theme-primary rounded-xl py-2.5 px-3 text-sm font-semibold text-white outline-none"
            />
          </div>

          {/* Campos específicos de Venda */}
          {tipo === 'venda' && (
            <>
              {/* Valor da Venda */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  Valor Negociado (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="0,00"
                    value={valorInput}
                    onChange={e => setValorInput(e.target.value.replace(/[^0-9.,]/g, ''))}
                    className="w-full bg-theme-base border border-theme-border focus:border-emerald-500 rounded-xl py-2.5 pl-9 pr-3 text-sm font-bold text-white outline-none"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Status do Pagamento (Pago vs Pendente) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  Situação do Pagamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusPagamento('pago')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-manipulation ${
                      statusPagamento === 'pago'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-theme-base/60 border-theme-border text-theme-text-muted'
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    <span>Recebido (Pago)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusPagamento('pendente')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 touch-manipulation ${
                      statusPagamento === 'pendente'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm'
                        : 'bg-theme-base/60 border-theme-border text-theme-text-muted'
                    }`}
                  >
                    <AlertTriangle size={14} />
                    <span>A Receber (Pendente)</span>
                  </button>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard size={13} className="text-theme-primary" />
                  <span>Forma de Pagamento</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'pix', label: 'Pix' },
                    { key: 'dinheiro', label: 'Dinheiro' },
                    { key: 'cartao', label: 'Cartão' },
                    { key: 'transferencia', label: 'Transf.' }
                  ].map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFormaPagamento(f.key as PaymentMethod)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all text-center touch-manipulation ${
                        formaPagamento === f.key
                          ? 'bg-theme-primary/15 border-theme-primary text-theme-primary'
                          : 'bg-theme-base/60 border-theme-border text-theme-text-muted'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comprador: Nome e Contato */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <User size={13} className="text-theme-primary" />
                    <span>Nome do Comprador</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={compradorNome}
                    onChange={e => setCompradorNome(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border focus:border-theme-primary rounded-xl py-2.5 px-3 text-sm text-white outline-none"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
                    <Phone size={13} className="text-theme-primary" />
                    <span>WhatsApp / Contato</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={compradorContato}
                    onChange={e => setCompradorContato(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border focus:border-theme-primary rounded-xl py-2.5 px-3 text-sm text-white outline-none"
                    autoComplete="off"
                  />
                </div>
              </div>
            </>
          )}

          {/* Motivo de Perda */}
          {tipo === 'perda' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                Motivo da Perda
              </label>
              <select
                value={motivoPerda}
                onChange={e => setMotivoPerda(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded-xl py-2.5 px-3 text-sm text-white outline-none focus:border-theme-primary"
              >
                <option value="morte">Morte natural</option>
                <option value="doenca">Doença infecciosa / respiratória</option>
                <option value="predador">Predador (gavião, raposa, cachorro)</option>
                <option value="fuga">Fuga</option>
                <option value="acidente">Acidente ou briga</option>
                <option value="outro">Outro motivo</option>
              </select>
            </div>
          )}

          {/* Motivo de Saída */}
          {tipo === 'saida' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                Motivo da Saída
              </label>
              <select
                value={motivoSaida}
                onChange={e => setMotivoSaida(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded-xl py-2.5 px-3 text-sm text-white outline-none focus:border-theme-primary"
              >
                <option value="doacao">Doação para outro criatório</option>
                <option value="abate">Abate para consumo próprio</option>
                <option value="troca">Troca / Permuta</option>
                <option value="outro">Outro descarte</option>
              </select>
            </div>
          )}

          {/* Observações Livres */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1">
              <FileText size={13} className="text-theme-primary" />
              <span>Observações / Detalhes</span>
            </label>
            <textarea
              rows={2}
              placeholder="Detalhes sobre a negociação, entrega ou causa da perda..."
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              className="w-full bg-theme-base border border-theme-border focus:border-theme-primary rounded-xl py-2 px-3 text-xs text-white outline-none resize-none"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-theme-border">
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
              disabled={isSubmitting || !selectedBird}
              className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer touch-manipulation ${
                tipo === 'venda'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <span>Gravando no livro...</span>
              ) : (
                <>
                  <span>Confirmar {tipo === 'venda' ? 'Venda' : 'Movimento'}</span>
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
