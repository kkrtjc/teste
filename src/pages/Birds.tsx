import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Camera, Search, X } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { compressImage } from '../lib/imageCompression';

export function Birds() {
  const { 
    breeds, addBreed, editBreed, 
    birds, openAddBirdModal, openBirdProfile, 
    activeBreed, setActiveBreed 
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'aves' | 'racas'>('aves');
  const [showNewBreedModal, setShowNewBreedModal] = useState(false);
  const [breedToEditId, setBreedToEditId] = useState<string | null>(null);
  const [breedSearch, setBreedSearch] = useState('');
  const [birdSearch, setBirdSearch] = useState('');
  
  // Form states for Breed
  const [newBreedName, setNewBreedName] = useState('');
  const [newBreedFocus, setNewBreedFocus] = useState('Misto (Carne e Ovos)');
  const [newBreedDesc, setNewBreedDesc] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync tab focus when activeBreed changes (e.g. from Dashboard click)
  useEffect(() => {
    if (activeBreed) {
      setActiveTab('aves');
    }
  }, [activeBreed]);

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
        const compressedBase64 = await compressImage(file, 500, 500, 0.6);
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
      }
    } else {
      setBreedToEditId(null);
      setNewBreedName('');
      setNewBreedFocus('Misto (Carne e Ovos)');
      setNewBreedDesc('');
      setPreviewImage(null);
    }
    setShowNewBreedModal(true);
  };

  const handleSaveBreed = () => {
    if (!newBreedName.trim()) return;

    if (breedToEditId) {
      editBreed(breedToEditId, {
        nome: newBreedName,
        descricao: newBreedDesc,
        foco: newBreedFocus,
        imagem: previewImage || undefined
      });
      const oldBreed = breeds.find(b => b.id === breedToEditId);
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
        imagem: previewImage || undefined
      });
    }
    
    setShowNewBreedModal(false);
  };

  const filteredBreeds = breeds.filter(b =>
    b.nome.toLowerCase().includes(breedSearch.toLowerCase())
  );

  const currentBirds = activeBreed
    ? birds.filter(b => b.raca === activeBreed)
    : birds;

  const filteredBirds = currentBirds.filter(b =>
    b.anilha.toLowerCase().includes(birdSearch.toLowerCase()) ||
    (b.nome || '').toLowerCase().includes(birdSearch.toLowerCase()) ||
    (b.baia || '').toLowerCase().includes(birdSearch.toLowerCase())
  );

  return (
    <div className="space-y-3.5 animate-fade-in h-full flex flex-col">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          {activeTab === 'aves' ? (
            <>
              <h2 className="text-base sm:text-lg font-black text-white leading-none">Plantel de Aves</h2>
              <p className="text-[10px] sm:text-xs text-theme-text-muted mt-1 leading-none">
                {activeBreed 
                  ? `Filtrado: ${activeBreed} (${filteredBirds.length} aves)`
                  : `Total: ${birds.length} aves`
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
                className="bg-theme-surface/30 backdrop-blur-md border border-theme-border/50 text-white px-2.5 py-1.5 rounded-full focus:outline-none focus:border-theme-primary transition-colors text-[10px] sm:text-xs outline-none font-bold max-w-[90px] sm:max-w-[120px] truncate"
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
      <div className="flex p-1 bg-theme-surface/30 border border-theme-border/40 backdrop-blur-md rounded-full overflow-x-auto hide-scrollbar shrink-0 w-full sm:w-auto max-w-md self-start gap-1">
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
                className="w-full bg-theme-surface/30 backdrop-blur-md border border-theme-border/50 text-white pl-9 pr-4 py-1.5 rounded-full focus:outline-none focus:border-theme-primary transition-colors text-xs shadow-inner"
              />
            </div>
          </div>

          {/* Birds Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredBirds.length === 0 ? (
              <div className="text-center p-12 bg-theme-surface border border-theme-border border-dashed rounded-xl text-theme-text-muted">
                {birdSearch || activeBreed
                  ? 'Nenhuma ave encontrada correspondente aos filtros.'
                  : 'Nenhuma ave cadastrada no plantel.'}
              </div>
            ) : (
              <div className="flex flex-col space-y-3">
                {filteredBirds.map(bird => (
                  <div
                    key={bird.id}
                    onClick={() => openBirdProfile(bird.id)}
                    className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer border border-theme-border/50 bg-theme-surface/20 backdrop-blur-md shadow-premium hover:border-theme-primary/50 transition-all w-full group"
                  >
                    {/* Imagem em quadrado limpo, sem sobreposição */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-theme-base flex-shrink-0 flex items-center justify-center border border-theme-border/30">
                      {bird.imagem ? (
                        <img
                          src={bird.imagem}
                          alt={bird.anilha}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <span className="text-4xl group-hover:scale-105 transition-transform duration-500 select-none opacity-40">
                          {bird.sexo === 'Macho' ? '🐓' : '🐔'}
                        </span>
                      )}
                    </div>

                    {/* Informações detalhadas à direita */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-20 sm:h-24 py-1">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-black text-white text-sm sm:text-base truncate group-hover:text-theme-primary transition-colors">
                            {bird.anilha}
                          </h4>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-md
                            ${bird.sexo === 'Macho' 
                              ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' 
                              : 'bg-pink-500/15 text-pink-400 border-pink-500/25'}`}>
                            {bird.sexo}
                          </span>
                        </div>
                        <p className="text-xs text-theme-text-muted truncate mt-0.5">
                          {bird.nome || 'Sem nome'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-theme-border/30 mt-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-[10px] sm:text-xs text-theme-text-muted font-bold truncate">
                            {bird.raca}
                          </span>
                          {bird.baia && bird.baia !== 'ND' && (
                            <>
                              <span className="text-theme-border/50 text-[10px]">•</span>
                              <span className="text-[10px] sm:text-xs font-black text-theme-accent uppercase tracking-wider">
                                Baia {bird.baia}
                              </span>
                            </>
                          )}
                        </div>
                        
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-theme-base/60 border border-theme-border/50
                          ${bird.status === 'Ativo' ? 'text-emerald-400 border-emerald-500/20' :
                            bird.status === 'Reprodução' || bird.status === 'Cruza' ? 'text-pink-400 border-pink-500/20' :
                            bird.status === 'Postura' ? 'text-yellow-400 border-yellow-500/20' :
                            bird.status === 'Engorda' ? 'text-orange-400 border-orange-500/20' : 'text-theme-primary border-theme-primary/20'}`}>
                          {bird.status}
                        </span>
                      </div>
                    </div>
                  </div>
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
              className="w-full bg-theme-surface/30 backdrop-blur-md border border-theme-border/50 text-white pl-11 pr-4 py-3.5 rounded-full focus:outline-none focus:border-theme-primary transition-colors text-sm shadow-inner"
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
                {filteredBreeds.map(breed => {
                  const count = birds.filter(b => b.raca === breed.nome).length;
                  return (
                    <div 
                      key={breed.id}
                      onClick={() => {
                        setActiveBreed(breed.nome);
                        setActiveTab('aves');
                      }}
                      className="premium-card flex flex-col group cursor-pointer hover:border-theme-primary/50 transition-all overflow-hidden relative bg-theme-surface"
                    >
                      {/* Image block 1:1 */}
                      <div className="aspect-square w-full bg-theme-base flex items-center justify-center overflow-hidden relative border-b border-theme-border/30">
                        {breed.imagem ? (
                          <img
                            src={breed.imagem}
                            alt={breed.nome}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <span className="text-5xl group-hover:scale-105 transition-transform duration-500">🐓</span>
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
                        </div>
                        
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-theme-border/30">
                          <button 
                            onClick={(e) => { e.stopPropagation(); openBreedModal(breed.id); }} 
                            className="p-1 text-theme-text-muted hover:text-white hover:bg-white/5 rounded transition-colors"
                            title="Editar Raça"
                          >
                            <Edit2 size={13} />
                          </button>
                          <span className="text-[10px] text-theme-primary font-black uppercase tracking-wider">
                            Ver Plantel
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Nova Raça / Editar */}
      {showNewBreedModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[90dvh] md:h-auto md:max-h-[90vh] rounded-t-2xl md:rounded-2xl">
            <div className="p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/50 shrink-0">
              <h3 className="font-bold text-lg text-white">
                {breedToEditId ? 'Editar Raça' : 'Cadastrar Nova Raça'}
              </h3>
              <button onClick={() => setShowNewBreedModal(false)} className="text-theme-text-muted hover:text-white">✕</button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto flex-1 overscroll-contain">
              <div className="flex gap-4 items-center mb-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-theme-border flex flex-col items-center justify-center text-theme-text-muted hover:border-theme-primary hover:text-theme-primary cursor-pointer bg-theme-base transition-all overflow-hidden relative group"
                >
                  {previewImage ? (
                    <>
                      <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold text-white text-[10px] uppercase">Trocar</div>
                    </>
                  ) : (
                    <>
                      <Camera size={20} className="mb-1" />
                      <span className="text-[10px] font-bold uppercase">Imagem</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-theme-text-muted leading-relaxed flex-1">
                  Adicione uma imagem de referência visual desta raça/linhagem. Clique na caixa para selecionar.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase">Nome da Raça / Linhagem *</label>
                <input 
                  type="text" 
                  value={newBreedName}
                  onChange={(e) => setNewBreedName(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white focus:border-theme-primary outline-none" 
                  placeholder="Ex: Brahma, Shamo, Índio Gigante..." 
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase">Foco Principal</label>
                <select 
                  value={newBreedFocus}
                  onChange={(e) => setNewBreedFocus(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white"
                >
                  <option>Misto (Carne e Ovos)</option>
                  <option>Postura (Ovos)</option>
                  <option>Corte (Carne)</option>
                  <option>Combate / Esporte</option>
                  <option>Ornamental</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase">Descrição / Características</label>
                <textarea 
                  value={newBreedDesc}
                  onChange={(e) => setNewBreedDesc(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white h-24 resize-none" 
                  placeholder="Anotações sobre as características genéticas desta raça..."
                ></textarea>
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
