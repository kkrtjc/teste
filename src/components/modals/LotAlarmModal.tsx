import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Plus, Trash2, Calendar, Check } from 'lucide-react';
import type { LotAlarm } from '../../lib/AppContext';

interface LotAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  lote: any;
  loteType: 'postura' | 'engorda' | 'pintinhos' | 'crescimento';
  onSaveAlarms: (alarms: LotAlarm[]) => void;
  showToast: (msg: string, type?: 'success' | 'info' | 'warning') => void;
}

const DIAS_DA_SEMANA = [
  { id: 1, label: 'Seg', full: 'Segunda-feira' },
  { id: 2, label: 'Ter', full: 'Terça-feira' },
  { id: 3, label: 'Qua', full: 'Quarta-feira' },
  { id: 4, label: 'Qui', full: 'Quinta-feira' },
  { id: 5, label: 'Sex', full: 'Sexta-feira' },
  { id: 6, label: 'Sáb', full: 'Sábado' },
  { id: 0, label: 'Dom', full: 'Domingo' }
];

export function LotAlarmModal({
  isOpen,
  onClose,
  lote,
  loteType,
  onSaveAlarms,
  showToast
}: LotAlarmModalProps) {
  const [texto, setTexto] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]); // Padrão: Segunda a Segunda

  if (!isOpen || !lote) return null;

  const currentAlarms: LotAlarm[] = lote.alarmes || [];
  const todayDayOfWeek = new Date().getDay();

  const isAllDaysSelected = selectedDays.length === 7;

  const handleToggleAllDays = () => {
    if (isAllDaysSelected) {
      setSelectedDays([]);
    } else {
      setSelectedDays([1, 2, 3, 4, 5, 6, 0]);
    }
  };

  const handleToggleDay = (dayId: number) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(prev => prev.filter(d => d !== dayId));
    } else {
      setSelectedDays(prev => [...prev, dayId]);
    }
  };

  const handleAddAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) {
      showToast('Digite a mensagem ou lembrete do alarme.', 'warning');
      return;
    }
    if (selectedDays.length === 0) {
      showToast('Selecione pelo menos um dia da semana para o alarme.', 'warning');
      return;
    }

    const newAlarm: LotAlarm = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      texto: texto.trim(),
      diasSemana: [...selectedDays].sort((a, b) => a - b),
      ativo: true,
      criadoEm: new Date().toISOString()
    };

    const updated = [...currentAlarms, newAlarm];
    onSaveAlarms(updated);
    setTexto('');
    showToast('Alarme programado com sucesso!', 'success');
  };

  const handleToggleAlarmActive = (alarmId: string) => {
    const updated = currentAlarms.map(a => {
      if (a.id === alarmId) {
        return { ...a, ativo: !a.ativo };
      }
      return a;
    });
    onSaveAlarms(updated);
  };

  const handleDeleteAlarm = (alarmId: string) => {
    const updated = currentAlarms.filter(a => a.id !== alarmId);
    onSaveAlarms(updated);
    showToast('Alarme removido.', 'info');
  };

  const lotTypeTitle = {
    postura: 'Lote de Postura',
    engorda: 'Lote de Engorda',
    pintinhos: 'Lote de Pintinhos',
    crescimento: 'Lote de Crescimento'
  }[loteType] || 'Lote';

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      onTouchMove={e => {
        if (e.target === e.currentTarget && e.cancelable) e.preventDefault();
      }}
    >
      <div 
        className="bg-theme-surface border border-theme-border w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 animate-scale-up my-auto max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-theme-border pb-4">
          <div>
            <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wider block">
              Baia {lote.baia} · {lotTypeTitle}
            </span>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Bell size={18} className="text-amber-400" />
              Alarmes & Lembretes do Lote
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-theme-text-muted hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 pr-1 modal-scrollable-content touch-pan-y">
          {/* Form: Novo Alarme */}
          <form onSubmit={handleAddAlarm} className="bg-theme-base/80 border border-theme-border rounded-2xl p-4 space-y-3.5 shadow-inner">
            <p className="text-xs font-black text-white flex items-center gap-1.5">
              <Plus size={14} className="text-theme-primary" />
              Programar Novo Alarme
            </p>

            {/* Texto do Alarme */}
            <div>
              <label className="block text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1">
                Mensagem do Alerta *
              </label>
              <input
                type="text"
                placeholder="Ex: Dar vermífugo na água, trocar ração, limpar baia..."
                value={texto}
                onChange={e => setTexto(e.target.value)}
                className="w-full bg-theme-surface border border-theme-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-theme-text-muted/50 focus:border-theme-primary outline-none transition-colors"
                required
              />
            </div>

            {/* Dias da Semana */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[11px] font-bold text-theme-text-muted uppercase tracking-wider">
                  Dias de Notificação
                </label>
                <button
                  type="button"
                  onClick={handleToggleAllDays}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                    isAllDaysSelected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-theme-surface text-theme-text-muted border-theme-border hover:text-white'
                  }`}
                >
                  {isAllDaysSelected ? '✓ De Segunda a Segunda' : 'Marcar Segunda a Segunda'}
                </button>
              </div>

              {/* Day chips */}
              <div className="grid grid-cols-7 gap-1.5">
                {DIAS_DA_SEMANA.map(d => {
                  const isSelected = selectedDays.includes(d.id);
                  const isToday = todayDayOfWeek === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleToggleDay(d.id)}
                      title={d.full + (isToday ? ' (Hoje)' : '')}
                      className={`py-2 rounded-xl text-xs font-black flex flex-col items-center justify-center border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-theme-primary text-black border-theme-primary shadow-sm'
                          : 'bg-theme-surface border-theme-border text-theme-text-muted hover:text-white'
                      }`}
                    >
                      <span>{d.label}</span>
                      {isToday && (
                        <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-black' : 'bg-amber-400'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-theme-text-muted mt-1.5">
                {isAllDaysSelected ? (
                  <span className="text-amber-300 font-semibold">Programado para todos os dias da semana.</span>
                ) : selectedDays.length > 0 ? (
                  <span>Disparará em: {selectedDays.map(id => DIAS_DA_SEMANA.find(d => d.id === id)?.label).join(', ')}</span>
                ) : (
                  <span className="text-red-400 font-semibold">Nenhum dia selecionado.</span>
                )}
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-black text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
            >
              <Check size={14} /> Salvar Alarme
            </button>
          </form>

          {/* Lista de Alarmes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider">
                Alarmes Programados ({currentAlarms.length})
              </span>
            </div>

            {currentAlarms.length === 0 ? (
              <div className="text-center p-6 bg-theme-base rounded-2xl border border-dashed border-theme-border text-theme-text-muted">
                <Bell size={28} className="mx-auto mb-2 opacity-30 text-amber-400" />
                <p className="font-bold text-xs text-white">Nenhum alarme para este lote</p>
                <p className="text-[11px] mt-0.5">Cadastre lembretes acima para ser avisado nos dias programados.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {currentAlarms.map(alarm => {
                  const isScheduledToday = alarm.ativo && alarm.diasSemana.includes(todayDayOfWeek);
                  const allWeek = alarm.diasSemana.length === 7;

                  return (
                    <div
                      key={alarm.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        isScheduledToday
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-sm shadow-amber-950/20'
                          : alarm.ativo
                            ? 'bg-theme-base border-theme-border'
                            : 'bg-theme-base/40 border-theme-border/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleAlarmActive(alarm.id)}
                          title={alarm.ativo ? 'Desativar alarme' : 'Ativar alarme'}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border transition-all cursor-pointer ${
                            alarm.ativo
                              ? 'bg-amber-400 border-amber-400 text-black shadow-sm'
                              : 'bg-theme-surface border-theme-border text-theme-text-muted'
                          }`}
                        >
                          <Bell size={13} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-xs font-black break-words ${alarm.ativo ? 'text-white' : 'text-theme-text-muted line-through'}`}>
                              {alarm.texto}
                            </p>
                            {isScheduledToday && (
                              <span className="text-[9px] font-black uppercase bg-amber-500 text-black px-1.5 py-0.5 rounded-md shrink-0 animate-pulse">
                                Ativo Hoje
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Calendar size={11} className="text-theme-text-muted shrink-0" />
                            <span className="text-[10px] text-theme-text-muted">
                              {allWeek
                                ? 'De Segunda a Segunda'
                                : alarm.diasSemana.map(id => DIAS_DA_SEMANA.find(d => d.id === id)?.label).join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteAlarm(alarm.id)}
                        className="text-theme-text-muted hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                        title="Excluir alarme"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-theme-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-theme-base border border-theme-border rounded-xl text-xs font-bold text-white hover:bg-theme-surface transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
