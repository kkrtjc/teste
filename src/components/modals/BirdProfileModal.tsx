import { Camera, GitBranch, Activity, Info, Edit2, Syringe } from 'lucide-react';
import { useAppContext } from '../../lib/AppContext';

export function BirdProfileModal() {
  const { selectedBirdProfileId, closeModals, birds, openAddBirdModal } = useAppContext();

  if (!selectedBirdProfileId) return null;

  const bird = birds.find(b => b.id === selectedBirdProfileId);

  if (!bird) {
    return null;
  }

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
          {/* Cover / Header section */}
          <div className="relative h-48 bg-theme-base">
            {bird.imagem ? (
              <div 
                className="absolute inset-0 opacity-40"
                style={{ backgroundImage: `url(${bird.imagem})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <Camera size={64} />
              </div>
            )}
            
            <div className="absolute -bottom-12 left-6 flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-theme-surface border-4 border-theme-base overflow-hidden flex items-center justify-center text-4xl shadow-xl">
                {bird.imagem ? (
                  <img src={bird.imagem} alt={bird.nome} className="w-full h-full object-cover" />
                ) : (
                  bird.sexo === 'Macho' ? '🐓' : '🐔'
                )}
              </div>
              <div className="mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-3xl font-black text-white">{bird.anilha}</h2>
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                    bird.sexo === 'Macho' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                  }`}>
                    {bird.sexo}
                  </span>
                </div>
                {bird.nome && <p className="text-lg text-theme-primary font-bold">{bird.nome}</p>}
              </div>
            </div>
          </div>

          <div className="p-6 pt-16 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-xs text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-2">
                  <Info size={14} /> Raça / Genética
                </p>
                <p className="text-white font-bold">{bird.raca}</p>
              </div>
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-xs text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-2">
                  <GitBranch size={14} /> Baia Atual
                </p>
                <p className="text-theme-accent font-mono font-bold">{bird.baia}</p>
              </div>
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-xs text-theme-text-muted font-bold uppercase mb-1 flex items-center gap-2">
                  <Activity size={14} /> Status
                </p>
                <p className="text-green-400 font-bold">{bird.status}</p>
              </div>
            </div>

            {bird.vacinas && (
              <div className="bg-theme-base/50 border border-theme-border p-4 rounded-xl">
                <p className="text-xs text-theme-text-muted font-bold uppercase mb-2 flex items-center gap-2">
                  <Syringe size={14} className="text-blue-400" /> Vacinas e Imunizações Aplicadas
                </p>
                <div className="flex flex-wrap gap-2">
                  {bird.vacinas.split(',').map((vacina, i) => {
                    const trimmed = vacina.trim();
                    if (!trimmed) return null;
                    return (
                      <span key={i} className="px-3 py-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg text-sm font-medium">
                        {trimmed}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="border border-theme-border rounded-xl overflow-hidden">
              <div className="bg-theme-base p-4 border-b border-theme-border">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <GitBranch size={18} className="text-theme-primary" /> Informações de Pedigree
                </h4>
              </div>
              <div className="p-6 text-center text-theme-text-muted">
                <p className="text-sm">Árvore genealógica (Pai e Mãe) não vinculada ou dados importados.</p>
                <button className="mt-4 px-4 py-2 border border-theme-border rounded-lg text-sm hover:border-theme-primary hover:text-theme-primary transition-colors">
                  Vincular Ascendentes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
