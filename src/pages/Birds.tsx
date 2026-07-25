import { useState, useRef } from 'react';
import { Plus, MoreVertical, Search, Camera, Edit2 } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

export function Birds() {
  const { breeds, addBreed, editBreed, birds, openAddBirdModal, openBirdProfile } = useAppContext();
  const [activeBreed, setActiveBreed] = useState<string>(breeds[0]?.nome || '');
  const [showNewBreedModal, setShowNewBreedModal] = useState(false);
  const [breedToEditId, setBreedToEditId] = useState<string | null>(null);
  
  // Form states for Breed
  const [newBreedName, setNewBreedName] = useState('');
  const [newBreedFocus, setNewBreedFocus] = useState('Misto (Carne e Ovos)');
  const [newBreedDesc, setNewBreedDesc] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewImage(url);
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
      // Update active breed if we edited the active one
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
      if (!activeBreed) setActiveBreed(newBreedName);
    }
    
    setShowNewBreedModal(false);
  };

  const currentBirds = birds.filter(b => b.raca === activeBreed);
  const activeBreedObj = breeds.find(b => b.nome === activeBreed);

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Aves & Raças</h2>
          <p className="text-sm text-theme-text-muted mt-1">Gerenciamento de categorias raciais e linhagens do seu plantel.</p>
        </div>
        
        <button onClick={() => openBreedModal()} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Cadastrar Nova Raça
        </button>
      </div>

      <div className="flex gap-6 flex-1 h-full overflow-hidden">
        {/* Sidebar de Raças */}
        <div className="w-72 flex flex-col gap-3 overflow-y-auto pr-2 pb-4">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={16} />
            <input type="text" placeholder="Buscar raça..." className="w-full bg-theme-surface border border-theme-border rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:border-theme-primary outline-none" />
          </div>
          
          {breeds.length === 0 ? (
            <div className="text-center p-6 bg-theme-surface border border-theme-border border-dashed rounded-xl text-theme-text-muted text-sm">
              Nenhuma raça cadastrada. Clique no botão acima para adicionar.
            </div>
          ) : (
            breeds.map(breed => (
              <button 
                key={breed.id}
                onClick={() => setActiveBreed(breed.nome)}
                className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group ${
                  activeBreed === breed.nome 
                    ? 'bg-theme-primary/10 border-theme-primary shadow-[0_0_15px_rgba(245,158,11,0.1)]' 
                    : 'bg-theme-surface border-theme-border hover:border-theme-primary/50'
                }`}
              >
                {breed.imagem && (
                  <div 
                    className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                    style={{ backgroundImage: `url(${breed.imagem})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  />
                )}
                <div className="relative z-10 flex justify-between items-start mb-2">
                  <h3 className={`font-black text-lg ${activeBreed === breed.nome ? 'text-theme-primary' : 'text-white'}`}>{breed.nome}</h3>
                  <span className="text-xs bg-theme-base px-2 py-1 rounded-md text-theme-text-muted font-bold">
                    {birds.filter(b => b.raca === breed.nome).length} aves
                  </span>
                </div>
                <p className="relative z-10 text-xs text-theme-text-muted line-clamp-2 leading-relaxed">{breed.descricao}</p>
              </button>
            ))
          )}
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 premium-card flex flex-col overflow-hidden">
          <div className="p-6 border-b border-theme-border flex justify-between items-center bg-theme-surface/50">
            <div>
              <h3 className="font-bold text-xl text-white flex items-center gap-2">
                Animais da Raça: <span className="text-theme-primary">{activeBreed || 'Nenhuma selecionada'}</span>
              </h3>
              <p className="text-sm text-theme-text-muted mt-1">Todos os animais vinculados a esta genética.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openAddBirdModal(activeBreed)} className="btn-primary py-2 text-sm flex items-center gap-2">
                <Plus size={16} /> Cadastrar Ave
              </button>
              <button 
                onClick={() => activeBreedObj && openBreedModal(activeBreedObj.id)} 
                title="Editar Raça"
                disabled={!activeBreedObj}
                className="p-2 text-theme-text-muted hover:text-white bg-theme-base rounded-lg border border-theme-border disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                <Edit2 size={16} /> <span className="hidden sm:inline">Editar Raça</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-theme-surface z-10 shadow-sm">
                <tr className="border-b border-theme-border text-xs uppercase tracking-wider text-theme-text-muted">
                  <th className="p-4 font-bold">Anilha / Nome</th>
                  <th className="p-4 font-bold">Sexo</th>
                  <th className="p-4 font-bold">Baia</th>
                  <th className="p-4 font-bold">Categoria</th>
                  <th className="p-4 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/50 text-sm">
                {currentBirds.map(bird => (
                  <tr key={bird.id} onClick={() => openBirdProfile(bird.id)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-theme-base border border-theme-border flex items-center justify-center text-lg overflow-hidden">
                          {bird.imagem ? <img src={bird.imagem} className="w-full h-full object-cover" /> : (bird.sexo === 'Macho' ? '🐓' : '🐔')}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-theme-primary transition-colors">{bird.anilha}</p>
                          <p className="text-xs text-theme-text-muted">{bird.nome}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium">{bird.sexo}</td>
                    <td className="p-4 font-mono text-theme-accent">{bird.baia}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        bird.sexo === 'Macho' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                      }`}>
                        {bird.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button className="p-2 text-theme-text-muted hover:text-white" onClick={(e) => e.stopPropagation()}><MoreVertical size={18} /></button>
                    </td>
                  </tr>
                ))}
                {currentBirds.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-theme-text-muted">
                      {breeds.length === 0 ? 'Nenhuma raça foi criada ainda.' : 'Nenhuma ave vinculada a esta raça no momento.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Nova Raça / Editar */}
      {showNewBreedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/50">
              <h3 className="font-bold text-lg text-white">
                {breedToEditId ? 'Editar Raça' : 'Cadastrar Nova Raça'}
              </h3>
              <button onClick={() => setShowNewBreedModal(false)} className="text-theme-text-muted hover:text-white">✕</button>
            </div>
            
            <div className="p-6 space-y-5">
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

            <div className="p-5 border-t border-theme-border flex justify-end gap-3 bg-theme-base/50">
              <button onClick={() => setShowNewBreedModal(false)} className="px-5 py-2 text-theme-text-muted">Cancelar</button>
              <button onClick={handleSaveBreed} className="btn-primary">
                {breedToEditId ? 'Salvar Alterações' : 'Salvar Raça'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
