import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Camera, GitBranch, Activity, Info, Edit2, Syringe, 
  ChevronLeft, ChevronRight, Trash2, Plus, Search, Check, 
  AlertCircle, UserPlus, X
} from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { calculateExactAge } from '../../lib/utils';
import { calculateInbreedingCoefficient, findRelatedBirds } from '../../lib/genealogy';

function PedigreeTreeNode({
  label,
  bird,
  isExternal,
  externalName,
  genderHint,
  badgeText,
  onSelect,
  onLinkClick,
}: {
  label: string;
  bird?: any;
  isExternal?: boolean;
  externalName?: string;
  genderHint?: 'Macho' | 'Fêmea';
  badgeText?: string;
  onSelect?: (id: string) => void;
  onLinkClick?: () => void;
}) {
  if (isExternal && externalName) {
    return (
      <div className="p-2.5 bg-theme-base/70 border border-amber-500/40 rounded-xl flex items-center gap-2.5 w-full min-w-0 shadow-sm relative group">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs shrink-0 font-bold">
          {genderHint === 'Macho' ? '🐓' : '🐔'}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-tight block truncate">{label} (Ext.)</span>
          <p className="text-xs font-bold text-white truncate">{externalName}</p>
        </div>
        {onLinkClick && (
          <button 
            onClick={(e) => { e.stopPropagation(); onLinkClick(); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-theme-surface border border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-black flex items-center justify-center text-[10px] font-bold shadow transition-all opacity-0 group-hover:opacity-100"
            title="Alterar vínculo"
          >
            ✏️
          </button>
        )}
      </div>
    );
  }

  if (bird) {
    const isMale = bird.sexo === 'Macho' || genderHint === 'Macho';
    return (
      <div 
        onClick={() => onSelect && onSelect(bird.id)}
        className={`p-2.5 bg-theme-base/80 hover:bg-theme-primary/10 border ${isMale ? 'border-blue-500/40 hover:border-blue-400' : 'border-pink-500/40 hover:border-pink-400'} rounded-xl cursor-pointer flex items-center gap-2.5 w-full min-w-0 transition-all duration-300 shadow-md group relative`}
      >
        <div className={`w-8 h-8 rounded-full border ${isMale ? 'border-blue-500' : 'border-pink-500'} bg-theme-surface flex items-center justify-center overflow-hidden shrink-0 shadow-inner`}>
          {(bird.imagem || bird.imagens?.[0]) ? (
            <img src={bird.imagem || bird.imagens?.[0]} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-sm">{isMale ? '🐓' : '🐔'}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className={`text-[9px] font-black uppercase tracking-wider block truncate ${isMale ? 'text-blue-400' : 'text-pink-400'}`}>
              {label}
            </span>
            {badgeText && (
              <span className="text-[7.5px] font-extrabold bg-theme-primary/15 text-theme-primary px-1.5 py-0.2 rounded border border-theme-primary/30 shrink-0">
                {badgeText}
              </span>
            )}
          </div>
          <p className="text-xs font-black text-white truncate group-hover:text-theme-primary transition-colors">{bird.anilha}</p>
          {bird.nome && <p className="text-[10px] text-theme-text-muted truncate">{bird.nome}</p>}
        </div>
        {onLinkClick && (
          <button 
            onClick={(e) => { e.stopPropagation(); onLinkClick(); }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-theme-surface border border-theme-border text-theme-text-muted hover:border-theme-primary hover:text-theme-primary flex items-center justify-center text-[10px] font-bold shadow transition-all opacity-0 group-hover:opacity-100"
            title="Alterar vínculo"
          >
            ✏️
          </button>
        )}
      </div>
    );
  }

  // Unfilled branch node with clickable (+) link trigger
  return (
    <div 
      onClick={onLinkClick}
      className="p-2.5 bg-theme-base/30 hover:bg-theme-primary/10 border border-dashed border-theme-primary/50 hover:border-theme-primary rounded-xl cursor-pointer flex items-center gap-2.5 w-full min-w-0 transition-all duration-300 group shadow-sm"
      title={`Clique para vincular ${label}`}
    >
      <div className="w-8 h-8 rounded-full border border-dashed border-theme-primary/70 bg-theme-primary/10 flex items-center justify-center text-xs text-theme-primary shrink-0 group-hover:scale-110 transition-transform">
        <Plus size={14} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[9px] font-black text-theme-primary uppercase block tracking-wider truncate">{label}</span>
        <p className="text-[10px] text-theme-primary font-bold truncate group-hover:text-white flex items-center gap-1">
          <span>➕ Vincular</span>
        </p>
      </div>
    </div>
  );
}

export function BirdProfileModal() {
  const { selectedBirdProfileId, closeModals, birds, openAddBirdModal, openBirdProfile, editBird, removeBird } = useAppContext();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // ── States para modal interativo de vínculo direto na árvore ──
  const [linkingTarget, setLinkingTarget] = useState<{
    targetBirdId: string;
    role: 'pai' | 'mae' | 'avo_paterno' | 'avo_paterna' | 'avo_materno' | 'avo_materna';
    roleLabel: string;
    genderRequired: 'Macho' | 'Fêmea';
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingCandidate, setConfirmingCandidate] = useState<any | null>(null);
  const [isExternalTab, setIsExternalTab] = useState(false);
  const [externalInput, setExternalInput] = useState('');

  const modalScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentImgIndex(0);
    setLinkingTarget(null);
    setConfirmingCandidate(null);
    setSearchQuery('');
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTop = 0;
    }
  }, [selectedBirdProfileId]);

  if (!selectedBirdProfileId) return null;

  const bird = birds.find(b => b.id === selectedBirdProfileId);

  if (!bird) {
    return null;
  }

  const inbreedingF = useMemo(() => {
    return calculateInbreedingCoefficient(bird.id, birds);
  }, [bird.id, birds]);

  const relatedList = useMemo(() => {
    return findRelatedBirds(bird, birds);
  }, [bird, birds]);

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'Adulto':
        return 'text-emerald-400';
      case 'Reprodutor':
        return 'text-blue-400';
      case 'Matriz':
        return 'text-pink-400';
      case 'Crescimento':
        return 'text-green-400';
      case 'Vendido':
        return 'text-amber-400';
      case 'Faleceu':
        return 'text-red-400';
      default:
        return 'text-white';
    }
  };

  const images = bird.imagens && bird.imagens.length > 0
    ? bird.imagens
    : bird.imagem
    ? [bird.imagem]
    : [];

  const currentImage = images[currentImgIndex];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex(prev => (prev + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImgIndex(prev => (prev - 1 + images.length) % images.length);
  };

  // Executa a vinculação confirmada de uma ave parente
  const handleConfirmLink = (candidate: any) => {
    if (!linkingTarget) return;

    const { targetBirdId, role } = linkingTarget;

    if (role === 'pai') {
      editBird(targetBirdId, { paiId: candidate.id, isPaiExterno: false });
    } else if (role === 'mae') {
      editBird(targetBirdId, { maeId: candidate.id, isMaeExterno: false });
    } else if (role === 'avo_paterno') {
      editBird(targetBirdId, { paiId: candidate.id, isPaiExterno: false });
    } else if (role === 'avo_paterna') {
      editBird(targetBirdId, { maeId: candidate.id, isMaeExterno: false });
    } else if (role === 'avo_materno') {
      editBird(targetBirdId, { paiId: candidate.id, isPaiExterno: false });
    } else if (role === 'avo_materna') {
      editBird(targetBirdId, { maeId: candidate.id, isMaeExterno: false });
    }

    setLinkingTarget(null);
    setConfirmingCandidate(null);
    setSearchQuery('');
  };

  // Executa a vinculação de parente externo
  const handleConfirmExternalLink = () => {
    if (!linkingTarget || !externalInput.trim()) return;

    const { targetBirdId, role } = linkingTarget;
    const val = externalInput.trim();

    if (role === 'pai' || role === 'avo_paterno' || role === 'avo_materno') {
      editBird(targetBirdId, { paiId: val, isPaiExterno: true });
    } else if (role === 'mae' || role === 'avo_paterna' || role === 'avo_materna') {
      editBird(targetBirdId, { maeId: val, isMaeExterno: true });
    }

    setLinkingTarget(null);
    setConfirmingCandidate(null);
    setExternalInput('');
    setSearchQuery('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] gpu-accelerated animate-scale-up relative">
        
        {/* Header */}
        <div className="p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/50 shrink-0">
          <h3 className="font-bold text-lg text-white">Perfil da Ave</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (confirm(`Deseja excluir permanentemente a ave ${bird.anilha} do plantel?`)) {
                  removeBird(bird.id);
                  closeModals();
                }
              }}
              className="flex items-center gap-2 text-sm font-bold text-red-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={16} /> <span className="hidden sm:inline">Excluir</span>
            </button>
            <button onClick={() => openAddBirdModal('', bird.id)} className="flex items-center gap-2 text-sm font-bold text-theme-primary hover:text-orange-400 transition-colors">
              <Edit2 size={16} /> <span className="hidden sm:inline">Editar</span>
            </button>
            <button onClick={closeModals} className="text-theme-text-muted hover:text-white p-2">✕</button>
          </div>
        </div>
        
        <div ref={modalScrollRef} className="flex-1 overflow-y-auto smooth-scroll overflow-x-hidden">
          {/* Cover / Header section with Carousel */}
          <div className="relative h-64 bg-theme-base select-none">
            {images.length > 0 ? (
              <div className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center">
                {/* Background Blur */}
                <div 
                  className="absolute inset-0 opacity-30 blur-md scale-105"
                  style={{ backgroundImage: `url(${currentImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                />
                {/* Foreground Image */}
                <img src={currentImage} alt={bird.nome} className="relative z-10 h-full max-w-full object-contain shadow-2xl" />

                {/* Left/Right Chevrons */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrev}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/80 text-white rounded-full p-2.5 transition-all active:scale-95 shadow-lg border border-white/10"
                      aria-label="Imagem anterior"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={handleNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/80 text-white rounded-full p-2.5 transition-all active:scale-95 shadow-lg border border-white/10"
                      aria-label="Próxima imagem"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}

                {/* Slide dots and counter overlay */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 bg-black/70 px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
                    <div className="flex gap-1.5">
                      {images.map((_, i) => (
                        <div
                          key={i}
                          onClick={(e) => { e.stopPropagation(); setCurrentImgIndex(i); }}
                          className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                            i === currentImgIndex ? 'bg-theme-primary w-4' : 'bg-white/40 hover:bg-white/70'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                      {currentImgIndex + 1} de {images.length}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 text-theme-text-muted">
                <Camera size={64} className="mb-2" />
                <span className="text-xs font-bold uppercase tracking-wide">Sem fotos cadastradas</span>
              </div>
            )}
            
            {/* Avatar / Title Overlays */}
            <div className="absolute -bottom-12 left-6 flex items-end gap-4 z-30">
              <div className="w-24 h-24 rounded-2xl bg-theme-surface border-4 border-theme-base overflow-hidden flex items-center justify-center text-4xl shadow-xl shrink-0">
                {currentImage ? (
                  <img src={currentImage} alt={bird.nome} className="w-full h-full object-cover" />
                ) : (
                  bird.sexo === 'Macho' ? '🐓' : '🐔'
                )}
              </div>
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-3xl font-black text-white drop-shadow">{bird.anilha}</h2>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                    bird.sexo === 'Macho' ? 'bg-blue-500/25 text-blue-400 border border-blue-500/30' : 'bg-pink-500/25 text-pink-400 border border-pink-500/30'
                  }`}>
                    {bird.sexo}
                  </span>
                </div>
                {bird.nome && <p className="text-lg text-theme-primary font-bold drop-shadow">{bird.nome}</p>}
              </div>
            </div>
          </div>

          <div className="p-5 pt-14 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {/* Anilha */}
              <div className="bg-theme-base/50 border border-theme-border p-3 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-0.5 flex items-center gap-1">
                  🔍 Anilha
                </p>
                <p className="text-sm text-white font-bold truncate">{bird.anilha}</p>
              </div>

              {/* Nome */}
              <div className="bg-theme-base/50 border border-theme-border p-3 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-0.5 flex items-center gap-1">
                  📝 Nome
                </p>
                <p className="text-sm text-white font-bold truncate">{bird.nome || 'Não informado'}</p>
              </div>

              {/* Sexo */}
              <div className="bg-theme-base/50 border border-theme-border p-3 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-0.5 flex items-center gap-1">
                  🐓 Gênero
                </p>
                <p className={`text-sm font-bold truncate ${bird.sexo === 'Macho' ? 'text-blue-400' : 'text-pink-400'}`}>
                  {bird.sexo}
                </p>
              </div>

              {/* Raça */}
              <div className="bg-theme-base/50 border border-theme-border p-3 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-0.5 flex items-center gap-1">
                  <Info size={11} /> Raça
                </p>
                <p className="text-sm text-white font-bold truncate">{bird.raca || 'Não informada'}</p>
              </div>

              {/* Baia */}
              <div className="bg-theme-base/50 border border-theme-border p-3 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-0.5 flex items-center gap-1">
                  <GitBranch size={11} /> Local / Baia
                </p>
                <p className="text-sm text-theme-accent font-mono font-bold truncate">
                  {bird.baia && bird.baia !== 'ND' ? `Baia ${bird.baia}` : 'Não informada'}
                </p>
              </div>

              {/* Status */}
              <div className="bg-theme-base/50 border border-theme-border p-3 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-0.5 flex items-center gap-1">
                  <Activity size={11} /> Status
                </p>
                <select
                  value={bird.status || ''}
                  onChange={(e) => editBird(bird.id, { status: e.target.value })}
                  className={`bg-transparent text-sm font-bold outline-none border-none cursor-pointer w-full p-0 ${getStatusColorClass(bird.status)}`}
                >
                  <option value="Adulto" className="bg-theme-surface text-white">Adulto</option>
                  <option value="Reprodutor" className="bg-theme-surface text-white">Reprodutor</option>
                  <option value="Matriz" className="bg-theme-surface text-white">Matriz</option>
                  <option value="Crescimento" className="bg-theme-surface text-white">Crescimento</option>
                  <option value="Vendido" className="bg-theme-surface text-white">Vendido</option>
                  <option value="Faleceu" className="bg-theme-surface text-white">Faleceu</option>
                </select>
              </div>

              {/* Nascimento */}
              <div className="bg-theme-base/50 border border-theme-border p-3 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-0.5 flex items-center gap-1">
                  📅 Nascimento
                </p>
                <p className="text-sm text-white font-bold">
                  {bird.dataNascimento ? bird.dataNascimento.split('-').reverse().join('/') : 'Não informado'}
                </p>
                {bird.dataNascimento && (
                  <p className="text-[10px] text-theme-primary font-bold mt-0.5">
                    {calculateExactAge(bird.dataNascimento)}
                  </p>
                )}
              </div>

              {/* Peso */}
              <div className="bg-theme-base/50 border border-theme-border p-3 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-0.5 flex items-center gap-1">
                  ⚖️ Peso
                </p>
                <p className="text-sm text-white font-bold truncate">{bird.peso || 'Não informado'}</p>
              </div>
            </div>

            {bird.vacinas && (
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-2 flex items-center gap-2">
                  <Syringe size={12} className="text-blue-400" /> Vacinas Aplicadas
                </p>
                <div className="flex flex-wrap gap-2">
                  {bird.vacinas.split(',').map((vacina, i) => {
                    const trimmed = vacina.trim();
                    if (!trimmed) return null;
                    return (
                      <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg text-xs font-medium">
                        {trimmed}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 🌳 ÁRVORE GENEALÓGICA VERTICAL 100% RESPONSIVA (SEM ROLAGEM LATERAL NO CELULAR) ── */}
            {(() => {
              // Resolução dos Pais e Avós
              const fatherBird = bird.paiId && !bird.isPaiExterno ? birds.find(b => b.id === bird.paiId) : null;
              const motherBird = bird.maeId && !bird.isMaeExterno ? birds.find(b => b.id === bird.maeId) : null;

              const paternalGrandfather = fatherBird?.paiId && !fatherBird.isPaiExterno ? birds.find(b => b.id === fatherBird.paiId) : null;
              const paternalGrandmother = fatherBird?.maeId && !fatherBird.isMaeExterno ? birds.find(b => b.id === fatherBird.maeId) : null;

              const maternalGrandfather = motherBird?.paiId && !motherBird.isPaiExterno ? birds.find(b => b.id === motherBird.paiId) : null;
              const maternalGrandmother = motherBird?.maeId && !motherBird.isMaeExterno ? birds.find(b => b.id === motherBird.maeId) : null;

              // Detalhamento dos Grupos Relativos
              const fullSiblings = relatedList.filter(r => r.relationship === 'Irmão Pleno' || r.relationship === 'Irmã Plena');
              const paternalHalfSiblings = relatedList.filter(r => r.relationship === 'Meio-Irmão (Paterno)' || r.relationship === 'Meia-Irmã (Paterna)');
              const maternalHalfSiblings = relatedList.filter(r => r.relationship === 'Meio-Irmão (Materno)' || r.relationship === 'Meia-Irmã (Materna)');
              const unclesPaternal = relatedList.filter(r => r.relationship === 'Tio Paterno' || r.relationship === 'Tia Paterna');
              const unclesMaternal = relatedList.filter(r => r.relationship === 'Tio Materno' || r.relationship === 'Tia Materna');
              const cousins = relatedList.filter(r => r.relationshipGroup === 'Primos');
              const children = relatedList.filter(r => r.relationshipGroup === 'Filhos');
              const nephews = relatedList.filter(r => r.relationshipGroup === 'Sobrinhos');
              const grandchildren = relatedList.filter(r => r.relationshipGroup === 'Netos');

              const getInbreedingBadge = (f: number) => {
                if (f === 0) return { label: '0.0% (Sem Endogamia Direta)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
                if (f <= 6.25) return { label: `${f.toFixed(1)}% (Consanguinidade Leve)`, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
                if (f <= 12.5) return { label: `${f.toFixed(1)}% (Consanguinidade Moderada)`, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
                return { label: `${f.toFixed(1)}% (Consanguinidade Elevada)`, color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
              };

              const fBadge = getInbreedingBadge(inbreedingF);

              return (
                <div className="border border-theme-border rounded-2xl overflow-hidden bg-theme-surface/50 shadow-lg space-y-0 w-full">
                  
                  {/* Header da Árvore Genealógica */}
                  <div className="bg-theme-base p-4 border-b border-theme-border flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <h4 className="font-black text-white flex items-center gap-2 text-base">
                        <GitBranch size={18} className="text-theme-primary" /> Árvore Genealógica (Diagrama Vertical)
                      </h4>
                      <p className="text-xs text-theme-text-muted mt-0.5">
                        Ajustado perfeitamente na tela do celular sem rolagem lateral
                      </p>
                    </div>
                    <button 
                      onClick={() => openAddBirdModal('', bird.id)}
                      className="text-xs text-theme-primary hover:text-orange-400 font-bold uppercase transition-colors px-3 py-1.5 rounded-xl border border-theme-primary/30 bg-theme-primary/10 hover:bg-theme-primary/20"
                    >
                      Editar Registros
                    </button>
                  </div>

                  <div className="p-3 sm:p-5 space-y-5 w-full">
                    {/* Coeficiente de Consanguinidade */}
                    <div className="p-3.5 rounded-xl bg-theme-base/60 border border-theme-border flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                        🧬 Consanguinidade (Wright):
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-black border ${fBadge.color}`}>
                        {fBadge.label}
                      </span>
                    </div>

                    {/* ── ESTRUTURA VERTICAL COMPLETA DA ÁRVORE (100% RESPONSIVA) ── */}
                    <div className="space-y-6 w-full">
                      
                      {/* 1. AVE ALVO (CARD CENTRAL DE DESTAQUE TOPO) */}
                      <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-2 border-theme-primary rounded-2xl text-center shadow-lg w-full">
                        <div className="w-14 h-14 rounded-full border-2 border-theme-primary bg-theme-surface flex items-center justify-center overflow-hidden mb-1.5 shadow-md">
                          {currentImage ? (
                            <img src={currentImage} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-2xl">{bird.sexo === 'Macho' ? '🐓' : '🐔'}</span>
                          )}
                        </div>
                        <span className="px-3 py-0.5 rounded-full bg-theme-primary text-black font-black text-[10px] uppercase tracking-wider mb-1">
                          👑 Ave Alvo
                        </span>
                        <h5 className="font-black text-white text-base truncate max-w-full">{bird.anilha}</h5>
                        {bird.nome && <p className="text-xs text-theme-primary font-bold truncate max-w-full">{bird.nome}</p>}
                      </div>

                      {/* 2. LINHAGEM DIRETA DE PAIS (1ª GERAÇÃO SUPERIOR) */}
                      <div className="space-y-2.5 w-full">
                        <span className="text-xs font-black text-blue-400 uppercase tracking-wider block flex items-center gap-1.5">
                          <span>⬆️</span> Pais (1ª Geração Superior)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                          <PedigreeTreeNode 
                            label="Pai (Reprodutor)" 
                            bird={fatherBird} 
                            isExternal={bird.isPaiExterno} 
                            externalName={bird.paiId} 
                            genderHint="Macho" 
                            badgeText="50%"
                            onSelect={openBirdProfile}
                            onLinkClick={() => setLinkingTarget({ targetBirdId: bird.id, role: 'pai', roleLabel: 'Pai', genderRequired: 'Macho' })}
                          />
                          <PedigreeTreeNode 
                            label="Mãe (Matriz)" 
                            bird={motherBird} 
                            isExternal={bird.isMaeExterno} 
                            externalName={bird.maeId} 
                            genderHint="Fêmea" 
                            badgeText="50%"
                            onSelect={openBirdProfile}
                            onLinkClick={() => setLinkingTarget({ targetBirdId: bird.id, role: 'mae', roleLabel: 'Mãe', genderRequired: 'Fêmea' })}
                          />
                        </div>
                      </div>

                      {/* 3. LINHAGEM DIRETA DE AVÓS (2ª GERAÇÃO SUPERIOR) */}
                      <div className="space-y-2.5 w-full">
                        <span className="text-xs font-black text-blue-300 uppercase tracking-wider block flex items-center gap-1.5">
                          <span>⬆️</span> Avós (2ª Geração Superior)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 w-full">
                          <PedigreeTreeNode 
                            label="Avô Paterno" 
                            bird={paternalGrandfather} 
                            isExternal={fatherBird?.isPaiExterno}
                            externalName={fatherBird?.paiId}
                            genderHint="Macho" 
                            badgeText="25%" 
                            onSelect={openBirdProfile} 
                            onLinkClick={() => {
                              if (!fatherBird) {
                                alert('⚠️ Vincule primeiro o Pai da ave para conectar os Avós Paternos!');
                                setLinkingTarget({ targetBirdId: bird.id, role: 'pai', roleLabel: 'Pai', genderRequired: 'Macho' });
                              } else {
                                setLinkingTarget({ targetBirdId: fatherBird.id, role: 'avo_paterno', roleLabel: `Avô Paterno (Pai de ${fatherBird.anilha})`, genderRequired: 'Macho' });
                              }
                            }}
                          />
                          <PedigreeTreeNode 
                            label="Avó Paterna" 
                            bird={paternalGrandmother} 
                            isExternal={fatherBird?.isMaeExterno}
                            externalName={fatherBird?.maeId}
                            genderHint="Fêmea" 
                            badgeText="25%" 
                            onSelect={openBirdProfile} 
                            onLinkClick={() => {
                              if (!fatherBird) {
                                alert('⚠️ Vincule primeiro o Pai da ave para conectar os Avós Paternos!');
                                setLinkingTarget({ targetBirdId: bird.id, role: 'pai', roleLabel: 'Pai', genderRequired: 'Macho' });
                              } else {
                                setLinkingTarget({ targetBirdId: fatherBird.id, role: 'avo_paterna', roleLabel: `Avó Paterna (Mãe de ${fatherBird.anilha})`, genderRequired: 'Fêmea' });
                              }
                            }}
                          />
                          <PedigreeTreeNode 
                            label="Avô Materno" 
                            bird={maternalGrandfather} 
                            isExternal={motherBird?.isPaiExterno}
                            externalName={motherBird?.paiId}
                            genderHint="Macho" 
                            badgeText="25%" 
                            onSelect={openBirdProfile} 
                            onLinkClick={() => {
                              if (!motherBird) {
                                alert('⚠️ Vincule primeiro a Mãe da ave para conectar os Avós Maternos!');
                                setLinkingTarget({ targetBirdId: bird.id, role: 'mae', roleLabel: 'Mãe', genderRequired: 'Fêmea' });
                              } else {
                                setLinkingTarget({ targetBirdId: motherBird.id, role: 'avo_materno', roleLabel: `Avô Materno (Pai de ${motherBird.anilha})`, genderRequired: 'Macho' });
                              }
                            }}
                          />
                          <PedigreeTreeNode 
                            label="Avó Materna" 
                            bird={maternalGrandmother} 
                            isExternal={motherBird?.isMaeExterno}
                            externalName={motherBird?.maeId}
                            genderHint="Fêmea" 
                            badgeText="25%" 
                            onSelect={openBirdProfile} 
                            onLinkClick={() => {
                              if (!motherBird) {
                                alert('⚠️ Vincule primeiro a Mãe da ave para conectar os Avós Maternos!');
                                setLinkingTarget({ targetBirdId: bird.id, role: 'mae', roleLabel: 'Mãe', genderRequired: 'Fêmea' });
                              } else {
                                setLinkingTarget({ targetBirdId: motherBird.id, role: 'avo_materna', roleLabel: `Avó Materna (Mãe de ${motherBird.anilha})`, genderRequired: 'Fêmea' });
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* 4. TIOS & TIAS */}
                      {(unclesPaternal.length > 0 || unclesMaternal.length > 0) && (
                        <div className="space-y-2.5 w-full border-t border-theme-border/50 pt-4">
                          <span className="text-xs font-black text-cyan-400 uppercase tracking-wider block">
                            ↗️ Tios & Tias ({unclesPaternal.length + unclesMaternal.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                            {unclesPaternal.map(r => (
                              <PedigreeTreeNode key={r.bird.id} label="Tio Paterno" bird={r.bird} badgeText="25%" onSelect={openBirdProfile} />
                            ))}
                            {unclesMaternal.map(r => (
                              <PedigreeTreeNode key={r.bird.id} label="Tio Materno" bird={r.bird} badgeText="25%" onSelect={openBirdProfile} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 5. IRMÃOS & MEIOS-IRMÃOS */}
                      {(fullSiblings.length > 0 || paternalHalfSiblings.length > 0 || maternalHalfSiblings.length > 0) && (
                        <div className="space-y-2.5 w-full border-t border-theme-border/50 pt-4">
                          <span className="text-xs font-black text-purple-400 uppercase tracking-wider block">
                            🐣 Irmãos & Meios-Irmãos ({fullSiblings.length + paternalHalfSiblings.length + maternalHalfSiblings.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                            {fullSiblings.map(r => (
                              <PedigreeTreeNode key={r.bird.id} label="Irmão Pleno" bird={r.bird} badgeText="50%" onSelect={openBirdProfile} />
                            ))}
                            {paternalHalfSiblings.map(r => (
                              <PedigreeTreeNode key={r.bird.id} label="Meio-Irmão (Paterno)" bird={r.bird} badgeText="25%" onSelect={openBirdProfile} />
                            ))}
                            {maternalHalfSiblings.map(r => (
                              <PedigreeTreeNode key={r.bird.id} label="Meio-Irmão (Materno)" bird={r.bird} badgeText="25%" onSelect={openBirdProfile} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 6. PRIMOS & PRIMAS */}
                      {cousins.length > 0 && (
                        <div className="space-y-2.5 w-full border-t border-theme-border/50 pt-4">
                          <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">
                            ↗️ Primos & Primas ({cousins.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                            {cousins.map(r => (
                              <PedigreeTreeNode key={r.bird.id} label="Primo" bird={r.bird} badgeText="12.5%" onSelect={openBirdProfile} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 7. DESCENDÊNCIA (FILHOS, SOBRINHOS & NETOS) */}
                      {(children.length > 0 || nephews.length > 0 || grandchildren.length > 0) && (
                        <div className="space-y-2.5 w-full border-t border-theme-border/50 pt-4">
                          <span className="text-xs font-black text-emerald-400 uppercase tracking-wider block">
                            ⬇️ Descendência (Filhos, Sobrinhos & Netos - {children.length + nephews.length + grandchildren.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                            {children.map(r => (
                              <PedigreeTreeNode key={r.bird.id} label="Filho Direto" bird={r.bird} badgeText="50%" onSelect={openBirdProfile} />
                            ))}
                            {nephews.map(r => (
                              <PedigreeTreeNode key={r.bird.id} label="Sobrinho" bird={r.bird} badgeText="25%" onSelect={openBirdProfile} />
                            ))}
                            {grandchildren.map(r => (
                              <PedigreeTreeNode key={r.bird.id} label="Neto" bird={r.bird} badgeText="25%" onSelect={openBirdProfile} />
                            ))}
                          </div>
                        </div>
                      )}

                      {relatedList.length === 0 && !bird.paiId && !bird.maeId && (
                        <div className="p-6 text-center text-theme-text-muted text-xs italic bg-theme-base/30 rounded-xl border border-theme-border/40 border-dashed w-full">
                          Nenhum parente cadastrado. Clique no botão ➕ dos Pais acima para vincular a genealogia!
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── MODAL FLUTUANTE DE SELEÇÃO E CONFIRMAÇÃO DE VÍNCULO DIRETO ── */}
        {linkingTarget && (
          <div className="absolute inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 animate-fade-in">
            <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-scale-up">
              
              {/* Header do Seletor */}
              <div className="p-4 border-b border-theme-border flex items-center justify-between bg-theme-base/60">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-theme-primary" />
                  <h4 className="font-black text-white text-sm">
                    Vincular <span className="text-theme-primary">{linkingTarget.roleLabel}</span>
                  </h4>
                </div>
                <button 
                  onClick={() => { setLinkingTarget(null); setConfirmingCandidate(null); }}
                  className="p-1.5 text-theme-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tabs: No Criatório vs Fora do Criatório */}
              <div className="flex border-b border-theme-border bg-theme-base/30">
                <button
                  onClick={() => setIsExternalTab(false)}
                  className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
                    !isExternalTab ? 'border-theme-primary text-theme-primary bg-theme-primary/5' : 'border-transparent text-theme-text-muted hover:text-white'
                  }`}
                >
                  🐔 Ave no Criatório ({linkingTarget.genderRequired})
                </button>
                <button
                  onClick={() => setIsExternalTab(true)}
                  className={`flex-1 py-2.5 text-xs font-bold transition-colors border-b-2 ${
                    isExternalTab ? 'border-theme-primary text-theme-primary bg-theme-primary/5' : 'border-transparent text-theme-text-muted hover:text-white'
                  }`}
                >
                  📝 Parente Externo (Fora do Criatório)
                </button>
              </div>

              {/* Conteúdo da Tab */}
              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {!isExternalTab ? (
                  <>
                    {/* Barra de pesquisa de aves */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Buscar por Anilha, Nome, Raça ou Baia...`}
                        className="w-full pl-9 pr-3 py-2 bg-theme-base border border-theme-border rounded-xl text-xs text-white placeholder-theme-text-muted outline-none focus:border-theme-primary transition-all"
                      />
                    </div>

                    {/* Lista de Aves Candidatas */}
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 smooth-scroll">
                      {(() => {
                        const candidates = birds.filter(b => {
                          if (b.id === linkingTarget.targetBirdId) return false;
                          if (b.id === bird.id) return false;
                          
                          if (searchQuery.trim()) {
                            const q = searchQuery.toLowerCase();
                            const matches = (
                              b.anilha.toLowerCase().includes(q) ||
                              (b.nome && b.nome.toLowerCase().includes(q)) ||
                              (b.raca && b.raca.toLowerCase().includes(q)) ||
                              (b.baia && b.baia.toLowerCase().includes(q))
                            );
                            if (!matches) return false;
                          }

                          return true;
                        }).sort((a, b) => {
                          const aGenderMatch = a.sexo === linkingTarget.genderRequired ? 1 : 0;
                          const bGenderMatch = b.sexo === linkingTarget.genderRequired ? 1 : 0;
                          return bGenderMatch - aGenderMatch;
                        });

                        if (candidates.length === 0) {
                          return (
                            <div className="p-6 text-center text-theme-text-muted text-xs italic bg-theme-base/20 rounded-xl border border-theme-border/40">
                              Nenhuma ave encontrada com esse filtro.
                            </div>
                          );
                        }

                        return candidates.map(c => {
                          const isGenderMatch = c.sexo === linkingTarget.genderRequired;
                          return (
                            <div
                              key={c.id}
                              onClick={() => setConfirmingCandidate(c)}
                              className={`p-3 bg-theme-base/60 hover:bg-theme-primary/10 border ${
                                confirmingCandidate?.id === c.id ? 'border-theme-primary bg-theme-primary/10' : 'border-theme-border/60 hover:border-theme-primary/30'
                              } rounded-xl cursor-pointer flex items-center justify-between gap-3 transition-all`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-9 h-9 rounded-full border ${isGenderMatch ? (c.sexo === 'Macho' ? 'border-blue-500' : 'border-pink-500') : 'border-theme-border'} bg-theme-surface flex items-center justify-center overflow-hidden shrink-0`}>
                                  {(c.imagem || c.imagens?.[0]) ? (
                                    <img src={c.imagem || c.imagens?.[0]} className="w-full h-full object-cover" alt="" />
                                  ) : (
                                    <span className="text-sm">{c.sexo === 'Macho' ? '🐓' : '🐔'}</span>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-white text-xs truncate">{c.anilha}</p>
                                    <span className={`text-[8px] font-black px-1.5 py-0.2 rounded border ${
                                      c.sexo === 'Macho' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-pink-500/20 text-pink-400 border-pink-500/30'
                                    }`}>
                                      {c.sexo}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-theme-text-muted truncate">
                                    {c.nome ? `${c.nome} · ` : ''}{c.raca || 'Sem raça'} {c.baia ? `(Baia ${c.baia})` : ''}
                                  </p>
                                </div>
                              </div>

                              <button className="px-3 py-1 rounded-lg bg-theme-primary/10 border border-theme-primary/30 text-theme-primary hover:bg-theme-primary hover:text-black font-black text-[10px] uppercase transition-all shrink-0">
                                Selecionar
                              </button>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 p-2">
                    <p className="text-xs text-theme-text-muted leading-relaxed font-medium">
                      Caso o {linkingTarget.roleLabel.toLowerCase()} pertença a outro criatório ou não esteja cadastrado na plataforma, digite o nome/anilha de identificação externa abaixo:
                    </p>
                    <input 
                      type="text"
                      value={externalInput}
                      onChange={(e) => setExternalInput(e.target.value)}
                      placeholder={`Ex: Reprodutor Galo Mura 01 (Granja X)`}
                      className="w-full px-3.5 py-2.5 bg-theme-base border border-theme-border rounded-xl text-xs text-white placeholder-theme-text-muted outline-none focus:border-theme-primary transition-all font-bold"
                    />
                    <button
                      onClick={handleConfirmExternalLink}
                      disabled={!externalInput.trim()}
                      className="w-full py-2.5 bg-theme-primary hover:bg-amber-400 disabled:opacity-50 text-black font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>Salvar Parente Externo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Box de Confirmação Final quando uma ave é selecionada */}
              {confirmingCandidate && !isExternalTab && (
                <div className="p-4 border-t border-theme-border bg-theme-base/90 space-y-3 animate-slide-up">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <AlertCircle size={16} />
                    <span>Confirmar Vinculação na Árvore Genealógica?</span>
                  </div>

                  <div className="p-3 bg-theme-surface border border-theme-primary/40 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-theme-primary overflow-hidden shrink-0">
                      {(confirmingCandidate.imagem || confirmingCandidate.imagens?.[0]) ? (
                        <img src={confirmingCandidate.imagem || confirmingCandidate.imagens?.[0]} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-lg">{confirmingCandidate.sexo === 'Macho' ? '🐓' : '🐔'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-white">
                        {confirmingCandidate.anilha} {confirmingCandidate.nome ? `(${confirmingCandidate.nome})` : ''}
                      </p>
                      <p className="text-[10px] text-theme-primary font-bold">
                        Vincular como <strong className="uppercase">{linkingTarget.roleLabel}</strong> da ave <strong className="text-white">{bird.anilha}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setConfirmingCandidate(null)}
                      className="flex-1 py-2 bg-theme-base border border-theme-border text-xs font-bold text-theme-text-muted hover:text-white rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleConfirmLink(confirmingCandidate)}
                      className="flex-1 py-2 bg-theme-primary hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1"
                    >
                      <Check size={14} />
                      <span>Confirmar Vinculação</span>
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
