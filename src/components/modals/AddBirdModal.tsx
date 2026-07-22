import { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { compressImage } from '../../lib/imageCompression';
import { calculateExactAge } from '../../lib/utils';

// ─── Step indicator ──────────────────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-6 h-2 bg-theme-primary'
              : i < current
              ? 'w-2 h-2 bg-theme-primary/50'
              : 'w-2 h-2 bg-theme-border'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AddBirdModal() {
  const {
    isAddBirdModalOpen, closeModals, breeds, addBird, editBird, removeBird,
    preSelectedBreedForNewBird, birds, birdToEditId, couples, addCouple
  } = useAppContext();

  // ── Form fields ──
  const [anilha, setAnilha] = useState('');
  const [nome, setNome] = useState('');
  const [sexo, setSexo] = useState('Macho');
  const [raca, setRaca] = useState('');
  const [baia, setBaia] = useState('');
  const [status, setStatus] = useState('Reprodutor');
  const [dataNasc, setDataNasc] = useState('');
  const [peso, setPeso] = useState('');
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  // ── Origin ──
  const [nascidaAqui, setNascidaAqui] = useState<boolean | null>(null);
  const [paiId, setPaiId] = useState('');
  const [maeId, setMaeId] = useState('');
  const [paiExterno, setPaiExterno] = useState('');
  const [maeExterno, setMaeExterno] = useState('');
  const [descricaoOrigem, setDescricaoOrigem] = useState('');
  const [casalId, setCasalId] = useState('');
  const [selectedVacs, setSelectedVacs] = useState<string[]>([]);

  // ── Steps ──
  const TOTAL_STEPS = 4;
  const [step, setStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Populate when editing ──
  useEffect(() => {
    if (!isAddBirdModalOpen) return;
    setStep(0);

    if (birdToEditId) {
      const b = birds.find(x => x.id === birdToEditId);
      if (b) {
        setAnilha(b.anilha); setNome(b.nome); setSexo(b.sexo); setRaca(b.raca);
        setBaia(b.baia); setStatus(b.status);
        setDataNasc(b.dataNascimento || ''); setPeso(b.peso || '');
        setPreviewImages(b.imagens || (b.imagem ? [b.imagem] : []));
        const orig = b.origem || 'Criatório';
        setNascidaAqui(orig !== 'Externo');
        setCasalId(b.casalId || '');
        setPaiId(b.isPaiExterno ? '' : b.paiId || '');
        setPaiExterno(b.isPaiExterno ? b.paiId || '' : '');
        setMaeId(b.isMaeExterno ? '' : b.maeId || '');
        setMaeExterno(b.isMaeExterno ? b.maeId || '' : '');
        setDescricaoOrigem('');

        // Parse vaccines checkboxes
        const parsedVacs = (b.vacinas || '').split(',').map(v => v.trim().toLowerCase());
        setSelectedVacs(['bouba', 'marek', 'newcastle', 'coriza'].filter(v => parsedVacs.includes(v)));
      }
    } else {
      setAnilha(''); setNome(''); setSexo('Macho');
      setRaca(preSelectedBreedForNewBird || breeds[0]?.nome || '');
      setBaia(''); setStatus('Reprodutor');
      setDataNasc(''); setPeso(''); setPreviewImages([]);
      setNascidaAqui(null); setCasalId(''); setPaiId(''); setPaiExterno('');
      setMaeId(''); setMaeExterno(''); setDescricaoOrigem('');
      setSelectedVacs([]);
    }
  }, [isAddBirdModalOpen, birdToEditId]);

  // ── Auto-fill parents when a couple is selected ──
  useEffect(() => {
    if (casalId) {
      const c = couples.find(x => x.id === casalId);
      if (c) { setPaiId(c.machoId); setMaeId(c.femeaId); }
    }
  }, [casalId]);

  if (!isAddBirdModalOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remainingSlots = 10 - previewImages.length;
      if (remainingSlots <= 0) {
        alert('Você já atingiu o limite máximo de 10 imagens.');
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      const compressed: string[] = [];

      for (const file of filesToUpload) {
        try {
          const comp = await compressImage(file, 1200, 1200, 0.82);
          compressed.push(comp);
        } catch (err) {
          console.error('Erro ao comprimir imagem:', err);
        }
      }

      setPreviewImages(prev => [...prev, ...compressed]);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleSave = () => {
    if (!anilha || !raca) return;

    const isPaiExterno = !paiId && !!paiExterno;
    const isMaeExterno = !maeId && !!maeExterno;

    const origem: 'Criatório' | 'Externo' | 'Cruzamento' = nascidaAqui === false ? 'Externo' : casalId ? 'Cruzamento' : 'Criatório';

    // Map checkboxes array back to comma-separated capitalized string
    const vacList = selectedVacs.map(v => v.charAt(0).toUpperCase() + v.slice(1));
    const finalVacinas = vacList.join(', ');

    const data = {
      anilha, nome, sexo, raca,
      baia: baia || 'ND',
      status, vacinas: finalVacinas, origem,
      casalId: casalId || undefined,
      isPaiExterno,
      paiId: isPaiExterno ? paiExterno : paiId,
      isMaeExterno,
      maeId: isMaeExterno ? maeExterno : maeId,
      dataNascimento: dataNasc, peso,
      imagem: previewImages[0] || undefined,
      imagens: previewImages,
      observacoes: descricaoOrigem || undefined,
    };

    if (birdToEditId) {
      editBird(birdToEditId, data);
    } else {
      const newId = Date.now().toString();
      addBird({ id: newId, ...data });

      // ── Auto-create virtual couple for genealogy if both parents registered ──
      if (paiId && maeId && !casalId) {
        const alreadyExists = couples.some(
          c => c.machoId === paiId && c.femeaId === maeId
        );
        if (!alreadyExists) {
          addCouple({
            id: `auto-${Date.now()}`,
            machoId: paiId,
            femeaId: maeId,
            objetivo: 'Genealogia (gerado automaticamente)',
            dataInicio: new Date().toISOString().split('T')[0],
            status: 'Ativo',
          });
        }
      }
    }

    closeModals();
  };

  // ─── Options ─────────────────────────────────────────────────────────────
  const statusOptions = [
    { label: 'Reprodutor', value: 'Reprodutor' },
    { label: 'Adulto', value: 'Adulto' },
    { label: 'Crescimento', value: 'Crescimento' },
    { label: 'Matriz', value: 'Matriz' },
    { label: 'Engorda', value: 'Engorda' },
  ];

  if (birdToEditId) {
    const b = birds.find(x => x.id === birdToEditId);
    if (b && (b.status === 'Vendido' || b.status === 'Faleceu')) {
      statusOptions.push({ label: b.status, value: b.status });
    }
  }

  const machoOptions = [
    { label: 'Desconhecido', value: '' },
    ...birds.filter(b => b.sexo === 'Macho' && b.status === 'Reprodutor' && b.id !== birdToEditId).map(b => ({ label: `${b.anilha}${b.nome ? ' – ' + b.nome : ''}`, value: b.id }))
  ];
  const femeaOptions = [
    { label: 'Desconhecida', value: '' },
    ...birds.filter(b => b.sexo === 'Fêmea' && b.status === 'Matriz' && b.id !== birdToEditId).map(b => ({ label: `${b.anilha}${b.nome ? ' – ' + b.nome : ''}`, value: b.id }))
  ];

  const canNext = step === 0
    ? !!anilha && !!raca
    : step === 1
    ? true
    : step === 2
    ? nascidaAqui !== null
    : true;

  // ─── Step content ─────────────────────────────────────────────────────────
  const renderStep = () => {
    // ── STEP 0: Nome, Raça, Anilha, Sexo, Foto ─────────────────────────────
    if (step === 0) return (
      <div className="space-y-4">
        {/* Nome */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Nome da Ave (opcional)</label>
          <input
            type="text" value={nome} onChange={e => setNome(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
            placeholder="Ex: Titan, Guerreiro..."
          />
        </div>

        {/* Raça */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Raça / Genética *</label>
          <select
            value={raca}
            onChange={e => setRaca(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors appearance-none"
          >
            {breeds.map(b => (
              <option key={b.id} value={b.nome}>{b.nome}</option>
            ))}
          </select>
        </div>

        {/* Anilha */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Anilha / ID *</label>
          <input
            type="text" value={anilha} onChange={e => setAnilha(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
            placeholder="Ex: BR-2024-001"
          />
        </div>

        {/* Sexo */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block">Sexo *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSexo('Macho')}
              className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold text-sm ${
                sexo === 'Macho'
                  ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                  : 'border-theme-border bg-theme-base text-theme-text-muted hover:border-theme-primary/50'
              }`}
            >
              <span>🐓</span> Macho
            </button>
            <button
              type="button"
              onClick={() => setSexo('Fêmea')}
              className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold text-sm ${
                sexo === 'Fêmea'
                  ? 'border-pink-500 bg-pink-500/10 text-white font-bold'
                  : 'border-theme-border bg-theme-base text-theme-text-muted hover:border-theme-primary/50'
              }`}
            >
              <span>🐔</span> Fêmea
            </button>
          </div>
        </div>

        {/* Foto */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block">
            Fotos da Ave (Mín. 1, Máx. 10)
          </label>
          <div className="grid grid-cols-5 gap-2">
            {previewImages.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-theme-border bg-theme-base group shadow-md">
                <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-theme-primary text-black text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow">Capa</span>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewImages(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow flex items-center justify-center"
                >
                  <X size={10} />
                </button>
                <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">{idx + 1}</span>
              </div>
            ))}
            {previewImages.length < 10 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-theme-border flex flex-col items-center justify-center text-theme-text-muted hover:border-theme-primary hover:text-theme-primary cursor-pointer bg-theme-base transition-colors"
              >
                <Camera size={20} className="mb-0.5" />
                <span className="text-[9px] font-bold uppercase text-center">Add Foto</span>
              </div>
            )}
          </div>
          <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
        </div>
      </div>
    );

    // ── STEP 1: Peso, Baia, Categoria ──────────────────────────────────────
    if (step === 1) return (
      <div className="space-y-4">
        {/* Peso */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Peso</label>
          <input
            type="text" value={peso} onChange={e => setPeso(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
            placeholder="Ex: 3.2 kg"
          />
        </div>

        {/* Baia */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Baia</label>
          <input
            type="text" value={baia} onChange={e => setBaia(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
            placeholder="Ex: B-04"
          />
        </div>

        {/* Categoria */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Categoria</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
          >
            {statusOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
    );

    // ── STEP 2: Pedigree (Nascido Aqui / Vindo de Fora) + Idade ─────────────
    if (step === 2) return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block">Pedigree (Origem)</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setNascidaAqui(true)}
              className={`p-4 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                nascidaAqui === true
                  ? 'border-theme-primary bg-theme-primary/10 text-white font-bold'
                  : 'border-theme-border bg-theme-base text-theme-text-muted hover:border-theme-primary/50'
              }`}
            >
              <span className="text-2xl">🥚</span>
              <span className="text-xs">Nascido Aqui</span>
            </button>
            <button
              type="button"
              onClick={() => setNascidaAqui(false)}
              className={`p-4 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                nascidaAqui === false
                  ? 'border-orange-500 bg-orange-500/10 text-white font-bold'
                  : 'border-theme-border bg-theme-base text-theme-text-muted hover:border-theme-primary/50'
              }`}
            >
              <span className="text-2xl">🚛</span>
              <span className="text-xs">Vindo de Fora</span>
            </button>
          </div>
        </div>

        {/* Nascido Aqui: dropdowns for father (reprodutor) and mother (matriz) */}
        {nascidaAqui === true && (
          <div className="space-y-4 animate-fade-in p-4 bg-theme-surface/50 border border-theme-border rounded-2xl">
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Pai (Reprodutores Cadastrados)</label>
              <select
                value={paiId}
                onChange={e => { setPaiId(e.target.value); setPaiExterno(''); }}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
              >
                {machoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Mãe (Matrizes Cadastradas)</label>
              <select
                value={maeId}
                onChange={e => { setMaeId(e.target.value); setMaeExterno(''); }}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
              >
                {femeaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Vindo de Fora: text inputs */}
        {nascidaAqui === false && (
          <div className="space-y-4 animate-fade-in p-4 bg-theme-surface/50 border border-theme-border rounded-2xl">
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Pai (Texto Livre)</label>
              <input
                type="text"
                value={paiExterno}
                onChange={e => { setPaiExterno(e.target.value); setPaiId(''); }}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                placeholder="Ex: Galo campeão importado"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Mãe (Texto Livre)</label>
              <input
                type="text"
                value={maeExterno}
                onChange={e => { setMaeExterno(e.target.value); setMaeId(''); }}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                placeholder="Ex: Matriz de fora"
              />
            </div>
          </div>
        )}

        {/* Idade picker in same step */}
        {nascidaAqui !== null && (
          <div className="space-y-1 pt-2">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Idade (Data de Nascimento)</label>
            <input
              type="date"
              value={dataNasc}
              onChange={e => setDataNasc(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none [color-scheme:dark]"
            />
            {dataNasc && (
              <p className="text-xs text-theme-primary font-bold mt-1">
                Idade calculada: {calculateExactAge(dataNasc)}
              </p>
            )}
          </div>
        )}
      </div>
    );

    // ── STEP 3: Vacinas (Bouba, Marek, Newcastle, Coriza) ──────────────────
    if (step === 3) {
      const vaccineOptions = [
        { id: 'bouba', label: 'Bouba Aviária' },
        { id: 'marek', label: 'Marek' },
        { id: 'newcastle', label: 'Newcastle' },
        { id: 'coriza', label: 'Coriza Infecciosa' }
      ];

      const toggleVaccine = (id: string) => {
        setSelectedVacs(prev =>
          prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
      };

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="font-bold text-white text-base">Vacinas e Imunizações</p>
            <p className="text-xs text-theme-text-muted">Selecione todas as vacinas aplicadas nesta ave:</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {vaccineOptions.map(v => {
              const checked = selectedVacs.includes(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleVaccine(v.id)}
                  className={`w-full p-4 rounded-xl border flex items-center justify-between text-left transition-all ${
                    checked
                      ? 'border-emerald-500 bg-emerald-500/10 text-white font-bold'
                      : 'border-theme-border bg-theme-base text-theme-text-muted hover:border-theme-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{checked ? '🛡️' : '💉'}</span>
                    <span>{v.label}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    checked ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-theme-border'
                  }`}>
                    {checked && <span className="text-[10px] font-black">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] md:max-h-[92vh] rounded-2xl">

        {/* Header */}
        <div className="px-5 pt-4 pb-2 border-b border-theme-border bg-theme-base/50 shrink-0">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-black text-lg text-white">
              {birdToEditId ? 'Editar Ave' : 'Nova Ave'}
            </h3>
            <button onClick={closeModals} className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-theme-text-muted mb-1">
            <span className={step >= 0 ? 'text-theme-primary font-bold' : ''}>Identificação</span>
            <ChevronRight size={12} />
            <span className={step >= 1 ? 'text-theme-primary font-bold' : ''}>Características</span>
            <ChevronRight size={12} />
            <span className={step >= 2 ? 'text-theme-primary font-bold' : ''}>Pedigree</span>
            <ChevronRight size={12} />
            <span className={step >= 3 ? 'text-theme-primary font-bold' : ''}>Vacinas</span>
          </div>
          <StepDots total={TOTAL_STEPS} current={step} />
        </div>

        {/* Body – fully scrollable */}
        <div className="flex-1 overflow-y-auto p-5 overscroll-contain">
          {renderStep()}
        </div>

        {/* Footer nav */}
        <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} /> Voltar
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={closeModals} className="px-4 py-2 text-sm text-theme-text-muted hover:text-white transition-colors">
                Cancelar
              </button>
              {birdToEditId && (
                <button
                  onClick={() => {
                    if (confirm('Deseja excluir permanentemente esta ave?')) {
                      removeBird(birdToEditId);
                      closeModals();
                    }
                  }}
                  className="px-4 py-2 text-sm font-bold text-red-500 hover:text-red-400 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={14} /> Excluir
                </button>
              )}
            </div>
          )}

          {step < TOTAL_STEPS - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
              className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próximo <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!anilha || !raca}
              className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle size={16} /> {birdToEditId ? 'Salvar Alterações' : 'Salvar Ave'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
