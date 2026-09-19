import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Egg, Scale, Beef, Timer, Plus, Activity, X, Search, Check,
  DollarSign, Info, ChevronDown, Users, Trash2, Baby, Home, AlertCircle,
  CheckCircle, Sparkles, Send, Loader2
} from 'lucide-react';
import { useAppContext } from '../lib/AppContext';
import { useAuth } from '../lib/AuthContext';
import { ModuleLockedPaywall } from '../components/ModuleLockedPaywall';
import { ConfirmDialog } from '../components/modals/ConfirmDialog';
import { QuickBreedModal } from '../components/modals/QuickBreedModal';
import { WeighingModal } from '../components/modals/WeighingModal';
import { LotMovementModal } from '../components/modals/LotMovementModal';
import { generateLotPdf, sharePdfFile } from '../lib/pdfGenerator';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function calcDays(start: string) {
  const s = new Date(start); const n = new Date();
  s.setHours(0,0,0,0); n.setHours(0,0,0,0);
  return Math.max(0, Math.floor((n.getTime()-s.getTime())/86400000));
}
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR'); }
function normalizeBaia(str: string) { return str.toLowerCase().replace(/[^a-z0-9]/g, ''); }

function parseWeightG(val: string | number | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).toLowerCase().replace(',', '.').trim();
  const match = clean.match(/([\d.]+)/);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return 0;
  if (clean.includes('kg') || (!clean.includes('g') && num < 20)) {
    return Math.round(num * 1000);
  }
  return Math.round(num);
}

function formatWeightG(grams: number): string {
  if (!grams || grams <= 0) return '0g';
  if (grams >= 1000) {
    return (grams / 1000).toFixed(2).replace('.', ',') + ' kg';
  }
  return Math.round(grams) + 'g';
}

function addDaysToDate(baseDateISO: string, daysToAdd: number): string {
  if (!baseDateISO) return '';
  const d = new Date(baseDateISO + 'T12:00:00');
  d.setDate(d.getDate() + daysToAdd);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// Bloqueia letras em campos numéricos (inclusive Android que ignora type=number)
const onlyNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  const allowed = ['Backspace','Delete','Tab','Escape','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','.',','];
  if (allowed.includes(e.key)) return;
  if (e.ctrlKey || e.metaKey) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
};
const sanitizeNumeric = (val: string) => val.replace(/[^0-9.,]/g, '');

const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors placeholder-theme-text-muted";
const labelCls = "text-[10px] font-bold text-theme-text-muted uppercase tracking-wider";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className={labelCls + " mb-1"}>{children}</p>;
}

function ModeToggle({ mode, onChange, label1, label2 }: {
  mode: 'select'|'qty'; onChange:(m:'select'|'qty')=>void; label1:string; label2:string;
}) {
  return (
    <div className="flex bg-theme-base border border-theme-border rounded-xl p-1 gap-1">
      {(['select','qty'] as const).map((m,i)=>(
        <button key={m} type="button" onClick={()=>onChange(m)}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${mode===m?'bg-theme-primary text-black':'text-theme-text-muted hover:text-white'}`}>
          {i===0?label1:label2}
        </button>
      ))}
    </div>
  );
}

function BirdPicker({ birds, selected, onToggle, onSelectAll, search, onSearch, emptyMsg }: {
  birds:{id:string;anilha:string;nome:string;raca:string;sexo:string;status:string}[];
  selected:string[]; onToggle:(id:string)=>void; onSelectAll:(ids:string[])=>void;
  search:string; onSearch:(v:string)=>void; emptyMsg:string;
}) {
  const filtered = birds.filter(b =>
    b.anilha.toLowerCase().includes(search.toLowerCase()) ||
    b.raca.toLowerCase().includes(search.toLowerCase()) ||
    b.nome.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={labelCls}>{selected.length} selecionada(s)</span>
        {filtered.length>0&&(
          <button type="button" onClick={()=>onSelectAll(filtered.map(b=>b.id))}
            className="text-[10px] text-theme-primary font-bold hover:underline">
            {filtered.every(b=>selected.includes(b.id))?'Desmarcar todas':'Selecionar filtradas'}
          </button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={13}/>
        <input type="text" placeholder="Buscar por anilha, raça ou nome..."
          value={search} onChange={e=>onSearch(e.target.value)}
          className="w-full bg-theme-base border border-theme-border rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:border-theme-primary outline-none"/>
      </div>
      <div className="border border-theme-border rounded-xl max-h-44 overflow-y-auto divide-y divide-theme-border/40 bg-theme-base/30">
        {filtered.map(b=>{
          const sel = selected.includes(b.id);
          return (
            <div key={b.id} onClick={()=>onToggle(b.id)}
              className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/5 transition-colors">
              <div>
                <p className="text-xs font-bold text-white">Anilha: {b.anilha}{b.nome?` - ${b.nome}`:''}</p>
                <p className="text-[10px] text-theme-text-muted">{b.raca} | {b.sexo} | {b.status}</p>
              </div>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all shrink-0 ${sel?'bg-theme-primary border-theme-primary text-black':'border-theme-border bg-theme-surface'}`}>
                {sel&&<Check size={11} strokeWidth={3}/>}
              </div>
            </div>
          );
        })}
        {filtered.length===0&&(
          <p className="p-4 text-center text-xs text-theme-text-muted italic">{emptyMsg}</p>
        )}
      </div>
    </div>
  );
}

