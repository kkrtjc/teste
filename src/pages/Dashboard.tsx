import { Activity, Egg, Beef, AlertTriangle, Timer, Info } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

export function Dashboard() {
  const { birds, eggLots, meatLots, couples } = useAppContext();

  // Calculations
  const totalAves = birds.length;
  
  const totalOvosEsperados = eggLots.reduce((acc, lot) => acc + lot.expectativaDiaria, 0);
  const totalAvesPostura = eggLots.reduce((acc, lot) => acc + lot.femeasIds.length, 0);
  
  const totalAvesEngorda = meatLots.reduce((acc, lot) => acc + lot.avesIds.length, 0);
  const totalLotesEngorda = meatLots.length;

  const totalCasais = couples.length;

  // Alerts logic
  const alerts = [];
  if (totalAves === 0) alerts.push("Seu plantel está vazio. Comece cadastrando raças e aves.");
  if (eggLots.length === 0) alerts.push("Você não tem Lotes de Postura ativos.");
  if (meatLots.length === 0) alerts.push("Você não tem Lotes de Engorda ativos.");

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-black text-white">Dashboard</h2>
        <p className="text-sm text-theme-text-muted mt-1">Visão geral e métricas reais do seu criatório.</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="premium-card p-5 border border-theme-border/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Total de Aves</p>
              <h3 className="text-3xl font-black text-white">{totalAves}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-theme-primary/10 flex items-center justify-center text-theme-primary">
              <Activity size={20} />
            </div>
          </div>
          <p className="text-xs text-theme-text-muted mt-3 font-medium">
            Cadastradas no sistema
          </p>
        </div>

        <div className="premium-card p-5 border border-theme-border/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Previsão Diária de Ovos</p>
              <h3 className="text-3xl font-black text-white">{totalOvosEsperados}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <Egg size={20} />
            </div>
          </div>
          <p className="text-xs text-theme-text-muted mt-3 font-medium">
            Vindo de {totalAvesPostura} matrizes em postura
          </p>
        </div>

        <div className="premium-card p-5 border border-theme-border/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Aves em Engorda</p>
              <h3 className="text-3xl font-black text-white">{totalAvesEngorda}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Beef size={20} />
            </div>
          </div>
          <p className="text-xs text-theme-text-muted mt-3 font-medium">
            Distribuídas em {totalLotesEngorda} lotes
          </p>
        </div>

        <div className="premium-card p-5 border border-theme-border/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Cruzamentos Ativos</p>
              <h3 className="text-3xl font-black text-white">{totalCasais}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Activity size={20} />
            </div>
          </div>
          <p className="text-xs text-theme-text-muted mt-3 font-medium">
            Formando nova genética
          </p>
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="premium-card p-6 border border-theme-border/50">
          <h3 className="font-bold text-lg text-white flex items-center gap-2 mb-4">
            <AlertTriangle className="text-theme-primary" size={20} />
            Avisos do Sistema
          </h3>
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-theme-surface rounded-xl border border-theme-border">
                <Info size={16} className="text-theme-text-muted" />
                <p className="text-sm text-theme-text-muted">{alert}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {alerts.length === 0 && (
        <div className="premium-card p-6 border border-theme-border/50 flex flex-col items-center justify-center py-12">
          <Activity size={40} className="text-theme-primary opacity-50 mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">Tudo em Ordem!</h3>
          <p className="text-sm text-theme-text-muted">Seu criatório está funcionando perfeitamente. Continue registrando seus dados.</p>
        </div>
      )}
    </div>
  );
}
