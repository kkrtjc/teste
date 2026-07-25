import { useState } from 'react';
import { Plus, Scale, Beef, Timer, AlertCircle, LineChart } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const MOCK_LOTES: any[] = [];
const GROWTH_DATA: any[] = [];

export function Meat() {
  const [activeTab, setActiveTab] = useState<'lotes' | 'desempenho'>('lotes');

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Produção de Corte</h2>
          <p className="text-sm text-theme-text-muted mt-1">Gestão de lotes, conversão alimentar e previsões de abate.</p>
        </div>
        
        <button className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Novo Lote
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-theme-border">
        <button 
          onClick={() => setActiveTab('lotes')}
          className={`pb-3 text-sm font-bold transition-all ${activeTab === 'lotes' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
        >
          Lotes Ativos
        </button>
        <button 
          onClick={() => setActiveTab('desempenho')}
          className={`pb-3 text-sm font-bold transition-all ${activeTab === 'desempenho' ? 'text-theme-primary border-b-2 border-theme-primary' : 'text-theme-text-muted hover:text-white'}`}
        >
          Curva de Desempenho
        </button>
      </div>

      {/* Conteúdo: Lotes */}
      {activeTab === 'lotes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {MOCK_LOTES.map(lote => (
            <div key={lote.id} className="premium-card p-6 hover:border-theme-primary/40 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <Beef size={100} />
              </div>
              
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-black text-lg text-white mb-1">{lote.nome}</h3>
                  <span className="text-xs px-2 py-1 bg-theme-base border border-theme-border rounded-md text-theme-text-muted">
                    {lote.quant} aves
                  </span>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${
                  lote.status === 'Terminação' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' :
                  lote.status === 'Crescimento' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' :
                  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {lote.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-theme-base border border-theme-border/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-theme-text-muted mb-1">
                    <Timer size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Idade</span>
                  </div>
                  <p className="text-lg font-bold text-white">{lote.idade}</p>
                </div>
                
                <div className="bg-theme-base border border-theme-border/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-theme-text-muted mb-1">
                    <Scale size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Peso Médio</span>
                  </div>
                  <p className="text-lg font-bold text-white">{lote.pesoMedio}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-theme-border/50">
                <div>
                  <p className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider mb-1">Conversão Alimentar</p>
                  <p className={`font-black text-sm flex items-center gap-1 ${parseFloat(lote.ca) < 2 ? 'text-theme-accent' : 'text-orange-400'}`}>
                    {lote.ca}
                    {parseFloat(lote.ca) > 2 && <AlertCircle size={14} />}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider mb-1">Previsão Abate</p>
                  <p className="font-bold text-sm text-theme-primary">{lote.abate}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conteúdo: Curva de Desempenho */}
      {activeTab === 'desempenho' && (
        <div className="flex-1 premium-card p-6 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <LineChart size={20} className="text-theme-primary" />
                Curva de Crescimento vs Padrão da Genética
              </h3>
              <p className="text-sm text-theme-text-muted mt-1">Comparativo de peso real (em gramas) contra o ideal para Lote 05.</p>
            </div>
            
            <select className="bg-theme-base border border-theme-border rounded-xl px-4 py-2 text-sm text-white font-medium outline-none focus:border-theme-primary appearance-none">
              <option>Lote 05 - Pesadão</option>
              <option>Lote 04 - Caipirão</option>
            </select>
          </div>

          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={GROWTH_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="semana" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" name="Peso Ideal (Padrão Genético)" dataKey="pesoIdeal" stroke="#94A3B8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" name="Peso Real Médio" dataKey="pesoReal" stroke="#F59E0B" strokeWidth={3} activeDot={{ r: 8 }} />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 p-4 rounded-xl bg-theme-accent/10 border border-theme-accent/20 flex gap-3">
            <div className="w-8 h-8 rounded-full bg-theme-accent/20 flex items-center justify-center text-theme-accent shrink-0">
              <Scale size={16} />
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-1">Excelente Desempenho!</p>
              <p className="text-xs text-theme-text-muted leading-relaxed">
                A partir da Semana 6, o <strong className="text-theme-accent">Lote 05</strong> superou a curva de crescimento ideal esperada para a genética. O manejo nutricional atual está sendo altamente lucrativo.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
