import { useState, useRef, useEffect } from 'react';
import { Camera, AlertTriangle, ShieldAlert, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { compressImage } from '../../lib/imageCompression';

// ─── Native select that doesn't bounce on mobile scroll ─────────────────────
function NativeSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors appearance-none"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

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
    isAddBirdModalOpen, closeModals, breeds, addBird, editBird,
    preSelectedBreedForNewBird, birds, birdToEditId, couples, addCouple
  } = useAppContext();

  // ── Form fields ──
  const [anilha, setAnilha] = useState('');
  const [nome, setNome] = useState('');
  const [sexo, setSexo] = useState('Macho');
  const [raca, setRaca] = useState('');
  const [baia, setBaia] = useState('');
  const [status, setStatus] = useState('Reprodutor');
  const [vacinas, setVacinas] = useState('');
  const [dataNasc, setDataNasc] = useState('');
  const [peso, setPeso] = useState('');
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  // ── Origin ──
  const [nascidaAqui, setNascidaAqui] = useState<boolean | null>(null); // null = not answered yet
  const [paiId, setPaiId] = useState('');
  const [maeId, setMaeId] = useState('');
  const [paiExterno, setPaiExterno] = useState('');
  const [maeExterno, setMaeExterno] = useState('');
  const [descricaoOrigem, setDescricaoOrigem] = useState('');
  const [casalId, setCasalId] = useState('');

  // ── Steps ──
  const TOTAL_STEPS = 3;
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
        setBaia(b.baia); setStatus(b.status); setVacinas(b.vacinas || '');
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
      }
    } else {
      setAnilha(''); setNome(''); setSexo('Macho');
      setRaca(preSelectedBreedForNewBird || breeds[0]?.nome || '');
      setBaia(''); setStatus('Adulto'); setVacinas('');
      setDataNasc(''); setPeso(''); setPreviewImages([]);
      setNascidaAqui(null); setCasalId(''); setPaiId(''); setPaiExterno('');
      setMaeId(''); setMaeExterno(''); setDescricaoOrigem('');
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
          const comp = await compressImage(file, 500, 500, 0.65);
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

    const data = {
      anilha, nome, sexo, raca,
      baia: baia || 'ND',
      status, vacinas, origem,
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
  const breedOptions = breeds.map(b => ({ label: b.nome, value: b.nome }));
  const sexOptions   = [{ label: 'Macho 🐓', value: 'Macho' }, { label: 'Fêmea 🐔', value: 'Fêmea' }];
  const statusOptions = [
    { label: 'Adulto', value: 'Adulto' },
    { label: 'Reprodutor', value: 'Reprodutor' },
    { label: 'Matriz', value: 'Matriz' },
    { label: 'Crescimento', value: 'Crescimento' },
    { label: 'Vendido', value: 'Vendido' },
    { label: 'Faleceu', value: 'Faleceu' },
  ];
  const machoOptions = [
    { label: 'Desconhecido', value: '' },
    ...birds.filter(b => b.sexo === 'Macho' && b.id !== birdToEditId).map(b => ({ label: `${b.anilha}${b.nome ? ' – ' + b.nome : ''}`, value: b.id }))
  ];
  const femeaOptions = [
    { label: 'Desconhecida', value: '' },
    ...birds.filter(b => b.sexo === 'Fêmea' && b.id !== birdToEditId).map(b => ({ label: `${b.anilha}${b.nome ? ' – ' + b.nome : ''}`, value: b.id }))
  ];
  const casalOptions = [
    { label: '— Nenhum casal cadastrado —', value: '' },
    ...couples.map(c => {
      const m = birds.find(b => b.id === c.machoId);
      const f = birds.find(b => b.id === c.femeaId);
      return { label: `🐓 ${m?.anilha || '?'} × 🐔 ${f?.anilha || '?'}`, value: c.id };
    })
  ];

  const canNext = step === 0
    ? !!anilha && !!raca
    : step === 1
    ? nascidaAqui !== null
    : true;

  // ─── Step content ─────────────────────────────────────────────────────────
  const renderStep = () => {
    // ── STEP 0: Basic info ─────────────────────────────────────────────────
    if (step === 0) return (
      <div className="space-y-5">
        {/* Anilha e Nome lado a lado */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Anilha / ID *</label>
            <input
              type="text" value={anilha} onChange={e => setAnilha(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
              placeholder="Ex: BR-2024-001"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Nome (opcional)</label>
            <input
              type="text" value={nome} onChange={e => setNome(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
              placeholder="Ex: Titan, Guerreiro..."
            />
          </div>
        </div>

        {/* Galeria de Fotos (até 10) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block">
            Fotos da Ave (Mín. 1, Máx. 10 — A 1ª é a Capa)
          </label>
          <div className="grid grid-cols-5 gap-2">
            {previewImages.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-theme-border bg-theme-base group shadow-md">
                <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                
                {/* Badge Capa */}
                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-theme-primary text-black text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow">
                    Capa
                  </span>
                )}
                
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => setPreviewImages(prev => prev.filter((_, i) => i !== idx))}
                  className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-90 transition-opacity shadow flex items-center justify-center"
                >
                  <X size={10} />
                </button>
                
                {/* Order Indicator */}
                <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                  {idx + 1}
                </span>
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
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NativeSelect label="Raça / Genética *" value={raca} onChange={setRaca}
            options={breedOptions.length ? breedOptions : [{ label: 'Sem raças cadastradas', value: '' }]} />
          <NativeSelect label="Sexo *" value={sexo} onChange={setSexo} options={sexOptions} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Baia</label>
            <input
              type="text" value={baia} onChange={e => setBaia(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
              placeholder="Ex: B-04"
            />
          </div>
          <NativeSelect label="Status" value={status} onChange={setStatus} options={statusOptions} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Nascimento</label>
            <input
              type="date" value={dataNasc} onChange={e => setDataNasc(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none [color-scheme:dark] transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Peso</label>
            <input
              type="text" value={peso} onChange={e => setPeso(e.target.value)}
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
              placeholder="Ex: 3.2 kg"
            />
          </div>
        </div>
      </div>
    );

    // ── STEP 1: Origin ─────────────────────────────────────────────────────
    if (step === 1) return (
      <div className="space-y-5">
        <div className="text-center space-y-1 pb-2">
          <p className="font-bold text-white text-lg">Esta ave nasceu aqui no criatório?</p>
          <p className="text-xs text-theme-text-muted">A resposta define o histórico genealógico e se precisa de quarentena</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setNascidaAqui(true)}
            className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
              nascidaAqui === true
                ? 'border-theme-primary bg-theme-primary/10 text-white'
                : 'border-theme-border bg-theme-base text-theme-text-muted hover:border-theme-primary/40'
            }`}
          >
            <span className="text-4xl">🥚</span>
            <span className="font-black text-sm">Sim, nasceu aqui</span>
            <span className="text-[10px] text-center opacity-70">Pintinho de ovo chocado ou lote próprio</span>
          </button>

          <button
            onClick={() => setNascidaAqui(false)}
            className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${
              nascidaAqui === false
                ? 'border-orange-500 bg-orange-500/10 text-white'
                : 'border-theme-border bg-theme-base text-theme-text-muted hover:border-orange-400/40'
            }`}
          >
            <span className="text-4xl">🚛</span>
            <span className="font-black text-sm">Não, veio de fora</span>
            <span className="text-[10px] text-center opacity-70">Comprada ou transferida de outro plantel</span>
          </button>
        </div>

        {/* Nascida aqui: mostrar lotes de pintos + pai/mãe */}
        {nascidaAqui === true && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Casal de Origem (se cadastrado)</label>
              <select
                value={casalId} onChange={e => setCasalId(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
              >
                {casalOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <p className="text-[10px] text-theme-text-muted">Ao selecionar o casal, o pai e a mãe são preenchidos automaticamente</p>
            </div>

            <div className="p-3 bg-theme-primary/5 border border-theme-primary/20 rounded-xl">
              <p className="text-xs font-bold text-theme-primary uppercase mb-3">Ou informe o pai e a mãe manualmente</p>
              <div className="grid grid-cols-1 gap-3">
                <NativeSelect
                  label="Pai (Macho)"
                  value={paiId}
                  onChange={v => { setPaiId(v); setPaiExterno(''); }}
                  options={machoOptions}
                />
                {!paiId && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">Pai Externo (nome livre)</label>
                    <input
                      type="text" value={paiExterno} onChange={e => setPaiExterno(e.target.value)}
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                      placeholder="Ex: Galo campeão importado"
                    />
                  </div>
                )}
                <NativeSelect
                  label="Mãe (Fêmea)"
                  value={maeId}
                  onChange={v => { setMaeId(v); setMaeExterno(''); }}
                  options={femeaOptions}
                />
                {!maeId && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">Mãe Externa (nome livre)</label>
                    <input
                      type="text" value={maeExterno} onChange={e => setMaeExterno(e.target.value)}
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                      placeholder="Ex: Matriz importada"
                    />
                  </div>
                )}
              </div>
            </div>

            {(paiId || paiExterno) && (maeId || maeExterno) && !casalId && (
              <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-xs">
                <CheckCircle size={16} className="shrink-0" />
                <span>O casal Pai × Mãe será vinculado automaticamente na árvore genealógica mesmo sem cadastro prévio.</span>
              </div>
            )}
          </div>
        )}

        {/* Veio de fora: quarentena + info de origem */}
        {nascidaAqui === false && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-start gap-3 p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
              <AlertTriangle className="text-orange-400 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-bold text-orange-300 text-sm mb-1">⚠️ Atenção: Quarentena Obrigatória</p>
                <p className="text-orange-200 text-xs leading-relaxed">
                  Aves vindas de fora devem ficar isoladas do plantel principal por <strong>30 a 40 dias</strong> antes de qualquer contato.
                  Isso evita a introdução de doenças como Marek, Newcastle e outras.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase">Nome do Pai (se souber)</label>
              <input type="text" value={paiExterno} onChange={e => setPaiExterno(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                placeholder="Ex: Galo campeão / desconhecido"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase">Nome da Mãe (se souber)</label>
              <input type="text" value={maeExterno} onChange={e => setMaeExterno(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                placeholder="Ex: Matriz importada / desconhecida"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-theme-text-muted uppercase">Descrição / Procedência</label>
              <textarea
                value={descricaoOrigem} onChange={e => setDescricaoOrigem(e.target.value)}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none resize-none h-24"
                placeholder="Ex: Adquirida da Granja São João, Minas Gerais. Linhagem Shamo japonesa."
              />
            </div>
          </div>
        )}
      </div>
    );

    // ── STEP 2: Health ─────────────────────────────────────────────────────
    if (step === 2) return (
      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Vacinas e Imunizações</label>
          <input
            type="text" value={vacinas} onChange={e => setVacinas(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
            placeholder="Ex: Marek, Bouba Aviária, Newcastle..."
          />
          <p className="text-[10px] text-theme-text-muted">Separe as vacinas por vírgula</p>
        </div>

        {!vacinas && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <ShieldAlert size={20} className="text-red-400 shrink-0" />
            <div>
              <p className="text-red-300 font-bold text-sm mb-0.5">Atenção: Saúde do Plantel</p>
              <p className="text-red-200 text-xs">Aves sem vacinas registradas representam risco biológico. Certifique-se de manter o calendário sanitário em dia.</p>
            </div>
          </div>
        )}

        {vacinas && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle size={16} className="text-green-400 shrink-0" />
            <p className="text-green-300 text-xs">Vacinas registradas. Parabéns pelo cuidado com a saúde do seu plantel!</p>
          </div>
        )}

        {/* Summary before saving */}
        <div className="mt-2 p-4 bg-theme-base rounded-xl border border-theme-border space-y-2">
          <p className="text-xs font-bold text-theme-text-muted uppercase mb-3">Resumo do Cadastro</p>
          <div className="flex justify-between text-sm"><span className="text-theme-text-muted">Anilha</span><span className="text-white font-bold">{anilha || '—'}</span></div>
          <div className="flex justify-between text-sm"><span className="text-theme-text-muted">Nome</span><span className="text-white font-bold">{nome || '—'}</span></div>
          <div className="flex justify-between text-sm"><span className="text-theme-text-muted">Raça</span><span className="text-white font-bold">{raca || '—'}</span></div>
          <div className="flex justify-between text-sm"><span className="text-theme-text-muted">Sexo</span><span className="text-white font-bold">{sexo}</span></div>
          <div className="flex justify-between text-sm"><span className="text-theme-text-muted">Baia</span><span className="text-white font-bold">{baia || 'ND'}</span></div>
          <div className="flex justify-between text-sm"><span className="text-theme-text-muted">Origem</span>
            <span className={`font-bold ${nascidaAqui === false ? 'text-orange-400' : 'text-green-400'}`}>
              {nascidaAqui === false ? 'Veio de fora (Quarentena)' : nascidaAqui === true ? 'Nascida aqui' : '—'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[95dvh] md:h-auto md:max-h-[92vh] rounded-t-2xl md:rounded-2xl">

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
            <span className={step >= 0 ? 'text-theme-primary font-bold' : ''}>Dados</span>
            <ChevronRight size={12} />
            <span className={step >= 1 ? 'text-theme-primary font-bold' : ''}>Origem</span>
            <ChevronRight size={12} />
            <span className={step >= 2 ? 'text-theme-primary font-bold' : ''}>Saúde</span>
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
            <button onClick={closeModals} className="px-4 py-2 text-sm text-theme-text-muted hover:text-white transition-colors">
              Cancelar
            </button>
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
