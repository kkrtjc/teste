import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { 
  Plus, Edit2, Camera, Search, X, ChevronRight, Trash2,
  DollarSign, TrendingUp, ShoppingBag, Skull, RotateCcw, Eye
} from 'lucide-react';
import { useAppContext, type Bird, type Breed } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';
import { compressImage } from '../lib/imageCompression';
import { uploadBreedPhoto } from '../lib/storageService';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import { SmartBirdImage } from '../components/ui/SmartBirdImage';

// Singleton de Collator natural para pt-BR (reutilizado em todas as ordenações para 0 overhead)
const ringNaturalCollator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

const BreedItemCard = memo(function BreedItemCard({
  breed,
  count,
  onSelect,
  onEdit,
  onDelete
}: {
  breed: Breed;
  count: number;
  onSelect: (nome: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, nome: string) => void;
}) {
  return (
    <div 
      onClick={() => onSelect(breed.nome)}
      className="premium-card content-visibility-auto flex flex-col group cursor-pointer hover:border-theme-primary/50 transition-all overflow-hidden relative bg-theme-surface active:scale-[0.98] touch-manipulation"
    >
      {/* Image block 1:1 */}
      <div className="aspect-square w-full bg-theme-base flex items-center justify-center overflow-hidden relative border-b border-theme-border/30">
        {breed.imagem ? (
          <img
            src={breed.imagem}
            alt={breed.nome}
            loading="lazy"
            decoding="async"
            onError={e => {
              e.currentTarget.style.display = 'none';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-5xl group-hover:scale-105 transition-transform duration-300 select-none">🐓</span>
        )}
        
        {/* Focus Badge */}
        <div className="absolute top-2 right-2">
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider bg-theme-surface border border-theme-border/50 text-theme-text-muted">
            {breed.foco.split(' ')[0]}
          </span>
        </div>

        {/* Aves Count Badge */}
        <div className="absolute bottom-2 left-2">
          <span className="text-[10px] font-black bg-black/70 text-theme-accent px-2 py-0.5 rounded border border-theme-accent/30 shadow-md">
            {count} ave{count !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Details block */}
      <div className="p-3 flex flex-col justify-between flex-1 gap-2">
        <div>
          <h4 className="font-black text-white text-sm group-hover:text-theme-primary transition-colors truncate">
            {breed.nome}
          </h4>
          <p className="text-xs text-theme-text-muted truncate">
            {breed.descricao || 'Sem descrição'}
          </p>
          <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-bold">
            {breed.tempoCrescimento && breed.tempoCrescimento > 0 ? (
              <span className="bg-theme-base/60 text-emerald-400 border border-theme-border/50 px-1.5 py-0.5 rounded">
                ⏱ {breed.tempoCrescimento} dias
              </span>
            ) : null}
            {breed.pesoMedio ? (
              <span className="bg-theme-base/60 text-amber-400 border border-theme-border/50 px-1.5 py-0.5 rounded">
                ⚖️ {breed.pesoMedio}
              </span>
            ) : null}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-theme-border/30">
          <div className="flex items-center gap-1.5">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(breed.id); }} 
              className="p-1 text-theme-text-muted hover:text-white hover:bg-white/5 rounded transition-colors"
              title="Editar Raça"
            >
              <Edit2 size={13} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(breed.id, breed.nome); }} 
              className="p-1 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Excluir Raça"
            >
              <Trash2 size={13} />
            </button>
          </div>
          <span className="text-[10px] font-bold text-theme-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
            Ver aves <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </div>
  );
});

const BirdItemCard = memo(function BirdItemCard({ 
  bird, 
  onSelect 
}: { 
  bird: Bird; 
  onSelect: (id: string) => void;
}) {
  return (
    <div
      onClick={() => onSelect(bird.id)}
      className="premium-card content-visibility-auto flex flex-col group cursor-pointer hover:border-theme-primary/50 transition-all overflow-hidden relative bg-theme-surface active:scale-[0.98] touch-manipulation"
    >
      {/* Bloco da Foto 1:1 Quadrada Grande igual a de Raças */}
      <div className="aspect-square w-full bg-theme-base flex items-center justify-center overflow-hidden relative border-b border-theme-border/30">
        <SmartBirdImage
          src={bird.imagem}
          alt={bird.anilha}
          gender={bird.sexo}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badge Sexo no Canto Superior Direito */}
        <div className="absolute top-2 right-2 z-10">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md border
            ${bird.sexo === 'Macho' 
              ? 'bg-blue-600 text-white border-blue-400/50' 
              : 'bg-pink-600 text-white border-pink-400/50'}`}>
            {bird.sexo}
          </span>
        </div>

        {/* Badge Baia no Canto Inferior Esquerdo (se houver) */}
        {bird.baia && bird.baia !== 'ND' && (
          <div className="absolute bottom-2 left-2 z-10">
            <span className="text-[9px] font-black bg-black/75 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30 shadow-md uppercase tracking-wider">
              Baia {bird.baia}
            </span>
          </div>
        )}
      </div>

      {/* Informações detalhadas abaixo da foto */}
      <div className="p-3 flex flex-col justify-between flex-1 gap-2">
        <div>
          <h4 className="font-black text-white text-sm sm:text-base group-hover:text-theme-primary transition-colors truncate">
            {bird.anilha}
          </h4>
          <p className="text-xs text-theme-text-muted truncate">
            {bird.nome || 'Sem nome'}
          </p>
          <p className="text-[11px] font-bold text-amber-400/90 truncate mt-1">
            {bird.raca}
          </p>
        </div>

        {/* Status Badge + Indicador */}
        <div className="pt-2 border-t border-theme-border/30 flex items-center justify-between mt-auto">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border
            ${bird.status === 'Adulto' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
              bird.status === 'Reprodutor' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' :
              bird.status === 'Matriz' ? 'text-pink-400 border-pink-500/20 bg-pink-500/10' :
              bird.status === 'Crescimento' ? 'text-green-400 border-green-500/20 bg-green-500/10' :
              bird.status === 'Vendido' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
              bird.status === 'Faleceu' ? 'text-red-400 border-red-500/20 bg-red-500/10' : 'text-theme-primary border-theme-primary/20'}`}>
            {bird.status}
          </span>
          <span className="text-[10px] font-bold text-theme-text-muted group-hover:text-theme-primary transition-colors flex items-center">
            Perfil →
          </span>
        </div>
      </div>
    </div>
  );
});

