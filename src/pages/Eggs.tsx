import { useState } from 'react';
import { Egg, Thermometer, Droplets, CalendarDays, Plus, Activity, Timer } from 'lucide-react';

import { useAppContext } from '../lib/AppContext';

const INCUBATORS: any[] = [];

export function Eggs() {
  const { birds, eggLots, addEggLot } = useAppContext();
  const [activeTab, setActiveTab] = useState<'postura' | 'incubacao'>('postura');
  const [showLotModal, setShowLotModal] = useState(false);
  const [baia, setBaia] = useState('');
  const [femeasSelecionadas, setFemeasSelecionadas] = useState<string[]>([]);

  const femeasDisponiveis = birds.filter(b => b.sexo === 'Fêmea');

  const calculateAgeInDays = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
  };

  const handleSaveLot = () => {
    if (!baia) return;
    addEggLot({
      id: Date.now().toString(),
      baia,
      femeasIds: femeasSelecionadas,
      expectativaDiaria: Math.round(femeasSelecionadas.length * 0.85),
      dataInicio: new Date().toISOString().split('T')[0],
      status: 'Ativo'
    });
    setShowLotModal(false);
    setBaia('');
    setFemeasSelecionadas([]);
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Postura & Incubação</h2>
          <p className="text-sm text-theme-text-muted mt-1">Gestão de produção de ovos e controle avançado de chocadeiras.</p>
        </div>
        {activeTab === 'postura' && (
          <button onClick={() => setShowLotModal(true)} className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
            <Plus size={18} /> Cadastrar Lote
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-theme-border">
        <button 
          onClick={() => setActiveTab('postura')}
          className={`pb-3 text-sm font-bold transition-all ${activeTab === 'postura' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
        >
          Produção de Postura (Diária)
        </button>
        <button 
          onClick={() => setActiveTab('incubacao')}
          className={`pb-3 text-sm font-bold transition-all ${activeTab === 'incubacao' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
        >
          Controle de Chocadeiras
        </button>
      </div>

      {/* Conteúdo: Postura */}
      {activeTab === 'postura' && (
        <div className="flex-1 flex flex-col space-y-6 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
            <div className="premium-card p-5">
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Total de Lotes Ativos</p>
              <h3 className="text-3xl font-black text-white">{eggLots.filter(l => l.status === 'Ativo').length}</h3>
            </div>
            <div className="premium-card p-5">
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Expectativa Total Diária</p>
              <h3 className="text-3xl font-black text-white">{eggLots.reduce((acc, l) => acc + (l.status === 'Ativo' ? Number(l.expectativaDiaria) : 0), 0)} <span className="text-sm font-medium text-theme-text-muted">ovos/dia</span></h3>
            </div>
            <div className="premium-card p-5 border-theme-border bg-theme-base/50">
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Fêmeas em Postura</p>
              <h3 className="text-3xl font-black text-white">{eggLots.reduce((acc, l) => acc + (l.status === 'Ativo' ? l.femeasIds.length : 0), 0)}</h3>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-4">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {eggLots.map(lot => {
                 const ageDays = calculateAgeInDays(lot.dataInicio);
                 
                 return (
                 <div key={lot.id} className="premium-card p-6 border border-theme-border/50 hover:border-theme-primary/50 transition-colors relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                     <Egg size={100} />
                   </div>
                   <div className="flex justify-between items-start mb-6">
                     <div>
                       <span className="text-xs font-bold text-theme-primary uppercase mb-1 block">Baia {lot.baia}</span>
                       <h3 className="font-black text-xl text-white">Lote de Postura</h3>
                     </div>
                     <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${lot.status === 'Ativo' ? 'bg-green-500/20 text-green-400' : 'bg-theme-base text-theme-text-muted border border-theme-border'}`}>
                       {lot.status}
                     </span>
                   </div>
                   
                   <div className="grid grid-cols-3 gap-4 mb-6">
                     <div className="bg-theme-surface p-3 rounded-xl border border-theme-border flex flex-col justify-center">
                       <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1"><Timer size={12}/> Idade</p>
                       <p className="text-lg font-black text-white">{ageDays} <span className="text-xs text-theme-text-muted font-bold">dias</span></p>
                     </div>
                     <div className="bg-theme-surface p-3 rounded-xl border border-theme-border flex flex-col justify-center">
                       <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1"><Egg size={12}/> Meta</p>
                       <p className="text-lg font-black text-white">{lot.expectativaDiaria} <span className="text-xs text-theme-text-muted font-bold">ovos/d</span></p>
                     </div>
                     <div className="bg-theme-surface p-3 rounded-xl border border-theme-border flex flex-col justify-center">
                       <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1"><Activity size={12}/> Aves</p>
                       <p className="text-lg font-black text-white">{lot.femeasIds.length}</p>
                     </div>
                   </div>
                   
                   <div className="pt-4 border-t border-theme-border/50">
                     <div className="flex justify-between items-center mb-3">
                       <p className="text-[10px] font-bold text-theme-text-muted uppercase">Aves Vinculadas ({lot.femeasIds.length})</p>
                       <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Início: <span className="text-theme-text-muted">{new Date(lot.dataInicio).toLocaleDateString('pt-BR')}</span></p>
                     </div>
                     <div className="flex flex-wrap gap-2">
                       {lot.femeasIds.map(id => {
                         const bird = birds.find(b => b.id === id);
                         if (!bird) return null;
                         return (
                           <span key={id} className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-theme-text-muted border border-theme-border font-medium">
                             {bird.anilha}
                           </span>
                         );
                       })}
                       {lot.femeasIds.length === 0 && (
                         <span className="text-xs text-theme-text-muted italic">Nenhuma ave vinculada.</span>
                       )}
                     </div>
                   </div>
                 </div>
               )})}
               {eggLots.length === 0 && (
                 <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                   <Egg size={40} className="mx-auto mb-3 opacity-50" />
                   <p className="font-bold text-white mb-1">Nenhum lote cadastrado</p>
                   <p className="text-sm">Cadastre um lote para começar a gerenciar sua produção de postura.</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      )}

      {/* Conteúdo: Incubação */}
      {activeTab === 'incubacao' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button className="premium-card p-8 flex flex-col items-center justify-center text-theme-text-muted hover:border-theme-primary hover:text-theme-primary transition-all border-dashed group">
            <div className="w-16 h-16 rounded-full bg-theme-surface-hover flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <h3 className="font-bold text-lg">Nova Setagem</h3>
            <p className="text-xs text-center mt-2 max-w-xs">Registre uma nova entrada de ovos em uma chocadeira para acompanhamento dia-a-dia.</p>
          </button>

          {INCUBATORS.map(inc => (
            <div key={inc.id} className="premium-card p-6 flex flex-col justify-between group overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                <Egg size={150} />
              </div>
              
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-xl text-white">{inc.nome}</h3>
                  <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${
                    inc.status === 'Eclosão Próxima' ? 'bg-theme-accent/20 text-theme-accent border border-theme-accent/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {inc.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><CalendarDays size={12}/> Entrada</p>
                    <p className="font-medium text-sm text-white">{inc.inicio}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><CalendarDays size={12}/> Prev. Eclosão</p>
                    <p className="font-medium text-sm text-theme-primary">{inc.eclosao}</p>
                  </div>
                </div>

                <div className="bg-theme-base border border-theme-border/50 rounded-xl p-4 flex gap-6 mb-6">
                  <div>
                    <p className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider mb-1">Ovos Setados</p>
                    <p className="font-black text-xl text-white">{inc.total}</p>
                  </div>
                  <div className="w-px bg-theme-border/50" />
                  <div>
                    <p className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider mb-1">Ovos Férteis</p>
                    <p className="font-black text-xl text-white">
                      {inc.ferteis ? inc.ferteis : <span className="text-sm font-normal text-theme-text-muted">Aguardando</span>}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-theme-border">
                <div className="flex gap-4">
                  <div className="flex items-center gap-2 text-theme-text-muted">
                    <Thermometer size={16} className="text-orange-400" />
                    <span className="text-sm font-bold text-white">{inc.temp}</span>
                  </div>
                  <div className="flex items-center gap-2 text-theme-text-muted">
                    <Droplets size={16} className="text-blue-400" />
                    <span className="text-sm font-bold text-white">{inc.umid}</span>
                  </div>
                </div>
                
                <button className="text-sm font-bold text-theme-primary hover:text-white transition-colors">
                  Ver Detalhes →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Lote */}
      {showLotModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[90dvh] sm:h-auto sm:max-h-[85vh]">
            <div className="p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/50 shrink-0">
              <h3 className="font-bold text-lg text-white">Cadastrar Lote de Postura</h3>
              <button onClick={() => setShowLotModal(false)} className="text-theme-text-muted hover:text-white">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase">Identificação da Baia *</label>
                <input 
                  type="text" 
                  value={baia}
                  onChange={e => setBaia(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white focus:border-theme-primary outline-none" 
                  placeholder="Ex: Baia 01" 
                />
              </div>

              <div className="space-y-1 bg-theme-primary/10 border border-theme-primary/30 p-3 rounded-lg">
                <label className="text-xs font-bold text-theme-primary uppercase">Expectativa de Ovos (Diária)</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black text-white">{Math.round(femeasSelecionadas.length * 0.85)}</span>
                  <span className="text-xs text-theme-text-muted leading-tight">ovos estimados/dia<br/>(calculado auto. base 85%)</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-theme-text-muted uppercase flex justify-between">
                  <span>Selecionar Fêmeas ({femeasSelecionadas.length})</span>
                </label>
                <div className="bg-theme-base border border-theme-border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                  {femeasDisponiveis.map(f => (
                    <label key={f.id} className="flex items-center gap-3 p-2 hover:bg-theme-surface rounded cursor-pointer transition-colors border border-transparent hover:border-theme-border">
                      <input 
                        type="checkbox" 
                        checked={femeasSelecionadas.includes(f.id)}
                        onChange={(e) => {
                          if (e.target.checked) setFemeasSelecionadas(prev => [...prev, f.id]);
                          else setFemeasSelecionadas(prev => prev.filter(id => id !== f.id));
                        }}
                        className="accent-theme-primary w-4 h-4 rounded"
                      />
                      <div>
                        <p className="font-bold text-sm text-white">{f.anilha}</p>
                        <p className="text-[10px] text-theme-text-muted">{f.nome || 'Sem nome'} - <span className="text-theme-primary">{f.raca}</span></p>
                      </div>
                    </label>
                  ))}
                  {femeasDisponiveis.length === 0 && (
                    <p className="text-sm text-theme-text-muted text-center p-4">Nenhuma fêmea cadastrada no sistema.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-theme-border flex justify-end gap-3 bg-theme-base/50 shrink-0">
              <button onClick={() => setShowLotModal(false)} className="px-5 py-2 text-theme-text-muted hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSaveLot} disabled={!baia} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">Registrar Lote</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
