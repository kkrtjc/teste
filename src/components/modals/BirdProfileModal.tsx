import { useState, useEffect } from 'react';
import { Camera, GitBranch, Activity, Info, Edit2, Syringe, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { calculateExactAge } from '../../lib/utils';
import { calculateInbreedingCoefficient, findRelatedBirds } from '../../lib/genealogy';

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

            {/* ── ASCENDÊNCIA, PEDIGREE & CONSANGUINIDADE AVANÇADA ── */}
            {(() => {
              const inbreedingF = calculateInbreedingCoefficient(bird.id, birds);
              const relatedList = findRelatedBirds(bird, birds);

              // Agrupa os parentes por categoria
              const groups: Record<string, typeof relatedList> = {
                'Pais': relatedList.filter(r => r.relationshipGroup === 'Pais'),
                'Irmãos': relatedList.filter(r => r.relationshipGroup === 'Irmãos'),
                'Avós': relatedList.filter(r => r.relationshipGroup === 'Avós'),
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
                <div className="border border-theme-border rounded-2xl overflow-hidden bg-theme-surface/50 shadow-lg">
                  {/* Banner de Header da Genealogia */}
                  <div className="bg-theme-base p-4 border-b border-theme-border flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <h4 className="font-black text-white flex items-center gap-2 text-base">
                        <GitBranch size={18} className="text-theme-primary" /> Genealogia &amp; Pedigree Completo
                      </h4>
                      <p className="text-xs text-theme-text-muted mt-0.5">
                        Mapeamento automático de parentes e coeficientes genéticos
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

                    {/* SEÇÕES DE PARENTES MAPEADOS */}

                    {/* 1. PAIS */}
                    <div className="space-y-2">
                      <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="text-base">👪</span> Pais Diretos (50% de DNA)
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Pai */}
                        <div>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">Pai (Reprodutor)</p>
                          {bird.paiId ? (
                            bird.isPaiExterno ? (
                              <div className="p-3 bg-theme-base/40 border border-theme-border rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full border border-theme-border flex items-center justify-center text-lg bg-theme-surface shrink-0">🐓</div>
                                <div className="min-w-0">
                                  <p className="font-bold text-white text-sm truncate">{bird.paiId}</p>
                                  <p className="text-[10px] text-orange-400 font-bold uppercase">Externo / Fora do Criatório</p>
                                </div>
                              </div>
                            ) : (() => {
                              const fatherBird = birds.find(b => b.id === bird.paiId);
                              return fatherBird ? (
                                <div 
                                  onClick={() => openBirdProfile(fatherBird.id)}
                                  className="p-3 bg-theme-base/60 hover:bg-theme-primary/10 border border-theme-border hover:border-theme-primary/30 rounded-xl cursor-pointer flex items-center gap-3 transition-all duration-300 shadow-sm"
                                >
                                  <div className="w-10 h-10 rounded-full border-2 border-blue-500 bg-theme-surface flex items-center justify-center overflow-hidden shrink-0">
                                    {fatherBird.imagem ? <img src={fatherBird.imagem} className="w-full h-full object-cover" alt="" /> : <span className="text-lg">🐓</span>}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-white text-sm truncate">{fatherBird.anilha}</p>
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400">Pai · 50%</span>
                                    </div>
                                    <p className="text-xs text-theme-text-muted truncate">{fatherBird.nome || 'Sem nome'}</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 bg-theme-base/20 border border-theme-border border-dashed rounded-xl text-theme-text-muted text-xs italic">
                                  ID: {bird.paiId} (Não encontrado)
                                </div>
                              );
                            })()
                          ) : (
                            <div className="p-3 bg-theme-base/20 border border-theme-border border-dashed rounded-xl text-theme-text-muted text-xs italic">
                              Pai não cadastrado
                            </div>
                          )}
                        </div>

                        {/* Mãe */}
                        <div>
                          <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-1">Mãe (Matriz)</p>
                          {bird.maeId ? (
                            bird.isMaeExterno ? (
                              <div className="p-3 bg-theme-base/40 border border-theme-border rounded-xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full border border-theme-border flex items-center justify-center text-lg bg-theme-surface shrink-0">🐔</div>
                                <div className="min-w-0">
                                  <p className="font-bold text-white text-sm truncate">{bird.maeId}</p>
                                  <p className="text-[10px] text-orange-400 font-bold uppercase">Externa / Fora do Criatório</p>
                                </div>
                              </div>
                            ) : (() => {
                              const motherBird = birds.find(b => b.id === bird.maeId);
                              return motherBird ? (
                                <div 
                                  onClick={() => openBirdProfile(motherBird.id)}
                                  className="p-3 bg-theme-base/60 hover:bg-theme-primary/10 border border-theme-border hover:border-theme-primary/30 rounded-xl cursor-pointer flex items-center gap-3 transition-all duration-300 shadow-sm"
                                >
                                  <div className="w-10 h-10 rounded-full border-2 border-pink-500 bg-theme-surface flex items-center justify-center overflow-hidden shrink-0">
                                    {motherBird.imagem ? <img src={motherBird.imagem} className="w-full h-full object-cover" alt="" /> : <span className="text-lg">🐔</span>}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-white text-sm truncate">{motherBird.anilha}</p>
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-400">Mãe · 50%</span>
                                    </div>
                                    <p className="text-xs text-theme-text-muted truncate">{motherBird.nome || 'Sem nome'}</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-3 bg-theme-base/20 border border-theme-border border-dashed rounded-xl text-theme-text-muted text-xs italic">
                                  ID: {bird.maeId} (Não encontrada)
                                </div>
                              );
                            })()
                          ) : (
                            <div className="p-3 bg-theme-base/20 border border-theme-border border-dashed rounded-xl text-theme-text-muted text-xs italic">
                              Mãe não cadastrada
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RENDERIZADOR DE OUTRAS CATEGORIAS (Irmãos, Avós, Tios, Sobrinhos, Netos, Filhos) */}
                    {[
                      { key: 'Irmãos', title: '🐣 Irmãos & Meios-Irmãos', color: 'border-purple-500/30 text-purple-400 bg-purple-500/10' },
                      { key: 'Avós', title: '👴 Avós & Avôs', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
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
                        Nenhum parente ou genealogia cadastrado para esta ave. Use o botão &quot;Editar Pais&quot; para definir a origem genética.
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
