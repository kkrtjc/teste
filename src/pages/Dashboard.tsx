import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronRight, Bird, Users, Baby } from 'lucide-react';
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
  const { birds, couples, openBirdProfile, farmSettings, breeds, setActiveBreed } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm]   = useState('');
  const [showResults, setShowResults] = useState(false);
  const [activeStatsFilter, setActiveStatsFilter] = useState<'Total' | 'Machos' | 'Fêmeas' | null>(null);
  const [showBreedsDashboardModal, setShowBreedsDashboardModal] = useState(false);
  const [statsSearch, setStatsSearch] = useState('');
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

  /* busca por baia: agrupa todas as aves */
  const baySet = new Set<string>();
  if (hasSearch) {
    birds.filter(b => b.baia?.toLowerCase().includes(term)).forEach(b => baySet.add(b.baia));
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
    <div className="flex flex-col items-center p-4 space-y-6 animate-fade-in pb-24">

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

      {/* ── Stats grid 2x2 ── */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {/* Total Aves Card */}
        <div 
          onClick={() => { setActiveStatsFilter('Total'); setStatsSearch(''); }}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/30 border border-theme-border/50 rounded-2xl py-3 text-center cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <p className="text-2xl font-black text-theme-primary">{totalAves}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mt-0.5">Total de Aves</p>
        </div>

        {/* Raças Card */}
        <div 
          onClick={() => setShowBreedsDashboardModal(true)}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/30 border border-theme-border/50 rounded-2xl py-3 text-center cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <p className="text-2xl font-black text-amber-400">{breeds.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mt-0.5">Raças Cadastradas</p>
        </div>

        {/* Machos Card */}
        <div 
          onClick={() => { setActiveStatsFilter('Machos'); setStatsSearch(''); }}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/30 border border-theme-border/50 rounded-2xl py-3 text-center cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <p className="text-2xl font-black text-blue-400">{totalMachos}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mt-0.5">Machos</p>
        </div>

        {/* Fêmeas Card */}
        <div 
          onClick={() => { setActiveStatsFilter('Fêmeas'); setStatsSearch(''); }}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/30 border border-theme-border/50 rounded-2xl py-3 text-center cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <p className="text-2xl font-black text-pink-400">{totalFemeas}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted mt-0.5">Fêmeas</p>
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

      {/* ── Recent Birds Section ── */}
      {birds.length > 0 && (
        <div className="w-full max-w-sm space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-theme-text-muted uppercase tracking-wider">Aves Recentes</h3>
            <button onClick={() => navigate('/birds')} className="text-xs font-bold text-theme-primary hover:underline">Ver todas</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {birds.slice(-4).reverse().map(bird => (
              <div
                key={bird.id}
                onClick={() => openBirdProfile(bird.id)}
                className="aspect-[3/4] w-full rounded-2xl overflow-hidden relative cursor-pointer group hover:border-theme-primary/50 transition-all border border-theme-border/50 bg-theme-surface/20 backdrop-blur-md shadow-premium"
              >
                {/* Background photo */}
                <div className="absolute inset-0 w-full h-full bg-theme-base flex items-center justify-center overflow-hidden">
                  {bird.imagem ? (
                    <img src={bird.imagem} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={bird.anilha} />
                  ) : (
                    <span className="text-5xl group-hover:scale-105 transition-transform duration-500 select-none opacity-40">
                      {bird.sexo === 'Macho' ? '🐓' : '🐔'}
                    </span>
                  )}
                </div>
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-0 pointer-events-none" />
                
                {/* Gender badge */}
                <div className="absolute top-2 right-2 z-10">
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md backdrop-blur-md border backdrop-saturate-150
                    ${bird.sexo === 'Macho' ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' : 'bg-pink-500/15 text-pink-400 border-pink-500/25'}`}>
                    {bird.sexo === 'Macho' ? 'M' : 'F'}
                  </span>
                </div>
                
                {/* Floating details panel */}
                <div className="absolute bottom-2 left-2 right-2 p-1.5 rounded-lg backdrop-blur-md bg-black/50 border border-white/10 space-y-0.5 shadow-md z-10">
                  <h4 className="font-black text-white text-[10px] truncate group-hover:text-theme-primary transition-colors">{bird.anilha}</h4>
                  <p className="text-[9px] text-white/70 truncate">{bird.raca || 'Sem raça'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats List Modal ── */}
      {activeStatsFilter && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col h-[80dvh] md:h-[70vh] rounded-t-2xl md:rounded-2xl">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-lg text-white">
                  Lista de Aves ({activeStatsFilter})
                </h3>
                <p className="text-xs text-theme-text-muted">
                  Exibindo {
                    activeStatsFilter === 'Total' ? birds.length :
                    activeStatsFilter === 'Machos' ? birds.filter(b => b.sexo === 'Macho').length :
                    birds.filter(b => b.sexo === 'Fêmea').length
                  } aves encontradas
                </p>
              </div>
              <button 
                onClick={() => { setActiveStatsFilter(null); setStatsSearch(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Local Search input inside modal */}
            <div className="p-4 border-b border-theme-border bg-theme-base/30 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={16} />
                <input
                  type="text"
                  placeholder="Filtrar por anilha ou nome..."
                  value={statsSearch}
                  onChange={e => setStatsSearch(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 overscroll-contain align-start content-start">
              {(() => {
                let list = birds;
                if (activeStatsFilter === 'Machos') list = birds.filter(b => b.sexo === 'Macho');
                if (activeStatsFilter === 'Fêmeas') list = birds.filter(b => b.sexo === 'Fêmea');

                const query = statsSearch.trim().toLowerCase();
                if (query) {
                  list = list.filter(b => 
                    b.anilha.toLowerCase().includes(query) ||
                    (b.nome || '').toLowerCase().includes(query)
                  );
                }

                if (list.length === 0) {
                  return (
                    <div className="text-center py-12 text-theme-text-muted text-sm italic col-span-2">
                      Nenhuma ave correspondente encontrada.
                    </div>
                  );
                }

                return list.map(bird => (
                  <div
                    key={bird.id}
                    onClick={() => {
                      openBirdProfile(bird.id);
                      setActiveStatsFilter(null);
                      setStatsSearch('');
                    }}
                    className="aspect-[3/4] w-full rounded-2xl overflow-hidden relative cursor-pointer group hover:border-theme-primary/50 transition-all border border-theme-border/50 bg-theme-surface/20 backdrop-blur-md shadow-premium"
                  >
                    {/* Background photo covering 100% */}
                    <div className="absolute inset-0 w-full h-full bg-theme-base flex items-center justify-center overflow-hidden">
                      {bird.imagem ? (
                        <img
                          src={bird.imagem}
                          alt={bird.anilha}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <span className="text-5xl group-hover:scale-105 transition-transform duration-500 select-none opacity-40">
                          {bird.sexo === 'Macho' ? '🐓' : '🐔'}
                        </span>
                      )}
                    </div>

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-0 pointer-events-none" />

                    {/* Top glass badges */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10">
                      {/* Baia Badge */}
                      {bird.baia && bird.baia !== 'ND' ? (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg backdrop-blur-md bg-black/45 border border-theme-accent/20 text-theme-accent shadow-md">
                          Baia {bird.baia}
                        </span>
                      ) : (
                        <div />
                      )}
                      
                      {/* Gender Badge */}
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md backdrop-blur-md border backdrop-saturate-150
                        ${bird.sexo === 'Macho' 
                          ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' 
                          : 'bg-pink-500/15 text-pink-400 border-pink-500/25'}`}>
                        {bird.sexo}
                      </span>
                    </div>

                    {/* Floating Glassmorphic Details Overlay (Bottom) */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 p-2 rounded-xl backdrop-blur-md bg-black/50 border border-white/10 space-y-0.5 shadow-lg z-10 hover:bg-black/60 transition-colors">
                      <h4 className="font-black text-white text-xs truncate group-hover:text-theme-primary transition-colors">
                        {bird.anilha}
                      </h4>
                      <p className="text-[10px] text-white/70 truncate">
                        {bird.nome || 'Sem nome'}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-white/10 mt-1">
                        <span className="text-[9px] font-bold text-theme-primary uppercase tracking-wider truncate">
                          {bird.status}
                        </span>
                        <span className="text-[9px] text-white font-black uppercase tracking-wider">
                          Ver
                        </span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-end shrink-0">
              <button
                onClick={() => { setActiveStatsFilter(null); setStatsSearch(''); }}
                className="px-5 py-2.5 bg-theme-base hover:bg-theme-surface-hover text-white text-sm font-bold rounded-xl border border-theme-border/60 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Breeds Selection Modal ── */}
      {showBreedsDashboardModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col h-[80dvh] md:h-[70vh] rounded-t-2xl md:rounded-2xl">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-lg text-white">
                  Raças Cadastradas
                </h3>
                <p className="text-xs text-theme-text-muted">
                  Exibindo {breeds.length} raça{breeds.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button 
                onClick={() => { setShowBreedsDashboardModal(false); setStatsSearch(''); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Local Search input inside modal */}
            <div className="p-4 border-b border-theme-border bg-theme-base/30 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={16} />
                <input
                  type="text"
                  placeholder="Filtrar por nome ou descrição..."
                  value={statsSearch}
                  onChange={e => setStatsSearch(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                />
              </div>
            </div>

            {/* Breeds Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 overscroll-contain align-start content-start">
              {(() => {
                const query = statsSearch.trim().toLowerCase();
                const filtered = breeds.filter(breed => 
                  breed.nome.toLowerCase().includes(query) ||
                  (breed.descricao || '').toLowerCase().includes(query)
                );

                if (filtered.length === 0) {
                  return (
                    <div className="text-center py-12 text-theme-text-muted text-sm italic col-span-2">
                      Nenhuma raça correspondente encontrada.
                    </div>
                  );
                }

                return filtered.map(breed => {
                  const count = birds.filter(b => b.raca === breed.nome).length;
                  return (
                    <div
                      key={breed.id}
                      onClick={() => {
                        setActiveBreed(breed.nome);
                        setShowBreedsDashboardModal(false);
                        setStatsSearch('');
                        navigate('/birds');
                      }}
                      className="premium-card flex flex-col group cursor-pointer hover:border-theme-primary/50 transition-all overflow-hidden relative bg-theme-base/40 border border-theme-border/50 rounded-xl"
                    >
                      {/* Image block 1:1 */}
                      <div className="aspect-square w-full bg-theme-base flex items-center justify-center overflow-hidden relative border-b border-theme-border/30">
                        {breed.imagem ? (
                          <img src={breed.imagem} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={breed.nome} />
                        ) : (
                          <span className="text-4xl group-hover:scale-105 transition-transform duration-500">🐓</span>
                        )}
                        <div className="absolute top-2 right-2">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider bg-theme-surface border border-theme-border/50 text-theme-text-muted">
                            {breed.foco.split(' ')[0]}
                          </span>
                        </div>
                      </div>

                      {/* Details block */}
                      <div className="p-3 flex flex-col justify-between flex-1 gap-1">
                        <div>
                          <h4 className="font-black text-white text-sm group-hover:text-theme-primary transition-colors truncate">
                            {breed.nome}
                          </h4>
                          <p className="text-xs text-theme-text-muted truncate">
                            {breed.descricao || 'Sem descrição'}
                          </p>
                        </div>
                        <p className="text-[10px] text-theme-accent font-mono font-bold mt-auto pt-1 border-t border-theme-border/30">
                          {count} ave{count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-end shrink-0">
              <button
                onClick={() => { setShowBreedsDashboardModal(false); setStatsSearch(''); }}
                className="px-5 py-2.5 bg-theme-base hover:bg-theme-surface-hover text-white text-sm font-bold rounded-xl border border-theme-border/60 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