function BaiaBirdsManagementCard({
  baia,
  birds,
  selectedBirdIds,
  onIncludeBirds,
  editBird,
  showToast
}: {
  baia: string;
  birds: any[];
  selectedBirdIds: string[];
  onIncludeBirds: (ids: string[]) => void;
  editBird: (id: string, updated: any) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}) {
  const [selectedBirdId, setSelectedBirdId] = useState<string | null>(null);
  const [action, setAction] = useState<'idle' | 'include' | 'keep' | 'change'>('idle');
  const [newBaiaInput, setNewBaiaInput] = useState('');

  if (!baia.trim()) return null;

  const targetNorm = normalizeBaia(baia);
  const baiaBirds = birds.filter(
    b => b.status !== 'Vendido' && b.status !== 'Faleceu' && b.baia && normalizeBaia(b.baia) === targetNorm
  );

  if (baiaBirds.length === 0) return null;

  const femeasInBaia = baiaBirds.filter(b => b.sexo === 'Fêmea');
  const machosInBaia = baiaBirds.filter(b => b.sexo === 'Macho');

  return (
    <div className="space-y-3 animate-fade-in">
      {/* ── CARD FÊMEAS CADASTRADAS NA BAIA ── */}
      {femeasInBaia.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between text-amber-400 font-bold text-xs">
            <div className="flex items-center gap-2">
              <Home size={15} />
              <span>A Baia "{baia}" possui {femeasInBaia.length} fêmea(s) cadastradas:</span>
            </div>
            {femeasInBaia.some(b => !selectedBirdIds.includes(b.id)) && (
              <button
                type="button"
                onClick={() => {
                  const unselected = femeasInBaia.filter(b => !selectedBirdIds.includes(b.id)).map(b => b.id);
                  onIncludeBirds(unselected);
                  showToast(`${unselected.length} fêmea(s) incluídas no lote`, 'success');
                }}
                className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[10px] px-2.5 py-1 rounded-lg transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <Plus size={12} />
                <span>Incluir Todas no Lote</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {femeasInBaia.map(femea => {
              const isIncluded = selectedBirdIds.includes(femea.id);
              const isSelected = selectedBirdId === femea.id;
              const isChanging = isSelected && action === 'change';

              const newBaiaTargetBirds = newBaiaInput.trim()
                ? birds.filter(b => b.baia && normalizeBaia(b.baia) === normalizeBaia(newBaiaInput) && b.id !== femea.id)
                : [];

              return (
                <div key={femea.id} className="bg-theme-surface border border-theme-border/60 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white">🐔 Anilha: {femea.anilha} {femea.nome ? `(${femea.nome})` : ''}</p>
                      <p className="text-[10px] text-theme-text-muted">{femea.raca} · Baia Atual: {femea.baia}</p>
                    </div>
                    {isIncluded ? (
                      <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                        ✓ Incluída no Lote
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Pendente
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-bold text-theme-text-muted">
                    Deseja incluir a fêmea no lote ou alterar a baia dela?
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isIncluded) {
                          onIncludeBirds([femea.id]);
                          showToast(`Fêmea Anilha ${femea.anilha} incluída no lote!`, 'success');
                        }
                        setSelectedBirdId(femea.id);
                        setAction('include');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        isIncluded 
                          ? 'bg-emerald-500 text-black font-black shadow-md' 
                          : 'bg-theme-base border border-theme-border hover:border-emerald-500 text-white'
                      }`}
                    >
                      {isIncluded ? '✓ Incluída no Lote' : 'Incluir no Lote'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBirdId(femea.id);
                        setAction('change');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        isChanging 
                          ? 'bg-amber-500 text-black font-black shadow-md' 
                          : 'bg-theme-base border border-theme-border hover:border-amber-500 text-white'
                      }`}
                    >
                      Não Incluir (Alterar Baia)
                    </button>
                  </div>

                  {/* Painel para alterar a Baia da Fêmea se clicou em Não Incluir */}
                  {isChanging && (
                    <div className="pt-2 border-t border-theme-border/50 space-y-2 animate-fade-in">
                      <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                        Qual a Nova Baia para a Fêmea {femea.anilha}? *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: Baia 05"
                          value={newBaiaInput}
                          onChange={e => setNewBaiaInput(e.target.value)}
                          className="flex-1 bg-theme-base border border-theme-border rounded-xl p-2.5 text-xs text-white focus:border-amber-400 outline-none"
                        />
                        <button
                          type="button"
                          disabled={!newBaiaInput.trim()}
                          onClick={() => {
                            const newBay = newBaiaInput.trim();
                            editBird(femea.id, { baia: newBay });
                            showToast(`Fêmea Anilha ${femea.anilha} transferida para a ${newBay} com sucesso!`, 'success');
                            setAction('idle');
                            setSelectedBirdId(null);
                            setNewBaiaInput('');
                          }}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shrink-0"
                        >
                          Confirmar Nova Baia
                        </button>
                      </div>

                      {/* AVISO SE A NOVA BAIA JÁ POSSUI AVES CADASTRADAS */}
                      {newBaiaInput.trim() !== '' && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px]">
                          {newBaiaTargetBirds.length > 0 ? (
                            <div className="space-y-1">
                              <p className="font-extrabold text-amber-400 flex items-center gap-1">
                                <AlertCircle size={12} />
                                A nova Baia "{newBaiaInput}" já possui {newBaiaTargetBirds.length} ave(s) cadastradas:
                              </p>
                              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                                {newBaiaTargetBirds.map(tb => (
                                  <span key={tb.id} className="bg-theme-base px-2 py-0.5 rounded text-[10px] text-white border border-theme-border">
                                    {tb.sexo === 'Macho' ? '🐓' : '🐔'} Anilha: {tb.anilha} {tb.nome ? `(${tb.nome})` : ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-emerald-400 font-bold flex items-center gap-1">
                              ✓ A Baia "{newBaiaInput}" está livre (0 aves cadastradas).
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CARD MACHOS CADASTRADOS NA BAIA ── */}
      {machosInBaia.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
            <span className="text-base">🐓</span>
            <span>A Baia "{baia}" possui {machosInBaia.length} galo/macho cadastrado:</span>
          </div>

          {machosInBaia.map(macho => {
            const isSelected = selectedBirdId === macho.id;
            const isChanging = isSelected && action === 'change';
            const isKept = isSelected && action === 'keep';

            const newBaiaTargetBirds = newBaiaInput.trim()
              ? birds.filter(b => b.baia && normalizeBaia(b.baia) === normalizeBaia(newBaiaInput) && b.id !== macho.id)
              : [];

            return (
              <div key={macho.id} className="bg-theme-surface border border-theme-border/60 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-white">Anilha: {macho.anilha} {macho.nome ? `(${macho.nome})` : ''}</p>
                    <p className="text-[10px] text-theme-text-muted">{macho.raca} · Baia Atual: {macho.baia}</p>
                  </div>
                  {isKept && (
                    <span className="text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      ✓ Mantido na Baia
                    </span>
                  )}
                </div>

                <p className="text-[11px] font-bold text-theme-text-muted">
                  Deseja manter este macho na Baia "{baia}" ou alterar a baia dele?
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBirdId(macho.id);
                      setAction('keep');
                      showToast(`Macho Anilha ${macho.anilha} mantido na Baia ${baia}`, 'info');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      isKept 
                        ? 'bg-emerald-500 text-black font-black shadow-md' 
                        : 'bg-theme-base border border-theme-border hover:border-emerald-500 text-white'
                    }`}
                  >
                    Manter Macho na Baia
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBirdId(macho.id);
                      setAction('change');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      isChanging 
                        ? 'bg-blue-500 text-white font-black shadow-md' 
                        : 'bg-theme-base border border-theme-border hover:border-blue-500 text-white'
                    }`}
                  >
                    Alterar Baia do Macho
                  </button>
                </div>

                {/* Painel para digitar a Nova Baia */}
                {isChanging && (
                  <div className="pt-2 border-t border-theme-border/50 space-y-2 animate-fade-in">
                    <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">
                      Qual a Nova Baia para o Macho {macho.anilha}? *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: Baia 12"
                        value={newBaiaInput}
                        onChange={e => setNewBaiaInput(e.target.value)}
                        className="flex-1 bg-theme-base border border-theme-border rounded-xl p-2.5 text-xs text-white focus:border-blue-400 outline-none"
                      />
                      <button
                        type="button"
                        disabled={!newBaiaInput.trim()}
                        onClick={() => {
                          const newBay = newBaiaInput.trim();
                          editBird(macho.id, { baia: newBay });
                          showToast(`Macho Anilha ${macho.anilha} transferido para a ${newBay} com sucesso!`, 'success');
                          setAction('idle');
                          setSelectedBirdId(null);
                          setNewBaiaInput('');
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all active:scale-95 cursor-pointer shrink-0"
                      >
                        Confirmar Nova Baia
                      </button>
                    </div>

                    {/* AVISO SE A NOVA BAIA JÁ POSSUI AVES CADASTRADAS */}
                    {newBaiaInput.trim() !== '' && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px]">
                        {newBaiaTargetBirds.length > 0 ? (
                          <div className="space-y-1">
                            <p className="font-extrabold text-amber-400 flex items-center gap-1">
                              <AlertCircle size={12} />
                              A nova Baia "{newBaiaInput}" já possui {newBaiaTargetBirds.length} ave(s) cadastradas:
                            </p>
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                              {newBaiaTargetBirds.map(tb => (
                                <span key={tb.id} className="bg-theme-base px-2 py-0.5 rounded text-[10px] text-white border border-theme-border">
                                  {tb.sexo === 'Macho' ? '🐓' : '🐔'} Anilha: {tb.anilha} {tb.nome ? `(${tb.nome})` : ''}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-emerald-400 font-bold flex items-center gap-1">
                            ✓ A Baia "{newBaiaInput}" está livre (0 aves cadastradas).
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Lots() {
  const { hasModuleAccess } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    birds, editBird, showToast, breeds, eggLots, addEggLot, editEggLot,
    meatLots, addMeatLot, editMeatLot, removeMeatLot, farmSettings 
  } = useAppContext();

  if (!hasModuleAccess('lots')) {
    return <ModuleLockedPaywall module="lots" />;
  }

  const [activeTab, setActiveTab] = useState<'postura'|'engorda'|'pintinhos'>('postura');
  const [generatingLotId, setGeneratingLotId] = useState<string | null>(null);

  const handleShareLotPdf = async (lote: any, lotType: 'cruzador' | 'incubacao' | 'engorda' | 'postura' | 'pintinhos') => {
    setGeneratingLotId(lote.id);
    try {
      const blob = await generateLotPdf({
        lot: lote,
        lotType,
        farmSettings,
        birdsList: birds,
      });
      const filename = `ficha-lote-${lote.baia ? `baia-${lote.baia}` : lotType}.pdf`;
      const lotTitle = lote.cageName || lote.numeroLote || (lote.baia ? `Lote Baia ${lote.baia}` : 'Lote');
      const result = await sharePdfFile(
        blob,
        filename,
        `Ficha do Lote - ${lotTitle}`,
        `Relatório e Ficha Técnica oficial do ${lotTitle} (${farmSettings?.name || 'Mura Manager'})`
      );
      showToast?.(
        result === 'shared' ? 'Compartilhando ficha do lote...' : 'Ficha do lote baixada com sucesso!',
        'success'
      );
    } catch (err) {
      console.error('Erro ao gerar PDF do lote:', err);
      showToast?.('Erro ao gerar Ficha Técnica do lote em PDF.', 'error');
    } finally {
      setGeneratingLotId(null);
    }
  };

  useEffect(() => {
    if (location.state) {
      const stateObj = location.state as any;
      if (stateObj.tab) {
        if (stateObj.tab === 'crescimento') {
          setActiveTab('engorda');
        } else {
          setActiveTab(stateObj.tab);
        }
      }
    }
    window.scrollTo(0, 0);
    const scrollContainers = document.querySelectorAll('.overflow-y-auto');
    scrollContainers.forEach(el => { el.scrollTop = 0; });
  }, [location, activeTab]);

  // Postura Lot states
  const [showPostura, setShowPostura] = useState(false);
  const [pBaia, setPBaia] = useState('');
  const [pRaca, setPRaca] = useState('');
  const [pDataInicio, setPDataInicio] = useState(todayISO());
  const [pMode, setPMode] = useState<'select'|'qty'>('select');
  const [pFemeas, setPFemeas] = useState<string[]>([]);
  const [pQtd, setPQtd] = useState('');
  const [pSearch, setPSearch] = useState('');
  const [pExpectativa, setPExpectativa] = useState('');
  const [pPreco, setPPreco] = useState('');
  const [pCusto, setPCusto] = useState('');
  const [pObs, setPObs] = useState('');

  // Engorda Lot states
  const [showEngorda, setShowEngorda] = useState(false);
  const [eBaia, setEBaia] = useState('');
  const [eRaca, setERaca] = useState('');
  const [eDataInicio, setEDataInicio] = useState(todayISO());
  const [eIdadeDias, setEIdadeDias] = useState('');
  const [eMode, setEMode] = useState<'select'|'qty'>('select');
  const [eAves, setEAves] = useState<string[]>([]);
  const [eQtd, setEQtd] = useState('');
  const [eSearch, setESearch] = useState('');
  const [ePesoInicial, setEPesoInicial] = useState('');
  const [ePesoMeta, setEPesoMeta] = useState('');
  const [eObs, setEObs] = useState('');
  const [eGanhoGramasDia, setEGanhoGramasDia] = useState('');
  const [eConsumoRacaoAve, setEConsumoRacaoAve] = useState('');

  // Modal de Cadastro Rápido de Raça (sem sair do formulário de engorda)
  const [showQuickBreedModal, setShowQuickBreedModal] = useState(false);

  // Modal de Registro Periódico de Pesagem Manual
  const [weighModal, setWeighModal] = useState<{
    isOpen: boolean;
    lote: any | null;
  }>({
    isOpen: false,
    lote: null,
  });

  // Confirmação profissional de exclusão de lote
  const [deleteLotConfirm, setDeleteLotConfirm] = useState<{ id: string; title: string; message: string } | null>(null);

  // Pintinhos Lot states
  const [showPintinhos, setShowPintinhos] = useState(false);
  const [piBaia, setPiBaia] = useState('');
  const [piRaca, setPiRaca] = useState('');
  const [piDataNascimento, setPiDataNascimento] = useState(todayISO());
  const [piPesoInicial, setPiPesoInicial] = useState('');
  const [piOrigem, setPiOrigem] = useState<'Criatório' | 'Externo' | ''>('');
  const [piPaiId, setPiPaiId] = useState('');
  const [piMaeId, setPiMaeId] = useState('');
  const [piPaisTexto, setPiPaisTexto] = useState('');
  const [piPaiNome, setPiPaiNome] = useState('');
  const [piMaeNome, setPiMaeNome] = useState('');
  const [piQtd, setPiQtd] = useState('');
  const [piObs, setPiObs] = useState('');
  const [showChickSampleCalc, setShowChickSampleCalc] = useState(false);
  const [chickSampleWeights, setChickSampleWeights] = useState<string[]>(['', '', '', '', '']);

  // Confirmation Modal state for Lot Quantity Verification
  const [confirmLotModal, setConfirmLotModal] = useState<{
    isOpen: boolean;
    lotType: 'postura' | 'engorda';
    selectedCount: number;
    extraCount: number;
    sumTotal: number;
    customTotalInput: string;
    isAskingCustom: boolean;
    pendingSaveFn: (finalTotal: number) => void;
  }>({
    isOpen: false,
    lotType: 'postura',
    selectedCount: 0,
    extraCount: 0,
    sumTotal: 0,
    customTotalInput: '',
    isAskingCustom: false,
    pendingSaveFn: () => {},
  });

  const activeFemales = birds.filter(b=>b.sexo==='Fêmea'&&b.status!=='Vendido'&&b.status!=='Faleceu');
  const activeBirds = birds.filter(b=>b.status!=='Vendido'&&b.status!=='Faleceu');

  const filterEngorda = meatLots.filter(l => !l.id.startsWith('chick-'));
  const filterPintinhos = meatLots.filter(l => l.id.startsWith('chick-'));

  // ── Filtro de Status dos Lotes (Ativos / Encerrados / Todos) ──
  const [lotStatusFilter, setLotStatusFilter] = useState<'ativos' | 'encerrados' | 'todos'>('ativos');

  const displayedEggLots = useMemo(() => {
    if (lotStatusFilter === 'ativos') return eggLots.filter(l => l.status !== 'Encerrado');
    if (lotStatusFilter === 'encerrados') return eggLots.filter(l => l.status === 'Encerrado');
    return eggLots;
  }, [eggLots, lotStatusFilter]);

  const displayedEngorda = useMemo(() => {
    if (lotStatusFilter === 'ativos') return filterEngorda.filter(l => l.status !== 'Abatido');
    if (lotStatusFilter === 'encerrados') return filterEngorda.filter(l => l.status === 'Abatido');
    return filterEngorda;
  }, [filterEngorda, lotStatusFilter]);

  const displayedPintinhos = useMemo(() => {
    if (lotStatusFilter === 'ativos') return filterPintinhos.filter(l => l.status !== 'Abatido');
    if (lotStatusFilter === 'encerrados') return filterPintinhos.filter(l => l.status === 'Abatido');
    return filterPintinhos;
  }, [filterPintinhos, lotStatusFilter]);

  const [confirmTransfer, setConfirmTransfer] = useState<{
    isOpen: boolean;
    lote: any | null;
  }>({
    isOpen: false,
    lote: null,
  });

  const [movementModal, setMovementModal] = useState<{
    isOpen: boolean;
    lote: any | null;
    loteType: 'postura' | 'engorda' | 'pintinhos';
  }>({
    isOpen: false,
    lote: null,
    loteType: 'engorda',
  });

  const isAnyModalOpen = showPostura || showEngorda || showPintinhos || confirmLotModal.isOpen || confirmTransfer.isOpen || movementModal.isOpen || showQuickBreedModal || weighModal.isOpen;
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.classList.add('modal-open-lock');
    } else {
      document.body.classList.remove('modal-open-lock');
    }
    return () => {
      document.body.classList.remove('modal-open-lock');
    };
  }, [isAnyModalOpen]);

  const openTransferModal = (lote: any) => {
    setConfirmTransfer({ isOpen: true, lote });
  };

  const executeTransfer = () => {
    if (!confirmTransfer.lote) return;
    const { lote } = confirmTransfer;

    removeMeatLot(lote.id);

    const newId = 'meat-' + uid();
    const idadeDias = calcDays(lote.dataNascimento || lote.dataInicio);

    addMeatLot({
      id: newId,
      baia: lote.baia,
      avesIds: lote.avesIds || [],
      qtdAves: lote.qtdAves || 0,
      dataInicio: todayISO(),
      idadeInicialDias: idadeDias,
      pesoMedioInicial: lote.pesoMedioInicial || undefined,
      pesoMeta: lote.pesoMeta,
      status: 'Crescimento',
      raca: lote.raca,
      observacao: lote.observacao,
    });

    setConfirmTransfer({ isOpen: false, lote: null });
    setActiveTab('engorda');
    showToast?.('Lote transferido para Engorda / Abate com sucesso!', 'success');
  };

  // ── Handlers de Seleção sem Perder Estado ──
  const handleFemaleToggle = (id: string) => {
    const next = pFemeas.includes(id) ? pFemeas.filter(x=>x!==id) : [...pFemeas, id];
    setPFemeas(next);
  };
  const handleFemaleSelectAll = (ids: string[]) => {
    const allSel = ids.every(id=>pFemeas.includes(id));
    const next = allSel ? pFemeas.filter(id=>!ids.includes(id)) : Array.from(new Set([...pFemeas,...ids]));
    setPFemeas(next);
  };

  const resetPostura = () => {
    setShowPostura(false); setPBaia(''); setPRaca(''); setPDataInicio(todayISO());
    setPMode('select'); setPFemeas([]); setPQtd(''); setPSearch('');
    setPExpectativa(''); setPPreco(''); setPCusto(''); setPObs('');
  };

  const handleSavePosturaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pBaia.trim()) return;

    const numSel = pFemeas.length;
    const numExtra = parseInt(pQtd) || 0;
    const sumTotal = numSel + numExtra;

    const doSave = (finalTotal: number) => {
      addEggLot({
        id: uid(),
        baia: pBaia.trim(),
        femeasIds: pFemeas,
        qtdFemeas: finalTotal,
        expectativaDiaria: pExpectativa.trim() ? (parseInt(pExpectativa) || 0) : 0,
        dataInicio: pDataInicio,
        status: 'Ativo',
        raca: pRaca.trim() || undefined,
        precoVendaPadrao: pPreco.trim() ? (parseFloat(pPreco) || undefined) : undefined,
        custoProdPadrao: pCusto.trim() ? (parseFloat(pCusto) || undefined) : undefined,
        observacao: pObs.trim() || undefined,
      });
      resetPostura();
    };

    setConfirmLotModal({
      isOpen: true,
      lotType: 'postura',
      selectedCount: numSel,
      extraCount: numExtra,
      sumTotal,
      customTotalInput: String(sumTotal),
      isAskingCustom: false,
      pendingSaveFn: doSave,
    });
  };

  const handleBirdToggle = (id: string) => {
    setEAves(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  };
  const handleBirdSelectAll = (ids: string[]) => {
    const allSel = ids.every(id=>eAves.includes(id));
    setEAves(allSel ? eAves.filter(id=>!ids.includes(id)) : Array.from(new Set([...eAves,...ids])));
  };

  const resetEngorda = () => {
    setShowEngorda(false); setEBaia(''); setERaca(''); setEDataInicio(todayISO());
    setEIdadeDias(''); setEMode('select'); setEAves([]); setEQtd(''); setESearch('');
    setEPesoInicial(''); setEPesoMeta(''); setEObs('');
    setEGanhoGramasDia(''); setEConsumoRacaoAve('');
  };

  const handleSaveEngordaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eBaia.trim()) return;

    const numSel = eAves.length;
    const numExtra = parseInt(eQtd) || 0;
    const sumTotal = numSel + numExtra;

    const doSave = (finalTotal: number) => {
      addMeatLot({
        id: uid(),
        baia: eBaia.trim(),
        avesIds: eAves,
        qtdAves: finalTotal,
        dataInicio: eDataInicio,
        idadeInicialDias: eIdadeDias.trim() ? (parseInt(eIdadeDias) || 0) : undefined,
        pesoMedioInicial: ePesoInicial.trim() || undefined,
        pesoMeta: ePesoMeta.trim() || undefined,
        status: 'Crescimento',
        raca: eRaca.trim() || undefined,
        observacao: eObs.trim() || undefined,
        ganhoGramasDia: eGanhoGramasDia.trim() ? (parseFloat(eGanhoGramasDia) || undefined) : undefined,
        consumoRacaoAve: eConsumoRacaoAve.trim() ? (parseFloat(eConsumoRacaoAve) || undefined) : undefined,
        pesagens: [],
      });
      resetEngorda();
    };

    setConfirmLotModal({
      isOpen: true,
      lotType: 'engorda',
      selectedCount: numSel,
      extraCount: numExtra,
      sumTotal,
      customTotalInput: String(sumTotal),
      isAskingCustom: false,
      pendingSaveFn: doSave,
    });
  };

  const openWeighModal = (lote: any) => {
    setWeighModal({ isOpen: true, lote });
  };

  // Pintinhos methods
  const resetPintinhos = () => {
    setShowPintinhos(false); setPiBaia(''); setPiRaca(''); setPiDataNascimento(todayISO());
    setPiPesoInicial(''); setPiOrigem('');
    setPiPaiId(''); setPiMaeId(''); setPiPaisTexto(''); setPiPaiNome(''); setPiMaeNome('');
    setPiQtd(''); setPiObs('');
    setShowChickSampleCalc(false);
    setChickSampleWeights(['', '', '', '', '']);
  };

  const handleChickSampleWeightChange = (index: number, val: string) => {
    const updated = [...chickSampleWeights];
    updated[index] = val;
    setChickSampleWeights(updated);

    const validGrams = updated
      .map(v => parseWeightG(v))
      .filter(g => g > 0);

    if (validGrams.length > 0) {
      const avg = Math.round(validGrams.reduce((a, b) => a + b, 0) / validGrams.length);
      setPiPesoInicial(formatWeightG(avg));
    }
  };

  const handleSavePintinhosSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!piBaia.trim()) return;

    const qtd = parseInt(piQtd) || 0;
    if (qtd <= 0) {
      showToast?.('Informe a quantidade de pintinhos no lote.', 'warning');
      return;
    }

    if (!piOrigem) {
      showToast?.('Selecione a origem dos pintinhos (Do criatório ou Externo).', 'warning');
      return;
    }

    const isCriatorio = piOrigem === 'Criatório';
    const isExterno = piOrigem === 'Externo';
    const initialG = parseWeightG(piPesoInicial);

    const validSampleGrams = chickSampleWeights
      .map(w => parseWeightG(w))
      .filter(g => g > 0);

    const initialPesagens: any[] = [];
    if (validSampleGrams.length >= 5) {
      initialPesagens.push({
        id: uid(),
        data: piDataNascimento,
        pesoMedioG: Math.round(validSampleGrams.reduce((a, b) => a + b, 0) / validSampleGrams.length),
        avesPesadas: validSampleGrams.length,
        observacao: `Amostragem inicial no nascimento (${validSampleGrams.length} pintinhos)`
      });
    } else if (initialG > 0) {
      initialPesagens.push({
        id: uid(),
        data: piDataNascimento,
        pesoMedioG: initialG,
        avesPesadas: 5,
        observacao: 'Peso inicial informado'
      });
    }

    addMeatLot({
      id: 'chick-' + uid(),
      baia: piBaia.trim(),
      avesIds: [],
      qtdAves: qtd,
      dataInicio: piDataNascimento,
      dataNascimento: piDataNascimento,
      origem: piOrigem,
      paiId: isCriatorio && piPaiId ? piPaiId : undefined,
      maeId: isCriatorio && piMaeId ? piMaeId : undefined,
      paiNome: isExterno && piPaisTexto.trim() ? piPaisTexto.trim() : (piPaiNome.trim() || undefined),
      maeNome: isExterno ? undefined : (piMaeNome.trim() || undefined),
      paisTexto: isExterno && piPaisTexto.trim() ? piPaisTexto.trim() : undefined,
      pesoMedioInicial: piPesoInicial.trim() || undefined,
      status: 'Crescimento',
      raca: piRaca.trim() || undefined,
      observacao: piObs.trim() || undefined,
      pesagens: initialPesagens,
    });

    resetPintinhos();
    showToast?.('Lote de pintinhos criado com sucesso!', 'success');
  };

  // Detecta aves já cadastradas na Baia informada
  const eggStatusCls = (st: string) => {
    switch (st) {
      case 'Ativo': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Pausa': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  const meatStatusCls = (st: string) => {
    switch (st) {
      case 'Terminação': return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'Abatido': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  // Lotes de engorda que completaram 15 dias sem pesagem
  const lotsNeedingWeighing = useMemo(() => {
    return (filterEngorda || []).filter(l => {
      if (l.status === 'Abatido') return false;
      const pesagens = [...(l.pesagens || [])].sort((a, b) => a.data.localeCompare(b.data));
      const lastPesagem = pesagens.length > 0 ? pesagens[pesagens.length - 1] : null;
      const daysSince = lastPesagem ? calcDays(lastPesagem.data) : calcDays(l.dataInicio || '');
      return daysSince >= 15;
    });
  }, [filterEngorda]);

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4 max-w-7xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Gestão de Lotes
          </h1>
          <p className="text-xs text-theme-text-muted">Acompanhe postura, engorda e pintinhos do seu criatório</p>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === 'postura' && (
            <button onClick={() => setShowPostura(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Novo Lote de Postura
            </button>
          )}
          {activeTab === 'engorda' && (
            <button onClick={() => setShowEngorda(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Novo Lote de Engorda
            </button>
          )}
          {activeTab === 'pintinhos' && (
            <button onClick={() => setShowPintinhos(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Novo Lote de Pintinhos
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-theme-surface p-1 rounded-2xl border border-theme-border/60 overflow-x-auto no-scrollbar">
        {[
          { id: 'postura', label: 'Lotes de Postura', icon: Egg, count: eggLots.length },
          { id: 'engorda', label: 'Engorda / Abate', icon: Beef, count: filterEngorda.length },
          { id: 'pintinhos', label: 'Pintinhos', icon: Baby, count: filterPintinhos.length },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-theme-primary text-black shadow-md'
                : 'text-theme-text-muted hover:text-white'
            }`}
          >
            <t.icon size={15} />
            <span>{t.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === t.id ? 'bg-black/20 text-black font-black' : 'bg-theme-base text-theme-text-muted'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Sub-filtro de Status dos Lotes (Ativos / Encerrados / Todos) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider shrink-0">Filtrar:</span>
        {(['ativos', 'encerrados', 'todos'] as const).map(st => (
          <button
            key={st}
            type="button"
            onClick={() => setLotStatusFilter(st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
              lotStatusFilter === st
                ? 'bg-theme-primary text-black font-black shadow-md'
                : 'bg-theme-surface hover:bg-theme-surface-hover text-theme-text-muted hover:text-white border border-theme-border/50'
            }`}
          >
            {st === 'ativos' ? '🟢 Em Produção / Ativos' : st === 'encerrados' ? '📦 Histórico / Encerrados' : '📋 Todos os Lotes'}
          </button>
        ))}
      </div>

      {/* ── BANNER DE ALERTA: PESAGEM PERIÓDICA (15 DIAS) ── */}
      {lotsNeedingWeighing.length > 0 && (
        <div className="w-full bg-amber-500/10 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-950/20 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-black font-black shrink-0 animate-pulse">
              <Scale size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-white">
                Dia de Pesar o Lote ({lotsNeedingWeighing.length} {lotsNeedingWeighing.length === 1 ? 'lote aguardando' : 'lotes aguardando'})
              </p>
              <p className="text-[11px] text-amber-200/90 mt-0.5">
                {lotsNeedingWeighing.map(l => `Baia ${l.baia}`).join(', ')}: Completou 15 dias! Pese ao menos 5 aves para calibrar o ganho e a previsão de abate.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {lotsNeedingWeighing.slice(0, 2).map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => openWeighModal(l)}
                className="flex-1 sm:flex-none px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all shadow cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
              >
                <Scale size={13} /> Pesar Baia {l.baia}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: POSTURA */}
      {activeTab === 'postura' && (
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Lotes Ativos', value: eggLots.filter(l => l.status !== 'Encerrado').length },
              { 
                label: 'Total de Fêmeas em Postura', 
                value: eggLots.filter(l => l.status !== 'Encerrado').reduce((a, l) => {
                  return a + Math.max(l.qtdFemeas || 0, l.femeasIds?.length || 0);
                }, 0) 
              },
            ].map(s => (
              <div key={s.label} className="premium-card p-4">
                <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <h3 className="text-2xl font-black text-white">{s.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {displayedEggLots.map(lote => {
              const dias = calcDays(lote.dataInicio);
              const totalF = Math.max(lote.qtdFemeas || 0, lote.femeasIds?.length || 0);
              const cadastradasF = lote.femeasIds?.length || 0;
              const avulsasF = Math.max(0, totalF - cadastradasF);
              return (
                <div key={lote.id} className="premium-card p-5 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Egg size={100} /></div>
                  {/* Cabeçalho */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-theme-primary uppercase mb-0.5 block">Baia {lote.baia}{lote.raca ? ` · ${lote.raca}` : ''}</span>
                      <h3 className="font-black text-lg text-white">Lote de Postura</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShareLotPdf(lote, 'postura')}
                        disabled={generatingLotId === lote.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Gerar e compartilhar Ficha Técnica do lote"
                      >
                        {generatingLotId === lote.id ? <Loader2 size={13} className="animate-spin text-amber-400" /> : <Send size={13} />}
                        <span className="hidden sm:inline">Ficha</span>
                      </button>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${eggStatusCls(lote.status)}`}>{lote.status}</span>
                    </div>
                  </div>
                  {/* Métricas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <Timer size={11} /> Idade
                      </p>
                      <p className="text-base font-black text-white">{dias} dias</p>
                    </div>

                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <Users size={11} className="text-theme-primary" /> Fêmeas
                      </p>
                      <p className="text-base font-black text-white">{totalF}</p>
                      <p className="text-[9px] text-theme-text-muted truncate">{cadastradasF} cad. + {avulsasF} av.</p>
                    </div>

                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <Egg size={11} className="text-amber-400" /> Meta Diária
                      </p>
                      {lote.expectativaDiaria && lote.expectativaDiaria > 0 ? (
                        <>
                          <p className="text-base font-black text-white truncate">{lote.expectativaDiaria} <span className="text-xs font-normal text-theme-text-muted">ovos</span></p>
                          <p className="text-[9px] text-theme-text-muted">Produção/dia</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-theme-text-muted">Não definida</p>
                          <p className="text-[9px] text-theme-text-muted">Informe nas configs</p>
                        </>
                      )}
                    </div>

                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <Activity size={11} className="text-emerald-400" /> Status
                      </p>
                      <p className="text-base font-black text-emerald-400 truncate">{lote.status}</p>
                      <p className="text-[9px] text-theme-text-muted">Postura ativa</p>
                    </div>
                  </div>
                  {/* Aves no lote */}
                  <div className="pt-3 border-t border-theme-border/50 mb-4 flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase">Aves no Lote ({totalF})</p>
                      <p className="text-[10px] text-theme-text-muted">Início: {fmtDate(lote.dataInicio)}</p>
                    </div>
                    {cadastradasF > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                          {lote.femeasIds.map(id => {
                            const b = birds.find(x => x.id === id);
                            return b ? (
                              <span key={id} className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-white border border-theme-border flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                {b.anilha}{b.nome ? ` (${b.nome})` : ''}
                              </span>
                            ) : null;
                          })}
                          {avulsasF > 0 && (
                            <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-md font-bold">
                              +{avulsasF} não cadastradas
                            </span>
                          )}
                        </div>
                        {avulsasF > 0 && (
                          <p className="text-[10px] text-theme-text-muted">
                            Total: <strong className="text-white">{totalF} aves</strong> — <strong className="text-white">{cadastradasF}</strong> cadastradas + <strong className="text-amber-400">{avulsasF}</strong> avulsas
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-theme-text-muted italic">
                        {totalF > 0 ? `${totalF} fêmeas registradas (aves avulsas, não cadastradas individualmente)` : 'Nenhuma ave vinculada.'}
                      </p>
                    )}
                    {lote.observacao && <p className="text-[10px] text-theme-text-muted mt-2 italic">Obs: {lote.observacao}</p>}
                  </div>

                  {/* Botão do Lote */}
                  <div className="pt-3 border-t border-theme-border/50">
                    <button
                      type="button"
                      onClick={() => navigate('/eggs', { state: { scrollToLotId: lote.id } })}
                      className="w-full py-2.5 px-3.5 bg-theme-primary/10 hover:bg-theme-primary/20 border border-theme-primary/40 hover:border-theme-primary/70 rounded-xl text-xs font-bold text-theme-primary flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Egg size={15} className="shrink-0" />
                      <span>Acessar Aba Ovos do Lote</span>
                    </button>
                  </div>
                </div>
              );
            })}
            {displayedEggLots.length === 0 && (
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Egg size={40} className="mx-auto mb-3 opacity-50 text-theme-primary" />
                <p className="font-bold text-white mb-1">
                  {eggLots.length === 0 
                    ? 'Nenhum lote de postura cadastrado' 
                    : `Nenhum lote de postura com status "${lotStatusFilter === 'ativos' ? 'Em Produção / Ativo' : lotStatusFilter === 'encerrados' ? 'Encerrado' : 'selecionado'}"`}
                </p>
                <p className="text-sm">
                  {eggLots.length === 0 
                    ? 'Cadastre um lote para gerenciar galinhas em postura e meta de ovos.'
                    : 'Alterne o filtro acima para ver outros lotes.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ENGORDA */}
      {activeTab === 'engorda' && (
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Lotes Ativos', value: filterEngorda.filter(l => l.status !== 'Abatido').length },
              { 
                label: 'Aves em Engorda', 
                value: filterEngorda.reduce((a, l) => a + (l.status !== 'Abatido' ? Math.max(l.qtdAves || 0, l.avesIds?.length || 0) : 0), 0) 
              },
            ].map(s => (
              <div key={s.label} className="premium-card p-4">
                <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <h3 className="text-2xl font-black text-white">{s.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {displayedEngorda.map(lote => {
              const dias = calcDays(lote.dataInicio);
              const totalA = Math.max(lote.qtdAves || 0, lote.avesIds?.length || 0);
              const cadastradasA = lote.avesIds?.length || 0;
              const avulsasA = Math.max(0, totalA - cadastradasA);

              // ── INTELIGÊNCIA DE PESO & ALIMENTAÇÃO (DADOS REAIS, SEM INVENÇÃO) ──
              const pesoInicialG = parseWeightG(lote.pesoMedioInicial);
              const pesoMetaG = parseWeightG(lote.pesoMeta);
              const ganhoConfigurado = (lote.ganhoGramasDia && lote.ganhoGramasDia > 0) ? lote.ganhoGramasDia : 0;
              const pesagens = [...(lote.pesagens || [])].sort((a, b) => a.data.localeCompare(b.data));

              let pesoAtualEstimadoG: number | null = null;
              let pesoOrigemLabel = '';
              let diasDesdeUltimaPesagem = dias;
              let ganhoRealObservado: number | null = null;
              const temPesagemManual = pesagens.length > 0;
              let ultimaPesagem = temPesagemManual ? pesagens[pesagens.length - 1] : null;

              if (temPesagemManual && ultimaPesagem) {
                diasDesdeUltimaPesagem = calcDays(ultimaPesagem.data);
                if (pesagens.length >= 2) {
                  const penultima = pesagens[pesagens.length - 2];
                  const diasDiff = calcDays(penultima.data) - diasDesdeUltimaPesagem;
                  if (diasDiff > 0) {
                    ganhoRealObservado = Math.round((ultimaPesagem.pesoMedioG - penultima.pesoMedioG) / diasDiff);
                  }
                }
                const ganhoBase = ganhoConfigurado > 0 ? ganhoConfigurado : (ganhoRealObservado && ganhoRealObservado > 0 ? ganhoRealObservado : 0);
                if (ganhoBase > 0) {
                  pesoAtualEstimadoG = ultimaPesagem.pesoMedioG + (ganhoBase * diasDesdeUltimaPesagem);
                  pesoOrigemLabel = ganhoRealObservado && ganhoConfigurado <= 0 ? 'Pesagem + ganho real' : 'Pesagem + ganho raça';
                } else {
                  pesoAtualEstimadoG = ultimaPesagem.pesoMedioG;
                  pesoOrigemLabel = 'Última pesagem real';
                }
              } else if (pesoInicialG > 0) {
                if (ganhoConfigurado > 0) {
                  pesoAtualEstimadoG = pesoInicialG + (ganhoConfigurado * dias);
                  pesoOrigemLabel = 'Projetado (ganho diário)';
                } else {
                  pesoAtualEstimadoG = pesoInicialG;
                  pesoOrigemLabel = 'Peso inicial (sem taxa diária)';
                }
              } else {
                pesoAtualEstimadoG = null;
                pesoOrigemLabel = 'Não informado';
              }

              // Previsão de Abate (em dias) — Somente com dados reais suficientes!
              const ganhoReferencia = ganhoConfigurado > 0 ? ganhoConfigurado : (ganhoRealObservado !== null && ganhoRealObservado > 0 ? ganhoRealObservado : 0);
              const temBasePeso = pesoAtualEstimadoG !== null && pesoAtualEstimadoG > 0;
              const temMeta = pesoMetaG > 0;
              const temTaxa = ganhoReferencia > 0;
              const temDadosAbate = temMeta && temBasePeso && temTaxa;

              // Identificar com precisão o que falta para o cálculo
              const dadosFaltantesAbate: string[] = [];
              if (!temMeta) dadosFaltantesAbate.push('Meta de Abate (peso alvo final)');
              if (!temBasePeso) dadosFaltantesAbate.push('Peso Inicial (ou registro de pesagem)');
              if (!temTaxa) dadosFaltantesAbate.push('Taxa de Ganho Diário g/dia (ou 2 pesagens para medir o ganho real)');

              let diasRestantesAbate = 0;
              let dataPrevisaoAbate = '';
              let progressoAbatePct = 0;
              let metaAtingida = false;
              let gramasFaltando = 0;

              if (temDadosAbate && pesoAtualEstimadoG !== null) {
                gramasFaltando = Math.max(0, pesoMetaG - pesoAtualEstimadoG);
                if (gramasFaltando <= 0) {
                  metaAtingida = true;
                  progressoAbatePct = 100;
                } else {
                  diasRestantesAbate = Math.ceil(gramasFaltando / ganhoReferencia);
                  dataPrevisaoAbate = addDaysToDate(todayISO(), diasRestantesAbate);
                  const ganhoNecessarioTotal = Math.max(1, pesoMetaG - pesoInicialG);
                  const ganhoObtido = Math.max(0, pesoAtualEstimadoG - pesoInicialG);
                  progressoAbatePct = Math.min(100, Math.round((ganhoObtido / ganhoNecessarioTotal) * 100));
                }
              }

              // Consumo de Ração Estimado
              const consumoAveG = lote.consumoRacaoAve || 0;
              const temRacao = consumoAveG > 0 && totalA > 0;
              const racaoDiariaKg = temRacao ? ((consumoAveG * totalA) / 1000) : 0;
              const racaoAcumuladaKg = temRacao ? ((consumoAveG * totalA * dias) / 1000) : 0;

              const diasRefPesagem = temPesagemManual && ultimaPesagem ? calcDays(ultimaPesagem.data) : dias;
              const precisaPesar = diasRefPesagem >= 15;
              const diasParaPesar = Math.max(0, 15 - diasRefPesagem);

              return (
                <div key={lote.id} className="premium-card p-5 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col space-y-4">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Beef size={110} /></div>
                  
                  {/* Cabeçalho */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-theme-primary uppercase mb-0.5 block">
                        Baia {lote.baia}{lote.raca ? ` · ${lote.raca}` : ''}
                      </span>
                      <h3 className="font-black text-lg text-white">Lote de Engorda</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShareLotPdf(lote, 'engorda')}
                        disabled={generatingLotId === lote.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Gerar e compartilhar Ficha Técnica do lote"
                      >
                        {generatingLotId === lote.id ? <Loader2 size={13} className="animate-spin text-amber-400" /> : <Send size={13} />}
                        <span className="hidden sm:inline">Ficha</span>
                      </button>
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-md ${meatStatusCls(lote.status)}`}>
                        {lote.status}
                      </span>
                      <button 
                        onClick={() => setDeleteLotConfirm({
                          id: lote.id,
                          title: `Apagar Lote de Engorda (Baia ${lote.baia})?`,
                          message: 'Deseja realmente apagar este lote de engorda permanentemente? Todas as aferições e previsões vinculadas serão removidas.'
                        })}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-all cursor-pointer" 
                        title="Apagar Lote"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Grid de 4 Métricas Principais */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <Timer size={11} /> Idade
                      </p>
                      <p className="text-base font-black text-white">{(lote.idadeInicialDias || 0) + dias} dias</p>
                      {lote.idadeInicialDias ? (
                        <p className="text-[9px] text-theme-text-muted truncate">
                          {lote.idadeInicialDias}d inic. + {dias}d no lote
                        </p>
                      ) : (
                        <p className="text-[9px] text-theme-text-muted truncate">
                          {dias} dias no lote
                        </p>
                      )}
                    </div>

                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <Scale size={11} className="text-amber-400" /> Peso Hoje
                      </p>
                      <p className="text-base font-black text-white">
                        {pesoAtualEstimadoG !== null && pesoAtualEstimadoG > 0 ? formatWeightG(pesoAtualEstimadoG) : '—'}
                      </p>
                      <p className="text-[9px] text-theme-text-muted truncate">
                        {pesoAtualEstimadoG !== null && pesoAtualEstimadoG > 0 ? pesoOrigemLabel : 'Informe peso inicial/pesar'}
                      </p>
                    </div>

                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <CheckCircle size={11} className="text-emerald-400" /> Meta Abate
                      </p>
                      <p className="text-base font-black text-white truncate">
                        {pesoMetaG > 0 ? formatWeightG(pesoMetaG) : '—'}
                      </p>
                      <p className="text-[9px] text-theme-text-muted">{pesoMetaG > 0 ? 'Alvo final' : 'Não definida'}</p>
                    </div>

                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <Users size={11} /> Aves
                      </p>
                      <p className="text-base font-black text-white">{totalA}</p>
                      <p className="text-[9px] text-theme-text-muted">{cadastradasA} cad. + {avulsasA} av.</p>
                    </div>
                  </div>

                  {/* ⏱️ CARD DE PREVISÃO DE ABATE */}
                  {metaAtingida && pesoAtualEstimadoG !== null ? (
                    <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                        <CheckCircle size={18} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-emerald-400">Meta de Abate Atingida! 🎉</p>
                        <p className="text-[11px] text-theme-text-muted">
                          Peso médio estimado em <strong>{formatWeightG(pesoAtualEstimadoG)}</strong>. Lote pronto para abate.
                        </p>
                      </div>
                    </div>
                  ) : temDadosAbate && pesoAtualEstimadoG !== null ? (
                    <div className="p-3.5 bg-gradient-to-br from-amber-500/10 via-theme-base/60 to-orange-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white flex items-center gap-1.5">
                          <Timer size={14} className="text-amber-400" />
                          Previsão de Abate:
                        </span>
                        <span className="text-xs font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/30">
                          em ~{diasRestantesAbate} dias ({dataPrevisaoAbate})
                        </span>
                      </div>

                      {/* Barra de Progresso do Ganho */}
                      <div className="space-y-1">
                        <div className="w-full bg-theme-base rounded-full h-2 overflow-hidden border border-theme-border/60">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500 rounded-full"
                            style={{ width: `${progressoAbatePct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-theme-text-muted">
                          <span>Inicial: {formatWeightG(pesoInicialG)}</span>
                          <span className="font-bold text-white">{progressoAbatePct}% concluído</span>
                          <span>Meta: {formatWeightG(pesoMetaG)}</span>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[10px] text-theme-text-muted border-t border-theme-border/30">
                        <span>Ganho diário: <strong className="text-emerald-400">+{ganhoReferencia}g/dia</strong></span>
                        <span>Faltam: <strong className="text-amber-300">~{formatWeightG(gramasFaltando)}</strong></span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-theme-surface/50 border border-theme-border/80 rounded-2xl space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-black">
                        <AlertCircle size={15} className="shrink-0" />
                        <span>Previsão de Abate Indisponível</span>
                      </div>
                      <p className="text-[11px] text-theme-text-muted leading-relaxed">
                        Para o sistema calcular a previsão real até o abate, é necessário informar:
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {dadosFaltantesAbate.map(item => (
                          <span key={item} className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-lg font-medium">
                            • {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 🌾 CONSUMO ESTIMADO DE RAÇÃO */}
                  {temRacao ? (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1 mb-0.5">
                          🌾 Consumo Estimado de Ração
                        </p>
                        <p className="text-white font-bold">
                          {racaoDiariaKg.toFixed(1).replace('.', ',')} kg/dia <span className="text-theme-text-muted font-normal">(~{consumoAveG}g por ave/dia)</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-theme-text-muted block">Total consumido</span>
                        <span className="font-black text-white text-xs bg-theme-base/80 px-2 py-0.5 rounded-lg border border-theme-border/60">
                          ~{racaoAcumuladaKg.toFixed(1).replace('.', ',')} kg
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-theme-base/30 border border-theme-border/50 rounded-xl text-[10px] text-theme-text-muted flex items-center gap-2">
                      <Info size={13} className="text-blue-400 shrink-0" />
                      <span>Consumo de ração não estimado. Informe o <strong>consumo da ração (g/ave/dia)</strong> no lote para ver a projeção.</span>
                    </div>
                  )}

                  {/* ⚖️ PESAGEM PERIÓDICA (A CADA 15 DIAS) */}
                  {precisaPesar ? (
                    <div className="pt-2 border-t border-theme-border/50">
                      <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2">
                          <Scale size={16} className="text-amber-400 shrink-0" />
                          <div>
                            <p className="text-xs font-black text-white">Dia de Pesar o Lote!</p>
                            <p className="text-[11px] text-amber-200/90">Pese pelo menos 5 aves para calibrar a previsão.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openWeighModal(lote)}
                          className="py-2 px-3.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-black text-xs rounded-xl transition-all shadow cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5"
                        >
                          <Scale size={13} /> Registrar Pesagem
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-theme-border/50 text-[11px] text-theme-text-muted">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Scale size={13} className="text-theme-primary shrink-0" />
                        Próxima pesagem em <strong className="text-white">{diasParaPesar} {diasParaPesar === 1 ? 'dia' : 'dias'}</strong>
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {ultimaPesagem && (
                          <span className="text-[10px]">
                            Última: <strong className="text-white">{formatWeightG(ultimaPesagem.pesoMedioG)}</strong> ({fmtDate(ultimaPesagem.data)})
                          </span>
                        )}
                        {pesagens.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openWeighModal(lote)}
                            className="text-[10px] text-theme-primary hover:underline font-bold cursor-pointer"
                          >
                            Histórico ({pesagens.length})
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Aves no Lote */}
                  <div className="pt-2 border-t border-theme-border/50">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase">
                        Aves no Lote ({totalA})
                      </p>
                      <p className="text-[10px] text-theme-text-muted">Início: {fmtDate(lote.dataInicio)}</p>
                    </div>
                    {cadastradasA > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                          {lote.avesIds.map(id => {
                            const b = birds.find(x => x.id === id);
                            return b ? (
                              <span key={id} className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-white border border-theme-border flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                {b.anilha}{b.nome ? ` (${b.nome})` : ''}
                              </span>
                            ) : null;
                          })}
                          {avulsasA > 0 && (
                            <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-md font-bold">
                              +{avulsasA} não cadastradas
                            </span>
                          )}
                        </div>
                        {avulsasA > 0 && (
                          <p className="text-[10px] text-theme-text-muted">
                            Total: <strong className="text-white">{totalA} aves</strong> (<strong className="text-white">{cadastradasA}</strong> cadastradas + <strong className="text-amber-400">{avulsasA}</strong> avulsas).
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-theme-text-muted italic">
                        {totalA > 0 ? `${totalA} aves registradas (aves avulsas / não cadastradas no plantel)` : 'Nenhuma ave vinculada.'}
                      </p>
                    )}
                    {lote.observacao && <p className="text-[10px] text-theme-text-muted mt-2 italic">Obs: {lote.observacao}</p>}
                  </div>

                  {/* Movimentações e Status */}
                  <div className="pt-2 border-t border-theme-border/50">
                    <button
                      type="button"
                      onClick={() => setMovementModal({ isOpen: true, lote, loteType: 'engorda' })}
                      className="w-full py-2.5 px-3.5 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border/80 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-all group shadow-sm cursor-pointer mb-3"
                    >
                      <span className="flex items-center gap-2 text-theme-primary font-bold">
                        <Activity size={15} className="shrink-0" />
                        <span>Movimentações</span>
                      </span>
                      <span className="bg-theme-base px-2 py-0.5 rounded-lg border border-theme-border/60 text-[11px] font-bold text-theme-text-muted group-hover:text-white shrink-0">
                        {lote.movimentacoes?.length || 0} {lote.movimentacoes?.length === 1 ? 'registro' : 'registros'}
                      </span>
                    </button>
                    <p className={labelCls + " mb-2"}>Alterar Status</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Crescimento', 'Terminação', 'Abatido'] as const).map(st => (
                        <button key={st} onClick={() => editMeatLot(lote.id, { status: st })}
                          className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${lote.status === st ? 'bg-theme-primary text-black border-theme-primary' : 'bg-theme-surface/50 border-theme-border/50 text-theme-text-muted hover:text-white hover:border-theme-border'}`}>
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {displayedEngorda.length === 0 && (
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Beef size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-bold text-white mb-1">
                  {filterEngorda.length === 0 
                    ? 'Nenhum lote de engorda cadastrado' 
                    : `Nenhum lote de engorda com status "${lotStatusFilter === 'ativos' ? 'Ativo' : lotStatusFilter === 'encerrados' ? 'Abatido' : 'selecionado'}"`}
                </p>
                <p className="text-sm">
                  {filterEngorda.length === 0 
                    ? 'Cadastre um lote para gerenciar crescimento e abate.' 
                    : 'Alterne o filtro acima para ver outros lotes.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PINTINHOS */}
      {activeTab === 'pintinhos' && (
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Lotes Ativos', value: filterPintinhos.filter(l => l.status !== 'Abatido').length },
              { 
                label: 'Total de Pintinhos', 
                value: filterPintinhos.filter(l => l.status !== 'Abatido').reduce((a, l) => a + Math.max(l.qtdAves || 0, l.avesIds?.length || 0), 0) 
              },
            ].map(s => (
              <div key={s.label} className="premium-card p-4">
                <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <h3 className="text-2xl font-black text-white">{s.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {displayedPintinhos.map(lote => {
              const dias = calcDays(lote.dataNascimento || lote.dataInicio);
              const totalA = Math.max(lote.qtdAves || 0, lote.avesIds?.length || 0);
              const pesagens = lote.pesagens || [];
              const ultimaPesagem = pesagens.length > 0 ? [...pesagens].sort((a, b) => b.data.localeCompare(a.data))[0] : null;
              return (
                <div key={lote.id} className="premium-card p-5 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Baby size={100} className="text-yellow-400" /></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-theme-primary uppercase mb-0.5 block">Baia {lote.baia}{lote.raca ? ` · ${lote.raca}` : ''}</span>
                      <h3 className="font-black text-lg text-white">Lote de Pintinhos</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleShareLotPdf(lote, 'pintinhos')}
                        disabled={generatingLotId === lote.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold text-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        title="Gerar e compartilhar Ficha Técnica do lote"
                      >
                        {generatingLotId === lote.id ? <Loader2 size={13} className="animate-spin text-amber-400" /> : <Send size={13} />}
                        <span className="hidden sm:inline">Ficha</span>
                      </button>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${meatStatusCls(lote.status)}`}>{lote.status}</span>
                      <button 
                        onClick={() => setDeleteLotConfirm({
                          id: lote.id,
                          title: `Apagar Lote de Pintinhos (Baia ${lote.baia})?`,
                          message: 'Deseja realmente apagar este lote de pintinhos permanentemente?'
                        })}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-all cursor-pointer" 
                        title="Apagar Lote"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <Timer size={11} /> Idade
                      </p>
                      <p className="text-base font-black text-white">{dias} dias</p>
                      <p className="text-[9px] text-theme-text-muted">Nasc: {fmtDate(lote.dataNascimento || lote.dataInicio)}</p>
                    </div>

                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <Scale size={11} className="text-amber-400" /> {ultimaPesagem ? 'Peso Médio' : 'Peso Inicial'}
                      </p>
                      <p className="text-base font-black text-white truncate">
                        {ultimaPesagem ? formatWeightG(ultimaPesagem.pesoMedioG) : (lote.pesoMedioInicial || '—')}
                      </p>
                      <p className="text-[9px] text-theme-text-muted truncate">
                        {ultimaPesagem ? `Aferido (${fmtDate(ultimaPesagem.data)})` : 'Gramas/unid.'}
                      </p>
                    </div>

                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <Activity size={11} className="text-yellow-400" /> Pintinhos
                      </p>
                      <p className="text-base font-black text-white">{totalA}</p>
                      <p className="text-[9px] text-theme-text-muted truncate">{lote.origem === 'Externo' ? 'Origem externa' : 'Do criatório'}</p>
                    </div>

                    <div className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1">
                        <Baby size={11} className="text-emerald-400" /> Fase
                      </p>
                      <p className="text-base font-black text-emerald-400 truncate">Inicial</p>
                      <p className="text-[9px] text-theme-text-muted">Até 30 dias</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-theme-border/50 mt-auto mb-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase">
                        Origem & Genealogia
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        lote.origem === 'Externo' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {lote.origem === 'Externo' ? 'De fora (Externo)' : 'Do meu criatório'}
                      </span>
                    </div>

                    {/* Pais do criatório */}
                    {(() => {
                      const pai = birds.find(b => b.id === lote.paiId);
                      const mae = birds.find(b => b.id === lote.maeId);
                      if (pai || mae) {
                        return (
                          <div className="bg-theme-base/60 p-2.5 rounded-xl border border-theme-border/50 text-[11px] space-y-1">
                            <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">Pais do Plantel:</span>
                            <div className="flex flex-wrap gap-2 text-white">
                              {pai && <span>🐓 Pai: <strong>{pai.anilha}{pai.nome ? ` (${pai.nome})` : ''}</strong></span>}
                              {mae && <span>🐔 Mãe: <strong>{mae.anilha}{mae.nome ? ` (${mae.nome})` : ''}</strong></span>}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Pais externos */}
                    {(lote.paisTexto || lote.paiNome || lote.maeNome) && (
                      <div className="bg-theme-base/60 p-2.5 rounded-xl border border-theme-border/50 text-[11px] space-y-1">
                        <span className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider block">Pais Externos:</span>
                        <p className="text-white font-medium">
                          {lote.paisTexto || [lote.paiNome, lote.maeNome].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    )}

                    {lote.observacao && <p className="text-[10px] text-theme-text-muted mt-1 italic">Obs: {lote.observacao}</p>}
                  </div>

                  {/* ⚖️ REGISTRO E ACOMPANHAMENTO DE PESAGENS */}
                  <div className="pt-3 border-t border-theme-border/50 space-y-2.5 mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Scale size={14} className="text-theme-primary" />
                        <p className="text-xs font-black text-white">Pesagens do Lote</p>
                        <span className="text-[10px] text-theme-text-muted bg-theme-base px-2 py-0.5 rounded-md border border-theme-border/60">
                          {pesagens.length} {pesagens.length === 1 ? 'pesagem' : 'pesagens'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openWeighModal(lote)}
                        className="py-1.5 px-3 bg-theme-primary hover:bg-theme-primary-hover text-black font-black text-xs rounded-xl transition-all shadow cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Scale size={13} /> Registrar Pesagem
                      </button>
                    </div>

                    {/* Dica de amostragem de pelo menos 5 pintinhos */}
                    <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-amber-200">
                        💡 Pese <strong>pelo menos 5 pintinhos</strong> para fazer a média e estimar o peso geral do lote.
                      </span>
                      {ultimaPesagem && (
                        <span className="text-[10px] font-bold text-white shrink-0 ml-2">
                          Média: <strong className="text-theme-primary">{formatWeightG(ultimaPesagem.pesoMedioG)}</strong>
                        </span>
                      )}
                    </div>

                    {/* Registro das pesagens (histórico) */}
                    {pesagens.length > 0 ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {[...pesagens]
                          .sort((a, b) => b.data.localeCompare(a.data))
                          .map((p, idx, arr) => {
                            const nextOldest = arr[idx + 1];
                            const diff = nextOldest ? p.pesoMedioG - nextOldest.pesoMedioG : null;
                            return (
                              <div key={p.id} className="p-2 bg-theme-base/80 border border-theme-border/60 rounded-xl flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-[11px]">{fmtDate(p.data)}</span>
                                  <span className="font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/20 text-[11px]">
                                    {formatWeightG(p.pesoMedioG)}
                                  </span>
                                  {diff !== null && (
                                    <span className={`text-[10px] font-bold ${diff >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {diff >= 0 ? `+${formatWeightG(diff)}` : `-${formatWeightG(Math.abs(diff))}`}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-theme-text-muted">
                                    {p.avesPesadas ? `${p.avesPesadas} aves pesadas` : '5 aves pesadas'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => openWeighModal(lote)}
                                    className="text-[10px] text-theme-primary hover:underline font-bold cursor-pointer"
                                  >
                                    Ver histórico
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="p-2.5 bg-theme-base/40 rounded-xl border border-dashed border-theme-border/60 text-center text-[11px] text-theme-text-muted">
                        Nenhuma pesagem registrada. Clique em "Registrar Pesagem" e pese 5 pintinhos para calibrar a média do lote.
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-theme-border/50 space-y-2">
                    <button
                      type="button"
                      onClick={() => setMovementModal({ isOpen: true, lote, loteType: 'pintinhos' })}
                      className="w-full py-2.5 px-3.5 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border/80 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-all group shadow-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2 text-theme-primary font-bold">
                        <Activity size={15} className="shrink-0" />
                        <span>Movimentações</span>
                      </span>
                      <span className="bg-theme-base px-2 py-0.5 rounded-lg border border-theme-border/60 text-[11px] font-bold text-theme-text-muted group-hover:text-white shrink-0">
                        {lote.movimentacoes?.length || 0} {lote.movimentacoes?.length === 1 ? 'registro' : 'registros'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openTransferModal(lote)}
                      className="w-full py-2.5 px-3 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Beef size={15} className="text-orange-400" /> Transferir para Engorda / Abate
                    </button>
                  </div>
                </div>
              );
            })}
            {displayedPintinhos.length === 0 && (
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Baby size={40} className="mx-auto mb-3 opacity-50 text-yellow-400" />
                <p className="font-bold text-white mb-1">
                  {filterPintinhos.length === 0 
                    ? 'Nenhum lote de pintinhos cadastrado' 
                    : `Nenhum lote de pintinhos com status "${lotStatusFilter === 'ativos' ? 'Ativo' : lotStatusFilter === 'encerrados' ? 'Encerrado / Transferido' : 'selecionado'}"`}
                </p>
                <p className="text-sm">
                  {filterPintinhos.length === 0 
                    ? 'Cadastre um lote para gerenciar o nascimento e primeiros dias dos pintinhos.' 
                    : 'Alterne o filtro acima para ver outros lotes.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL POSTURA ── */}
      {showPostura && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-hidden animate-fade-in" 
          onClick={resetPostura}
          onTouchMove={e => {
            if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
          }}
        >
          <div 
            className="bg-theme-surface border border-theme-border/80 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden animate-scale-up" 
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-theme-border mx-auto mt-3 mb-1 shrink-0" />
            <div className="px-5 pt-3 pb-4 border-b border-theme-border flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg text-white flex items-center gap-2"><Egg className="text-theme-primary" size={20} />Novo Lote de Postura</h3>
              <button type="button" onClick={resetPostura} className="text-theme-text-muted hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePosturaSubmit} className="flex flex-col overflow-hidden flex-1 min-h-0 max-w-full">
              <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0 modal-scrollable-content overscroll-contain touch-pan-y">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Baia / Identificação *</SectionLabel>
                    <input required type="text" value={pBaia} onChange={e => setPBaia(e.target.value)} placeholder="Ex: Baia 04" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Raça (opcional)</SectionLabel>
                    <div className="relative">
                      <select value={pRaca} onChange={e => setPRaca(e.target.value)} className={inputCls + " appearance-none pr-8"}>
                        <option value="">-- Selecionar --</option>
                        {breeds.map(br => <option key={br.id} value={br.nome}>{br.nome}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* 📍 GESTÃO DE FÊMEAS E MACHOS DETECTADOS NA MESMA BAIA */}
                <BaiaBirdsManagementCard
                  baia={pBaia}
                  birds={birds}
                  selectedBirdIds={pFemeas}
                  onIncludeBirds={ids => setPFemeas(prev => Array.from(new Set([...prev, ...ids])))}
                  editBird={editBird}
                  showToast={showToast}
                />

                <div className="space-y-1">
                  <SectionLabel>Data de Início</SectionLabel>
                  <input type="date" required value={pDataInicio} onChange={e => setPDataInicio(e.target.value)} className={inputCls} />
                </div>

                {/* FÊMEAS NO LOTE (PRESERVA SELEÇÃO E QUANTIDADE ADICIONAL) */}
                <div className="space-y-2">
                  <SectionLabel>Fêmeas no Lote</SectionLabel>
                  <ModeToggle mode={pMode} onChange={m => setPMode(m)} label1="Selecionar do Criatório" label2="Aves Adicionais / Sem Anilha" />

                  {pMode === 'select' ? (
                    <BirdPicker birds={activeFemales} selected={pFemeas} onToggle={handleFemaleToggle} onSelectAll={handleFemaleSelectAll} search={pSearch} onSearch={setPSearch} emptyMsg="Nenhuma fêmea disponível no criatório." />
                  ) : (
                    <div className="space-y-1">
                      <SectionLabel>Quantidade Adicional de Fêmeas (Sem anilha / Não cadastradas)</SectionLabel>
                      <input type="number" min="0" inputMode="numeric" placeholder="Ex: 10" value={pQtd}
                        onKeyDown={onlyNumericKeyDown}
                        onChange={e => {
                          const v = sanitizeNumeric(e.target.value);
                          setPQtd(v);
                        }}
                        className={inputCls + " text-2xl font-black text-center py-3"} />
                    </div>
                  )}

                  {/* CÁLCULO TOTAL DE AVES COMBINADAS */}
                  <div className="bg-theme-base/80 border border-theme-border/60 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-theme-text-muted">Total combinado de fêmeas:</span>
                    <span className="font-black text-white text-sm bg-theme-primary/10 border border-theme-primary/30 px-2.5 py-0.5 rounded-lg text-theme-primary">
                      {pFemeas.length} selecionadas + {parseInt(pQtd) || 0} adicionais = {pFemeas.length + (parseInt(pQtd) || 0)} aves
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <SectionLabel>Expectativa de Ovos por Dia (Opcional)</SectionLabel>
                  <div className="relative">
                    <input type="number" min="0" inputMode="numeric" value={pExpectativa} onKeyDown={onlyNumericKeyDown} onChange={e => setPExpectativa(sanitizeNumeric(e.target.value))} placeholder="Ex: 25 (ovos/dia)" className={inputCls} />
                  </div>
                  <p className="text-[10px] text-theme-text-muted flex items-center gap-1">
                    <Info size={10} />
                    Necessário para calcular a taxa de eficiência de postura nos relatórios.
                  </p>
                </div>

                <div className="space-y-2">
                  <SectionLabel>Preços Padrão para aba Ovos (Opcional)</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelCls}>Preço/Dúzia (R$)</label>
                      <div className="relative">
                        <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400" />
                        <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Ex: 10.00" value={pPreco} onKeyDown={onlyNumericKeyDown} onChange={e => setPPreco(e.target.value.replace(/[^0-9.]/g, ''))} className={inputCls + " pl-8"} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Custo/Ovo (R$)</label>
                      <div className="relative">
                        <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                        <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Ex: 0.40" value={pCusto} onKeyDown={onlyNumericKeyDown} onChange={e => setPCusto(e.target.value.replace(/[^0-9.]/g, ''))} className={inputCls + " pl-8"} />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-theme-text-muted">
                    Se não informados, o faturamento e margens serão calculados a partir dos preços das vendas reais.
                  </p>
                </div>

                <div className="space-y-1">
                  <SectionLabel>Observação (opcional)</SectionLabel>
                  <textarea rows={2} placeholder="Ex: Matrizes baia 04..." value={pObs} onChange={e => setPObs(e.target.value)} className={inputCls + " resize-none"} />
                </div>

              </div>

              <div className="p-4 sm:p-5 border-t border-theme-border flex gap-3 shrink-0 bg-theme-surface/50">
                <button type="button" onClick={resetPostura} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold text-white hover:border-theme-primary transition-all">Cancelar</button>
                <button type="submit" disabled={!pBaia.trim()} className="flex-1 py-3 bg-theme-primary disabled:opacity-50 text-black rounded-xl text-sm font-black transition-all active:scale-95 cursor-pointer">Criar Lote</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL ENGORDA ── */}
      {showEngorda && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-hidden animate-fade-in" 
          onClick={resetEngorda}
          onTouchMove={e => {
            if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
          }}
        >
          <div 
            className="bg-theme-surface border border-theme-border/80 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden animate-scale-up" 
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-theme-border mx-auto mt-3 mb-1 shrink-0" />
            <div className="px-5 pt-3 pb-4 border-b border-theme-border flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg text-white flex items-center gap-2"><Beef className="text-theme-primary" size={20} />Novo Lote de Engorda</h3>
              <button type="button" onClick={resetEngorda} className="text-theme-text-muted hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEngordaSubmit} className="flex flex-col overflow-hidden flex-1 min-h-0 max-w-full">
              <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0 modal-scrollable-content overscroll-contain touch-pan-y">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Baia / Identificação *</SectionLabel>
                    <input required type="text" value={eBaia} onChange={e => setEBaia(e.target.value)} placeholder="Ex: Baia 08" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <SectionLabel>Raça (opcional)</SectionLabel>
                      <button
                        type="button"
                        onClick={() => setShowQuickBreedModal(true)}
                        className="text-[10px] text-theme-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        + Nova Raça
                      </button>
                    </div>
                    <div className="relative">
                      <select
                        value={eRaca}
                        onChange={e => {
                          const val = e.target.value;
                          setERaca(val);
                          const found = breeds.find(b => b.nome === val);
                          if (found) {
                            if (found.ganhoGramasDia) {
                              setEGanhoGramasDia(String(found.ganhoGramasDia));
                            }
                            if (found.pesoMedio && !ePesoMeta) {
                              setEPesoMeta(found.pesoMedio);
                            }
                            if (found.ganhoGramasDia && found.conversaoAlimentar) {
                              setEConsumoRacaoAve(String(Math.round(found.ganhoGramasDia * found.conversaoAlimentar)));
                            }
                          }
                        }}
                        className={inputCls + " appearance-none pr-8"}
                      >
                        <option value="">-- Selecionar --</option>
                        {breeds.map(br => <option key={br.id} value={br.nome}>{br.nome}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                {eRaca ? (() => {
                  const br = breeds.find(b => b.nome === eRaca);
                  if (br?.ganhoGramasDia) {
                    return (
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
                        <Sparkles size={12} className="shrink-0" />
                        <span>Taxa de ganho da raça: ~{br.ganhoGramasDia}g/dia {br.conversaoAlimentar ? `• Conversão: ${br.conversaoAlimentar}` : ''}</span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center justify-between text-[10px] text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20">
                      <span>Raça sem taxa de ganho cadastrada.</span>
                      <button
                        type="button"
                        onClick={() => setShowQuickBreedModal(true)}
                        className="font-bold underline text-amber-300 ml-2 cursor-pointer"
                      >
                        Configurar agora
                      </button>
                    </div>
                  );
                })() : (
                  <p className="text-[10px] text-theme-text-muted italic">
                    💡 Se a raça não for informada ou não tiver taxa de ganho, a previsão de dias até o abate ficará desabilitada por falta de dados.
                  </p>
                )}

                {/* 📍 GESTÃO DE FÊMEAS E MACHOS DETECTADOS NA MESMA BAIA */}
                <BaiaBirdsManagementCard
                  baia={eBaia}
                  birds={birds}
                  selectedBirdIds={eAves}
                  onIncludeBirds={ids => setEAves(prev => Array.from(new Set([...prev, ...ids])))}
                  editBird={editBird}
                  showToast={showToast}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Data de Início *</SectionLabel>
                    <input type="date" required value={eDataInicio} onChange={e => setEDataInicio(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Idade das Aves (em dias) *</SectionLabel>
                    <input
                      type="number"
                      min="0"
                      required
                      inputMode="numeric"
                      placeholder="Ex: 30"
                      value={eIdadeDias}
                      onKeyDown={onlyNumericKeyDown}
                      onChange={e => setEIdadeDias(sanitizeNumeric(e.target.value))}
                      className={inputCls}
                    />
                    <p className="text-[9px] text-theme-text-muted">Idade inicial ao compor o lote.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Peso Médio Inicial</SectionLabel>
                    <input type="text" required placeholder="Ex: 350g ou 1.2kg" value={ePesoInicial} onChange={e => setEPesoInicial(e.target.value)} className={inputCls} />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {[
                        { label: '40g (Pintinho)', val: '40g' },
                        { label: '500g (Jovem)', val: '500g' },
                        { label: '1.2kg (Recria)', val: '1.2kg' }
                      ].map(p => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setEPesoInicial(p.val)}
                          className={`text-[9px] px-1.5 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                            ePesoInicial === p.val
                              ? 'bg-theme-primary/20 border-theme-primary text-theme-primary font-bold'
                              : 'bg-theme-base border-theme-border text-theme-text-muted hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Meta de Abate</SectionLabel>
                    <input type="text" placeholder="Ex: 2.5kg ou 2500g" value={ePesoMeta} onChange={e => setEPesoMeta(e.target.value)} className={inputCls} />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {[
                        { label: '2.5 kg', val: '2.5 kg' },
                        { label: '3.0 kg', val: '3.0 kg' },
                        { label: '3.5 kg', val: '3.5 kg' }
                      ].map(p => (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => setEPesoMeta(p.val)}
                          className={`text-[9px] px-1.5 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                            ePesoMeta === p.val
                              ? 'bg-theme-primary/20 border-theme-primary text-theme-primary font-bold'
                              : 'bg-theme-base border-theme-border text-theme-text-muted hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 🌾 NUTRIÇÃO & GANHO DE PESO (PROTOCOLO DE ELITE) */}
                <div className="bg-theme-base/60 border border-theme-border/70 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white flex items-center gap-1.5">
                      <Sparkles size={14} className="text-theme-primary" />
                      Nutrição & Ganho Estimado (Protocolo de Elite)
                    </span>
                    <span className="text-[10px] font-bold text-theme-primary bg-theme-primary/10 px-2 py-0.5 rounded-full border border-theme-primary/20">
                      Previsão de Abate
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <SectionLabel>Ganho de Peso Médio (g/dia)</SectionLabel>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="Ex: 35 (g/dia)"
                        value={eGanhoGramasDia}
                        onChange={e => setEGanhoGramasDia(sanitizeNumeric(e.target.value))}
                        className={inputCls}
                      />
                      <p className="text-[9px] text-theme-text-muted">Calcula os dias até atingir o peso meta.</p>
                    </div>

                    <div className="space-y-1">
                      <SectionLabel>Consumo Ração (g/ave/dia)</SectionLabel>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        placeholder="Ex: 130 (g/dia)"
                        value={eConsumoRacaoAve}
                        onChange={e => setEConsumoRacaoAve(sanitizeNumeric(e.target.value))}
                        className={inputCls}
                      />
                      <p className="text-[9px] text-theme-text-muted">Estima o gasto de ração diário do lote.</p>
                    </div>
                  </div>

                  {(!eGanhoGramasDia || !ePesoMeta) && (
                    <div className="text-[10px] text-theme-text-muted bg-theme-surface/50 p-2 rounded-xl border border-theme-border/40 flex items-center gap-2">
                      <AlertCircle size={13} className="text-amber-400 shrink-0" />
                      <span>Sem ganho diário ou peso meta, a previsão do dia de abate fica desabilitada por falta de dados (o lote funciona normalmente).</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <SectionLabel>Aves no Lote</SectionLabel>
                  <ModeToggle mode={eMode} onChange={m => setEMode(m)} label1="Selecionar do Criatório" label2="Aves Adicionais / Sem Anilha" />

                  {eMode === 'select' ? (
                    <BirdPicker birds={activeBirds} selected={eAves} onToggle={handleBirdToggle} onSelectAll={handleBirdSelectAll} search={eSearch} onSearch={setESearch} emptyMsg="Nenhuma ave disponível." />
                  ) : (
                    <div className="space-y-1">
                      <SectionLabel>Quantidade Adicional de Aves</SectionLabel>
                      <input type="number" min="0" inputMode="numeric" placeholder="Ex: 50" value={eQtd} onChange={e => setEQtd(sanitizeNumeric(e.target.value))} className={inputCls + " text-2xl font-black text-center py-3"} />
                    </div>
                  )}

                  <div className="bg-theme-base/80 border border-theme-border/60 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-theme-text-muted">Total combinado de engorda:</span>
                    <span className="font-black text-white text-sm bg-theme-primary/10 border border-theme-primary/30 px-2.5 py-0.5 rounded-lg text-theme-primary">
                      {eAves.length} selecionadas + {parseInt(eQtd) || 0} adicionais = {eAves.length + (parseInt(eQtd) || 0)} aves
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <SectionLabel>Observação (opcional)</SectionLabel>
                  <textarea rows={2} placeholder="Ex: Frangos corte..." value={eObs} onChange={e => setEObs(e.target.value)} className={inputCls + " resize-none"} />
                </div>

              </div>
              <div className="p-4 sm:p-5 border-t border-theme-border flex gap-3 shrink-0 bg-theme-surface/50">
                <button type="button" onClick={resetEngorda} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold text-white hover:border-theme-primary transition-all">Cancelar</button>
                <button type="submit" disabled={!eBaia.trim()} className="flex-1 py-3 bg-theme-primary disabled:opacity-50 text-black rounded-xl text-sm font-black transition-all active:scale-95 cursor-pointer">Criar Lote</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL PINTINHOS ── */}
      {showPintinhos && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-hidden animate-fade-in" 
          onClick={resetPintinhos}
          onTouchMove={e => {
            if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
          }}
        >
          <div 
            className="bg-theme-surface border border-theme-border/80 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden animate-scale-up" 
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-theme-border mx-auto mt-3 mb-1 shrink-0" />
            <div className="px-5 pt-3 pb-4 border-b border-theme-border flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg text-white flex items-center gap-2"><Baby className="text-theme-primary" size={20} />Novo Lote de Pintinhos</h3>
              <button type="button" onClick={resetPintinhos} className="text-theme-text-muted hover:text-white transition-colors cursor-pointer"><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePintinhosSubmit} className="flex flex-col overflow-hidden flex-1 min-h-0 max-w-full">
              <div className="p-5 overflow-y-auto space-y-4 flex-1 min-h-0 modal-scrollable-content overscroll-contain touch-pan-y">
                
                {/* Baia e Raça */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Baia / Identificação *</SectionLabel>
                    <input required type="text" value={piBaia} onChange={e => setPiBaia(e.target.value)} placeholder="Ex: Baia 05" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <SectionLabel>Raça (opcional)</SectionLabel>
                      <button
                        type="button"
                        onClick={() => setShowQuickBreedModal(true)}
                        className="text-[10px] text-theme-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        + Nova Raça
                      </button>
                    </div>
                    <div className="relative">
                      <select value={piRaca} onChange={e => setPiRaca(e.target.value)} className={inputCls + " appearance-none pr-8"}>
                        <option value="">-- Selecionar --</option>
                        {breeds.map(br => <option key={br.id} value={br.nome}>{br.nome}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Data de Nascimento e Peso Inicial */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Data de Nascimento *</SectionLabel>
                    <input type="date" required value={piDataNascimento} onChange={e => setPiDataNascimento(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <SectionLabel>Peso Médio Inicial</SectionLabel>
                      <button
                        type="button"
                        onClick={() => setShowChickSampleCalc(!showChickSampleCalc)}
                        className="text-[10px] text-theme-primary font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Scale size={11} /> {showChickSampleCalc ? 'Digitar direto' : 'Pesar 5 pintinhos'}
                      </button>
                    </div>

                    {!showChickSampleCalc ? (
                      <>
                        <input type="text" placeholder="Ex: 40g" value={piPesoInicial} onChange={e => setPiPesoInicial(e.target.value)} className={inputCls} />
                        <div className="flex flex-wrap gap-1 pt-1">
                          {['35g', '40g', '45g', '50g'].map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setPiPesoInicial(p)}
                              className={`text-[9px] px-1.5 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                                piPesoInicial === p
                                  ? 'bg-theme-primary/20 border-theme-primary text-theme-primary font-bold'
                                  : 'bg-theme-base border-theme-border text-theme-text-muted hover:text-white'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="bg-theme-base border border-theme-primary/40 rounded-xl p-2.5 space-y-2 animate-fade-in">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-300 text-[10px]">
                            Pese 5 pintinhos para tirar a média:
                          </span>
                          {piPesoInicial && (
                            <span className="font-black text-theme-primary bg-theme-primary/15 px-2 py-0.5 rounded border border-theme-primary/30 text-[10px]">
                              Média: {piPesoInicial}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {chickSampleWeights.map((w, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <label className="text-[8px] font-extrabold text-theme-text-muted block text-center">
                                P{idx + 1}
                              </label>
                              <input
                                type="text"
                                placeholder="g"
                                value={w}
                                onChange={e => handleChickSampleWeightChange(idx, e.target.value)}
                                className="w-full bg-theme-surface border border-theme-border rounded-lg p-1 text-[11px] text-center text-white focus:border-theme-primary outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Origem dos Pintinhos */}
                <div className="space-y-1.5">
                  <SectionLabel>Origem dos Pintinhos *</SectionLabel>
                  <div className="flex bg-theme-base border border-theme-border rounded-xl p-1 gap-1">
                    <button
                      type="button"
                      onClick={() => setPiOrigem('Criatório')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        piOrigem === 'Criatório' ? 'bg-theme-primary text-black shadow-sm font-black' : 'text-theme-text-muted hover:text-white'
                      }`}
                    >
                      <Home size={14} /> Do meu criatório
                    </button>
                    <button
                      type="button"
                      onClick={() => setPiOrigem('Externo')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        piOrigem === 'Externo' ? 'bg-theme-primary text-black shadow-sm font-black' : 'text-theme-text-muted hover:text-white'
                      }`}
                    >
                      De fora (externo)
                    </button>
                  </div>
                </div>

                {/* PAIS DOS PINTINHOS: TOTALMENTE OCULTO ATÉ CLICAR NA ORIGEM */}
                {piOrigem === 'Criatório' && (
                  <div className="bg-theme-base/60 border border-theme-border/70 rounded-2xl p-3.5 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🧬</span> Selecionar Pais do Criatório
                      </span>
                      <span className="text-[10px] text-theme-text-muted bg-theme-surface px-2 py-0.5 rounded-lg border border-theme-border">
                        Opcional
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-theme-text-muted uppercase">Galo / Pai (opcional)</label>
                        <div className="relative">
                          <select
                            value={piPaiId}
                            onChange={e => setPiPaiId(e.target.value)}
                            className={inputCls + " appearance-none pr-8 text-xs"}
                          >
                            <option value="">-- Selecionar Pai do Plantel --</option>
                            {birds.filter(b => b.sexo === 'Macho' && b.status !== 'Vendido' && b.status !== 'Faleceu').map(m => (
                              <option key={m.id} value={m.id}>
                                {m.anilha}{m.nome ? ` - ${m.nome}` : ''} ({m.raca})
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-theme-text-muted uppercase">Galinha / Mãe (opcional)</label>
                        <div className="relative">
                          <select
                            value={piMaeId}
                            onChange={e => setPiMaeId(e.target.value)}
                            className={inputCls + " appearance-none pr-8 text-xs"}
                          >
                            <option value="">-- Selecionar Mãe do Plantel --</option>
                            {birds.filter(b => b.sexo === 'Fêmea' && b.status !== 'Vendido' && b.status !== 'Faleceu').map(f => (
                              <option key={f.id} value={f.id}>
                                {f.anilha}{f.nome ? ` - ${f.nome}` : ''} ({f.raca})
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {piOrigem === 'Externo' && (
                  <div className="bg-theme-base/60 border border-theme-border/70 rounded-2xl p-3.5 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🧬</span> Quem são os pais?
                      </span>
                      <span className="text-[10px] text-theme-text-muted bg-theme-surface px-2 py-0.5 rounded-lg border border-theme-border">
                        Opcional
                      </span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-theme-text-muted uppercase">Escreva quem são os pais (opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: Galo Shamo X e Matriz 04..."
                        value={piPaisTexto}
                        onChange={e => setPiPaisTexto(e.target.value)}
                        className={inputCls + " text-xs"}
                      />
                    </div>
                  </div>
                )}

                {/* Quantidade de Pintinhos */}
                <div className="space-y-1">
                  <SectionLabel>Quantos pintinhos são? (Quantidade) *</SectionLabel>
                  <input
                    type="number"
                    min="1"
                    required
                    inputMode="numeric"
                    placeholder="Ex: 30"
                    value={piQtd}
                    onKeyDown={onlyNumericKeyDown}
                    onChange={e => setPiQtd(sanitizeNumeric(e.target.value))}
                    className={inputCls + " text-2xl font-black text-center py-3 text-white"}
                  />
                </div>

                {/* Observação */}
                <div className="space-y-1">
                  <SectionLabel>Observação (opcional)</SectionLabel>
                  <textarea rows={2} placeholder="Ex: Nascidos na chocadora..." value={piObs} onChange={e => setPiObs(e.target.value)} className={inputCls + " resize-none"} />
                </div>

              </div>
              <div className="p-4 sm:p-5 border-t border-theme-border flex gap-3 shrink-0 bg-theme-surface/50">
                <button type="button" onClick={resetPintinhos} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold text-white hover:border-theme-primary transition-all cursor-pointer">Cancelar</button>
                <button type="submit" disabled={!piBaia.trim() || !piQtd || parseInt(piQtd) <= 0} className="flex-1 py-3 bg-theme-primary disabled:opacity-50 text-black rounded-xl text-sm font-black transition-all active:scale-95 cursor-pointer">Criar Lote</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL INTERATIVO DE CONFIRMAÇÃO DO NÚMERO TOTAL DE AVES NO LOTE ── */}
      {confirmLotModal.isOpen && createPortal(
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 animate-fade-in overflow-hidden touch-none select-none" 
          onClick={() => setConfirmLotModal(prev => ({ ...prev, isOpen: false }))}
          onTouchMove={e => e.preventDefault()}
        >
          <div 
            className="bg-theme-surface border-2 border-theme-primary/50 w-full max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 animate-scale-up overflow-hidden" 
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-theme-primary/15 border border-theme-primary/30 text-theme-primary flex items-center justify-center font-bold text-lg shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="font-black text-base text-white">Confirmação de Quantidade no Lote</h3>
                <p className="text-[11px] text-theme-text-muted uppercase font-bold tracking-wider">Verificação de Lote</p>
              </div>
            </div>

            {!confirmLotModal.isAskingCustom ? (
              <>
                <p className="text-sm text-theme-text-muted leading-relaxed">
                  A soma das aves selecionadas do criatório (<strong className="text-white">{confirmLotModal.selectedCount}</strong>) com a quantidade adicional informada (<strong className="text-white">{confirmLotModal.extraCount}</strong>) é de <strong className="text-theme-primary text-base">{confirmLotModal.sumTotal} ave(s)</strong>.
                </p>

                <p className="text-xs font-bold text-white bg-theme-base p-3 rounded-xl border border-theme-border/60">
                  Este é o número total de aves no lote?
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmLotModal(prev => ({ ...prev, isAskingCustom: true }));
                    }}
                    className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-xs font-bold text-white hover:border-theme-primary transition-all active:scale-95 cursor-pointer"
                  >
                    ✏️ Não, informar outro número
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      confirmLotModal.pendingSaveFn(confirmLotModal.sumTotal);
                      setConfirmLotModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="flex-1 py-3 bg-theme-primary text-black font-extrabold rounded-xl text-xs transition-all active:scale-95 shadow-md cursor-pointer"
                  >
                    ✅ Sim, confirmar ({confirmLotModal.sumTotal} aves)
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-400 block">Qual o número total de aves no lote?</label>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    autoFocus
                    placeholder="Ex: 25"
                    value={confirmLotModal.customTotalInput}
                    onKeyDown={onlyNumericKeyDown}
                    onChange={e => {
                      const val = sanitizeNumeric(e.target.value);
                      setConfirmLotModal(prev => ({ ...prev, customTotalInput: val }));
                    }}
                    className={inputCls + " text-2xl font-black text-center py-3 text-white border-amber-500/50"}
                  />
                  <p className="text-[10px] text-theme-text-muted">
                    Todas as {confirmLotModal.selectedCount} ave(s) selecionadas continuarão vinculadas normalmente ao lote.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmLotModal(prev => ({ ...prev, isAskingCustom: false }))}
                    className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-xs font-bold text-white hover:border-theme-primary transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={!confirmLotModal.customTotalInput || parseInt(confirmLotModal.customTotalInput) <= 0}
                    onClick={() => {
                      const finalVal = parseInt(confirmLotModal.customTotalInput) || confirmLotModal.sumTotal;
                      confirmLotModal.pendingSaveFn(finalVal);
                      setConfirmLotModal(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="flex-1 py-3 bg-theme-primary text-black font-extrabold rounded-xl text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
                  >
                    Salvar Lote com {confirmLotModal.customTotalInput || '0'} Aves
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL DE CONFIRMAÇÃO DE TRANSFERÊNCIA DE LOTE ── */}
      {confirmTransfer.isOpen && confirmTransfer.lote && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 animate-fade-in overflow-x-hidden touch-pan-y" onClick={() => setConfirmTransfer({ isOpen: false, lote: null })}>
          <div className="bg-theme-surface border border-theme-border/80 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-lg">
                ❓
              </div>
              <div>
                <h3 className="font-black text-base text-white">Confirmar Transferência de Lote</h3>
                <p className="text-xs text-theme-text-muted">Transferência para Engorda</p>
              </div>
            </div>

            <p className="text-sm text-theme-text-muted leading-relaxed">
              Você realmente deseja transferir o lote da <strong className="text-white">Baia {confirmTransfer.lote.baia}</strong> para a aba de <strong className="text-theme-primary uppercase">Engorda / Abate</strong>?
            </p>

            <div className="bg-theme-base p-3.5 rounded-xl border border-theme-border/50 text-xs space-y-1">
              <p className="text-white font-bold mb-1">Resumo do Lote:</p>
              <p className="text-theme-text-muted">• Baia: <span className="text-white font-bold">{confirmTransfer.lote.baia}</span></p>
              {confirmTransfer.lote.raca && <p className="text-theme-text-muted">• Raça: <span className="text-white">{confirmTransfer.lote.raca}</span></p>}
              <p className="text-theme-text-muted">• Aves: <span className="text-white">{Math.max(confirmTransfer.lote.qtdAves || 0, confirmTransfer.lote.avesIds?.length || 0)} pintinhos</span></p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmTransfer({ isOpen: false, lote: null })}
                className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-xs font-bold text-white hover:border-theme-primary transition-all active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeTransfer}
                className="flex-1 py-3 bg-theme-primary text-black rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Sim, Transferir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL CADASTRO RÁPIDO DE RAÇA ── */}
      <QuickBreedModal
        isOpen={showQuickBreedModal}
        initialBreedName={eRaca}
        onClose={() => setShowQuickBreedModal(false)}
        onBreedSaved={(newBreed) => {
          setERaca(newBreed.nome);
          if (newBreed.ganhoGramasDia) setEGanhoGramasDia(String(newBreed.ganhoGramasDia));
          if (newBreed.pesoMedio && !ePesoMeta) setEPesoMeta(newBreed.pesoMedio);
          if (newBreed.ganhoGramasDia && newBreed.conversaoAlimentar) {
            setEConsumoRacaoAve(String(Math.round(newBreed.ganhoGramasDia * newBreed.conversaoAlimentar)));
          }
        }}
      />

      {/* ── MODAL REGISTRO DE PESAGEM MANUAL ── */}
      <WeighingModal
        isOpen={weighModal.isOpen}
        lote={weighModal.lote}
        onClose={() => setWeighModal({ isOpen: false, lote: null })}
      />

      {/* ── MODAL DE MOVIMENTAÇÕES & BAIXAS DE AVES DO LOTE ── */}
      <LotMovementModal
        isOpen={movementModal.isOpen}
        onClose={() => setMovementModal({ isOpen: false, lote: null, loteType: 'engorda' })}
        lote={movementModal.lote}
        loteType={movementModal.loteType}
        birds={birds}
        editBird={editBird}
        editEggLot={editEggLot}
        editMeatLot={editMeatLot}
        showToast={showToast}
      />

      {/* ── CONFIRMAÇÃO DE EXCLUSÃO DE LOTE (SEM WINDOW.CONFIRM) ── */}
      <ConfirmDialog
        isOpen={Boolean(deleteLotConfirm)}
        title={deleteLotConfirm?.title || 'Apagar Lote'}
        message={deleteLotConfirm?.message || ''}
        confirmLabel="Apagar Permanentemente"
        confirmVariant="danger"
        onConfirm={() => {
          if (deleteLotConfirm?.id) {
            removeMeatLot(deleteLotConfirm.id);
            showToast('Lote excluído com sucesso!', 'info');
          }
          setDeleteLotConfirm(null);
        }}
        onCancel={() => setDeleteLotConfirm(null)}
      />
    </div>
  );
}
