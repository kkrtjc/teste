import { useState } from 'react';
import { Skull, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MOCK_LOSSES: any[] = [];
const REASON_DATA: any[] = [];

export function Losses() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in flex flex-col pb-24">
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
          <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Mortalidade (Este Mês)</p>
          <h3 className="text-3xl font-black text-white">0.0%</h3>
          <p className="text-xs text-theme-text-muted mt-2">Limite aceitável: 5%</p>
        </div>
        <div className="premium-card p-5">
          <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Total de Aves Perdidas</p>
          <h3 className="text-3xl font-black text-white">0</h3>
          <p className="text-xs text-theme-text-muted mt-2">Neste semestre</p>
        </div>
        <div className="premium-card p-5 border-theme-border bg-theme-base/50">
          <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Impacto Financeiro Estimado</p>
          <h3 className="text-3xl font-black text-white">R$ 0</h3>
          <p className="text-xs text-theme-text-muted mt-2">Prejuízo calculado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <div className="lg:col-span-2 premium-card overflow-hidden flex flex-col">
          <div className="p-5 border-b border-theme-border">
            <h3 className="font-bold text-white">Histórico de Saídas</h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-theme-surface-hover border-b border-theme-border text-xs uppercase tracking-wider text-theme-text-muted">
                <th className="p-4 font-bold">Data</th>
                <th className="p-4 font-bold">Ave / Lote</th>
                <th className="p-4 font-bold">Tipo</th>
                <th className="p-4 font-bold">Motivo</th>
                <th className="p-4 font-bold text-right">Impacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border/50 text-sm">
              {MOCK_LOSSES.map(loss => (
                <tr key={loss.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-theme-text-muted">{loss.data}</td>
                  <td className="p-4 font-bold text-white">{loss.aveLote}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      loss.tipo === 'Morte' ? 'bg-red-500/20 text-red-400' : 'bg-theme-accent/20 text-theme-accent'
                    }`}>
                      {loss.tipo}
                    </span>
                  </td>
                  <td className="p-4 text-theme-text-muted">{loss.motivo}</td>
                  <td className={`p-4 text-right font-mono font-bold ${loss.custo.includes('-') ? 'text-theme-accent' : 'text-red-400'}`}>
                    {loss.custo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="premium-card p-6 flex flex-col">
          <h3 className="font-bold text-white mb-6">Motivos de Mortalidade</h3>
          <div className="flex-1 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REASON_DATA} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} hide />
                <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {REASON_DATA.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#EF4444' : '#F59E0B'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-theme-surface border border-red-500/30 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.15)] w-full max-w-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-theme-border flex justify-between items-center bg-red-500/5">
              <h3 className="font-bold text-lg text-red-400 flex items-center gap-2">
                <Skull size={20} /> Registrar Baixa / Saída
              </h3>
              <button onClick={() => setShowModal(false)} className="text-theme-text-muted hover:text-white">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-text-muted uppercase">Ave ou Lote Afetado *</label>
                  <select className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white">
                    <option>Lote 06 - Mura Cruzado</option>
                    <option>Titan (BR-001)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-text-muted uppercase">Tipo de Saída *</label>
                  <select className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white">
                    <option>Morte</option>
                    <option>Descarte / Venda</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase">Motivo / Causa *</label>
                <select className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white">
                  <option>Doença (Coriza/Gogo)</option>
                  <option>Doença (Bouba)</option>
                  <option>Predador</option>
                  <option>Acidente</option>
                  <option>Descarte de Manejo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-theme-text-muted uppercase">Observações Detalhadas</label>
                <textarea className="w-full bg-theme-base border border-theme-border rounded-lg p-3 text-sm text-white h-24 resize-none" placeholder="Descreva os sintomas antes da morte ou detalhes do ocorrido..."></textarea>
              </div>
            </div>

            <div className="p-5 border-t border-theme-border flex justify-end gap-3 bg-theme-base/50">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 text-theme-text-muted">Cancelar</button>
              <button className="btn-primary !bg-red-500 hover:!bg-red-400 !text-white">Confirmar Baixa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
