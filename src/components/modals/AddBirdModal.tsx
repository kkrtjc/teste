import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Camera, CheckCircle, X, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Home, Eye, Search, Bell, Clock, Calendar, Check, Plus } from 'lucide-react';
import { useAppContext, type BirdAlarm } from '../../lib/AppContext';
import { compressImage } from '../../lib/imageCompression';
import { calculateExactAge } from '../../lib/utils';
import { QuickBreedModal } from './QuickBreedModal';

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

// ─── Numeric input filter ─────────────────────────────────────────────────────
// Impede digitação de letras em campos que devem ser apenas numéricos
const onlyNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', '.', ','];
  if (allowed.includes(e.key)) return;
  if (e.ctrlKey || e.metaKey) return; // permite Ctrl+A, Ctrl+C, Ctrl+V
  if (!/^\d$/.test(e.key)) e.preventDefault();
};

const sanitizeNumeric = (val: string) => val.replace(/[^0-9.,]/g, '');

// ─── Mini-overlay: detalhes da ave duplicada ──────────────────────────────────
function BirdDetailOverlay({
  bird,
  onClose,
}: {
  bird: ReturnType<typeof useAppContext>['birds'][number];
  onClose: () => void;
}) {
  return (
    <div 
      className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 animate-fade-in rounded-2xl"
      onClick={onClose}
      onTouchMove={e => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div 
        className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-[90%] max-w-sm overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border bg-theme-base/60">
          <p className="font-black text-white text-sm flex items-center gap-2">
            <Eye size={14} className="text-theme-primary" />
            Detalhes da Ave
          </p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-white hover:bg-white/15 transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto modal-scrollable-content touch-pan-y">
          {/* Foto + info principal */}
          <div className="flex items-center gap-3">
            {(bird.imagem || bird.imagens?.[0]) ? (
              <img
                src={bird.imagem || bird.imagens?.[0]}
                alt={bird.anilha}
                className="w-16 h-16 rounded-xl object-cover border border-theme-border shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-theme-base border border-theme-border flex items-center justify-center shrink-0">
                <span className="text-2xl">{bird.sexo === 'Macho' ? '🐓' : '🐔'}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-black text-white text-base truncate">{bird.nome || `Anilha ${bird.anilha}`}</p>
              <p className="text-xs text-theme-text-muted">Anilha: <span className="text-theme-primary font-bold">{bird.anilha}</span></p>
              <p className="text-xs text-theme-text-muted">{bird.sexo} · {bird.raca || 'Sem raça'}</p>
            </div>
          </div>

          {/* Detalhes em grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Status', value: bird.status },
              { label: 'Baia', value: bird.baia || '—' },
              { label: 'Peso', value: bird.peso || '—' },
              { label: 'Origem', value: bird.origem || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-theme-base rounded-xl px-3 py-2 border border-theme-border/50">
                <p className="text-[10px] text-theme-text-muted uppercase font-bold">{label}</p>
                <p className="text-xs font-bold text-white truncate">{value}</p>
              </div>
            ))}
          </div>

          {bird.dataNascimento && (
            <div className="bg-theme-base rounded-xl px-3 py-2 border border-theme-border/50">
              <p className="text-[10px] text-theme-text-muted uppercase font-bold">Idade</p>
              <p className="text-xs font-bold text-theme-primary">{calculateExactAge(bird.dataNascimento)}</p>
            </div>
          )}

          {bird.observacoes && (
            <div className="bg-theme-base rounded-xl px-3 py-2 border border-theme-border/50">
              <p className="text-[10px] text-theme-text-muted uppercase font-bold">Observações</p>
              <p className="text-xs text-white line-clamp-2">{bird.observacoes}</p>
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-theme-primary text-black text-sm font-black transition-all active:scale-95"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lista de aves da baia ────────────────────────────────────────────────────
function BaiaDetailOverlay({
  baia,
  avesNaBaia,
  onClose,
}: {
  baia: string;
  avesNaBaia: ReturnType<typeof useAppContext>['birds'];
  onClose: () => void;
}) {
  return (
    <div 
      className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 animate-fade-in rounded-2xl"
      onClick={onClose}
      onTouchMove={e => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div 
        className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-[90%] max-w-sm overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border bg-theme-base/60">
          <p className="font-black text-white text-sm flex items-center gap-2">
            <Home size={14} className="text-amber-400" />
            Baia {baia} — {avesNaBaia.length} ave(s)
          </p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-64 overflow-y-auto modal-scrollable-content touch-pan-y">
          {avesNaBaia.map(b => (
            <div key={b.id} className="flex items-center gap-3 bg-theme-base rounded-xl px-3 py-2.5 border border-theme-border/50">
              {(b.imagem || b.imagens?.[0]) ? (
                <img src={b.imagem || b.imagens?.[0]} alt={b.anilha} className="w-10 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-theme-surface border border-theme-border flex items-center justify-center shrink-0">
                  <span className="text-lg">{b.sexo === 'Macho' ? '🐓' : '🐔'}</span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{b.nome || `Anilha ${b.anilha}`}</p>
                <p className="text-[10px] text-theme-text-muted">{b.sexo} · {b.status} · {b.raca || 'Sem raça'}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 pb-4 pt-2">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-theme-primary text-black text-sm font-black transition-all active:scale-95">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function AddBirdModal() {
  const {
    isAddBirdModalOpen, closeModals, breeds, addBird, editBird, removeBird,
    preSelectedBreedForNewBird, birds, birdToEditId, couples, addCouple, openBirdProfile, showToast
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
  const [valorEstimado, setValorEstimado] = useState('');
  const [previewImages, setPreviewImages] = useState<string[]>([]);

  // ── Origin ──
  const [nascidaAqui, setNascidaAqui] = useState<boolean | null>(null);
  const [paiId, setPaiId] = useState('');
  const [maeId, setMaeId] = useState('');
  const [filtroPai, setFiltroPai] = useState('');
  const [filtroMae, setFiltroMae] = useState('');
  const [paiExterno, setPaiExterno] = useState('');
  const [maeExterno, setMaeExterno] = useState('');
  const [descricaoOrigem, setDescricaoOrigem] = useState('');
  const [casalId, setCasalId] = useState('');
  const [selectedVacs, setSelectedVacs] = useState<string[]>([]);
  const [outrasVacinas, setOutrasVacinas] = useState('');

  // ── Alarms ──
  const [birdAlarms, setBirdAlarms] = useState<BirdAlarm[]>([]);
  const [alarmTexto, setAlarmTexto] = useState('');
  const [alarmHora, setAlarmHora] = useState('08:00');
  const [alarmDays, setAlarmDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]);

  // ── Steps ──
  const TOTAL_STEPS = 5;
  const [step, setStep] = useState(0);

  // ── Duplicate / Overlap state ──
  const [detailBird, setDetailBird] = useState<typeof birds[number] | null>(null);
  const [showBaiaDetail, setShowBaiaDetail] = useState(false);
  const [showQuickBreedModal, setShowQuickBreedModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Lock body scroll while modal is open ──
  useEffect(() => {
    document.body.classList.add('modal-open-lock');
    return () => {
      document.body.classList.remove('modal-open-lock');
    };
  }, []);

  // ── Populate when editing ──
  useEffect(() => {
    if (!isAddBirdModalOpen) return;
    setStep(0);
    setDetailBird(null);
    setShowBaiaDetail(false);

    if (birdToEditId) {
      const b = birds.find(x => x.id === birdToEditId);
      if (b) {
        setAnilha(b.anilha); setNome(b.nome); setSexo(b.sexo); setRaca(b.raca);
        setBaia(b.baia); setStatus(b.status);
        setDataNasc(b.dataNascimento || ''); setPeso(b.peso || '');
        setValorEstimado(b.valorEstimado !== undefined ? String(b.valorEstimado) : '');
        setPreviewImages((b.imagens || (b.imagem ? [b.imagem] : [])).slice(0, 3));
        const orig = b.origem || 'Criatório';
        setNascidaAqui(orig !== 'Externo');
        setCasalId(b.casalId || '');
        setPaiId(b.isPaiExterno ? '' : b.paiId || '');
        setPaiExterno(b.isPaiExterno ? b.paiId || '' : '');
        setMaeId(b.isMaeExterno ? '' : b.maeId || '');
        setMaeExterno(b.isMaeExterno ? b.maeId || '' : '');
        setDescricaoOrigem('');
        
        const rawVacs = (b.vacinas || '').split(',').map(v => v.trim());
        const knownList = ['bouba', 'marek', 'newcastle', 'coriza'];
        const matchedKnown = rawVacs.filter(v => knownList.includes(v.toLowerCase())).map(v => v.toLowerCase());
        const customVacs = rawVacs.filter(v => !knownList.includes(v.toLowerCase())).join(', ');

        setSelectedVacs(matchedKnown);
        setOutrasVacinas(customVacs);
        setBirdAlarms(b.alarmes || []);
        setAlarmTexto('');
        setAlarmHora('08:00');
        setAlarmDays([1, 2, 3, 4, 5, 6, 0]);
      }
    } else {
      setAnilha(''); setNome(''); setSexo('Macho');
      setRaca(preSelectedBreedForNewBird || breeds[0]?.nome || '');
      setBaia(''); setStatus('Reprodutor');
      setDataNasc(''); setPeso(''); setValorEstimado(''); setPreviewImages([]);
      setNascidaAqui(null); setCasalId(''); setPaiId(''); setPaiExterno('');
      setMaeId(''); setMaeExterno(''); setDescricaoOrigem('');
      setSelectedVacs([]);
      setOutrasVacinas('');
      setBirdAlarms([]);
      setAlarmTexto('');
      setAlarmHora('08:00');
      setAlarmDays([1, 2, 3, 4, 5, 6, 0]);
    }
  }, [isAddBirdModalOpen, birdToEditId]);

  // ── Auto-fill parents when a couple is selected ──
  useEffect(() => {
    if (casalId) {
      const c = couples.find(x => x.id === casalId);
      if (c) { setPaiId(c.machoId); setMaeId(c.femeaId); }
    }
  }, [casalId]);

  // ── Duplicate detection (memoized) ──
  const otherBirds = useMemo(
    () => birds.filter(b => b.id !== birdToEditId),
    [birds, birdToEditId]
  );

  const duplicateAnilha = useMemo(() => {
    if (!anilha.trim()) return null;
    return otherBirds.find(b => b.anilha.trim().toLowerCase() === anilha.trim().toLowerCase()) || null;
  }, [anilha, otherBirds]);

  const duplicateNome = useMemo(() => {
    if (!nome.trim()) return null;
    return otherBirds.find(b => b.nome && b.nome.trim().toLowerCase() === nome.trim().toLowerCase()) || null;
  }, [nome, otherBirds]);

  const avesNaBaia = useMemo(() => {
    if (!baia.trim()) return [];
    return otherBirds.filter(b => b.baia && b.baia.trim().toLowerCase() === baia.trim().toLowerCase());
  }, [baia, otherBirds]);

  if (!isAddBirdModalOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const remainingSlots = 3 - previewImages.length;
      if (remainingSlots <= 0) {
        showToast('Você já atingiu o limite máximo de 3 fotos por ave.', 'warning');
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);

      // Comprime imagens com dimensão otimizada para sincronização rápida em redes móveis (3G/4G)
      const results = await Promise.allSettled(
        filesToUpload.map(file => compressImage(file, 800, 800, 0.72))
      );
      const compressed: string[] = results
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map(r => r.value);

      setPreviewImages(prev => [...prev, ...compressed].slice(0, 3));
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleSave = () => {
    try {
      if (!anilha.trim() || !raca.trim()) return;

      const isPaiExternoVal = !paiId && !!paiExterno;
      const isMaeExternoVal = !maeId && !!maeExterno;
      const cleanPaiId = isPaiExternoVal ? paiExterno.trim() : paiId.trim();
      const cleanMaeId = isMaeExternoVal ? maeExterno.trim() : maeId.trim();

      const origem: 'Criatório' | 'Externo' | 'Cruzamento' = nascidaAqui === false ? 'Externo' : casalId ? 'Cruzamento' : 'Criatório';

      const vacList = selectedVacs.map(v => v.charAt(0).toUpperCase() + v.slice(1));
      if (outrasVacinas.trim()) {
        vacList.push(outrasVacinas.trim());
      }
      const finalVacinas = vacList.join(', ');

      const imagesToSave = previewImages.slice(0, 3);

      const data = {
        anilha: anilha.trim(),
        nome: nome.trim(),
        sexo,
        raca: raca.trim(),
        baia: baia.trim() || 'ND',
        status,
        vacinas: finalVacinas,
        origem,
        casalId: casalId || undefined,
        isPaiExterno: isPaiExternoVal,
        paiId: cleanPaiId || undefined,
        isMaeExterno: isMaeExternoVal,
        maeId: cleanMaeId || undefined,
        dataNascimento: dataNasc || undefined,
        peso: peso || undefined,
        valorEstimado: valorEstimado ? parseFloat(valorEstimado.replace(',', '.')) : undefined,
        imagem: imagesToSave[0] || undefined,
        imagens: imagesToSave,
        observacoes: descricaoOrigem || undefined,
        alarmes: birdAlarms
      };

      let targetId = birdToEditId;

      if (birdToEditId) {
        editBird(birdToEditId, data);
        showToast("Ave salva com sucesso!", "success");
      } else {
        targetId = Date.now().toString();
        addBird({ id: targetId, ...data });
        showToast("Ave salva com sucesso!", "success");

        // Auto-cria casal virtual para genealogia se ambos os pais forem cadastrados
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

      if (targetId) {
        openBirdProfile(targetId);
      }
    } catch (err) {
      console.error("Erro ao salvar ave:", err);
      showToast('Ocorreu um erro ao salvar a ave. Por favor, tente novamente.', 'error');
    }
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
    { label: 'Desconhecido / Não informado', value: '' },
    ...birds
      .filter(b => b.sexo === 'Macho' && b.status !== 'Vendido' && b.status !== 'Faleceu' && b.id !== birdToEditId)
      .map(b => ({
        label: `Anilha ${b.anilha}${b.nome ? ' – ' + b.nome : ''} (${b.raca || 'Sem raça'} · ${b.status})`,
        value: b.id
      }))
  ];

  const filteredMachoOptions = useMemo(() => {
    if (!filtroPai.trim()) return machoOptions;
    const q = filtroPai.trim().toLowerCase();
    return machoOptions.filter(o => !o.value || o.label.toLowerCase().includes(q) || o.value === paiId);
  }, [machoOptions, filtroPai, paiId]);

  const femeaOptions = [
    { label: 'Desconhecida / Não informada', value: '' },
    ...birds
      .filter(b => b.sexo === 'Fêmea' && b.status !== 'Vendido' && b.status !== 'Faleceu' && b.id !== birdToEditId)
      .map(b => ({
        label: `Anilha ${b.anilha}${b.nome ? ' – ' + b.nome : ''} (${b.raca || 'Sem raça'} · ${b.status})`,
        value: b.id
      }))
  ];

  const filteredFemeaOptions = useMemo(() => {
    if (!filtroMae.trim()) return femeaOptions;
    const q = filtroMae.trim().toLowerCase();
    return femeaOptions.filter(o => !o.value || o.label.toLowerCase().includes(q) || o.value === maeId);
  }, [femeaOptions, filtroMae, maeId]);

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
          {/* Aviso nome duplicado */}
          {duplicateNome && (
            <div className="flex items-center justify-between gap-2 mt-1 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                <span className="text-[11px] text-amber-300 truncate">
                  Já existe: <strong>{duplicateNome.anilha}</strong> ({duplicateNome.sexo} · {duplicateNome.status})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailBird(duplicateNome)}
                className="text-[11px] font-black text-amber-400 hover:text-amber-200 whitespace-nowrap underline underline-offset-2"
              >
                Ver Detalhes
              </button>
            </div>
          )}
        </div>

        {/* Raça */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Raça / Genética *</label>
            <button
              type="button"
              onClick={() => setShowQuickBreedModal(true)}
              className="text-[11px] text-theme-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              + Nova Raça
            </button>
          </div>
          <select
            value={raca}
            onChange={e => setRaca(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors appearance-none"
          >
            <option value="">-- Selecionar Raça --</option>
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
            className={`w-full bg-theme-base border rounded-xl p-3 text-sm text-white focus:outline-none transition-colors ${
              duplicateAnilha ? 'border-red-500 focus:border-red-400' : 'border-theme-border focus:border-theme-primary'
            }`}
            placeholder="Ex: BR-2024-001"
          />
          {/* Aviso anilha duplicada */}
          {duplicateAnilha && (
            <div className="flex items-center justify-between gap-2 mt-1 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={13} className="text-red-400 shrink-0" />
                <span className="text-[11px] text-red-300 truncate">
                  Anilha já cadastrada: <strong>{duplicateAnilha.nome || duplicateAnilha.anilha}</strong> ({duplicateAnilha.sexo} · {duplicateAnilha.status})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailBird(duplicateAnilha)}
                className="text-[11px] font-black text-red-400 hover:text-red-200 whitespace-nowrap underline underline-offset-2"
              >
                Ver Detalhes
              </button>
            </div>
          )}
        </div>

        {/* Sexo */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block">Sexo *</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setSexo('Macho');
                if (status === 'Matriz' || !status) setStatus('Reprodutor');
              }}
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
              onClick={() => {
                setSexo('Fêmea');
                if (status === 'Reprodutor' || !status) setStatus('Matriz');
              }}
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

        {/* Data de Nascimento / Idade */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
              Data de Nascimento / Idade
            </label>
            <span className="text-[10px] text-theme-primary font-bold bg-theme-primary/10 px-2 py-0.5 rounded-full border border-theme-primary/20">
              Cálculo de idade & relatórios
            </span>
          </div>
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

        {/* Foto */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block">
              Fotos da Ave (Máx. 3 fotos)
            </label>
            <span className="text-[10px] text-theme-primary font-bold">{previewImages.length}/3 fotos</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
            {previewImages.length < 3 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-theme-border flex flex-col items-center justify-center text-theme-text-muted hover:border-theme-primary hover:text-theme-primary cursor-pointer bg-theme-base transition-colors"
              >
                <Camera size={20} className="mb-0.5" />
                <span className="text-[9px] font-bold uppercase text-center">Add Foto ({previewImages.length}/3)</span>
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
        {/* Peso — somente numérico */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
            Peso <span className="text-theme-text-muted/60 normal-case font-normal">(kg ou g)</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={peso}
            onChange={e => setPeso(sanitizeNumeric(e.target.value))}
            onKeyDown={onlyNumericKeyDown}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
            placeholder="Ex: 3.2"
          />
          <p className="text-[10px] text-theme-text-muted">Apenas números. Use ponto ou vírgula para decimais.</p>
        </div>

        {/* Baia */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Baia</label>
          <input
            type="text" value={baia} onChange={e => setBaia(e.target.value)}
            className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
            placeholder="Ex: B-04"
          />
          {/* Aviso baia ocupada */}
          {avesNaBaia.length > 0 && (
            <div className="flex items-center justify-between gap-2 mt-1 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                <Home size={13} className="text-blue-400 shrink-0" />
                <span className="text-[11px] text-blue-300 truncate">
                  Baia <strong>{baia}</strong> já tem {avesNaBaia.length} ave(s)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowBaiaDetail(true)}
                className="text-[11px] font-black text-blue-400 hover:text-blue-200 whitespace-nowrap underline underline-offset-2"
              >
                Ver Aves
              </button>
            </div>
          )}
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

        {/* Valor Estimado / Preço */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center justify-between">
            <span>Valor Estimado / Preço (R$)</span>
            <span className="text-[10px] text-theme-text-muted/60 normal-case font-normal">(Opcional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={valorEstimado}
              onChange={e => setValorEstimado(e.target.value.replace(/[^0-9.,]/g, ''))}
              onKeyDown={onlyNumericKeyDown}
              className="w-full bg-theme-base border border-theme-border rounded-xl py-3 pl-10 pr-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
              placeholder="0,00"
            />
          </div>
          <p className="text-[10px] text-theme-text-muted">Valor sugerido de venda ou avaliação do animal no plantel</p>
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

        {/* Nascido Aqui: dropdowns com busca rápida para pai e mãe */}
        {nascidaAqui === true && (
          <div className="space-y-4 animate-fade-in p-4 bg-theme-surface/50 border border-theme-border rounded-2xl">
            {/* Seletor do Pai com busca rápida */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  Pai (Reprodutor Cadastrado)
                </label>
                {paiId && (
                  <button
                    type="button"
                    onClick={() => { setPaiId(''); setFiltroPai(''); }}
                    className="text-[10px] text-red-400 hover:underline font-bold cursor-pointer"
                  >
                    Desmarcar
                  </button>
                )}
              </div>

              {/* Barra de busca rápida para filtrar opções */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={13} />
                <input
                  type="text"
                  placeholder="Pesquisar reprodutor por anilha ou nome..."
                  value={filtroPai}
                  onChange={e => setFiltroPai(e.target.value)}
                  className="w-full bg-theme-base/60 border border-theme-border/60 text-white pl-8 pr-7 py-1.5 rounded-xl text-xs focus:border-theme-primary outline-none placeholder-theme-text-muted/60 shadow-inner"
                />
                {filtroPai && (
                  <button
                    type="button"
                    onClick={() => setFiltroPai('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white p-0.5"
                    title="Limpar filtro"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <select
                value={paiId}
                onChange={e => { setPaiId(e.target.value); setPaiExterno(''); }}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
              >
                {filteredMachoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Seletor da Mãe com busca rápida */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">
                  Mãe (Matriz Cadastrada)
                </label>
                {maeId && (
                  <button
                    type="button"
                    onClick={() => { setMaeId(''); setFiltroMae(''); }}
                    className="text-[10px] text-red-400 hover:underline font-bold cursor-pointer"
                  >
                    Desmarcar
                  </button>
                )}
              </div>

              {/* Barra de busca rápida para filtrar opções */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={13} />
                <input
                  type="text"
                  placeholder="Pesquisar matriz por anilha ou nome..."
                  value={filtroMae}
                  onChange={e => setFiltroMae(e.target.value)}
                  className="w-full bg-theme-base/60 border border-theme-border/60 text-white pl-8 pr-7 py-1.5 rounded-xl text-xs focus:border-theme-primary outline-none placeholder-theme-text-muted/60 shadow-inner"
                />
                {filtroMae && (
                  <button
                    type="button"
                    onClick={() => setFiltroMae('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white p-0.5"
                    title="Limpar filtro"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <select
                value={maeId}
                onChange={e => { setMaeId(e.target.value); setMaeExterno(''); }}
                className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
              >
                {filteredFemeaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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

        {/* Idade picker */}
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
      </div>
    );

    // ── STEP 3: Vacinas ──────────────────────────────────────────────────────
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

          {/* Campo para escrever vacinas não listadas */}
          <div className="space-y-1.5 pt-3 border-t border-theme-border/60">
            <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider block">
              Outras Vacinas / Imunizações Personalizadas
            </label>
            <input 
              type="text"
              value={outrasVacinas}
              onChange={e => setOutrasVacinas(e.target.value)}
              placeholder="Digite outras vacinas aplicadas (ex: Gumboro, Coriza B, Avian...)"
              className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-xs text-white placeholder-theme-text-muted outline-none focus:border-theme-primary transition-colors font-medium"
            />
            <p className="text-[10px] text-theme-text-muted">Escreva o nome de vacinas adicionais aplicadas a esta ave que não estão na lista acima.</p>
          </div>
        </div>
      );
    }

    // ── STEP 4: Alarmes & Lembretes da Ave ──────────────────────────────────
    if (step === 4) {
      const DIAS_DA_SEMANA_ADD = [
        { id: 1, label: 'Seg', full: 'Segunda-feira' },
        { id: 2, label: 'Ter', full: 'Terça-feira' },
        { id: 3, label: 'Qua', full: 'Quarta-feira' },
        { id: 4, label: 'Qui', full: 'Quinta-feira' },
        { id: 5, label: 'Sex', full: 'Sexta-feira' },
        { id: 6, label: 'Sáb', full: 'Sábado' },
        { id: 0, label: 'Dom', full: 'Domingo' }
      ];

      const isAllDays = alarmDays.length === 7;
      const todayDayOfWeek = new Date().getDay();

      const handleToggleAll = () => {
        if (isAllDays) {
          setAlarmDays([]);
        } else {
          setAlarmDays([1, 2, 3, 4, 5, 6, 0]);
        }
      };

      const handleToggleDayItem = (dayId: number) => {
        setAlarmDays(prev => prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]);
      };

      const handleAddAlarmItem = () => {
        if (!alarmTexto.trim()) {
          showToast('Digite a observação do alarme.', 'warning');
          return;
        }
        if (alarmDays.length === 0) {
          showToast('Selecione ao menos um dia da semana para o alarme.', 'warning');
          return;
        }
        const newAlarm: BirdAlarm = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          texto: alarmTexto.trim(),
          hora: alarmHora || '08:00',
          diasSemana: [...alarmDays].sort((a, b) => a - b),
          ativo: true,
          criadoEm: new Date().toISOString()
        };
        setBirdAlarms(prev => [...prev, newAlarm]);
        setAlarmTexto('');
        showToast('Alarme adicionado à ave!', 'success');
      };

      const handleRemoveAlarmItem = (id: string) => {
        setBirdAlarms(prev => prev.filter(a => a.id !== id));
      };

      const handleToggleAlarmActiveItem = (id: string) => {
        setBirdAlarms(prev => prev.map(a => a.id === id ? { ...a, ativo: !a.ativo } : a));
      };

      return (
        <div className="space-y-4">
          <div className="space-y-1">
            <p className="font-bold text-white text-base flex items-center gap-2">
              <Bell size={18} className="text-amber-400" />
              Alarmes &amp; Lembretes da Ave
            </p>
            <p className="text-xs text-theme-text-muted">
              Programe lembretes para medicação, pesagem, vacinação ou manejo desta ave (opcional).
            </p>
          </div>

          {/* Form novo alarme */}
          <div className="bg-theme-base/80 border border-theme-border rounded-2xl p-4 space-y-3 shadow-inner">
            <p className="text-xs font-black text-white flex items-center gap-1.5">
              <Plus size={14} className="text-theme-primary" />
              Configurar Alarme
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock size={12} className="text-amber-400" /> Horário
                </label>
                <input
                  type="time"
                  value={alarmHora}
                  onChange={e => setAlarmHora(e.target.value)}
                  className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-2 text-sm text-white font-bold focus:border-theme-primary outline-none [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-theme-primary" /> Frequência
                </label>
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isAllDays
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-black'
                      : 'bg-theme-surface border-theme-border text-theme-text-muted hover:text-white'
                  }`}
                >
                  <Check size={13} className={isAllDays ? 'opacity-100 text-amber-400' : 'opacity-0'} />
                  De Segunda a Segunda
                </button>
              </div>
            </div>

            {/* Chips dos dias */}
            <div>
              <label className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                Dias da Semana Selecionados:
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {DIAS_DA_SEMANA_ADD.map(d => {
                  const isSelected = alarmDays.includes(d.id);
                  const isToday = todayDayOfWeek === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleToggleDayItem(d.id)}
                      title={d.full}
                      className={`py-2 text-center rounded-xl text-xs font-black transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-theme-primary text-black shadow-md shadow-amber-500/20'
                          : 'bg-theme-surface hover:bg-white/5 border border-theme-border/60 text-theme-text-muted hover:text-white'
                      }`}
                    >
                      {d.label}
                      {isToday && (
                        <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-theme-surface ${isSelected ? 'bg-black' : 'bg-amber-400'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observação */}
            <div>
              <label className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1 block">
                Observação do Alarme *
              </label>
              <input
                type="text"
                value={alarmTexto}
                onChange={e => setAlarmTexto(e.target.value)}
                placeholder="Ex: Aplicar vermífugo / Pesar ave / Separar para acasalamento..."
                className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-theme-text-muted/60 focus:border-theme-primary outline-none transition-colors"
              />
              <p className="text-[10px] text-theme-text-muted mt-1">
                Esta mensagem aparecerá em destaque quando o alarme soar no dia e horário programados.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddAlarmItem}
              className="w-full py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Adicionar Alarme à Ave
            </button>
          </div>

          {/* Lista de alarmes já adicionados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Bell size={13} className="text-theme-primary" />
                Alarmes Cadastrados ({birdAlarms.length})
              </p>
            </div>

            {birdAlarms.length === 0 ? (
              <div className="text-center py-4 px-3 bg-theme-base/30 border border-theme-border/40 rounded-xl border-dashed">
                <p className="text-xs text-theme-text-muted">Nenhum alarme adicionado ainda.</p>
                <p className="text-[10px] text-theme-text-muted/60 mt-0.5">Se não precisar de lembretes para esta ave, basta clicar em Salvar Ave abaixo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {birdAlarms.map(a => {
                  const isScheduledToday = a.ativo && a.diasSemana.includes(todayDayOfWeek);
                  return (
                    <div
                      key={a.id}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                        !a.ativo
                          ? 'bg-theme-base/40 border-theme-border/40 opacity-60'
                          : isScheduledToday
                          ? 'bg-amber-500/10 border-amber-500/50'
                          : 'bg-theme-base border-theme-border/70'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleAlarmActiveItem(a.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 mt-0.5 ${
                            a.ativo
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-theme-surface text-theme-text-muted border-theme-border'
                          }`}
                        >
                          <Bell size={13} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-xs font-black break-words ${a.ativo ? 'text-white' : 'text-theme-text-muted line-through'}`}>
                              {a.texto}
                            </p>
                            {isScheduledToday && (
                              <span className="text-[9px] font-black uppercase bg-amber-500 text-black px-1.5 py-0.2 rounded shrink-0 animate-pulse">
                                Ativo Hoje
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-theme-text-muted">
                            {a.hora && (
                              <span className="font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <Clock size={10} /> {a.hora}
                              </span>
                            )}
                            <span>
                              {a.diasSemana.length === 7
                                ? 'De Segunda a Segunda'
                                : a.diasSemana.map(id => DIAS_DA_SEMANA_ADD.find(d => d.id === id)?.label).join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAlarmItem(a.id)}
                        className="text-theme-text-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                        title="Remover alarme"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  const handleCardTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-hidden animate-fade-in" 
      onClick={closeModals}
      onTouchMove={e => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      {/* Container relativo para os overlays internos (travado contra rolagem horizontal/vertical da janela) */}
      <div 
        className="relative bg-theme-surface border border-theme-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh] gpu-accelerated animate-scale-up" 
        onClick={e => e.stopPropagation()}
        onTouchMove={handleCardTouchMove}
      >

        {/* ── Mini-overlay: detalhe de ave duplicada ── */}
        {detailBird && (
          <BirdDetailOverlay bird={detailBird} onClose={() => setDetailBird(null)} />
        )}

        {/* ── Mini-overlay: aves na baia ── */}
        {showBaiaDetail && avesNaBaia.length > 0 && (
          <BaiaDetailOverlay baia={baia} avesNaBaia={avesNaBaia} onClose={() => setShowBaiaDetail(false)} />
        )}

        {/* Header */}
        <div className="px-5 pt-4 pb-2 border-b border-theme-border bg-theme-base/50 shrink-0 select-none">
          <div className="flex justify-between items-center mb-1">
            <h3 className="font-black text-lg text-white">
              {birdToEditId ? 'Editar Ave' : 'Nova Ave'}
            </h3>
            <button onClick={closeModals} className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-theme-text-muted mb-1 overflow-x-auto hide-scrollbar py-0.5">
            <span className={step >= 0 ? 'text-theme-primary font-bold' : ''}>Identificação</span>
            <ChevronRight size={12} className="shrink-0" />
            <span className={step >= 1 ? 'text-theme-primary font-bold' : ''}>Características</span>
            <ChevronRight size={12} className="shrink-0" />
            <span className={step >= 2 ? 'text-theme-primary font-bold' : ''}>Pedigree</span>
            <ChevronRight size={12} className="shrink-0" />
            <span className={step >= 3 ? 'text-theme-primary font-bold' : ''}>Vacinas</span>
            <ChevronRight size={12} className="shrink-0" />
            <span className={step >= 4 ? 'text-theme-primary font-bold' : ''}>Alarmes</span>
          </div>
          <StepDots total={TOTAL_STEPS} current={step} />
        </div>

        {/* Body – fully scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto smooth-scroll p-5 overscroll-contain modal-scrollable-content touch-pan-y">
          {renderStep()}
        </div>

        {/* Footer nav */}
        <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0 touch-none select-none">
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
      <QuickBreedModal
        isOpen={showQuickBreedModal}
        onClose={() => setShowQuickBreedModal(false)}
        onBreedSaved={(newBreed) => setRaca(newBreed.nome)}
      />
    </div>,
    document.body
  );
}
