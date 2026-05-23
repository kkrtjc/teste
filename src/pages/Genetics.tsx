import { useState } from 'react';
import { Plus, Search, GitBranch, Filter, MoreVertical, Users } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { SearchableSelect } from '../components/SearchableSelect';


export function Genetics() {
  const { birds, couples, addCouple, openAddBirdModal, openBirdProfile } = useAppContext();
  const [activeTab, setActiveTab] = useState<'plantel' | 'casais' | 'pedigree'>('plantel');
  const [showCoupleModal, setShowCoupleModal] = useState(false);

  // Form states for Casal
  const [machoId, setMachoId] = useState('');
  const [femeaId, setFemeaId] = useState('');
  const [objetivo, setObjetivo] = useState('Melhoramento Genético');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);

  const handleSaveCouple = () => {
    if (!machoId || !femeaId) return;
    addCouple({
      id: Date.now().toString(),
      machoId,
      femeaId,
      objetivo,
      dataInicio,
      status: 'Ativo'
    });
    setShowCoupleModal(false);
    setMachoId('');
    setFemeaId('');
  };

  const machoOptions = birds.filter(b => b.sexo === 'Macho').map(b => ({ label: `${b.anilha} - ${b.nome || 'Sem nome'}`, value: b.id }));
  const femeaOptions = birds.filter(b => b.sexo === 'Fêmea').map(b => ({ label: `${b.anilha} - ${b.nome || 'Sem nome'}`, value: b.id }));
  const objetivoOptions = [
    { label: 'Melhoramento Genético', value: 'Melhoramento Genético' },
    { label: 'Corte (Pesados)', value: 'Corte (Pesados)' },
    { label: 'Postura', value: 'Postura' }
  ];

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Genética & Reprodução</h2>
          <p className="text-sm text-theme-text-muted mt-1">Gestão de plantel, cruzamentos estratégicos e análise de pedigree.</p>
        </div>
        
        <div className="flex gap-3">
          {activeTab === 'plantel' && (
            <button onClick={() => openAddBirdModal()} className="btn-primary flex items-center gap-2">
              <Plus size={18} /> Cadastrar Ave
            </button>
          )}
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
      {activeTab === 'plantel' && (
        <div className="flex-1 premium-card flex flex-col overflow-hidden min-h-0">
          <div className="p-4 sm:p-6 border-b border-theme-border flex flex-col sm:flex-row justify-between gap-4 shrink-0 bg-theme-surface/50">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={16} />
                <input type="text" placeholder="Buscar anilha ou nome..." className="w-full bg-theme-surface border border-theme-border rounded-lg py-2 pl-9 pr-4 text-base md:text-sm text-white focus:border-theme-primary outline-none" />
              </div>
              <button className="p-2 text-theme-text-muted hover:text-white bg-theme-surface rounded-lg border border-theme-border flex items-center gap-2 text-sm font-medium shrink-0">
                <Filter size={16} /> <span className="hidden sm:inline">Filtros</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-theme-text-muted sm:ml-auto">
              Total: <strong className="text-white">{birds.length} aves</strong>
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
                  {birds.map(bird => (
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
                  {birds.length === 0 && (
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
              {birds.map(bird => (
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
              {birds.length === 0 && (
                <div className="p-8 text-center text-theme-text-muted text-sm">
                  Nenhuma ave cadastrada.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
        <div className="flex-1 premium-card p-6 flex flex-col justify-center items-center text-theme-text-muted text-center border-dashed border-2">
          <GitBranch size={48} className="mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">Árvore Genealógica (Pedigree)</h3>
          <p className="max-w-md text-sm">Selecione um animal para visualizar sua linhagem completa de ascendentes e descendentes.</p>
        </div>
      )}

      {/* Modal Novo Casal */}
      {showCoupleModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[90dvh] md:h-auto md:max-h-[90vh] rounded-t-2xl md:rounded-2xl">
            <div className="p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/50 shrink-0">
              <h3 className="font-bold text-lg text-white">Formar Novo Casal</h3>
              <button onClick={() => setShowCoupleModal(false)} className="text-theme-text-muted hover:text-white p-2">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="space-y-1 relative z-40">
                <label className="text-xs font-bold text-blue-400 uppercase">Selecione o Reprodutor (Macho)</label>
                <SearchableSelect 
                  options={machoOptions}
                  value={machoId}
                  onChange={setMachoId}
                  placeholder="Pesquise o Reprodutor..."
                />
              </div>
              
              <div className="space-y-1 relative z-30">
                <label className="text-xs font-bold text-pink-400 uppercase">Selecione a Matriz (Fêmea)</label>
                <SearchableSelect 
                  options={femeaOptions}
                  value={femeaId}
                  onChange={setFemeaId}
                  placeholder="Pesquise a Matriz..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-20">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-text-muted uppercase">Objetivo da Cruza</label>
                  <SearchableSelect 
                    options={objetivoOptions}
                    value={objetivo}
                    onChange={setObjetivo}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-text-muted uppercase">Data de Início</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-base md:text-sm text-white outline-none [color-scheme:dark]" />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-theme-border flex justify-end gap-3 bg-theme-base/50 relative z-10">
              <button onClick={() => setShowCoupleModal(false)} className="px-5 py-2 text-theme-text-muted">Cancelar</button>
              <button onClick={handleSaveCouple} className="btn-primary">Registrar Cruzamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
