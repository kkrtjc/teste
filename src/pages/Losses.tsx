import { useState } from 'react';
import { Skull, Plus, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAppContext } from '../lib/AppContext';

export function Losses() {
  const { birds, editBird, removeBird } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [selectedBirdId, setSelectedBirdId] = useState('');
  const [lossType, setLossType] = useState<'Faleceu' | 'Vendido'>('Faleceu');

  const inactiveBirds = birds.filter(b => b.status === 'Vendido' || b.status === 'Faleceu');

  const sortedLosses = [...inactiveBirds].sort((a, b) => {
    const dateA = a.dataBaixa || '1970-01-01';
    const dateB = b.dataBaixa || '1970-01-01';
    return dateB.localeCompare(dateA);
  });

  const activeCount = birds.filter(b => b.status !== 'Vendido' && b.status !== 'Faleceu').length;
  const deceasedCount = birds.filter(b => b.status === 'Faleceu').length;
  const soldCount = birds.filter(b => b.status === 'Vendido').length;
  
  const totalEver = activeCount + deceasedCount;
  const mortalityRate = totalEver > 0 ? ((deceasedCount / totalEver) * 100).toFixed(1) : '0.0';
  const financialImpact = deceasedCount * 100; // estimativa de R$ 100 por morte

  // Agrupar mortalidade por raça
  const breedLosses: Record<string, number> = {};
  birds.filter(b => b.status === 'Faleceu').forEach(b => {
    const breedName = b.raca || 'Desconhecida';
    breedLosses[breedName] = (breedLosses[breedName] || 0) + 1;
  });
  const reasonData = Object.entries(breedLosses).map(([name, amount]) => ({
    name,
    amount
  })).sort((a, b) => b.amount - a.amount).slice(0, 5);

  const activeBirds = birds.filter(b => b.status !== 'Vendido' && b.status !== 'Faleceu');

  const handleConfirmLoss = () => {
    if (!selectedBirdId) return;
    editBird(selectedBirdId, { status: lossType });
    setShowModal(false);
    setSelectedBirdId('');
  };

  return (
    <div className="space-y-6 animate-fade-in flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Baixas e Descartes</h2>
          <p className="text-sm text-theme-text-muted mt-1">Controle de mortalidade, saídas e prejuízos financeiros associados.</p>
        </div>
        
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 !bg-red-500 hover:!bg-red-400 !text-white !shadow-[0_0_15px_rgba(239,68,68,0.3)]">
          <Plus size={18} /> Registrar Baixa
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="premium-card p-5 border-theme-border bg-theme-base/50">
          <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Mortalidade Geral</p>
          <h3 className="text-3xl font-black text-white">{mortalityRate}%</h3>
          <p className="text-xs text-theme-text-muted mt-2">Fórmula: Mortes / (Ativas + Mortes)</p>
        </div>
        <div className="premium-card p-5">
          <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Total de Baixas</p>
          <h3 className="text-3xl font-black text-white">{inactiveBirds.length}</h3>
          <p className="text-xs text-theme-text-muted mt-2">{deceasedCount} mortes · {soldCount} vendas</p>
        </div>
        <div className="premium-card p-5 border-theme-border bg-theme-base/50">
          <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Impacto Financeiro (Mortes)</p>
          <h3 className="text-3xl font-black text-white">R$ {financialImpact}</h3>
          <p className="text-xs text-theme-text-muted mt-2">Estimativa: R$ 100/ave perdida</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <div className="lg:col-span-2 premium-card overflow-hidden flex flex-col">
          <div className="p-5 border-b border-theme-border">
            <h3 className="font-bold text-white">Histórico de Saídas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-theme-surface-hover border-b border-theme-border text-xs uppercase tracking-wider text-theme-text-muted">
                  <th className="p-4 font-bold">Data</th>
                  <th className="p-4 font-bold">Ave / Raça</th>
                  <th className="p-4 font-bold">Tipo</th>
                  <th className="p-4 font-bold">Gênero / Peso</th>
                  <th className="p-4 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border/50 text-sm">
                {sortedLosses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-theme-text-muted italic">
                      Nenhuma baixa ou descarte registrado.
                    </td>
                  </tr>
                ) : (
                  sortedLosses.map(bird => (
                    <tr key={bird.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-theme-text-muted">
                        {bird.dataBaixa ? bird.dataBaixa.split('-').reverse().join('/') : '—'}
                      </td>
                      <td className="p-4 font-bold text-white">
                        <div>
                          <p>{bird.anilha} {bird.nome ? `(${bird.nome})` : ''}</p>
                          <p className="text-xs text-theme-text-muted font-normal">{bird.raca}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                          bird.status === 'Faleceu' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {bird.status}
                        </span>
                      </td>
                      <td className="p-4 text-theme-text-muted">
                        {bird.sexo} {bird.peso ? `· ${bird.peso}` : ''}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Deseja excluir permanentemente a ave ${bird.anilha} do plantel?`)) {
                              removeBird(bird.id);
                            }
                          }}
                          className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors inline-flex items-center"
                          title="Excluir Definitivamente"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="premium-card p-6 flex flex-col">
          <h3 className="font-bold text-white mb-6">Mortalidade por Raça</h3>
          {reasonData.length > 0 ? (
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reasonData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} hide />
                  <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {reasonData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#EF4444' : '#F59E0B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-theme-text-muted text-xs italic">
              Nenhuma mortalidade registrada.
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 animate-fade-in">
          <div className="bg-theme-surface border border-red-500/30 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.15)] w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-5 border-b border-theme-border flex justify-between items-center bg-red-500/5">
              <h3 className="font-bold text-lg text-red-400 flex items-center gap-2">
                <Skull size={20} /> Registrar Baixa / Saída
              </h3>
              <button onClick={() => setShowModal(false)} className="text-theme-text-muted hover:text-white">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase">Ave Afetada *</label>
                <select
                  value={selectedBirdId}
                  onChange={e => setSelectedBirdId(e.target.value)}
                  className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white focus:border-red-500/30 outline-none"
                >
                  <option value="">— Selecione uma ave ativa —</option>
                  {activeBirds.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.anilha} {b.nome ? `(${b.nome})` : ''} - {b.raca}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase">Tipo de Saída *</label>
                <select
                  value={lossType}
                  onChange={e => setLossType(e.target.value as 'Faleceu' | 'Vendido')}
                  className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white focus:border-red-500/30 outline-none"
                >
                  <option value="Faleceu">Faleceu (Morte)</option>
                  <option value="Vendido">Venda / Comercialização</option>
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-theme-border flex justify-end gap-3 bg-theme-base/50">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 text-theme-text-muted">Cancelar</button>
              <button
                onClick={handleConfirmLoss}
                disabled={!selectedBirdId}
                className="btn-primary !bg-red-500 hover:!bg-red-400 !text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar Baixa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
