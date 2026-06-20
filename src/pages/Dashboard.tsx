import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronRight, Bird, Users, Egg, Beef, Baby } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

/* ── helpers ── */
const statusColor: Record<string, string> = {
  'Reprodução': 'text-pink-400',
  'Cruza':      'text-pink-400',
  'Engorda':    'text-orange-400',
  'Crescimento':'text-green-400',
  'Postura':    'text-yellow-400',
  'Ativo':      'text-emerald-400',
};

export function Dashboard() {
  const { birds, couples, eggLots, meatLots, openBirdProfile, farmSettings } = useAppContext();
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
    b.nome?.toLowerCase().includes(term) ||
    b.anilha?.toLowerCase().includes(term)
  ) : [];

  /* busca por baia: agrupa todos os tipos */
  const baySet = new Set<string>();
  if (hasSearch) {
    birds    .filter(b => b.baia?.toLowerCase().includes(term)).forEach(b => baySet.add(b.baia));
    eggLots  .filter(l => l.baia.toLowerCase().includes(term)).forEach(l => baySet.add(l.baia));
    meatLots .filter(l => l.baia.toLowerCase().includes(term)).forEach(l => baySet.add(l.baia));
  }
  const bayResults = Array.from(baySet);

  const totalAves   = birds.length;
  const totalMachos = birds.filter(b => b.sexo === 'Macho').length;
  const totalFemeas = birds.filter(b => b.sexo === 'Fêmea').length;

  /* ── info de uma baia ── */
  const getBayInfo = (baia: string) => {
    const avesNaBaia   = birds.filter(b => b.baia === baia);
    const machos       = avesNaBaia.filter(b => b.sexo === 'Macho');
    const femeas       = avesNaBaia.filter(b => b.sexo === 'Fêmea');
    const pintinhos    = avesNaBaia.filter(b => b.origem === 'Cruzamento');
    const eggLot       = eggLots.find(l => l.baia === baia);
    const meatLot      = meatLots.find(l => l.baia === baia);

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

    return { avesNaBaia, machos, femeas, pintinhos, eggLot, meatLot, casal, macho, femea, dominantStatus };
  };

  return (
    <div className="flex flex-col items-center h-full p-4 space-y-6 animate-fade-in">

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

      {/* ── Stats row ── */}
      <div className="flex gap-3 w-full max-w-sm">
        {[
          { label: 'Total', value: totalAves,   color: 'text-theme-primary' },
          { label: 'Machos', value: totalMachos, color: 'text-blue-400' },
          { label: 'Fêmeas', value: totalFemeas, color: 'text-pink-400' },
        ].map(s => (
          <div key={s.label}
               className="flex-1 bg-theme-surface border border-theme-border/50 rounded-2xl py-3 text-center">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <div className="w-full max-w-sm relative" ref={wrapperRef}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-text-muted" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Nome, anilha ou número da baia…"
            className="w-full bg-theme-surface border border-theme-border/50 text-white
                       pl-11 pr-10 py-3.5 rounded-xl focus:outline-none focus:border-theme-primary
                       transition-colors shadow-lg text-sm placeholder-theme-text-muted/50"
          />
          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setShowResults(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-white transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Dropdown de resultados */}
        {showResults && hasSearch && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-theme-surface border
                          border-theme-primary/30 rounded-xl shadow-2xl z-50
                          max-h-[70vh] overflow-y-auto p-3 space-y-4">

            {/* Resultados de aves */}
            {birdResults.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider px-1 mb-2 flex items-center gap-1">
                  <Bird size={10} /> Aves encontradas
                </p>
                <div className="space-y-1.5">
                  {birdResults.map(bird => (
                    <div key={bird.id}
                         onClick={() => { openBirdProfile(bird.id); setShowResults(false); }}
                         className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer
                                    hover:bg-theme-primary/10 border border-transparent
                                    hover:border-theme-primary/30 transition-all">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-theme-base flex-shrink-0
                                      flex items-center justify-center">
                        {bird.imagem
                          ? <img src={bird.imagem} className="w-full h-full object-cover" alt="" />
                          : <span className="text-xl">{bird.sexo === 'Macho' ? '🐓' : '🐔'}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{bird.anilha}</p>
                        <p className="text-xs text-theme-text-muted truncate">
                          {bird.nome || 'Sem nome'} · {bird.raca}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-theme-text-muted">Baia {bird.baia}</p>
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

                        {/* Header da baia */}
                        <div className="flex items-center justify-between">
                          <span className="font-black text-white text-base">Baia {baia}</span>
                          {info.dominantStatus && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-theme-surface
                                             ${statusColor[info.dominantStatus] || 'text-theme-text-muted'}`}>
                              {info.dominantStatus}
                            </span>
                          )}
                        </div>

                        {/* Contagem */}
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

                        {/* Lot info */}
                        {info.eggLot && (
                          <div className="flex items-center gap-2 text-xs text-yellow-400">
                            <Egg size={12} /> Lote postura ativo · {info.eggLot.femeasIds.length} fêmeas
                          </div>
                        )}
                        {info.meatLot && (
                          <div className="flex items-center gap-2 text-xs text-orange-400">
                            <Beef size={12} /> Lote engorda · {info.meatLot.avesIds.length} aves · {info.meatLot.status}
                          </div>
                        )}

                        {/* Link ao casal pai (se tem pintinhos) */}
                        {info.pintinhos.length > 0 && info.casal && (
                          <div className="flex items-center gap-2 text-xs p-2 bg-theme-surface rounded-lg">
                            <Users size={12} className="text-theme-primary flex-shrink-0" />
                            <span className="text-theme-text-muted">Casal pai:</span>
                            <span className="text-white font-bold truncate">
                              {info.macho?.anilha || '?'} × {info.femea?.anilha || '?'}
                            </span>
                          </div>
                        )}

                        {/* Lista de aves clicáveis */}
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
      </div>

    </div>
  );
}
