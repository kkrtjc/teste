import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Scale, Beef, Timer } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

export function Meat() {
  const { birds, meatLots, addMeatLot } = useAppContext();
  const [showLotModal, setShowLotModal] = useState(false);
  
  // Modal states
  const [baia, setBaia] = useState('');
  const [avesSelecionadas, setAvesSelecionadas] = useState<string[]>([]);
  const [pesoInicial, setPesoInicial] = useState('');
  
  const avesDisponiveis = birds;

  const handleSaveLot = () => {
    if (!baia) return;
    addMeatLot({
      id: Date.now().toString(),
      baia,
      avesIds: avesSelecionadas,
      dataInicio: new Date().toISOString().split('T')[0],
      pesoMedioInicial: pesoInicial || '0',
      status: 'Crescimento'
    });
    setShowLotModal(false);
    setBaia('');
    setAvesSelecionadas([]);
    setPesoInicial('');
  };

  const calculateAgeInDays = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    // Normalize to start of day
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col pb-24">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Engorda</h2>
          <p className="text-sm text-theme-text-muted mt-1">Gestão de lotes, conversão alimentar e previsões de abate.</p>
        </div>
        
        <button onClick={() => setShowLotModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Novo Lote
        </button>
      </div>

      {/* Subheader */}
      <div className="border-b border-theme-border pb-3 mb-2">
        <span className="text-sm font-bold text-theme-primary border-b-2 border-theme-primary pb-3">
          Lotes Ativos
        </span>
      </div>

      {/* Conteúdo: Lotes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {meatLots.map(lote => {
            const ageDays = calculateAgeInDays(lote.dataInicio);
            const statusClass = lote.status === 'Terminação' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' : lote.status === 'Crescimento' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20';

            return (
              <div key={lote.id} className="premium-card p-6 hover:border-theme-primary/40 group relative overflow-hidden transition-colors border border-theme-border/50">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                  <Beef size={100} />
                </div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-xs font-bold text-theme-primary uppercase mb-1 block">Baia {lote.baia}</span>
                    <h3 className="font-black text-xl text-white mb-1">Lote de Engorda</h3>
                    <span className="text-xs px-2 py-1 bg-theme-base border border-theme-border rounded-md text-theme-text-muted mt-2 inline-block">
                      {lote.avesIds.length} aves
                    </span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${statusClass}`}>
                    {lote.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-theme-base border border-theme-border/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-theme-text-muted mb-1">
                      <Timer size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Idade (Dias)</span>
                    </div>
                    <p className="text-lg font-bold text-white">{ageDays} <span className="text-xs text-theme-text-muted">dias</span></p>
                  </div>
                  
                  <div className="bg-theme-base border border-theme-border/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-theme-text-muted mb-1">
                      <Scale size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Peso Início</span>
                    </div>
                    <p className="text-lg font-bold text-white">{lote.pesoMedioInicial}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-theme-border/50">
                  <div>
                    <p className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider mb-1">Início do Lote</p>
                    <p className="font-bold text-sm text-theme-text-muted">{new Date(lote.dataInicio).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <button className="text-xs font-bold text-theme-primary hover:text-white transition-colors">Gerenciar →</button>
                  </div>
                </div>
              </div>
            );
          })}
          {meatLots.length === 0 && (
            <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
              <Beef size={40} className="mx-auto mb-3 opacity-50" />
              <p className="font-bold text-white mb-1">Nenhum lote de engorda cadastrado</p>
              <p className="text-sm">Cadastre um novo lote para gerenciar o crescimento de suas aves de corte.</p>
            </div>
          )}
        </div>

      {/* Modal Novo Lote */}
      {showLotModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[90dvh] sm:h-auto sm:max-h-[85vh]">
            <div className="p-5 border-b border-theme-border flex justify-between items-center bg-theme-base/50 shrink-0">
              <h3 className="font-bold text-lg text-white">Cadastrar Lote de Engorda</h3>
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
                  placeholder="Ex: Baia 05" 
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase">Peso Médio Inicial (g ou kg)</label>
                <input 
                  type="text" 
                  value={pesoInicial}
                  onChange={e => setPesoInicial(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white focus:border-theme-primary outline-none" 
                  placeholder="Ex: 40g (Pintinho) ou 1.2kg"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-theme-text-muted uppercase flex justify-between">
                  <span>Vincular Aves ({avesSelecionadas.length})</span>
                </label>
                <div className="bg-theme-base border border-theme-border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                  {avesDisponiveis.map(f => (
                    <label key={f.id} className="flex items-center gap-3 p-2 hover:bg-theme-surface rounded cursor-pointer transition-colors border border-transparent hover:border-theme-border">
                      <input 
                        type="checkbox" 
                        checked={avesSelecionadas.includes(f.id)}
                        onChange={(e) => {
                          if (e.target.checked) setAvesSelecionadas(prev => [...prev, f.id]);
                          else setAvesSelecionadas(prev => prev.filter(id => id !== f.id));
                        }}
                        className="accent-theme-primary w-4 h-4 rounded"
                      />
                      <div>
                        <p className="font-bold text-sm text-white">{f.anilha}</p>
                        <p className="text-[10px] text-theme-text-muted">{f.nome || 'Sem nome'} - <span className="text-theme-primary">{f.raca}</span> ({f.sexo})</p>
                      </div>
                    </label>
                  ))}
                  {avesDisponiveis.length === 0 && (
                    <p className="text-sm text-theme-text-muted text-center p-4">Nenhuma ave cadastrada no sistema.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-theme-border flex justify-end gap-3 bg-theme-base/50 shrink-0">
              <button onClick={() => setShowLotModal(false)} className="px-5 py-2 text-theme-text-muted hover:text-white transition-colors">Cancelar</button>
              <button onClick={handleSaveLot} disabled={!baia} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">Registrar Lote</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
