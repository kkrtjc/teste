import { useState, useMemo } from 'react';
import { 
  Store, Lock, Plus, Copy, Check, Share2, 
  Search, CheckCircle2
} from 'lucide-react';
import { useAppContext, type Bird } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';
import { ShareBirdModal } from '../components/modals/ShareBirdModal';
import { publishShowcase } from '../lib/showcaseShare';
import { useHaptics } from '../hooks/useHaptics';

export function Vitrine() {
  const { 
    birds, 
    vitrineBirds, 
    vitrineConfig,
    isVitrineUnlocked, 
    toggleBirdVitrine, 
    openAddBirdModal, 
    farmSettings,
    showToast 
  } = useAppContext();
  const { user } = useAuth();
  const { triggerLight, triggerSuccess } = useHaptics();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'inVitrine' | 'outVitrine'>('all');
  const [selectedBirdToShare, setSelectedBirdToShare] = useState<Bird | null>(null);
  const [copiedVitrine, setCopiedVitrine] = useState(false);

  // Link geral da vitrine do criatório
  const vitrineUrl = `${window.location.origin}/p/vitrine/${user?.id || 'meu-criatorio'}`;

  const filteredBirds = useMemo(() => {
    return birds.filter(b => {
      const matchSearch = 
        b.anilha.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.nome && b.nome.toLowerCase().includes(searchQuery.toLowerCase())) ||
        b.raca.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      const isInVitrine = Boolean(b.inVitrine !== undefined ? b.inVitrine : vitrineConfig[b.id]?.inVitrine);
      if (filterMode === 'inVitrine') return isInVitrine;
      if (filterMode === 'outVitrine') return !isInVitrine;
      return true;
    });
  }, [birds, vitrineConfig, searchQuery, filterMode]);

  const syncVitrineOnline = async () => {
    if (vitrineBirds.length === 0) return;
    try {
      const firstBird = vitrineBirds[0];
      const activePhone = farmSettings?.phone || farmSettings?.whatsapp || '';
      await publishShowcase({
        id: user?.id || 'meu-criatorio',
        bird: firstBird,
        farmSettings: {
          name: farmSettings?.name,
          responsible: farmSettings?.responsible,
          phone: activePhone,
          city: farmSettings?.city,
          state: farmSettings?.state,
          logo: farmSettings?.logo,
          whatsapp: activePhone
        },
        mode: 'public',
        vitrineBirds: vitrineBirds.map(b => ({
          ...b,
          id: b.id,
          anilha: b.anilha,
          nome: b.nome || '',
          raca: b.raca || '',
          sexo: b.sexo || '',
          status: b.status || 'Disponível',
          peso: b.peso || '',
          dataNascimento: b.dataNascimento || '',
          vacinas: b.vacinas || '',
          observacoes: b.observacoes || '',
          imagem: b.imagem || (b.imagens && b.imagens[0]) || '',
          imagens: b.imagens && b.imagens.length > 0 ? b.imagens : (b.imagem ? [b.imagem] : []),
          vitrinePrice: b.vitrinePrice || vitrineConfig[b.id]?.vitrinePrice || (b.valorEstimado ? `R$ ${b.valorEstimado}` : ''),
          vitrineStatus: b.vitrineStatus || vitrineConfig[b.id]?.vitrineStatus || 'Disponível'
        })),
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Erro ao sincronizar vitrine online:', err);
    }
  };

  const handleCopyVitrineLink = async () => {
    syncVitrineOnline();
    try {
      await navigator.clipboard.writeText(vitrineUrl);
      setCopiedVitrine(true);
      triggerSuccess();
      showToast('Link da sua Vitrine copiado com sucesso!', 'success');
      setTimeout(() => setCopiedVitrine(false), 2500);
    } catch {
      showToast('Erro ao copiar link.', 'error');
    }
  };

  const handleShareVitrineWhatsApp = () => {
    syncVitrineOnline();
    triggerLight();
    const criatorio = farmSettings?.name || 'Mura Manager';
    const text = `🏆 *Vitrine de Aves Disponíveis - ${criatorio}*\n` +
      `Confira o nosso catálogo oficial de aves e reprodutores disponíveis para negociação:\n\n` +
      `👉 *Acesse nossa vitrine digital:* \n${vitrineUrl}`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  // ── ESTADO BLOQUEADO: Se tiver menos de 10 aves ──
  if (!isVitrineUnlocked) {
    const remaining = 10 - birds.length;
    const progressPercent = Math.min(100, Math.round((birds.length / 10) * 100));

    return (
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto py-6">
        {/* Header da Página */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Lock size={13} />
            <span>Recurso Exclusivo de Elite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-tight">
            Vitrine Digital de Aves
          </h1>
          <p className="text-xs sm:text-sm text-theme-text-muted max-w-md mx-auto leading-relaxed">
            Tenha a sua própria página de vendas pública para divulgar fotos em carrossel, preços e linhagens das suas aves no WhatsApp.
          </p>
        </div>

        {/* Card Gamificado de Bloqueio */}
        <div className="p-6 sm:p-8 rounded-3xl bg-theme-surface border border-theme-border shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border-2 border-amber-500/40 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
            <Lock size={36} className="text-amber-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-bold text-white font-serif">
              Desbloqueie ao cadastrar 10 aves
            </h2>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Para manter a vitrine com um nível profissional de criatório, ela é liberada automaticamente assim que você tiver pelo menos <b>10 aves</b> registradas no seu sistema.
            </p>
          </div>

          {/* Barra de Progresso */}
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-zinc-400">Progresso do Plantel:</span>
              <span className="text-amber-400 font-mono">{birds.length} de 10 aves ({progressPercent}%)</span>
            </div>
            <div className="w-full h-3 bg-theme-base rounded-full overflow-hidden border border-theme-border p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 shadow-md shadow-amber-500/20"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-amber-300/90 font-medium pt-1">
              🚀 Faltam apenas <b>{remaining} {remaining === 1 ? 'ave' : 'aves'}</b> para você desbloquear sua vitrine completa!
            </p>
          </div>

          {/* CTA de Ação Rápida */}
          <div className="pt-2">
            <button
              onClick={() => openAddBirdModal()}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-theme-primary to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 mx-auto shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Cadastrar Nova Ave Agora</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ESTADO DESBLOQUEADO: Criador com 10 ou mais aves ──
  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-8">
      {/* Header & Vitrine Link Card */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#171722] to-theme-surface border border-amber-500/30 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
              <CheckCircle2 size={12} />
              <span>Vitrine Desbloqueada</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-tight">
              Vitrine Digital do Criatório
            </h1>
            <p className="text-xs text-zinc-400">
              Gerencie quais aves ficam visíveis para clientes quando você compartilha seu catálogo.
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-2 bg-theme-base/60 border border-theme-border rounded-xl text-center">
              <span className="text-[10px] text-zinc-400 block font-bold uppercase">No Plantel</span>
              <span className="text-base font-mono font-black text-white">{birds.length}</span>
            </div>
            <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
              <span className="text-[10px] text-amber-400 block font-bold uppercase">Na Vitrine</span>
              <span className="text-base font-mono font-black text-amber-400">{vitrineBirds.length}</span>
            </div>
          </div>
        </div>

        {/* Share Vitrine Bar */}
        <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 bg-theme-base/80 border border-theme-border rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono truncate select-all flex items-center gap-2">
            <Store size={14} className="text-amber-400 shrink-0" />
            <span className="truncate">{vitrineUrl}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyVitrineLink}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-theme-primary hover:bg-orange-400 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              {copiedVitrine ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedVitrine ? 'Copiado' : 'Copiar Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareVitrineWhatsApp}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Share2 size={14} />
              <span>WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por anilha, nome ou raça..."
            className="w-full bg-theme-surface border border-theme-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-theme-text-muted focus:border-theme-primary outline-none transition-colors"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-theme-surface border border-theme-border rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white/10 text-white'
                : 'text-theme-text-muted hover:text-white'
            }`}
          >
            Todas ({birds.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('inVitrine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'inVitrine'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-theme-text-muted hover:text-white'
            }`}
          >
            Na Vitrine ({vitrineBirds.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('outVitrine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'outVitrine'
                ? 'bg-white/10 text-white'
                : 'text-theme-text-muted hover:text-white'
            }`}
          >
            Fora ({birds.length - vitrineBirds.length})
          </button>
        </div>
      </div>

      {/* Birds Grid */}
      {filteredBirds.length === 0 ? (
        <div className="p-8 text-center bg-theme-surface border border-theme-border rounded-2xl">
          <p className="text-xs text-theme-text-muted">Nenhuma ave encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBirds.map(b => (
            <div 
              key={b.id}
              className={`p-4 rounded-2xl border transition-all space-y-3 bg-theme-surface ${
                b.inVitrine 
                  ? 'border-amber-500/50 shadow-lg shadow-amber-500/5' 
                  : 'border-theme-border opacity-85 hover:opacity-100'
              }`}
            >
              {/* Header with Photo & Anilha */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-black overflow-hidden border border-theme-border shrink-0 relative">
                  {b.imagem || (b.imagens && b.imagens[0]) ? (
                    <img 
                      src={b.imagem || b.imagens![0]} 
                      alt={b.anilha} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-600">
                      Sem foto
                    </div>
                  )}
                  {b.inVitrine && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-black text-amber-400 truncate">{b.anilha}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 font-bold uppercase">
                      {b.sexo}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white truncate mt-0.5">{b.nome || 'Sem nome'}</h3>
                  <p className="text-[11px] text-theme-text-muted truncate">{b.raca}</p>
                </div>
              </div>

              {/* Vitrine Toggle & Settings */}
              <div className="pt-2 border-t border-theme-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Store size={13} className={(b.inVitrine !== undefined ? b.inVitrine : vitrineConfig[b.id]?.inVitrine) ? 'text-amber-400' : 'text-zinc-500'} />
                    <span>Exibir na Vitrine</span>
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={Boolean(b.inVitrine !== undefined ? b.inVitrine : vitrineConfig[b.id]?.inVitrine)}
                      onChange={e => {
                        toggleBirdVitrine(b.id, e.target.checked);
                        triggerLight();
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
                  </label>
                </div>

                {(b.inVitrine !== undefined ? b.inVitrine : vitrineConfig[b.id]?.inVitrine) && (
                  <div className="grid grid-cols-2 gap-2 pt-1 animate-scale-up">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-zinc-500 block">Preço (R$)</label>
                      <input 
                        type="text"
                        defaultValue={b.vitrinePrice || vitrineConfig[b.id]?.vitrinePrice || ''}
                        onBlur={e => toggleBirdVitrine(b.id, true, e.target.value, b.vitrineStatus || vitrineConfig[b.id]?.vitrineStatus)}
                        placeholder="Ex: R$ 1.500"
                        className="w-full bg-theme-base border border-theme-border rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-amber-400 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-bold text-zinc-500 block">Status</label>
                      <select 
                        defaultValue={b.vitrineStatus || vitrineConfig[b.id]?.vitrineStatus || 'Disponível'}
                        onChange={e => toggleBirdVitrine(b.id, true, b.vitrinePrice || vitrineConfig[b.id]?.vitrinePrice, e.target.value as any)}
                        className="w-full bg-theme-base border border-theme-border rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-amber-400"
                      >
                        <option value="Disponível">Disponível</option>
                        <option value="Destaque">Destaque ⭐</option>
                        <option value="Reservado">Reservado</option>
                        <option value="Vendido">Vendido</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button: Compartilhar Ficha Individual */}
              <button
                type="button"
                onClick={() => setSelectedBirdToShare(b)}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Share2 size={13} className="text-amber-400" />
                <span>Compartilhar Ficha desta Ave</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Share Bird Modal Portal */}
      {selectedBirdToShare && (
        <ShareBirdModal
          bird={selectedBirdToShare}
          onClose={() => setSelectedBirdToShare(null)}
        />
      )}
    </div>
  );
}
