import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bird, Baby, Sparkles, Heart, Award, Layers 
} from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { useHaptics } from '../hooks/useHaptics';

export function Dashboard() {
  const { birds, farmSettings, breeds, eggLots, meatLots, incubationLots, isReady } = useAppContext();
  const navigate = useNavigate();
  const { triggerLight } = useHaptics();

  const stats = useMemo(() => {
    let total = 0;
    let machos = 0;
    let femeas = 0;
    let pintinhos = 0;
    
    birds.forEach(b => {
      if (b.status !== 'Vendido' && b.status !== 'Faleceu') {
        total++;
        if (b.sexo === 'Macho') machos++;
        if (b.sexo === 'Fêmea') femeas++;
      }
      if (b.status === 'Crescimento' || (b as any).status === 'Pintinho') {
        pintinhos++;
      }
    });

    // Soma as aves avulsas / não cadastradas presentes em lotes ativos
    let avulsasPostura = 0;
    (eggLots || []).forEach(l => {
      if (l.status !== 'Encerrado') {
        const t = Math.max(l.qtdFemeas || 0, l.femeasIds?.length || 0);
        const cad = l.femeasIds?.length || 0;
        avulsasPostura += Math.max(0, t - cad);
      }
    });

    let avulsasOutros = 0;
    let avulsasPintinhos = 0;
    (meatLots || []).forEach(l => {
      if (l.status !== 'Abatido') {
        const t = Math.max(l.qtdAves || 0, l.avesIds?.length || 0);
        const cad = l.avesIds?.length || 0;
        const diff = Math.max(0, t - cad);
        if (l.id.startsWith('chick-')) {
          avulsasPintinhos += diff;
        } else {
          avulsasOutros += diff;
        }
      }
    });

    const totalLotes = (eggLots?.length || 0) + (meatLots?.length || 0) + (incubationLots?.length || 0);

    return {
      totalAves: total + avulsasPostura + avulsasOutros + avulsasPintinhos,
      totalMachos: machos,
      totalFemeas: femeas + avulsasPostura,
      totalPintinhos: pintinhos + avulsasPintinhos,
      totalLotes: totalLotes
    };
  }, [birds, eggLots, meatLots, incubationLots]);

  return (
    <div className="flex flex-col items-center max-w-7xl mx-auto w-full space-y-6 animate-fade-in overflow-x-hidden pb-6">

      {/* ── Farm photo + name ── */}
      <div className="flex flex-col items-center mt-4 space-y-3">
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-theme-primary
                        overflow-hidden shadow-xl bg-theme-surface flex items-center justify-center">
          {farmSettings.photo
            ? <img src={farmSettings.photo} alt="Criatório" className="w-full h-full object-cover" />
            : <span className="text-5xl">🐓</span>}
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white text-center">
          {farmSettings.name || 'Meu Criatório'}
        </h2>
      </div>

      {/* ── Stats grid ── */}
      {!isReady ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full max-w-7xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 rounded-2xl bg-theme-surface/70 border border-theme-border/40 flex flex-col justify-between h-[100px] animate-pulse">
              <div className="flex justify-between items-start">
                <div className="w-10 h-7 bg-white/10 rounded-lg" />
                <div className="w-7 h-7 bg-white/5 rounded-lg" />
              </div>
              <div className="w-20 h-3 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full max-w-7xl">
          {/* Total Aves Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'aves', filter: 'Total' } }); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{stats.totalAves}</span>
              <div className="p-1.5 rounded-lg bg-theme-primary/10 text-theme-primary group-hover:scale-110 transition-transform">
                <Bird size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Total de Aves</p>
          </div>

          {/* Raças Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'racas' } }); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-purple-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{breeds.length}</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                <Award size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Raças Cadastradas</p>
          </div>

          {/* Machos Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'aves', filter: 'Macho' } }); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-blue-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{stats.totalMachos}</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <Sparkles size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Machos</p>
          </div>

          {/* Fêmeas Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'aves', filter: 'Fêmea' } }); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-pink-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{stats.totalFemeas}</span>
              <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 group-hover:scale-110 transition-transform">
                <Heart size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Fêmeas</p>
          </div>

          {/* Total de Pintinhos Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'aves', filter: 'Crescimento' } }); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-emerald-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{stats.totalPintinhos}</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <Baby size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Total de Pintinhos</p>
          </div>

          {/* Lotes Cadastrados Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/lots'); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-amber-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{stats.totalLotes}</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <Layers size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Lotes Cadastrados</p>
          </div>
        </div>
      )}

    </div>
  );
}
