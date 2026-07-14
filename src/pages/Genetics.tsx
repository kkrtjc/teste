import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, Users, X, CheckCircle, Trash2, Edit2, Eye, Egg, Check, Sparkles, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import type { IncubationLot } from '../lib/AppContext';

/* ── Função de Cálculo de Co-sanguinidade ── */
function calculateInbreeding(machoId: string, femeaId: string, birds: any[]): { coefficient: number; label: string; details: string; color: string } {
  if (!machoId || !femeaId) return { coefficient: 0, label: 'Nenhum', details: 'Selecione o macho e a fêmea para analisar.', color: 'text-theme-text-muted border-theme-border/50 bg-theme-surface/50' };

  const macho = birds.find(b => b.id === machoId);
  const femea = birds.find(b => b.id === femeaId);

  if (!macho || !femea) return { coefficient: 0, label: 'Nenhum', details: 'Aves não encontradas.', color: 'text-theme-text-muted border-theme-border/50 bg-theme-surface/50' };

  // 1. Diretos (Pai e Filha / Mãe e Filho)
  if (femea.paiId === macho.id) {
    return { coefficient: 25, label: 'Crítico (Alto)', details: 'Cruzamento direto de Pai e Filha. Coeficiente de 25%. Altamente desaconselhável devido ao risco de anomalias.', color: 'text-red-400 border-red-500/20 bg-red-500/10' };
  }
  if (macho.maeId === femea.id) {
    return { coefficient: 25, label: 'Crítico (Alto)', details: 'Cruzamento direto de Filho e Mãe. Coeficiente de 25%. Altamente desaconselhável devido ao risco de anomalias.', color: 'text-red-400 border-red-500/20 bg-red-500/10' };
  }

  // 2. Irmãos Inteiros (mesmo pai e mesma mãe)
  if (macho.paiId && femea.paiId && macho.paiId === femea.paiId && macho.maeId && femea.maeId && macho.maeId === femea.maeId) {
    return { coefficient: 25, label: 'Crítico (Alto)', details: 'Irmãos inteiros (mesmo pai e mãe). Coeficiente de 25%. Risco elevado de defeitos genéticos.', color: 'text-red-400 border-red-500/20 bg-red-500/10' };
  }

  // 3. Meios Irmãos
  const mesmoPai = macho.paiId && femea.paiId && macho.paiId === femea.paiId;
  const mesmaMae = macho.maeId && femea.maeId && macho.maeId === femea.maeId;
  if (mesmoPai || mesmaMae) {
    const parent = mesmoPai ? 'mesmo pai' : 'mesma mãe';
    return { coefficient: 12.5, label: 'Moderado', details: `Meios-irmãos (compartilham ${parent}). Coeficiente de 12.5%. Recomenda-se cautela.`, color: 'text-orange-400 border-orange-500/20 bg-orange-500/10' };
  }

  // 4. Avô e Neta / Avó e Neto
  const femeaPai = birds.find(b => b.id === femea.paiId);
  const femeaMae = birds.find(b => b.id === femea.maeId);
  const machoPai = birds.find(b => b.id === macho.paiId);
  const machoMae = birds.find(b => b.id === macho.maeId);

  if (femeaPai?.paiId === macho.id || femeaPai?.maeId === macho.id || femeaMae?.paiId === macho.id || femeaMae?.maeId === macho.id) {
    return { coefficient: 12.5, label: 'Moderado', details: 'Avô e Neta. Coeficiente de 12.5%. Risco considerável.', color: 'text-orange-400 border-orange-500/20 bg-orange-500/10' };
  }
  if (machoPai?.paiId === femea.id || machoPai?.maeId === femea.id || machoMae?.paiId === femea.id || machoMae?.maeId === femea.id) {
    return { coefficient: 12.5, label: 'Moderado', details: 'Avó e Neto. Coeficiente de 12.5%. Risco considerável.', color: 'text-orange-400 border-orange-500/20 bg-orange-500/10' };
  }

  // 5. Tio/Sobrinha ou Tia/Sobrinho
  if (macho.paiId && macho.maeId) {
    const machoPaisIrmaos = (parent: any) => 
      parent && parent.paiId === macho.paiId && parent.maeId === macho.maeId;
    if (machoPaisIrmaos(femeaPai) || machoPaisIrmaos(femeaMae)) {
      return { coefficient: 12.5, label: 'Moderado', details: 'Tio e Sobrinha. Coeficiente de 12.5%.', color: 'text-orange-400 border-orange-500/20 bg-orange-500/10' };
    }
  }
  if (femea.paiId && femea.maeId) {
    const femeaPaisIrmaos = (parent: any) =>
      parent && parent.paiId === femea.paiId && parent.maeId === femea.maeId;
    if (femeaPaisIrmaos(machoPai) || femeaPaisIrmaos(machoMae)) {
      return { coefficient: 12.5, label: 'Moderado', details: 'Sobrinho e Tia. Coeficiente de 12.5%.', color: 'text-orange-400 border-orange-500/20 bg-orange-500/10' };
    }
  }

  // 6. Primos de 1° Grau
  if (machoPai && femeaPai && machoPai.paiId && machoPai.paiId === femeaPai.paiId && machoPai.maeId && machoPai.maeId === femeaPai.maeId) {
    return { coefficient: 6.25, label: 'Baixo', details: 'Primos de 1º grau. Coeficiente de 6.25%. Geralmente seguro para cruzamento.', color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10' };
  }

  return { coefficient: 0, label: 'Nenhum (0%)', details: 'Nenhum parentesco direto detectado nas gerações próximas. Cruzamento seguro.', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' };
}

/* ── Função auxiliar de cálculo de status de eclosão ── */
const getIncubationStatus = (dataInicioStr: string) => {
  const start = new Date(dataInicioStr);
  const today = new Date();
  start.setHours(0,0,0,0);
  today.setHours(0,0,0,0);
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return {
    days: Math.max(0, diffDays),
    isOvoscopy1: diffDays >= 5 && diffDays < 14,
    isOvoscopy2: diffDays >= 14 && diffDays < 20,
    isHatchingSoon: diffDays === 20,
    isHatched: diffDays >= 21
  };
};

export function Genetics() {
  const {
    birds,
    couples,
    addCouple,
    editCouple,
    removeCouple,
    addBird,
    editBird,
    breeds,
    openBirdProfile,
    incubationLots,
    addIncubationLot,
    editIncubationLot,
    removeIncubationLot
  } = useAppContext();

  // Tabs
  const [activeTab, setActiveTab] = useState<'casais' | 'eclosao' | 'crescimento'>('casais');
  const [searchQuery, setSearchQuery] = useState('');

  /* ── MODALS STATE ── */
  const [showCoupleModal, setShowCoupleModal] = useState(false);
  const [coupleToEdit, setCoupleToEdit] = useState<any | null>(null);

  // Form states for Casal
  const [tipoCruzamento, setTipoCruzamento] = useState<'puro' | 'hibrido'>('puro');
  const [racaCasal, setRacaCasal] = useState('');
  const [racaMacho, setRacaMacho] = useState('');
  const [racaFemea, setRacaFemea] = useState('');
  const [machoId, setMachoId] = useState('');
  const [selectedFemeas, setSelectedFemeas] = useState<string[]>([]);
  const [baiaCasal, setBaiaCasal] = useState('');
  const [objetivo, setObjetivo] = useState('Melhoramento Genético');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [ovosDisponiveis, setOvosDisponiveis] = useState(0);

  // Incubation Form state
  const [incubatingCoupleId, setIncubatingCoupleId] = useState<string | null>(null);
  const [incubatingOvosCount, setIncubatingOvosCount] = useState(1);
  const [numeroLote, setNumeroLote] = useState('');
  const [baiaLote, setBaiaLote] = useState('');

  // Ovoscopy modals
  const [ovoscopyLotId, setOvoscopyLotId] = useState<string | null>(null);
  const [ovoscopyStep, setOvoscopyStep] = useState<1 | 2 | null>(null);
  const [discardCount, setDiscardCount] = useState(0);

  // Hatch modal
  const [hatchLotId, setHatchLotId] = useState<string | null>(null);
  const [bornCount, setBoldCount] = useState(0);

  // Growth Editing Chick state
  const [editingChickId, setEditingChickId] = useState<string | null>(null);
  const [chickNome, setChickNome] = useState('');
  const [chickAnilha, setChickAnilha] = useState('');

  /* ── OPEN CREATOR/EDITOR ── */
  const openNewCoupleModal = () => {
    setCoupleToEdit(null);
    setTipoCruzamento('puro');
    setRacaCasal('');
    setRacaMacho('');
    setRacaFemea('');
    setMachoId('');
    setSelectedFemeas([]);
    setBaiaCasal('');
    setObjetivo('Melhoramento Genético');
    setDataInicio(new Date().toISOString().split('T')[0]);
    setOvosDisponiveis(0);
    setShowCoupleModal(true);
  };

  const openEditCoupleModal = (couple: any) => {
    setCoupleToEdit(couple);
    setTipoCruzamento(couple.isHibrido ? 'hibrido' : 'puro');
    setRacaCasal(couple.raca || '');
    setRacaMacho(couple.raca || '');
    setRacaFemea(couple.racaFemea || '');
    setMachoId(couple.machoId);
    setSelectedFemeas(couple.femeaIds || (couple.femeaId ? [couple.femeaId] : []));
    setBaiaCasal(couple.cageName || '');
    setObjetivo(couple.objetivo);
    setDataInicio(couple.dataInicio);
    setOvosDisponiveis(couple.ovosDisponiveis || 0);
    setShowCoupleModal(true);
  };

  const handleSaveCouple = () => {
    const breed = tipoCruzamento === 'puro' ? racaCasal : racaMacho;
    if (!breed || !machoId || selectedFemeas.length === 0) return;

    const payload = {
      machoId,
      femeaId: selectedFemeas[0],
      femeaIds: selectedFemeas,
      cageName: baiaCasal || undefined,
      raca: breed,
      racaFemea: tipoCruzamento === 'hibrido' ? racaFemea : undefined,
      objetivo,
      dataInicio,
      status: (coupleToEdit?.status || 'Ativo') as 'Ativo' | 'Separado',
      ovosDisponiveis,
      isHibrido: tipoCruzamento === 'hibrido'
    };

    if (coupleToEdit) {
      editCouple(coupleToEdit.id, payload);
    } else {
      addCouple({
        id: Date.now().toString(),
        ...payload
      });
    }

    setShowCoupleModal(false);
  };

  const triggerIncubation = (coupleId: string) => {
    const couple = couples.find(c => c.id === coupleId);
    if (!couple) return;
    setIncubatingCoupleId(coupleId);
    setIncubatingOvosCount(1);
    setNumeroLote(`LT-${Date.now().toString().slice(-4)}`);
    setBaiaLote(couple.cageName || '');
  };

  const handleSendToChoco = () => {
    if (!incubatingCoupleId) return;
    const couple = couples.find(c => c.id === incubatingCoupleId);
    if (!couple) return;

    const available = couple.ovosDisponiveis || 0;
    if (incubatingOvosCount <= 0 || incubatingOvosCount > available) return;

    // 1. Deduct eggs from couple
    const remaining = available - incubatingOvosCount;
    editCouple(couple.id, { ovosDisponiveis: remaining });

    // 2. Create incubation lot
    const newLot: IncubationLot = {
      id: Date.now().toString(),
      coupleId: couple.id,
      numeroLote: numeroLote.trim() || `LOTE-${Date.now().toString().slice(-4)}`,
      quantidadeOvos: incubatingOvosCount,
      dataInicio: new Date().toISOString().split('T')[0],
      baia: baiaLote.trim() || couple.cageName || 'ND',
      ovoscopia1Realizada: false,
      ovoscopia2Realizada: false,
      eclodido: false
    };

    addIncubationLot(newLot);
    setIncubatingCoupleId(null);
  };

  // Ovoscopy confirmation
  const handleConfirmOvoscopy = () => {
    if (!ovoscopyLotId || !ovoscopyStep) return;
    const lot = incubationLots.find(l => l.id === ovoscopyLotId);
    if (!lot) return;

    const discards = Math.min(lot.quantidadeOvos, Math.max(0, discardCount));
    const nextQtd = lot.quantidadeOvos - discards;
    if (ovoscopyStep === 1) {
      editIncubationLot(lot.id, {
        quantidadeOvos: nextQtd,
        ovosDescartados1: discards,
        ovoscopia1Realizada: true
      });
    } else {
      editIncubationLot(lot.id, {
        quantidadeOvos: nextQtd,
        ovosDescartados2: discards,
        ovoscopia2Realizada: true
      });
    }

    setOvoscopyLotId(null);
    setOvoscopyStep(null);
    setDiscardCount(0);
  };

  // Hatch confirmation (Transition to growth)
  const handleConfirmHatch = () => {
    if (!hatchLotId) return;
    const lot = incubationLots.find(l => l.id === hatchLotId);
    const couple = couples.find(c => c.id === lot?.coupleId);
    if (!lot || !couple) return;

    const count = Math.min(lot.quantidadeOvos, Math.max(0, bornCount));
    
    // Add chicks with status 'Crescimento'
    for (let i = 0; i < count; i++) {
      const tempId = Math.random().toString(36).substring(2, 7).toUpperCase();
      addBird({
        id: `chick-${Date.now()}-${tempId}`,
        anilha: `PROV-${tempId}`,
        nome: `Pintinho ${i + 1} (Lote ${lot.numeroLote})`,
        sexo: Math.random() > 0.5 ? 'Macho' : 'Fêmea',
        raca: couple.raca || 'Híbrido',
        baia: lot.baia || 'ND',
        status: 'Crescimento',
        paiId: couple.machoId,
        maeId: couple.femeaIds?.[0] || couple.femeaId,
        origem: 'Cruzamento',
        dataNascimento: new Date().toISOString().split('T')[0]
      });
    }

    // Remove lot from eclosão
    removeIncubationLot(hatchLotId);
    setHatchLotId(null);
    setBoldCount(0);
  };

  const startEditChick = (chick: any) => {
    setEditingChickId(chick.id);
    setChickNome(chick.nome || '');
    setChickAnilha(chick.anilha || '');
  };

  const handleSaveChick = (chickId: string) => {
    if (!chickAnilha.trim()) return;
    editBird(chickId, {
      nome: chickNome.trim(),
      anilha: chickAnilha.trim()
    });
    setEditingChickId(null);
  };

  const promoteChick = (chickId: string) => {
    editBird(chickId, { status: 'Adulto' });
  };

  /* ── RENDERING ── */
  return (
    <div className="space-y-4 animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-base sm:text-lg font-black text-white leading-none">Genética &amp; Reprodução</h2>
          <p className="text-[10px] sm:text-xs text-theme-text-muted mt-1 leading-none">Controle de casais, eclosão e crescimento.</p>
        </div>
        
        {activeTab === 'casais' && (
          <button 
            onClick={openNewCoupleModal}
            className="btn-primary !px-3 !py-1.5 !text-[10px] sm:!text-xs flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
          >
            <Users size={12} /> Novo Casal
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-theme-surface border border-theme-border/40 rounded-full overflow-x-auto hide-scrollbar shrink-0 w-full sm:w-auto max-w-md self-start gap-1">
        <button 
          onClick={() => { setActiveTab('casais'); setSearchQuery(''); }}
          className={`flex-1 text-center px-4 py-2 text-xs font-black transition-all rounded-full whitespace-nowrap ${
            activeTab === 'casais' 
              ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'text-theme-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          Casal
        </button>
        <button 
          onClick={() => { setActiveTab('eclosao'); setSearchQuery(''); }}
          className={`flex-1 text-center px-4 py-2 text-xs font-black transition-all rounded-full whitespace-nowrap ${
            activeTab === 'eclosao' 
              ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'text-theme-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          Eclosão
        </button>
        <button 
          onClick={() => { setActiveTab('crescimento'); setSearchQuery(''); }}
          className={`flex-1 text-center px-4 py-2 text-xs font-black transition-all rounded-full whitespace-nowrap ${
            activeTab === 'crescimento' 
              ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
              : 'text-theme-text-muted hover:text-white hover:bg-white/5'
          }`}
        >
          Crescimento
        </button>
      </div>

      {/* SEARCH ROW */}
      <div className="w-full shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text-muted" size={14} />
          <input
            type="text"
            placeholder={
              activeTab === 'casais' ? 'Buscar casais por anilha, raça ou baia...' :
              activeTab === 'eclosao' ? 'Buscar lotes em incubação...' :
              'Buscar filhotes por anilha ou nome...'
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-theme-surface border border-theme-border/50 text-white pl-9 pr-4 py-1.5 rounded-full focus:outline-none focus:border-theme-primary transition-colors text-xs shadow-inner"
          />
        </div>
      </div>

      {/* ── TAB CONTENT: CASAL ── */}
      {activeTab === 'casais' && (() => {
        const filteredCouples = couples.filter(c => {
          const macho = birds.find(b => b.id === c.machoId);
          const femeas = birds.filter(b => c.femeaIds?.includes(b.id) || b.id === c.femeaId);
          const q = searchQuery.toLowerCase();
          return (macho?.anilha || '').toLowerCase().includes(q) ||
                 (c.raca || '').toLowerCase().includes(q) ||
                 (c.cageName || '').toLowerCase().includes(q) ||
                 femeas.some(f => f.anilha.toLowerCase().includes(q));
        });

        return (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {filteredCouples.length === 0 ? (
              <div className="text-center p-12 bg-theme-surface border border-theme-border border-dashed rounded-xl text-theme-text-muted text-xs">
                Nenhum casal encontrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredCouples.map(couple => {
                  const macho = birds.find(b => b.id === couple.machoId);
                  const femeas = birds.filter(b => couple.femeaIds?.includes(b.id) || b.id === couple.femeaId);

                  return (
                    <div key={couple.id} className="premium-card p-3 flex flex-col gap-3.5 border border-theme-border/50 bg-theme-surface/50 rounded-2xl relative shadow-premium group">
                      {/* Top header */}
                      <div className="flex justify-between items-start border-b border-theme-border/30 pb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-white uppercase truncate max-w-[120px]">
                              {couple.isHibrido ? 'Híbrido' : couple.raca}
                            </span>
                            {couple.cageName && (
                              <span className="text-[8px] bg-theme-base/60 text-theme-accent border border-theme-border/50 px-1.5 py-0.5 rounded font-mono font-bold">
                                Baia {couple.cageName}
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-theme-text-muted font-bold mt-0.5">Início: {couple.dataInicio}</p>
                        </div>

                        {/* Edit & Delete Action Panel */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditCoupleModal(couple)}
                            className="p-1 hover:bg-white/10 rounded-lg text-theme-text-muted hover:text-white transition-colors"
                            title="Editar Casal"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Tem certeza que deseja excluir este casal?')) {
                                removeCouple(couple.id);
                              }
                            }}
                            className="p-1 hover:bg-red-500/10 rounded-lg text-theme-text-muted hover:text-red-400 transition-colors"
                            title="Excluir Casal"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Visual representations */}
                      <div className="flex items-center justify-between gap-2.5">
                        {/* Macho */}
                        <div 
                          onClick={() => macho && openBirdProfile(macho.id)}
                          className="flex-1 bg-theme-base/30 rounded-xl p-2 border border-theme-border/30 hover:border-blue-500/50 transition-all cursor-pointer flex flex-col items-center text-center justify-center min-h-[86px]"
                        >
                          <div className="w-10 h-10 rounded-full border border-blue-500/40 bg-theme-surface flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                            {macho?.imagem ? (
                              <img src={macho.imagem} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">🐓</span>
                            )}
                          </div>
                          <p className="text-[10px] font-black text-white truncate max-w-[80px] mt-1">
                            {macho?.anilha || 'Desconhecido'}
                          </p>
                          <p className="text-[7px] text-blue-400 font-bold uppercase tracking-wider">Reprodutor</p>
                        </div>

                        <div className="flex flex-col items-center justify-center text-theme-text-muted font-black shrink-0">
                          <span className="text-sm text-theme-primary">×</span>
                          <span className="text-[8px] font-bold text-theme-text-muted">{femeas.length}F</span>
                        </div>

                        {/* Fêmeas */}
                        <div className="flex-1 bg-theme-base/30 rounded-xl p-2 border border-theme-border/30 flex flex-col justify-center gap-1 min-h-[86px] overflow-hidden">
                          <p className="text-[7px] text-pink-400 font-bold uppercase tracking-wider text-center">Matrizes</p>
                          <div className="flex flex-wrap gap-1 justify-center max-h-[46px] overflow-y-auto pr-0.5">
                            {femeas.map(femea => (
                              <div
                                key={femea.id}
                                onClick={() => openBirdProfile(femea.id)}
                                className="w-7 h-7 rounded-full border border-pink-500/40 bg-theme-surface flex items-center justify-center overflow-hidden cursor-pointer hover:scale-105 transition-all shadow-sm"
                                title={`Fêmea: ${femea.anilha}`}
                              >
                                {femea.imagem ? (
                                  <img src={femea.imagem} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs">🐔</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Stock of eggs & Actions */}
                      <div className="bg-theme-base/40 border border-theme-border/30 rounded-xl p-2 flex justify-between items-center text-center">
                        <div>
                          <p className="text-xs font-black text-white">{couple.ovosDisponiveis || 0}</p>
                          <p className="text-[8px] text-theme-text-muted font-bold uppercase tracking-wider">Ovos Disponíveis</p>
                        </div>
                        
                        <button
                          onClick={() => triggerIncubation(couple.id)}
                          disabled={!couple.ovosDisponiveis || couple.ovosDisponiveis <= 0}
                          className="px-2.5 py-1 bg-theme-primary hover:bg-theme-primary/80 disabled:opacity-40 disabled:hover:bg-theme-primary text-black text-[9px] font-black rounded-lg transition-colors flex items-center gap-1 shadow-sm shrink-0"
                        >
                          <Egg size={10} /> Enviar p/ Choco
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── TAB CONTENT: ECLOSÃO ── */}
      {activeTab === 'eclosao' && (() => {
        const filteredLots = incubationLots.filter(l => {
          const couple = couples.find(c => c.id === l.coupleId);
          const macho = birds.find(b => b.id === couple?.machoId);
          const q = searchQuery.toLowerCase();
          return l.numeroLote.toLowerCase().includes(q) ||
                 l.baia.toLowerCase().includes(q) ||
                 (macho?.anilha || '').toLowerCase().includes(q);
        });

        return (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {filteredLots.length === 0 ? (
              <div className="text-center p-12 bg-theme-surface border border-theme-border border-dashed rounded-xl text-theme-text-muted text-xs">
                Nenhum lote em incubação ativo.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredLots.map(lot => {
                  const couple = couples.find(c => c.id === lot.coupleId);
                  const macho = birds.find(b => b.id === couple?.machoId);
                  const femeas = birds.filter(b => couple?.femeaIds?.includes(b.id) || b.id === couple?.femeaId);
                  
                  const status = getIncubationStatus(lot.dataInicio);

                  return (
                    <div key={lot.id} className="premium-card p-3.5 flex flex-col gap-3.5 border border-theme-border/50 bg-theme-surface/50 rounded-2xl relative shadow-premium">
                      {/* Header */}
                      <div className="flex justify-between items-start border-b border-theme-border/30 pb-2">
                        <div>
                          <h4 className="text-xs font-black text-white">Lote: {lot.numeroLote}</h4>
                          <p className="text-[9px] text-theme-text-muted font-bold mt-0.5">
                            Pai: {macho?.anilha || '?'} × {femeas.length} Fêmea(s)
                          </p>
                        </div>
                        <span className="text-[8px] bg-theme-base/60 text-theme-accent border border-theme-border/50 px-1.5 py-0.5 rounded font-mono font-bold">
                          Baia {lot.baia}
                        </span>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-theme-base/30 border border-theme-border/30 rounded-xl p-1.5">
                          <p className="text-xs font-black text-white">{lot.quantidadeOvos}</p>
                          <p className="text-[7px] text-theme-text-muted font-bold uppercase">Ovos Ativos</p>
                        </div>
                        <div className="bg-theme-base/30 border border-theme-border/30 rounded-xl p-1.5">
                          <p className="text-xs font-black text-theme-primary">{status.days}/21</p>
                          <p className="text-[7px] text-theme-text-muted font-bold uppercase">Dias de Choco</p>
                        </div>
                        <div className="bg-theme-base/30 border border-theme-border/30 rounded-xl p-1.5">
                          <p className="text-xs font-black text-white">{new Date(lot.dataInicio).toLocaleDateString('pt-BR', {day: 'numeric', month: 'numeric'})}</p>
                          <p className="text-[7px] text-theme-text-muted font-bold uppercase">Início</p>
                        </div>
                      </div>

                      {/* ALERTS & TIMELINE WORKFLOW */}
                      <div className="space-y-2">
                        {/* Day 5 Ovoscopy Alert */}
                        {status.days >= 5 && (
                          <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-[10px]
                            ${lot.ovoscopia1Realizada 
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                              : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400 animate-pulse'}`}>
                            <div className="flex items-center gap-1">
                              <Eye size={12} />
                              <div>
                                <p className="font-bold">1ª Ovoscopia (5º dia)</p>
                                <p className="text-[8px] opacity-85">
                                  {lot.ovoscopia1Realizada 
                                    ? `Realizada (Descarte: ${lot.ovosDescartados1 || 0})` 
                                    : 'Aviso: Retire ovos brancos/inférteis.'}
                                </p>
                              </div>
                            </div>
                            {!lot.ovoscopia1Realizada && (
                              <button
                                onClick={() => { setOvoscopyLotId(lot.id); setOvoscopyStep(1); setDiscardCount(0); }}
                                className="px-2 py-0.5 bg-yellow-500 hover:bg-yellow-600 text-black font-black rounded text-[8px] transition-colors"
                              >
                                Descartar
                              </button>
                            )}
                          </div>
                        )}

                        {/* Day 14 Ovoscopy Alert */}
                        {status.days >= 14 && (
                          <div className={`p-2 rounded-xl border flex items-center justify-between gap-2 text-[10px]
                            ${lot.ovoscopia2Realizada 
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                              : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-400 animate-pulse'}`}>
                            <div className="flex items-center gap-1">
                              <Eye size={12} />
                              <div>
                                <p className="font-bold">2ª Ovoscopia (14º dia)</p>
                                <p className="text-[8px] opacity-85">
                                  {lot.ovoscopia2Realizada 
                                    ? `Realizada (Descarte: ${lot.ovosDescartados2 || 0})` 
                                    : 'Aviso: Descarte embriões mortos.'}
                                </p>
                              </div>
                            </div>
                            {!lot.ovoscopia2Realizada && (
                              <button
                                onClick={() => { setOvoscopyLotId(lot.id); setOvoscopyStep(2); setDiscardCount(0); }}
                                className="px-2 py-0.5 bg-yellow-500 hover:bg-yellow-600 text-black font-black rounded text-[8px] transition-colors"
                              >
                                Descartar
                              </button>
                            )}
                          </div>
                        )}

                        {/* Day 20 Hatch Warning */}
                        {status.days === 20 && (
                          <div className="p-2 rounded-xl border border-orange-500/20 bg-orange-500/5 text-orange-400 flex items-center gap-1.5 text-[9px] animate-pulse">
                            <AlertTriangle size={12} />
                            <div>
                              <p className="font-bold">Atenção: Eclosão em 24h!</p>
                              <p className="opacity-80">Prepare o berçário para a chegada dos filhotes.</p>
                            </div>
                          </div>
                        )}

                        {/* Day 21+ Born Button */}
                        {status.days >= 21 && (
                          <div className="p-2 rounded-xl border border-theme-primary/30 bg-theme-primary/5 text-theme-primary flex flex-col gap-2 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <Sparkles size={12} className="animate-bounce" />
                              <div>
                                <p className="font-bold">Eclosão Concluída (21 dias+)</p>
                                <p className="text-[8px] opacity-85">Os ovos estão prontos para nascer.</p>
                              </div>
                            </div>
                            <button
                              onClick={() => { setHatchLotId(lot.id); setBoldCount(lot.quantidadeOvos); }}
                              className="w-full py-1.5 bg-theme-primary hover:bg-theme-primary/80 text-black font-black rounded-lg transition-colors text-center text-[9px]"
                            >
                              🐣 Registrar Nascimento &amp; Cadastrar Filhotes
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── TAB CONTENT: CRESCIMENTO ── */}
      {activeTab === 'crescimento' && (() => {
        const growthBirds = birds.filter(b => b.status === 'Crescimento');
        const filteredChicks = growthBirds.filter(b => {
          const q = searchQuery.toLowerCase();
          return b.anilha.toLowerCase().includes(q) ||
                 (b.nome || '').toLowerCase().includes(q) ||
                 (b.raca || '').toLowerCase().includes(q);
        });

        return (
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {filteredChicks.length === 0 ? (
              <div className="text-center p-12 bg-theme-surface border border-theme-border border-dashed rounded-xl text-theme-text-muted text-xs">
                Nenhum filhote em crescimento cadastrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredChicks.map(chick => {
                  const pai = birds.find(b => b.id === chick.paiId);
                  const mae = birds.find(b => b.id === chick.maeId);
                  const isEditing = editingChickId === chick.id;

                  return (
                    <div key={chick.id} className="premium-card p-3 flex flex-col gap-3 border border-theme-border/50 bg-theme-surface/50 rounded-2xl relative shadow-premium">
                      {/* Header */}
                      <div className="flex justify-between items-start border-b border-theme-border/30 pb-2">
                        <div>
                          {isEditing ? (
                            <input
                              type="text"
                              value={chickAnilha}
                              onChange={e => setChickAnilha(e.target.value)}
                              placeholder="Anilha *"
                              className="bg-theme-base border border-theme-border rounded px-2 py-0.5 text-xs text-white outline-none w-28 focus:border-theme-primary"
                            />
                          ) : (
                            <h4 className="text-xs font-black text-white">{chick.anilha}</h4>
                          )}
                          <p className="text-[8px] text-theme-text-muted font-bold mt-0.5">
                            Linhagem: {chick.raca}
                          </p>
                        </div>
                        <span className="text-[8px] bg-theme-base/60 text-theme-accent border border-theme-border/50 px-1.5 py-0.5 rounded font-mono font-bold">
                          Baia {chick.baia}
                        </span>
                      </div>

                      {/* Parentage details */}
                      <div className="text-[9px] text-theme-text-muted space-y-0.5 bg-theme-base/30 p-2 rounded-xl border border-theme-border/30">
                        <p>Pai: <span className="text-white font-bold">{pai?.anilha || 'Desconhecido'}</span></p>
                        <p>Mãe: <span className="text-white font-bold">{mae?.anilha || 'Desconhecida'}</span></p>
                      </div>

                      {/* Name input */}
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-theme-text-muted uppercase">Nome da Ave</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={chickNome}
                            onChange={e => setChickNome(e.target.value)}
                            placeholder="Nome do filhote"
                            className="w-full bg-theme-base border border-theme-border rounded px-2.5 py-1 text-xs text-white outline-none focus:border-theme-primary"
                          />
                        ) : (
                          <p className="text-xs text-white font-medium truncate">{chick.nome || 'Sem nome'}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-theme-border/30 mt-auto">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => setEditingChickId(null)}
                              className="flex-1 py-1.5 bg-theme-base hover:bg-theme-surface-hover text-white text-[10px] font-bold rounded-lg border border-theme-border/60 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveChick(chick.id)}
                              className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black text-[10px] font-black rounded-lg transition-colors flex items-center justify-center gap-1"
                            >
                              <Check size={10} /> Salvar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditChick(chick)}
                              className="flex-1 py-1.5 bg-theme-base hover:bg-theme-surface-hover text-white text-[10px] font-bold rounded-lg border border-theme-border/60 transition-colors flex items-center justify-center gap-1"
                            >
                              <Edit2 size={10} /> Nomear/Anilhar
                            </button>
                            <button
                              onClick={() => promoteChick(chick.id)}
                              className="px-2.5 py-1.5 bg-theme-primary hover:bg-theme-primary/80 text-black text-[10px] font-black rounded-lg transition-colors flex items-center gap-1 shadow-sm shrink-0"
                              title="Mover para Plantel principal"
                            >
                              <CheckCircle size={10} /> Promover
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── MODAL: CADASTRO / EDIÇÃO DE CASAL ── */}
      {showCoupleModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/85 animate-fade-in">
          <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[90dvh] md:h-auto md:max-h-[92vh] rounded-t-2xl md:rounded-2xl">
            {/* Header */}
            <div className="px-5 pt-4 pb-3 border-b border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-black text-lg text-white">
                  {coupleToEdit ? 'Editar Casal' : 'Formar Novo Casal'}
                </h3>
                <p className="text-xs text-theme-text-muted">
                  Configure o reprodutor, matrizes (até 6) e baia.
                </p>
              </div>
              <button 
                onClick={() => setShowCoupleModal(false)} 
                className="w-8 h-8 flex items-center justify-center rounded-lg text-theme-text-muted hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 overscroll-contain">
              
              {/* Tipo de cruzamento (Apenas no cadastro) */}
              {!coupleToEdit && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Tipo de Cruzamento</label>
                  <div className="grid grid-cols-2 gap-2 bg-theme-base/50 p-1 rounded-xl border border-theme-border/50">
                    <button
                      type="button"
                      onClick={() => {
                        setTipoCruzamento('puro');
                        setRacaCasal('');
                        setMachoId('');
                        setSelectedFemeas([]);
                      }}
                      className={`py-2 text-xs font-black rounded-lg transition-all ${tipoCruzamento === 'puro' ? 'bg-theme-primary text-black shadow-md' : 'text-theme-text-muted hover:text-white'}`}
                    >
                      Puro (Entre Raças)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTipoCruzamento('hibrido');
                        setRacaMacho('');
                        setRacaFemea('');
                        setMachoId('');
                        setSelectedFemeas([]);
                      }}
                      className={`py-2 text-xs font-black rounded-lg transition-all ${tipoCruzamento === 'hibrido' ? 'bg-theme-primary text-black shadow-md' : 'text-theme-text-muted hover:text-white'}`}
                    >
                      Híbrido
                    </button>
                  </div>
                </div>
              )}

              {/* Raça Selector */}
              {tipoCruzamento === 'puro' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Selecione a Raça *</label>
                  <select
                    value={racaCasal}
                    disabled={!!coupleToEdit}
                    onChange={e => {
                      setRacaCasal(e.target.value);
                      setMachoId('');
                      setSelectedFemeas([]);
                    }}
                    className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors disabled:opacity-50"
                  >
                    <option value="">— Selecione a Raça —</option>
                    {breeds.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Raça do Macho *</label>
                    <select
                      value={racaMacho}
                      disabled={!!coupleToEdit}
                      onChange={e => {
                        setRacaMacho(e.target.value);
                        setMachoId('');
                      }}
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors disabled:opacity-50"
                    >
                      <option value="">— Selecione —</option>
                      {breeds.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Raça da Fêmea *</label>
                    <select
                      value={racaFemea}
                      disabled={!!coupleToEdit}
                      onChange={e => {
                        setRacaFemea(e.target.value);
                        setSelectedFemeas([]);
                      }}
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors disabled:opacity-50"
                    >
                      <option value="">— Selecione —</option>
                      {breeds.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Macho Selector */}
              {((tipoCruzamento === 'puro' && racaCasal) || (tipoCruzamento === 'hibrido' && racaMacho)) && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Reprodutor (Macho) *</label>
                  <select
                    value={machoId}
                    onChange={e => setMachoId(e.target.value)}
                    className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-blue-400 outline-none transition-colors"
                  >
                    <option value="">— Selecione o macho —</option>
                    {birds
                      .filter(b => b.sexo === 'Macho' && b.status !== 'Vendido' && b.status !== 'Faleceu' && b.raca === (tipoCruzamento === 'puro' ? racaCasal : racaMacho))
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          {b.anilha} {b.nome ? `(${b.nome})` : ''}
                        </option>
                      ))}
                  </select>
                  {birds.filter(b => b.sexo === 'Macho' && b.status !== 'Vendido' && b.status !== 'Faleceu' && b.raca === (tipoCruzamento === 'puro' ? racaCasal : racaMacho)).length === 0 && (
                    <p className="text-[9px] text-orange-400 mt-1">Nenhum reprodutor cadastrado para esta raça.</p>
                  )}
                </div>
              )}

              {/* Fêmeas Selector (Up to 6) */}
              {((tipoCruzamento === 'puro' && racaCasal) || (tipoCruzamento === 'hibrido' && racaFemea)) && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-pink-400 uppercase tracking-wider">
                    Matrizes (Fêmeas, até 6) * ({selectedFemeas.length} selecionadas)
                  </label>
                  <div className="bg-theme-base border border-theme-border rounded-xl p-3 max-h-36 overflow-y-auto space-y-2">
                    {birds.filter(b => b.sexo === 'Fêmea' && b.status !== 'Vendido' && b.status !== 'Faleceu' && b.raca === (tipoCruzamento === 'puro' ? racaCasal : racaFemea)).length === 0 ? (
                      <p className="text-xs text-theme-text-muted italic">Nenhuma matriz desta raça cadastrada.</p>
                    ) : (
                      birds
                        .filter(b => b.sexo === 'Fêmea' && b.status !== 'Vendido' && b.status !== 'Faleceu' && b.raca === (tipoCruzamento === 'puro' ? racaCasal : racaFemea))
                        .map(f => {
                          const isChecked = selectedFemeas.includes(f.id);
                          return (
                            <label key={f.id} className="flex items-center gap-3 text-sm text-white cursor-pointer hover:bg-white/5 p-1 rounded transition-colors">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedFemeas(selectedFemeas.filter(id => id !== f.id));
                                  } else {
                                    if (selectedFemeas.length < 6) {
                                      setSelectedFemeas([...selectedFemeas, f.id]);
                                    }
                                  }
                                }}
                                className="rounded border-theme-border text-theme-primary focus:ring-theme-primary/30"
                              />
                              <span className="font-bold">{f.anilha}</span>
                              <span className="text-xs text-theme-text-muted">{f.nome || 'Sem nome'}</span>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>
              )}

              {/* CO-SANGUINIDADE LIVE DETECTOR */}
              {machoId && selectedFemeas.length > 0 && (
                <div className="space-y-2 bg-theme-base/40 border border-theme-border/30 rounded-xl p-3">
                  <h4 className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                    Análise de Co-sanguinidade
                  </h4>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {selectedFemeas.map(fId => {
                      const f = birds.find(b => b.id === fId);
                      const report = calculateInbreeding(machoId, fId, birds);
                      return (
                        <div key={fId} className={`p-2 rounded-lg border text-[10px] flex flex-col gap-1 ${report.color}`}>
                          <div className="flex justify-between items-center font-bold">
                            <span>Macho × Fêmea {f?.anilha}</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-white/10 uppercase tracking-wider text-[8px]">
                              {report.label}
                            </span>
                          </div>
                          <p className="opacity-90">{report.details}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Baia & Ovos Disponíveis & Objetivo */}
              {machoId && selectedFemeas.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Baia / Gaiola</label>
                      <input
                        type="text"
                        value={baiaCasal}
                        onChange={e => setBaiaCasal(e.target.value)}
                        className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                        placeholder="Ex: Baia 4"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Ovos Prontos p/ Choco</label>
                      <input
                        type="number"
                        min={0}
                        value={ovosDisponiveis}
                        onChange={e => setOvosDisponiveis(parseInt(e.target.value) || 0)}
                        className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Objetivo</label>
                      <select
                        value={objetivo}
                        onChange={e => setObjetivo(e.target.value)}
                        className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors"
                      >
                        <option>Melhoramento Genético</option>
                        <option>Corte (Pesados)</option>
                        <option>Postura</option>
                        <option>Competição</option>
                        <option>Conservação de Linhagem</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">Data de Início</label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={e => setDataInicio(e.target.value)}
                        className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white outline-none [color-scheme:dark] transition-colors"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-between items-center shrink-0">
              <button 
                onClick={() => setShowCoupleModal(false)} 
                className="px-4 py-2 text-sm text-theme-text-muted hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCouple}
                disabled={!machoId || selectedFemeas.length === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle size={16} /> Salvar Casal
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: ENVIAR PARA CHOCO (INCUBAR) ── */}
      {incubatingCoupleId && (() => {
        const couple = couples.find(c => c.id === incubatingCoupleId);
        const macho = birds.find(b => b.id === couple?.machoId);
        const available = couple?.ovosDisponiveis || 0;

        return createPortal(
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/85 animate-fade-in">
            <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col rounded-t-2xl md:rounded-2xl">
              <div className="px-5 pt-4 pb-3 border-b border-theme-border bg-theme-base/50 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-base text-white">Incubar Ovos</h3>
                  <p className="text-[10px] text-theme-text-muted">
                    Casal: {macho?.anilha} · Ovos Disponíveis: {available}
                  </p>
                </div>
                <button onClick={() => setIncubatingCoupleId(null)} className="text-theme-text-muted hover:text-white"><X size={18} /></button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase">Quantos Ovos Incubar? (máx {available})</label>
                  <input
                    type="number"
                    min={1}
                    max={available}
                    value={incubatingOvosCount}
                    onChange={e => setIncubatingOvosCount(Math.min(available, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-theme-text-muted uppercase">Nº do Lote</label>
                    <input
                      type="text"
                      value={numeroLote}
                      onChange={e => setNumeroLote(e.target.value)}
                      placeholder="Ex: LOTE-01"
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-theme-text-muted uppercase">Baia de Eclosão</label>
                    <input
                      type="text"
                      value={baiaLote}
                      onChange={e => setBaiaLote(e.target.value)}
                      placeholder="Ex: Cruzador 3"
                      className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-between items-center">
                <button onClick={() => setIncubatingCoupleId(null)} className="px-4 py-2 text-xs text-theme-text-muted hover:text-white">Cancelar</button>
                <button
                  onClick={handleSendToChoco}
                  className="btn-primary !px-4 !py-2 !text-xs flex items-center gap-1"
                >
                  <CheckCircle size={14} /> Confirmar Incubação
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ── MODAL: REGISTRAR OVOSCOPIA (DESCARTE) ── */}
      {ovoscopyLotId && ovoscopyStep && (() => {
        const lot = incubationLots.find(l => l.id === ovoscopyLotId);
        return createPortal(
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/85 animate-fade-in">
            <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col rounded-t-2xl md:rounded-2xl">
              <div className="px-5 pt-4 pb-3 border-b border-theme-border bg-theme-base/50 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-base text-white">Registrar {ovoscopyStep}ª Ovoscopia</h3>
                  <p className="text-[10px] text-theme-text-muted">Lote: {lot?.numeroLote} · Ovos ativos: {lot?.quantidadeOvos}</p>
                </div>
                <button onClick={() => { setOvoscopyLotId(null); setOvoscopyStep(null); }} className="text-theme-text-muted hover:text-white"><X size={18} /></button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase">Quantos ovos serão descartados? (inférteis / sem embrião)</label>
                  <input
                    type="number"
                    min={0}
                    max={lot?.quantidadeOvos || 0}
                    value={discardCount}
                    onChange={e => setDiscardCount(Math.min(lot?.quantidadeOvos || 0, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                  />
                </div>
              </div>

              <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-between items-center">
                <button onClick={() => { setOvoscopyLotId(null); setOvoscopyStep(null); }} className="px-4 py-2 text-xs text-theme-text-muted hover:text-white">Cancelar</button>
                <button
                  onClick={handleConfirmOvoscopy}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-black text-xs rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Check size={14} /> Registrar Descarte
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* ── MODAL: REGISTRAR NASCIMENTO / CONCLUIR ECLOSÃO ── */}
      {hatchLotId && (() => {
        const lot = incubationLots.find(l => l.id === hatchLotId);
        return createPortal(
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/85 animate-fade-in">
            <div className="bg-theme-surface md:border border-theme-border md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col rounded-t-2xl md:rounded-2xl">
              <div className="px-5 pt-4 pb-3 border-b border-theme-border bg-theme-base/50 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-base text-white">Registrar Nascimento (Eclosão)</h3>
                  <p className="text-[10px] text-theme-text-muted">Lote: {lot?.numeroLote} · Ovos restantes: {lot?.quantidadeOvos}</p>
                </div>
                <button onClick={() => setHatchLotId(null)} className="text-theme-text-muted hover:text-white"><X size={18} /></button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-theme-text-muted uppercase">Quantos pintinhos nasceram vivos com sucesso?</label>
                  <input
                    type="number"
                    min={0}
                    max={lot?.quantidadeOvos || 0}
                    value={bornCount}
                    onChange={e => setBoldCount(Math.min(lot?.quantidadeOvos || 0, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none"
                  />
                  <p className="text-[9px] text-theme-text-muted mt-1">Os pintinhos nascidos serão pré-cadastrados na aba "Crescimento" automaticamente.</p>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-theme-border bg-theme-base/50 flex justify-between items-center">
                <button onClick={() => setHatchLotId(null)} className="px-4 py-2 text-xs text-theme-text-muted hover:text-white">Cancelar</button>
                <button
                  onClick={handleConfirmHatch}
                  className="px-4 py-2 bg-theme-primary hover:bg-theme-primary/80 text-black font-black text-xs rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Sparkles size={14} /> Salvar Filhotes
                </button>
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
}
