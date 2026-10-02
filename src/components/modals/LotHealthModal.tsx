import { useState, useEffect, useMemo } from 'react';
import {
  X, Syringe, Shield, ShieldAlert, AlertTriangle, Plus,
  CheckCircle2, Clock, Trash2, Calendar
} from 'lucide-react';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import type { VaccinationRecord, QuarantineRecord } from '../../lib/AppContext';
import { POULTRY_VACCINE_PROTOCOLS, getVaccineSuggestions } from '../../lib/vaccinationProtocols';

interface LotHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  lotName: string;
  lotAgeDays: number;
  vaccinationRecords: VaccinationRecord[];
  quarentena?: QuarantineRecord;
  onSaveVaccinations: (records: VaccinationRecord[]) => void;
  onSaveQuarentena: (q: QuarantineRecord | undefined) => void;
}

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

type ActiveTab = 'vacinas' | 'quarentena';

export function LotHealthModal({
  isOpen,
  onClose,
  lotName,
  lotAgeDays,
  vaccinationRecords,
  quarentena,
  onSaveVaccinations,
  onSaveQuarentena,
}: LotHealthModalProps) {
  useModalScrollLock(isOpen);

  const [activeTab, setActiveTab] = useState<ActiveTab>('vacinas');
  const [localVaccines, setLocalVaccines] = useState<VaccinationRecord[]>([]);
  const [localQuarentena, setLocalQuarentena] = useState<QuarantineRecord | undefined>(undefined);

  // Form state for new vaccine
  const [vForm, setVForm] = useState({
    vacina: '',
    protocoloId: '',
    dataAplicada: todayISO(),
    intervaloDias: '',
    observacao: '',
  });
  const [isCustomVaccine, setIsCustomVaccine] = useState(false);

  // Quarantine form
  const [qForm, setQForm] = useState({
    ativa: false,
    dataInicio: todayISO(),
    motivoQuarentena: '',
    dataPrevistaSaida: '',
    observacoes: '',
  });

  useEffect(() => {
    if (isOpen) {
      setLocalVaccines([...(vaccinationRecords || [])]);
      setLocalQuarentena(quarentena);
      setActiveTab('vacinas');
      setVForm({
        vacina: '',
        protocoloId: '',
        dataAplicada: todayISO(),
        intervaloDias: '',
        observacao: '',
      });
      setIsCustomVaccine(false);

      if (quarentena) {
        setQForm({
          ativa: quarentena.ativa,
          dataInicio: quarentena.dataInicio || todayISO(),
          motivoQuarentena: quarentena.motivoQuarentena || '',
          dataPrevistaSaida: quarentena.dataPrevistaSaida || '',
          observacoes: quarentena.observacoes || '',
        });
      } else {
        setQForm({
          ativa: false,
          dataInicio: todayISO(),
          motivoQuarentena: '',
          dataPrevistaSaida: '',
          observacoes: '',
        });
      }
    }
  }, [isOpen, vaccinationRecords, quarentena]);

  // Suggestions based on lot age and applied vaccines
  const appliedProtocolIds = useMemo(() => {
    return localVaccines
      .filter(v => v.status === 'Aplicada' && v.protocoloId)
      .map(v => v.protocoloId!);
  }, [localVaccines]);

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

  const handleQuickAddProtocol = (protocoloId: string) => {
    const p = POULTRY_VACCINE_PROTOCOLS.find(x => x.id === protocoloId);
    if (!p) return;
    const dataAplicada = todayISO();
    const intervalo = p.intervaloReforco || undefined;
    const proximaDose = intervalo ? addDays(dataAplicada, intervalo) : undefined;
    const record: VaccinationRecord = {
      id: uid(),
      vacina: p.nome,
      dataAplicada,
      dataProximaDose: proximaDose,
      intervaloDias: intervalo,
      loteIdadeAplicacaoDias: lotAgeDays,
      protocoloId: p.id,
      status: 'Aplicada',
    };
    setLocalVaccines(prev => [...prev, record]);
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
    setLocalVaccines(prev => [...prev, record]);
    setVForm(prev => ({ ...prev, vacina: '', protocoloId: '', intervaloDias: '', observacao: '' }));
    setIsCustomVaccine(false);
  };

  const handleDeleteVaccine = (id: string) => {
    setLocalVaccines(prev => prev.filter(v => v.id !== id));
  };

  const handleSaveAll = () => {
    let finalVaccines = [...localVaccines];
    const vacinaName = isCustomVaccine
      ? vForm.vacina.trim()
      : (vForm.vacina || POULTRY_VACCINE_PROTOCOLS.find(x => x.id === vForm.protocoloId)?.nome);

    if (vacinaName && vForm.dataAplicada) {
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
      finalVaccines = [...finalVaccines, record];
    }

    onSaveVaccinations(finalVaccines);

    const q: QuarantineRecord | undefined = qForm.ativa
      ? {
          ativa: true,
          dataInicio: qForm.dataInicio,
          motivoQuarentena: qForm.motivoQuarentena,
          dataPrevistaSaida: qForm.dataPrevistaSaida || undefined,
          observacoes: qForm.observacoes || undefined,
        }
      : (localQuarentena?.ativa ? { ...localQuarentena, ativa: false } : undefined);
    onSaveQuarentena(q);
    onClose();
  };

  const appliedVaccines = localVaccines.filter(v => v.status === 'Aplicada');
  const hasSuggestions = overdue.length > 0 || upcoming.length > 0;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface border border-theme-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-theme-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Syringe size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Saúde do Lote</h2>
              <p className="text-[11px] text-theme-text-muted">{lotName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(quarentena?.ativa) && (
              <span className="px-2 py-1 bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] font-black rounded-lg animate-pulse">
                🔴 QUARENTENA
              </span>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-theme-text-muted hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-3 border-b border-theme-border shrink-0">
          {(['vacinas', 'quarentena'] as ActiveTab[]).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer ${
                activeTab === tab
                  ? 'bg-theme-base text-white border border-theme-border font-black'
                  : 'text-theme-text-muted hover:text-white'
              }`}
            >
              {tab === 'vacinas' ? `💉 Vacinação` : `⚠️ Quarentena`}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* ── VACINAS TAB ── */}
          {activeTab === 'vacinas' && (
            <>
              {/* Lot age info */}
              <div className="flex items-center gap-2 p-3 bg-theme-base border border-theme-border rounded-xl">
                <Clock size={14} className="text-theme-primary shrink-0" />
                <p className="text-xs text-white">
                  Lote com <strong>{lotAgeDays} dias</strong> de idade
                </p>
              </div>

              {/* Smart Suggestions */}
              {hasSuggestions && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-theme-text-muted uppercase tracking-wider">🤖 Sugestões do Sistema</p>

                  {overdue.map(v => (
                    <div
                      key={v.id}
                      className="flex items-start justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-xl gap-3 cursor-pointer hover:bg-red-500/15 transition-colors"
                      onClick={() => handleSelectProtocol(v.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-red-400 flex items-center gap-1.5">
                          <AlertTriangle size={12} />
                          {v.nome} — ATRASADA
                        </p>
                        <p className="text-[10px] text-theme-text-muted">
                          Recomendada aos {v.idadeAplicacaoDias}d · Lote com {lotAgeDays}d
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAddProtocol(v.id);
                          }}
                          className="text-[10px] text-black font-black bg-red-400 hover:bg-red-300 px-2.5 py-1.5 rounded-lg shrink-0 shadow transition-all active:scale-95 cursor-pointer"
                        >
                          + Aplicar Hoje
                        </button>
                      </div>
                    </div>
                  ))}

                  {upcoming.map(v => (
                    <div
                      key={v.id}
                      className="flex items-start justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl gap-3 cursor-pointer hover:bg-amber-500/15 transition-colors"
                      onClick={() => handleSelectProtocol(v.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                          <Clock size={12} />
                          {v.nome} — {v.idadeAplicacaoDias === lotAgeDays ? 'Hoje!' : 'em breve'}
                        </p>
                        <p className="text-[10px] text-theme-text-muted">
                          Recomendada aos {v.idadeAplicacaoDias}d {v.idadeAplicacaoDias === lotAgeDays ? '(dia exato)' : `· Faltam ${v.idadeAplicacaoDias - lotAgeDays}d`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickAddProtocol(v.id);
                          }}
                          className="text-[10px] text-black font-black bg-amber-400 hover:bg-amber-300 px-2.5 py-1.5 rounded-lg shrink-0 shadow transition-all active:scale-95 cursor-pointer"
                        >
                          + Aplicar Hoje
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Vaccine Form */}
              <div className="bg-theme-base border border-theme-border rounded-2xl p-4 space-y-4">
                <p className="text-xs font-black text-white flex items-center gap-2">
                  <Plus size={14} className="text-emerald-400" />
                  Registrar Vacinação
                </p>

                {/* Protocol selector */}
                <div>
                  <label className={labelCls}>Vacina</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setIsCustomVaccine(false)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        !isCustomVaccine ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : 'bg-theme-base border border-theme-border text-theme-text-muted hover:text-white'
                      }`}
                    >
                      Protocolo Padrão
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsCustomVaccine(true); setVForm(p => ({ ...p, vacina: '', protocoloId: '' })); }}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isCustomVaccine ? 'bg-blue-500/20 border border-blue-500/40 text-blue-400' : 'bg-theme-base border border-theme-border text-theme-text-muted hover:text-white'
                      }`}
                    >
                      Vacina Personalizada
                    </button>
                  </div>

                  {isCustomVaccine ? (
                    <input
                      type="text"
                      placeholder="Nome da vacina"
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
                      <option value="">Selecionar vacina...</option>
                      {POULTRY_VACCINE_PROTOCOLS.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nome}{p.obrigatoria ? ' ★' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}><Calendar size={10} className="inline mr-1" />Data de Aplicação</label>
                    <input
                      type="date"
                      value={vForm.dataAplicada}
                      onChange={e => setVForm(p => ({ ...p, dataAplicada: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Intervalo de Reforço (dias)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="Ex: 21"
                      value={vForm.intervaloDias}
                      onChange={e => setVForm(p => ({ ...p, intervaloDias: e.target.value }))}
                      className={inputCls}
                      min="0"
                    />
                  </div>
                </div>

                {vForm.intervaloDias && vForm.dataAplicada && (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                    <p className="text-[11px] text-emerald-300">
                      Próxima dose calculada: <strong>{fmtDate(addDays(vForm.dataAplicada, parseInt(vForm.intervaloDias) || 0))}</strong>
                    </p>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Observação (opcional)"
                  value={vForm.observacao}
                  onChange={e => setVForm(p => ({ ...p, observacao: e.target.value }))}
                  className={inputCls}
                />

                <button
                  type="button"
                  onClick={handleAddVaccine}
                  disabled={!vForm.vacina && !vForm.protocoloId}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Syringe size={15} />
                  Registrar Vacinação
                </button>
              </div>

              {/* Applied vaccines list */}
              {appliedVaccines.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-theme-text-muted uppercase tracking-wider">Vacinações Registradas ({appliedVaccines.length})</p>
                  {appliedVaccines.map(v => (
                    <div key={v.id} className="flex items-start justify-between p-3 bg-theme-base border border-theme-border rounded-xl gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-white">{v.vacina}</span>
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full font-bold">✓ Aplicada</span>
                        </div>
                        <p className="text-[10px] text-theme-text-muted mt-0.5">
                          Aplicada: {fmtDate(v.dataAplicada)}
                          {v.dataProximaDose ? ` · Próxima dose: ${fmtDate(v.dataProximaDose)}` : ''}
                          {v.loteIdadeAplicacaoDias ? ` · ${v.loteIdadeAplicacaoDias}d de idade` : ''}
                        </p>
                        {v.observacao && <p className="text-[10px] text-theme-text-muted italic">{v.observacao}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteVaccine(v.id)}
                        className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── QUARENTENA TAB ── */}
          {activeTab === 'quarentena' && (
            <div className="space-y-5">
              {/* Toggle */}
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  qForm.ativa
                    ? 'bg-red-500/10 border-red-500/40'
                    : 'bg-theme-base border-theme-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {qForm.ativa
                      ? <ShieldAlert size={22} className="text-red-400" />
                      : <Shield size={22} className="text-theme-text-muted" />
                    }
                    <div>
                      <p className="text-sm font-black text-white">Status de Quarentena</p>
                      <p className="text-[11px] text-theme-text-muted">
                        {qForm.ativa ? '🔴 Lote em quarentena ativa' : 'Lote sem quarentena ativa'}
                      </p>
                    </div>
                  </div>
                  {/* Toggle switch */}
                  <button
                    type="button"
                    onClick={() => setQForm(p => ({ ...p, ativa: !p.ativa }))}
                    className={`relative w-12 h-6 rounded-full transition-all cursor-pointer ${
                      qForm.ativa ? 'bg-red-500' : 'bg-theme-border'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        qForm.ativa ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {qForm.ativa && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className={labelCls}>Motivo da Quarentena *</label>
                    <input
                      type="text"
                      placeholder="Ex: Suspeita de doença respiratória"
                      value={qForm.motivoQuarentena}
                      onChange={e => setQForm(p => ({ ...p, motivoQuarentena: e.target.value }))}
                      className={inputCls}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Data de Início</label>
                      <input
                        type="date"
                        value={qForm.dataInicio}
                        onChange={e => setQForm(p => ({ ...p, dataInicio: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Previsão de Saída</label>
                      <input
                        type="date"
                        value={qForm.dataPrevistaSaida}
                        onChange={e => setQForm(p => ({ ...p, dataPrevistaSaida: e.target.value }))}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>Observações</label>
                    <textarea
                      rows={3}
                      placeholder="Sintomas, tratamento em andamento, etc."
                      value={qForm.observacoes}
                      onChange={e => setQForm(p => ({ ...p, observacoes: e.target.value }))}
                      className={inputCls + ' resize-none'}
                    />
                  </div>

                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-[11px] text-red-300 font-bold">
                      ⚠️ Lote em quarentena ficará marcado com borda vermelha pulsante no painel de lotes.
                      Outros usuários saberão que o lote está isolado.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-theme-border shrink-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-theme-border text-theme-text-muted hover:text-white hover:border-white/20 text-sm font-bold transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm transition-all active:scale-[0.98]"
          >
            Salvar Saúde
          </button>
        </div>
      </div>
    </div>
  );
}
