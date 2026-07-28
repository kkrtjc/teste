import { useState, useEffect } from 'react';
import { Camera, GitBranch, Activity, Info, Edit2, Syringe, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { calculateExactAge } from '../../lib/utils';
import { calculateInbreedingCoefficient, findRelatedBirds } from '../../lib/genealogy';

function PedigreeTreeNode({
  label,
  bird,
  isExternal,
  externalName,
  genderHint,
  onSelect,
}: {
  label: string;
  bird?: any;
  isExternal?: boolean;
  externalName?: string;
  genderHint?: 'Macho' | 'Fêmea';
  onSelect?: (id: string) => void;
}) {
  if (isExternal && externalName) {
    return (
      <div className="p-2.5 bg-theme-base/70 border border-amber-500/40 rounded-xl flex items-center gap-2.5 min-w-[130px] max-w-[160px] shadow-sm">
        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs shrink-0 font-bold">
          {genderHint === 'Macho' ? '🐓' : '🐔'}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[9px] font-black text-amber-400 uppercase tracking-tight block truncate">{label} (Ext.)</span>
          <p className="text-xs font-bold text-white truncate">{externalName}</p>
        </div>
      </div>
    );
  }

  if (bird) {
    const isMale = bird.sexo === 'Macho' || genderHint === 'Macho';
    return (
      <div 
        onClick={() => onSelect && onSelect(bird.id)}
        className={`p-2.5 bg-theme-base/80 hover:bg-theme-primary/10 border ${isMale ? 'border-blue-500/40 hover:border-blue-400' : 'border-pink-500/40 hover:border-pink-400'} rounded-xl cursor-pointer flex items-center gap-2.5 min-w-[135px] max-w-[165px] transition-all duration-300 shadow-md group`}
      >
        <div className={`w-8 h-8 rounded-full border ${isMale ? 'border-blue-500' : 'border-pink-500'} bg-theme-surface flex items-center justify-center overflow-hidden shrink-0 shadow-inner`}>
          {(bird.imagem || bird.imagens?.[0]) ? (
            <img src={bird.imagem || bird.imagens?.[0]} className="w-full h-full object-cover" alt="" />
          ) : (
            <span className="text-sm">{isMale ? '🐓' : '🐔'}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className={`text-[9px] font-black uppercase tracking-wider block truncate ${isMale ? 'text-blue-400' : 'text-pink-400'}`}>
            {label}
          </span>
          <p className="text-xs font-black text-white truncate group-hover:text-theme-primary transition-colors">{bird.anilha}</p>
          {bird.nome && <p className="text-[10px] text-theme-text-muted truncate">{bird.nome}</p>}
        </div>
      </div>
    );
  }

  // Unfilled branch node
  return (
    <div className="p-2.5 bg-theme-base/20 border border-dashed border-theme-border/60 rounded-xl flex items-center gap-2.5 min-w-[130px] max-w-[160px] opacity-60">
      <div className="w-8 h-8 rounded-full border border-dashed border-theme-border flex items-center justify-center text-xs text-theme-text-muted shrink-0">
        ❓
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[9px] font-bold text-theme-text-muted uppercase block tracking-wider truncate">{label}</span>
        <p className="text-[10px] text-theme-text-muted italic truncate">Não cadastrado</p>
      </div>
    </div>
  );
}

export function BirdProfileModal() {
  const { selectedBirdProfileId, closeModals, birds, openAddBirdModal, openBirdProfile, editBird, removeBird } = useAppContext();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  useEffect(() => {
    setCurrentImgIndex(0);
  }, [selectedBirdProfileId]);

  if (!selectedBirdProfileId) return null;

  const bird = birds.find(b => b.id === selectedBirdProfileId);

  if (!bird) {
    return null;
  }

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] gpu-accelerated animate-scale-up">
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
        
        <div className="flex-1 overflow-y-auto smooth-scroll">
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

            {/* ── ASCENDÊNCIA, PEDIGREE & RAMIFICAÇÃO DA ÁRVORE GENEALÓGICA ── */}
            {(() => {
              const inbreedingF = calculateInbreedingCoefficient(bird.id, birds);
              const relatedList = findRelatedBirds(bird, birds);

              // Resolução dos Pais e Avós
              const fatherBird = bird.paiId && !bird.isPaiExterno ? birds.find(b => b.id === bird.paiId) : null;
              const motherBird = bird.maeId && !bird.isMaeExterno ? birds.find(b => b.id === bird.maeId) : null;

              const paternalGrandfather = fatherBird?.paiId && !fatherBird.isPaiExterno ? birds.find(b => b.id === fatherBird.paiId) : null;
              const paternalGrandmother = fatherBird?.maeId && !fatherBird.isMaeExterno ? birds.find(b => b.id === fatherBird.maeId) : null;

              const maternalGrandfather = motherBird?.paiId && !motherBird.isPaiExterno ? birds.find(b => b.id === motherBird.paiId) : null;
              const maternalGrandmother = motherBird?.maeId && !motherBird.isMaeExterno ? birds.find(b => b.id === motherBird.maeId) : null;

              // Agrupa os outros parentes por categoria
              const groups: Record<string, typeof relatedList> = {
                'Irmãos': relatedList.filter(r => r.relationshipGroup === 'Irmãos'),
                'Tios': relatedList.filter(r => r.relationshipGroup === 'Tios'),
                'Filhos': relatedList.filter(r => r.relationshipGroup === 'Filhos'),
                'Sobrinhos': relatedList.filter(r => r.relationshipGroup === 'Sobrinhos'),
                'Netos': relatedList.filter(r => r.relationshipGroup === 'Netos'),
              };

              // Cor visual do nível de consanguinidade
              const getInbreedingBadge = (f: number) => {
                if (f === 0) return { label: '0.0% (Sem Endogamia Direta)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
                if (f <= 6.25) return { label: `${f.toFixed(1)}% (Consanguinidade Leve)`, color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
                if (f <= 12.5) return { label: `${f.toFixed(1)}% (Consanguinidade Moderada)`, color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
                return { label: `${f.toFixed(1)}% (Consanguinidade Elevada)`, color: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
              };

              const fBadge = getInbreedingBadge(inbreedingF);

              return (
                <div className="border border-theme-border rounded-2xl overflow-hidden bg-theme-surface/50 shadow-lg space-y-0">
                  {/* Banner de Header da Genealogia */}
                  <div className="bg-theme-base p-4 border-b border-theme-border flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <h4 className="font-black text-white flex items-center gap-2 text-base">
                        <GitBranch size={18} className="text-theme-primary" /> Árvore Genealógica (Pedigree em Ramificação)
                      </h4>
                      <p className="text-xs text-theme-text-muted mt-0.5">
                        Diagrama de ramificação zootécnica de 3 Gerações
                      </p>
                    </div>
                    <button 
                      onClick={() => openAddBirdModal('', bird.id)}
                      className="text-xs text-theme-primary hover:text-orange-400 font-bold uppercase transition-colors px-3 py-1.5 rounded-xl border border-theme-primary/30 bg-theme-primary/10 hover:bg-theme-primary/20"
                    >
                      Editar Pais
                    </button>
                  </div>

                  <div className="p-4 space-y-5">
                    {/* Badge do Coeficiente de Consanguinidade (Wright's F) */}
                    <div className="p-4 rounded-xl bg-theme-base/60 border border-theme-border space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                          🧬 Coeficiente de Consanguinidade (Wright):
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-black border ${fBadge.color}`}>
                          {fBadge.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-theme-text-muted leading-relaxed">
                        {inbreedingF === 0
                          ? 'Esta ave não possui ancestrais em comum diretos mapeados na linhagem.'
                          : `Mede o nível de endogamia (acasalamento entre parentes). ${inbreedingF >= 25 ? '⚠️ Nível alto: recomendado cruzar com linhagem distante.' : ''}`}
                      </p>
                    </div>

                    {/* ── 🌳 DIAGRAMA RAMIFICADO DA ÁRVORE GENEALÓGICA ── */}
                    <div className="space-y-2">
                      <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>🌳</span> Ramificação Genealógica (Ave · Pais · Avós)
                      </p>

                      <div className="w-full overflow-x-auto pb-4 pt-1 smooth-scroll">
                        <div className="min-w-[660px] p-4 bg-theme-base/60 border border-theme-border rounded-2xl flex items-center justify-start sm:justify-center gap-3 relative select-none">
                          
                          {/* ── NÍVEL 1: AVE ALVO (Esquerda) ── */}
                          <div className="flex flex-col items-center justify-center shrink-0 z-10">
                            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-2 border-theme-primary rounded-2xl flex flex-col items-center text-center shadow-[0_0_20px_rgba(245,158,11,0.2)] min-w-[130px]">
                              <div className="w-12 h-12 rounded-full border-2 border-theme-primary bg-theme-surface flex items-center justify-center overflow-hidden mb-1 shadow-lg">
                                {currentImage ? (
                                  <img src={currentImage} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <span className="text-xl">{bird.sexo === 'Macho' ? '🐓' : '🐔'}</span>
                                )}
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-theme-primary text-black font-black text-[9px] uppercase tracking-wider mb-1 shadow-sm">
                                Ave Alvo
                              </span>
                              <h5 className="font-black text-white text-xs truncate max-w-[110px]">{bird.anilha}</h5>
                              {bird.nome && <p className="text-[10px] text-theme-primary font-bold truncate max-w-[110px]">{bird.nome}</p>}
                            </div>
                          </div>

                          {/* Conector Central (Alvo -> Ramos Paterno/Materno) */}
                          <div className="w-4 h-0.5 bg-theme-primary/60 shrink-0" />

                          {/* ── NÍVEL 2 E 3: PAIS E AVÓS (Direita) ── */}
                          <div className="flex flex-col gap-5 flex-1 shrink-0">
                            
                            {/* RAMO PATERNO (PAI + AVÓS PATERNO) */}
                            <div className="flex items-center gap-3 relative bg-theme-surface/30 p-2.5 rounded-2xl border border-blue-500/20">
                              <PedigreeTreeNode 
                                label="Pai (Reprodutor)" 
                                bird={fatherBird} 
                                isExternal={bird.isPaiExterno} 
                                externalName={bird.paiId} 
                                genderHint="Macho" 
                                onSelect={openBirdProfile} 
                              />

                              <div className="w-4 h-0.5 bg-blue-500/50 shrink-0" />

                              <div className="flex flex-col gap-2">
                                <PedigreeTreeNode 
                                  label="Avô Paterno" 
                                  bird={paternalGrandfather} 
                                  isExternal={fatherBird?.isPaiExterno}
                                  externalName={fatherBird?.paiId}
                                  genderHint="Macho" 
                                  onSelect={openBirdProfile} 
                                />
                                <PedigreeTreeNode 
                                  label="Avó Paterna" 
                                  bird={paternalGrandmother} 
                                  isExternal={fatherBird?.isMaeExterno}
                                  externalName={fatherBird?.maeId}
                                  genderHint="Fêmea" 
                                  onSelect={openBirdProfile} 
                                />
                              </div>
                            </div>

                            {/* RAMO MATERNO (MÃE + AVÓS MATERNO) */}
                            <div className="flex items-center gap-3 relative bg-theme-surface/30 p-2.5 rounded-2xl border border-pink-500/20">
                              <PedigreeTreeNode 
                                label="Mãe (Matriz)" 
                                bird={motherBird} 
                                isExternal={bird.isMaeExterno} 
                                externalName={bird.maeId} 
                                genderHint="Fêmea" 
                                onSelect={openBirdProfile} 
                              />

                              <div className="w-4 h-0.5 bg-pink-500/50 shrink-0" />

                              <div className="flex flex-col gap-2">
                                <PedigreeTreeNode 
                                  label="Avô Materno" 
                                  bird={maternalGrandfather} 
                                  isExternal={motherBird?.isPaiExterno}
                                  externalName={motherBird?.paiId}
                                  genderHint="Macho" 
                                  onSelect={openBirdProfile} 
                                />
                                <PedigreeTreeNode 
                                  label="Avó Materna" 
                                  bird={maternalGrandmother} 
                                  isExternal={motherBird?.isMaeExterno}
                                  externalName={motherBird?.maeId}
                                  genderHint="Fêmea" 
                                  onSelect={openBirdProfile} 
                                />
                              </div>
                            </div>

                          </div>

                        </div>
                      </div>
                    </div>

                    {/* RENDERIZADOR DE OUTRAS CATEGORIAS (Irmãos, Tios, Filhos, Sobrinhos, Netos) */}
                    {[
                      { key: 'Irmãos', title: '🐣 Irmãos & Meios-Irmãos', color: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
                      { key: 'Tios', title: '🐓 Tios & Tias', color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' },
                      { key: 'Filhos', title: '🐥 Filhos & Descendentes', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
                      { key: 'Sobrinhos', title: '🐤 Sobrinhos & Sobrinhas', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' },
                      { key: 'Netos', title: '🥚 Netos & Netas', color: 'border-teal-500/30 text-teal-400 bg-teal-500/10' },
                    ].map(cat => {
                      const list = groups[cat.key] || [];
                      if (list.length === 0) return null;

                      return (
                        <div key={cat.key} className="space-y-2 border-t border-theme-border/40 pt-4">
                          <p className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-between">
                            <span>{cat.title} ({list.length})</span>
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {list.map(rel => (
                              <div
                                key={rel.bird.id}
                                onClick={() => openBirdProfile(rel.bird.id)}
                                className="p-3 bg-theme-base/50 hover:bg-theme-primary/10 border border-theme-border/60 hover:border-theme-primary/30 rounded-xl cursor-pointer flex items-center gap-3 transition-all duration-300 shadow-sm"
                              >
                                <div className="w-10 h-10 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center overflow-hidden shrink-0">
                                  {(rel.bird.imagem || rel.bird.imagens?.[0]) ? (
                                    <img src={rel.bird.imagem || rel.bird.imagens?.[0]} className="w-full h-full object-cover" alt="" />
                                  ) : (
                                    <span className="text-lg">{rel.bird.sexo === 'Macho' ? '🐓' : '🐔'}</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-white text-xs truncate">{rel.bird.anilha}</p>
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${cat.color}`}>
                                      {rel.relationship} · {rel.geneticsSharePercent}%
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-theme-text-muted truncate mt-0.5">
                                    {rel.bird.nome ? `${rel.bird.nome} · ` : ''}{rel.bird.raca || 'Sem raça'} ({rel.bird.status})
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {relatedList.length === 0 && !bird.paiId && !bird.maeId && (
                      <div className="p-6 text-center text-theme-text-muted text-xs italic bg-theme-base/30 rounded-xl border border-theme-border/40 border-dashed">
                        Nenhum parente cadastrado para esta ave. A estrutura da árvore permanece disponível para quando você cadastrar ou vincular os pais.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
