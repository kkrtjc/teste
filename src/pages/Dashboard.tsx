import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bird, Baby, Sparkles, Heart, Award, Layers,
  Egg, AlertTriangle, TrendingUp, ShoppingBag, Scale
} from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';
import { useHaptics } from '../hooks/useHaptics';
import muraLogo from '../assets/mura_logo.jpg';

export function Dashboard() {
  const { birds, farmSettings, breeds, eggLots, meatLots, incubationLots, isReady, isInitialSyncDone } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { triggerLight } = useHaptics();

  // Snapshot síncrono do localStorage para carregamento instantâneo a 0ms
  const [cachedStats, setCachedStats] = useState<{
    totalAves: number;
    totalMachos: number;
    totalFemeas: number;
    totalPintinhos: number;
    totalLotes: number;
    totalRacas: number;
  } | null>(() => {
    try {
      const u = localStorage.getItem('@mura-manager:cached-user');
      const uid = (user && user.id) || (u ? JSON.parse(u)?.id : null) || 'guest';
      const raw = localStorage.getItem(`@mura-manager:dashboard-stats:${uid}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.totalAves > 0 || parsed.totalLotes > 0)) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const stats = useMemo(() => {
    let total = 0;
    let machos = 0;
    let femeas = 0;
    let pintinhos = 0;
    
    birds.forEach(b => {
      if (b.status !== 'Vendido' && b.status !== 'Faleceu') {
        total++;
        if (b.sexo === 'Macho') machos++;
        if (b.sexo === 'Fêmea') femeas++;
      }
      if (b.status === 'Crescimento' || (b as any).status === 'Pintinho') {
        pintinhos++;
      }
    });

    const totalLotes = (eggLots?.length || 0) + (meatLots?.length || 0) + (incubationLots?.length || 0);

    return {
      totalAves: total,
      totalMachos: machos,
      totalFemeas: femeas,
      totalPintinhos: pintinhos,
      totalLotes: totalLotes,
      totalRacas: breeds.length
    };
  }, [birds, eggLots, meatLots, incubationLots, breeds.length]);

  // ── Resumo de ovos dos últimos 7 dias (lotes ativos) ──
  const eggSummary = useMemo(() => {
    const today = new Date();
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      last7Days.push(d.toISOString().split('T')[0]);
    }

    let totalMes = 0;
    let totalSemana = 0;
    const dailyMap: Record<string, number> = {};
    const lotsWithGap: string[] = [];

    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    eggLots.forEach(lot => {
      if (lot.status !== 'Ativo') return;
      const registros = lot.registros || [];

      // Soma do mês atual
      registros.forEach(r => {
        if (r.data?.startsWith(thisMonth) && r.observacao !== 'Nenhum registro') {
          totalMes += r.coletados || 0;
        }
      });

      // Soma dos últimos 7 dias + mapa diário
      last7Days.forEach(dateStr => {
        const reg = registros.find(r => r.data === dateStr);
        const collected = (reg && reg.observacao !== 'Nenhum registro') ? (reg.coletados || 0) : 0;
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + collected;
        if (dateStr !== last7Days[last7Days.length - 1]) {
          totalSemana += collected;
        }
      });

      // Detecta lotes com 3+ dias seguidos de "Nenhum registro"
      const sortedDates = [...last7Days].reverse();
      let gapCount = 0;
      for (const d of sortedDates) {
        const reg = registros.find(r => r.data === d);
        if (!reg || reg.observacao === 'Nenhum registro') {
          gapCount++;
        } else {
          break;
        }
      }
      if (gapCount >= 3) {
        lotsWithGap.push(`Baia ${lot.baia}`);
      }
    });

    const daily7 = last7Days.map(d => ({ date: d, count: dailyMap[d] || 0 }));
    const maxDay = Math.max(...daily7.map(d => d.count), 1);

    return { totalMes, totalSemana, daily7, maxDay, lotsWithGap };
  }, [eggLots]);

  // ── Resumo de vendas do mês ──
  const salesSummary = useMemo(() => {
    const today = new Date();
    const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    let count = 0;
    let total = 0;
    birds.forEach(b => {
      if (b.status === 'Vendido' && b.dataVenda?.startsWith(thisMonth)) {
        count++;
        const val = Number(b.valorVenda) || 0;
        total += val;
      }
    });
    return { count, total };
  }, [birds]);

  // ── Lote de corte com pesagem mais recente ──
  const latestMeatLotWeight = useMemo(() => {
    let bestDate = '';
    let bestWeight = 0;
    let bestBaia = '';
    meatLots.forEach(lot => {
      if (lot.status === 'Abatido') return;
      const pesagens = lot.pesagens || [];
      if (pesagens.length === 0) return;
      const last = [...pesagens].sort((a, b) => b.data.localeCompare(a.data))[0];
      if (!bestDate || last.data > bestDate) {
        bestDate = last.data;
        bestWeight = last.pesoMedioG;
        bestBaia = lot.baia;
      }
    });
    if (!bestDate) return null;
    const kg = bestWeight >= 1000 ? `${(bestWeight / 1000).toFixed(2).replace('.', ',')} kg` : `${bestWeight}g`;
    const date = new Date(bestDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return { kg, date, baia: bestBaia };
  }, [meatLots]);

  // Persiste snapshot no localStorage APENAS quando há números concretos (> 0)
  useEffect(() => {
    if (stats.totalAves > 0 || stats.totalLotes > 0) {
      setCachedStats(stats);
      try {
        const uid = user?.id || 'guest';
        localStorage.setItem(`@mura-manager:dashboard-stats:${uid}`, JSON.stringify(stats));
      } catch {}
    }
  }, [stats, user?.id]);

  // Estado de carregamento
  const hasRealData = stats.totalAves > 0 || stats.totalLotes > 0;
  const isSyncFinished = isReady && isInitialSyncDone;
  const isLoading = !isSyncFinished && !cachedStats && !hasRealData;

  const displayStats = hasRealData ? stats : (cachedStats || stats);

  const hasEggLots = eggLots.some(l => l.status === 'Ativo');

  // Se ainda estiver sincronizando e sem dados em cache, exibe a logo do app carregando
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] w-full max-w-md mx-auto px-4 animate-fade-in select-none my-auto">
        {/* Container da Logo com Efeito de Brilho & Borda Dourada */}
        <div className="relative mb-5">
          <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl blur-xl opacity-35 animate-pulse" />
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-amber-500/60 shadow-2xl bg-black flex items-center justify-center">
            <img
              src={muraLogo}
              alt="Mura Manager"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Título */}
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase font-serif drop-shadow-md text-center">
          MURA <span className="text-amber-400">MANAGER</span>
        </h2>
        <p className="text-xs text-amber-200/70 font-semibold tracking-widest uppercase mt-1 text-center">
          Gestão Inteligente de Criatórios
        </p>

        {/* Barra de Progresso Dourada */}
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-6 relative">
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full animate-[loading_1.5s_ease-in-out_infinite] w-full" />
        </div>

        <p className="text-xs text-amber-300/80 font-medium tracking-wide animate-pulse mt-3 text-center">
          Carregando informações do criatório...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center max-w-7xl mx-auto w-full space-y-6 animate-fade-in overflow-x-hidden pb-6">

      {/* ── Farm photo + name ── */}
      <div className="flex flex-col items-center mt-4 space-y-3">
        <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-theme-primary
                        overflow-hidden shadow-xl bg-theme-surface flex items-center justify-center">
          {farmSettings.photo
            ? <img src={farmSettings.photo} alt="Criatório" className="w-full h-full object-cover" />
            : <span className="text-5xl">🐓</span>}
        </div>
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            {farmSettings.name || 'Meu Criatório'}
          </h2>
          {(farmSettings.city || farmSettings.state) && (
            <p className="text-xs text-theme-text-muted mt-0.5">
              📍 {[farmSettings.city, farmSettings.state].filter(Boolean).join(' — ')}
            </p>
          )}
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full max-w-7xl">
          {/* Total Aves Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'aves', filter: 'Total' } }); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-theme-primary/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{displayStats.totalAves}</span>
              <div className="p-1.5 rounded-lg bg-theme-primary/10 text-theme-primary group-hover:scale-110 transition-transform">
                <Bird size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Aves Cadastradas</p>
          </div>

          {/* Raças Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'racas' } }); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-purple-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{displayStats.totalRacas ?? breeds.length}</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                <Award size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Raças Cadastradas</p>
          </div>

          {/* Machos Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'aves', filter: 'Macho' } }); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-blue-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{displayStats.totalMachos}</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <Sparkles size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Machos</p>
          </div>

          {/* Fêmeas Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'aves', filter: 'Fêmea' } }); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-pink-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{displayStats.totalFemeas}</span>
              <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 group-hover:scale-110 transition-transform">
                <Heart size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Fêmeas</p>
          </div>

          {/* Total de Pintinhos Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'aves', filter: 'Crescimento' } }); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-emerald-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{displayStats.totalPintinhos}</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <Baby size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Total de Pintinhos</p>
          </div>

          {/* Lotes Cadastrados Card */}
          <div 
            onClick={() => { triggerLight(); navigate('/lots'); }}
            className="bg-theme-surface hover:bg-theme-surface-hover hover:border-amber-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-2xl font-black text-white">{displayStats.totalLotes}</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <Layers size={16} />
              </div>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Lotes Cadastrados</p>
          </div>
        </div>

      {/* ── Alertas de Lotes sem registro ── */}
      {eggSummary.lotsWithGap.length > 0 && (
        <div
          onClick={() => { triggerLight(); navigate('/eggs'); }}
          className="w-full max-w-7xl p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 flex items-center gap-3 cursor-pointer hover:bg-amber-500/15 transition-colors"
        >
          <AlertTriangle size={20} className="text-amber-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-amber-300">
              ⚠️ {eggSummary.lotsWithGap.length} {eggSummary.lotsWithGap.length === 1 ? 'lote' : 'lotes'} sem registro há 3+ dias
            </p>
            <p className="text-[11px] text-amber-300/70 truncate">
              {eggSummary.lotsWithGap.join(', ')} · Toque para registrar a coleta de hoje
            </p>
          </div>
        </div>
      )}

      {/* ── Seção: Produção de Ovos + Vendas (linha) ── */}
      {(hasEggLots || salesSummary.count > 0 || latestMeatLotWeight) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-7xl">

          {/* Card de Produção de Ovos — Últimos 7 dias */}
          {hasEggLots && (
            <div
              onClick={() => { triggerLight(); navigate('/eggs'); }}
              className="bg-theme-surface border border-theme-border/50 rounded-2xl p-4 space-y-3 cursor-pointer hover:border-amber-500/40 transition-colors shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Egg size={15} />
                  </div>
                  <span className="text-xs font-black text-white">Produção de Ovos</span>
                </div>
                <span className="text-[10px] text-theme-text-muted font-bold">Últimos 7 dias</span>
              </div>

              {/* Mini gráfico de barras SVG */}
              <div className="flex items-end gap-1 h-12">
                {eggSummary.daily7.map((d, i) => {
                  const h = eggSummary.maxDay > 0 ? Math.max(4, (d.count / eggSummary.maxDay) * 48) : 4;
                  const isToday = i === eggSummary.daily7.length - 1;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className={`w-full rounded-t transition-all ${isToday ? 'bg-amber-400' : 'bg-amber-500/40'}`}
                        style={{ height: `${h}px` }}
                        title={`${d.date.slice(8)}: ${d.count} ovos`}
                      />
                      <span className="text-[8px] text-theme-text-muted font-mono">{d.date.slice(8)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t border-theme-border/40 pt-2">
                <div>
                  <p className="text-[10px] text-theme-text-muted font-bold uppercase">Esta semana</p>
                  <p className="text-lg font-black text-amber-400">{eggSummary.totalSemana} <span className="text-xs font-bold text-theme-text-muted">ovos</span></p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-theme-text-muted font-bold uppercase">Este mês</p>
                  <p className="text-lg font-black text-white">{eggSummary.totalMes} <span className="text-xs font-bold text-theme-text-muted">ovos</span></p>
                </div>
              </div>
            </div>
          )}

          {/* Card de Vendas do Mês */}
          {salesSummary.count > 0 && (
            <div
              onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'aves', filter: 'Vendido' } }); }}
              className="bg-theme-surface border border-theme-border/50 rounded-2xl p-4 space-y-3 cursor-pointer hover:border-emerald-500/40 transition-colors shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <ShoppingBag size={15} />
                  </div>
                  <span className="text-xs font-black text-white">Vendas do Mês</span>
                </div>
                <TrendingUp size={14} className="text-emerald-400" />
              </div>

              <div className="flex items-end gap-3 pt-2">
                <div>
                  <p className="text-[10px] text-theme-text-muted font-bold uppercase">Aves vendidas</p>
                  <p className="text-3xl font-black text-emerald-400">{salesSummary.count}</p>
                </div>
                {salesSummary.total > 0 && (
                  <div className="pb-1">
                    <p className="text-[10px] text-theme-text-muted font-bold uppercase">Valor total</p>
                    <p className="text-sm font-black text-white">
                      {salesSummary.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-theme-text-muted">Toque para ver as aves vendidas</p>
            </div>
          )}

          {/* Card de Peso dos Lotes de Corte */}
          {latestMeatLotWeight && (
            <div
              onClick={() => { triggerLight(); navigate('/lots'); }}
              className="bg-theme-surface border border-theme-border/50 rounded-2xl p-4 space-y-3 cursor-pointer hover:border-blue-500/40 transition-colors shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <Scale size={15} />
                  </div>
                  <span className="text-xs font-black text-white">Última Pesagem</span>
                </div>
                <span className="text-[10px] text-theme-text-muted font-bold">{latestMeatLotWeight.date}</span>
              </div>

              <div className="pt-2">
                <p className="text-[10px] text-theme-text-muted font-bold uppercase">Peso médio · Baia {latestMeatLotWeight.baia}</p>
                <p className="text-3xl font-black text-blue-400">{latestMeatLotWeight.kg}</p>
              </div>

              <p className="text-[10px] text-theme-text-muted">Toque para ver os lotes de corte</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
