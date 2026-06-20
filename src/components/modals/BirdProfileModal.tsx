import { useState, useEffect } from 'react';
import { Camera, GitBranch, Activity, Info, Edit2, Syringe, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';

export function BirdProfileModal() {
  const { selectedBirdProfileId, closeModals, birds, openAddBirdModal } = useAppContext();
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  useEffect(() => {
    setCurrentImgIndex(0);
  }, [selectedBirdProfileId]);

  if (!selectedBirdProfileId) return null;

  const bird = birds.find(b => b.id === selectedBirdProfileId);

  if (!bird) {
    return null;
  }

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
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-[90dvh] md:h-auto md:max-h-[90vh] rounded-t-2xl md:rounded-2xl">
        <div className="p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/50 shrink-0">
          <h3 className="font-bold text-lg text-white">Perfil da Ave</h3>
          <div className="flex items-center gap-4">
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
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
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

          <div className="p-6 pt-16 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {/* Anilha */}
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-1.5">
                  🔍 Número da Anilha
                </p>
                <p className="text-sm text-white font-bold truncate">{bird.anilha}</p>
              </div>

              {/* Nome */}
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-1.5">
                  📝 Nome da Ave
                </p>
                <p className="text-sm text-white font-bold truncate">{bird.nome || 'Não informado'}</p>
              </div>

              {/* Sexo */}
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-1.5">
                  🐓 Gênero / Sexo
                </p>
                <p className={`text-sm font-bold truncate ${bird.sexo === 'Macho' ? 'text-blue-400' : 'text-pink-400'}`}>
                  {bird.sexo}
                </p>
              </div>

              {/* Raça */}
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-1.5">
                  <Info size={12} /> Raça
                </p>
                <p className="text-sm text-white font-bold truncate">{bird.raca || 'Não informada'}</p>
              </div>

              {/* Baia */}
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-1.5">
                  <GitBranch size={12} /> Local / Baia da Ave
                </p>
                <p className="text-sm text-theme-accent font-mono font-bold truncate">
                  {bird.baia && bird.baia !== 'ND' ? `Baia ${bird.baia}` : 'Não informada'}
                </p>
              </div>

              {/* Status */}
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-1.5">
                  <Activity size={12} /> Status / Finalidade
                </p>
                <p className="text-sm text-green-400 font-bold truncate">{bird.status || 'Não informado'}</p>
              </div>

              {/* Nascimento */}
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-1.5">
                  📅 Nascimento
                </p>
                <p className="text-sm text-white font-bold">
                  {bird.dataNascimento ? bird.dataNascimento.split('-').reverse().join('/') : 'Não informado'}
                </p>
              </div>

              {/* Peso */}
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-1.5">
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

            <div className="border border-theme-border rounded-xl overflow-hidden">
              <div className="bg-theme-base p-4 border-b border-theme-border">
                <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                  <GitBranch size={16} className="text-theme-primary" /> Ascendência / Pedigree
                </h4>
              </div>
              <div className="p-6 text-center text-theme-text-muted bg-theme-surface">
                {bird.origem === 'Cruzamento' ? (
                  <div className="space-y-2">
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-md text-xs font-bold uppercase border border-purple-500/30">Nascido de Cruzamento Local</span>
                    <p className="text-sm text-white mt-4 font-medium">Os pais foram preenchidos automaticamente na ficha da ave pelo registro do casal.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{bird.origem === 'Externo' ? 'Ave externa.' : 'Árvore genealógica'} (Pai e Mãe) não vinculada no módulo de casais.</p>
                    <button onClick={() => openAddBirdModal('', bird.id)} className="mt-4 px-4 py-2 border border-theme-border rounded-lg text-xs font-bold uppercase hover:border-theme-primary hover:text-theme-primary transition-colors">
                      Vincular / Editar Pai e Mãe
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
