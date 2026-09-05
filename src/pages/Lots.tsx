import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  Egg, Scale, Beef, Timer, Plus, Activity, X, Search, Check,
  DollarSign, Info, ChevronDown, Users, Trash2, Baby, Home, AlertCircle,
  TrendingDown, TrendingUp, History, CheckCircle
} from 'lucide-react';
import { useAppContext } from '../lib/AppContext';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function calcDays(start: string) {
  const s = new Date(start); const n = new Date();
  s.setHours(0,0,0,0); n.setHours(0,0,0,0);
  return Math.max(0, Math.floor((n.getTime()-s.getTime())/86400000));
}
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR'); }
function normalizeBaia(str: string) { return str.toLowerCase().replace(/[^a-z0-9]/g, ''); }

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
  const location = useLocation();
  const { 
    birds, editBird, showToast, breeds, eggLots, addEggLot, editEggLot, removeEggLot,
    meatLots, addMeatLot, editMeatLot, removeMeatLot 
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<'postura'|'engorda'|'pintinhos'|'crescimento'>('postura');

  useEffect(() => {
    if (location.state) {
      const stateObj = location.state as any;
      if (stateObj.tab) {
        setActiveTab(stateObj.tab);
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
  const [pPreco, setPPreco] = useState('6.00');
  const [pCusto, setPCusto] = useState('0.30');
  const [pObs, setPObs] = useState('');

  // Engorda Lot states
  const [showEngorda, setShowEngorda] = useState(false);
  const [eBaia, setEBaia] = useState('');
  const [eRaca, setERaca] = useState('');
  const [eDataInicio, setEDataInicio] = useState(todayISO());
  const [eMode, setEMode] = useState<'select'|'qty'>('select');
  const [eAves, setEAves] = useState<string[]>([]);
  const [eQtd, setEQtd] = useState('');
  const [eSearch, setESearch] = useState('');
  const [ePesoInicial, setEPesoInicial] = useState('');
  const [ePesoMeta, setEPesoMeta] = useState('');
  const [eObs, setEObs] = useState('');

  // Pintinhos Lot states
  const [showPintinhos, setShowPintinhos] = useState(false);
  const [piBaia, setPiBaia] = useState('');
  const [piRaca, setPiRaca] = useState('');
  const [piDataInicio, setPiDataInicio] = useState(todayISO());
  const [piMode, setPiMode] = useState<'select'|'qty'>('select');
  const [piAves, setPiAves] = useState<string[]>([]);
  const [piQtd, setPiQtd] = useState('');
  const [piSearch, setPiSearch] = useState('');
  const [piPesoInicial, setPiPesoInicial] = useState('');
  const [piObs, setPiObs] = useState('');

  // Crescimento Lot states
  const [showCrescimento, setShowCrescimento] = useState(false);
  const [crBaia, setCrBaia] = useState('');
  const [crRaca, setCrRaca] = useState('');
  const [crDataInicio, setCrDataInicio] = useState(todayISO());
  const [crMode, setCrMode] = useState<'select'|'qty'>('select');
  const [crAves, setCrAves] = useState<string[]>([]);
  const [crQtd, setCrQtd] = useState('');
  const [crSearch, setCrSearch] = useState('');
  const [crPesoInicial, setCrPesoInicial] = useState('');
  const [crObs, setCrObs] = useState('');

  // Confirmation Modal state for Lot Quantity Verification
  const [confirmLotModal, setConfirmLotModal] = useState<{
    isOpen: boolean;
    lotType: 'postura' | 'engorda' | 'pintinhos' | 'crescimento';
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
  const activeChicks = birds.filter(b=>b.status==='Crescimento');

  const filterEngorda = meatLots.filter(l => !l.id.startsWith('chick-') && !l.id.startsWith('growth-'));
  const filterPintinhos = meatLots.filter(l => l.id.startsWith('chick-'));
  const filterCrescimento = meatLots.filter(l => l.id.startsWith('growth-'));

  const [confirmTransfer, setConfirmTransfer] = useState<{
    isOpen: boolean;
    lote: any | null;
    target: 'engorda' | 'crescimento';
  }>({
    isOpen: false,
    lote: null,
    target: 'engorda',
  });

  const [movementModal, setMovementModal] = useState<{
    isOpen: boolean;
    lote: any | null;
    loteType: 'postura' | 'engorda' | 'pintinhos' | 'crescimento';
  }>({
    isOpen: false,
    lote: null,
    loteType: 'engorda',
  });

  const isAnyModalOpen = showPostura || showEngorda || showPintinhos || showCrescimento || confirmLotModal.isOpen || confirmTransfer.isOpen || movementModal.isOpen;
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

  const openTransferModal = (lote: any, target: 'engorda' | 'crescimento') => {
    setConfirmTransfer({ isOpen: true, lote, target });
  };

  const executeTransfer = () => {
    if (!confirmTransfer.lote) return;
    const { lote, target } = confirmTransfer;

    removeMeatLot(lote.id);

    const newId = target === 'engorda' ? 'meat-' + uid() : 'growth-' + uid();

    addMeatLot({
      id: newId,
      baia: lote.baia,
      avesIds: lote.avesIds || [],
      qtdAves: lote.qtdAves || 0,
      dataInicio: lote.dataInicio,
      pesoMedioInicial: lote.pesoMedioInicial || '0',
      pesoMeta: lote.pesoMeta,
      status: 'Crescimento',
      raca: lote.raca,
      observacao: lote.observacao,
    });

    setConfirmTransfer({ isOpen: false, lote: null, target: 'engorda' });
    setActiveTab(target);
  };

  // ── Handlers de Seleção sem Perder Estado ──
  const handleFemaleToggle = (id: string) => {
    const next = pFemeas.includes(id) ? pFemeas.filter(x=>x!==id) : [...pFemeas, id];
    setPFemeas(next);
    const totalCount = next.length + (parseInt(pQtd) || 0);
    setPExpectativa(String(Math.round(totalCount * 0.85)));
  };
  const handleFemaleSelectAll = (ids: string[]) => {
    const allSel = ids.every(id=>pFemeas.includes(id));
    const next = allSel ? pFemeas.filter(id=>!ids.includes(id)) : Array.from(new Set([...pFemeas,...ids]));
    setPFemeas(next);
    const totalCount = next.length + (parseInt(pQtd) || 0);
    setPExpectativa(String(Math.round(totalCount * 0.85)));
  };

  const resetPostura = () => {
    setShowPostura(false); setPBaia(''); setPRaca(''); setPDataInicio(todayISO());
    setPMode('select'); setPFemeas([]); setPQtd(''); setPSearch('');
    setPExpectativa(''); setPPreco('6.00'); setPCusto('0.30'); setPObs('');
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
        expectativaDiaria: parseInt(pExpectativa) || Math.round(finalTotal * 0.85),
        dataInicio: pDataInicio,
        status: 'Ativo',
        raca: pRaca.trim() || undefined,
        precoVendaPadrao: parseFloat(pPreco) || 6,
        custoProdPadrao: parseFloat(pCusto) || 0.30,
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
    setEMode('select'); setEAves([]); setEQtd(''); setESearch('');
    setEPesoInicial(''); setEPesoMeta(''); setEObs('');
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
        pesoMedioInicial: ePesoInicial.trim() || '0',
        pesoMeta: ePesoMeta.trim() || undefined,
        status: 'Crescimento',
        raca: eRaca.trim() || undefined,
        observacao: eObs.trim() || undefined,
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

  // Pintinhos methods
  const handlePintinhoToggle = (id: string) => {
    setPiAves(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  };
  const handlePintinhoSelectAll = (ids: string[]) => {
    const allSel = ids.every(id=>piAves.includes(id));
    setPiAves(allSel ? piAves.filter(id=>!ids.includes(id)) : Array.from(new Set([...piAves,...ids])));
  };
  const resetPintinhos = () => {
    setShowPintinhos(false); setPiBaia(''); setPiRaca(''); setPiDataInicio(todayISO());
    setPiMode('select'); setPiAves([]); setPiQtd(''); setPiSearch(''); setPiPesoInicial(''); setPiObs('');
  };
  const handleSavePintinhosSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!piBaia.trim()) return;

    const numSel = piAves.length;
    const numExtra = parseInt(piQtd) || 0;
    const sumTotal = numSel + numExtra;

    const doSave = (finalTotal: number) => {
      addMeatLot({
        id: 'chick-' + uid(),
        baia: piBaia.trim(),
        avesIds: piAves,
        qtdAves: finalTotal,
        dataInicio: piDataInicio,
        pesoMedioInicial: piPesoInicial.trim() || '0',
        status: 'Crescimento',
        raca: piRaca.trim() || undefined,
        observacao: piObs.trim() || undefined,
      });
      resetPintinhos();
    };

    setConfirmLotModal({
      isOpen: true,
      lotType: 'pintinhos',
      selectedCount: numSel,
      extraCount: numExtra,
      sumTotal,
      customTotalInput: String(sumTotal),
      isAskingCustom: false,
      pendingSaveFn: doSave,
    });
  };

  // Crescimento methods
  const handleCrescimentoToggle = (id: string) => {
    setCrAves(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  };
  const handleCrescimentoSelectAll = (ids: string[]) => {
    const allSel = ids.every(id=>crAves.includes(id));
    setCrAves(allSel ? crAves.filter(id=>!ids.includes(id)) : Array.from(new Set([...crAves,...ids])));
  };
  const resetCrescimento = () => {
    setShowCrescimento(false); setCrBaia(''); setCrRaca(''); setCrDataInicio(todayISO());
    setCrMode('select'); setCrAves([]); setCrQtd(''); setCrSearch(''); setCrPesoInicial(''); setCrObs('');
  };
  const handleSaveCrescimentoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crBaia.trim()) return;

    const numSel = crAves.length;
    const numExtra = parseInt(crQtd) || 0;
    const sumTotal = numSel + numExtra;

    const doSave = (finalTotal: number) => {
      addMeatLot({
        id: 'growth-' + uid(),
        baia: crBaia.trim(),
        avesIds: crAves,
        qtdAves: finalTotal,
        dataInicio: crDataInicio,
        pesoMedioInicial: crPesoInicial.trim() || '0',
        status: 'Crescimento',
        raca: crRaca.trim() || undefined,
        observacao: crObs.trim() || undefined,
      });
      resetCrescimento();
    };

    setConfirmLotModal({
      isOpen: true,
      lotType: 'crescimento',
      selectedCount: numSel,
      extraCount: numExtra,
      sumTotal,
      customTotalInput: String(sumTotal),
      isAskingCustom: false,
      pendingSaveFn: doSave,
    });
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

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4 max-w-7xl mx-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Gestão de Lotes
          </h1>
          <p className="text-xs text-theme-text-muted">Acompanhe postura, engorda, pintinhos e recria do seu criatório</p>
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
          {activeTab === 'crescimento' && (
            <button onClick={() => setShowCrescimento(true)} className="btn-primary flex items-center gap-2">
              <Plus size={16} /> Novo Lote de Crescimento
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
          { id: 'crescimento', label: 'Crescimento / Recria', icon: Timer, count: filterCrescimento.length },
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

      {/* TAB CONTENT: POSTURA */}
      {activeTab === 'postura' && (
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Lotes Ativos', value: eggLots.filter(l => l.status !== 'Encerrado').length },
              { label: 'Total de Fêmeas em Postura', value: eggLots.filter(l => l.status !== 'Encerrado').reduce((a, l) => a + (l.femeasIds.length || l.qtdFemeas || 0), 0) },
            ].map(s => (
              <div key={s.label} className="premium-card p-4">
                <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <h3 className="text-2xl font-black text-white">{s.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {eggLots.map(lote => {
              const dias = calcDays(lote.dataInicio);
              const qtdF = lote.femeasIds.length || lote.qtdFemeas || 0;
              return (
                <div key={lote.id} className="premium-card p-5 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Egg size={100} /></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-theme-primary uppercase mb-0.5 block">Baia {lote.baia}{lote.raca ? ` · ${lote.raca}` : ''}</span>
                      <h3 className="font-black text-lg text-white">Lote de Postura</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${eggStatusCls(lote.status)}`}>{lote.status}</span>
                      <button onClick={() => { if (window.confirm('Deseja realmente apagar este lote de postura permanentemente?')) removeEggLot(lote.id); }}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-all" title="Apagar Lote">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { icon: Timer, label: 'Idade do Lote', value: `${dias}d` },
                      { icon: Users, label: 'Fêmeas', value: qtdF },
                      { icon: Egg, label: 'Meta Ovos/dia', value: lote.expectativaDiaria || 0 },
                    ].map(m => (
                      <div key={m.label} className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1"><m.icon size={11} />{m.label}</p>
                        <p className="text-base font-black text-white truncate">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-theme-border/50 mt-auto mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase">Aves Vinculadas ({lote.femeasIds.length})</p>
                      <p className="text-[10px] text-theme-text-muted">Início: {fmtDate(lote.dataInicio)}</p>
                    </div>
                    {lote.femeasIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                        {lote.femeasIds.map(id => { const b = birds.find(x => x.id === id); return b ? (<span key={id} className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-theme-text-muted border border-theme-border">{b.anilha}{b.nome ? ` (${b.nome})` : ''}</span>) : null; })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-theme-text-muted italic">{qtdF > 0 ? `${qtdF} fêmeas registradas (sem vínculo individual)` : 'Nenhuma ave vinculada.'}</p>
                    )}
                    {lote.observacao && <p className="text-[10px] text-theme-text-muted mt-2 italic">Obs: {lote.observacao}</p>}
                  </div>
                  <div className="pt-3 border-t border-theme-border/50">
                    <button
                      type="button"
                      onClick={() => setMovementModal({ isOpen: true, lote, loteType: 'postura' })}
                      className="w-full py-2.5 px-3 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border/80 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-all group mb-3 shadow-sm"
                    >
                      <span className="flex items-center gap-2 text-theme-primary font-black">
                        <Activity size={14} /> Movimentações & Baixas (+/-)
                      </span>
                      <span className="bg-theme-base px-2 py-0.5 rounded-lg border border-theme-border/60 text-[10px] font-extrabold text-theme-text-muted group-hover:text-white">
                        {lote.movimentacoes?.length || 0} registro(s)
                      </span>
                    </button>
                    <p className={labelCls + " mb-2"}>Alterar Status</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Ativo', 'Encerrado'] as const).map(st => (
                        <button key={st} onClick={() => editEggLot(lote.id, { status: st })}
                          className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${lote.status === st ? 'bg-theme-primary text-black border-theme-primary' : 'bg-theme-surface/50 border-theme-border/50 text-theme-text-muted hover:text-white hover:border-theme-border'}`}>
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {eggLots.length === 0 && (
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Egg size={40} className="mx-auto mb-3 opacity-50 text-theme-primary" />
                <p className="font-bold text-white mb-1">Nenhum lote de postura cadastrado</p>
                <p className="text-sm">Cadastre um lote para gerenciar galinhas em postura e meta de ovos.</p>
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
              { label: 'Aves em Engorda', value: filterEngorda.reduce((a, l) => a + (l.status !== 'Abatido' ? (l.avesIds.length || l.qtdAves || 0) : 0), 0) },
            ].map(s => (
              <div key={s.label} className="premium-card p-4">
                <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <h3 className="text-2xl font-black text-white">{s.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filterEngorda.map(lote => {
              const dias = calcDays(lote.dataInicio);
              const qtdA = lote.avesIds.length || lote.qtdAves || 0;
              return (
                <div key={lote.id} className="premium-card p-5 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Beef size={100} /></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-theme-primary uppercase mb-0.5 block">Baia {lote.baia}{lote.raca ? ` · ${lote.raca}` : ''}</span>
                      <h3 className="font-black text-lg text-white">Lote de Engorda</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${meatStatusCls(lote.status)}`}>{lote.status}</span>
                      <button onClick={() => { if (window.confirm('Deseja realmente apagar este lote de engorda permanentemente?')) removeMeatLot(lote.id); }}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-all" title="Apagar Lote">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { icon: Timer, label: 'Idade', value: `${dias}d` },
                      { icon: Scale, label: 'Peso Inicial', value: lote.pesoMedioInicial },
                      { icon: Activity, label: 'Aves', value: qtdA },
                    ].map(m => (
                      <div key={m.label} className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1"><m.icon size={11} />{m.label}</p>
                        <p className="text-base font-black text-white truncate">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  {lote.pesoMeta && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 mb-4">
                      <p className="text-[10px] text-orange-400 font-bold">Meta de Abate</p>
                      <p className="text-sm font-black text-white">{lote.pesoMeta}</p>
                    </div>
                  )}
                  <div className="pt-3 border-t border-theme-border/50 mt-auto mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase">Aves Vinculadas ({lote.avesIds.length})</p>
                      <p className="text-[10px] text-theme-text-muted">Início: {fmtDate(lote.dataInicio)}</p>
                    </div>
                    {lote.avesIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                        {lote.avesIds.map(id => { const b = birds.find(x => x.id === id); return b ? (<span key={id} className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-theme-text-muted border border-theme-border">{b.anilha}{b.nome ? ` (${b.nome})` : ''}</span>) : null; })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-theme-text-muted italic">{qtdA > 0 ? `${qtdA} aves registradas (sem vínculo individual)` : 'Nenhuma ave vinculada.'}</p>
                    )}
                    {lote.observacao && <p className="text-[10px] text-theme-text-muted mt-2 italic">Obs: {lote.observacao}</p>}
                  </div>
                  <div className="pt-3 border-t border-theme-border/50">
                    <button
                      type="button"
                      onClick={() => setMovementModal({ isOpen: true, lote, loteType: 'engorda' })}
                      className="w-full py-2.5 px-3 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border/80 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-all group mb-3 shadow-sm"
                    >
                      <span className="flex items-center gap-2 text-theme-primary font-black">
                        <Activity size={14} /> Movimentações & Baixas (+/-)
                      </span>
                      <span className="bg-theme-base px-2 py-0.5 rounded-lg border border-theme-border/60 text-[10px] font-extrabold text-theme-text-muted group-hover:text-white">
                        {lote.movimentacoes?.length || 0} registro(s)
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
            {filterEngorda.length === 0 && (
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Beef size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-bold text-white mb-1">Nenhum lote de engorda cadastrado</p>
                <p className="text-sm">Cadastre um lote para gerenciar crescimento e abate.</p>
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
              { label: 'Total de Pintinhos', value: filterPintinhos.filter(l => l.status !== 'Abatido').reduce((a, l) => a + (l.avesIds.length || l.qtdAves || 0), 0) },
            ].map(s => (
              <div key={s.label} className="premium-card p-4">
                <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <h3 className="text-2xl font-black text-white">{s.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filterPintinhos.map(lote => {
              const dias = calcDays(lote.dataInicio);
              const qtdA = lote.avesIds.length || lote.qtdAves || 0;
              return (
                <div key={lote.id} className="premium-card p-5 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Baby size={100} className="text-yellow-400" /></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-theme-primary uppercase mb-0.5 block">Baia {lote.baia}{lote.raca ? ` · ${lote.raca}` : ''}</span>
                      <h3 className="font-black text-lg text-white">Lote de Pintinhos</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${meatStatusCls(lote.status)}`}>{lote.status}</span>
                      <button onClick={() => { if (window.confirm('Deseja realmente apagar este lote de pintinhos permanentemente?')) removeMeatLot(lote.id); }}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-all" title="Apagar Lote">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { icon: Timer, label: 'Idade', value: `${dias}d` },
                      { icon: Scale, label: 'Peso Inicial', value: lote.pesoMedioInicial },
                      { icon: Activity, label: 'Aves', value: qtdA },
                    ].map(m => (
                      <div key={m.label} className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1"><m.icon size={11} />{m.label}</p>
                        <p className="text-base font-black text-white truncate">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-theme-border/50 mt-auto mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase">Pintinhos Vinculados ({lote.avesIds.length})</p>
                      <p className="text-[10px] text-theme-text-muted">Início: {fmtDate(lote.dataInicio)}</p>
                    </div>
                    {lote.avesIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                        {lote.avesIds.map(id => { const b = birds.find(x => x.id === id); return b ? (<span key={id} className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-theme-text-muted border border-theme-border">{b.anilha}{b.nome ? ` (${b.nome})` : ''}</span>) : null; })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-theme-text-muted italic">{qtdA > 0 ? `${qtdA} pintinhos registrados (sem vínculo individual)` : 'Nenhum pintinho vinculado.'}</p>
                    )}
                    {lote.observacao && <p className="text-[10px] text-theme-text-muted mt-2 italic">Obs: {lote.observacao}</p>}
                  </div>
                  <div className="pt-3 border-t border-theme-border/50">
                    <button
                      type="button"
                      onClick={() => setMovementModal({ isOpen: true, lote, loteType: 'pintinhos' })}
                      className="w-full py-2.5 px-3 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border/80 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-all group mb-3 shadow-sm"
                    >
                      <span className="flex items-center gap-2 text-theme-primary font-black">
                        <Activity size={14} /> Movimentações & Baixas (+/-)
                      </span>
                      <span className="bg-theme-base px-2 py-0.5 rounded-lg border border-theme-border/60 text-[10px] font-extrabold text-theme-text-muted group-hover:text-white">
                        {lote.movimentacoes?.length || 0} registro(s)
                      </span>
                    </button>
                    <p className={labelCls + " mb-2"}>Transferir Lote para</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => openTransferModal(lote, 'crescimento')} className="py-2 px-2 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all">
                        <Timer size={14} className="text-green-400" /> Crescimento / Recria
                      </button>
                      <button onClick={() => openTransferModal(lote, 'engorda')} className="py-2 px-2 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all">
                        <Beef size={14} className="text-orange-400" /> Engorda / Abate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filterPintinhos.length === 0 && (
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Baby size={40} className="mx-auto mb-3 opacity-50 text-yellow-400" />
                <p className="font-bold text-white mb-1">Nenhum lote de pintinhos cadastrado</p>
                <p className="text-sm">Cadastre um lote para gerenciar o nascimento e primeiros dias dos pintinhos.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CRESCIMENTO */}
      {activeTab === 'crescimento' && (
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Lotes Ativos', value: filterCrescimento.filter(l => l.status !== 'Abatido').length },
              { label: 'Aves em Crescimento', value: filterCrescimento.filter(l => l.status !== 'Abatido').reduce((a, l) => a + (l.avesIds.length || l.qtdAves || 0), 0) },
            ].map(s => (
              <div key={s.label} className="premium-card p-4">
                <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <h3 className="text-2xl font-black text-white">{s.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filterCrescimento.map(lote => {
              const dias = calcDays(lote.dataInicio);
              const qtdA = lote.avesIds.length || lote.qtdAves || 0;
              return (
                <div key={lote.id} className="premium-card p-5 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Timer size={100} className="text-green-400" /></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-theme-primary uppercase mb-0.5 block">Baia {lote.baia}{lote.raca ? ` · ${lote.raca}` : ''}</span>
                      <h3 className="font-black text-lg text-white">Lote de Crescimento</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${meatStatusCls(lote.status)}`}>{lote.status}</span>
                      <button onClick={() => { if (window.confirm('Deseja realmente apagar este lote de crescimento permanentemente?')) removeMeatLot(lote.id); }}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-all" title="Apagar Lote">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { icon: Timer, label: 'Idade', value: `${dias}d` },
                      { icon: Scale, label: 'Peso Inicial', value: lote.pesoMedioInicial },
                      { icon: Activity, label: 'Aves', value: qtdA },
                    ].map(m => (
                      <div key={m.label} className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1"><m.icon size={11} />{m.label}</p>
                        <p className="text-base font-black text-white truncate">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-theme-border/50 mt-auto mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase">Aves Vinculadas ({lote.avesIds.length})</p>
                      <p className="text-[10px] text-theme-text-muted">Início: {fmtDate(lote.dataInicio)}</p>
                    </div>
                    {lote.avesIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                        {lote.avesIds.map(id => { const b = birds.find(x => x.id === id); return b ? (<span key={id} className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-theme-text-muted border border-theme-border">{b.anilha}{b.nome ? ` (${b.nome})` : ''}</span>) : null; })}
                      </div>
                    ) : (
                      <p className="text-[10px] text-theme-text-muted italic">{qtdA > 0 ? `${qtdA} aves registradas (sem vínculo individual)` : 'Nenhuma ave vinculada.'}</p>
                    )}
                    {lote.observacao && <p className="text-[10px] text-theme-text-muted mt-2 italic">Obs: {lote.observacao}</p>}
                  </div>
                  <div className="pt-3 border-t border-theme-border/50">
                    <button
                      type="button"
                      onClick={() => setMovementModal({ isOpen: true, lote, loteType: 'crescimento' })}
                      className="w-full py-2.5 px-3 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border/80 rounded-xl text-xs font-bold text-white flex items-center justify-between transition-all group mb-3 shadow-sm"
                    >
                      <span className="flex items-center gap-2 text-theme-primary font-black">
                        <Activity size={14} /> Movimentações & Baixas (+/-)
                      </span>
                      <span className="bg-theme-base px-2 py-0.5 rounded-lg border border-theme-border/60 text-[10px] font-extrabold text-theme-text-muted group-hover:text-white">
                        {lote.movimentacoes?.length || 0} registro(s)
                      </span>
                    </button>
                    <p className={labelCls + " mb-2"}>Transferir Lote para</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => openTransferModal(lote, 'engorda')} className="py-2 px-2 bg-theme-surface hover:bg-theme-surface-hover border border-theme-border text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all">
                        <Beef size={14} className="text-orange-400" /> Engorda / Abate
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filterCrescimento.length === 0 && (
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Timer size={40} className="mx-auto mb-3 opacity-50 text-green-400" />
                <p className="font-bold text-white mb-1">Nenhum lote de crescimento cadastrado</p>
                <p className="text-sm">Cadastre um lote para gerenciar a recria e crescimento das aves.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL POSTURA ── */}
      {showPostura && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-hidden touch-none select-none animate-fade-in" 
          onClick={resetPostura}
          onTouchMove={e => e.preventDefault()}
        >
          <div 
            className="bg-theme-surface border border-theme-border/80 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden animate-scale-up" 
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-theme-border mx-auto mt-3 mb-1 shrink-0" />
            <div className="px-5 pt-3 pb-4 border-b border-theme-border flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg text-white flex items-center gap-2"><Egg className="text-theme-primary" size={20} />Novo Lote de Postura</h3>
              <button type="button" onClick={resetPostura} className="text-theme-text-muted hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePosturaSubmit} className="flex flex-col overflow-hidden flex-1 max-w-full">
              <div className="p-5 overflow-y-auto space-y-4 flex-1 modal-scrollable-content overscroll-contain touch-pan-y">
                
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
                          const total = pFemeas.length + (parseInt(v) || 0);
                          setPExpectativa(String(Math.round(total * 0.85)));
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
                  <SectionLabel>Expectativa de Ovos por Dia</SectionLabel>
                  <div className="relative">
                    <input type="number" min="0" inputMode="numeric" value={pExpectativa} onKeyDown={onlyNumericKeyDown} onChange={e => setPExpectativa(sanitizeNumeric(e.target.value))} placeholder="Auto-calculado (85% da qtd)" className={inputCls} />
                  </div>
                  <p className="text-[10px] text-theme-text-muted flex items-center gap-1"><Info size={10} />Calculado em 85% do total de fêmeas. Pode ser ajustado livremente.</p>
                </div>

                <div className="space-y-2">
                  <SectionLabel>Preços Padrão para aba Ovos</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelCls}>Preço/Dúzia (R$)</label>
                      <div className="relative">
                        <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400" />
                        <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="6.00" value={pPreco} onKeyDown={onlyNumericKeyDown} onChange={e => setPPreco(sanitizeNumeric(e.target.value))} className={inputCls + " pl-8"} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Custo/Ovo (R$)</label>
                      <div className="relative">
                        <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                        <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.30" value={pCusto} onKeyDown={onlyNumericKeyDown} onChange={e => setPCusto(sanitizeNumeric(e.target.value))} className={inputCls + " pl-8"} />
                      </div>
                    </div>
                  </div>
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
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-hidden touch-none select-none animate-fade-in" 
          onClick={resetEngorda}
          onTouchMove={e => e.preventDefault()}
        >
          <div 
            className="bg-theme-surface border border-theme-border/80 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden animate-scale-up" 
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-theme-border mx-auto mt-3 mb-1 shrink-0" />
            <div className="px-5 pt-3 pb-4 border-b border-theme-border flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg text-white flex items-center gap-2"><Beef className="text-theme-primary" size={20} />Novo Lote de Engorda</h3>
              <button type="button" onClick={resetEngorda} className="text-theme-text-muted hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveEngordaSubmit} className="flex flex-col overflow-hidden flex-1 max-w-full">
              <div className="p-5 overflow-y-auto space-y-4 flex-1 modal-scrollable-content overscroll-contain touch-pan-y">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Baia / Identificação *</SectionLabel>
                    <input required type="text" value={eBaia} onChange={e => setEBaia(e.target.value)} placeholder="Ex: Baia 08" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Raça (opcional)</SectionLabel>
                    <div className="relative">
                      <select value={eRaca} onChange={e => setERaca(e.target.value)} className={inputCls + " appearance-none pr-8"}>
                        <option value="">-- Selecionar --</option>
                        {breeds.map(br => <option key={br.id} value={br.nome}>{br.nome}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* 📍 GESTÃO DE FÊMEAS E MACHOS DETECTADOS NA MESMA BAIA */}
                <BaiaBirdsManagementCard
                  baia={eBaia}
                  birds={birds}
                  selectedBirdIds={eAves}
                  onIncludeBirds={ids => setEAves(prev => Array.from(new Set([...prev, ...ids])))}
                  editBird={editBird}
                  showToast={showToast}
                />

                <div className="space-y-1">
                  <SectionLabel>Data de Início</SectionLabel>
                  <input type="date" required value={eDataInicio} onChange={e => setEDataInicio(e.target.value)} className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Peso Médio Inicial</SectionLabel>
                    <input type="text" required placeholder="Ex: 350g" value={ePesoInicial} onChange={e => setEPesoInicial(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Meta de Abate</SectionLabel>
                    <input type="text" placeholder="Ex: 2.5kg" value={ePesoMeta} onChange={e => setEPesoMeta(e.target.value)} className={inputCls} />
                  </div>
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
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-hidden touch-none select-none animate-fade-in" 
          onClick={resetPintinhos}
          onTouchMove={e => e.preventDefault()}
        >
          <div 
            className="bg-theme-surface border border-theme-border/80 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden animate-scale-up" 
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-theme-border mx-auto mt-3 mb-1 shrink-0" />
            <div className="px-5 pt-3 pb-4 border-b border-theme-border flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg text-white flex items-center gap-2"><Baby className="text-theme-primary" size={20} />Novo Lote de Pintinhos</h3>
              <button type="button" onClick={resetPintinhos} className="text-theme-text-muted hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSavePintinhosSubmit} className="flex flex-col overflow-hidden flex-1 max-w-full">
              <div className="p-5 overflow-y-auto space-y-4 flex-1 modal-scrollable-content overscroll-contain touch-pan-y">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Baia / Identificação *</SectionLabel>
                    <input required type="text" value={piBaia} onChange={e => setPiBaia(e.target.value)} placeholder="Ex: Baia 05" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Raça (opcional)</SectionLabel>
                    <div className="relative">
                      <select value={piRaca} onChange={e => setPiRaca(e.target.value)} className={inputCls + " appearance-none pr-8"}>
                        <option value="">-- Selecionar --</option>
                        {breeds.map(br => <option key={br.id} value={br.nome}>{br.nome}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* 📍 GESTÃO DE FÊMEAS E MACHOS DETECTADOS NA MESMA BAIA */}
                <BaiaBirdsManagementCard
                  baia={piBaia}
                  birds={birds}
                  selectedBirdIds={piAves}
                  onIncludeBirds={ids => setPiAves(prev => Array.from(new Set([...prev, ...ids])))}
                  editBird={editBird}
                  showToast={showToast}
                />

                <div className="space-y-1">
                  <SectionLabel>Data de Início</SectionLabel>
                  <input type="date" required value={piDataInicio} onChange={e => setPiDataInicio(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <SectionLabel>Peso Médio Inicial</SectionLabel>
                  <input type="text" placeholder="Ex: 45g" value={piPesoInicial} onChange={e => setPiPesoInicial(e.target.value)} className={inputCls} />
                </div>

                <div className="space-y-2">
                  <SectionLabel>Aves no Lote</SectionLabel>
                  <ModeToggle mode={piMode} onChange={m => setPiMode(m)} label1="Selecionar pintinhos" label2="Quantidade Adicional" />
                  {piMode === 'select' ? (
                    <BirdPicker birds={activeChicks} selected={piAves} onToggle={handlePintinhoToggle} onSelectAll={handlePintinhoSelectAll} search={piSearch} onSearch={setPiSearch} emptyMsg="Nenhum pintinho em crescimento disponível." />
                  ) : (
                    <div className="space-y-1">
                      <SectionLabel>Quantidade Adicional de Pintinhos</SectionLabel>
                      <input type="number" min="0" inputMode="numeric" placeholder="Ex: 25" value={piQtd} onChange={e => setPiQtd(sanitizeNumeric(e.target.value))} className={inputCls + " text-2xl font-black text-center py-3"} />
                    </div>
                  )}

                  <div className="bg-theme-base/80 border border-theme-border/60 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-theme-text-muted">Total de pintinhos:</span>
                    <span className="font-black text-white text-sm bg-theme-primary/10 border border-theme-primary/30 px-2.5 py-0.5 rounded-lg text-theme-primary">
                      {piAves.length} selecionados + {parseInt(piQtd) || 0} adicionais = {piAves.length + (parseInt(piQtd) || 0)} pintinhos
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <SectionLabel>Observação (opcional)</SectionLabel>
                  <textarea rows={2} placeholder="Ex: Nascidos na chocadora..." value={piObs} onChange={e => setPiObs(e.target.value)} className={inputCls + " resize-none"} />
                </div>

              </div>
              <div className="p-4 sm:p-5 border-t border-theme-border flex gap-3 shrink-0 bg-theme-surface/50">
                <button type="button" onClick={resetPintinhos} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold text-white hover:border-theme-primary transition-all">Cancelar</button>
                <button type="submit" disabled={!piBaia.trim()} className="flex-1 py-3 bg-theme-primary disabled:opacity-50 text-black rounded-xl text-sm font-black transition-all active:scale-95 cursor-pointer">Criar Lote</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL CRESCIMENTO ── */}
      {showCrescimento && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 overflow-hidden touch-none select-none animate-fade-in" 
          onClick={resetCrescimento}
          onTouchMove={e => e.preventDefault()}
        >
          <div 
            className="bg-theme-surface border border-theme-border/80 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden animate-scale-up" 
            onClick={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
          >
            <div className="sm:hidden w-10 h-1 rounded-full bg-theme-border mx-auto mt-3 mb-1 shrink-0" />
            <div className="px-5 pt-3 pb-4 border-b border-theme-border flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg text-white flex items-center gap-2"><Timer className="text-theme-primary" size={20} />Novo Lote de Crescimento</h3>
              <button type="button" onClick={resetCrescimento} className="text-theme-text-muted hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCrescimentoSubmit} className="flex flex-col overflow-hidden flex-1 max-w-full">
              <div className="p-5 overflow-y-auto space-y-4 flex-1 modal-scrollable-content overscroll-contain touch-pan-y">
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Baia / Identificação *</SectionLabel>
                    <input required type="text" value={crBaia} onChange={e => setCrBaia(e.target.value)} placeholder="Ex: Baia 06" className={inputCls} />
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Raça (opcional)</SectionLabel>
                    <div className="relative">
                      <select value={crRaca} onChange={e => setCrRaca(e.target.value)} className={inputCls + " appearance-none pr-8"}>
                        <option value="">-- Selecionar --</option>
                        {breeds.map(br => <option key={br.id} value={br.nome}>{br.nome}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* 📍 GESTÃO DE FÊMEAS E MACHOS DETECTADOS NA MESMA BAIA */}
                <BaiaBirdsManagementCard
                  baia={crBaia}
                  birds={birds}
                  selectedBirdIds={crAves}
                  onIncludeBirds={ids => setCrAves(prev => Array.from(new Set([...prev, ...ids])))}
                  editBird={editBird}
                  showToast={showToast}
                />

                <div className="space-y-1">
                  <SectionLabel>Data de Início</SectionLabel>
                  <input type="date" required value={crDataInicio} onChange={e => setCrDataInicio(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1">
                  <SectionLabel>Peso Médio Inicial</SectionLabel>
                  <input type="text" placeholder="Ex: 500g" value={crPesoInicial} onChange={e => setCrPesoInicial(e.target.value)} className={inputCls} />
                </div>

                <div className="space-y-2">
                  <SectionLabel>Aves no Lote</SectionLabel>
                  <ModeToggle mode={crMode} onChange={m => setCrMode(m)} label1="Selecionar aves" label2="Quantidade Adicional" />
                  {crMode === 'select' ? (
                    <BirdPicker birds={activeChicks} selected={crAves} onToggle={handleCrescimentoToggle} onSelectAll={handleCrescimentoSelectAll} search={crSearch} onSearch={setCrSearch} emptyMsg="Nenhuma ave em crescimento disponível." />
                  ) : (
                    <div className="space-y-1">
                      <SectionLabel>Quantidade Adicional de Aves</SectionLabel>
                      <input type="number" min="0" inputMode="numeric" placeholder="Ex: 30" value={crQtd} onChange={e => setCrQtd(sanitizeNumeric(e.target.value))} className={inputCls + " text-2xl font-black text-center py-3"} />
                    </div>
                  )}

                  <div className="bg-theme-base/80 border border-theme-border/60 rounded-xl p-3 flex items-center justify-between text-xs">
                    <span className="text-theme-text-muted">Total de crescimento:</span>
                    <span className="font-black text-white text-sm bg-theme-primary/10 border border-theme-primary/30 px-2.5 py-0.5 rounded-lg text-theme-primary">
                      {crAves.length} selecionados + {parseInt(crQtd) || 0} adicionais = {crAves.length + (parseInt(crQtd) || 0)} aves
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <SectionLabel>Observação (opcional)</SectionLabel>
                  <textarea rows={2} placeholder="Ex: Lote de recria..." value={crObs} onChange={e => setCrObs(e.target.value)} className={inputCls + " resize-none"} />
                </div>

              </div>
              <div className="p-4 sm:p-5 border-t border-theme-border flex gap-3 shrink-0 bg-theme-surface/50">
                <button type="button" onClick={resetCrescimento} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold text-white hover:border-theme-primary transition-all">Cancelar</button>
                <button type="submit" disabled={!crBaia.trim()} className="flex-1 py-3 bg-theme-primary disabled:opacity-50 text-black rounded-xl text-sm font-black transition-all active:scale-95 cursor-pointer">Criar Lote</button>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 animate-fade-in overflow-x-hidden touch-pan-y" onClick={() => setConfirmTransfer({ isOpen: false, lote: null, target: 'engorda' })}>
          <div className="bg-theme-surface border border-theme-border/80 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-lg">
                ❓
              </div>
              <div>
                <h3 className="font-black text-base text-white">Confirmar Transferência de Lote</h3>
                <p className="text-xs text-theme-text-muted">Confirmação de ação</p>
              </div>
            </div>

            <p className="text-sm text-theme-text-muted leading-relaxed">
              Você realmente deseja transferir o lote da <strong className="text-white">Baia {confirmTransfer.lote.baia}</strong> para a aba de <strong className="text-theme-primary uppercase">{confirmTransfer.target}</strong>?
            </p>

            <div className="bg-theme-base p-3.5 rounded-xl border border-theme-border/50 text-xs space-y-1">
              <p className="text-white font-bold mb-1">Resumo do Lote:</p>
              <p className="text-theme-text-muted">• Baia: <span className="text-white font-bold">{confirmTransfer.lote.baia}</span></p>
              {confirmTransfer.lote.raca && <p className="text-theme-text-muted">• Raça: <span className="text-white">{confirmTransfer.lote.raca}</span></p>}
              <p className="text-theme-text-muted">• Aves: <span className="text-white">{confirmTransfer.lote.avesIds?.length || confirmTransfer.lote.qtdAves || 0} pintinhos</span></p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmTransfer({ isOpen: false, lote: null, target: 'engorda' })}
                className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-xs font-bold text-white hover:border-theme-primary transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeTransfer}
                className="flex-1 py-3 bg-theme-primary text-black rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-amber-500/20"
              >
                Sim, Transferir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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
    </div>
  );
}

function LotMovementModal({
  isOpen,
  onClose,
  lote,
  loteType,
  birds,
  editBird,
  editEggLot,
  editMeatLot,
  showToast
}: {
  isOpen: boolean;
  onClose: () => void;
  lote: any;
  loteType: 'postura' | 'engorda' | 'pintinhos' | 'crescimento';
  birds: any[];
  editBird: (id: string, updated: any) => void;
  editEggLot: (id: string, updated: any) => void;
  editMeatLot: (id: string, updated: any) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'novo' | 'historico'>('novo');
  const [tipo, setTipo] = useState<'saida' | 'entrada'>('saida');
  const [isRegistered, setIsRegistered] = useState<'yes' | 'no'>('yes');
  const [selectedBirdIds, setSelectedBirdIds] = useState<string[]>([]);
  const [birdSearch, setBirdSearch] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('Mortalidade / Óbito');
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');
  const [data, setData] = useState(todayISO());
  const [observacao, setObservacao] = useState('');

  if (!isOpen || !lote) return null;

  const currentCount = lote.femeasIds?.length || lote.avesIds?.length || lote.qtdFemeas || lote.qtdAves || 0;

  const motivosSaida = [
    'Mortalidade / Óbito',
    'Abate',
    'Venda',
    'Transferência de Baia',
    'Ajuste de Inventário',
    'Outro'
  ];

  const motivosEntrada = [
    'Introdução / Nova Ave',
    'Nascimento / Eclosão',
    'Retorno de Baia',
    'Ajuste de Inventário',
    'Outro'
  ];

  const motivosDisponiveis = tipo === 'saida' ? motivosSaida : motivosEntrada;

  const handleTipoChange = (newTipo: 'saida' | 'entrada') => {
    setTipo(newTipo);
    setMotivo(newTipo === 'saida' ? 'Mortalidade / Óbito' : 'Introdução / Nova Ave');
    setMotivoPersonalizado('');
    if (newTipo === 'entrada') {
      setIsRegistered('yes');
      setSelectedBirdIds([]);
    }
  };

  const availableBirds = birds.filter(b => {
    if (b.status === 'Vendido' || b.status === 'Faleceu') return false;
    if (loteType === 'postura' && b.sexo !== 'Fêmea') return false;
    const existingIds = lote.femeasIds || lote.avesIds || [];
    if (existingIds.includes(b.id)) return false;
    return true;
  });

  const handleToggleBird = (id: string) => {
    setSelectedBirdIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllBirds = (ids: string[]) => {
    if (ids.every(id => selectedBirdIds.includes(id))) {
      setSelectedBirdIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedBirdIds(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const isAddingRegistered = tipo === 'entrada' && isRegistered === 'yes';

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    let qtyNum = 0;

    if (isAddingRegistered) {
      if (selectedBirdIds.length === 0) {
        showToast('Por favor, selecione ao menos uma ave da lista para adicionar.', 'warning');
        return;
      }
      qtyNum = selectedBirdIds.length;
    } else {
      qtyNum = parseInt(quantidade);
      if (!qtyNum || qtyNum <= 0) {
        showToast('Por favor, informe uma quantidade válida maior que 0.', 'warning');
        return;
      }
    }

    const finalMotivo = motivo === 'Outro' ? (motivoPersonalizado.trim() || 'Outro') : motivo;

    const newRecord: any = {
      id: uid(),
      tipo,
      quantidade: qtyNum,
      motivo: finalMotivo,
      data: data || todayISO(),
      observacao: observacao.trim() || undefined
    };

    if (isAddingRegistered) {
      newRecord.avesIds = selectedBirdIds;
    }

    const updatedMovimentacoes = [newRecord, ...(lote.movimentacoes || [])];

    let newTotal = currentCount;
    if (tipo === 'entrada') {
      newTotal = currentCount + qtyNum;
    } else {
      newTotal = Math.max(0, currentCount - qtyNum);
    }

    // Se adicionou aves registradas, atualiza a baia de cada uma das aves no sistema
    if (isAddingRegistered && selectedBirdIds.length > 0) {
      selectedBirdIds.forEach(birdId => {
        editBird(birdId, { baia: lote.baia });
      });
    }

    if (loteType === 'postura') {
      const updatedFemeas = isAddingRegistered
        ? Array.from(new Set([...(lote.femeasIds || []), ...selectedBirdIds]))
        : (lote.femeasIds || []);

      editEggLot(lote.id, {
        qtdFemeas: newTotal,
        ...(isAddingRegistered ? { femeasIds: updatedFemeas } : {}),
        movimentacoes: updatedMovimentacoes
      });
    } else {
      const updatedAves = isAddingRegistered
        ? Array.from(new Set([...(lote.avesIds || []), ...selectedBirdIds]))
        : (lote.avesIds || []);

      editMeatLot(lote.id, {
        qtdAves: newTotal,
        ...(isAddingRegistered ? { avesIds: updatedAves } : {}),
        movimentacoes: updatedMovimentacoes
      });
    }

    showToast(
      tipo === 'saida'
        ? `Baixa de ${qtyNum} ave(s) registrada com sucesso (-${qtyNum})`
        : `Entrada de ${qtyNum} ave(s) ${isAddingRegistered ? 'cadastrada(s)' : ''} registrada com sucesso (+${qtyNum})`,
      'success'
    );

    setQuantidade('');
    setSelectedBirdIds([]);
    setObservacao('');
    setMotivoPersonalizado('');
    setActiveSubTab('historico');
  };

  const handleDeleteMovement = (movId: string) => {
    if (!window.confirm('Deseja remover esta movimentação do histórico?')) return;

    const targetMov = lote.movimentacoes?.find((m: any) => m.id === movId);
    if (!targetMov) return;

    const updatedMovimentacoes = (lote.movimentacoes || []).filter((m: any) => m.id !== movId);

    let newTotal = currentCount;
    if (targetMov.tipo === 'entrada') {
      newTotal = Math.max(0, currentCount - targetMov.quantidade);
    } else {
      newTotal = currentCount + targetMov.quantidade;
    }

    if (loteType === 'postura') {
      editEggLot(lote.id, {
        qtdFemeas: newTotal,
        movimentacoes: updatedMovimentacoes
      });
    } else {
      editMeatLot(lote.id, {
        qtdAves: newTotal,
        movimentacoes: updatedMovimentacoes
      });
    }

    showToast('Movimentação removida e saldo atualizado!', 'info');
  };

  const lotTitleMap = {
    postura: 'Lote de Postura',
    engorda: 'Lote de Engorda',
    pintinhos: 'Lote de Pintinhos',
    crescimento: 'Lote de Crescimento'
  };

  const effectiveQty = isAddingRegistered ? selectedBirdIds.length : (parseInt(quantidade) || 0);

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-theme-surface border border-theme-border w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-scale-up my-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme-border pb-4">
          <div>
            <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wider block">
              Baia {lote.baia} · {lotTitleMap[loteType]}
            </span>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Activity size={18} className="text-theme-primary" />
              Ajuste & Baixas de Aves
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-theme-text-muted hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info Card current count */}
        <div className="bg-theme-base border border-theme-border rounded-2xl p-3.5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-theme-text-muted uppercase">Quantidade Atual no Lote</p>
            <p className="text-2xl font-black text-white">{currentCount} <span className="text-xs font-bold text-theme-text-muted">aves</span></p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('novo')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeSubTab === 'novo' ? 'bg-theme-primary text-black' : 'bg-theme-surface text-theme-text-muted border border-theme-border'}`}
            >
              <Plus size={13} /> Nova Movimentação
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('historico')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${activeSubTab === 'historico' ? 'bg-theme-primary text-black' : 'bg-theme-surface text-theme-text-muted border border-theme-border'}`}
            >
              <History size={13} /> Histórico ({lote.movimentacoes?.length || 0})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeSubTab === 'novo' ? (
            <form onSubmit={handleSaveMovement} className="space-y-4">
              {/* Toggle Tipo */}
              <div>
                <SectionLabel>Tipo de Movimentação</SectionLabel>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTipoChange('saida')}
                    className={`py-3 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      tipo === 'saida'
                        ? 'bg-red-500/20 border-red-500 text-red-400 shadow-lg shadow-red-900/30'
                        : 'bg-theme-base border-theme-border text-theme-text-muted hover:text-white'
                    }`}
                  >
                    <TrendingDown size={16} /> Baixa / Saída (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTipoChange('entrada')}
                    className={`py-3 px-4 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      tipo === 'entrada'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-900/30'
                        : 'bg-theme-base border-theme-border text-theme-text-muted hover:text-white'
                    }`}
                  >
                    <TrendingUp size={16} /> Entrada / Adição (+)
                  </button>
                </div>
              </div>

              {/* Se for Entrada, Pergunta se as aves estão cadastradas */}
              {tipo === 'entrada' && (
                <div className="bg-theme-base/60 border border-theme-border rounded-xl p-3 space-y-2">
                  <label className="text-xs font-bold text-white flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-theme-primary" />
                    As aves sendo adicionadas já estão cadastradas no sistema?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRegistered('yes')}
                      className={`py-2 px-3 rounded-lg border text-xs font-extrabold transition-all ${
                        isRegistered === 'yes'
                          ? 'bg-theme-primary text-black border-theme-primary'
                          : 'bg-theme-surface border-theme-border text-theme-text-muted hover:text-white'
                      }`}
                    >
                      Sim (Selecionar da Lista)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRegistered('no')}
                      className={`py-2 px-3 rounded-lg border text-xs font-extrabold transition-all ${
                        isRegistered === 'no'
                          ? 'bg-theme-primary text-black border-theme-primary'
                          : 'bg-theme-surface border-theme-border text-theme-text-muted hover:text-white'
                      }`}
                    >
                      Não (Informar Quantidade)
                    </button>
                  </div>
                </div>
              )}

              {/* Se Entrada & Cadastrada: Exibe Selecionador de Aves */}
              {isAddingRegistered ? (
                <div className="space-y-2">
                  <SectionLabel>Selecionar Aves Cadastradas ({selectedBirdIds.length} selecionada(s))</SectionLabel>
                  <BirdPicker
                    birds={availableBirds}
                    selected={selectedBirdIds}
                    onToggle={handleToggleBird}
                    onSelectAll={handleSelectAllBirds}
                    search={birdSearch}
                    onSearch={setBirdSearch}
                    emptyMsg="Nenhuma ave disponível no sistema para vincular a este lote."
                  />
                  <div>
                    <SectionLabel>Data da Ocorrência</SectionLabel>
                    <input
                      type="date"
                      value={data}
                      onChange={e => setData(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>
                </div>
              ) : (
                /* Quantidade & Data Manual */
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <SectionLabel>Quantidade de Aves</SectionLabel>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Ex: 3"
                      value={quantidade}
                      onKeyDown={onlyNumericKeyDown}
                      onChange={e => setQuantidade(sanitizeNumeric(e.target.value))}
                      className={inputCls}
                      required
                    />
                  </div>
                  <div>
                    <SectionLabel>Data da Ocorrência</SectionLabel>
                    <input
                      type="date"
                      value={data}
                      onChange={e => setData(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Motivo */}
              <div>
                <SectionLabel>Motivo da Movimentação</SectionLabel>
                <select
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  className={inputCls}
                >
                  {motivosDisponiveis.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {motivo === 'Outro' && (
                <div>
                  <SectionLabel>Especifique o Motivo</SectionLabel>
                  <input
                    type="text"
                    placeholder="Descreva o motivo..."
                    value={motivoPersonalizado}
                    onChange={e => setMotivoPersonalizado(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
              )}

              {/* Observações */}
              <div>
                <SectionLabel>Observações Adicionais (Opcional)</SectionLabel>
                <textarea
                  rows={2}
                  placeholder="Ex: 2 morreram de frio e 1 foi separada por machucado..."
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  className={inputCls + " resize-none"}
                />
              </div>

              {/* Preview de Resultado */}
              {effectiveQty > 0 && (
                <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  tipo === 'saida' ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <span>Saldo estimado do lote após registrar:</span>
                  <span className="text-sm font-black">
                    {currentCount} {tipo === 'saida' ? '-' : '+'} {effectiveQty} = {
                      tipo === 'saida' ? Math.max(0, currentCount - effectiveQty) : currentCount + effectiveQty
                    } aves
                  </span>
                </div>
              )}

              {/* Submit */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-theme-base border border-theme-border rounded-xl text-xs font-bold text-theme-text-muted hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${
                    tipo === 'saida' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-emerald-500 text-black hover:bg-emerald-400'
                  }`}
                >
                  {tipo === 'saida' ? 'Confirmar Baixa' : 'Confirmar Entrada'}
                </button>
              </div>
            </form>
          ) : (
            /* Histórico */
            <div className="space-y-3">
              <SectionLabel>Histórico de Entradas e Baixas</SectionLabel>
              {(!lote.movimentacoes || lote.movimentacoes.length === 0) ? (
                <div className="text-center p-8 bg-theme-base rounded-2xl border border-dashed border-theme-border text-theme-text-muted">
                  <History size={32} className="mx-auto mb-2 opacity-40" />
                  <p className="font-bold text-xs text-white">Nenhuma movimentação registrada</p>
                  <p className="text-[11px]">As baixas e entradas de aves neste lote aparecerão aqui.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {lote.movimentacoes.map((mov: any) => (
                    <div
                      key={mov.id}
                      className="bg-theme-base border border-theme-border/60 rounded-2xl p-3.5 flex items-start justify-between gap-3 hover:border-theme-border transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          mov.tipo === 'saida' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {mov.tipo === 'saida' ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-black ${mov.tipo === 'saida' ? 'text-red-400' : 'text-emerald-400'}`}>
                              {mov.tipo === 'saida' ? `-${mov.quantidade} ave(s)` : `+${mov.quantidade} ave(s)`}
                            </span>
                            <span className="text-[10px] text-theme-text-muted">· {fmtDate(mov.data)}</span>
                          </div>
                          <p className="text-xs font-bold text-white mt-0.5">{mov.motivo}</p>
                          {mov.observacao && (
                            <p className="text-[11px] text-theme-text-muted mt-1 italic">Obs: {mov.observacao}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMovement(mov.id)}
                        className="text-theme-text-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                        title="Remover este registro"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
