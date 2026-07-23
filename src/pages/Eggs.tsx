import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../lib/AppContext';
import type { EggDailyRecord, EggLot } from '../lib/AppContext';
import {
  Egg, Plus, TrendingUp, TrendingDown, DollarSign,
  ChevronDown, ChevronUp, X, Check, BarChart2,
  CalendarDays, Layers, AlertCircle, Info
} from 'lucide-react';

// helpers
function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function formatDate(iso: string) { const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}`; }
function daysBetween(a: string, b: string) {
  return Math.max(1, Math.ceil((new Date(b).getTime()-new Date(a).getTime())/86400000)+1);
}
function fmtBRL(n: number) { return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }

// BarChart
function BarChart({ records }: { records: EggDailyRecord[] }) {
  const last14 = [...records].sort((a,b)=>a.data.localeCompare(b.data)).slice(-14);
  if (last14.length === 0) return (
    <div className="h-32 flex items-center justify-center text-xs text-theme-text-muted">Nenhum registro ainda</div>
  );
  const max = Math.max(...last14.map(r=>r.coletados),1);
  const W=280; const H=96; const BAR_W=Math.floor((W-20)/last14.length)-2;
  return (
    <svg viewBox={`0 0 ${W} ${H+20}`} className="w-full" style={{maxHeight:120}}>
      {last14.map((r,i)=>{
        const barH=Math.max(4,(r.coletados/max)*H);
        const vendH=Math.max(0,(r.vendidos/max)*H);
        const perdH=Math.max(0,(r.perdidos/max)*H);
        const x=10+i*(BAR_W+2);
        return (
          <g key={r.id}>
            <rect x={x} y={H-barH} width={BAR_W} height={barH} rx="2" fill="#F59E0B22"/>
            <rect x={x} y={H-vendH} width={BAR_W} height={vendH} rx="2" fill="#10B981" opacity="0.7"/>
            <rect x={x+BAR_W*0.55} y={H-perdH} width={BAR_W*0.45} height={perdH} rx="2" fill="#EF4444" opacity="0.7"/>
            <text x={x+BAR_W/2} y={H+14} textAnchor="middle" fontSize="7" fill="#9CA3AF">{r.data.slice(8)}</text>
          </g>
        );
      })}
      <line x1="10" y1={H} x2={W-10} y2={H} stroke="#374151" strokeWidth="1"/>
    </svg>
  );
}

// KPI Card
function KpiCard({label,value,sub,color='amber',icon:Icon}:{label:string;value:string;sub?:string;color?:'amber'|'green'|'red'|'blue';icon:any}) {
  const colors:Record<string,string>={
    amber:'text-amber-400 bg-amber-400/10 border-amber-400/20',
    green:'text-green-400 bg-green-400/10 border-green-400/20',
    red:'text-red-400 bg-red-400/10 border-red-400/20',
    blue:'text-blue-400 bg-blue-400/10 border-blue-400/20',
  };
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-1 ${colors[color]}`}>
      <div className="flex items-center gap-1.5">
        <Icon size={14}/>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
      </div>
      <p className="text-xl font-black text-white">{value}</p>
      {sub&&<p className="text-[10px] opacity-70">{sub}</p>}
    </div>
  );
}

