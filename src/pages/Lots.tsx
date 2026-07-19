import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Egg, Scale, Beef, Timer, Plus, Activity, X, Search, Check,
  DollarSign, Info, ChevronDown, Users, Trash2
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
        <input type="text" placeholder="Buscar por anilha, raca ou nome..."
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

export function Lots() {
  const { 
    birds, breeds, eggLots, addEggLot, editEggLot, removeEggLot,
    meatLots, addMeatLot, editMeatLot, removeMeatLot 
  } = useAppContext();
  const [activeTab, setActiveTab] = useState<'postura'|'engorda'>('postura');

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

  const activeFemales = birds.filter(b=>b.sexo==='Fêmea'&&b.status!=='Vendido'&&b.status!=='Faleceu');
  const activeBirds = birds.filter(b=>b.status!=='Vendido'&&b.status!=='Faleceu');

  const handleFemaleToggle = (id: string) => {
    const next = pFemeas.includes(id) ? pFemeas.filter(x=>x!==id) : [...pFemeas, id];
    setPFemeas(next);
    setPExpectativa(String(Math.round(next.length*0.85)));
  };
  const handleFemaleSelectAll = (ids: string[]) => {
    const allSel = ids.every(id=>pFemeas.includes(id));
    const next = allSel ? pFemeas.filter(id=>!ids.includes(id)) : Array.from(new Set([...pFemeas,...ids]));
    setPFemeas(next);
    setPExpectativa(String(Math.round(next.length*0.85)));
  };

  const resetPostura = () => {
    setShowPostura(false); setPBaia(''); setPRaca(''); setPDataInicio(todayISO());
    setPMode('select'); setPFemeas([]); setPQtd(''); setPSearch('');
    setPExpectativa(''); setPPreco('6.00'); setPCusto('0.30'); setPObs('');
  };

  const handleSavePostura = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pBaia.trim()) return;
    const femeasIds = pMode==='select' ? pFemeas : [];
    const qtdFemeas = pMode==='qty' ? parseInt(pQtd)||0 : pFemeas.length;
    addEggLot({
      id: uid(),
      baia: pBaia.trim(),
      femeasIds,
      qtdFemeas,
      expectativaDiaria: parseInt(pExpectativa)||0,
      dataInicio: pDataInicio,
      status: 'Ativo',
      raca: pRaca.trim()||undefined,
      precoVendaPadrao: parseFloat(pPreco)||6,
      custoProdPadrao: parseFloat(pCusto)||0.30,
      observacao: pObs.trim()||undefined,
    });
    resetPostura();
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

  const handleSaveEngorda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eBaia.trim()) return;
    const avesIds = eMode==='select' ? eAves : [];
    const qtdAves = eMode==='qty' ? parseInt(eQtd)||0 : eAves.length;
    addMeatLot({
      id: uid(),
      baia: eBaia.trim(),
      avesIds,
      qtdAves,
      dataInicio: eDataInicio,
      pesoMedioInicial: ePesoInicial.trim()||'0',
      pesoMeta: ePesoMeta.trim()||undefined,
      status: 'Crescimento',
      raca: eRaca.trim()||undefined,
      observacao: eObs.trim()||undefined,
    });
    resetEngorda();
  };

  const meatStatusCls = (s:string) => {
    if(s==='Crescimento') return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    if(s==='Terminação') return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  };

  const totalFemeaAtivas = eggLots.reduce((a,l)=>a+(l.status==='Ativo'?(l.femeasIds.length||l.qtdFemeas||0):0),0);
  const totalExpDiaria   = eggLots.reduce((a,l)=>a+(l.status==='Ativo'?l.expectativaDiaria:0),0);

  return (
    <div className="space-y-6 animate-fade-in min-h-full flex flex-col pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Controle de Lotes</h2>
          <p className="text-sm text-theme-text-muted mt-1">Gerenciamento de lotes de postura e engorda do criatório.</p>
        </div>
        {activeTab==='postura'
          ? <button onClick={()=>setShowPostura(true)} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"><Plus size={18}/>Cadastrar Lote Postura</button>
          : <button onClick={()=>setShowEngorda(true)} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"><Plus size={18}/>Cadastrar Lote Engorda</button>
        }
      </div>

      {/* ── Tabs (Glassmorphic Pill Bar) ── */}
      <div className="flex p-1 bg-theme-surface border border-theme-border/40 rounded-full overflow-x-auto hide-scrollbar shrink-0 w-full sm:w-auto max-w-md self-start gap-1">
        {[{id:'postura',icon:Egg,label:'Lotes de Postura'},{id:'engorda',icon:Beef,label:'Lotes de Engorda'}].map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id as any)}
            className={`flex-1 sm:flex-none text-center px-4 py-2 text-xs font-black transition-all rounded-full whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeTab === t.id 
                ? 'bg-theme-primary text-black shadow-[0_2px_10px_rgba(245,158,11,0.2)]' 
                : 'text-theme-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <t.icon size={14}/>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab==='postura'&&(
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              {label:'Lotes Ativos', value:eggLots.filter(l=>l.status==='Ativo').length, unit:''},
              {label:'Expectativa Diária', value:totalExpDiaria, unit:'ovos/dia'},
              {label:'Fêmeas em Postura', value:totalFemeaAtivas, unit:''},
            ].map(s=>(
              <div key={s.label} className="premium-card p-4">
                <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <h3 className="text-2xl font-black text-white">{s.value}{s.unit&&<span className="text-xs font-medium text-theme-text-muted ml-1">{s.unit}</span>}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {eggLots.map(lot=>{
              const dias = calcDays(lot.dataInicio);
              const qtdF = lot.femeasIds.length || lot.qtdFemeas || 0;
              return (
                <div key={lot.id} className="premium-card p-5 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Egg size={100}/></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-theme-primary uppercase mb-0.5 block">Baia {lot.baia}{lot.raca?` · ${lot.raca}`:''}</span>
                      <h3 className="font-black text-lg text-white">Lote de Postura</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${lot.status==='Ativo'?'bg-green-500/20 text-green-400 border border-green-500/20':'bg-theme-base text-theme-text-muted border border-theme-border'}`}>{lot.status}</span>
                      <button onClick={()=>{if(window.confirm('Deseja realmente apagar este lote de postura permanentemente?')) removeEggLot(lot.id);}}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-all" title="Apagar Lote">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      {icon:Timer, label:'Idade', value:`${dias}d`},
                      {icon:Egg, label:'Meta/dia', value:`${lot.expectativaDiaria} ovos`},
                      {icon:Users, label:'Fêmeas', value:qtdF},
                    ].map(m=>(
                      <div key={m.label} className="bg-theme-surface p-3 rounded-xl border border-theme-border/50">
                        <p className="text-[10px] font-bold text-theme-text-muted uppercase mb-1 flex items-center gap-1"><m.icon size={11}/>{m.label}</p>
                        <p className="text-base font-black text-white">{m.value}</p>
                      </div>
                    ))}
                  </div>
                  {(lot.precoVendaPadrao||lot.custoProdPadrao)&&(
                    <div className="flex gap-3 mb-4">
                      {lot.precoVendaPadrao&&(
                        <div className="flex-1 bg-green-500/10 border border-green-500/20 rounded-xl p-2.5">
                          <p className="text-[10px] text-green-400 font-bold">Preco/Duzia</p>
                          <p className="text-sm font-black text-white">R$ {lot.precoVendaPadrao.toFixed(2)}</p>
                        </div>
                      )}
                      {lot.custoProdPadrao&&(
                        <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-xl p-2.5">
                          <p className="text-[10px] text-blue-400 font-bold">Custo/Ovo</p>
                          <p className="text-sm font-black text-white">R$ {lot.custoProdPadrao.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="pt-3 border-t border-theme-border/50 mt-auto">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase">Aves Vinculadas ({lot.femeasIds.length})</p>
                      <p className="text-[10px] text-theme-text-muted">Inicio: {fmtDate(lot.dataInicio)}</p>
                    </div>
                    {lot.femeasIds.length>0?(
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                        {lot.femeasIds.map(id=>{const b=birds.find(x=>x.id===id);return b?(<span key={id} className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-theme-text-muted border border-theme-border">{b.anilha}{b.nome?` (${b.nome})`:''}</span>):null;})}
                      </div>
                    ):(
                      <p className="text-[10px] text-theme-text-muted italic">{qtdF>0?`${qtdF} femeas registradas (sem vinculo individual)`:'Nenhuma ave vinculada.'}</p>
                    )}
                    {lot.observacao&&<p className="text-[10px] text-theme-text-muted mt-2 italic">Obs: {lot.observacao}</p>}
                  </div>
                  {lot.status==='Ativo'&&(
                    <button onClick={()=>{if(window.confirm('Deseja encerrar este lote?'))editEggLot(lot.id,{status:'Encerrado'});}}
                      className="mt-4 w-full py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs rounded-xl transition-all">
                      Encerrar Lote
                    </button>
                  )}
                </div>
              );
            })}
            {eggLots.length===0&&(
              <div className="col-span-full text-center p-12 bg-theme-surface/30 rounded-xl border-dashed border border-theme-border text-theme-text-muted">
                <Egg size={40} className="mx-auto mb-3 opacity-50"/>
                <p className="font-bold text-white mb-1">Nenhum lote de postura cadastrado</p>
                <p className="text-sm">Cadastre um lote para gerenciar sua producao de ovos.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab==='engorda'&&(
        <div className="flex-1 flex flex-col space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {[
              {label:'Lotes Ativos', value:meatLots.filter(l=>l.status!=='Abatido').length},
              {label:'Aves em Engorda', value:meatLots.reduce((a,l)=>a+(l.status!=='Abatido'?(l.avesIds.length||l.qtdAves||0):0),0)},
            ].map(s=>(
              <div key={s.label} className="premium-card p-4">
                <p className="text-theme-text-muted text-[10px] font-bold uppercase tracking-wider mb-1">{s.label}</p>
                <h3 className="text-2xl font-black text-white">{s.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {meatLots.map(lote=>{
              const dias = calcDays(lote.dataInicio);
              const qtdA = lote.avesIds.length||lote.qtdAves||0;
              return (
                <div key={lote.id} className="premium-card p-5 border border-theme-border/50 hover:border-theme-primary/50 transition-all group relative overflow-hidden flex flex-col">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Beef size={100}/></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-theme-primary uppercase mb-0.5 block">Baia {lote.baia}{lote.raca?` · ${lote.raca}`:''}</span>
                      <h3 className="font-black text-lg text-white">Lote de Engorda</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md ${meatStatusCls(lote.status)}`}>{lote.status}</span>
                      <button onClick={()=>{if(window.confirm('Deseja realmente apagar este lote de engorda permanentemente?')) removeMeatLot(lote.id);}}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-all" title="Apagar Lote">
                        <Trash2 size={13}/>
                      </button>
                    </div>
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
                      <p className="text-[10px] text-theme-text-muted">Inicio: {fmtDate(lote.dataInicio)}</p>
                    </div>
                    {lote.avesIds.length>0?(
                      <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                        {lote.avesIds.map(id=>{const b=birds.find(x=>x.id===id);return b?(<span key={id} className="text-[10px] bg-theme-surface px-2 py-1 rounded-md text-theme-text-muted border border-theme-border">{b.anilha}{b.nome?` (${b.nome})`:''}</span>):null;})}
                      </div>
                    ):(
                      <p className="text-[10px] text-theme-text-muted italic">{qtdA>0?`${qtdA} aves registradas (sem vinculo individual)`:'Nenhuma ave vinculada.'}</p>
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
                <p className="text-sm">Cadastre um lote para gerenciar crescimento e abate.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showPostura&&createPortal(
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
                    <SectionLabel>Baia / Identificacao *</SectionLabel>
                    <input required type="text" value={pBaia} onChange={e=>setPBaia(e.target.value)} placeholder="Ex: Baia 04" className={inputCls}/>
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Raca (opcional)</SectionLabel>
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
                  <SectionLabel>Data de Inicio</SectionLabel>
                  <input type="date" required value={pDataInicio} onChange={e=>setPDataInicio(e.target.value)} className={inputCls}/>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Femeas no Lote</SectionLabel>
                  <ModeToggle mode={pMode} onChange={m=>{setPMode(m);setPFemeas([]);setPQtd('');}} label1="Selecionar aves" label2="Informar quantidade"/>
                  {pMode==='select'
                    ? <BirdPicker birds={activeFemales} selected={pFemeas} onToggle={handleFemaleToggle} onSelectAll={handleFemaleSelectAll} search={pSearch} onSearch={setPSearch} emptyMsg="Nenhuma femea disponivel. Cadastre aves primeiro."/>
                    : (
                      <div className="space-y-1">
                        <SectionLabel>Quantidade de Femeas</SectionLabel>
                        <input type="number" min="1" inputMode="numeric" placeholder="Ex: 30" value={pQtd}
                          onChange={e=>{setPQtd(e.target.value);setPExpectativa(String(Math.round((parseInt(e.target.value)||0)*0.85)));}}
                          className={inputCls + " text-2xl font-black text-center py-4"}/>
                      </div>
                    )
                  }
                </div>
                <div className="space-y-1">
                  <SectionLabel>Expectativa de Ovos por Dia</SectionLabel>
                  <div className="relative">
                    <input type="number" min="0" inputMode="numeric" value={pExpectativa} onChange={e=>setPExpectativa(e.target.value)} placeholder="Auto-calculado (85% da qtd)" className={inputCls}/>
                  </div>
                  <p className="text-[10px] text-theme-text-muted flex items-center gap-1"><Info size={10}/>Calculado automaticamente em 85% das femeas. Voce pode ajustar manualmente.</p>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Precos Padrao para aba Ovos</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelCls}>Preco/Duzia (R$)</label>
                      <div className="relative">
                        <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400"/>
                        <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="6.00" value={pPreco} onChange={e=>setPPreco(e.target.value)} className={inputCls + " pl-8"}/>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className={labelCls}>Custo/Ovo (R$)</label>
                      <div className="relative">
                        <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"/>
                        <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.30" value={pCusto} onChange={e=>setPCusto(e.target.value)} className={inputCls + " pl-8"}/>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-theme-text-muted flex items-center gap-1"><Info size={10}/>Esses valores serao preenchidos automaticamente ao registrar producao na aba Ovos.</p>
                </div>
                <div className="space-y-1">
                  <SectionLabel>Observacao (opcional)</SectionLabel>
                  <textarea rows={2} placeholder="Ex: Lote de matrizes pedigree..." value={pObs} onChange={e=>setPObs(e.target.value)} className={inputCls + " resize-none"}/>
                </div>
              </div>
              <div className="p-5 border-t border-theme-border flex gap-3 shrink-0 bg-theme-surface/50">
                <button type="button" onClick={resetPostura} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold text-white hover:border-theme-primary transition-all">Cancelar</button>
                <button type="submit" disabled={!pBaia.trim()} className="flex-1 py-3 bg-theme-primary disabled:opacity-50 text-black rounded-xl text-sm font-black transition-all active:scale-95">Criar Lote</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {showEngorda&&createPortal(
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
                    <SectionLabel>Baia / Identificacao *</SectionLabel>
                    <input required type="text" value={eBaia} onChange={e=>setEBaia(e.target.value)} placeholder="Ex: Baia 08" className={inputCls}/>
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Raca (opcional)</SectionLabel>
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
                  <SectionLabel>Data de Inicio</SectionLabel>
                  <input type="date" required value={eDataInicio} onChange={e=>setEDataInicio(e.target.value)} className={inputCls}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <SectionLabel>Peso Medio Inicial</SectionLabel>
                    <input type="text" required placeholder="Ex: 350g" value={ePesoInicial} onChange={e=>setEPesoInicial(e.target.value)} className={inputCls}/>
                  </div>
                  <div className="space-y-1">
                    <SectionLabel>Meta de Abate</SectionLabel>
                    <input type="text" placeholder="Ex: 2.5kg" value={ePesoMeta} onChange={e=>setEPesoMeta(e.target.value)} className={inputCls}/>
                  </div>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Aves no Lote</SectionLabel>
                  <ModeToggle mode={eMode} onChange={m=>{setEMode(m);setEAves([]);setEQtd('');}} label1="Selecionar aves" label2="Informar quantidade"/>
                  {eMode==='select'
                    ? <BirdPicker birds={activeBirds} selected={eAves} onToggle={handleBirdToggle} onSelectAll={handleBirdSelectAll} search={eSearch} onSearch={setESearch} emptyMsg="Nenhuma ave ativa disponivel."/>
                    : (
                      <div className="space-y-1">
                        <SectionLabel>Quantidade de Aves</SectionLabel>
                        <input type="number" min="1" inputMode="numeric" placeholder="Ex: 50" value={eQtd} onChange={e=>setEQtd(e.target.value)} className={inputCls + " text-2xl font-black text-center py-4"}/>
                      </div>
                    )
                  }
                </div>
                <div className="space-y-1">
                  <SectionLabel>Observacao (opcional)</SectionLabel>
                  <textarea rows={2} placeholder="Ex: Lote frango caipira..." value={eObs} onChange={e=>setEObs(e.target.value)} className={inputCls + " resize-none"}/>
                </div>
              </div>
              <div className="p-5 border-t border-theme-border flex gap-3 shrink-0 bg-theme-surface/50">
                <button type="button" onClick={resetEngorda} className="flex-1 py-3 bg-theme-surface border border-theme-border rounded-xl text-sm font-bold text-white hover:border-theme-primary transition-all">Cancelar</button>
                <button type="submit" disabled={!eBaia.trim()} className="flex-1 py-3 bg-theme-primary disabled:opacity-50 text-black rounded-xl text-sm font-black transition-all active:scale-95">Criar Lote</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
