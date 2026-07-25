import { useState } from 'react';
import { Plus, Search, GitBranch, Filter, MoreVertical, Users } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { SearchableSelect } from '../components/SearchableSelect';


export function Genetics() {
  const { birds, openAddBirdModal, openBirdProfile } = useAppContext();
  const [activeTab, setActiveTab] = useState<'plantel' | 'casais' | 'pedigree'>('plantel');
  const [showCoupleModal, setShowCoupleModal] = useState(false);

  // Form states for Casal
  const [machoId, setMachoId] = useState('');
  const [femeaId, setFemeaId] = useState('');
  const [objetivo, setObjetivo] = useState('Melhoramento Genético');

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
      <div className="flex items-center gap-6 border-b border-theme-border">
        <button 
          onClick={() => setActiveTab('plantel')}
          className={`pb-3 text-sm font-bold transition-all ${activeTab === 'plantel' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
        >
          Plantel
        </button>
        <button 
          onClick={() => setActiveTab('casais')}
          className={`pb-3 text-sm font-bold transition-all ${activeTab === 'casais' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
        >
          Casais & Cruza
        </button>
        <button 
          onClick={() => setActiveTab('pedigree')}
          className={`pb-3 text-sm font-bold transition-all ${activeTab === 'pedigree' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
        >
          Pedigree Visual
        </button>
      </div>

      {/* Conteúdo: Plantel */}
      {activeTab === 'plantel' && (
        <div className="flex-1 premium-card flex flex-col overflow-hidden">
          <div className="p-4 border-b border-theme-border flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={16} />
                <input type="text" placeholder="Buscar anilha ou nome..." className="bg-theme-surface border border-theme-border rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-theme-primary outline-none" />
              </div>
              <button className="p-2 text-theme-text-muted hover:text-white bg-theme-surface rounded-lg border border-theme-border flex items-center gap-2 text-sm font-medium">
                <Filter size={16} /> Filtros
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm text-theme-text-muted">
              Total: <strong className="text-white">{birds.length} aves</strong>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-theme-base z-10 shadow-sm">
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
                        <div className="w-10 h-10 rounded-lg bg-theme-surface border border-theme-border flex items-center justify-center text-lg overflow-hidden">
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
        </div>
      )}

      {/* Conteúdo: Casais */}
      {activeTab === 'casais' && (
        <div className="flex-1 premium-card p-6 flex flex-col justify-center items-center text-theme-text-muted text-center border-dashed border-2">
          <Users size={48} className="mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">Módulo de Casais</h3>
          <p className="max-w-md text-sm">Nenhum casal registrado. O cruzamento é onde a mágica do melhoramento acontece.</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/50">
              <h3 className="font-bold text-lg text-white">Formar Novo Casal</h3>
              <button onClick={() => setShowCoupleModal(false)} className="text-theme-text-muted hover:text-white">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
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
                  <input type="date" className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white outline-none [color-scheme:dark]" />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-theme-border flex justify-end gap-3 bg-theme-base/50 relative z-10">
              <button onClick={() => setShowCoupleModal(false)} className="px-5 py-2 text-theme-text-muted">Cancelar</button>
              <button className="btn-primary">Registrar Cruzamento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
