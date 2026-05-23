import { useState, useRef, useEffect } from 'react';
import { Camera, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { SearchableSelect } from '../SearchableSelect';

export function AddBirdModal() {
  const { isAddBirdModalOpen, closeModals, breeds, addBird, editBird, preSelectedBreedForNewBird, birds, birdToEditId } = useAppContext();

  const [newBirdAnilha, setNewBirdAnilha] = useState('');
  const [newBirdName, setNewBirdName] = useState('');
  const [newBirdSex, setNewBirdSex] = useState('Macho');
  const [newBirdBreed, setNewBirdBreed] = useState('');
  const [newBirdBaia, setNewBirdBaia] = useState('');
  const [newBirdStatus, setNewBirdStatus] = useState('Reprodutor');
  const [newBirdVacinas, setNewBirdVacinas] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // New states for Origins
  const [birdOrigin, setBirdOrigin] = useState<'Criatório' | 'Externo'>('Criatório');
  
  const [isPaiExterno, setIsPaiExterno] = useState(false);
  const [paiId, setPaiId] = useState('');
  const [paiNameExterno, setPaiNameExterno] = useState('');

  const [isMaeExterno, setIsMaeExterno] = useState(false);
  const [maeId, setMaeId] = useState('');
  const [maeNameExterno, setMaeNameExterno] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial state when opened
  useEffect(() => {
    if (isAddBirdModalOpen) {
      if (birdToEditId) {
        const bird = birds.find(b => b.id === birdToEditId);
        if (bird) {
          setNewBirdAnilha(bird.anilha);
          setNewBirdName(bird.nome);
          setNewBirdSex(bird.sexo);
          setNewBirdBreed(bird.raca);
          setNewBirdBaia(bird.baia);
          setNewBirdStatus(bird.status);
          setNewBirdVacinas(bird.vacinas || '');
          setBirdOrigin(bird.origem || 'Criatório');
          setPreviewImage(bird.imagem || null);
          
          setIsPaiExterno(bird.isPaiExterno || false);
          if (bird.isPaiExterno) setPaiNameExterno(bird.paiId || '');
          else setPaiId(bird.paiId || '');

          setIsMaeExterno(bird.isMaeExterno || false);
          if (bird.isMaeExterno) setMaeNameExterno(bird.maeId || '');
          else setMaeId(bird.maeId || '');
        }
      } else {
        // Reset for new
        setNewBirdAnilha('');
        setNewBirdName('');
        setNewBirdSex('Macho');
        setNewBirdBreed(preSelectedBreedForNewBird || (breeds[0]?.nome || ''));
        setNewBirdBaia('');
        setNewBirdStatus('Reprodutor');
        setNewBirdVacinas('');
        setBirdOrigin('Criatório');
        setPreviewImage(null);
        setIsPaiExterno(false);
        setPaiId('');
        setPaiNameExterno('');
        setIsMaeExterno(false);
        setMaeId('');
        setMaeNameExterno('');
      }
    }
  }, [isAddBirdModalOpen, birdToEditId, preSelectedBreedForNewBird, breeds, birds]);

  if (!isAddBirdModalOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewImage(url);
    }
  };

  const handleSaveBird = () => {
    if (!newBirdAnilha || !newBirdBreed) return;

    const birdData = {
      anilha: newBirdAnilha,
      nome: newBirdName,
      sexo: newBirdSex,
      raca: newBirdBreed,
      baia: newBirdBaia || 'ND',
      status: newBirdStatus,
      vacinas: newBirdVacinas,
      origem: birdOrigin,
      isPaiExterno,
      paiId: isPaiExterno ? paiNameExterno : paiId,
      isMaeExterno,
      maeId: isMaeExterno ? maeNameExterno : maeId,
      imagem: previewImage || undefined
    };

    if (birdToEditId) {
      editBird(birdToEditId, birdData);
    } else {
      addBird({
        id: Date.now().toString(),
        ...birdData
      });
    }

    closeModals();
  };

  const breedOptions = breeds.map(b => ({ label: b.nome, value: b.nome }));
  const sexOptions = [
    { label: 'Macho', value: 'Macho' },
    { label: 'Fêmea', value: 'Fêmea' }
  ];
  const statusOptions = [
    { label: 'Reprodutor', value: 'Reprodutor' },
    { label: 'Matriz', value: 'Matriz' },
    { label: 'Crescimento', value: 'Crescimento' },
    { label: 'Descarte', value: 'Descarte' }
  ];

  const paiOptions = [
    { label: 'Desconhecido', value: '' },
    ...birds.filter(b => b.sexo === 'Macho' && b.id !== birdToEditId).map(b => ({ label: `${b.anilha} - ${b.nome}`, value: b.id }))
  ];

  const maeOptions = [
    { label: 'Desconhecida', value: '' },
    ...birds.filter(b => b.sexo === 'Fêmea' && b.id !== birdToEditId).map(b => ({ label: `${b.anilha} - ${b.nome}`, value: b.id }))
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[90dvh] md:h-auto md:max-h-[90vh] rounded-t-2xl md:rounded-2xl">
        <div className="p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/50 shrink-0">
          <h3 className="font-bold text-lg text-white">
            {birdToEditId ? 'Editar Cadastro' : 'Cadastrar Ave'}
          </h3>
          <button onClick={closeModals} className="text-theme-text-muted hover:text-white p-2">✕</button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 sm:w-32 sm:h-32 rounded-xl border-2 border-dashed border-theme-border flex flex-col items-center justify-center text-theme-text-muted hover:border-theme-primary hover:text-theme-primary cursor-pointer bg-theme-base shrink-0 overflow-hidden relative group"
            >
              {previewImage ? (
                <>
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold text-white text-xs uppercase">Trocar</div>
                </>
              ) : (
                <>
                  <Camera size={24} className="mb-2" />
                  <span className="text-[10px] font-bold uppercase text-center px-2">Adicionar<br/>Foto</span>
                </>
              )}
            </div>

            <div className="flex-1 space-y-4 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-text-muted uppercase">Anilha / ID *</label>
                  <input type="text" value={newBirdAnilha} onChange={e => setNewBirdAnilha(e.target.value)} className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white focus:border-theme-primary outline-none" placeholder="Ex: BR-2024-001" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-text-muted uppercase">Nome (Opcional)</label>
                  <input type="text" value={newBirdName} onChange={e => setNewBirdName(e.target.value)} className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white focus:border-theme-primary outline-none" placeholder="Ex: Titan" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 relative z-50">
                  <label className="text-xs font-bold text-theme-text-muted uppercase">Raça / Genética *</label>
                  <SearchableSelect 
                    options={breedOptions}
                    value={newBirdBreed}
                    onChange={setNewBirdBreed}
                    placeholder="Selecione a raça..."
                  />
                </div>
                <div className="space-y-1 relative z-50">
                  <label className="text-xs font-bold text-theme-text-muted uppercase">Sexo *</label>
                  <SearchableSelect 
                    options={sexOptions}
                    value={newBirdSex}
                    onChange={setNewBirdSex}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border border-theme-border rounded-xl p-4 bg-theme-base/30 space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-bold text-white">A ave veio de outro criatório (Externa)?</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setBirdOrigin('Criatório')}
                  className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors ${birdOrigin === 'Criatório' ? 'bg-theme-primary/20 border-theme-primary text-theme-primary' : 'bg-theme-base border-theme-border text-theme-text-muted'}`}
                >Nascida Aqui</button>
                <button 
                  onClick={() => setBirdOrigin('Externo')}
                  className={`px-3 py-1 rounded-md text-xs font-bold border transition-colors ${birdOrigin === 'Externo' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-theme-base border-theme-border text-theme-text-muted'}`}
                >Comprada / Externa</button>
              </div>
            </div>
            
            {birdOrigin === 'Externo' && (
              <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-200 text-sm">
                <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={16} />
                <p><strong>Aviso de Quarentena:</strong> Como esta ave veio de fora, mantenha-a isolada do plantel principal por pelo menos 30 a 40 dias para evitar a introdução de doenças.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-theme-border pt-6 relative z-40">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-theme-text-muted uppercase">Pai (Macho)</label>
                <label className="flex items-center gap-2 text-xs text-theme-text-muted cursor-pointer">
                  <input type="checkbox" checked={isPaiExterno} onChange={e => setIsPaiExterno(e.target.checked)} className="accent-theme-primary" />
                  Pai Externo
                </label>
              </div>
              {isPaiExterno ? (
                <input type="text" value={paiNameExterno} onChange={e => setPaiNameExterno(e.target.value)} className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white focus:border-theme-primary outline-none" placeholder="Ex: Galo Campeão (Criatório X)" />
              ) : (
                <SearchableSelect 
                  options={paiOptions}
                  value={paiId}
                  onChange={setPaiId}
                  placeholder="Selecione o Pai..."
                />
              )}
            </div>
            <div className="space-y-2 relative z-30">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-theme-text-muted uppercase">Mãe (Fêmea)</label>
                <label className="flex items-center gap-2 text-xs text-theme-text-muted cursor-pointer">
                  <input type="checkbox" checked={isMaeExterno} onChange={e => setIsMaeExterno(e.target.checked)} className="accent-theme-primary" />
                  Mãe Externa
                </label>
              </div>
              {isMaeExterno ? (
                <input type="text" value={maeNameExterno} onChange={e => setMaeNameExterno(e.target.value)} className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white focus:border-theme-primary outline-none" placeholder="Ex: Matriz Importada" />
              ) : (
                <SearchableSelect 
                  options={maeOptions}
                  value={maeId}
                  onChange={setMaeId}
                  placeholder="Selecione a Mãe..."
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-20">
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase">Baia de Alojamento</label>
              <input type="text" value={newBirdBaia} onChange={e => setNewBirdBaia(e.target.value)} className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white focus:border-theme-primary outline-none" placeholder="Ex: B-04" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase">Status</label>
              <SearchableSelect 
                options={statusOptions}
                value={newBirdStatus}
                onChange={setNewBirdStatus}
              />
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <label className="text-xs font-bold text-theme-text-muted uppercase">Vacinas e Imunizações</label>
            <input type="text" value={newBirdVacinas} onChange={e => setNewBirdVacinas(e.target.value)} className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white focus:border-theme-primary outline-none" placeholder="Ex: Marek, Bouba Aviária, Newcastle..." />
            
            {(!newBirdVacinas || newBirdVacinas.trim() === '') && (
              <div className="flex items-center gap-2 text-red-400 mt-2 text-xs bg-red-500/10 p-2 rounded border border-red-500/20">
                <ShieldAlert size={14} />
                <span><strong>Atenção:</strong> Aves sem vacinas em dia representam risco biológico ao seu plantel.</span>
              </div>
            )}
            {newBirdVacinas && newBirdVacinas.trim() !== '' && (
              <p className="text-[10px] text-theme-text-muted mt-1">Separe as vacinas por vírgula.</p>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-theme-border flex justify-end gap-3 bg-theme-base/50 relative z-10">
          <button onClick={closeModals} className="px-5 py-2 text-theme-text-muted">Cancelar</button>
          <button onClick={handleSaveBird} className="btn-primary">
            {birdToEditId ? 'Salvar Alterações' : 'Salvar Ave no Plantel'}
          </button>
        </div>
      </div>
    </div>
  );
}