interface BreedFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  breedToEdit: Breed | null;
  onSave: (data: {
    nome: string;
    descricao?: string;
    foco: string;
    imagem?: string;
    tempoCrescimento?: number;
    pesoMedio?: string;
    ganhoGramasDia?: number;
    conversaoAlimentar?: number;
  }) => void;
}

const BreedFormModal = memo(function BreedFormModal({
  isOpen,
  onClose,
  breedToEdit,
  onSave,
}: BreedFormModalProps) {
  const { user } = useAuth();
  const [newBreedName, setNewBreedName] = useState('');
  const [newBreedFocus, setNewBreedFocus] = useState('Misto (Carne e Ovos)');
  const [newBreedDesc, setNewBreedDesc] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newBreedTempoCrescimento, setNewBreedTempoCrescimento] = useState(120);
  const [newBreedPesoMedio, setNewBreedPesoMedio] = useState('2.8 kg');
  const [newBreedGanhoGramasDia, setNewBreedGanhoGramasDia] = useState('30');
  const [newBreedConversaoAlimentar, setNewBreedConversaoAlimentar] = useState('2.5');
  const [showAdvancedBreed, setShowAdvancedBreed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyFocusDefaults = (focus: string) => {
    setNewBreedFocus(focus);
    if (focus.includes('Corte')) {
      setNewBreedTempoCrescimento(90);
      setNewBreedPesoMedio('3.2 kg');
      setNewBreedGanhoGramasDia('40');
      setNewBreedConversaoAlimentar('2.2');
    } else if (focus.includes('Postura')) {
      setNewBreedTempoCrescimento(150);
      setNewBreedPesoMedio('2.0 kg');
      setNewBreedGanhoGramasDia('20');
      setNewBreedConversaoAlimentar('2.8');
    } else if (focus.includes('Misto')) {
      setNewBreedTempoCrescimento(120);
      setNewBreedPesoMedio('2.8 kg');
      setNewBreedGanhoGramasDia('30');
      setNewBreedConversaoAlimentar('2.5');
    } else if (focus.includes('Combate')) {
      setNewBreedTempoCrescimento(240);
      setNewBreedPesoMedio('2.5 kg');
      setNewBreedGanhoGramasDia('18');
      setNewBreedConversaoAlimentar('3.0');
    } else if (focus.includes('Ornamental')) {
      setNewBreedTempoCrescimento(180);
      setNewBreedPesoMedio('1.5 kg');
      setNewBreedGanhoGramasDia('15');
      setNewBreedConversaoAlimentar('3.2');
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (breedToEdit) {
        setNewBreedName(breedToEdit.nome);
        setNewBreedFocus(breedToEdit.foco);
        setNewBreedDesc(breedToEdit.descricao || '');
        setPreviewImage(breedToEdit.imagem || null);
        setNewBreedTempoCrescimento(breedToEdit.tempoCrescimento || 0);
        setNewBreedPesoMedio(breedToEdit.pesoMedio || '');
        setNewBreedGanhoGramasDia(breedToEdit.ganhoGramasDia !== undefined ? String(breedToEdit.ganhoGramasDia) : '');
        setNewBreedConversaoAlimentar(breedToEdit.conversaoAlimentar !== undefined ? String(breedToEdit.conversaoAlimentar) : '');
      } else {
        setNewBreedName('');
        applyFocusDefaults('Misto (Carne e Ovos)');
        setNewBreedDesc('');
        setPreviewImage(null);
      }
      setShowAdvancedBreed(false);
    }
  }, [isOpen, breedToEdit]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 1200, 1200, 0.82);
        setPreviewImage(compressedBase64);
      } catch (err) {
        console.error("Erro ao comprimir imagem da raça", err);
      }
    }
  };

  const handleSave = async () => {
    if (!newBreedName.trim()) return;
    const ganho = newBreedGanhoGramasDia ? parseFloat(newBreedGanhoGramasDia) : undefined;
    const conv = newBreedConversaoAlimentar ? parseFloat(newBreedConversaoAlimentar) : undefined;

    let finalImage = previewImage || undefined;
    if (previewImage) {
      finalImage = await uploadBreedPhoto(previewImage, user?.id || 'default', breedToEdit?.id || Date.now().toString());
    }

    onSave({
      nome: newBreedName.trim(),
      descricao: newBreedDesc.trim() || undefined,
      foco: newBreedFocus,
      imagem: finalImage,
      tempoCrescimento: newBreedTempoCrescimento,
      pesoMedio: newBreedPesoMedio,
      ganhoGramasDia: ganho,
      conversaoAlimentar: conv,
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 animate-fade-in touch-manipulation"
      onClick={onClose}
      onTouchMove={e => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div 
        className="bg-theme-surface border border-theme-border/80 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden animate-scale-up" 
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/50 shrink-0">
          <h3 className="font-bold text-lg text-white">
            {breedToEdit ? 'Editar Raça' : 'Cadastrar Nova Raça'}
          </h3>
          <button onClick={onClose} className="text-theme-text-muted hover:text-white cursor-pointer">✕</button>
        </div>
        
        <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0 modal-scrollable-content overscroll-contain touch-pan-y">

          {/* ── Nome + Foto em linha ── */}
          <div className="flex gap-3 items-start">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 shrink-0 rounded-2xl border-2 border-dashed border-theme-border flex flex-col items-center justify-center text-theme-text-muted hover:border-theme-primary hover:text-theme-primary cursor-pointer bg-theme-base transition-all overflow-hidden relative group"
            >
              {previewImage ? (
                <>
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold text-white text-[10px] uppercase">Trocar</div>
                </>
              ) : (
                <>
                  <Camera size={16} className="mb-0.5" />
                  <span className="text-[9px] font-bold uppercase">Foto</span>
                </>
              )}
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Nome da Raça / Linhagem *</label>
              <input
                type="text"
                value={newBreedName}
                onChange={(e) => setNewBreedName(e.target.value)}
                autoFocus
                className="w-full bg-theme-base border-2 border-theme-border rounded-2xl p-3.5 text-base font-bold text-white focus:border-theme-primary outline-none transition-colors"
                placeholder="Ex: Brahma, Shamo, Índio Gigante..."
              />
            </div>
          </div>

          {/* ── Foco como cards visuais ── */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block">Foco Principal</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { label: 'Misto (Carne e Ovos)', icon: '🥩🥚', short: 'Misto' },
                { label: 'Postura (Ovos)', icon: '🥚', short: 'Postura' },
                { label: 'Corte (Carne)', icon: '🥩', short: 'Corte' },
                { label: 'Combate / Esporte', icon: '⚔️', short: 'Combate' },
                { label: 'Ornamental', icon: '🌸', short: 'Ornamental' },
              ] as const).map(opt => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => applyFocusDefaults(opt.label)}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${
                    newBreedFocus === opt.label
                      ? 'border-theme-primary bg-theme-primary/10 text-white'
                      : 'border-theme-border bg-theme-base text-theme-text-muted hover:border-theme-primary/40 hover:text-white'
                  }`}
                >
                  <span className="text-xl leading-none">{opt.icon}</span>
                  <span className="text-[10px] font-black uppercase text-center leading-tight">{opt.short}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Detalhes Técnicos — colapsável ── */}
          <div className="rounded-2xl border border-theme-border overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedBreed(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-theme-base hover:bg-white/5 transition-colors"
            >
              <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Detalhes Técnicos & Desempenho</span>
              <ChevronRight size={14} className={`text-theme-text-muted transition-transform duration-200 ${showAdvancedBreed ? 'rotate-90' : ''}`} />
            </button>
            {showAdvancedBreed && (
              <div className="p-4 space-y-4 border-t border-theme-border bg-theme-surface/50 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">Crescimento (dias)</label>
                    <input
                      type="number"
                      min={0}
                      value={newBreedTempoCrescimento}
                      onChange={(e) => setNewBreedTempoCrescimento(parseInt(e.target.value) || 0)}
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                      placeholder="Ex: 120"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">Peso Médio</label>
                    <input
                      type="text"
                      value={newBreedPesoMedio}
                      onChange={(e) => setNewBreedPesoMedio(e.target.value)}
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                      placeholder="Ex: 2.8 kg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">Ganho Médio (g/dia)</label>
                    <input
                      type="number"
                      min={0}
                      step="1"
                      value={newBreedGanhoGramasDia}
                      onChange={(e) => setNewBreedGanhoGramasDia(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                      placeholder="Ex: 30"
                    />
                    <p className="text-[9px] text-theme-text-muted">Projeção diária em lotes</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">Conversão Alimentar</label>
                    <input
                      type="number"
                      min={0}
                      step="0.1"
                      value={newBreedConversaoAlimentar}
                      onChange={(e) => setNewBreedConversaoAlimentar(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                      placeholder="Ex: 2.5"
                    />
                    <p className="text-[9px] text-theme-text-muted">kg ração / kg ave</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-text-muted uppercase">Descrição / Características</label>
                  <textarea
                    value={newBreedDesc}
                    onChange={(e) => setNewBreedDesc(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white h-20 resize-none"
                    placeholder="Anotações sobre as características genéticas desta raça..."
                  />
                </div>
              </div>
            )}
          </div>

        </div>

        <div className="p-5 border-t border-theme-border flex justify-end gap-3 bg-theme-base/50 shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-theme-text-muted hover:text-white">Cancelar</button>
          <button onClick={handleSave} className="btn-primary">
            {breedToEdit ? 'Salvar Alterações' : 'Salvar Raça'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
});

export function Birds() {
  const location = useLocation();
  const { 
    breeds, addBreed, editBreed, removeBreed,
    birds, editBird, openAddBirdModal, openBirdProfile, 
    activeBreed, setActiveBreed, showToast
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'aves' | 'racas' | 'historico'>('aves');
  const [historyFilter, setHistoryFilter] = useState<'todos' | 'vendidas' | 'obitos' | 'entradas'>('todos');
  const [historySearch, setHistorySearch] = useState('');

  // Sincroniza aba selecionada via URL query ou state de navegação
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab') || (location.state as any)?.tab;
    if (tabParam === 'racas' || tabParam === 'breeds') {
      setActiveTab('racas');
    } else if (tabParam === 'historico' || tabParam === 'history' || tabParam === 'vendas') {
      setActiveTab('historico');
    } else if (tabParam === 'aves') {
      setActiveTab('aves');
    }
  }, [location]);

  // Garante rolagem para o TOPO ao trocar de aba ou filtro de raça de forma suave
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab, activeBreed]);
  const [showNewBreedModal, setShowNewBreedModal] = useState(false);
  const [breedToEdit, setBreedToEdit] = useState<Breed | null>(null);
  const [breedSearch, setBreedSearch] = useState('');
  const [breedFocusFilter, setBreedFocusFilter] = useState<string>('Todos');
  const [birdSearch, setBirdSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const PAGE_SIZE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(birdSearch);
    }, 150);
    return () => clearTimeout(timer);
  }, [birdSearch]);

  const [sexFilter, setSexFilter] = useState<'Todos' | 'Macho' | 'Fêmea'>('Todos');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Reprodutor' | 'Matriz' | 'Adulto' | 'Crescimento' | 'Engorda' | 'Vendido' | 'Faleceu'>('Todos');
  const [deleteBreedConfirm, setDeleteBreedConfirm] = useState<{ id: string; nome: string; message: string } | null>(null);

  // Calcula a contagem de aves por raça em complexidade O(N) linear
  const birdCountByBreed = useMemo(() => {
    const counts: Record<string, number> = {};
    birds.forEach(b => {
      if (b.raca && b.status !== 'Vendido' && b.status !== 'Faleceu') {
        counts[b.raca] = (counts[b.raca] || 0) + 1;
      }
    });
    return counts;
  }, [birds]);

  const activeBirdsCount = useMemo(() => {
    return birds.filter(b => b.status !== 'Vendido' && b.status !== 'Faleceu').length;
  }, [birds]);

  const soldBirds = useMemo(() => {
    return birds.filter(b => b.status === 'Vendido');
  }, [birds]);

  const deceasedBirds = useMemo(() => {
    return birds.filter(b => b.status === 'Faleceu');
  }, [birds]);

  const salesMetrics = useMemo(() => {
    let totalRevenue = 0;
    soldBirds.forEach(b => {
      const price = b.valorVenda !== undefined && b.valorVenda !== null
        ? Number(b.valorVenda) 
        : (b.valorEstimado !== undefined && b.valorEstimado !== null ? Number(b.valorEstimado) : 0);
      if (price > 0) {
        totalRevenue += price;
      }
    });

    const avgTicket = soldBirds.length > 0 ? (totalRevenue / soldBirds.length) : 0;

    return {
      totalRevenue,
      soldCount: soldBirds.length,
      avgTicket,
      deceasedCount: deceasedBirds.length,
    };
  }, [soldBirds, deceasedBirds]);

  const historyBirds = useMemo(() => {
    let list = birds;
    if (historyFilter === 'vendidas') {
      list = list.filter(b => b.status === 'Vendido');
    } else if (historyFilter === 'obitos') {
      list = list.filter(b => b.status === 'Faleceu');
    } else if (historyFilter === 'entradas') {
      list = [...birds];
    } else {
      // 'todos' (movimentações relevantes: vendidas, falecidas e todas as demais)
      list = list.filter(b => b.status === 'Vendido' || b.status === 'Faleceu');
      if (list.length === 0) {
        list = birds;
      }
    }

    const q = historySearch.toLowerCase().trim();
    if (q) {
      list = list.filter(b => 
        (b.anilha && b.anilha.toLowerCase().includes(q)) ||
        (b.nome && b.nome.toLowerCase().includes(q)) ||
        (b.raca && b.raca.toLowerCase().includes(q)) ||
        (b.compradorNome && b.compradorNome.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => {
      const dateA = a.dataVenda || a.dataBaixa || a.dataCadastro || a.dataNascimento || '';
      const dateB = b.dataVenda || b.dataBaixa || b.dataCadastro || b.dataNascimento || '';
      return dateB.localeCompare(dateA);
    });
  }, [birds, historyFilter, historySearch]);

  // Sync tab focus and stats filters when activeBreed/state changes
  useEffect(() => {
    if (activeBreed) {
      setActiveTab('aves');
    }
  }, [activeBreed]);

  useEffect(() => {
    if (location.state) {
      const stateObj = location.state as any;
      if (stateObj.tab) {
        setActiveTab(stateObj.tab);
      }
      if (stateObj.filter) {
        if (stateObj.filter === 'Macho' || stateObj.filter === 'Fêmea') {
          setSexFilter(stateObj.filter);
          setStatusFilter('Todos');
        } else if (['Crescimento', 'Reprodutor', 'Matriz', 'Adulto', 'Engorda'].includes(stateObj.filter)) {
          setStatusFilter(stateObj.filter);
          setSexFilter('Todos');
        } else if (stateObj.filter === 'Total') {
          setSexFilter('Todos');
          setStatusFilter('Todos');
        }
      }
    }
  }, [location.state]);

  const openBreedModal = (editId?: string) => {
    if (editId) {
      const b = breeds.find(x => x.id === editId) || null;
      setBreedToEdit(b);
    } else {
      setBreedToEdit(null);
    }
    setShowNewBreedModal(true);
  };

  const handleSaveBreed = (data: {
    nome: string;
    descricao?: string;
    foco: string;
    imagem?: string;
    tempoCrescimento?: number;
    pesoMedio?: string;
    ganhoGramasDia?: number;
    conversaoAlimentar?: number;
  }) => {
    if (breedToEdit) {
      const oldBreed = breedToEdit;
      editBreed(oldBreed.id, data);
      // Atualiza o nome da raça em todas as aves vinculadas ao nome antigo
      if (oldBreed.nome !== data.nome) {
        birds
          .filter(b => b.raca === oldBreed.nome)
          .forEach(b => editBird(b.id, { raca: data.nome }));
      }
      if (activeBreed === oldBreed.nome) {
        setActiveBreed(data.nome);
      }
      showToast("Raça salva com sucesso!", "success");
    } else {
      addBreed({
        id: Date.now().toString(),
        totalAves: 0,
        ...data,
        descricao: data.descricao || '',
      });
      showToast("Raça salva com sucesso!", "success");
    }
    setShowNewBreedModal(false);
  };

  const filteredBreeds = useMemo(() => {
    const q = breedSearch.toLowerCase().trim();
    return breeds.filter(b => {
      const matchSearch = !q || b.nome.toLowerCase().includes(q) || (b.descricao && b.descricao.toLowerCase().includes(q));
      const matchFocus = breedFocusFilter === 'Todos' || (b.foco && b.foco.toLowerCase().includes(breedFocusFilter.toLowerCase()));
      return matchSearch && matchFocus;
    });
  }, [breeds, breedSearch, breedFocusFilter]);

  const currentBirds = useMemo(() => {
    let list = birds;
    
    // Filtrar por raça ativa
    if (activeBreed) {
      list = list.filter(b => b.raca === activeBreed);
    }
    
    // Filtrar por sexo
    if (sexFilter !== 'Todos') {
      list = list.filter(b => b.sexo === sexFilter);
    }
    
    // Filtrar por status
    if (statusFilter !== 'Todos') {
      list = list.filter(b => b.status === statusFilter);
    } else {
      // Exibe todas as aves ativas do plantel (esconde apenas Vendidos e Falecidos)
      list = list.filter(b => b.status !== 'Vendido' && b.status !== 'Faleceu');
    }
    
    // Ordenar em ordem crescente de anilha (natural sorting O(N log N) de alta performance)
    return [...list].sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      const anilhaA = (a.anilha || '').toString().trim();
      const anilhaB = (b.anilha || '').toString().trim();
      return ringNaturalCollator.compare(anilhaA, anilhaB);
    });
  }, [birds, activeBreed, sexFilter, statusFilter]);

  const filteredBirds = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return currentBirds.filter(b =>
      (b.anilha || '').toLowerCase().includes(query) ||
      (b.nome || '').toLowerCase().includes(query) ||
      (b.baia || '').toLowerCase().includes(query)
    );
  }, [currentBirds, debouncedSearch]);

  // Reseta a paginação ao mudar os filtros ou busca
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [debouncedSearch, activeBreed, sexFilter, statusFilter]);

  // Lista fatiada para renderização ultra-rápida no celular
  const visibleBirds = useMemo(() => {
    return filteredBirds.slice(0, visibleCount);
  }, [filteredBirds, visibleCount]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Infinite Scroll automático: carrega mais aves conforme o usuário rola a página
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    if (visibleCount >= filteredBirds.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredBirds.length));
        }
      },
      { threshold: 0.1, rootMargin: '300px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [visibleCount, filteredBirds.length]);

  useEffect(() => {
    if (showNewBreedModal) {
      document.body.classList.add('modal-open-lock');
    } else {
      document.body.classList.remove('modal-open-lock');
    }
    return () => {
      document.body.classList.remove('modal-open-lock');
    };
  }, [showNewBreedModal]);

  return (
    <div className="space-y-5 animate-fade-in max-w-7xl mx-auto w-full overflow-x-hidden">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          {activeTab === 'aves' ? (
            <>
              <h2 className="text-base sm:text-lg font-black text-white leading-none">Plantel de Aves</h2>
              <p className="text-[10px] sm:text-xs text-theme-text-muted mt-1 leading-none">
                {activeBreed || sexFilter !== 'Todos' || statusFilter !== 'Todos' || birdSearch
                  ? `Filtrado (${filteredBirds.length} ave${filteredBirds.length !== 1 ? 's' : ''})`
                  : `Total: ${activeBirdsCount} aves ativas`
                }
              </p>
            </>
          ) : activeTab === 'racas' ? (
            <>
              <h2 className="text-base sm:text-lg font-black text-white leading-none">Raças &amp; Linhagens</h2>
              <p className="text-[10px] sm:text-xs text-theme-text-muted mt-1 leading-none">
                {breedSearch || breedFocusFilter !== 'Todos'
                  ? `Filtrado (${filteredBreeds.length} raça${filteredBreeds.length !== 1 ? 's' : ''})`
                  : `Total: ${breeds.length} raças cadastradas`
                }
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base sm:text-lg font-black text-white leading-none">Histórico &amp; Vendas</h2>
              <p className="text-[10px] sm:text-xs text-theme-text-muted mt-1 leading-none">
                Balanço financeiro, vendas e baixas do plantel
              </p>
            </>
          )}
        </div>
        
        {/* Botão de Ação Primária Padronizado (Mesmo local, tamanho e estilo em todas as abas) */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'aves' ? (
            <button 
              type="button"
              onClick={() => openAddBirdModal(activeBreed)} 
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-theme-primary to-amber-400 hover:from-theme-primary-hover hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-theme-primary/20 active:scale-95 transition-all shrink-0 cursor-pointer border border-amber-300/40"
            >
              <Plus size={15} strokeWidth={3} />
              <span>Cadastrar Ave</span>
            </button>
          ) : activeTab === 'racas' ? (
            <button 
              type="button"
              onClick={() => openBreedModal()} 
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-theme-primary to-amber-400 hover:from-theme-primary-hover hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-theme-primary/20 active:scale-95 transition-all shrink-0 cursor-pointer border border-amber-300/40"
            >
              <Plus size={15} strokeWidth={3} />
              <span>Cadastrar Raça</span>
            </button>
          ) : (
            <button 
              type="button"
              onClick={() => openAddBirdModal()} 
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-theme-primary to-amber-400 hover:from-theme-primary-hover hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shadow-theme-primary/20 active:scale-95 transition-all shrink-0 cursor-pointer border border-amber-300/40"
            >
              <Plus size={15} strokeWidth={3} />
              <span>Cadastrar Ave</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs (Glassmorphic Pill Bar Padronizada) ── */}
      <div className="flex p-1 bg-theme-surface border border-theme-border/40 rounded-full overflow-x-auto hide-scrollbar shrink-0 w-full sm:w-auto max-w-lg self-start gap-1">
        <button 
          onClick={() => { setActiveTab('aves'); }}
          className={`flex-1 sm:flex-none text-center px-4 py-2 text-xs font-black transition-all rounded-full whitespace-nowrap ${
            activeTab === 'aves' 
              ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'text-theme-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          Plantel Ativo ({activeBirdsCount})
        </button>
        <button 
          onClick={() => { setActiveTab('racas'); }}
          className={`flex-1 sm:flex-none text-center px-4 py-2 text-xs font-black transition-all rounded-full whitespace-nowrap ${
            activeTab === 'racas' 
              ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'text-theme-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          Raças &amp; Linhagens ({breeds.length})
        </button>
        <button 
          onClick={() => { setActiveTab('historico'); }}
          className={`flex-1 sm:flex-none text-center px-4 py-2 text-xs font-black transition-all rounded-full whitespace-nowrap flex items-center justify-center gap-1.5 ${
            activeTab === 'historico' 
              ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'text-theme-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          <span>Histórico &amp; Vendas</span>
          {soldBirds.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${activeTab === 'historico' ? 'bg-black text-amber-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {soldBirds.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Tab Content: Aves ── */}
      {activeTab === 'aves' && (
        <div className="space-y-3">
          {/* Search Row Padronizada */}
          <div className="w-full shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted" size={15} />
              <input
                type="text"
                placeholder="Pesquisar por anilha, nome ou baia..."
                value={birdSearch}
                onChange={e => setBirdSearch(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border/50 text-white pl-9 pr-9 py-2.5 rounded-xl focus:outline-none focus:border-theme-primary transition-colors text-xs shadow-inner"
              />
              {birdSearch && (
                <button
                  type="button"
                  onClick={() => setBirdSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white p-0.5"
                  title="Limpar pesquisa"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Chips (Raça, Status & Sexo) */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 pt-0.5 shrink-0">
            {/* Seletor de Raça Harmonizado dentro da barra de filtros */}
            <div className="relative shrink-0">
              <select
                value={activeBreed}
                onChange={e => setActiveBreed(e.target.value)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all border outline-none cursor-pointer ${
                  activeBreed
                    ? 'bg-theme-primary text-black border-theme-primary font-black shadow-md shadow-amber-500/20'
                    : 'bg-theme-surface hover:bg-white/5 text-theme-text-muted hover:text-white border-theme-border/50'
                }`}
              >
                <option value="" className="bg-theme-surface text-white">Todas as Raças ({breeds.length})</option>
                {breeds.map(b => (
                  <option key={b.id} value={b.nome} className="bg-theme-surface text-white">{b.nome}</option>
                ))}
              </select>
            </div>

            <div className="h-4 w-px bg-theme-border/60 shrink-0 mx-1" />

            {(['Todos', 'Reprodutor', 'Matriz', 'Crescimento', 'Adulto', 'Engorda', 'Vendido', 'Faleceu'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                  statusFilter === st
                    ? st === 'Vendido'
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                      : st === 'Faleceu'
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                      : 'bg-theme-primary text-black shadow-md shadow-amber-500/20'
                    : 'bg-theme-surface hover:bg-white/5 text-theme-text-muted hover:text-white border border-theme-border/50'
                }`}
              >
                {st === 'Todos' ? 'Todos os Status' : st === 'Reprodutor' ? 'Reprodutores' : st === 'Matriz' ? 'Matrizes' : st === 'Adulto' ? 'Adultos' : st === 'Vendido' ? '🏷️ Vendidos' : st === 'Faleceu' ? '✝️ Baixas' : st}
              </button>
            ))}

            <div className="h-4 w-px bg-theme-border/60 shrink-0 mx-1" />

            {(['Todos', 'Macho', 'Fêmea'] as const).map(sx => (
              <button
                key={sx}
                onClick={() => setSexFilter(sx)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                  sexFilter === sx
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-theme-surface hover:bg-white/5 text-theme-text-muted hover:text-white border border-theme-border/50'
                }`}
              >
                {sx === 'Todos' ? 'Todos os Sexos' : sx === 'Macho' ? '🐓 Machos' : '🐔 Fêmeas'}
              </button>
            ))}
          </div>

          {/* Active Filters Bar */}
          {(sexFilter !== 'Todos' || statusFilter !== 'Todos' || activeBreed || birdSearch) && (
            <div className="flex flex-wrap gap-1.5 items-center px-1 animate-fade-in shrink-0">
              <span className="text-[9px] font-bold text-theme-text-muted uppercase mr-1">Filtros ativos:</span>
              {activeBreed && (
                <span className="text-[9px] font-black bg-theme-primary/10 border border-theme-primary/25 text-theme-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                  Raça: {activeBreed}
                  <button onClick={() => setActiveBreed('')} className="hover:text-white ml-0.5 font-bold">✕</button>
                </span>
              )}
              {sexFilter !== 'Todos' && (
                <span className="text-[9px] font-black bg-blue-500/10 border border-blue-500/25 text-blue-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                  Sexo: {sexFilter}s
                  <button onClick={() => setSexFilter('Todos')} className="hover:text-white ml-0.5 font-bold">✕</button>
                </span>
              )}
              {statusFilter !== 'Todos' && (
                <span className="text-[9px] font-black bg-green-500/10 border border-green-500/25 text-green-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('Todos')} className="hover:text-white ml-0.5 font-bold">✕</button>
                </span>
              )}
              {birdSearch && (
                <span className="text-[9px] font-black bg-amber-500/10 border border-amber-500/25 text-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                  Busca: "{birdSearch}"
                  <button onClick={() => setBirdSearch('')} className="hover:text-white ml-0.5 font-bold">✕</button>
                </span>
              )}
              <button 
                onClick={() => { setSexFilter('Todos'); setStatusFilter('Todos'); setActiveBreed(''); setBirdSearch(''); }} 
                className="text-[9px] font-bold text-red-400 hover:underline ml-1 cursor-pointer"
              >
                Limpar Todos
              </button>
            </div>
          )}

          {/* Birds Grid */}
          <div className="w-full">
            {filteredBirds.length === 0 ? (
              <div className="text-center p-8 sm:p-12 bg-theme-surface border border-theme-border/60 border-dashed rounded-3xl text-theme-text-muted flex flex-col items-center justify-center gap-3 animate-fade-in">
                <span className="text-4xl">🐓</span>
                <div className="max-w-xs space-y-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">
                    {birdSearch || activeBreed ? 'Nenhuma ave encontrada' : 'Nenhuma ave cadastrada ainda'}
                  </h4>
                  <p className="text-xs text-theme-text-muted">
                    {birdSearch || activeBreed 
                      ? 'Tente remover o filtro de busca ou raça selecionada.' 
                      : 'Cadastre suas primeiras aves para acompanhar linhagens, vacinas e pesagens.'}
                  </p>
                </div>
                {(!birdSearch && !activeBreed) && (
                  <button
                    type="button"
                    onClick={() => openAddBirdModal()}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-theme-primary to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all shadow-lg shadow-theme-primary/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} strokeWidth={3} /> Cadastrar Primeira Ave
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {visibleBirds.map(bird => (
                    <BirdItemCard key={bird.id} bird={bird} onSelect={openBirdProfile} />
                  ))}
                </div>

                {filteredBirds.length > visibleCount && (
                  <div ref={loadMoreRef} className="flex flex-col items-center justify-center mt-6 gap-2 py-4">
                    <button
                      type="button"
                      onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
                      className="px-6 py-2.5 rounded-xl bg-theme-surface hover:bg-theme-surface-hover border border-theme-border/60 hover:border-theme-primary/50 text-white font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-2 cursor-pointer"
                    >
                      <Plus size={14} className="text-theme-primary" />
                      <span>Carregar mais aves ({visibleBirds.length} de {filteredBirds.length})</span>
                    </button>
                    <span className="text-[10px] text-theme-text-muted">
                      Mostrando {visibleBirds.length} de {filteredBirds.length} (carregamento automático ao rolar)
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}

      {/* ── Tab Content: Raças ── */}
      {activeTab === 'racas' && (
        <div className="space-y-3">
          {/* Search Row Padronizada */}
          <div className="w-full shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted" size={15} />
              <input
                type="text"
                placeholder="Pesquisar raça por nome ou característica..."
                value={breedSearch}
                onChange={e => setBreedSearch(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border/50 text-white pl-9 pr-9 py-2.5 rounded-xl focus:outline-none focus:border-theme-primary transition-colors text-xs shadow-inner"
              />
              {breedSearch && (
                <button
                  type="button"
                  onClick={() => setBreedSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white p-0.5"
                  title="Limpar pesquisa"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Chips por Foco da Raça */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 pt-0.5 shrink-0">
            {[
              { id: 'Todos', label: 'Todos os Focos' },
              { id: 'Misto', label: 'Misto' },
              { id: 'Postura', label: 'Postura' },
              { id: 'Corte', label: 'Corte' },
              { id: 'Ornamental', label: 'Ornamental' },
              { id: 'Combate', label: 'Combate' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setBreedFocusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                  breedFocusFilter === f.id
                    ? 'bg-theme-primary text-black shadow-md shadow-amber-500/20'
                    : 'bg-theme-surface hover:bg-white/5 text-theme-text-muted hover:text-white border border-theme-border/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Active Filters Bar */}
          {(breedFocusFilter !== 'Todos' || breedSearch) && (
            <div className="flex flex-wrap gap-1.5 items-center px-1 animate-fade-in shrink-0">
              <span className="text-[9px] font-bold text-theme-text-muted uppercase mr-1">Filtros ativos:</span>
              {breedFocusFilter !== 'Todos' && (
                <span className="text-[9px] font-black bg-theme-primary/10 border border-theme-primary/25 text-theme-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                  Foco: {breedFocusFilter}
                  <button onClick={() => setBreedFocusFilter('Todos')} className="hover:text-white ml-0.5 font-bold">✕</button>
                </span>
              )}
              {breedSearch && (
                <span className="text-[9px] font-black bg-amber-500/10 border border-amber-500/25 text-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                  Busca: "{breedSearch}"
                  <button onClick={() => setBreedSearch('')} className="hover:text-white ml-0.5 font-bold">✕</button>
                </span>
              )}
              <button 
                onClick={() => { setBreedFocusFilter('Todos'); setBreedSearch(''); }} 
                className="text-[9px] font-bold text-red-400 hover:underline ml-1 cursor-pointer"
              >
                Limpar Todos
              </button>
            </div>
          )}

          {/* Breeds Grid */}
          <div className="w-full">
            {filteredBreeds.length === 0 ? (
              <div className="text-center p-8 sm:p-12 bg-theme-surface border border-theme-border/60 border-dashed rounded-3xl text-theme-text-muted flex flex-col items-center justify-center gap-3 animate-fade-in">
                <span className="text-4xl">🐓</span>
                <div className="max-w-xs space-y-1">
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">
                    {breedSearch || breedFocusFilter !== 'Todos' ? 'Nenhuma raça encontrada' : 'Nenhuma raça cadastrada'}
                  </h4>
                  <p className="text-xs text-theme-text-muted">
                    {breedSearch || breedFocusFilter !== 'Todos' 
                      ? 'Tente remover o filtro de busca ou foco selecionado.' 
                      : 'Cadastre suas primeiras raças para organizar suas aves e linhagens.'}
                  </p>
                </div>
                {(!breedSearch && breedFocusFilter === 'Todos') && (
                  <button
                    type="button"
                    onClick={() => openBreedModal()}
                    className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-theme-primary to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider hover:opacity-95 active:scale-95 transition-all shadow-lg shadow-theme-primary/20 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={16} strokeWidth={3} /> Cadastrar Primeira Raça
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {filteredBreeds.map(breed => (
                  <BreedItemCard
                    key={breed.id}
                    breed={breed}
                    count={birdCountByBreed[breed.nome] || 0}
                    onSelect={(nome) => {
                      setActiveBreed(nome);
                      setActiveTab('aves');
                    }}
                    onEdit={(id) => openBreedModal(id)}
                    onDelete={(id, nome) => {
                      const avesVinculadas = birds.filter(b => b.raca === nome && b.status !== 'Vendido' && b.status !== 'Faleceu').length;
                      const aviso = avesVinculadas > 0
                        ? `Existem ${avesVinculadas} ave(s) vinculada(s) a esta raça. Elas ficarão sem raça definida. Deseja realmente apagar a raça "${nome}" permanentemente?`
                        : `Deseja realmente apagar a raça "${nome}" permanentemente?`;
                      setDeleteBreedConfirm({ id, nome, message: aviso });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Content: Histórico & Vendas ── */}
      {activeTab === 'historico' && (
        <div className="space-y-4 sm:space-y-5">
          {/* 1. Cards de Balanço Financeiro & Zootécnico */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Faturado */}
            <div className="bg-theme-surface border border-theme-border/60 rounded-2xl p-4 sm:p-5 relative overflow-hidden group shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <DollarSign size={80} className="text-emerald-400" />
              </div>
              <p className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Faturamento com Vendas
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-400">
                {salesMetrics.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
              <p className="text-[10px] text-theme-text-muted mt-1">
                Acumulado no histórico
              </p>
            </div>

            {/* Aves Vendidas */}
            <div className="bg-theme-surface border border-theme-border/60 rounded-2xl p-4 sm:p-5 relative overflow-hidden group shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <ShoppingBag size={80} className="text-theme-primary" />
              </div>
              <p className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1">
                Aves Vendidas
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                {salesMetrics.soldCount} <span className="text-xs font-normal text-theme-text-muted">aves</span>
              </h3>
              <p className="text-[10px] text-theme-text-muted mt-1">
                Saíram do plantel ativo
              </p>
            </div>

            {/* Ticket Médio */}
            <div className="bg-theme-surface border border-theme-border/60 rounded-2xl p-4 sm:p-5 relative overflow-hidden group shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <TrendingUp size={80} className="text-amber-400" />
              </div>
              <p className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1">
                Ticket Médio / Ave
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-amber-400">
                {salesMetrics.avgTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
              <p className="text-[10px] text-theme-text-muted mt-1">
                Média por ave comercializada
              </p>
            </div>

            {/* Baixas / Óbitos */}
            <div className="bg-theme-surface border border-theme-border/60 rounded-2xl p-4 sm:p-5 relative overflow-hidden group shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <Skull size={80} className="text-red-400" />
              </div>
              <p className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1">
                Baixas / Óbitos
              </p>
              <h3 className="text-xl sm:text-2xl font-black text-red-400">
                {salesMetrics.deceasedCount} <span className="text-xs font-normal text-theme-text-muted">aves</span>
              </h3>
              <p className="text-[10px] text-theme-text-muted mt-1">
                Registradas com baixa
              </p>
            </div>
          </div>

          {/* 2. Filtros e Busca do Histórico Padronizados */}
          <div className="space-y-3">
            {/* Search Row Padronizada */}
            <div className="w-full shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted" size={15} />
                <input
                  type="text"
                  placeholder="Pesquisar histórico por anilha, nome, raça ou comprador..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="w-full bg-theme-surface border border-theme-border/50 text-white pl-9 pr-9 py-2.5 rounded-xl focus:outline-none focus:border-theme-primary transition-colors text-xs shadow-inner"
                />
                {historySearch && (
                  <button
                    type="button"
                    onClick={() => setHistorySearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white p-0.5"
                    title="Limpar pesquisa"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 pt-0.5 shrink-0">
              {[
                { id: 'todos', label: 'Todas Movimentações' },
                { id: 'vendidas', label: `🏷️ Vendidas (${salesMetrics.soldCount})` },
                { id: 'obitos', label: `✝️ Óbitos / Baixas (${salesMetrics.deceasedCount})` },
                { id: 'entradas', label: `📋 Cadastros (${birds.length})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setHistoryFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold shrink-0 transition-all whitespace-nowrap cursor-pointer ${
                    historyFilter === f.id
                      ? 'bg-theme-primary text-black shadow-md shadow-amber-500/20'
                      : 'bg-theme-surface hover:bg-white/5 text-theme-text-muted hover:text-white border border-theme-border/50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Active Filters Bar do Histórico */}
            {(historyFilter !== 'todos' || historySearch) && (
              <div className="flex flex-wrap gap-1.5 items-center px-1 animate-fade-in shrink-0">
                <span className="text-[9px] font-bold text-theme-text-muted uppercase mr-1">Filtros ativos:</span>
                {historyFilter !== 'todos' && (
                  <span className="text-[9px] font-black bg-theme-primary/10 border border-theme-primary/25 text-theme-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                    Tipo: {historyFilter === 'vendidas' ? 'Vendidas' : historyFilter === 'obitos' ? 'Óbitos' : 'Cadastros'}
                    <button onClick={() => setHistoryFilter('todos')} className="hover:text-white ml-0.5 font-bold">✕</button>
                  </span>
                )}
                {historySearch && (
                  <span className="text-[9px] font-black bg-amber-500/10 border border-amber-500/25 text-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                    Busca: "{historySearch}"
                    <button onClick={() => setHistorySearch('')} className="hover:text-white ml-0.5 font-bold">✕</button>
                  </span>
                )}
                <button 
                  onClick={() => { setHistoryFilter('todos'); setHistorySearch(''); }} 
                  className="text-[9px] font-bold text-red-400 hover:underline ml-1 cursor-pointer"
                >
                  Limpar Todos
                </button>
              </div>
            )}
          </div>

          {/* 3. Lista de Aves no Histórico */}
          {historyBirds.length === 0 ? (
            <div className="text-center p-8 sm:p-12 bg-theme-surface border border-theme-border/60 border-dashed rounded-3xl text-theme-text-muted flex flex-col items-center justify-center gap-3 animate-fade-in">
              <span className="text-4xl">📋</span>
              <div className="max-w-xs space-y-1">
                <h4 className="text-sm font-black text-white uppercase tracking-tight">
                  Nenhuma movimentação encontrada
                </h4>
                <p className="text-xs text-theme-text-muted">
                  Tente alterar o filtro ou termo de busca selecionado.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {historyBirds.map(b => {
                const isSold = b.status === 'Vendido';
                const isDeceased = b.status === 'Faleceu';
                const valorExibicao = isSold 
                  ? (b.valorVenda !== undefined ? Number(b.valorVenda) : (b.valorEstimado ? Number(b.valorEstimado) : 0))
                  : (b.valorEstimado ? Number(b.valorEstimado) : 0);

                return (
                  <div
                    key={b.id}
                    onClick={() => openBirdProfile(b.id)}
                    className="p-4 bg-theme-surface border border-theme-border/60 hover:border-theme-primary/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer group shadow-md content-visibility-auto"
                  >
                    {/* Lado Esquerdo: Foto e Dados Básicos */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-theme-base border border-theme-border/60 overflow-hidden shrink-0 flex items-center justify-center">
                        {b.imagem || b.imagens?.[0] ? (
                          <img src={b.imagem || b.imagens![0]} alt={b.anilha} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <span className="text-xl">{b.sexo === 'Macho' ? '🐓' : '🐔'}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-black text-white group-hover:text-theme-primary transition-colors">
                            {b.anilha}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-md font-extrabold uppercase ${
                            isSold 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isDeceased
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {isSold ? 'VENDIDA' : isDeceased ? 'ÓBITO' : 'NO PLANTEL'}
                          </span>
                          <span className="text-[10px] text-theme-text-muted">
                            {b.sexo} • {b.raca || 'Sem raça'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-xs text-theme-text-muted flex-wrap">
                          {b.nome && <span className="text-zinc-300 font-semibold">{b.nome}</span>}
                          {isSold && b.compradorNome && (
                            <span className="text-emerald-300/80">
                              👤 Comprador: <b>{b.compradorNome}</b> {b.compradorContato ? `(${b.compradorContato})` : ''}
                            </span>
                          )}
                          {isSold && b.dataVenda && (
                            <span>📅 Vendida em: {b.dataVenda.split('-').reverse().join('/')}</span>
                          )}
                          {isDeceased && b.dataBaixa && (
                            <span>📅 Óbito em: {b.dataBaixa.split('-').reverse().join('/')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito: Valores Financeiros e Ações */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-theme-border/40 shrink-0">
                      {valorExibicao > 0 && (
                        <div className="text-left sm:text-right">
                          <p className="text-[9px] font-bold text-theme-text-muted uppercase">
                            {isSold ? 'Valor da Venda' : 'Valor Estimado'}
                          </p>
                          <p className="text-base font-black text-emerald-400">
                            {valorExibicao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {(isSold || isDeceased) && (
                          <button
                            onClick={() => {
                              if (confirm(`Deseja reativar a ave ${b.anilha} de volta para o plantel ativo?`)) {
                                editBird(b.id, {
                                  status: b.sexo === 'Macho' ? 'Reprodutor' : 'Matriz',
                                  dataBaixa: undefined,
                                  dataVenda: undefined,
                                });
                                showToast(`Ave ${b.anilha} reativada no plantel!`, 'success');
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                            title="Reativar ave e trazer de volta para o plantel ativo"
                          >
                            <RotateCcw size={13} />
                            <span className="hidden md:inline">Reativar</span>
                          </button>
                        )}

                        <button
                          onClick={() => openBirdProfile(b.id)}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Ver Ficha</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Nova Raça / Editar */}
      <BreedFormModal
        isOpen={showNewBreedModal}
        onClose={() => setShowNewBreedModal(false)}
        breedToEdit={breedToEdit}
        onSave={handleSaveBreed}
      />

      {/* Confirmação de exclusão de raça */}
      <ConfirmDialog
        isOpen={Boolean(deleteBreedConfirm)}
        title={`Apagar Raça "${deleteBreedConfirm?.nome || ''}"?`}
        message={deleteBreedConfirm?.message || ''}
        confirmLabel="Apagar Raça"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteBreedConfirm) {
            removeBreed(deleteBreedConfirm.id);
          }
          setDeleteBreedConfirm(null);
        }}
        onCancel={() => setDeleteBreedConfirm(null)}
      />

    </div>
  );
}
