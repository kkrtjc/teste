import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronRight, Bird, Users, Baby } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

/* ── helpers ── */
const statusColor: Record<string, string> = {
  'Adulto': 'text-emerald-400',
  'Reprodutor': 'text-blue-400',
  'Matriz': 'text-pink-400',
  'Crescimento': 'text-green-400',
  'Vendido': 'text-amber-400',
  'Faleceu': 'text-red-400',
};

export function Dashboard() {
  const { birds, couples, coupleEggs, openBirdProfile, farmSettings, breeds } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm]   = useState('');
  const [showResults, setShowResults] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* fechar ao clicar fora */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const term = searchTerm.trim().toLowerCase();
  const hasSearch = term.length > 0;

  /* ── resultados ── */
  const birdResults  = hasSearch ? birds.filter(b =>
    b.status !== 'Vendido' && b.status !== 'Faleceu' && (
      b.nome?.toLowerCase().includes(term) ||
      b.anilha?.toLowerCase().includes(term)
    )
  ) : [];

  /* busca por baia: agrupa todas as aves */
  const baySet = new Set<string>();
  if (hasSearch) {
    birds.filter(b => b.baia?.toLowerCase().includes(term)).forEach(b => baySet.add(b.baia));
  }
  const bayResults = Array.from(baySet);

  const totalAves   = birds.filter(b => b.status !== 'Vendido' && b.status !== 'Faleceu').length;
  const totalMachos = birds.filter(b => b.sexo === 'Macho' && b.status !== 'Vendido' && b.status !== 'Faleceu').length;
  const totalFemeas = birds.filter(b => b.sexo === 'Fêmea' && b.status !== 'Vendido' && b.status !== 'Faleceu').length;
  const totalCrescimento = birds.filter(b => b.status === 'Crescimento').length;
  const totalEclosao     = (coupleEggs || []).filter(e => e.status === 'Em Choco').length;

  /* ── info de uma baia ── */
  const getBayInfo = (baia: string) => {
    const avesNaBaia   = birds.filter(b => b.baia === baia);
    const machos       = avesNaBaia.filter(b => b.sexo === 'Macho');
    const femeas       = avesNaBaia.filter(b => b.sexo === 'Fêmea');
    const pintinhos    = avesNaBaia.filter(b => b.origem === 'Cruzamento');

    // casal vinculado (se tem pintinhos)
    const casalId = pintinhos[0]?.casalId;
    const casal   = casalId ? couples.find(c => c.id === casalId) : null;
    const macho   = casal   ? birds.find(b => b.id === casal.machoId) : null;
    const femea   = casal   ? birds.find(b => b.id === (casal.femeaIds?.[0] || casal.femeaId)) : null;

    // status dominante
    const statusList = avesNaBaia.map(b => b.status).filter(Boolean);
    const dominantStatus = statusList.length > 0
      ? statusList.sort((a, b) =>
          statusList.filter(s => s === b).length - statusList.filter(s => s === a).length
        )[0]
      : '';

    return { avesNaBaia, machos, femeas, pintinhos, casal, macho, femea, dominantStatus };
  };

  return (
    <div className="flex flex-col items-center p-4 space-y-6 animate-fade-in">

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

      {/* ── Stats grid 3x2 ── */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {/* Total Aves Card */}
        <div 
          onClick={() => navigate('/birds', { state: { tab: 'aves', filter: 'Total' } })}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/30 border border-theme-border/50 rounded-2xl py-3 text-center cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <p className="text-2xl font-black text-theme-primary">{totalAves}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mt-0.5">Total de Aves</p>
        </div>

        {/* Raças Card */}
        <div 
          onClick={() => navigate('/birds', { state: { tab: 'racas' } })}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/30 border border-theme-border/50 rounded-2xl py-3 text-center cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <p className="text-2xl font-black text-amber-400">{breeds.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mt-0.5">Raças Cadastradas</p>
        </div>

        {/* Machos Card */}
        <div 
          onClick={() => navigate('/birds', { state: { tab: 'aves', filter: 'Macho' } })}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/30 border border-theme-border/50 rounded-2xl py-3 text-center cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <p className="text-2xl font-black text-blue-400">{totalMachos}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mt-0.5">Machos</p>
        </div>

        {/* Fêmeas Card */}
        <div 
          onClick={() => navigate('/birds', { state: { tab: 'aves', filter: 'Fêmea' } })}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/30 border border-theme-border/50 rounded-2xl py-3 text-center cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <p className="text-2xl font-black text-pink-400">{totalFemeas}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mt-0.5">Fêmeas</p>
        </div>

        {/* Aves em Crescimento Card */}
        <div 
          onClick={() => navigate('/birds', { state: { tab: 'aves', filter: 'Crescimento' } })}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/30 border border-theme-border/50 rounded-2xl py-3 text-center cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <p className="text-2xl font-black text-green-400">{totalCrescimento}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mt-0.5">Aves em Crescimento</p>
        </div>

        {/* Ovos em Eclosão Card */}
        <div 
          onClick={() => navigate('/lots', { state: { tab: 'pintinhos' } })}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/30 border border-theme-border/50 rounded-2xl py-3 text-center cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <p className="text-2xl font-black text-yellow-400">{totalEclosao}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mt-0.5">Ovos em Eclosão</p>
        </div>
      </div>

      {/* ── Search ── */}
      <div id="search-bar-container" className="w-full max-w-sm relative" ref={wrapperRef}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-muted" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Nome, anilha ou número da baia…"
            className="w-full bg-theme-surface border border-theme-border/50 text-white
                       pl-11 pr-10 py-3.5 rounded-full focus:outline-none focus:border-theme-primary
                       transition-colors shadow-lg text-sm placeholder-theme-text-muted/50 shadow-inner"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setShowResults(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Search Results Area (In-Line, replacing overlay) ── */}
      {showResults && hasSearch && (
        <div className="w-full max-w-sm bg-theme-surface border border-theme-border/50 rounded-2xl shadow-premium p-3.5 space-y-4 animate-fade-in z-10">
          {/* Resultados de aves */}
          {birdResults.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider px-1 mb-2 flex items-center gap-1">
                <Bird size={10} /> Aves encontradas
              </p>
              <div className="space-y-2">
                {birdResults.map(bird => (
                  <div key={bird.id}
                       onClick={() => { openBirdProfile(bird.id); setShowResults(false); }}
                       className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer
                                  hover:bg-theme-primary/10 border border-transparent
                                  hover:border-theme-primary/30 transition-all bg-theme-surface/20 animate-fade-in">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-theme-base flex-shrink-0
                                    flex items-center justify-center border border-theme-border/30">
                      {bird.imagem
                        ? <img src={bird.imagem} className="w-full h-full object-cover" alt="" loading="lazy" />
                        : <span className="text-xl">{bird.sexo === 'Macho' ? '🐓' : '🐔'}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm truncate">{bird.anilha}</p>
                      <p className="text-xs text-theme-text-muted truncate">
                        {bird.nome || 'Sem nome'} · {bird.raca}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-theme-text-muted">
                        {bird.baia && bird.baia !== 'ND' ? `Baia ${bird.baia}` : 'Sem Baia'}
                      </p>
                      <p className={`text-[10px] font-bold ${statusColor[bird.status] || 'text-theme-text-muted'}`}>
                        {bird.status}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-theme-text-muted flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resultados de baia */}
          {bayResults.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider px-1 mb-2">
                📦 Baias encontradas
              </p>
              <div className="space-y-3">
                {bayResults.map(baia => {
                  const info = getBayInfo(baia);
                  return (
                    <div key={baia}
                         className="p-3 rounded-xl bg-theme-base/60 border border-theme-border/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-white text-base">Baia {baia}</span>
                        {info.dominantStatus && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-theme-surface
                                           ${statusColor[info.dominantStatus] || 'text-theme-text-muted'}`}>
                            {info.dominantStatus}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { icon: <Bird size={12}/>, label: 'Total',    value: info.avesNaBaia.length, color: 'text-white' },
                          { icon: '🐓',              label: 'Machos',   value: info.machos.length,     color: 'text-blue-400' },
                          { icon: '🐔',              label: 'Fêmeas',   value: info.femeas.length,     color: 'text-pink-400' },
                          { icon: <Baby size={12}/>, label: 'Pintinhos',value: info.pintinhos.length,  color: 'text-yellow-400' },
                        ].map(s => (
                          <div key={s.label} className="text-center bg-theme-surface rounded-lg py-1.5 px-1">
                            <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                            <div className="text-[9px] text-theme-text-muted font-bold">{s.label}</div>
                          </div>
                        ))}
                      </div>
                      {info.pintinhos.length > 0 && info.casal && (
                        <div className="flex items-center gap-2 text-xs p-2 bg-theme-surface rounded-lg">
                          <Users size={12} className="text-theme-primary flex-shrink-0" />
                          <span className="text-theme-text-muted">Casal pai:</span>
                          <span className="text-white font-bold truncate">
                            {info.macho?.anilha || '?'} × {info.femea?.anilha || '?'}
                          </span>
                        </div>
                      )}
                      {info.avesNaBaia.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-theme-text-muted font-bold uppercase">Aves na baia</p>
                          <div className="flex flex-wrap gap-1.5">
                            {info.avesNaBaia.slice(0, 8).map(b => (
                              <button key={b.id}
                                      onClick={() => { openBirdProfile(b.id); setShowResults(false); }}
                                      className="flex items-center gap-1 text-xs bg-theme-surface hover:bg-theme-primary/20
                                                 border border-theme-border/40 hover:border-theme-primary/50
                                                 rounded-lg px-2 py-1 transition-all">
                                <span>{b.sexo === 'Macho' ? '🐓' : '🐔'}</span>
                                <span className="text-white font-bold">{b.anilha}</span>
                              </button>
                            ))}
                            {info.avesNaBaia.length > 8 && (
                              <span className="text-xs text-theme-text-muted self-center">
                                +{info.avesNaBaia.length - 8} mais
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nenhum resultado */}
          {birdResults.length === 0 && bayResults.length === 0 && (
            <div className="py-6 text-center text-theme-text-muted text-sm">
              Nenhum resultado para "{searchTerm}"
            </div>
          )}
        </div>
      )}

      {/* ── Recent Birds Section ── */}
      {!hasSearch && birds.length > 0 && (
        <div className="w-full max-w-sm space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-theme-text-muted uppercase tracking-wider">Aves Recentes</h3>
            <button onClick={() => navigate('/birds')} className="text-xs font-bold text-theme-primary hover:underline">Ver todas</button>
          </div>
          <div className="flex flex-col space-y-2.5">
            {birds.filter(b => b.status !== 'Vendido' && b.status !== 'Faleceu').slice(-4).reverse().map(bird => (
              <div
                key={bird.id}
                onClick={() => openBirdProfile(bird.id)}
                className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:border-theme-primary/50 transition-all border border-theme-border/50 bg-theme-surface/50 shadow-premium w-full group"
              >
                {/* Foto quadrada limpa, sem sobreposição */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-theme-base flex-shrink-0 flex items-center justify-center border border-theme-border/30">
                  {bird.imagem ? (
                    <img src={bird.imagem} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={bird.anilha} loading="lazy" />
                  ) : (
                    <span className="text-3xl group-hover:scale-105 transition-transform duration-500 select-none opacity-40">
                      {bird.sexo === 'Macho' ? '🐓' : '🐔'}
                    </span>
                  )}
                </div>

                {/* Detalhes à direita */}
                <div className="flex-1 min-w-0 flex flex-col justify-between h-16 py-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-black text-white text-sm truncate group-hover:text-theme-primary transition-colors">
                      {bird.anilha}
                    </h4>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border
                      ${bird.sexo === 'Macho' ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' : 'bg-pink-500/15 text-pink-400 border-pink-500/25'}`}>
                      {bird.sexo === 'Macho' ? 'Macho' : 'Fêmea'}
                    </span>
                  </div>
                  
                  <p className="text-[11px] text-theme-text-muted truncate">
                    {bird.nome || 'Sem nome'}
                  </p>

                  <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                    <span className="text-theme-text-muted truncate max-w-[120px]">
                      {bird.raca}
                    </span>
                    <span className={`font-bold shrink-0 ${statusColor[bird.status] || 'text-theme-text-muted'}`}>
                      {bird.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
