import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Egg, Scale, Beef, Timer, Plus, Activity, X, Search, Check, CalendarDays } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

export function Lots() {
  const { birds, eggLots, addEggLot, editEggLot, meatLots, addMeatLot, editMeatLot } = useAppContext();
  const [activeTab, setActiveTab] = useState<'postura' | 'engorda'>('postura');

  // Modal states
  const [showPosturaModal, setShowPosturaModal] = useState(false);
  const [showEngordaModal, setShowEngordaModal] = useState(false);

  // Form states - Postura
  const [posturaBaia, setPosturaBaia] = useState('');
  const [posturaFemeasSelecionadas, setPosturaFemeasSelecionadas] = useState<string[]>([]);
  const [posturaExpectativa, setPosturaExpectativa] = useState(0);
  const [posturaDataInicio, setPosturaDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [posturaSearch, setPosturaSearch] = useState('');

  // Form states - Engorda
  const [engordaBaia, setEngordaBaia] = useState('');
  const [engordaAvesSelecionadas, setEngordaAvesSelecionadas] = useState<string[]>([]);
  const [engordaPesoInicial, setEngordaPesoInicial] = useState('');
  const [engordaDataInicio, setEngordaDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [engordaSearch, setEngordaSearch] = useState('');

  // Auxiliary age calculation
  const calculateAgeInDays = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - start.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  };

  // Filter active birds
  const activeFemales = birds.filter(
    b => b.sexo === 'Fêmea' && b.status !== 'Vendido' && b.status !== 'Faleceu'
  );

  const activeBirds = birds.filter(
    b => b.status !== 'Vendido' && b.status !== 'Faleceu'
  );

  // Form handlers
  const handleSavePosturaLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!posturaBaia.trim()) return;

    addEggLot({
      id: Date.now().toString(),
      baia: posturaBaia.trim(),
      femeasIds: posturaFemeasSelecionadas,
      expectativaDiaria: posturaExpectativa,
      dataInicio: posturaDataInicio,
      status: 'Ativo'
    });

    // Reset states
    setShowPosturaModal(false);
    setPosturaBaia('');
    setPosturaFemeasSelecionadas([]);
    setPosturaExpectativa(0);
    setPosturaDataInicio(new Date().toISOString().split('T')[0]);
    setPosturaSearch('');
  };

  const handleSaveEngordaLot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!engordaBaia.trim()) return;

    addMeatLot({
      id: Date.now().toString(),
      baia: engordaBaia.trim(),
      avesIds: engordaAvesSelecionadas,
      dataInicio: engordaDataInicio,
      pesoMedioInicial: engordaPesoInicial.trim() || '0',
      status: 'Crescimento'
    });

    // Reset states
    setShowEngordaModal(false);
    setEngordaBaia('');
    setEngordaAvesSelecionadas([]);
    setEngordaPesoInicial('');
    setEngordaDataInicio(new Date().toISOString().split('T')[0]);
    setEngordaSearch('');
  };

  // Auto expectation calculator
  const handleFemaleSelect = (id: string) => {
    const isSelected = posturaFemeasSelecionadas.includes(id);
    const nextSelected = isSelected
      ? posturaFemeasSelecionadas.filter(x => x !== id)
      : [...posturaFemeasSelecionadas, id];

    setPosturaFemeasSelecionadas(nextSelected);
    // Prefill expectation with 85% lay rate
    setPosturaExpectativa(Math.round(nextSelected.length * 0.85));
  };

  const handleAllFemalesSelect = (filteredIds: string[]) => {
    const allSelected = filteredIds.every(id => posturaFemeasSelecionadas.includes(id));
    const nextSelected = allSelected
      ? posturaFemeasSelecionadas.filter(id => !filteredIds.includes(id))
      : Array.from(new Set([...posturaFemeasSelecionadas, ...filteredIds]));

    setPosturaFemeasSelecionadas(nextSelected);
    setPosturaExpectativa(Math.round(nextSelected.length * 0.85));
  };

  const handleBirdSelect = (id: string) => {
    const isSelected = engordaAvesSelecionadas.includes(id);
    const nextSelected = isSelected
      ? engordaAvesSelecionadas.filter(x => x !== id)
      : [...engordaAvesSelecionadas, id];

    setEngordaAvesSelecionadas(nextSelected);
  };

  const handleAllBirdsSelect = (filteredIds: string[]) => {
    const allSelected = filteredIds.every(id => engordaAvesSelecionadas.includes(id));
    const nextSelected = allSelected
      ? engordaAvesSelecionadas.filter(id => !filteredIds.includes(id))
      : Array.from(new Set([...engordaAvesSelecionadas, ...filteredIds]));

    setEngordaAvesSelecionadas(nextSelected);
  };

  // Close Postura Lot
  const handleClosePosturaLot = (lotId: string) => {
    if (window.confirm('Deseja realmente encerrar este lote de postura? Esta ação não pode ser desfeita.')) {
      editEggLot(lotId, { status: 'Encerrado' });
    }
  };

  // Status Classes for Meat Lots
  const getMeatStatusClass = (status: string) => {
    switch (status) {
      case 'Crescimento':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'Terminação':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'Abatido':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      default:
        return 'bg-theme-surface border border-theme-border text-theme-text-muted';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in min-h-full flex flex-col pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Controle de Lotes</h2>
          <p className="text-sm text-theme-text-muted mt-1">Gerenciamento de lotes de postura e lotes de engorda do criatório.</p>
        </div>
        
        {activeTab === 'postura' ? (
          <button 
            onClick={() => setShowPosturaModal(true)} 
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus size={18} /> Cadastrar Lote Postura
          </button>
        ) : (
          <button 
            onClick={() => setShowEngordaModal(true)} 
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus size={18} /> Cadastrar Lote Engorda
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-theme-border">
        <button 
          onClick={() => setActiveTab('postura')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'postura' 
              ? 'text-theme-primary border-b-2 border-theme-primary' 
              : 'text-theme-text-muted hover:text-white'
          }`}
        >
          <Egg size={16} /> Lotes de Postura
        </button>
        <button 
          onClick={() => setActiveTab('engorda')}
          className={`pb-3 text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'engorda' 
              ? 'text-theme-primary border-b-2 border-theme-primary' 
              : 'text-theme-text-muted hover:text-white'
          }`}
        >
          <Beef size={16} /> Lotes de Engorda
        </button>
      </div>

      {/* Tab Content: Postura */}
      {activeTab === 'postura' && (
        <div className="flex-1 flex flex-col space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="premium-card p-5">
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Total de Lotes Ativos</p>
              <h3 className="text-3xl font-black text-white">{eggLots.filter(l => l.status === 'Ativo').length}</h3>
            </div>
            <div className="premium-card p-5">
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Expectativa Total Diária</p>
              <h3 className="text-3xl font-black text-white">
                {eggLots.reduce((acc, l) => acc + (l.status === 'Ativo' ? Number(l.expectativaDiaria) : 0), 0)}{' '}
                <span className="text-sm font-medium text-theme-text-muted">ovos/dia</span>
              </h3>
            </div>
            <div className="premium-card p-5 border-theme-border bg-theme-base/50">
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Fêmeas em Postura</p>
              <h3 className="text-3xl font-black text-white">
                {eggLots.reduce((acc, l) => acc + (l.status === 'Ativo' ? l.femeasIds.length : 0), 0)}
              </h3>
            </div>
          </div>

          {/* List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {eggLots.map(lot => {
              const ageDays = calculateAgeInDays(lot.dataInicio);
              return (
                <div 
                  key={lot.id} 
                  className="premium-card p-6 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                    <Egg size={120} />
                  </div>

                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold text-theme-primary uppercase mb-1 block">Baia {lot.baia}</span>
                        <h3 className="font-black text-xl text-white">Lote de Postura</h3>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        lot.status === 'Ativo' 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/20' 
                          : 'bg-theme-base text-theme-text-muted border border-theme-border'
                      }`}>
                        {lot.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                          <Timer size={12} /> Idade
                        </p>
                        <p className="text-lg font-black text-white">
                          {ageDays} <span className="text-xs text-theme-text-muted font-bold">dias</span>
                        </p>
                      </div>
                      <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                          <Egg size={12} /> Meta
                        </p>
                        <p className="text-lg font-black text-white">
                          {lot.expectativaDiaria} <span className="text-xs text-theme-text-muted font-bold">ovos/d</span>
                        </p>
                      </div>
                      <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                          <Activity size={12} /> Fêmeas
                        </p>
                        <p className="text-lg font-black text-white">{lot.femeasIds.length}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-theme-border/50">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase">Aves Vinculadas ({lot.femeasIds.length})</p>
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                          Início: <span className="text-theme-text-muted">{new Date(lot.dataInicio).toLocaleDateString('pt-BR')}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto pr-1">
                        {lot.femeasIds.map(id => {
                          const bird = birds.find(b => b.id === id);
                          if (!bird) return null;
                          return (
                            <span 
                              key={id} 
                              className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-theme-text-muted border border-theme-border font-medium"
                            >
                              {bird.anilha} {bird.nome ? `(${bird.nome})` : ''}
                            </span>
                          );
                        })}
                        {lot.femeasIds.length === 0 && (
                          <span className="text-xs text-theme-text-muted italic">Nenhuma ave vinculada.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {lot.status === 'Ativo' && (
                    <button 
                      onClick={() => handleClosePosturaLot(lot.id)}
                      className="mt-6 w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs rounded-xl transition-all"
                    >
                      Encerrar Lote
                    </button>
                  )}
                </div>
              );
            })}
            {eggLots.length === 0 && (
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Egg size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-bold text-white mb-1">Nenhum lote de postura cadastrado</p>
                <p className="text-sm">Cadastre um lote para gerenciar sua expectativa de produção de ovos.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Engorda */}
      {activeTab === 'engorda' && (
        <div className="flex-1 flex flex-col space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="premium-card p-5">
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Total de Lotes Ativos</p>
              <h3 className="text-3xl font-black text-white">
                {meatLots.filter(l => l.status === 'Crescimento' || l.status === 'Terminação').length}
              </h3>
            </div>
            <div className="premium-card p-5">
              <p className="text-theme-text-muted text-xs font-bold uppercase tracking-wider mb-1">Aves em Engorda/Corte</p>
              <h3 className="text-3xl font-black text-white">
                {meatLots.reduce((acc, l) => acc + (l.status !== 'Abatido' ? l.avesIds.length : 0), 0)}
              </h3>
            </div>
          </div>

          {/* List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {meatLots.map(lote => {
              const ageDays = calculateAgeInDays(lote.dataInicio);
              const statusClass = getMeatStatusClass(lote.status);
              return (
                <div 
                  key={lote.id} 
                  className="premium-card p-6 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                    <Beef size={120} />
                  </div>

                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold text-theme-primary uppercase mb-1 block">Baia {lote.baia}</span>
                        <h3 className="font-black text-xl text-white">Lote de Engorda</h3>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${statusClass}`}>
                        {lote.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                          <Timer size={12} /> Idade
                        </p>
                        <p className="text-lg font-black text-white">
                          {ageDays} <span className="text-xs text-theme-text-muted font-bold">dias</span>
                        </p>
                      </div>
                      <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                          <Scale size={12} /> Peso Inicial
                        </p>
                        <p className="text-lg font-black text-white truncate" title={lote.pesoMedioInicial}>
                          {lote.pesoMedioInicial}
                        </p>
                      </div>
                      <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50 flex flex-col justify-center">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                          <Activity size={12} /> Aves
                        </p>
                        <p className="text-lg font-black text-white">{lote.avesIds.length}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-theme-border/50 mb-6">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase">Aves Vinculadas ({lote.avesIds.length})</p>
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                          Início: <span className="text-theme-text-muted">{new Date(lote.dataInicio).toLocaleDateString('pt-BR')}</span>
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto pr-1">
                        {lote.avesIds.map(id => {
                          const bird = birds.find(b => b.id === id);
                          if (!bird) return null;
                          return (
                            <span 
                              key={id} 
                              className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-theme-text-muted border border-theme-border font-medium"
                            >
                              {bird.anilha} {bird.nome ? `(${bird.nome})` : ''}
                            </span>
                          );
                        })}
                        {lote.avesIds.length === 0 && (
                          <span className="text-xs text-theme-text-muted italic">Nenhuma ave vinculada.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions (Change Status directly on the card) */}
                  <div className="border-t border-theme-border/50 pt-4 mt-auto">
                    <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-2">Alterar Status do Lote</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Crescimento', 'Terminação', 'Abatido'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => editMeatLot(lote.id, { status: st })}
                          className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${
                            lote.status === st
                              ? 'bg-theme-primary text-black border-theme-primary shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                              : 'bg-theme-surface/50 border-theme-border/50 text-theme-text-muted hover:text-white hover:border-theme-border'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {meatLots.length === 0 && (
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Beef size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-bold text-white mb-1">Nenhum lote de engorda cadastrado</p>
                <p className="text-sm">Cadastre um lote para gerenciar a alimentação, crescimento e abate.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Lote Postura */}
      {showPosturaModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 animate-fade-in">
          <div className="bg-theme-surface border border-theme-border/80 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            <div className="p-5 border-b border-theme-border flex items-center justify-between">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <Egg className="text-theme-primary" size={20} /> Cadastrar Lote de Postura
              </h3>
              <button 
                onClick={() => {
                  setShowPosturaModal(false);
                  setPosturaBaia('');
                  setPosturaFemeasSelecionadas([]);
                  setPosturaExpectativa(0);
                  setPosturaSearch('');
                }}
                className="text-theme-text-muted hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePosturaLot} className="flex flex-col overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">Número / Nome da Baia</label>
                    <input 
                      type="text"
                      required
                      value={posturaBaia}
                      onChange={e => setPosturaBaia(e.target.value)}
                      placeholder="Ex: Baia 04"
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">Expectativa de Ovos Diária</label>
                    <input 
                      type="number"
                      required
                      min={0}
                      value={posturaExpectativa}
                      onChange={e => setPosturaExpectativa(Number(e.target.value))}
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-text-muted uppercase flex items-center gap-1">
                    <CalendarDays size={14} /> Data de Início
                  </label>
                  <input 
                    type="date"
                    required
                    value={posturaDataInicio}
                    onChange={e => setPosturaDataInicio(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2 pt-2 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">
                      Vincular Fêmeas ({posturaFemeasSelecionadas.length} selecionadas)
                    </label>
                    {activeFemales.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = activeFemales
                            .filter(f => 
                              f.anilha.toLowerCase().includes(posturaSearch.toLowerCase()) ||
                              f.raca.toLowerCase().includes(posturaSearch.toLowerCase()) ||
                              (f.nome && f.nome.toLowerCase().includes(posturaSearch.toLowerCase()))
                            )
                            .map(f => f.id);
                          handleAllFemalesSelect(filtered);
                        }}
                        className="text-[10px] text-theme-primary font-bold hover:underline"
                      >
                        Selecionar Filtradas
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={14} />
                    <input 
                      type="text"
                      placeholder="Pesquisar por anilha, raça ou nome..."
                      value={posturaSearch}
                      onChange={e => setPosturaSearch(e.target.value)}
                      className="w-full bg-theme-base border border-theme-border rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:border-theme-primary outline-none"
                    />
                  </div>

                  <div className="border border-theme-border rounded-xl max-h-[160px] overflow-y-auto divide-y divide-theme-border/50 bg-theme-base/30">
                    {activeFemales
                      .filter(f => 
                        f.anilha.toLowerCase().includes(posturaSearch.toLowerCase()) ||
                        f.raca.toLowerCase().includes(posturaSearch.toLowerCase()) ||
                        (f.nome && f.nome.toLowerCase().includes(posturaSearch.toLowerCase()))
                      )
                      .map(female => {
                        const isSelected = posturaFemeasSelecionadas.includes(female.id);
                        return (
                          <div 
                            key={female.id} 
                            onClick={() => handleFemaleSelect(female.id)}
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors"
                          >
                            <div>
                              <p className="text-xs font-bold text-white">Anilha: {female.anilha}</p>
                              <p className="text-[10px] text-theme-text-muted">
                                {female.raca} {female.nome ? `| ${female.nome}` : ''}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-theme-primary border-theme-primary text-black' 
                                : 'border-theme-border bg-theme-surface'
                            }`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    {activeFemales.length === 0 && (
                      <div className="p-4 text-center text-xs text-theme-text-muted italic">
                        Nenhuma fêmea disponível.
                      </div>
                    )}
                    {activeFemales.length > 0 && activeFemales.filter(f => 
                      f.anilha.toLowerCase().includes(posturaSearch.toLowerCase()) ||
                      f.raca.toLowerCase().includes(posturaSearch.toLowerCase()) ||
                      (f.nome && f.nome.toLowerCase().includes(posturaSearch.toLowerCase()))
                    ).length === 0 && (
                      <div className="p-4 text-center text-xs text-theme-text-muted italic">
                        Nenhuma fêmea correspondente à pesquisa.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-theme-border flex gap-3 bg-theme-surface/50">
                <button 
                  type="button"
                  onClick={() => {
                    setShowPosturaModal(false);
                    setPosturaBaia('');
                    setPosturaFemeasSelecionadas([]);
                    setPosturaExpectativa(0);
                    setPosturaSearch('');
                  }}
                  className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold text-white hover:border-theme-primary transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!posturaBaia.trim()}
                  className="flex-1 py-3 bg-theme-primary disabled:opacity-50 text-black rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-theme-primary/10"
                >
                  Confirmar Lote
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Cadastrar Lote Engorda */}
      {showEngordaModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 animate-fade-in">
          <div className="bg-theme-surface border border-theme-border/80 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-scale-up">
            <div className="p-5 border-b border-theme-border flex items-center justify-between">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <Beef className="text-theme-primary" size={20} /> Cadastrar Lote de Engorda
              </h3>
              <button 
                onClick={() => {
                  setShowEngordaModal(false);
                  setEngordaBaia('');
                  setEngordaAvesSelecionadas([]);
                  setEngordaPesoInicial('');
                  setEngordaSearch('');
                }}
                className="text-theme-text-muted hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEngordaLot} className="flex flex-col overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">Número / Nome da Baia</label>
                    <input 
                      type="text"
                      required
                      value={engordaBaia}
                      onChange={e => setEngordaBaia(e.target.value)}
                      placeholder="Ex: Baia 08"
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">Peso Médio Inicial</label>
                    <input 
                      type="text"
                      required
                      value={engordaPesoInicial}
                      onChange={e => setEngordaPesoInicial(e.target.value)}
                      placeholder="Ex: 350g ou 1.2kg"
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-theme-text-muted uppercase flex items-center gap-1">
                    <CalendarDays size={14} /> Data de Início
                  </label>
                  <input 
                    type="date"
                    required
                    value={engordaDataInicio}
                    onChange={e => setEngordaDataInicio(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2 pt-2 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-theme-text-muted uppercase">
                      Vincular Aves em Engorda ({engordaAvesSelecionadas.length} selecionadas)
                    </label>
                    {activeBirds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = activeBirds
                            .filter(f => 
                              f.anilha.toLowerCase().includes(engordaSearch.toLowerCase()) ||
                              f.raca.toLowerCase().includes(engordaSearch.toLowerCase()) ||
                              (f.nome && f.nome.toLowerCase().includes(engordaSearch.toLowerCase()))
                            )
                            .map(f => f.id);
                          handleAllBirdsSelect(filtered);
                        }}
                        className="text-[10px] text-theme-primary font-bold hover:underline"
                      >
                        Selecionar Filtradas
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={14} />
                    <input 
                      type="text"
                      placeholder="Pesquisar por anilha, raça, nome..."
                      value={engordaSearch}
                      onChange={e => setEngordaSearch(e.target.value)}
                      className="w-full bg-theme-base border border-theme-border rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:border-theme-primary outline-none"
                    />
                  </div>

                  <div className="border border-theme-border rounded-xl max-h-[160px] overflow-y-auto divide-y divide-theme-border/50 bg-theme-base/30">
                    {activeBirds
                      .filter(f => 
                        f.anilha.toLowerCase().includes(engordaSearch.toLowerCase()) ||
                        f.raca.toLowerCase().includes(engordaSearch.toLowerCase()) ||
                        (f.nome && f.nome.toLowerCase().includes(engordaSearch.toLowerCase()))
                      )
                      .map(bird => {
                        const isSelected = engordaAvesSelecionadas.includes(bird.id);
                        const isGrowout = bird.status === 'Crescimento';
                        return (
                          <div 
                            key={bird.id} 
                            onClick={() => handleBirdSelect(bird.id)}
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors"
                          >
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                Anilha: {bird.anilha}
                                {isGrowout && (
                                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                    Crescimento
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-theme-text-muted">
                                {bird.raca} | {bird.sexo} {bird.nome ? `| ${bird.nome}` : ''}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'bg-theme-primary border-theme-primary text-black' 
                                : 'border-theme-border bg-theme-surface'
                            }`}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    {activeBirds.length === 0 && (
                      <div className="p-4 text-center text-xs text-theme-text-muted italic">
                        Nenhuma ave ativa disponível.
                      </div>
                    )}
                    {activeBirds.length > 0 && activeBirds.filter(f => 
                      f.anilha.toLowerCase().includes(engordaSearch.toLowerCase()) ||
                      f.raca.toLowerCase().includes(engordaSearch.toLowerCase()) ||
                      (f.nome && f.nome.toLowerCase().includes(engordaSearch.toLowerCase()))
                    ).length === 0 && (
                      <div className="p-4 text-center text-xs text-theme-text-muted italic">
                        Nenhuma ave correspondente à pesquisa.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-theme-border flex gap-3 bg-theme-surface/50">
                <button 
                  type="button"
                  onClick={() => {
                    setShowEngordaModal(false);
                    setEngordaBaia('');
                    setEngordaAvesSelecionadas([]);
                    setEngordaPesoInicial('');
                    setEngordaSearch('');
                  }}
                  className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold text-white hover:border-theme-primary transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!engordaBaia.trim()}
                  className="flex-1 py-3 bg-theme-primary disabled:opacity-50 text-black rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-theme-primary/10"
                >
                  Confirmar Lote
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
