import { useState } from 'react';
import { Egg, Thermometer, Droplets, CalendarDays, Plus, Activity, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const EGG_PRODUCTION: any[] = [];
const INCUBATORS: any[] = [];

export function Eggs() {
  const [activeTab, setActiveTab] = useState<'postura' | 'incubacao'>('postura');

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Postura & Incubação</h2>
          <p className="text-sm text-theme-text-muted mt-1">Gestão de produção de ovos e controle avançado de chocadeiras.</p>
        </div>
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
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="premium-card p-5">
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Taxa Média de Postura (7 dias)</p>
              <h3 className="text-3xl font-black text-white flex items-center gap-2">
                0%
              </h3>
            </div>
            <div className="premium-card p-5">
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Total de Ovos Coletados (Hoje)</p>
              <h3 className="text-3xl font-black text-white">0 <span className="text-sm font-medium text-theme-text-muted">unidades</span></h3>
            </div>
            <div className="premium-card p-5 border-theme-border bg-theme-base/50 relative overflow-hidden">
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Alerta no Lote 02</p>
              <h3 className="text-xl font-bold text-theme-text-muted mt-2">Sem desvios</h3>
              <p className="text-xs text-theme-text-muted mt-1">Nenhum problema detectado.</p>
            </div>
          </div>

          <div className="flex-1 premium-card p-6 flex flex-col">
            <h3 className="font-bold text-lg text-white flex items-center gap-2 mb-6">
              <Activity size={20} className="text-theme-primary" />
              Taxa de Postura vs Pico Ideal (Lote 02)
            </h3>
            
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={EGG_PRODUCTION} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="colorTaxa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="dia" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" name="Taxa Real (%)" dataKey="taxa" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorTaxa)" activeDot={{ r: 8 }} />
                  <Area type="monotone" name="Taxa Ideal (%)" dataKey="ideal" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
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
    </div>
  );
}
