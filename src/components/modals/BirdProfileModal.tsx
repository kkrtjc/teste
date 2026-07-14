import { useState, useEffect } from 'react';
import { Camera, GitBranch, Activity, Info, Edit2, Syringe, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';

function calculateExactAge(birthDateStr: string): string {
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  
  birthDate.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  
  let diffTime = today.getTime() - birthDate.getTime();
  let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Data futura';
  if (diffDays < 30) return `${diffDays} dia${diffDays !== 1 ? 's' : ''}`;
  
  const diffMonths = Math.floor(diffDays / 30.43);
  if (diffMonths < 12) {
    const remainingDays = Math.floor(diffDays % 30.43);
    return `${diffMonths} mês${diffMonths !== 1 ? 'es' : ''} ${remainingDays > 0 ? `e ${remainingDays} dia${remainingDays !== 1 ? 's' : ''}` : ''}`;
  }
  
  const diffYears = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;
  return `${diffYears} ano${diffYears !== 1 ? 's' : ''} ${remainingMonths > 0 ? `e ${remainingMonths} mês${remainingMonths !== 1 ? 'es' : ''}` : ''}`;
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
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/85 animate-fade-in">
      <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-[90dvh] md:h-auto md:max-h-[90vh] rounded-t-2xl md:rounded-2xl">
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
        
        <div className="flex-1 overflow-y-auto">
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

            {/* Ascendência / Pedigree */}
            <div className="border border-theme-border rounded-xl overflow-hidden bg-theme-surface/50">
              <div className="bg-theme-base p-4 border-b border-theme-border flex justify-between items-center">
                <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                  <GitBranch size={16} className="text-theme-primary" /> Ascendência &amp; Pedigree
                </h4>
                <button 
                  onClick={() => openAddBirdModal('', bird.id)}
                  className="text-xs text-theme-primary hover:text-orange-400 font-bold uppercase transition-colors"
                >
                  Editar Genealogia
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* Parents Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Father (Pai) */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Pai (Reprodutor)</p>
                    {bird.paiId ? (
                      bird.isPaiExterno ? (
                        <div className="p-3 bg-theme-base/40 border border-theme-border rounded-xl flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-theme-border flex items-center justify-center text-lg bg-theme-surface shrink-0 shadow-inner">
                            🐓
                          </div>
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
                            className="p-3 bg-theme-base/60 hover:bg-theme-primary/10 border border-theme-border hover:border-theme-primary/30 rounded-xl cursor-pointer flex items-center gap-3 transition-all duration-300"
                          >
                            <div className="w-10 h-10 rounded-full border-2 border-blue-500 bg-theme-surface flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                              {fatherBird.imagem ? (
                                <img src={fatherBird.imagem} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <span className="text-lg">🐓</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-white text-sm truncate">{fatherBird.anilha}</p>
                              <p className="text-xs text-theme-text-muted truncate">{fatherBird.nome || 'Sem nome'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-theme-base/20 border border-theme-border border-dashed rounded-xl flex items-center gap-2 text-theme-text-muted text-xs italic">
                            ID: {bird.paiId} (Não encontrado no plantel)
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-3 bg-theme-base/20 border border-theme-border border-dashed rounded-xl flex items-center justify-center text-theme-text-muted text-xs italic min-h-[66px]">
                        Pai não cadastrado
                      </div>
                    )}
                  </div>

                  {/* Mother (Mãe) */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">Mãe (Matriz)</p>
                    {bird.maeId ? (
                      bird.isMaeExterno ? (
                        <div className="p-3 bg-theme-base/40 border border-theme-border rounded-xl flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border border-theme-border flex items-center justify-center text-lg bg-theme-surface shrink-0 shadow-inner">
                            🐔
                          </div>
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
                            className="p-3 bg-theme-base/60 hover:bg-theme-primary/10 border border-theme-border hover:border-theme-primary/30 rounded-xl cursor-pointer flex items-center gap-3 transition-all duration-300"
                          >
                            <div className="w-10 h-10 rounded-full border-2 border-pink-500 bg-theme-surface flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                              {motherBird.imagem ? (
                                <img src={motherBird.imagem} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <span className="text-lg">🐔</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-white text-sm truncate">{motherBird.anilha}</p>
                              <p className="text-xs text-theme-text-muted truncate">{motherBird.nome || 'Sem nome'}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-theme-base/20 border border-theme-border border-dashed rounded-xl flex items-center gap-2 text-theme-text-muted text-xs italic">
                            ID: {bird.maeId} (Não encontrada no plantel)
                          </div>
                        );
                      })()
                    ) : (
                      <div className="p-3 bg-theme-base/20 border border-theme-border border-dashed rounded-xl flex items-center justify-center text-theme-text-muted text-xs italic min-h-[66px]">
                        Mãe não cadastrada
                      </div>
                    )}
                  </div>
                </div>

                {/* Children Section */}
                <div className="border-t border-theme-border/40 pt-4 space-y-2">
                  {(() => {
                    const children = birds.filter(b => b.paiId === bird.id || b.maeId === bird.id);
                    return (
                      <>
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                          Filhotes Mapeados ({children.length})
                        </p>
                        {children.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {children.map(child => (
                              <div
                                key={child.id}
                                onClick={() => openBirdProfile(child.id)}
                                className="p-2.5 bg-theme-base/40 hover:bg-theme-primary/10 border border-theme-border/50 hover:border-theme-primary/30 rounded-xl cursor-pointer flex items-center gap-2.5 transition-all duration-300"
                              >
                                <div className="w-8 h-8 rounded-full bg-theme-surface border border-theme-border flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                  {child.imagem ? (
                                    <img src={child.imagem} className="w-full h-full object-cover" alt="" />
                                  ) : (
                                    child.sexo === 'Macho' ? '🐓' : '🐔'
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-white text-xs truncate">{child.anilha}</p>
                                  <p className="text-[9px] text-theme-text-muted truncate">{child.nome || 'Sem nome'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-theme-text-muted italic py-1">Nenhum filhote registrado descendente desta ave.</p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
