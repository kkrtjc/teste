import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Plus, Edit2, Camera, Search, X, ChevronRight, Trash2 } from 'lucide-react';
import { useAppContext, type Bird, type Breed } from '../lib/AppContext';
import { compressImage } from '../lib/imageCompression';

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
      className="premium-card flex flex-col group cursor-pointer hover:border-theme-primary/50 transition-all overflow-hidden relative bg-theme-surface active:scale-[0.98] touch-manipulation content-visibility-auto"
      style={{ containIntrinsicSize: '1px 220px' }}
    >
      {/* Image block 1:1 */}
      <div className="aspect-square w-full bg-theme-base flex items-center justify-center overflow-hidden relative border-b border-theme-border/30">
        {breed.imagem ? (
          <img
            src={breed.imagem}
            alt={breed.nome}
            loading="lazy"
            decoding="async"
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
      className="premium-card flex flex-col group cursor-pointer hover:border-theme-primary/50 transition-all overflow-hidden relative bg-theme-surface active:scale-[0.98] touch-manipulation content-visibility-auto"
      style={{ containIntrinsicSize: '1px 240px' }}
    >
      {/* Bloco da Foto 1:1 Quadrada Grande igual a de Raças */}
      <div className="aspect-square w-full bg-theme-base flex items-center justify-center overflow-hidden relative border-b border-theme-border/30">
        {bird.imagem ? (
          <img
            src={bird.imagem}
            alt={bird.anilha}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-5xl group-hover:scale-105 transition-transform duration-300 select-none opacity-40">
            {bird.sexo === 'Macho' ? '🐓' : '🐔'}
          </span>
        )}

        {/* Badge Sexo no Canto Superior Direito */}
        <div className="absolute top-2 right-2 z-10">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md border backdrop-blur-sm
            ${bird.sexo === 'Macho' 
              ? 'bg-blue-500/80 text-white border-blue-400/50' 
              : 'bg-pink-500/80 text-white border-pink-400/50'}`}>
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

export function Birds() {
  const location = useLocation();
  const { 
    breeds, addBreed, editBreed, removeBreed,
    birds, editBird, openAddBirdModal, openBirdProfile, 
    activeBreed, setActiveBreed 
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'aves' | 'racas'>('aves');

  // Sincroniza aba selecionada via URL query ou state de navegação
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab') || (location.state as any)?.tab;
    if (tabParam === 'racas' || tabParam === 'breeds') {
      setActiveTab('racas');
    } else if (tabParam === 'aves') {
      setActiveTab('aves');
    }
  }, [location]);

  // Garante rolagem para o TOPO ao trocar de aba ou filtro de raça
  useEffect(() => {
    window.scrollTo(0, 0);
    const scrollContainers = document.querySelectorAll('.overflow-y-auto');
    scrollContainers.forEach(el => { el.scrollTop = 0; });
  }, [activeTab, activeBreed]);
  const [showNewBreedModal, setShowNewBreedModal] = useState(false);
  const [breedToEditId, setBreedToEditId] = useState<string | null>(null);
  const [breedSearch, setBreedSearch] = useState('');
  const [birdSearch, setBirdSearch] = useState('');
  const [sexFilter, setSexFilter] = useState<'Todos' | 'Macho' | 'Fêmea'>('Todos');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Crescimento'>('Todos');
  
  // Form states for Breed
  const [newBreedName, setNewBreedName] = useState('');
  const [newBreedFocus, setNewBreedFocus] = useState('Misto (Carne e Ovos)');
  const [newBreedDesc, setNewBreedDesc] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newBreedTempoCrescimento, setNewBreedTempoCrescimento] = useState(0);
  const [newBreedPesoMedio, setNewBreedPesoMedio] = useState('');
  const [showAdvancedBreed, setShowAdvancedBreed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        } else if (stateObj.filter === 'Crescimento') {
          setStatusFilter('Crescimento');
          setSexFilter('Todos');
        } else if (stateObj.filter === 'Total') {
          setSexFilter('Todos');
          setStatusFilter('Todos');
        }
      }
    }
  }, [location.state]);

  // Lock body scroll when breed modal is open
  useEffect(() => {
    if (showNewBreedModal) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [showNewBreedModal]);

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

  const openBreedModal = (editId?: string) => {
    if (editId) {
      const breed = breeds.find(b => b.id === editId);
      if (breed) {
        setBreedToEditId(breed.id);
        setNewBreedName(breed.nome);
        setNewBreedFocus(breed.foco);
        setNewBreedDesc(breed.descricao);
        setPreviewImage(breed.imagem || null);
        setNewBreedTempoCrescimento(breed.tempoCrescimento || 0);
        setNewBreedPesoMedio(breed.pesoMedio || '');
      }
    } else {
      setBreedToEditId(null);
      setNewBreedName('');
      setNewBreedFocus('Misto (Carne e Ovos)');
      setNewBreedDesc('');
      setPreviewImage(null);
      setNewBreedTempoCrescimento(0);
      setNewBreedPesoMedio('');
    }
    setShowAdvancedBreed(false);
    setShowNewBreedModal(true);
  };

  const handleSaveBreed = () => {
    if (!newBreedName.trim()) return;

    if (breedToEditId) {
      const oldBreed = breeds.find(b => b.id === breedToEditId);
      editBreed(breedToEditId, {
        nome: newBreedName,
        descricao: newBreedDesc,
        foco: newBreedFocus,
        imagem: previewImage || undefined,
        tempoCrescimento: newBreedTempoCrescimento,
        pesoMedio: newBreedPesoMedio
      });
      // Atualiza o nome da raça em todas as aves vinculadas ao nome antigo
      if (oldBreed && oldBreed.nome !== newBreedName) {
        birds
          .filter(b => b.raca === oldBreed.nome)
          .forEach(b => editBird(b.id, { raca: newBreedName }));
      }
      if (oldBreed && activeBreed === oldBreed.nome) {
        setActiveBreed(newBreedName);
      }
    } else {
      addBreed({
        id: Date.now().toString(),
        nome: newBreedName,
        descricao: newBreedDesc,
        foco: newBreedFocus,
        totalAves: 0,
        imagem: previewImage || undefined,
        tempoCrescimento: newBreedTempoCrescimento,
        pesoMedio: newBreedPesoMedio
      });
    }
    
    setShowNewBreedModal(false);
  };

  const filteredBreeds = breeds.filter(b =>
    b.nome.toLowerCase().includes(breedSearch.toLowerCase())
  );

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
    if (statusFilter === 'Crescimento') {
      list = list.filter(b => b.status === 'Crescimento');
    } else {
      // Exibe todas as aves ativas do plantel (esconde apenas Vendidos e Falecidos)
      list = list.filter(b => b.status !== 'Vendido' && b.status !== 'Faleceu');
    }
    
    return list;
  }, [birds, activeBreed, sexFilter, statusFilter]);

  const filteredBirds = useMemo(() => {
    const query = birdSearch.trim().toLowerCase();
    return currentBirds.filter(b =>
      (b.anilha || '').toLowerCase().includes(query) ||
      (b.nome || '').toLowerCase().includes(query) ||
      (b.baia || '').toLowerCase().includes(query)
    );
  }, [currentBirds, birdSearch]);

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
    <div className="space-y-5 animate-fade-in max-w-7xl mx-auto w-full overflow-x-hidden flex flex-col h-full">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          {activeTab === 'aves' ? (
            <>
              <h2 className="text-base sm:text-lg font-black text-white leading-none">Plantel de Aves</h2>
              <p className="text-[10px] sm:text-xs text-theme-text-muted mt-1 leading-none">
                {activeBreed || sexFilter !== 'Todos' || statusFilter !== 'Todos'
                  ? `Filtrado (${filteredBirds.length} ave${filteredBirds.length !== 1 ? 's' : ''})`
                  : `Total: ${birds.filter(b => b.status !== 'Vendido' && b.status !== 'Faleceu').length} aves`
                }
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base sm:text-lg font-black text-white leading-none">Raças &amp; Linhagens</h2>
              <p className="text-[10px] sm:text-xs text-theme-text-muted mt-1 leading-none">
                {breeds.length} raça{breeds.length !== 1 ? 's' : ''}
              </p>
            </>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          {activeTab === 'aves' && (
            <div className="flex items-center gap-1 shrink-0">
              <select
                value={activeBreed}
                onChange={e => setActiveBreed(e.target.value)}
                className="bg-theme-surface border border-theme-border/50 text-white px-2.5 py-1.5 rounded-full focus:outline-none focus:border-theme-primary transition-colors text-[10px] sm:text-xs outline-none font-bold max-w-[90px] sm:max-w-[120px] truncate"
              >
                <option value="" className="bg-theme-surface">Raças</option>
                {breeds.map(b => (
                  <option key={b.id} value={b.nome} className="bg-theme-surface">{b.nome}</option>
                ))}
              </select>

              {activeBreed && (
                <button
                  onClick={() => setActiveBreed('')}
                  className="p-1 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-full transition-all shrink-0 animate-fade-in"
                  title="Limpar Filtro"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          )}

          {activeTab === 'aves' ? (
            <button 
              onClick={() => openAddBirdModal(activeBreed)} 
              className="btn-primary !px-3 !py-1.5 !text-[10px] sm:!text-xs flex items-center gap-1 shrink-0"
            >
              <Plus size={12} /> Cadastrar Ave
            </button>
          ) : (
            <button 
              onClick={() => openBreedModal()} 
              className="btn-primary !px-3 !py-1.5 !text-[10px] sm:!text-xs flex items-center gap-1 shrink-0"
            >
              <Plus size={12} /> Cadastrar Raça
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs (Glassmorphic Pill Bar) ── */}
      <div className="flex p-1 bg-theme-surface border border-theme-border/40 rounded-full overflow-x-auto hide-scrollbar shrink-0 w-full sm:w-auto max-w-md self-start gap-1">
        <button 
          onClick={() => { setActiveTab('aves'); }}
          className={`flex-1 sm:flex-none text-center px-4 py-2 text-xs font-black transition-all rounded-full whitespace-nowrap ${
            activeTab === 'aves' 
              ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'text-theme-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          Plantel de Aves
        </button>
        <button 
          onClick={() => { setActiveTab('racas'); }}
          className={`flex-1 sm:flex-none text-center px-4 py-2 text-xs font-black transition-all rounded-full whitespace-nowrap ${
            activeTab === 'racas' 
              ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'text-theme-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          Raças &amp; Linhagens
        </button>
      </div>

      {/* ── Tab Content: Aves ── */}
      {activeTab === 'aves' && (
        <div className="flex-1 flex flex-col space-y-3 min-h-0">
          {/* Search Row */}
          <div className="w-full shrink-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted" size={14} />
              <input
                type="text"
                placeholder="Pesquisar por anilha, nome ou baia..."
                value={birdSearch}
                onChange={e => setBirdSearch(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border/50 text-white pl-9 pr-4 py-1.5 rounded-full focus:outline-none focus:border-theme-primary transition-colors text-xs shadow-inner"
              />
            </div>
          </div>

          {/* Active Filters Bar */}
          {(sexFilter !== 'Todos' || statusFilter !== 'Todos' || activeBreed) && (
            <div className="flex flex-wrap gap-1.5 items-center px-1 animate-fade-in shrink-0">
              <span className="text-[9px] font-bold text-theme-text-muted uppercase mr-1">Filtros ativos:</span>
              {activeBreed && (
                <span className="text-[9px] font-black bg-theme-primary/10 border border-theme-primary/25 text-theme-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                  Raça: {activeBreed}
                  <button onClick={() => setActiveBreed('')} className="hover:text-white ml-0.5 font-bold">✕</button>
                </span>
              )}
              {sexFilter !== 'Todos' && (
                <span className="text-[9px] font-black bg-blue-500/10 border border-blue-500/25 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  Sexo: {sexFilter}s
                  <button onClick={() => setSexFilter('Todos')} className="hover:text-white ml-0.5 font-bold">✕</button>
                </span>
              )}
              {statusFilter !== 'Todos' && (
                <span className="text-[9px] font-black bg-green-500/10 border border-green-500/25 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter('Todos')} className="hover:text-white ml-0.5 font-bold">✕</button>
                </span>
              )}
              <button 
                onClick={() => { setSexFilter('Todos'); setStatusFilter('Todos'); setActiveBreed(''); setBirdSearch(''); }} 
                className="text-[9px] font-bold text-red-400 hover:underline ml-1"
              >
                Limpar Todos
              </button>
            </div>
          )}

          {/* Birds Grid */}
          <div className="flex-1 overflow-y-auto smooth-scroll pr-1">
            {filteredBirds.length === 0 ? (
              <div className="text-center p-12 bg-theme-surface border border-theme-border border-dashed rounded-xl text-theme-text-muted">
                {birdSearch || activeBreed
                  ? 'Nenhuma ave encontrada correspondente aos filtros.'
                  : 'Nenhuma ave cadastrada no plantel.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {filteredBirds.map(bird => (
                  <BirdItemCard key={bird.id} bird={bird} onSelect={openBirdProfile} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Content: Raças ── */}
      {activeTab === 'racas' && (
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Search Row */}
          <div className="relative shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-muted" size={18} />
            <input
              type="text"
              placeholder="Pesquisar raça..."
              value={breedSearch}
              onChange={e => setBreedSearch(e.target.value)}
              className="w-full bg-theme-surface border border-theme-border/50 text-white pl-11 pr-4 py-3.5 rounded-full focus:outline-none focus:border-theme-primary transition-colors text-sm shadow-inner"
            />
          </div>

          {/* Breeds Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredBreeds.length === 0 ? (
              <div className="text-center p-12 bg-theme-surface border border-theme-border border-dashed rounded-xl text-theme-text-muted">
                {breedSearch ? 'Nenhuma raça encontrada correspondente à busca.' : 'Nenhuma raça cadastrada.'}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                        ? `Existem ${avesVinculadas} ave(s) vinculada(s) a esta raça. Elas ficarão sem raça definida.\n\nDeseja realmente apagar a raça "${nome}" permanentemente?`
                        : `Deseja realmente apagar a raça "${nome}" permanentemente?`;
                      if (window.confirm(aviso)) {
                        removeBreed(id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nova Raça / Editar */}
      {showNewBreedModal && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-hidden touch-none select-none animate-fade-in" 
          onClick={() => setShowNewBreedModal(false)}
          onTouchMove={e => e.preventDefault()}
        >
          <div 
            className="bg-theme-surface border border-theme-border/80 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden animate-scale-up" 
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/50 shrink-0">
              <h3 className="font-bold text-lg text-white">
                {breedToEditId ? 'Editar Raça' : 'Cadastrar Nova Raça'}
              </h3>
              <button onClick={() => setShowNewBreedModal(false)} className="text-theme-text-muted hover:text-white">✕</button>
            </div>
            
            <div className="p-5 space-y-5 overflow-y-auto flex-1 modal-scrollable-content overscroll-contain touch-pan-y">

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
                      onClick={() => setNewBreedFocus(opt.label)}
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
                  <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Detalhes Técnicos</span>
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
                          placeholder="Ex: 150"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-theme-text-muted uppercase">Peso Médio</label>
                        <input
                          type="text"
                          value={newBreedPesoMedio}
                          onChange={(e) => setNewBreedPesoMedio(e.target.value)}
                          className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                          placeholder="Ex: 4.5 kg"
                        />
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
              <button onClick={() => setShowNewBreedModal(false)} className="px-5 py-2 text-theme-text-muted">Cancelar</button>
              <button onClick={handleSaveBreed} className="btn-primary">
                {breedToEditId ? 'Salvar Alterações' : 'Salvar Raça'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
