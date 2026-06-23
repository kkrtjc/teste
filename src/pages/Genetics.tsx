import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, GitBranch, Filter, MoreVertical, Users, X, CheckCircle, Trash2 } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

export function Genetics() {
  const {
    birds,
    couples,
    addCouple,
    editCouple,
    coupleEggs,
    addCoupleEgg,
    editCoupleEgg,
    removeCoupleEgg,
    breeds,
    openBirdProfile
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'plantel' | 'casais' | 'pedigree'>('plantel');
  const [showCoupleModal, setShowCoupleModal] = useState(false);
  const [selectedBreed, setSelectedBreed] = useState('');

  // Pagination and Search states
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pedigree states
  const [pedigreeSearch, setPedigreeSearch] = useState('');
  const [selectedPedigreeBird, setSelectedPedigreeBird] = useState<string | null>(null);

  // Form states for Casal
  const [machoId, setMachoId] = useState('');
  const [selectedFemeas, setSelectedFemeas] = useState<string[]>([]);
  const [objetivo, setObjetivo] = useState('Melhoramento Genético');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [baiaCasal, setBaiaCasal] = useState('');

  // Egg management states
  const [selectedCoupleForEggs, setSelectedCoupleForEggs] = useState<string | null>(null);
  const [showAddEggModal, setShowAddEggModal] = useState(false);
  const [eggCoupleId, setEggCoupleId] = useState('');
  const [eggFemeaId, setEggFemeaId] = useState('');
  const [eggStatus, setEggStatus] = useState<'Em Espera' | 'Em Choco' | 'Eclodido' | 'Perdido'>('Em Espera');
  const [eggDate, setEggDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSaveCouple = () => {
    if (!selectedBreed || !machoId || selectedFemeas.length === 0) return;

    addCouple({
      id: Date.now().toString(),
      machoId,
      femeaId: selectedFemeas[0], // compatibilidade com dados antigos
      femeaIds: selectedFemeas,
      cageName: baiaCasal || undefined,
      raca: selectedBreed,
      objetivo,
      dataInicio,
      status: 'Ativo'
    });

    setShowCoupleModal(false);
    setSelectedBreed('');
    setMachoId('');
    setSelectedFemeas([]);
    setBaiaCasal('');
    setObjetivo('Melhoramento Genético');
    setDataInicio(new Date().toISOString().split('T')[0]);
  };

  // Group couples by breed
  const couplesByBreed: { [breed: string]: any[] } = {};
  couples.forEach(c => {
    const macho = birds.find(b => b.id === c.machoId);
    const breedName = c.raca || macho?.raca || 'Sem Raça';
    if (!couplesByBreed[breedName]) {
      couplesByBreed[breedName] = [];
    }
    couplesByBreed[breedName].push(c);
  });

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Genética &amp; Reprodução</h2>
          <p className="text-sm text-theme-text-muted mt-1">Gestão de plantel, cruzamentos estratégicos e análise de pedigree.</p>
        </div>
        
        <div className="flex gap-3">
          {activeTab === 'casais' && (
            <button onClick={() => setShowCoupleModal(true)} className="btn-primary flex items-center gap-2">
              <Users size={18} /> Novo Casal
            </button>
          )}
        </div>
      </div>

      {/* Tabs (Glassmorphic Pill Bar) */}
      <div className="flex p-1 bg-theme-surface/30 border border-theme-border/40 backdrop-blur-md rounded-full overflow-x-auto hide-scrollbar shrink-0 w-full sm:w-auto max-w-md self-start gap-1">
        <button 
          onClick={() => setActiveTab('plantel')}
          className={`flex-1 sm:flex-none text-center px-4 py-2 text-xs sm:text-sm font-black transition-all rounded-full whitespace-nowrap ${
            activeTab === 'plantel' 
              ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'text-theme-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          Plantel
        </button>
        <button 
          onClick={() => setActiveTab('casais')}
          className={`flex-1 sm:flex-none text-center px-4 py-2 text-xs sm:text-sm font-black transition-all rounded-full whitespace-nowrap ${
            activeTab === 'casais' 
              ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'text-theme-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          Casais &amp; Cruza
        </button>
        <button 
          onClick={() => setActiveTab('pedigree')}
          className={`flex-1 sm:flex-none text-center px-4 py-2 text-xs sm:text-sm font-black transition-all rounded-full whitespace-nowrap ${
            activeTab === 'pedigree' 
              ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'text-theme-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          Pedigree Visual
        </button>
      </div>

      {/* Conteúdo: Plantel */}
      {activeTab === 'plantel' && (() => {
        const filteredPlantel = birds.filter(b => 
          b.anilha.toLowerCase().includes(searchQuery.toLowerCase()) || 
          (b.nome && b.nome.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        const totalPages = Math.max(1, Math.ceil(filteredPlantel.length / 10));
        const paginatedPlantel = filteredPlantel.slice((currentPage - 1) * 10, currentPage * 10);

        return (
          <div className="flex-1 premium-card flex flex-col overflow-hidden min-h-0">
            <div className="p-4 sm:p-6 border-b border-theme-border flex flex-col sm:flex-row justify-between gap-4 shrink-0 bg-theme-surface/50">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar anilha ou nome..." 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-theme-surface/30 backdrop-blur-md border border-theme-border/50 rounded-full py-2 pl-9 pr-4 text-base md:text-sm text-white focus:border-theme-primary outline-none shadow-inner" 
                  />
                </div>
                <button className="p-2 text-theme-text-muted hover:text-white bg-theme-surface/30 backdrop-blur-md rounded-full border border-theme-border flex items-center gap-2 text-sm font-medium shrink-0">
                  <Filter size={16} /> <span className="hidden sm:inline">Filtros</span>
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-theme-text-muted sm:ml-auto">
                Total: <strong className="text-white">{filteredPlantel.length} aves</strong>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-0">
              {/* Desktop Table */}
              <div className="hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-theme-surface z-10 shadow-sm">
                    <tr className="border-b border-theme-border text-xs uppercase tracking-wider text-theme-text-muted">
                      <th className="p-4 font-bold">Identificação</th>
                      <th className="p-4 font-bold">Raça / Genética</th>
                      <th className="p-4 font-bold">Baia</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border/50 text-sm">
                    {paginatedPlantel.map(bird => (
                      <tr key={bird.id} onClick={() => openBirdProfile(bird.id)} className="hover:bg-white/5 transition-colors cursor-pointer group">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-theme-surface border border-theme-border flex items-center justify-center text-lg overflow-hidden shrink-0">
                              {bird.imagem ? <img src={bird.imagem} className="w-full h-full object-cover" /> : (bird.sexo === 'Macho' ? '🐓' : '🐔')}
                            </div>
                            <div>
                              <p className="font-bold text-white group-hover:text-theme-primary transition-colors">{bird.anilha}</p>
                              <p className="text-xs text-theme-text-muted">{bird.nome}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-medium text-theme-text-muted">{bird.raca}</td>
                        <td className="p-4 font-mono text-theme-accent">
                          {bird.baia && bird.baia !== 'ND' ? bird.baia : '—'}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase bg-green-500/20 text-green-400">
                            {bird.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button className="p-2 text-theme-text-muted hover:text-white" onClick={(e) => e.stopPropagation()}><MoreVertical size={18} /></button>
                        </td>
                      </tr>
                    ))}
                    {paginatedPlantel.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-theme-text-muted">
                          Nenhuma ave cadastrada no plantel.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden flex flex-col divide-y divide-theme-border/50">
                {paginatedPlantel.map(bird => (
                  <div key={bird.id} onClick={() => openBirdProfile(bird.id)} className="p-4 hover:bg-white/5 transition-colors cursor-pointer active:bg-theme-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-theme-base border border-theme-border flex items-center justify-center text-xl overflow-hidden shrink-0 shadow-inner">
                        {bird.imagem ? <img src={bird.imagem} className="w-full h-full object-cover" /> : (bird.sexo === 'Macho' ? '🐓' : '🐔')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-white text-base truncate pr-2">{bird.anilha}</p>
                          <span className="px-2 py-1 rounded-md text-[9px] font-bold uppercase shrink-0 bg-green-500/20 text-green-400">
                            {bird.status}
                          </span>
                        </div>
                        <p className="text-xs text-theme-text-muted truncate">{bird.nome || 'Sem nome'}</p>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-theme-text-muted font-bold">
                          <span className="bg-theme-base px-2 py-1 rounded border border-theme-border/50 truncate max-w-[100px]">{bird.raca}</span>
                          <span className="bg-theme-base px-2 py-1 rounded border border-theme-border/50 font-mono text-theme-accent">
                            {bird.baia && bird.baia !== 'ND' ? `Baia ${bird.baia}` : 'Sem Baia'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {paginatedPlantel.length === 0 && (
                  <div className="p-8 text-center text-theme-text-muted text-sm">
                    Nenhuma ave cadastrada.
                  </div>
                )}
              </div>
              
              {/* Paginação */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-theme-border flex items-center justify-between bg-theme-surface/30">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 bg-theme-base border border-theme-border rounded-md text-sm text-theme-text-muted disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-white">Página {currentPage} de {totalPages}</span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 bg-theme-base border border-theme-border rounded-md text-sm text-theme-text-muted disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Conteúdo: Casais */}
      {activeTab === 'casais' && (
        <div className="flex-1 overflow-auto bg-theme-surface/30 rounded-xl border border-theme-border p-4">
          {couples.length === 0 ? (
            <div className="flex flex-col justify-center items-center text-theme-text-muted text-center h-full border-dashed border-2 border-theme-border/50 rounded-xl p-6">
              <Users size={48} className="mb-4 opacity-50 text-theme-primary" />
              <h3 className="text-xl font-bold text-white mb-2">Módulo de Casais</h3>
              <p className="max-w-md text-sm">Nenhum casal registrado. O cruzamento é onde a mágica do melhoramento acontece.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(couplesByBreed).map(([breedName, breedCouples]) => {
                const breedObj = breeds.find(b => b.nome === breedName);
                return (
                  <div key={breedName} className="space-y-4">
                    {/* Header da Raça */}
                    <div className="flex items-center gap-3 border-b border-theme-border/50 pb-2">
                      <div className="w-10 h-10 rounded-lg bg-theme-surface border border-theme-border flex items-center justify-center text-lg overflow-hidden shrink-0">
                        {breedObj?.imagem ? (
                          <img src={breedObj.imagem} className="w-full h-full object-cover" />
                        ) : (
                          '🧬'
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white">{breedName}</h3>
                        <p className="text-xs text-theme-text-muted font-bold uppercase">
                          {breedCouples.length} casal(is) nesta raça
                        </p>
                      </div>
                    </div>

                    {/* Grid de Casais da Raça */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {breedCouples.map(couple => {
                        const macho = birds.find(b => b.id === couple.machoId);
                        const femeas = birds.filter(b => couple.femeaIds?.includes(b.id) || b.id === couple.femeaId);
                        const eggs = coupleEggs.filter(e => e.coupleId === couple.id);
                        const eggsInChoco = eggs.filter(e => e.status === 'Em Choco').length;
                        const eggsEclodidos = eggs.filter(e => e.status === 'Eclodido').length;

                        return (
                          <div key={couple.id} className="premium-card p-4 flex flex-col gap-4 border border-theme-border/50 bg-theme-surface/50">
                            {/* Top info */}
                            <div className="flex justify-between items-center border-b border-theme-border/50 pb-2">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-theme-text-muted uppercase">Início</span>
                                <span className="text-xs font-bold text-white">{couple.dataInicio}</span>
                              </div>
                              {couple.cageName && (
                                <span className="text-xs bg-theme-base/60 text-theme-accent border border-theme-border/60 px-2.5 py-0.5 rounded-lg font-mono font-bold">
                                  🪹 {couple.cageName}
                                </span>
                              )}
                              <select
                                value={couple.status}
                                onChange={(e) => editCouple(couple.id, { status: e.target.value as any })}
                                className="bg-theme-base text-xs font-bold text-white px-2 py-1 rounded border border-theme-border/60 outline-none cursor-pointer"
                              >
                                <option value="Ativo">Ativo</option>
                                <option value="Separado">Separado</option>
                              </select>
                            </div>

                            {/* visual da cruza */}
                            <div className="flex items-center justify-between gap-2">
                              {/* Macho */}
                              <div 
                                onClick={() => macho && openBirdProfile(macho.id)}
                                className="flex-1 bg-theme-base/40 rounded-xl p-3 border border-theme-border/30 hover:border-blue-500/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 text-center min-h-[96px]"
                              >
                                <div className="w-12 h-12 rounded-full border-2 border-blue-500 bg-theme-surface flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                                  {macho?.imagem ? (
                                    <img src={macho.imagem} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xl">🐓</span>
                                  )}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-white truncate max-w-[80px]" title={macho?.anilha}>
                                    {macho?.anilha || 'Macho'}
                                  </p>
                                  <p className="text-[8px] text-blue-400 font-bold uppercase tracking-wider">Reprodutor</p>
                                </div>
                              </div>

                              <div className="flex flex-col items-center justify-center text-theme-text-muted font-black shrink-0 px-1">
                                <span className="text-base text-theme-primary">×</span>
                                <div className="w-[1px] h-6 bg-theme-border/40"></div>
                                <span className="text-[9px] text-theme-text-muted font-bold">{femeas.length} F</span>
                              </div>

                              {/* Fêmeas */}
                              <div className="flex-1 bg-theme-base/40 rounded-xl p-3 border border-theme-border/30 flex flex-col justify-center gap-1 min-h-[96px] overflow-hidden">
                                <p className="text-[8px] text-pink-400 font-bold uppercase tracking-wider text-center">Matrizes</p>
                                <div className="flex flex-wrap gap-1 justify-center max-h-[50px] overflow-y-auto pr-1">
                                  {femeas.map(femea => (
                                    <div
                                      key={femea.id}
                                      onClick={() => openBirdProfile(femea.id)}
                                      className="w-8 h-8 rounded-full border border-pink-500/50 bg-theme-surface flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-all shadow-sm"
                                      title={`Fêmea: ${femea.anilha}`}
                                    >
                                      {femea.imagem ? (
                                        <img src={femea.imagem} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-sm">🐔</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Informações de Ovos */}
                            <div className="grid grid-cols-3 gap-2 text-center bg-theme-base/50 p-2 rounded-xl border border-theme-border/30">
                              <div>
                                <div className="text-sm font-black text-white">{eggs.length}</div>
                                <div className="text-[8px] text-theme-text-muted font-bold uppercase">Total Ovos</div>
                              </div>
                              <div>
                                <div className="text-sm font-black text-amber-400">{eggsInChoco}</div>
                                <div className="text-[8px] text-theme-text-muted font-bold uppercase">Em Choco</div>
                              </div>
                              <div>
                                <div className="text-sm font-black text-green-400">{eggsEclodidos}</div>
                                <div className="text-[8px] text-theme-text-muted font-bold uppercase">Eclodidos</div>
                              </div>
                            </div>

                            {/* Objetivo */}
                            <div className="bg-theme-base/30 p-2 rounded-lg border border-theme-border/30 text-xs">
                              <span className="text-[9px] font-bold text-theme-text-muted uppercase block mb-0.5">Objetivo</span>
                              <p className="text-white truncate font-medium">{couple.objetivo}</p>
                            </div>

                            {/* Ações */}
                            <div className="flex gap-2 border-t border-theme-border/30 pt-3 mt-auto">
                              <button
                                onClick={() => setSelectedCoupleForEggs(couple.id)}
                                className="flex-1 py-2 bg-theme-base hover:bg-theme-surface-hover text-white text-xs font-bold rounded-xl border border-theme-border/60 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                🥚 Gerenciar Ovos
                              </button>
                              <button
                                onClick={() => {
                                  setEggCoupleId(couple.id);
                                  if (femeas.length === 1) {
                                    setEggFemeaId(femeas[0].id);
                                  } else {
                                    setEggFemeaId('');
                                  }
                                  setEggStatus('Em Espera');
                                  setEggDate(new Date().toISOString().split('T')[0]);
                                  setShowAddEggModal(true);
                                }}
                                className="px-3 py-2 bg-theme-primary hover:bg-theme-primary/80 text-black text-xs font-black rounded-xl transition-colors flex items-center justify-center gap-1 shadow-sm"
                              >
                                ＋ Ovo
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo: Pedigree */}
      {activeTab === 'pedigree' && (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="premium-card p-4 flex flex-col sm:flex-row gap-4 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar ave para ver o pedigree (anilha ou nome)..." 
                value={pedigreeSearch}
                onChange={e => setPedigreeSearch(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border rounded-lg py-2 pl-9 pr-4 text-base md:text-sm text-white focus:border-theme-primary outline-none" 
              />
            </div>
          </div>
          
          <div className="flex-1 premium-card p-6 overflow-y-auto">
            {!selectedPedigreeBird ? (
               <div className="space-y-2 h-full">
                 {pedigreeSearch.length > 0 ? (
                   birds.filter(b => b.anilha.toLowerCase().includes(pedigreeSearch.toLowerCase()) || (b.nome && b.nome.toLowerCase().includes(pedigreeSearch.toLowerCase())))
                   .map(b => (
                     <div key={b.id} onClick={() => { setSelectedPedigreeBird(b.id); setPedigreeSearch(''); }} className="p-4 bg-theme-surface hover:bg-theme-primary/10 border border-theme-border rounded-lg cursor-pointer flex items-center gap-4 transition-colors">
                       <div className="w-10 h-10 rounded-lg bg-theme-base border border-theme-border flex items-center justify-center text-lg overflow-hidden shrink-0">
                         {b.imagem ? <img src={b.imagem} className="w-full h-full object-cover" /> : (b.sexo === 'Macho' ? '🐓' : '🐔')}
                       </div>
                       <div className="flex flex-col">
                         <span className="font-bold text-white text-base">{b.anilha}</span>
                         <span className="text-theme-text-muted text-xs">{b.nome || 'Sem nome'}</span>
                       </div>
                     </div>
                   ))
                 ) : (
                    <div className="flex flex-col justify-center items-center text-theme-text-muted text-center h-full border-dashed border-2 border-theme-border/50 rounded-xl p-12">
                      <GitBranch size={48} className="mb-4 opacity-50 text-theme-primary" />
                      <h3 className="text-xl font-bold text-white mb-2">Árvore Genealógica (Pedigree)</h3>
                      <p className="max-w-md text-sm">Pesquise uma ave acima para visualizar sua linhagem completa de ascendentes e descendentes.</p>
                    </div>
                 )}
               </div>
            ) : (
                  (() => {
                     const mainBird = birds.find(b => b.id === selectedPedigreeBird);
                     if (!mainBird) return null;
                     
                     const pai = birds.find(b => b.id === mainBird.paiId);
                     const mae = birds.find(b => b.id === mainBird.maeId);
                     const filhos = birds.filter(b => b.paiId === mainBird.id || b.maeId === mainBird.id);

                     return (
                       <div className="space-y-8 animate-fade-in">
                         <button onClick={() => setSelectedPedigreeBird(null)} className="text-sm text-theme-text-muted hover:text-white flex items-center gap-2 mb-4">
                           ← Voltar para pesquisa
                         </button>
                         
                         <div className="text-center">
                            <div className="w-20 h-20 mx-auto rounded-full bg-theme-surface border-4 border-theme-primary flex items-center justify-center text-3xl overflow-hidden mb-3">
                               {mainBird.imagem ? <img src={mainBird.imagem} className="w-full h-full object-cover" /> : (mainBird.sexo === 'Macho' ? '🐓' : '🐔')}
                            </div>
                            <h3 className="text-2xl font-black text-white">{mainBird.anilha}</h3>
                            <p className="text-theme-primary font-bold">{mainBird.nome}</p>
                            <span className="inline-block mt-2 text-xs bg-theme-base px-2 py-1 rounded text-theme-text-muted font-bold">{mainBird.raca}</span>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-b border-theme-border/50 py-8 relative">
                           <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-theme-border/50 -translate-x-1/2"></div>
                           
                           <div>
                             <h4 className="text-sm font-bold text-blue-400 uppercase mb-4 text-center">Pai</h4>
                             {pai ? (
                               <div onClick={() => setSelectedPedigreeBird(pai.id)} className="bg-theme-surface p-4 rounded-xl border border-theme-border cursor-pointer hover:border-blue-500 transition-colors text-center group flex flex-col items-center">
                                 <div className="w-12 h-12 rounded-full border-2 border-blue-500/50 flex items-center justify-center mb-2 overflow-hidden">
                                   {pai.imagem ? <img src={pai.imagem} className="w-full h-full object-cover" /> : <span className="text-xl">🐓</span>}
                                 </div>
                                 <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{pai.anilha}</p>
                                 <p className="text-xs text-theme-text-muted">{pai.nome}</p>
                                align_center
                               </div>
                             ) : (
                               <div className="bg-theme-surface/30 p-6 rounded-xl border border-theme-border border-dashed text-center flex items-center justify-center h-full">
                                 <p className="text-sm text-theme-text-muted font-bold">{mainBird.isPaiExterno ? 'Externo (Fora do sistema)' : 'Desconhecido'}</p>
                               </div>
                             )}
                           </div>
                           
                           <div>
                             <h4 className="text-sm font-bold text-pink-400 uppercase mb-4 text-center">Mãe</h4>
                             {mae ? (
                               <div onClick={() => setSelectedPedigreeBird(mae.id)} className="bg-theme-surface p-4 rounded-xl border border-theme-border cursor-pointer hover:border-pink-500 transition-colors text-center group flex flex-col items-center">
                                 <div className="w-12 h-12 rounded-full border-2 border-pink-500/50 flex items-center justify-center mb-2 overflow-hidden">
                                   {mae.imagem ? <img src={mae.imagem} className="w-full h-full object-cover" /> : <span className="text-xl">🐔</span>}
                                 </div>
                                 <p className="font-bold text-white group-hover:text-pink-400 transition-colors">{mae.anilha}</p>
                                 <p className="text-xs text-theme-text-muted">{mae.nome}</p>
                               </div>
                             ) : (
                               <div className="bg-theme-surface/30 p-6 rounded-xl border border-theme-border border-dashed text-center flex items-center justify-center h-full">
                                 <p className="text-sm text-theme-text-muted font-bold">{mainBird.isMaeExterno ? 'Externo (Fora do sistema)' : 'Desconhecida'}</p>
                               </div>
                             )}
                           </div>
                         </div>
                         
                         <div>
                           <h4 className="text-sm font-bold text-theme-text-muted uppercase mb-4 text-center">Filhotes Mapeados ({filhos.length})</h4>
                           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                             {filhos.map(f => (
                               <div key={f.id} onClick={() => setSelectedPedigreeBird(f.id)} className="bg-theme-surface p-3 rounded-xl border border-theme-border cursor-pointer hover:border-theme-primary transition-colors text-center">
                                 <p className="font-bold text-white text-sm">{f.anilha}</p>
                                 <p className="text-[10px] text-theme-text-muted mt-1">{f.nome || 'Sem nome'}</p>
                               </div>
                             ))}
                             {filhos.length === 0 && (
                               <p className="text-sm text-theme-text-muted text-center col-span-full py-4">Nenhum filhote registrado no sistema.</p>
                             )}
                           </div>
                         </div>
                       </div>
                     );
                  })()
            )}
          </div>
        </div>
      )}

      {/* Modal Novo Casal */}
      {showCoupleModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[90dvh] md:h-auto md:max-h-[92vh] rounded-t-2xl md:rounded-2xl">
            
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-lg text-white">Formar Novo Casal</h3>
                <p className="text-xs text-theme-text-muted">Selecione a raça, reprodutor e fêmeas (até 10)</p>
              </div>
              <button onClick={() => {
                setShowCoupleModal(false);
                setSelectedBreed('');
                setMachoId('');
                setSelectedFemeas([]);
                setBaiaCasal('');
              }} className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5 overscroll-contain">
              {/* Seleção de Raça */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Raça / Linhagem *</label>
                <select
                  value={selectedBreed}
                  onChange={e => {
                    setSelectedBreed(e.target.value);
                    setMachoId('');
                    setSelectedFemeas([]);
                  }}
                  className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                >
                  <option value="">— Selecione a raça —</option>
                  {breeds.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                </select>
              </div>

              {selectedBreed && (
                <>
                  {/* Macho */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">Reprodutor (Macho) *</label>
                    <select
                      value={machoId}
                      onChange={e => setMachoId(e.target.value)}
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-blue-400 outline-none transition-colors"
                    >
                      <option value="">— Selecione o macho —</option>
                      {birds
                        .filter(b => b.sexo === 'Macho' && b.raca === selectedBreed)
                        .map(b => (
                          <option key={b.id} value={b.id}>
                            {b.anilha} {b.nome ? `(${b.nome})` : ''}
                          </option>
                        ))}
                    </select>
                    {birds.filter(b => b.sexo === 'Macho' && b.raca === selectedBreed).length === 0 && (
                      <p className="text-[10px] text-orange-400">Nenhum reprodutor (Macho) desta raça cadastrado no plantel.</p>
                    )}
                  </div>

                  {/* Fêmeas Checklist */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-pink-400 uppercase tracking-wider">
                      Matrizes (Fêmeas, até 10) * ({selectedFemeas.length} selecionadas)
                    </label>
                    <div className="bg-theme-base border border-theme-border rounded-xl p-3 max-h-40 overflow-y-auto space-y-2">
                      {birds.filter(b => b.sexo === 'Fêmea' && b.raca === selectedBreed).length === 0 ? (
                        <p className="text-xs text-theme-text-muted italic">Nenhuma matriz desta raça cadastrada no plantel.</p>
                      ) : (
                        birds
                          .filter(b => b.sexo === 'Fêmea' && b.raca === selectedBreed)
                          .map(f => {
                            const isChecked = selectedFemeas.includes(f.id);
                            return (
                              <label key={f.id} className="flex items-center gap-3 text-sm text-white cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedFemeas(selectedFemeas.filter(id => id !== f.id));
                                    } else {
                                      if (selectedFemeas.length < 10) {
                                        setSelectedFemeas([...selectedFemeas, f.id]);
                                      }
                                    }
                                  }}
                                  className="rounded border-theme-border text-theme-primary focus:ring-theme-primary/30"
                                />
                                <span className="font-bold">{f.anilha}</span>
                                <span className="text-xs text-theme-text-muted">{f.nome || 'Sem nome'}</span>
                              </label>
                            );
                          })
                      )}
                    </div>
                  </div>

                  {/* N° do Cruzador */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Nº do Cruzador / Gaiola / Baia</label>
                    <input
                      type="text"
                      value={baiaCasal}
                      onChange={e => setBaiaCasal(e.target.value)}
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                      placeholder="Ex: Cruzador 3, Gaiola B..."
                    />
                  </div>

                  {/* Objetivo & Início */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Objetivo</label>
                      <select
                        value={objetivo}
                        onChange={e => setObjetivo(e.target.value)}
                        className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                      >
                        <option>Melhoramento Genético</option>
                        <option>Corte (Pesados)</option>
                        <option>Postura</option>
                        <option>Competição</option>
                        <option>Conservação de Linhagem</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Data de Início</label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={e => setDataInicio(e.target.value)}
                        className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white outline-none [color-scheme:dark] transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
              <button onClick={() => {
                setShowCoupleModal(false);
                setSelectedBreed('');
                setMachoId('');
                setSelectedFemeas([]);
                setBaiaCasal('');
              }} className="px-4 py-2 text-sm text-theme-text-muted hover:text-white transition-colors">Cancelar</button>
              <button
                onClick={handleSaveCouple}
                disabled={!selectedBreed || !machoId || selectedFemeas.length === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle size={16} /> Registrar Casal
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal Gerenciar Ovos */}
      {selectedCoupleForEggs && (() => {
        const couple = couples.find(c => c.id === selectedCoupleForEggs);
        if (!couple) return null;

        const macho = birds.find(b => b.id === couple.machoId);
        const femeas = birds.filter(b => couple.femeaIds?.includes(b.id) || b.id === couple.femeaId);
        const eggs = coupleEggs.filter(e => e.coupleId === couple.id);

        return createPortal(
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[90dvh] md:h-[80vh] rounded-t-2xl md:rounded-2xl">
              {/* Header */}
              <div className="px-5 pt-4 pb-3 border-b border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-black text-lg text-white">Gerenciar Ovos do Casal</h3>
                  <p className="text-xs text-theme-text-muted">
                    Reprodutor: <span className="text-blue-400 font-bold">{macho?.anilha || 'Desconhecido'}</span> · {femeas.length} fêmea(s) vinculada(s)
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCoupleForEggs(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-6 overscroll-contain">
                {femeas.map(femea => {
                  const eggsOfFemea = eggs.filter(e => e.femeaId === femea.id);
                  return (
                    <div key={femea.id} className="space-y-3 bg-theme-base/20 border border-theme-border/30 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full border-2 border-pink-500/50 bg-theme-base flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {femea.imagem ? (
                              <img src={femea.imagem} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xl">🐔</span>
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white">Fêmea: {femea.anilha}</h4>
                            <p className="text-[10px] text-theme-text-muted">{femea.nome || 'Sem nome'}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setEggCoupleId(couple.id);
                            setEggFemeaId(femea.id);
                            setEggStatus('Em Espera');
                            setEggDate(new Date().toISOString().split('T')[0]);
                            setShowAddEggModal(true);
                          }}
                          className="flex items-center gap-1 text-xs bg-theme-primary/10 border border-theme-primary/30 text-theme-primary font-black px-3 py-1.5 rounded-lg hover:bg-theme-primary hover:text-black transition-all"
                        >
                          ＋ Adicionar Ovo
                        </button>
                      </div>

                      {eggsOfFemea.length === 0 ? (
                        <p className="text-xs text-theme-text-muted italic py-2 pl-2">
                          Nenhum ovo registrado para esta fêmea neste cruzamento.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          {eggsOfFemea.map(egg => {
                            let days = 0;
                            if (egg.status === 'Em Choco' && egg.dataIntroducao) {
                              const introDate = new Date(egg.dataIntroducao);
                              const today = new Date();
                              const diffTime = Math.abs(today.getTime() - introDate.getTime());
                              days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                            }

                            return (
                              <div
                                key={egg.id}
                                className="bg-theme-base border border-theme-border/50 p-3 rounded-xl flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-white font-mono font-bold">Ovo #{egg.id.slice(-4)}</span>
                                    <span
                                      className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider
                                        ${egg.status === 'Em Espera' ? 'bg-zinc-500/20 text-zinc-400' :
                                          egg.status === 'Em Choco' ? 'bg-amber-500/20 text-amber-400' :
                                          egg.status === 'Eclodido' ? 'bg-green-500/20 text-green-400' :
                                          'bg-red-500/20 text-red-400'}`}
                                    >
                                      {egg.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-theme-text-muted mt-1.5">
                                    Introdução: {egg.dataIntroducao}
                                  </p>
                                  {egg.status === 'Em Choco' && (
                                    <p className="text-[10px] text-amber-400 font-bold mt-1">
                                      🔥 {days} dia{days !== 1 ? 's' : ''} de choco
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {egg.status === 'Em Espera' && (
                                    <button
                                      onClick={() => editCoupleEgg(egg.id, { status: 'Em Choco' })}
                                      className="text-[10px] bg-amber-500 hover:bg-amber-600 text-black font-black px-2 py-1 rounded-lg transition-colors"
                                    >
                                      Chocar
                                    </button>
                                  )}
                                  {egg.status === 'Em Choco' && (
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => editCoupleEgg(egg.id, { status: 'Eclodido' })}
                                        className="text-[10px] bg-green-500 hover:bg-green-600 text-black font-black px-2 py-1 rounded-lg transition-colors"
                                      >
                                        Eclodir
                                      </button>
                                      <button
                                        onClick={() => editCoupleEgg(egg.id, { status: 'Perdido' })}
                                        className="text-[10px] bg-red-500 hover:bg-red-600 text-white font-black px-2 py-1 rounded-lg transition-colors"
                                      >
                                        Perder
                                      </button>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => removeCoupleEgg(egg.id)}
                                    className="p-1.5 text-theme-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-1"
                                    title="Excluir"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedCoupleForEggs(null)}
                  className="px-5 py-2.5 bg-theme-base hover:bg-theme-surface-hover text-white text-sm font-bold rounded-xl border border-theme-border/60 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Modal Adicionar Ovo */}
      {showAddEggModal && createPortal(
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[60dvh] md:h-auto md:max-h-[80vh] rounded-t-2xl md:rounded-2xl">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-lg text-white">Registrar Novo Ovo</h3>
                <p className="text-xs text-theme-text-muted">Informe a fêmea e data de introdução</p>
              </div>
              <button
                onClick={() => {
                  setShowAddEggModal(false);
                  setEggCoupleId('');
                  setEggFemeaId('');
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 overscroll-contain">
              {/* Seleção de Fêmea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-pink-400 uppercase tracking-wider">Matriz (Fêmea) *</label>
                <select
                  value={eggFemeaId}
                  onChange={e => setEggFemeaId(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-pink-400 outline-none transition-colors"
                >
                  <option value="">— Selecione a fêmea do ovo —</option>
                  {(() => {
                    const couple = couples.find(c => c.id === eggCoupleId);
                    if (!couple) return null;
                    const femeas = birds.filter(b => couple.femeaIds?.includes(b.id) || b.id === couple.femeaId);
                    return femeas.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.anilha} {f.nome ? `(${f.nome})` : ''}
                      </option>
                    ));
                  })()}
                </select>
              </div>

              {/* Data de Introdução */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Data de Coleta/Introdução</label>
                <input
                  type="date"
                  value={eggDate}
                  onChange={e => setEggDate(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white outline-none [color-scheme:dark] transition-colors"
                />
              </div>

              {/* Status Inicial */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Status Inicial</label>
                <select
                  value={eggStatus}
                  onChange={e => setEggStatus(e.target.value as any)}
                  className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                >
                  <option value="Em Espera">Em Espera</option>
                  <option value="Em Choco">Em Choco (Incubação)</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
              <button
                onClick={() => {
                  setShowAddEggModal(false);
                  setEggCoupleId('');
                  setEggFemeaId('');
                }}
                className="px-4 py-2 text-sm text-theme-text-muted hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!eggCoupleId || !eggFemeaId) return;
                  addCoupleEgg({
                    id: Date.now().toString(),
                    coupleId: eggCoupleId,
                    femeaId: eggFemeaId,
                    status: eggStatus,
                    dataIntroducao: eggDate
                  });
                  setShowAddEggModal(false);
                  setEggCoupleId('');
                  setEggFemeaId('');
                }}
                disabled={!eggFemeaId}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle size={16} /> Salvar Ovo
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
