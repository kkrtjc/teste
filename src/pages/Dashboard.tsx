import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bird, Baby, Sparkles, Heart, Award, Layers 
} from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

export function Dashboard() {
  const { birds, farmSettings, breeds, eggLots, meatLots, incubationLots } = useAppContext();
  const navigate = useNavigate();

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

    const totalLotes = (eggLots?.length || 0) + (meatLots?.length || 0) + (incubationLots?.length || 0);

    return {
      totalAves: total,
      totalMachos: machos,
      totalFemeas: femeas,
      totalPintinhos: pintinhos,
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full max-w-7xl">
        {/* Total Aves Card */}
        <div 
          onClick={() => navigate('/birds', { state: { tab: 'aves', filter: 'Total' } })}
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
          onClick={() => navigate('/birds', { state: { tab: 'racas' } })}
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
          onClick={() => navigate('/birds', { state: { tab: 'aves', filter: 'Macho' } })}
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
          onClick={() => navigate('/birds', { state: { tab: 'aves', filter: 'Fêmea' } })}
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
          onClick={() => navigate('/birds', { state: { tab: 'aves', filter: 'Crescimento' } })}
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
          onClick={() => navigate('/lots')}
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

    </div>
  );
}
