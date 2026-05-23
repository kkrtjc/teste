import { useState } from 'react';
import { Activity, Egg, TrendingUp, AlertTriangle, ChevronDown } from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';

const DATA_POSTURA: any[] = [];
const DATA_ENGORDA: any[] = [];
const DATA_CRUZAMENTOS: any[] = [];

export function Dashboard() {
  const [chartType, setChartType] = useState<'postura' | 'engorda' | 'cruzamentos'>('postura');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-card p-5 hover:border-theme-primary/50 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Total de Aves</p>
              <h3 className="text-3xl font-black text-white">0</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-theme-primary/10 flex items-center justify-center text-theme-primary">
              <Activity size={20} />
            </div>
          </div>
          <p className="text-xs text-theme-accent mt-3 flex items-center gap-1 font-medium">
            Nenhum dado registrado
          </p>
        </div>

        <div className="premium-card p-5 hover:border-theme-primary/50 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Taxa de Postura</p>
              <h3 className="text-3xl font-black text-white">0%</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Egg size={20} />
            </div>
          </div>
          <p className="text-xs text-theme-accent mt-3 flex items-center gap-1 font-medium">
            Sem lotes em produção
          </p>
        </div>

        <div className="premium-card p-5 hover:border-theme-primary/50 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">C.A. Média</p>
              <h3 className="text-3xl font-black text-white">0.0</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-theme-accent/10 flex items-center justify-center text-theme-accent">
              <TrendingUp size={20} />
            </div>
          </div>
          <p className="text-xs text-theme-accent mt-3 flex items-center gap-1 font-medium">
            Sem lotes de corte
          </p>
        </div>

        <div className="premium-card p-5 border-theme-border bg-theme-base/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Alertas</p>
              <h3 className="text-3xl font-black text-theme-text-muted">0</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-theme-surface flex items-center justify-center text-theme-text-muted">
              <AlertTriangle size={20} />
            </div>
          </div>
          <p className="text-xs text-theme-text-muted mt-3 font-medium">
            Nenhum alerta ativo
          </p>
        </div>
      </div>

      {/* Gráfico Dinâmico */}
      <div className="premium-card p-6 flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="relative inline-block">
            <select 
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="appearance-none bg-theme-surface-hover border border-theme-primary/50 text-white font-bold text-xl px-5 py-3 pr-12 rounded-xl outline-none focus:ring-2 focus:ring-theme-primary/50 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.15)]"
            >
              <option value="postura">Performance de Postura</option>
              <option value="engorda">Performance de Engorda</option>
              <option value="cruzamentos">Performance de Cruzamentos</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-theme-primary pointer-events-none" size={20} />
          </div>

          <div className="flex gap-2">
            <select className="bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text-muted outline-none focus:border-theme-primary">
              <option>Todos os Lotes</option>
              <option>Lote 1 (Caipira)</option>
              <option>Lote 2 (Gigante)</option>
            </select>
            <select className="bg-theme-surface border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text-muted outline-none focus:border-theme-primary">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
            </select>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'postura' ? (
              <AreaChart data={DATA_POSTURA}>
                <defs>
                  <linearGradient id="colorOvos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                <Legend iconType="circle" />
                <Area type="monotone" name="Ovos Produzidos" dataKey="ovos" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorOvos)" activeDot={{ r: 8 }} />
                <Area type="monotone" name="Meta (Ideal)" dataKey="ideal" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            ) : chartType === 'engorda' ? (
              <LineChart data={DATA_ENGORDA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#F59E0B" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#10B981" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                <Legend iconType="circle" />
                <Line yAxisId="left" type="monotone" name="Peso Médio (g)" dataKey="peso" stroke="#F59E0B" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line yAxisId="right" type="monotone" name="Conversão Alimentar (CA)" dataKey="ca" stroke="#10B981" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            ) : (
              <BarChart data={DATA_CRUZAMENTOS}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Legend iconType="circle" />
                <Bar name="Ovos Chocados" dataKey="ovos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar name="Pintinhos Nascidos" dataKey="nascidos" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