// Register Day Sheet
type RegForm={data:string;coletados:string;vendidos:string;perdidos:string;precoVenda:string;custoProd:string;observacao:string};
function RegisterDaySheet({lot,onClose,onSave}:{lot:EggLot;onClose:()=>void;onSave:(rec:EggDailyRecord)=>void}) {
  const [form,setForm]=useState<RegForm>({
    data:todayISO(),coletados:'',vendidos:'0',perdidos:'0',
    precoVenda:String(lot.precoVendaPadrao ?? 6),
    custoProd:String(lot.custoProdPadrao ?? 0.30),
    observacao:''
  });
  const [error,setError]=useState('');
  const set=(k:keyof RegForm)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(prev=>({...prev,[k]:e.target.value}));
  const handleSave=()=>{
    const col=parseFloat(form.coletados) || 0;
    const vend=parseFloat(form.vendidos) || 0;
    const perd=parseFloat(form.perdidos) || 0;
    const preco=parseFloat(form.precoVenda) || 0;
    const custo=parseFloat(form.custoProd) || 0;

    if(!col || col <= 0 || isNaN(col)){
      setError('Informe a quantidade válida de ovos coletados.');
      return;
    }
    if((vend + perd) > col){
      setError('Vendidos + Perdidos não pode superar o total de ovos coletados.');
      return;
    }

    onSave({
      id: uid(),
      data: form.data,
      coletados: col,
      vendidos: vend,
      perdidos: perd,
      precoVenda: preco,
      custoProd: custo,
      observacao: form.observacao.trim() || undefined
    });
    onClose();
  };
  const inputCls="w-full bg-theme-base border border-theme-border rounded-xl px-3 py-2.5 text-sm text-white placeholder-theme-text-muted focus:border-theme-primary outline-none transition-colors";
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 animate-fade-in" onClick={onClose}>
      <div className="bg-theme-surface w-full sm:max-w-md rounded-2xl border border-theme-border/60 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-up" onClick={e=>e.stopPropagation()}>
        <div className="sm:hidden w-10 h-1 rounded-full bg-theme-border mx-auto mt-3 mb-1 shrink-0"/>
        <div className="px-5 pt-3 pb-4 border-b border-theme-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-white flex items-center gap-2"><Egg size={16} className="text-amber-400"/>Registrar Dia de Producao</h3>
            <p className="text-xs text-theme-text-muted mt-0.5">Baia {lot.baia}</p>
          </div>
          <button onClick={onClose} className="p-2 text-theme-text-muted hover:text-white rounded-xl transition-colors"><X size={18}/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {error&&<div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400 font-bold"><AlertCircle size={14}/>{error}</div>}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Data</label>
            <input type="date" value={form.data} onChange={set('data')} className={inputCls}/>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Ovos Coletados <span className="text-amber-400">*</span></label>
            <input type="number" min="0" inputMode="numeric" placeholder="Ex: 24" value={form.coletados} onChange={set('coletados')} className={`${inputCls} text-3xl font-black text-center text-amber-400 py-4`}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Vendidos</label>
              <input type="number" min="0" inputMode="numeric" placeholder="0" value={form.vendidos} onChange={set('vendidos')} className={inputCls}/>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Perdidos</label>
              <input type="number" min="0" inputMode="numeric" placeholder="0" value={form.perdidos} onChange={set('perdidos')} className={inputCls}/>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Preço / Dúzia (R$)</label>
              <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="6.00" value={form.precoVenda} onChange={set('precoVenda')} className={inputCls}/>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Custo / Ovo (R$)</label>
              <input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.30" value={form.custoProd} onChange={set('custoProd')} className={inputCls}/>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-theme-text-muted">Observação (opcional)</label>
            <textarea rows={2} placeholder="Ex: Produção baixou por causa do calor..." value={form.observacao} onChange={e=>setForm(p=>({...p,observacao:e.target.value}))} className={`${inputCls} resize-none`}/>
          </div>
        </div>
        <div className="p-5 border-t border-theme-border shrink-0">
          <button onClick={handleSave} className="w-full btn-primary py-3 rounded-xl font-black flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Check size={16}/>Salvar Registro
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Lot Card
function LotCard({lot,birds,onRegister}:{lot:EggLot;birds:ReturnType<typeof useAppContext>['birds'];onRegister:(lot:EggLot)=>void}) {
  const [expanded,setExpanded]=useState(false);
  const records=lot.registros??[];
  const total=records.reduce((s,r)=>s+r.coletados,0);
  const totalVendidos=records.reduce((s,r)=>s+r.vendidos,0);
  const totalPerdidos=records.reduce((s,r)=>s+r.perdidos,0);
  const totalEstoque=total-totalVendidos-totalPerdidos;
  const receita=records.reduce((s,r)=>s+(r.vendidos/12)*r.precoVenda,0);
  // Custo proporcional apenas aos ovos vendidos (evita lucro negativo falso por estoque retido)
  const custo=records.reduce((s,r)=>s+r.vendidos*r.custoProd,0);
  const lucro=receita-custo;
  const dias=daysBetween(lot.dataInicio,todayISO());
  const mediaReal=records.length>0?(total/records.length):0;
  const eficiencia=lot.expectativaDiaria>0?Math.min(100,(mediaReal/lot.expectativaDiaria)*100):0;
  const femeaNomes=lot.femeasIds.map(id=>birds.find(b=>b.id===id)).filter(Boolean).map(b=>b!.nome||b!.anilha).join(', ');
  const isAtivo=lot.status==='Ativo';
  const efBar=Math.min(100,eficiencia);
  return (
    <div className="rounded-2xl border border-theme-border/60 bg-theme-surface overflow-hidden">
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
          <Egg size={18} className="text-amber-400"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-white text-sm">Baia {lot.baia}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isAtivo?'bg-green-500/20 text-green-400':'bg-gray-500/20 text-gray-400'}`}>{lot.status}</span>
          </div>
          <p className="text-xs text-theme-text-muted mt-0.5 truncate">{lot.femeasIds.length} fêmea(s) &bull; Exp. {lot.expectativaDiaria}/dia &bull; Desde {formatDate(lot.dataInicio)}</p>
          {femeaNomes&&<p className="text-[10px] text-theme-text-muted/70 truncate mt-0.5">{femeaNomes}</p>}
        </div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-theme-border border-t border-theme-border">
        {[{label:'Coletados',value:total,color:'text-amber-400'},{label:'Vendidos',value:totalVendidos,color:'text-green-400'},{label:'Perdidos',value:totalPerdidos,color:'text-red-400'},{label:'Estoque',value:totalEstoque,color:'text-blue-400'}].map(s=>(
          <div key={s.label} className="p-2 text-center">
            <p className={`text-base font-black ${s.color}`}>{s.value}</p>
            <p className="text-[9px] text-theme-text-muted uppercase">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="px-4 py-2 border-t border-theme-border flex items-center gap-3">
        <span className="text-[10px] text-theme-text-muted font-bold whitespace-nowrap">Eficiência</span>
        <div className="flex-1 h-1.5 rounded-full bg-theme-base overflow-hidden">
          <div className={`h-full rounded-full transition-all ${efBar>=80?'bg-green-400':efBar>=50?'bg-amber-400':'bg-red-400'}`} style={{width:`${efBar}%`}}/>
        </div>
        <span className={`text-[10px] font-black ${efBar>=80?'text-green-400':efBar>=50?'text-amber-400':'text-red-400'}`}>{eficiencia.toFixed(0)}%</span>
      </div>
      <div className="px-4 pb-4 pt-2 flex items-center gap-2 border-t border-theme-border">
        {isAtivo&&(
          <button onClick={()=>onRegister(lot)} className="flex-1 btn-primary py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all">
            <Plus size={14}/>Registrar Dia
          </button>
        )}
        <button onClick={()=>setExpanded(v=>!v)} className="px-3 py-2 rounded-xl border border-theme-border text-theme-text-muted hover:text-white hover:border-theme-primary transition-all text-xs font-bold flex items-center gap-1 active:scale-95">
          <BarChart2 size={14}/>Análise{expanded?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
        </button>
      </div>
      {expanded&&(
        <div className="border-t border-theme-border bg-theme-base/40 px-4 py-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase text-theme-text-muted mb-2 flex items-center gap-1.5"><BarChart2 size={11}/> Produção (últimos 14 dias)</p>
            <div className="flex items-center gap-4 mb-1">
              {[{color:'bg-amber-400/40',label:'Coletados'},{color:'bg-green-400/70',label:'Vendidos'},{color:'bg-red-400/70',label:'Perdidos'}].map(l=>(
                <div key={l.label} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-sm ${l.color}`}/>
                  <span className="text-[10px] text-theme-text-muted">{l.label}</span>
                </div>
              ))}
            </div>
            <BarChart records={records}/>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
              <p className="text-[10px] text-green-400 font-bold uppercase mb-1">Receita Total</p>
              <p className="text-lg font-black text-white">{fmtBRL(receita)}</p>
              <p className="text-[10px] text-theme-text-muted">{totalVendidos} ovos vendidos</p>
            </div>
            <div className={`rounded-xl p-3 border ${lucro>=0?'bg-blue-500/10 border-blue-500/20':'bg-red-500/10 border-red-500/20'}`}>
              <p className={`text-[10px] font-bold uppercase mb-1 ${lucro>=0?'text-blue-400':'text-red-400'}`}>Lucro Líquido</p>
              <p className={`text-lg font-black ${lucro>=0?'text-white':'text-red-400'}`}>{fmtBRL(lucro)}</p>
              <p className="text-[10px] text-theme-text-muted">Custo: {fmtBRL(custo)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[{label:'Dias ativos',value:`${dias}d`},{label:'Registros',value:records.length},{label:'Média/dia',value:mediaReal.toFixed(1)}].map(m=>( 
              <div key={m.label} className="rounded-xl bg-theme-surface border border-theme-border p-2 text-center">
                <p className="text-sm font-black text-white">{m.value}</p>
                <p className="text-[9px] text-theme-text-muted uppercase">{m.label}</p>
              </div>
            ))}
          </div>
          {records.length>0&&(
            <div>
              <p className="text-[10px] font-bold uppercase text-theme-text-muted mb-2">Histórico de Registros</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {[...records].sort((a,b)=>b.data.localeCompare(a.data)).map(r=>(
                  <div key={r.id} className="flex items-center gap-2 text-xs bg-theme-surface border border-theme-border rounded-xl px-3 py-2">
                    <CalendarDays size={12} className="text-amber-400 shrink-0"/>
                    <span className="text-theme-text-muted w-16 shrink-0">{formatDate(r.data)}</span>
                    <span className="text-amber-400 font-bold">{r.coletados} ovos</span>
                    {r.vendidos>0&&<span className="text-green-400">+{r.vendidos}v</span>}
                    {r.perdidos>0&&<span className="text-red-400">-{r.perdidos}p</span>}
                    <span className="text-theme-text-muted ml-auto">{fmtBRL((r.vendidos/12)*r.precoVenda - r.vendidos*r.custoProd)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main
export function Eggs() {
  const navigate = useNavigate();
  const {eggLots,editEggLot,birds}=useAppContext();
  const [registerTarget,setRegisterTarget]=useState<EggLot|null>(null);
  const [period,setPeriod]=useState<7|30|999>(30);

  const {kpiColetados,kpiVendidos,kpiPerdidos,kpiReceita,kpiCusto,kpiLucro}=useMemo(()=>{
    const cutoff=period===999?'2000-01-01':new Date(Date.now()-period*86400000).toISOString().split('T')[0];
    let col=0,vend=0,perd=0,rec=0,cst=0;
    for(const lot of eggLots){
      for(const r of (lot.registros??[])){
        if(r.data<cutoff)continue;
        col+=r.coletados;vend+=r.vendidos;perd+=r.perdidos;
        rec+=(r.vendidos/12)*r.precoVenda;cst+=r.vendidos*r.custoProd;
      }
    }
    return{kpiColetados:col,kpiVendidos:vend,kpiPerdidos:perd,kpiReceita:rec,kpiCusto:cst,kpiLucro:rec-cst};
  },[eggLots,period]);

  const aproveitamento=kpiColetados>0?Math.round(((kpiColetados-kpiPerdidos)/kpiColetados)*100):0;
  const activeLots=eggLots.filter(l=>l.status==='Ativo');
  const endedLots=eggLots.filter(l=>l.status==='Encerrado');

  function handleSaveRecord(rec:EggDailyRecord){
    if(!registerTarget)return;
    const registros=[...(registerTarget.registros??[]),rec];
    editEggLot(registerTarget.id,{registros});
  }

  const periodLabel=period===7?'7 dias':period===30?'30 dias':'Tudo';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2"><Egg size={22} className="text-amber-400"/>Gestão de Ovos</h2>
          <p className="text-xs text-theme-text-muted mt-0.5">{activeLots.length} lote(s) ativo(s) &bull; {eggLots.reduce((s,l)=>s+(l.registros?.length??0),0)} registros</p>
        </div>
        <div className="flex bg-theme-surface border border-theme-border rounded-xl p-1 gap-1">
          {([7,30,999] as const).map(p=>(
            <button key={p} onClick={()=>setPeriod(p)} className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${period===p?'bg-amber-400 text-black':'text-theme-text-muted hover:text-white'}`}>
              {p===999?'Tudo':`${p}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard icon={Egg} label="Coletados" value={String(kpiColetados)} sub={periodLabel} color="amber"/>
        <KpiCard icon={TrendingUp} label="Aproveitamento" value={`${aproveitamento}%`} sub={`${kpiPerdidos} perdidos`} color={aproveitamento>=80?'green':'red'}/>
        <KpiCard icon={DollarSign} label="Receita" value={fmtBRL(kpiReceita)} sub={`Custo ${fmtBRL(kpiCusto)}`} color="blue"/>
        <KpiCard icon={kpiLucro>=0?TrendingUp:TrendingDown} label="Lucro" value={fmtBRL(kpiLucro)} sub={kpiVendidos+' vendidos'} color={kpiLucro>=0?'green':'red'}/>
      </div>

      {eggLots.length===0&&(
        <div className="rounded-2xl border border-dashed border-theme-border bg-theme-surface/40 p-10 text-center space-y-4">
          <Egg size={40} className="text-amber-400/40 mx-auto"/>
          <div className="space-y-1">
            <p className="text-white font-black text-lg">Nenhum lote de ovos</p>
            <p className="text-theme-text-muted text-sm max-w-xs mx-auto">Crie um lote de postura na aba <strong className="text-white">Lotes</strong> e ele aparecerá aqui automaticamente.</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button 
              onClick={() => navigate('/lots', { state: { tab: 'postura' } })}
              className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs active:scale-95 transition-all text-black bg-theme-primary hover:bg-amber-400"
            >
              <Layers size={14}/>
              <span>Criar Lote de Postura</span>
            </button>
            <div className="flex items-center justify-center gap-1.5 text-xs text-theme-text-muted"><Info size={12}/><span>Lotes &gt; Lote de Postura &gt; Criar novo</span></div>
          </div>
        </div>
      )}

      {activeLots.length>0&&(
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-muted flex items-center gap-2"><Layers size={12}/>Lotes Ativos ({activeLots.length})</h3>
          {activeLots.map(lot=><LotCard key={lot.id} lot={lot} birds={birds} onRegister={setRegisterTarget}/>)}
        </div>
      )}

      {endedLots.length>0&&(
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-theme-text-muted flex items-center gap-2"><Layers size={12}/>Lotes Encerrados ({endedLots.length})</h3>
          {endedLots.map(lot=><LotCard key={lot.id} lot={lot} birds={birds} onRegister={setRegisterTarget}/>)}
        </div>
      )}

      {registerTarget&&(
        <RegisterDaySheet lot={registerTarget} onClose={()=>setRegisterTarget(null)} onSave={handleSaveRecord}/>
      )}
    </div>
  );
}
