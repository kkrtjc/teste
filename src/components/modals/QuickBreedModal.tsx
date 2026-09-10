import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';
import { useAppContext, type Breed } from '../../lib/AppContext';

interface QuickBreedModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBreedName?: string;
  onBreedSaved?: (breed: Breed) => void;
}

export function QuickBreedModal({
  isOpen,
  onClose,
  initialBreedName = '',
  onBreedSaved
}: QuickBreedModalProps) {
  const { addBreed, showToast } = useAppContext();

  const [nome, setNome] = useState(initialBreedName);
  const [foco, setFoco] = useState('Corte / Engorda');
  const [ganho, setGanho] = useState('35');
  const [conversao, setConversao] = useState('2.4');
  const [pesoMedio, setPesoMedio] = useState('3.5 kg');
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (initialBreedName) setNome(initialBreedName);
  }, [initialBreedName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const newId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const ganhoNum = parseFloat(ganho) || undefined;
    const convNum = parseFloat(conversao) || undefined;

    const newBreed: Breed = {
      id: newId,
      nome: nome.trim(),
      foco,
      descricao: descricao.trim() || 'Raça cadastrada para lote.',
      totalAves: 0,
      tempoCrescimento: 180,
      pesoMedio: pesoMedio.trim() || '3.5 kg',
      ganhoGramasDia: ganhoNum,
      conversaoAlimentar: convNum
    };

    addBreed(newBreed);
    showToast(`Raça "${nome.trim()}" cadastrada com sucesso!`, 'success');
    onBreedSaved?.(newBreed);
    onClose();
    setNome('');
    setDescricao('');
  };

  const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors placeholder-theme-text-muted";
  const labelCls = "text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1 block";

  return createPortal(
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 overflow-hidden select-none animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-theme-surface border border-theme-border/80 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-theme-border flex items-center justify-between shrink-0">
          <h3 className="font-black text-lg text-white flex items-center gap-2">
            <Sparkles className="text-theme-primary" size={18} />
            Cadastrar Nova Raça
          </h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-theme-text-muted hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          <div className="space-y-1">
            <label className={labelCls}>Nome da Raça *</label>
            <input
              required
              type="text"
              placeholder="Ex: Cobb 500, Caipirão, Gigante Negro"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={labelCls}>Foco da Raça</label>
              <select
                value={foco}
                onChange={e => setFoco(e.target.value)}
                className={inputCls + " appearance-none"}
              >
                <option value="Corte / Engorda">Corte / Engorda</option>
                <option value="Misto (Carne e Ovos)">Misto</option>
                <option value="Postura">Postura</option>
                <option value="Ornamental">Ornamental</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className={labelCls}>Peso Médio Adulto</label>
              <input
                type="text"
                placeholder="Ex: 3.5 kg"
                value={pesoMedio}
                onChange={e => setPesoMedio(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="bg-theme-base/60 border border-theme-border/60 rounded-xl p-3.5 space-y-3">
            <p className="text-[10px] font-bold text-theme-primary uppercase tracking-wider">
              Desempenho & Conversão Alimentar
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Ganho Médio (g/dia)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ex: 35"
                  value={ganho}
                  onChange={e => setGanho(e.target.value.replace(/[^0-9.]/g, ''))}
                  className={inputCls}
                />
                <p className="text-[9px] text-theme-text-muted">Ganho de peso/dia esperado.</p>
              </div>

              <div className="space-y-1">
                <label className={labelCls}>Conversão Alimentar</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Ex: 2.3"
                  value={conversao}
                  onChange={e => setConversao(e.target.value.replace(/[^0-9.]/g, ''))}
                  className={inputCls}
                />
                <p className="text-[9px] text-theme-text-muted">kg ração / kg peso ganho.</p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Descrição (opcional)</label>
            <textarea
              rows={2}
              placeholder="Características da raça..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              className={inputCls + " resize-none"}
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-theme-surface border border-theme-border rounded-xl text-xs font-bold text-white hover:border-theme-primary transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nome.trim()}
              className="flex-1 py-2.5 bg-theme-primary disabled:opacity-50 text-black rounded-xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-amber-500/20"
            >
              Salvar e Vincular
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
