import { useState } from 'react';
import { Camera, GitBranch, Activity, Info, Edit2, Syringe, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';
import { GenealogyTree } from '../GenealogyTree';

export function BirdProfileModal() {
  const { selectedBirdProfileId, closeModals, birds, openAddBirdModal, openBirdProfile } = useAppContext();
  const [treeExpanded, setTreeExpanded] = useState(true);

  if (!selectedBirdProfileId) return null;

  const bird = birds.find(b => b.id === selectedBirdProfileId);
  if (!bird) return null;

  // Count how many ancestors are registered
  const ancestorsCount = (() => {
    const visited = new Set<string>();
    const queue = [bird.paiId, bird.maeId].filter(Boolean) as string[];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      const b = birds.find(x => x.id === id);
      if (b) {
        if (b.paiId) queue.push(b.paiId);
        if (b.maeId) queue.push(b.maeId);
      }
    }
    return visited.size;
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90dvh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

        {/* ── Header ── */}
        <div className="px-5 py-4 border-b border-theme-border flex justify-between items-center bg-theme-base/50 shrink-0">
          <h3 className="font-bold text-lg text-white">Perfil da Ave</h3>
          <div className="flex items-center gap-4">
            <button onClick={() => openAddBirdModal('', bird.id)}
              className="flex items-center gap-2 text-sm font-bold text-theme-primary hover:text-orange-400 transition-colors">
              <Edit2 size={16}/> Editar
            </button>
            <button onClick={closeModals} className="text-theme-text-muted hover:text-white transition-colors text-lg leading-none">✕</button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Cover / hero */}
          <div className="relative h-44 bg-theme-base shrink-0">
            {bird.imagem ? (
              <div className="absolute inset-0 opacity-40"
                style={{ backgroundImage: `url(${bird.imagem})`, backgroundSize: 'cover', backgroundPosition: 'center' }}/>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <Camera size={64}/>
              </div>
            )}
            {/* Gradient overlay bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-theme-surface to-transparent"/>

            {/* Avatar + name */}
            <div className="absolute -bottom-10 left-5 flex items-end gap-3">
              <div className="w-20 h-20 rounded-2xl bg-theme-surface border-4 border-theme-surface overflow-hidden flex items-center justify-center text-3xl shadow-xl shrink-0">
                {bird.imagem
                  ? <img src={bird.imagem} alt={bird.anilha} className="w-full h-full object-cover"/>
                  : (bird.sexo === 'Macho' ? '🐓' : '🐔')
                }
              </div>
              <div className="mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-black text-white leading-tight">{bird.anilha}</h2>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase
                    ${bird.sexo === 'Macho' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'}`}>
                    {bird.sexo}
                  </span>
                </div>
                {bird.nome && <p className="text-sm text-theme-primary font-bold">{bird.nome}</p>}
              </div>
            </div>
          </div>

          {/* Info section */}
          <div className="p-5 pt-14 space-y-5">

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-xs text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-2">
                  <Info size={14}/> Raça / Genética
                </p>
                <p className="text-white font-bold">{bird.raca}</p>
              </div>
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-xs text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-2">
                  <GitBranch size={14}/> Baia Atual
                </p>
                <p className="text-theme-accent font-mono font-bold">{bird.baia}</p>
              </div>
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-xs text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-2">
                  <Activity size={14}/> Status
                </p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${bird.status === 'Ativo' ? 'bg-green-400' : 'bg-white/30'}`}/>
                  <p className={`font-bold ${bird.status === 'Ativo' ? 'text-green-400' : 'text-theme-text-muted'}`}>
                    {bird.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Vacinas */}
            {bird.vacinas && (
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-xs text-theme-text-muted font-bold uppercase mb-2 flex items-center gap-2">
                  <Syringe size={14} className="text-blue-400"/> Vacinas e Imunizações
                </p>
                <div className="flex flex-wrap gap-2">
                  {bird.vacinas.split(',').map((v, i) => {
                    const t = v.trim();
                    if (!t) return null;
                    return (
                      <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg text-sm font-medium">
                        {t}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Pedigree / Genealogy section ── */}
            <div className="border border-theme-border rounded-2xl overflow-hidden">
              {/* Section header */}
              <button
                onClick={() => setTreeExpanded(v => !v)}
                className="w-full bg-theme-base px-4 py-3 border-b border-theme-border flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GitBranch size={18} className="text-theme-primary"/>
                  <h4 className="font-bold text-white">Árvore Genealógica</h4>
                  {ancestorsCount > 0 && (
                    <span className="text-[10px] bg-amber-400/15 text-amber-300 border border-amber-400/20 px-2 py-0.5 rounded-full font-bold">
                      {ancestorsCount} ancestral{ancestorsCount !== 1 ? 'is' : ''} cadastrado{ancestorsCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {treeExpanded
                  ? <ChevronUp size={16} className="text-theme-text-muted"/>
                  : <ChevronDown size={16} className="text-theme-text-muted"/>
                }
              </button>

              {/* Tree body */}
              {treeExpanded && (
                <div className="p-4 bg-theme-base/20">
                  {/* Instruction tip */}
                  {ancestorsCount > 0 && (
                    <p className="text-[10px] text-white/25 text-center mb-3">
                      Toque em qualquer ave para ver detalhes • Deslize para navegar entre gerações
                    </p>
                  )}

                  <GenealogyTree
                    bird={bird}
                    birds={birds}
                    onOpenProfile={(id) => {
                      closeModals();
                      setTimeout(() => openBirdProfile(id), 50);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Bottom spacer for safe area */}
            <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }}/>
          </div>
        </div>
      </div>
    </div>
  );
}
