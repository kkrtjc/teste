import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Egg, Scale, Beef, Timer, Plus, Activity, X, Search, Check,
  ChevronDown, Users, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Flame, Calendar, ShoppingBag,
  Thermometer, Droplets, Trash2, ArrowRight
} from 'lucide-react';
import { useAppContext, type EggLot, type MeatLot, type EggRecord } from '../lib/AppContext';

// ─── Utilities ───────────────────────────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function calcDays(start: string) {
  const s = new Date(start); const n = new Date();
  s.setHours(0,0,0,0); n.setHours(0,0,0,0);
  return Math.max(0, Math.floor((n.getTime()-s.getTime())/86400000));
}
function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('pt-BR'); }
function fmtDateShort(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
}
function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors placeholder-theme-text-muted";
const labelCls = "text-[10px] font-bold text-theme-text-muted uppercase tracking-wider";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className={labelCls + " mb-1"}>{children}</p>;
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

// ─── Gráfico de Eficiência ─────────────────────────────────────────────────
type ChartPoint = {
  data: string;
  coletados: number;
  vendidos: number;
  custo: number;
  preco: number;
};

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  point: ChartPoint | null;
  side: 'left' | 'right';
};

function EfficencyChart({ registros, expectativa, precoVenda, custoProd }: {
  registros: EggRecord[];
  expectativa: number;
  precoVenda: number;
  custoProd: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, point: null, side: 'right' });
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const points: ChartPoint[] = registros
    .slice(-30)
    .map(r => ({
      data: r.data,
      coletados: r.quantidade,
      vendidos: r.vendidos ?? 0,
      custo: r.quantidade * custoProd,
      preco: precoVenda,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));

  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-theme-text-muted gap-2">
        <Activity size={28} className="opacity-40"/>
        <p className="text-xs">Nenhum registro para exibir o gráfico.</p>
        <p className="text-[10px] opacity-60">Registre coletas para ver a eficiência do lote.</p>
      </div>
    );
  }

  const maxVal = Math.max(...points.map(p => p.coletados), expectativa, 1);
  const W = 100;
  const H = 100;
  const PAD = { top: 10, right: 4, bottom: 16, left: 4 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const toX = (i: number) => PAD.left + (i / Math.max(points.length - 1, 1)) * chartW;
  const toY = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  const idealY = toY(expectativa);

  const areaPath = points.map((p, i) => {
    const x = toX(i); const y = toY(p.coletados);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ') + ` L ${toX(points.length - 1)} ${toY(0)} L ${toX(0)} ${toY(0)} Z`;

  const linePath = points.map((p, i) => {
    const x = toX(i); const y = toY(p.coletados);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const showTooltip = useCallback((svgEl: SVGSVGElement, clientX: number, clientY: number) => {
    if (!points.length) return;
    const rect = svgEl.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const idx = Math.min(Math.round(relX * (points.length - 1)), points.length - 1);
    const clamped = Math.max(0, idx);
    const p = points[clamped];
    const tipX = (clientX - rect.left);
    const tipY = (clientY - rect.top);
    const side = tipX > rect.width * 0.6 ? 'left' : 'right';
    setTooltip({ visible: true, x: tipX, y: tipY, point: p, side });
  }, [points]);

  const hideTooltip = useCallback(() => {
    setTooltip(prev => ({ ...prev, visible: false }));
  }, []);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (svgRef.current) showTooltip(svgRef.current, e.clientX, e.clientY);
  };
  const handleMouseLeave = () => hideTooltip();

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (svgRef.current) showTooltip(svgRef.current, touch.clientX, touch.clientY);
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(hideTooltip, 3000);
  };
  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (svgRef.current) showTooltip(svgRef.current, touch.clientX, touch.clientY);
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(hideTooltip, 3000);
  };

  const tp = tooltip.point;
  let lucro = 0;
  let lucroLabel = '';
  if (tp) {
    const receita = (tp.vendidos / 12) * tp.preco;
    const custo = tp.coletados * custoProd;
    lucro = receita - custo;
    lucroLabel = lucro >= 0 ? `+${fmtCurrency(lucro)}` : fmtCurrency(lucro);
  }

  const labelStep = Math.max(1, Math.floor(points.length / 5));
  const xLabels = points
    .map((p, i) => ({ i, label: fmtDateShort(p.data) }))
    .filter((_, i) => i % labelStep === 0 || i === points.length - 1);

  return (
    <div className="relative w-full select-none" style={{ touchAction: 'none' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 'clamp(140px, 28vw, 220px)', overflow: 'visible' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchMove}
      >
        <defs>
          <linearGradient id={`grad-col`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.35"/>
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id={`grad-ideal`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="#10B981" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f}
            x1={PAD.left} x2={W - PAD.right}
            y1={PAD.top + chartH * (1 - f)} y2={PAD.top + chartH * (1 - f)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="0.5"/>
        ))}

        {expectativa > 0 && (
          <>
            <path
              d={`M ${PAD.left} ${idealY} L ${W - PAD.right} ${idealY} L ${W - PAD.right} ${toY(0)} L ${PAD.left} ${toY(0)} Z`}
              fill="url(#grad-ideal)" />
            <line
              x1={PAD.left} x2={W - PAD.right}
              y1={idealY} y2={idealY}
              stroke="#10B981" strokeWidth="0.7" strokeDasharray="2 2"/>
          </>
        )}

        {points.length > 1 && <path d={areaPath} fill="url(#grad-col)"/>}

        {points.length > 1 && (
          <path d={linePath} fill="none" stroke="#F59E0B" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"/>
        )}

        {points.map((p, i) => {
          const x = toX(i); const y = toY(p.coletados);
          const isActive = tooltip.visible && tooltip.point?.data === p.data;
          return (
            <circle key={i} cx={x} cy={y} r={isActive ? 2.8 : 1.6}
              fill={isActive ? '#fff' : '#F59E0B'}
              stroke={isActive ? '#F59E0B' : 'none'}
              strokeWidth={isActive ? 0.8 : 0}
              style={{ transition: 'r 0.15s, fill 0.15s' }}/>
          );
        })}

        {tooltip.visible && tooltip.point && (() => {
          const idx = points.findIndex(p => p.data === tooltip.point!.data);
          if (idx < 0) return null;
          const x = toX(idx);
          return (
            <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + chartH}
              stroke="rgba(255,255,255,0.2)" strokeWidth="0.6" strokeDasharray="1.5 1.5"/>
          );
        })()}

        {xLabels.map(({ i, label }) => (
          <text key={i} x={toX(i)} y={H - 2}
            textAnchor="middle" fontSize="4.5" fill="#64748B">
            {label}
          </text>
        ))}

        {expectativa > 0 && (
          <text x={W - PAD.right + 1} y={idealY + 1.5}
            fontSize="4" fill="#10B981" textAnchor="start">
            Meta
          </text>
        )}

        <rect x={PAD.left} y={PAD.top} width={chartW} height={chartH}
          fill="transparent" style={{ cursor: 'crosshair' }}/>
      </svg>

      <div className="flex items-center gap-4 mt-1 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-amber-400 rounded"/>
          <span className="text-[10px] text-theme-text-muted">Coletados</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-400 rounded" style={{ borderTop: '1px dashed #10B981', background: 'none' }}/>
          <span className="text-[10px] text-theme-text-muted">Meta/dia</span>
        </div>
        <span className="text-[10px] text-theme-text-muted ml-auto opacity-60">
          {window.matchMedia('(hover:none)').matches ? 'Toque no gráfico' : 'Passe o mouse'}
        </span>
      </div>

      {tooltip.visible && tp && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            left: tooltip.side === 'right' ? tooltip.x + 10 : 'auto',
            right: tooltip.side === 'left' ? `calc(100% - ${tooltip.x}px + 10px)` : 'auto',
            top: Math.max(0, tooltip.y - 60),
          }}
        >
          <div className="bg-[#0F172A]/95 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl min-w-[140px]">
            <p className="text-[10px] font-bold text-theme-text-muted mb-1.5">{fmtDate(tp.data)}</p>
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-[10px] text-amber-400">🥚 Coletados</span>
                <span className="text-[10px] font-black text-white">{tp.coletados}</span>
              </div>
              {tp.vendidos > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-[10px] text-green-400">💰 Vendidos</span>
                  <span className="text-[10px] font-black text-white">{tp.vendidos}</span>
                </div>
              )}
              {expectativa > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-[10px] text-emerald-400">🎯 Meta</span>
                  <span className="text-[10px] font-black text-white">{expectativa}</span>
                </div>
              )}
              {tp.vendidos > 0 && (
                <div className="border-t border-white/10 pt-1 mt-1 flex justify-between gap-4">
                  <span className="text-[10px] text-theme-text-muted">Resultado</span>
                  <span className={`text-[10px] font-black ${lucro >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {lucroLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Diálogo de confirmação de ovos ───────────────────────────────────────────
function OverEggWarningDialog({ qtdOvos, qtdGalinhas, onConfirm, onCancel }: {
  qtdOvos: number; qtdGalinhas: number; onConfirm: () => void; onCancel: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 animate-fade-in">
      <div className="bg-theme-surface border border-amber-500/30 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-scale-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-400"/>
          </div>
          <div>
            <h3 className="font-black text-white text-base">Quantidade incomum</h3>
            <p className="text-[11px] text-theme-text-muted">Confirme antes de continuar</p>
          </div>
        </div>
        <p className="text-sm text-theme-text-muted mb-2">
          Você está registrando <span className="text-white font-bold">{qtdOvos} ovos</span> para um lote com apenas{' '}
          <span className="text-white font-bold">{qtdGalinhas} galinha{qtdGalinhas !== 1 ? 's' : ''}</span>.
        </p>
        <p className="text-xs text-amber-400/80 mb-5">
          Isso representa mais de um ovo por galinha por dia. Deseja continuar mesmo assim?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 bg-theme-base border border-theme-border rounded-xl text-sm font-bold text-white">
            Corrigir
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 bg-amber-500 text-black rounded-xl text-sm font-black">
            Confirmar assim
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function Lots() {
  const {
    birds, breeds, eggLots, addEggLot, editEggLot,
    meatLots, addMeatLot, editMeatLot,
    incubators, addIncubatorBatch, editIncubatorBatch
  } = useAppContext();

  // Tabs ordenadas: Postura (1º) -> Pintinhos (2º) -> Engorda (3º)
  const [activeTab, setActiveTab] = useState<'postura'|'pintinhos'|'engorda'>('postura');

  // Lote Postura Selecionado para Ver Detalhes / Gestão de Ovos
  const [selectedEggLotId, setSelectedEggLotId] = useState<string | null>(null);

  // Form States para Registro de Coleta no Lote Selecionado
  const [recData, setRecData] = useState(todayISO());
  const [recQtd, setRecQtd] = useState('');
  const [recVendidos, setRecVendidos] = useState('');
  const [recObs, setRecObs] = useState('');

  // Form States para Destino dos Ovos (Incubação / Venda)
  const [showIncubateModal, setShowIncubateModal] = useState(false);
  const [incQtd, setIncQtd] = useState('');
  const [incNome, setIncNome] = useState('');

  const [showSellModal, setShowSellModal] = useState(false);
  const [sellQtd, setSellQtd] = useState('');
  const [sellValor, setSellValor] = useState('');

  // ── Lote Postura Modal Form ──
  const [showPostura, setShowPostura] = useState(false);
  const [pBaia, setPBaia] = useState('');
  const [pRaca, setPRaca] = useState('');
  const [pDataInicio, setPDataInicio] = useState(todayISO());
  const [pFemeas, setPFemeas] = useState<string[]>([]);
  const [pQtd, setPQtd] = useState('');
  const [pSearch, setPSearch] = useState('');
  const [pExpectativa, setPExpectativa] = useState('');
  const [pPreco, setPPreco] = useState('6.00');
  const [pCusto, setPCusto] = useState('0.30');
  const [pObs, setPObs] = useState('');
  const [pOverEggWarning, setPOverEggWarning] = useState(false);
  const [pPendingOvos, setPPendingOvos] = useState(0);

  // ── Lote Engorda Modal Form ──
  const [showEngorda, setShowEngorda] = useState(false);
  const [eBaia, setEBaia] = useState('');
  const [eRaca, setERaca] = useState('');
  const [eDataInicio, setEDataInicio] = useState(todayISO());
  const [eAves, setEAves] = useState<string[]>([]);
  const [eQtd, setEQtd] = useState('');
  const [eSearch, setESearch] = useState('');
  const [ePesoInicial, setEPesoInicial] = useState('');
  const [ePesoMeta, setEPesoMeta] = useState('');
  const [eObs, setEObs] = useState('');

  // ── Pintinhos / Chocadeira Modal Form ──
  const [showNewIncubator, setShowNewIncubator] = useState(false);
  const [newIncNome, setNewIncNome] = useState('');
  const [newIncQtd, setNewIncQtd] = useState('');
  const [newIncRaca, setNewIncRaca] = useState('');

  const activeFemales = birds.filter(b=>b.sexo==='Fêmea'&&b.status!=='Vendido'&&b.status!=='Faleceu');
  const activeBirds = birds.filter(b=>b.status!=='Vendido'&&b.status!=='Faleceu');

  const pQtdFemeasAtual = pFemeas.length + (parseInt(pQtd) || 0);
  const eQtdAvesAtual = eAves.length + (parseInt(eQtd) || 0);

  const handleFemaleToggle = (id: string) => {
    const next = pFemeas.includes(id) ? pFemeas.filter(x=>x!==id) : [...pFemeas, id];
    setPFemeas(next);
    const total = next.length + (parseInt(pQtd) || 0);
    setPExpectativa(String(Math.round(total * 0.85)));
  };
  const handleFemaleSelectAll = (ids: string[]) => {
    const allSel = ids.every(id=>pFemeas.includes(id));
    const next = allSel ? pFemeas.filter(id=>!ids.includes(id)) : Array.from(new Set([...pFemeas,...ids]));
    setPFemeas(next);
    const total = next.length + (parseInt(pQtd) || 0);
    setPExpectativa(String(Math.round(total * 0.85)));
  };

  const handleExtraFemaleQtdChange = (val: string) => {
    setPQtd(val);
    const extra = parseInt(val) || 0;
    const total = pFemeas.length + extra;
    setPExpectativa(String(Math.round(total * 0.85)));
  };

  const resetPostura = () => {
    setShowPostura(false); setPBaia(''); setPRaca(''); setPDataInicio(todayISO());
    setPFemeas([]); setPQtd(''); setPSearch('');
    setPExpectativa(''); setPPreco('6.00'); setPCusto('0.30'); setPObs('');
    setPOverEggWarning(false); setPPendingOvos(0);
  };

  const doSavePostura = () => {
    addEggLot({
      id: uid(),
      baia: pBaia.trim(),
      femeasIds: pFemeas,
      qtdFemeas: pQtdFemeasAtual,
      expectativaDiaria: parseInt(pExpectativa)||0,
      dataInicio: pDataInicio,
      status: 'Ativo',
      raca: pRaca.trim()||undefined,
      precoVendaPadrao: parseFloat(pPreco)||6,
      custoProdPadrao: parseFloat(pCusto)||0.30,
      observacao: pObs.trim()||undefined,
      registros: [],
      ovosVendidosTotal: 0,
      ovosIncubadosTotal: 0
    });
    resetPostura();
  };

  const handleSavePostura = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pBaia.trim() || pQtdFemeasAtual === 0) return;
    const expVal = parseInt(pExpectativa) || 0;
    if (expVal > pQtdFemeasAtual && pQtdFemeasAtual > 0) {
      setPPendingOvos(expVal);
      setPOverEggWarning(true);
      return;
    }
    doSavePostura();
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
    setEAves([]); setEQtd(''); setESearch('');
    setEPesoInicial(''); setEPesoMeta(''); setEObs('');
  };

  const handleSaveEngorda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eBaia.trim() || eQtdAvesAtual === 0) return;
    addMeatLot({
      id: uid(),
      baia: eBaia.trim(),
      avesIds: eAves,
      qtdAves: eQtdAvesAtual,
      dataInicio: eDataInicio,
      pesoMedioInicial: ePesoInicial.trim()||'0',
      pesoMeta: ePesoMeta.trim()||undefined,
      status: 'Crescimento',
      raca: eRaca.trim()||undefined,
      observacao: eObs.trim()||undefined,
    });
    resetEngorda();
  };

  const handleSaveNewIncubator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncNome.trim()) return;
    const q = parseInt(newIncQtd) || 0;
    addIncubatorBatch({
      id: uid(),
      nome: newIncNome.trim(),
      dataEntrada: todayISO(),
      previsaoEclosao: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
      ovosSetados: q,
      ovosFerteis: Math.round(q * 0.9),
      status: 'Em Incubação',
      temperatura: '37.8 °C',
      umidade: '55%',
      raca: newIncRaca.trim() || undefined
    });
    setShowNewIncubator(false);
    setNewIncNome(''); setNewIncQtd(''); setNewIncRaca('');
  };

  // Helper de cálculo de lote selecionado
  const selectedLot = eggLots.find(l => l.id === selectedEggLotId);
  const selectedLotRegs: EggRecord[] = selectedLot?.registros || [];
  const selectedTotalColetados = selectedLotRegs.reduce((a, r) => a + r.quantidade, 0);
  const selectedTotalVendidos = (selectedLot?.ovosVendidosTotal || 0) + selectedLotRegs.reduce((a, r) => a + (r.vendidos || 0), 0);
  const selectedTotalIncubados = (selectedLot?.ovosIncubadosTotal || 0) + selectedLotRegs.reduce((a, r) => a + (r.incubados || 0), 0);
  const selectedEstoqueAtual = Math.max(0, selectedTotalColetados - selectedTotalVendidos - selectedTotalIncubados);

  // Adicionar Coleta Diária ao Lote Selecionado
  const handleAddColetaRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot || !recQtd) return;
    const qtd = parseInt(recQtd) || 0;
    const vend = parseInt(recVendidos) || 0;
    const newRecord: EggRecord = {
      data: recData,
      quantidade: qtd,
      vendidos: vend > 0 ? vend : undefined,
      observacao: recObs.trim() || undefined,
    };
    const updated = [newRecord, ...selectedLotRegs];
    editEggLot(selectedLot.id, { registros: updated });
    setRecQtd(''); setRecVendidos(''); setRecObs('');
  };

  // Enviar para Incubação a partir do Lote Selecionado
  const handleConfirmIncubate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;
    const q = parseInt(incQtd) || 0;
    if (q <= 0) return;
    
    addIncubatorBatch({
      id: uid(),
      nome: incNome.trim() || `Setagem Baia ${selectedLot.baia}`,
      loteId: selectedLot.id,
      baia: selectedLot.baia,
      raca: selectedLot.raca,
      dataEntrada: todayISO(),
      previsaoEclosao: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0],
      ovosSetados: q,
      ovosFerteis: Math.round(q * 0.9),
      status: 'Em Incubação',
      temperatura: '37.8 °C',
      umidade: '55%',
    });

    editEggLot(selectedLot.id, {
      ovosIncubadosTotal: (selectedLot.ovosIncubadosTotal || 0) + q
    });

    setShowIncubateModal(false); setIncQtd(''); setIncNome('');
  };

  // Registrar Venda de Ovos a partir do Lote Selecionado
  const handleConfirmSell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLot) return;
    const q = parseInt(sellQtd) || 0;
    if (q <= 0) return;

    editEggLot(selectedLot.id, {
      ovosVendidosTotal: (selectedLot.ovosVendidosTotal || 0) + q
    });

    setShowSellModal(false); setSellQtd(''); setSellValor('');
  };

  const meatStatusCls = (s:string) => {
    if(s==='Crescimento') return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    if(s==='Terminação') return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  };

  const totalFemeaAtivas = eggLots.reduce((a: number, l: EggLot) => a + (l.status === 'Ativo' ? (l.femeasIds.length || l.qtdFemeas || 0) : 0), 0);
  const totalExpDiaria   = eggLots.reduce((a: number, l: EggLot) => a + (l.status === 'Ativo' ? l.expectativaDiaria : 0), 0);

  const pSubmitDisabled = !pBaia.trim() || pQtdFemeasAtual === 0;

  return (
    <div className="space-y-6 animate-fade-in min-h-full flex flex-col pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Controle de Lotes & Produção</h2>
          <p className="text-sm text-theme-text-muted mt-1">Gerenciamento completo de Postura, Chocadeira/Pintinhos e Engorda.</p>
        </div>
        {activeTab === 'postura' && (
          <button onClick={() => setShowPostura(true)} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
            <Plus size={18}/>Cadastrar Lote Postura
          </button>
        )}
        {activeTab === 'pintinhos' && (
          <button onClick={() => setShowNewIncubator(true)} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
            <Plus size={18}/>Nova Setagem de Chocadeira
          </button>
        )}
        {activeTab === 'engorda' && (
          <button onClick={() => setShowEngorda(true)} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
            <Plus size={18}/>Cadastrar Lote Engorda
          </button>
        )}
      </div>

      {/* Tabs Principais (Postura -> Pintinhos -> Engorda) */}
      <div className="flex items-center gap-2 sm:gap-6 border-b border-theme-border overflow-x-auto pb-px">
        {[
          { id: 'postura', icon: Egg, label: 'Lotes de Postura' },
          { id: 'pintinhos', icon: Flame, label: 'Pintinhos & Chocadeira' },
          { id: 'engorda', icon: Beef, label: 'Lotes de Engorda' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`pb-3 px-2 text-sm font-bold transition-all flex items-center gap-2 shrink-0 whitespace-nowrap ${
              activeTab === t.id
                ? 'text-theme-primary border-b-2 border-theme-primary'
                : 'text-theme-text-muted hover:text-white'
            }`}
          >
            <t.icon size={16}/>{t.label}
          </button>
        ))}
      </div>

      {/* ── 1. POSTURA TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'postura' && (
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Lotes de Postura Ativos', value: eggLots.filter((l: EggLot) => l.status === 'Ativo').length, unit: '' },
              { label: 'Expectativa Diária', value: totalExpDiaria, unit: 'ovos/dia' },
              { label: 'Fêmeas em Postura', value: totalFemeaAtivas, unit: 'matrizes' },
            ].map(s => (
              <div key={s.label} className="premium-card p-4">
                <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <h3 className="text-2xl font-black text-white">{s.value}{s.unit && <span className="text-xs font-medium text-theme-text-muted ml-1">{s.unit}</span>}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {eggLots.map((lot: EggLot) => {
              const dias = calcDays(lot.dataInicio);
              const qtdF = Math.max(lot.qtdFemeas || 0, lot.femeasIds.length);
              const registros: EggRecord[] = lot.registros || [];
              const totalColetados = registros.reduce((a: number, r: any) => a + r.quantidade, 0);
              const totalVendidos = (lot.ovosVendidosTotal || 0) + registros.reduce((a, r) => a + (r.vendidos || 0), 0);
              const totalIncubados = (lot.ovosIncubadosTotal || 0) + registros.reduce((a, r) => a + (r.incubados || 0), 0);
              const estoque = Math.max(0, totalColetados - totalVendidos - totalIncubados);

              const mediaUlt7 = (() => {
                const sorted = [...registros].sort((a: EggRecord, b: EggRecord) => b.data.localeCompare(a.data)).slice(0, 7);
                if (!sorted.length) return 0;
                return Math.round(sorted.reduce((a: number, r: EggRecord) => a + r.quantidade, 0) / sorted.length);
              })();
              const efic = lot.expectativaDiaria > 0
                ? Math.round((mediaUlt7 / lot.expectativaDiaria) * 100)
                : null;

              return (
                <div
                  key={lot.id}
                  onClick={() => setSelectedEggLotId(lot.id)}
                  className="premium-card p-5 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col gap-4 cursor-pointer"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Egg size={100} /></div>

                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-theme-primary uppercase mb-0.5 block">Baia {lot.baia}{lot.raca ? ` · ${lot.raca}` : ''}</span>
                      <h3 className="font-black text-lg text-white group-hover:text-amber-400 transition-colors flex items-center gap-2">
                        Lote de Postura
                        <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
                      </h3>
                    </div>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${lot.status === 'Ativo' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-theme-base text-theme-text-muted border border-theme-border'}`}>{lot.status}</span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: 'Idade', value: `${dias}d` },
                      { label: 'Meta/dia', value: `${lot.expectativaDiaria}` },
                      { label: 'Fêmeas', value: qtdF },
                      { label: 'Estoque Ovos', value: `${estoque} un` },
                    ].map(m => (
                      <div key={m.label} className="bg-theme-surface p-2.5 rounded-xl border border-theme-border/50">
                        <p className="text-[9px] font-bold text-theme-text-muted uppercase mb-0.5 truncate">{m.label}</p>
                        <p className="text-sm font-black text-white">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Eficiência badge */}
                  {efic !== null && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold ${efic >= 80 ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : efic >= 50 ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                      {efic >= 80 ? <TrendingUp size={14} /> : efic >= 50 ? <Minus size={14} /> : <TrendingDown size={14} />}
                      Eficiência (últ. 7 dias): {efic}%
                      <span className="ml-auto text-theme-text-muted font-normal text-[10px]">
                        {totalColetados} coletados
                      </span>
                    </div>
                  )}

                  {/* Botão de Gestão de Ovos */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedEggLotId(lot.id); }}
                    className="w-full py-2.5 bg-theme-primary/10 hover:bg-theme-primary/20 border border-theme-primary/30 text-amber-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 mt-auto"
                  >
                    <Activity size={14} />
                    Abrir Gestão de Ovos & Coletas do Lote
                  </button>
                </div>
              );
            })}

            {eggLots.length === 0 && (
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Egg size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-bold text-white mb-1">Nenhum lote de postura cadastrado</p>
                <p className="text-sm">Cadastre um lote para gerenciar a produção de ovos da baia.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. PINTINHOS & CHOCADEIRA TAB ──────────────────────────────────── */}
      {activeTab === 'pintinhos' && (
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="premium-card p-4">
              <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Ovos em Incubação / Chocadeira</p>
              <h3 className="text-2xl font-black text-white">
                {incubators.reduce((a, i) => a + (i.status !== 'Concluído' ? i.ovosSetados : 0), 0)} <span className="text-xs font-normal text-theme-text-muted">ovos</span>
              </h3>
            </div>
            <div className="premium-card p-4">
              <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Setagens / Chocadeiras Ativas</p>
              <h3 className="text-2xl font-black text-white">
                {incubators.filter(i => i.status !== 'Concluído').length}
              </h3>
            </div>
            <div className="premium-card p-4">
              <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Estimativa de Pintinhos Nascendo</p>
              <h3 className="text-2xl font-black text-amber-400">
                {incubators.reduce((a, i) => a + (i.ovosFerteis || Math.round(i.ovosSetados * 0.85)), 0)} <span className="text-xs font-normal text-theme-text-muted">pintinhos</span>
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {incubators.map(inc => {
              const diasRestantes = calcDays(inc.dataEntrada);
              const diasParaEclosao = Math.max(0, 21 - diasRestantes);
              return (
                <div key={inc.id} className="premium-card p-6 flex flex-col justify-between group overflow-hidden relative border border-theme-border/50 hover:border-theme-primary/50 transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <Flame size={150} />
                  </div>
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold text-theme-primary uppercase block mb-0.5">{inc.raca ? `Raça: ${inc.raca}` : 'Chocadeira / Incubadora'}</span>
                        <h3 className="font-black text-xl text-white">{inc.nome}</h3>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-3 py-1 rounded-full ${
                        diasParaEclosao <= 3
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {diasParaEclosao === 0 ? '🐣 Eclosão Hoje!' : `Eclosão em ${diasParaEclosao} dias`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12}/> Data de Setagem</p>
                        <p className="font-medium text-sm text-white">{fmtDate(inc.dataEntrada)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12}/> Previsão de Nasc.</p>
                        <p className="font-medium text-sm text-theme-primary">{fmtDate(inc.previsaoEclosao)}</p>
                      </div>
                    </div>

                    <div className="bg-theme-base border border-theme-border/50 rounded-xl p-4 flex gap-6 mb-6">
                      <div>
                        <p className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider mb-1">Ovos Setados</p>
                        <p className="font-black text-xl text-white">{inc.ovosSetados}</p>
                      </div>
                      <div className="w-px bg-theme-border/50" />
                      <div>
                        <p className="text-[10px] text-theme-text-muted font-bold uppercase tracking-wider mb-1">Ovos Férteis / Ovoscopia</p>
                        <p className="font-black text-xl text-amber-400">
                          {inc.ovosFerteis ? inc.ovosFerteis : Math.round(inc.ovosSetados * 0.9)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-theme-border">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-1.5 text-theme-text-muted">
                        <Thermometer size={16} className="text-orange-400" />
                        <span className="text-xs font-bold text-white">{inc.temperatura || '37.8 °C'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-theme-text-muted">
                        <Droplets size={16} className="text-blue-400" />
                        <span className="text-xs font-bold text-white">{inc.umidade || '55%'}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => { if(window.confirm('Marcar esta setagem como concluída/nascida?')) editIncubatorBatch(inc.id, { status: 'Concluído' }); }}
                      className="text-xs font-bold text-theme-primary hover:underline"
                    >
                      Marcar Concluído
                    </button>
                  </div>
                </div>
              );
            })}

            {incubators.length === 0 && (
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Flame size={40} className="mx-auto mb-3 opacity-50" />
                <p className="font-bold text-white mb-1">Nenhuma chocadeira ou setagem cadastrada</p>
                <p className="text-sm">Clique no botão "Nova Setagem de Chocadeira" acima para iniciar a incubação de ovos.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3. ENGORDA TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'engorda' && (
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Lotes em Engorda Ativos', value: meatLots.filter((l: MeatLot) => l.status !== 'Abatido').length },
              { label: 'Total de Aves em Engorda', value: meatLots.reduce((a: number, l: MeatLot) => a + (l.status !== 'Abatido' ? (l.avesIds.length || l.qtdAves || 0) : 0), 0) },
            ].map(s => (
              <div key={s.label} className="premium-card p-4">
                <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <h3 className="text-2xl font-black text-white">{s.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {meatLots.map((lote: MeatLot) => {
              const dias = calcDays(lote.dataInicio);
              const qtdA = Math.max(lote.qtdAves || 0, lote.avesIds.length);
              return (
                <div key={lote.id} className="premium-card p-5 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Beef size={100}/></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-theme-primary uppercase mb-0.5 block">Baia {lote.baia}{lote.raca?` · ${lote.raca}`:''}</span>
                      <h3 className="font-black text-lg text-white">Lote de Engorda</h3>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${meatStatusCls(lote.status)}`}>{lote.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      {icon:Timer, label:'Idade', value:`${dias}d`},
                      {icon:Scale, label:'Peso Inicial', value:lote.pesoMedioInicial},
                      {icon:Activity, label:'Aves', value:qtdA},
                    ].map(m=>(
                      <div key={m.label} className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1"><m.icon size={11}/>{m.label}</p>
                        <p className="text-base font-black text-white truncate">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  {lote.pesoMeta&&(
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
                    {lote.avesIds.length>0?(
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                        {lote.avesIds.map((id: string) => {const b=birds.find(x=>x.id===id);return b?(<span key={id} className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-theme-text-muted border border-theme-border">{b.anilha}{b.nome?` (${b.nome})`:''}</span>):null;})}
                      </div>
                    ):(
                      <p className="text-[10px] text-theme-text-muted italic">{qtdA>0?`${qtdA} aves registradas (sem vínculo individual)`:'Nenhuma ave vinculada.'}</p>
                    )}
                    {lote.observacao&&<p className="text-[10px] text-theme-text-muted mt-2 italic">Obs: {lote.observacao}</p>}
                  </div>
                  <div className="border-t border-theme-border/50 pt-3">
                    <p className={labelCls + " mb-2"}>Alterar Status</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Crescimento','Terminação','Abatido'] as const).map(st=>(
                        <button key={st} onClick={()=>editMeatLot(lote.id,{status:st})}
                          className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all ${lote.status===st?'bg-theme-primary text-black border-theme-primary':'bg-theme-surface/50 border-theme-border/50 text-theme-text-muted hover:text-white hover:border-theme-border'}`}>
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {meatLots.length===0&&(
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Beef size={40} className="mx-auto mb-3 opacity-50"/>
                <p className="font-bold text-white mb-1">Nenhum lote de engorda cadastrado</p>
                <p className="text-sm">Cadastre um lote para gerenciar o crescimento e engorda.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: DETALHES & GESTÃO DE OVOS DO LOTE SELECIONADO ─────────── */}
      {selectedLot && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 animate-fade-in" onClick={() => setSelectedEggLotId(null)}>
          <div className="bg-theme-surface border border-theme-border/80 w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] animate-scale-up" onClick={e=>e.stopPropagation()}>
            <div className="sm:hidden w-10 h-1 rounded-full bg-theme-border mx-auto mt-3 mb-1 shrink-0"/>
            
            {/* Header Modal */}
            <div className="px-6 pt-4 pb-4 border-b border-theme-border flex items-center justify-between shrink-0 bg-theme-surface/80">
              <div>
                <span className="text-xs font-bold text-theme-primary uppercase block">Baia {selectedLot.baia}{selectedLot.raca ? ` · ${selectedLot.raca}` : ''}</span>
                <h3 className="font-black text-xl text-white flex items-center gap-2">
                  <Egg className="text-theme-primary" size={22}/> Gestão de Ovos & Produção do Lote
                </h3>
              </div>
              <button onClick={() => setSelectedEggLotId(null)} className="text-theme-text-muted hover:text-white transition-colors p-1">
                <X size={22}/>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Indicadores de Estoque & Destino dos Ovos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-theme-base p-3.5 rounded-xl border border-theme-border">
                  <p className="text-[10px] font-bold text-theme-text-muted uppercase">Coletados (Total)</p>
                  <p className="text-xl font-black text-white mt-1">{selectedTotalColetados} <span className="text-xs font-normal text-theme-text-muted">ovos</span></p>
                </div>
                <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/30">
                  <p className="text-[10px] font-bold text-amber-400 uppercase">Em Estoque Atual</p>
                  <p className="text-xl font-black text-amber-300 mt-1">{selectedEstoqueAtual} <span className="text-xs font-normal text-amber-400/70">ovos</span></p>
                </div>
                <div className="bg-blue-500/10 p-3.5 rounded-xl border border-blue-500/30">
                  <p className="text-[10px] font-bold text-blue-400 uppercase">Em Choco / Incubação</p>
                  <p className="text-xl font-black text-blue-300 mt-1">{selectedTotalIncubados} <span className="text-xs font-normal text-blue-400/70">ovos</span></p>
                </div>
                <div className="bg-green-500/10 p-3.5 rounded-xl border border-green-500/30">
                  <p className="text-[10px] font-bold text-green-400 uppercase">Ovos Vendidos</p>
                  <p className="text-xl font-black text-green-300 mt-1">{selectedTotalVendidos} <span className="text-xs font-normal text-green-400/70">ovos</span></p>
                </div>
              </div>

              {/* Botões de Ação de Destino */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { setIncQtd(String(selectedEstoqueAtual)); setIncNome(`Setagem Baia ${selectedLot.baia}`); setShowIncubateModal(true); }}
                  disabled={selectedEstoqueAtual === 0}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border border-blue-500/40 hover:border-blue-400 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Flame size={16} className="text-blue-400" />
                  Mandar Ovos para Incubação / Chocar
                </button>

                <button
                  onClick={() => { setSellQtd(String(selectedEstoqueAtual)); setShowSellModal(true); }}
                  disabled={selectedEstoqueAtual === 0}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600/30 to-green-600/30 border border-emerald-500/40 hover:border-emerald-400 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShoppingBag size={16} className="text-green-400" />
                  Registrar Venda de Ovos
                </button>
              </div>

              {/* Formulário: Registrar Coleta Diária */}
              <form onSubmit={handleAddColetaRecord} className="bg-theme-base/60 border border-theme-border/60 rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Plus size={16} className="text-theme-primary"/> Registrar Coleta Diária de Ovos neste Lote
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className={labelCls}>Data da Coleta</label>
                    <input type="date" required value={recData} onChange={e=>setRecData(e.target.value)} className={inputCls}/>
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Qtd Ovos Coletados *</label>
                    <input type="number" min="1" required placeholder="Ex: 8" value={recQtd} onChange={e=>setRecQtd(e.target.value)} className={inputCls}/>
                  </div>
                  <div className="space-y-1">
                    <label className={labelCls}>Vendidos no dia (opcional)</label>
                    <input type="number" min="0" placeholder="Ex: 0" value={recVendidos} onChange={e=>setRecVendidos(e.target.value)} className={inputCls}/>
                  </div>
                </div>
                <div className="flex gap-3 items-center">
                  <input type="text" placeholder="Observações (opcional)..." value={recObs} onChange={e=>setRecObs(e.target.value)} className={inputCls + " flex-1"}/>
                  <button type="submit" className="btn-primary py-3 px-6 text-xs whitespace-nowrap font-black">
                    Salvar Coleta
                  </button>
                </div>
              </form>

              {/* Gráfico de Eficiência do Lote */}
              <div className="bg-theme-base/60 border border-theme-border/40 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={14} className="text-amber-400"/> Gráfico de Produção vs Meta Diária
                </h4>
                <EfficencyChart
                  registros={selectedLotRegs}
                  expectativa={selectedLot.expectativaDiaria}
                  precoVenda={selectedLot.precoVendaPadrao ?? 6}
                  custoProd={selectedLot.custoProdPadrao ?? 0.30}
                />
              </div>

              {/* Histórico de Registros do Lote */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Histórico de Coletas Registradas</h4>
                {selectedLotRegs.length > 0 ? (
                  <div className="border border-theme-border rounded-xl overflow-hidden bg-theme-base/40 max-h-56 overflow-y-auto divide-y divide-theme-border/30">
                    {selectedLotRegs.map((reg, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-white/5 transition-colors">
                        <div>
                          <span className="font-bold text-white block">{fmtDate(reg.data)}</span>
                          {reg.observacao && <span className="text-[10px] text-theme-text-muted italic">{reg.observacao}</span>}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-amber-400">{reg.quantidade} ovos</span>
                          {reg.vendidos && <span className="text-green-400 font-bold">{reg.vendidos} vendidos</span>}
                          <button
                            onClick={() => {
                              const nextRegs = selectedLotRegs.filter((_, i) => i !== idx);
                              editEggLot(selectedLot.id, { registros: nextRegs });
                            }}
                            className="p-1 text-theme-text-muted hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-theme-text-muted italic py-4 text-center border border-dashed border-theme-border rounded-xl">
                    Nenhuma coleta gravada para este lote ainda. Preencha o formulário acima para registrar.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: Mandar Ovos para Incubação ───────────────────────────── */}
      {showIncubateModal && selectedLot && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 animate-fade-in" onClick={() => setShowIncubateModal(false)}>
          <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl p-6 max-w-md w-full animate-scale-up space-y-4" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-theme-border pb-3">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <Flame size={20} className="text-blue-400" /> Mandar para Incubação / Chocar
              </h3>
              <button onClick={() => setShowIncubateModal(false)} className="text-theme-text-muted hover:text-white"><X size={18}/></button>
            </div>
            <form onSubmit={handleConfirmIncubate} className="space-y-4">
              <div className="space-y-1">
                <label className={labelCls}>Identificação da Setagem / Chocadeira *</label>
                <input type="text" required value={incNome} onChange={e=>setIncNome(e.target.value)} placeholder="Ex: Chocadeira Digital 01" className={inputCls}/>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className={labelCls}>Quantidade de Ovos a Enviar *</label>
                  <button type="button" onClick={() => setIncQtd(String(selectedEstoqueAtual))} className="text-[10px] text-theme-primary font-bold hover:underline">
                    Usar todo estoque ({selectedEstoqueAtual} ovos)
                  </button>
                </div>
                <input type="number" min="1" max={selectedEstoqueAtual} required value={incQtd} onChange={e=>setIncQtd(e.target.value)} className={inputCls}/>
              </div>
              <p className="text-[11px] text-theme-text-muted">
                Estes ovos serão deduzidos do estoque do lote e uma nova entrada em incubação será criada na aba <strong>Pintinhos & Chocadeira</strong>.
              </p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowIncubateModal(false)} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-xs font-bold text-white">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary py-3 text-xs font-black">Confirmar Envio</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL: Registrar Venda de Ovos ───────────────────────────────── */}
      {showSellModal && selectedLot && createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 animate-fade-in" onClick={() => setShowSellModal(false)}>
          <div className="bg-theme-surface border border-theme-border rounded-2xl shadow-2xl p-6 max-w-md w-full animate-scale-up space-y-4" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-theme-border pb-3">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <ShoppingBag size={20} className="text-green-400" /> Registrar Venda de Ovos
              </h3>
              <button onClick={() => setShowSellModal(false)} className="text-theme-text-muted hover:text-white"><X size={18}/></button>
            </div>
            <form onSubmit={handleConfirmSell} className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <label className={labelCls}>Quantidade de Ovos Vendidos *</label>
                  <button type="button" onClick={() => setSellQtd(String(selectedEstoqueAtual))} className="text-[10px] text-theme-primary font-bold hover:underline">
                    Vender todo estoque ({selectedEstoqueAtual} ovos)
                  </button>
                </div>
                <input type="number" min="1" max={selectedEstoqueAtual} required value={sellQtd} onChange={e=>setSellQtd(e.target.value)} className={inputCls}/>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Valor Total da Venda (R$)</label>
                <input type="number" step="0.01" min="0" placeholder="Ex: 30.00" value={sellValor} onChange={e=>setSellValor(e.target.value)} className={inputCls}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSellModal(false)} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-xs font-bold text-white">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary py-3 text-xs font-black">Confirmar Venda</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Novo Lote Postura ───────────────────────────────────────── */}
      {showPostura && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 animate-fade-in" onClick={resetPostura}>
          <div className="bg-theme-surface border border-theme-border/80 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] animate-scale-up" onClick={e=>e.stopPropagation()}>
            <div className="sm:hidden w-10 h-1 rounded-full bg-theme-border mx-auto mt-3 mb-1 shrink-0"/>
            <div className="px-5 pt-3 pb-4 border-b border-theme-border flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg text-white flex items-center gap-2"><Egg className="text-theme-primary" size={20}/>Novo Lote de Postura</h3>
              <button onClick={resetPostura} className="text-theme-text-muted hover:text-white transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSavePostura} className="flex flex-col overflow-hidden flex-1">
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Baia / Identificação *</SectionLabel>
                    <input required type="text" value={pBaia} onChange={e=>setPBaia(e.target.value)} placeholder="Ex: Baia 04" className={inputCls}/>
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Raça (opcional)</SectionLabel>
                    <div className="relative">
                      <select value={pRaca} onChange={e=>setPRaca(e.target.value)} className={inputCls + " appearance-none pr-8"}>
                        <option value="">-- Selecionar --</option>
                        {breeds.map(br=><option key={br.id} value={br.nome}>{br.nome}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none"/>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <SectionLabel>Data de Início</SectionLabel>
                  <input type="date" required value={pDataInicio} onChange={e=>setPDataInicio(e.target.value)} className={inputCls}/>
                </div>

                <div className="space-y-3 bg-theme-base/40 p-3.5 rounded-2xl border border-theme-border/60">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Composição de Fêmeas no Lote *</SectionLabel>
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-theme-primary/20 text-theme-primary border border-theme-primary/30">
                      Total: {pQtdFemeasAtual} fêmea{pQtdFemeasAtual !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Users size={13} className="text-theme-primary" />
                      1. Selecionar Fêmeas do Criatório ({pFemeas.length} selecionada{pFemeas.length !== 1 ? 's' : ''})
                    </label>
                    <BirdPicker birds={activeFemales} selected={pFemeas} onToggle={handleFemaleToggle} onSelectAll={handleFemaleSelectAll} search={pSearch} onSearch={setPSearch} emptyMsg="Nenhuma fêmea ativa disponível." />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-theme-border/50">
                    <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Plus size={13} className="text-theme-primary" />
                      2. Adicionar quantidade de fêmeas sem cadastro individual
                    </label>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="Ex: 10 (quantidade sem anilha)"
                      value={pQtd}
                      onChange={e => handleExtraFemaleQtdChange(e.target.value)}
                      className={inputCls}
                    />
                  </div>

                  {pQtdFemeasAtual === 0 && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                      <AlertTriangle size={13} className="text-red-400 shrink-0"/>
                      <p className="text-[11px] text-red-300">
                        Selecione fêmeas do criatório ou informe uma quantidade para criar o lote.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <SectionLabel>Expectativa de Ovos por Dia</SectionLabel>
                  <input type="number" min="0" inputMode="numeric" value={pExpectativa} onChange={e=>setPExpectativa(e.target.value)} placeholder="Auto-calculado (85% da qtd)" className={inputCls}/>
                </div>

                <div className="space-y-2">
                  <SectionLabel>Preços Padrão para Ovos</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelCls}>Preço/Dúzia (R$)</label>
                      <input type="number" min="0" step="0.01" placeholder="6.00" value={pPreco} onChange={e=>setPPreco(e.target.value)} className={inputCls}/>
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Custo/Ovo (R$)</label>
                      <input type="number" min="0" step="0.01" placeholder="0.30" value={pCusto} onChange={e=>setPCusto(e.target.value)} className={inputCls}/>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <SectionLabel>Observação (opcional)</SectionLabel>
                  <textarea rows={2} placeholder="Ex: Lote de matrizes pedigree..." value={pObs} onChange={e=>setPObs(e.target.value)} className={inputCls + " resize-none"}/>
                </div>
              </div>
              <div className="p-5 border-t border-theme-border flex gap-3 shrink-0 bg-theme-surface/50">
                <button type="button" onClick={resetPostura} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold text-white">Cancelar</button>
                <button type="submit" disabled={pSubmitDisabled} className="flex-1 py-3 bg-theme-primary text-black rounded-xl text-sm font-black disabled:opacity-40">Criar Lote</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Nova Setagem de Chocadeira ───────────────────────────── */}
      {showNewIncubator && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 animate-fade-in" onClick={() => setShowNewIncubator(false)}>
          <div className="bg-theme-surface border border-theme-border w-full max-w-md rounded-2xl shadow-2xl p-6 animate-scale-up space-y-4" onClick={e=>e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-theme-border pb-3">
              <h3 className="font-black text-lg text-white flex items-center gap-2">
                <Flame className="text-amber-400" size={20}/> Nova Setagem de Chocadeira
              </h3>
              <button onClick={() => setShowNewIncubator(false)} className="text-theme-text-muted hover:text-white"><X size={18}/></button>
            </div>
            <form onSubmit={handleSaveNewIncubator} className="space-y-4">
              <div className="space-y-1">
                <label className={labelCls}>Nome da Chocadeira / Setagem *</label>
                <input type="text" required value={newIncNome} onChange={e=>setNewIncNome(e.target.value)} placeholder="Ex: Chocadeira Digital 02" className={inputCls}/>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Quantidade de Ovos Setados *</label>
                <input type="number" min="1" required value={newIncQtd} onChange={e=>setNewIncQtd(e.target.value)} placeholder="Ex: 60" className={inputCls}/>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Raça Predominante (opcional)</label>
                <input type="text" value={newIncRaca} onChange={e=>setNewIncRaca(e.target.value)} placeholder="Ex: Índio Gigante" className={inputCls}/>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewIncubator(false)} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-xs font-bold text-white">Cancelar</button>
                <button type="submit" className="flex-1 btn-primary py-3 text-xs font-black">Iniciar Setagem</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal Novo Lote Engorda ──────────────────────────────────────── */}
      {showEngorda && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 animate-fade-in" onClick={resetEngorda}>
          <div className="bg-theme-surface border border-theme-border/80 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] animate-scale-up" onClick={e=>e.stopPropagation()}>
            <div className="sm:hidden w-10 h-1 rounded-full bg-theme-border mx-auto mt-3 mb-1 shrink-0"/>
            <div className="px-5 pt-3 pb-4 border-b border-theme-border flex items-center justify-between shrink-0">
              <h3 className="font-black text-lg text-white flex items-center gap-2"><Beef className="text-theme-primary" size={20}/>Novo Lote de Engorda</h3>
              <button onClick={resetEngorda} className="text-theme-text-muted hover:text-white transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveEngorda} className="flex flex-col overflow-hidden flex-1">
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Baia / Identificação *</SectionLabel>
                    <input required type="text" value={eBaia} onChange={e=>setEBaia(e.target.value)} placeholder="Ex: Baia 08" className={inputCls}/>
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Raça (opcional)</SectionLabel>
                    <div className="relative">
                      <select value={eRaca} onChange={e=>setERaca(e.target.value)} className={inputCls + " appearance-none pr-8"}>
                        <option value="">-- Selecionar --</option>
                        {breeds.map(br=><option key={br.id} value={br.nome}>{br.nome}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted pointer-events-none"/>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <SectionLabel>Data de Início</SectionLabel>
                  <input type="date" required value={eDataInicio} onChange={e=>setEDataInicio(e.target.value)} className={inputCls}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Peso Médio Inicial</SectionLabel>
                    <input type="text" required placeholder="Ex: 350g" value={ePesoInicial} onChange={e=>setEPesoInicial(e.target.value)} className={inputCls}/>
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Meta de Abate</SectionLabel>
                    <input type="text" placeholder="Ex: 2.5kg" value={ePesoMeta} onChange={e=>setEPesoMeta(e.target.value)} className={inputCls}/>
                  </div>
                </div>
                <div className="space-y-3 bg-theme-base/40 p-3.5 rounded-2xl border border-theme-border/60">
                  <div className="flex items-center justify-between">
                    <SectionLabel>Composição de Aves no Lote *</SectionLabel>
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-theme-primary/20 text-theme-primary border border-theme-primary/30">
                      Total: {eQtdAvesAtual} ave{eQtdAvesAtual !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Users size={13} className="text-theme-primary" />
                      1. Selecionar Aves do Criatório ({eAves.length} selecionada{eAves.length !== 1 ? 's' : ''})
                    </label>
                    <BirdPicker birds={activeBirds} selected={eAves} onToggle={handleBirdToggle} onSelectAll={handleBirdSelectAll} search={eSearch} onSearch={setESearch} emptyMsg="Nenhuma ave ativa disponível." />
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-theme-border/50">
                    <label className="text-[11px] font-bold text-white flex items-center gap-1.5">
                      <Plus size={13} className="text-theme-primary" />
                      2. Adicionar quantidade de aves sem cadastro individual
                    </label>
                    <input type="number" min="0" inputMode="numeric" placeholder="Ex: 20 (quantidade sem anilha)" value={eQtd} onChange={e=>setEQtd(e.target.value)} className={inputCls}/>
                  </div>
                </div>
                <div className="space-y-1">
                  <SectionLabel>Observação (opcional)</SectionLabel>
                  <textarea rows={2} placeholder="Ex: Lote frango caipira..." value={eObs} onChange={e=>setEObs(e.target.value)} className={inputCls + " resize-none"}/>
                </div>
              </div>
              <div className="p-5 border-t border-theme-border flex gap-3 shrink-0 bg-theme-surface/50">
                <button type="button" onClick={resetEngorda} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold text-white">Cancelar</button>
                <button type="submit" disabled={!eBaia.trim() || eQtdAvesAtual === 0} className="flex-1 py-3 bg-theme-primary disabled:opacity-50 text-black rounded-xl text-sm font-black">Criar Lote</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ── Dialog: Ovos acima do esperado ──────────────────────────────── */}
      {pOverEggWarning && (
        <OverEggWarningDialog
          qtdOvos={pPendingOvos}
          qtdGalinhas={pQtdFemeasAtual}
          onConfirm={() => { setPOverEggWarning(false); doSavePostura(); }}
          onCancel={() => { setPOverEggWarning(false); }}
        />
      )}
    </div>
  );
}
