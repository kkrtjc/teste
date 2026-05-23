import { useState } from 'react';
import { Search, GitBranch, Filter, MoreVertical, Users, X, CheckCircle } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';


export function Genetics() {
  const { birds, couples, addCouple, openBirdProfile } = useAppContext();
  const [activeTab, setActiveTab] = useState<'plantel' | 'casais' | 'pedigree'>('plantel');
  const [showCoupleModal, setShowCoupleModal] = useState(false);

  // Pagination and Search states
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pedigree states
  const [pedigreeSearch, setPedigreeSearch] = useState('');
  const [selectedPedigreeBird, setSelectedPedigreeBird] = useState<string | null>(null);

  // Form states for Casal
  const [machoId, setMachoId] = useState('');
  const [femeaId, setFemeaId] = useState('');
  const [objetivo, setObjetivo] = useState('Melhoramento Genético');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [baiaCasal, setBaiaCasal] = useState('');

  const handleSaveCouple = () => {
    if (!machoId || !femeaId) return;
    addCouple({
      id: Date.now().toString(),
      machoId,
      femeaId,
      objetivo: baiaCasal ? `${objetivo} | Cruzador: ${baiaCasal}` : objetivo,
      dataInicio,
      status: 'Ativo'
    });
    setShowCoupleModal(false);
    setMachoId('');
    setFemeaId('');
    setBaiaCasal('');
    setObjetivo('Melhoramento Genético');
    setDataInicio(new Date().toISOString().split('T')[0]);
  };

  const machoOptions = birds.filter(b => b.sexo === 'Macho').map(b => ({ label: `${b.anilha}${b.nome ? ' – ' + b.nome : ''}`, value: b.id }));
  const femeaOptions = birds.filter(b => b.sexo === 'Fêmea').map(b => ({ label: `${b.anilha}${b.nome ? ' – ' + b.nome : ''}`, value: b.id }));
  
  const selectedMacho = birds.find(b => b.id === machoId);
  const selectedFemea = birds.find(b => b.id === femeaId);

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Genética & Reprodução</h2>
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

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-theme-border overflow-x-auto hide-scrollbar shrink-0">
        <button 
          onClick={() => setActiveTab('plantel')}
          className={`pb-3 text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'plantel' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
        >
          Plantel
        </button>
        <button 
          onClick={() => setActiveTab('casais')}
          className={`pb-3 text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'casais' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
        >
          Casais & Cruza
        </button>
        <button 
          onClick={() => setActiveTab('pedigree')}
          className={`pb-3 text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'pedigree' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
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
                    className="w-full bg-theme-surface border border-theme-border rounded-lg py-2 pl-9 pr-4 text-base md:text-sm text-white focus:border-theme-primary outline-none" 
                  />
                </div>
                <button className="p-2 text-theme-text-muted hover:text-white bg-theme-surface rounded-lg border border-theme-border flex items-center gap-2 text-sm font-medium shrink-0">
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
                      <td className="p-4 font-mono text-theme-accent">{bird.baia}</td>
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
                        <span className="bg-theme-base px-2 py-1 rounded border border-theme-border/50 font-mono text-theme-accent">{bird.baia}</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {couples.map(couple => {
                const macho = birds.find(b => b.id === couple.machoId);
                const femea = birds.find(b => b.id === couple.femeaId);
                return (
                  <div key={couple.id} className="premium-card p-4 flex flex-col gap-4 border border-theme-border/50">
                    <div className="flex justify-between items-center border-b border-theme-border/50 pb-2">
                      <span className="text-xs font-bold text-theme-text-muted">{couple.dataInicio}</span>
                      <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-[10px] font-bold uppercase">{couple.status}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 justify-between">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full border-2 border-blue-500/50 bg-theme-base flex items-center justify-center overflow-hidden">
                          {macho?.imagem ? <img src={macho.imagem} className="w-full h-full object-cover" /> : <span className="text-xl">🐓</span>}
                        </div>
                        <span className="text-xs font-bold text-blue-400 truncate w-20 text-center">{macho?.anilha || 'Desconhecido'}</span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-theme-text-muted font-bold">CRUZA</span>
                        <div className="w-6 h-[2px] bg-theme-border"></div>
                      </div>

                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full border-2 border-pink-500/50 bg-theme-base flex items-center justify-center overflow-hidden">
                          {femea?.imagem ? <img src={femea.imagem} className="w-full h-full object-cover" /> : <span className="text-xl">🐔</span>}
                        </div>
                        <span className="text-xs font-bold text-pink-400 truncate w-20 text-center">{femea?.anilha || 'Desconhecida'}</span>
                      </div>
                    </div>

                    <div className="mt-2 pt-3 border-t border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase">Objetivo</p>
                      <p className="text-sm text-white font-medium">{couple.objetivo}</p>
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
      {showCoupleModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[90dvh] md:h-auto md:max-h-[92vh] rounded-t-2xl md:rounded-2xl">
            
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-lg text-white">Formar Novo Casal</h3>
                <p className="text-xs text-theme-text-muted">Selecione o reprodutor e a matriz</p>
              </div>
              <button onClick={() => setShowCoupleModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5 overscroll-contain">
              
              {/* Visual preview of the couple */}
              {(machoId || femeaId) && (
                <div className="flex items-center justify-center gap-4 p-4 bg-theme-base/50 rounded-xl border border-theme-border/50">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full border-2 border-blue-500/50 bg-theme-base flex items-center justify-center overflow-hidden">
                      {selectedMacho?.imagem ? <img src={selectedMacho.imagem} className="w-full h-full object-cover" /> : <span className="text-xl">🐓</span>}
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 truncate w-20 text-center">{selectedMacho?.anilha || '—'}</span>
                  </div>
                  <div className="text-theme-text-muted font-black text-lg">×</div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-full border-2 border-pink-500/50 bg-theme-base flex items-center justify-center overflow-hidden">
                      {selectedFemea?.imagem ? <img src={selectedFemea.imagem} className="w-full h-full object-cover" /> : <span className="text-xl">🐔</span>}
                    </div>
                    <span className="text-[10px] font-bold text-pink-400 truncate w-20 text-center">{selectedFemea?.anilha || '—'}</span>
                  </div>
                </div>
              )}

              {/* Macho */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">Reprodutor (Macho) *</label>
                <select
                  value={machoId}
                  onChange={e => setMachoId(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-blue-400 outline-none transition-colors"
                >
                  <option value="">— Selecione o macho —</option>
                  {machoOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {machoOptions.length === 0 && <p className="text-[10px] text-orange-400">Nenhum macho cadastrado no plantel.</p>}
              </div>

              {/* Femea */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-pink-400 uppercase tracking-wider">Matriz (Fêmea) *</label>
                <select
                  value={femeaId}
                  onChange={e => setFemeaId(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-pink-400 outline-none transition-colors"
                >
                  <option value="">— Selecione a fêmea —</option>
                  {femeaOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {femeaOptions.length === 0 && <p className="text-[10px] text-orange-400">Nenhuma fêmea cadastrada no plantel.</p>}
              </div>

              {/* N° do Cruzador / Baia */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase tracking-wider">Nº do Cruzador / Baia</label>
                <input
                  type="text"
                  value={baiaCasal}
                  onChange={e => setBaiaCasal(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                  placeholder="Ex: Cruzador 3, Baia C-07..."
                />
                <p className="text-[10px] text-theme-text-muted">Identifica onde este casal está alojado</p>
              </div>

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
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
              <button onClick={() => setShowCoupleModal(false)} className="px-4 py-2 text-sm text-theme-text-muted hover:text-white transition-colors">Cancelar</button>
              <button
                onClick={handleSaveCouple}
                disabled={!machoId || !femeaId}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle size={16} /> Registrar Casal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
