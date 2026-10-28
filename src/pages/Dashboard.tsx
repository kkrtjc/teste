import { todayLocalISO } from '../lib/dates';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bird, Sparkles, Heart, Award,
  TrendingUp, ShoppingBag, DollarSign, Activity
} from 'lucide-react';
import { formatBRL } from '../lib/sales/money';
import { summarize, rangeForPeriod } from '../lib/sales/aggregate';
import { useAppSlice } from '../lib/AppContext';
import { useAuth, isUserAdmin } from '../lib/AuthContext';
import { useHaptics } from '../hooks/useHaptics';

export function Dashboard() {
  const { birds, farmSettings, breeds, movements, isReady } = useAppSlice(
    'birds', 
    'farmSettings', 
    'breeds', 
    'movements', 
    'isReady'
  );
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { triggerLight } = useHaptics();

  // Snapshot síncrono do localStorage para carregamento instantâneo a 0ms
  const [cachedStats, setCachedStats] = useState<{
    totalAves: number;
    totalMachos: number;
    totalFemeas: number;
    totalCrescimento: number;
    totalRacas: number;
  } | null>(() => {
    try {
      const u = localStorage.getItem('@mura-manager:cached-user');
      const parsedUser = (user && user.id) ? user : (u ? JSON.parse(u) : null);
      if (!parsedUser || !parsedUser.id) return null;
      const isAdm = isAdmin || isUserAdmin(parsedUser.email) || isUserAdmin(parsedUser.id);
      const cacheKey = isAdm ? '@mura-manager:admin:dashboard-stats' : `@mura-manager:dashboard-stats:${parsedUser.id}`;
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return null;
  });

  const stats = useMemo(() => {
    let total = 0;
    let machos = 0;
    let femeas = 0;
    let crescimento = 0;
    
    birds.forEach(b => {
      const s = (b.status || '').toLowerCase().trim();
      if (s !== 'vendido' && s !== 'faleceu' && s !== 'abatido' && s !== 'morto') {
        total++;
        if (b.sexo === 'Macho') machos++;
        if (b.sexo === 'Fêmea') femeas++;
      }
      if (b.status === 'Crescimento') {
        crescimento++;
      }
    });

    return {
      totalAves: total,
      totalMachos: machos,
      totalFemeas: femeas,
      totalCrescimento: crescimento,
      totalRacas: breeds.length
    };
  }, [birds, breeds.length]);

  // Resumo de vendas do mês (via ledger unificado)
  const salesSummary = useMemo(() => {
    const today = todayLocalISO();
    const range = rangeForPeriod('mes', today);
    const s = summarize(movements, range, birds);
    return {
      count: s.vendasCount,
      totalCentavos: s.receita,
      pendenteCentavos: s.aReceber,
      recebidoCentavos: s.recebido,
      lucroCentavos: s.lucro
    };
  }, [movements, birds]);

  // Sincroniza cachedStats quando o usuário autenticado mudar
  useEffect(() => {
    try {
      if (!user || !user.id) {
        setCachedStats(null);
        return;
      }
      const isAdm = isAdmin || isUserAdmin(user.email) || isUserAdmin(user.id);
      const cacheKey = isAdm ? '@mura-manager:admin:dashboard-stats' : `@mura-manager:dashboard-stats:${user.id}`;
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        setCachedStats(JSON.parse(raw));
      } else {
        setCachedStats(null);
      }
    } catch {
      setCachedStats(null);
    }
  }, [user?.id, user?.email, isAdmin]);

  // Persiste snapshot no localStorage isolado exclusivamente pelo ID do usuário
  useEffect(() => {
    if (!user || !user.id) return;
    try {
      const isAdm = isAdmin || isUserAdmin(user.email) || isUserAdmin(user.id);
      const cacheKey = isAdm ? '@mura-manager:admin:dashboard-stats' : `@mura-manager:dashboard-stats:${user.id}`;
      localStorage.setItem(cacheKey, JSON.stringify(stats));
    } catch {}
  }, [stats, user?.id, user?.email, isAdmin]);

  const displayStats = isReady ? stats : (cachedStats || stats);

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
      <div id="dashboard-stats-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full max-w-7xl">
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

        {/* Crescimento Card */}
        <div 
          onClick={() => { triggerLight(); navigate('/birds', { state: { tab: 'aves', filter: 'Crescimento' } }); }}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-amber-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <span className="text-2xl font-black text-white">{displayStats.totalCrescimento}</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <Activity size={16} />
            </div>
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Em Crescimento</p>
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

        {/* Vendas no Mês Card */}
        <div 
          onClick={() => { triggerLight(); navigate('/vendas'); }}
          className="bg-theme-surface hover:bg-theme-surface-hover hover:border-emerald-500/40 border border-theme-border/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-95 shadow-lg flex flex-col justify-between h-[100px] relative group overflow-hidden"
        >
          <div className="flex items-start justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-400">{salesSummary.count}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign size={16} />
            </div>
          </div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-theme-text-muted mt-2">Vendas no Mês</p>
        </div>
      </div>

      {/* ── Card de Faturamento e Vendas do Mês ── */}
      <div className="w-full max-w-7xl">
        <div
          onClick={() => { triggerLight(); navigate('/vendas'); }}
          className="bg-theme-surface border border-theme-border/50 rounded-2xl p-5 space-y-3 cursor-pointer hover:border-emerald-500/40 transition-colors shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <ShoppingBag size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Gestão Financeira & Vendas</h3>
                <p className="text-[11px] text-theme-text-muted">Movimentações do mês atual</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
              <TrendingUp size={15} />
              <span>Ver Detalhes</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-theme-border/40">
            <div>
              <p className="text-[10px] text-theme-text-muted font-bold uppercase">Aves Vendidas</p>
              <p className="text-xl sm:text-2xl font-black text-white">{salesSummary.count}</p>
            </div>
            <div>
              <p className="text-[10px] text-theme-text-muted font-bold uppercase">Faturamento Bruto</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400">
                {formatBRL(salesSummary.totalCentavos)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-theme-text-muted font-bold uppercase">Recebido em Caixa</p>
              <p className="text-xl sm:text-2xl font-black text-white">
                {formatBRL(salesSummary.recebidoCentavos)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-theme-text-muted font-bold uppercase">A Receber (Pendentes)</p>
              <p className={`text-xl sm:text-2xl font-black ${salesSummary.pendenteCentavos > 0 ? 'text-amber-400' : 'text-theme-text-muted'}`}>
                {formatBRL(salesSummary.pendenteCentavos)}
              </p>
            </div>
          </div>

          <p className="text-[10px] text-theme-text-muted">Toque para abrir a aba completa de Vendas e Livro-Razão</p>
        </div>
      </div>

    </div>
  );
}
