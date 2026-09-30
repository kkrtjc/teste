import { useState, useMemo } from 'react';
import { 
  Syringe, ShieldAlert, Shield, Plus, CheckCircle2, 
  Clock, Trash2, Calendar, AlertTriangle, Sparkles 
} from 'lucide-react';
import type { VaccinationRecord, Bird } from '../../lib/AppContext';
import { POULTRY_VACCINE_PROTOCOLS, getVaccineSuggestions } from '../../lib/vaccinationProtocols';

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function fmtDate(iso?: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const inputCls = "w-full bg-theme-base border border-theme-border rounded-xl p-3 text-sm text-white focus:border-theme-primary outline-none transition-colors placeholder-theme-text-muted";
const labelCls = "text-[10px] font-bold text-theme-text-muted uppercase tracking-wider mb-1 block";

interface LotCreationHealthSectionProps {
  lotAgeDays: number;
  isQuarantine: boolean;
  setIsQuarantine: (v: boolean) => void;
  quarantineReason: string;
  setQuarantineReason: (v: string) => void;
  quarantineEnd: string;
  setQuarantineEnd: (v: string) => void;
  vaccines: VaccinationRecord[];
  setVaccines: React.Dispatch<React.SetStateAction<VaccinationRecord[]>>;
  selectedBirdsList?: Bird[];
}

export function LotCreationHealthSection({
  lotAgeDays,
  isQuarantine,
  setIsQuarantine,
  quarantineReason,
  setQuarantineReason,
  quarantineEnd,
  setQuarantineEnd,
  vaccines,
  setVaccines,
  selectedBirdsList = [],
}: LotCreationHealthSectionProps) {
  const [vForm, setVForm] = useState({
    vacina: '',
    protocoloId: '',
    dataAplicada: todayISO(),
    intervaloDias: '',
    observacao: '',
  });
  const [isCustomVaccine, setIsCustomVaccine] = useState(false);

  // Analisa vacinas já existentes nas aves selecionadas
  const birdsKnownVaccines = useMemo(() => {
    const set = new Set<string>();
    selectedBirdsList.forEach(b => {
      if (b.vacinas) {
        b.vacinas.split(/[,;\n]/).forEach(item => {
          const clean = item.trim();
          if (clean) set.add(clean);
        });
      }
    });
    return Array.from(set);
  }, [selectedBirdsList]);

  // Sugestões inteligentes
  const appliedProtocolIds = useMemo(() => {
    return vaccines
      .filter(v => v.protocoloId)
      .map(v => v.protocoloId!);
  }, [vaccines]);

  const { overdue, upcoming } = useMemo(
    () => getVaccineSuggestions(lotAgeDays, appliedProtocolIds),
    [lotAgeDays, appliedProtocolIds]
  );

  const handleSelectProtocol = (protocoloId: string) => {
    const p = POULTRY_VACCINE_PROTOCOLS.find(x => x.id === protocoloId);
    if (!p) return;
    setVForm(prev => ({
      ...prev,
      vacina: p.nome,
      protocoloId: p.id,
      intervaloDias: p.intervaloReforco ? String(p.intervaloReforco) : '',
    }));
    setIsCustomVaccine(false);
  };

  const handleAddVaccine = () => {
    const vacinaName = isCustomVaccine ? vForm.vacina.trim() : vForm.vacina;
    if (!vacinaName || !vForm.dataAplicada) return;

    const intervalo = parseInt(vForm.intervaloDias) || undefined;
    const proximaDose = intervalo ? addDays(vForm.dataAplicada, intervalo) : undefined;

    const record: VaccinationRecord = {
      id: uid(),
      vacina: vacinaName,
      dataAplicada: vForm.dataAplicada,
      dataProximaDose: proximaDose,
      intervaloDias: intervalo,
      loteIdadeAplicacaoDias: lotAgeDays,
      protocoloId: isCustomVaccine ? undefined : vForm.protocoloId || undefined,
      status: 'Aplicada',
      observacao: vForm.observacao.trim() || undefined,
    };

    setVaccines(prev => [...prev, record]);
    setVForm(prev => ({ ...prev, vacina: '', protocoloId: '', intervaloDias: '', observacao: '' }));
    setIsCustomVaccine(false);
  };

  const handleDeleteVaccine = (id: string) => {
    setVaccines(prev => prev.filter(v => v.id !== id));
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── CARD DE STATUS DE QUARENTENA ── */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isQuarantine 
          ? 'bg-rose-500/10 border-rose-500/40 shadow-lg shadow-rose-950/20' 
          : 'bg-theme-base/60 border-theme-border/70'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isQuarantine 
              ? <ShieldAlert size={22} className="text-rose-400 shrink-0" />
              : <Shield size={22} className="text-theme-text-muted shrink-0" />
            }
            <div>
              <p className="text-xs font-black text-white">Quarentena Imediata do Lote</p>
              <p className="text-[11px] text-theme-text-muted">
                {isQuarantine ? '🔴 Lote será criado sob quarentena e isolamento' : 'Aves sem suspeitas, lote entra em circulação normal'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsQuarantine(!isQuarantine)}
            className={`relative w-12 h-6 rounded-full transition-all cursor-pointer ${
              isQuarantine ? 'bg-rose-500' : 'bg-theme-border'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                isQuarantine ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        {isQuarantine && (
          <div className="mt-3 pt-3 border-t border-rose-500/20 space-y-3 animate-fade-in">
            <div>
              <label className={labelCls}>Motivo da Quarentena *</label>
              <input
                type="text"
                placeholder="Ex: Aves recém-chegadas de outro criatório"
                value={quarantineReason}
                onChange={e => setQuarantineReason(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Data Prevista de Liberação (opcional)</label>
              <input
                type="date"
                value={quarantineEnd}
                onChange={e => setQuarantineEnd(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── HISTÓRICO DE VACINAS DAS AVES SELECIONADAS ── */}
      {birdsKnownVaccines.length > 0 && (
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs space-y-1">
          <p className="font-black text-blue-400 flex items-center gap-1.5">
            <Sparkles size={13} />
            Vacinas já registradas nas aves selecionadas:
          </p>
          <div className="flex flex-wrap gap-1">
            {birdsKnownVaccines.map((v, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold">
                ✓ {v}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── SUGESTÕES INTELIGENTES PARA ESTA IDADE ── */}
      {(overdue.length > 0 || upcoming.length > 0) && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-theme-text-muted uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-400" />
            Sugestões com base na idade ({lotAgeDays} dias):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {overdue.map(v => (
              <div
                key={v.id}
                onClick={() => handleSelectProtocol(v.id)}
                className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 cursor-pointer hover:bg-rose-500/15 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-rose-400 truncate flex items-center gap-1">
                    <AlertTriangle size={12} /> {v.nome}
                  </p>
                  <p className="text-[10px] text-theme-text-muted">Aos {v.idadeAplicacaoDias} dias (atrasada)</p>
                </div>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 font-bold px-2 py-1 rounded-lg shrink-0">
                  + Adicionar
                </span>
              </div>
            ))}

            {upcoming.map(v => (
              <div
                key={v.id}
                onClick={() => handleSelectProtocol(v.id)}
                className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-500/15 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-amber-400 truncate flex items-center gap-1">
                    <Clock size={12} /> {v.nome}
                  </p>
                  <p className="text-[10px] text-theme-text-muted">Aos {v.idadeAplicacaoDias} dias (em breve)</p>
                </div>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-1 rounded-lg shrink-0">
                  + Adicionar
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FORMULÁRIO DE ADIÇÃO DE VACINA ── */}
      <div className="p-3.5 rounded-xl bg-theme-base/60 border border-theme-border/70 space-y-3">
        <p className="text-xs font-black text-white flex items-center gap-1.5">
          <Syringe size={14} className="text-emerald-400" />
          Atribuir Vacina ao Lote
        </p>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsCustomVaccine(false)}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              !isCustomVaccine ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-theme-base border border-theme-border text-theme-text-muted'
            }`}
          >
            Protocolo Padrão
          </button>
          <button
            type="button"
            onClick={() => { setIsCustomVaccine(true); setVForm(p => ({ ...p, vacina: '', protocoloId: '' })); }}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isCustomVaccine ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400' : 'bg-theme-base border border-theme-border text-theme-text-muted'
            }`}
          >
            Personalizada
          </button>
        </div>

        {isCustomVaccine ? (
          <input
            type="text"
            placeholder="Nome da vacina (ex: Newcastle Oleosa)"
            value={vForm.vacina}
            onChange={e => setVForm(p => ({ ...p, vacina: e.target.value }))}
            className={inputCls}
          />
        ) : (
          <select
            value={vForm.protocoloId}
            onChange={e => handleSelectProtocol(e.target.value)}
            className={inputCls}
          >
            <option value="">-- Escolher do Protocolo BR --</option>
            {POULTRY_VACCINE_PROTOCOLS.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome} ({p.idadeAplicacaoDias}d){p.obrigatoria ? ' ★' : ''}
              </option>
            ))}
          </select>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelCls}><Calendar size={10} className="inline mr-1" />Data Aplicação</label>
            <input
              type="date"
              value={vForm.dataAplicada}
              onChange={e => setVForm(p => ({ ...p, dataAplicada: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Reforço em (dias)</label>
            <input
              type="number"
              placeholder="Ex: 21"
              value={vForm.intervaloDias}
              onChange={e => setVForm(p => ({ ...p, intervaloDias: e.target.value }))}
              className={inputCls}
              min="0"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddVaccine}
          disabled={!vForm.vacina && !vForm.protocoloId}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} /> Atribuir Vacina ao Lote
        </button>
      </div>

      {/* ── LISTA DE VACINAS CONFIGURADAS PARA O LOTE ── */}
      {vaccines.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-theme-text-muted uppercase tracking-wider">
            Vacinas Atribuídas a este Lote ({vaccines.length})
          </p>
          <div className="space-y-1.5">
            {vaccines.map(v => (
              <div key={v.id} className="p-2.5 rounded-xl bg-theme-base border border-theme-border flex items-center justify-between text-xs">
                <div>
                  <p className="font-black text-white flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>{v.vacina}</span>
                  </p>
                  <p className="text-[10px] text-theme-text-muted">
                    Aplicada: {fmtDate(v.dataAplicada)} {v.dataProximaDose ? `· Reforço: ${fmtDate(v.dataProximaDose)}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteVaccine(v.id)}
                  className="p-1 text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
