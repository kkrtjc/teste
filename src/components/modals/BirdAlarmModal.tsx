import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, Plus, Trash2, Calendar, Clock, Check } from 'lucide-react';
import type { Bird, BirdAlarm } from '../../lib/AppContext';

interface BirdAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  bird: Bird | null;
  onSaveAlarms: (alarms: BirdAlarm[]) => void;
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

export function BirdAlarmModal({
  isOpen,
  onClose,
  bird,
  onSaveAlarms,
  showToast
}: BirdAlarmModalProps) {
  const [texto, setTexto] = useState('');
  const [hora, setHora] = useState('08:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0]); // Padrão: Segunda a Segunda

  if (!isOpen || !bird) return null;

  const currentAlarms: BirdAlarm[] = bird.alarmes || [];
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
      showToast('Digite a observação do alarme.', 'warning');
      return;
    }
    if (selectedDays.length === 0) {
      showToast('Selecione pelo menos um dia da semana para o alarme.', 'warning');
      return;
    }

    const newAlarm: BirdAlarm = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      texto: texto.trim(),
      hora: hora || '08:00',
      diasSemana: [...selectedDays].sort((a, b) => a - b),
      ativo: true,
      criadoEm: new Date().toISOString()
    };

    const updated = [...currentAlarms, newAlarm];
    onSaveAlarms(updated);
    setTexto('');
    showToast('Alarme programado com sucesso para a ave!', 'success');
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Bell size={20} className="text-amber-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-theme-primary uppercase tracking-wider block truncate">
                {bird.sexo} · {bird.raca || 'Sem raça'} {bird.baia && bird.baia !== 'ND' ? `· Baia ${bird.baia}` : ''}
              </span>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 truncate">
                <span>Alarme: {bird.anilha}</span>
                {bird.nome && <span className="text-xs text-theme-text-muted font-normal">({bird.nome})</span>}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-theme-text-muted hover:text-white transition-colors cursor-pointer shrink-0"
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
              Programar Novo Alarme para a Ave
            </p>

            {/* Hora e Atalho "De Segunda a Segunda" */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock size={12} className="text-amber-400" /> Horário
                </label>
                <input
                  type="time"
                  value={hora}
                  onChange={e => setHora(e.target.value)}
                  className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-2 text-sm text-white font-bold focus:border-theme-primary outline-none transition-colors [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-theme-primary" /> Frequência
                </label>
                <button
                  type="button"
                  onClick={handleToggleAllDays}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isAllDaysSelected
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-black'
                      : 'bg-theme-surface border-theme-border text-theme-text-muted hover:text-white hover:border-theme-border-hover'
                  }`}
                >
                  <Check size={13} className={isAllDaysSelected ? 'opacity-100 text-amber-400' : 'opacity-0'} />
                  De Segunda a Segunda
                </button>
              </div>
            </div>

            {/* Seletor de Dias da Semana (Chips) */}
            <div>
              <label className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1.5 block">
                Dias da Semana Selecionados:
              </label>
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
                      className={`py-2 text-center rounded-xl text-xs font-black transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-theme-primary text-black shadow-md shadow-amber-500/20'
                          : 'bg-theme-surface hover:bg-white/5 border border-theme-border/60 text-theme-text-muted hover:text-white'
                      }`}
                    >
                      {d.label}
                      {isToday && (
                        <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ring-2 ring-theme-surface ${isSelected ? 'bg-black' : 'bg-amber-400'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Observação / Mensagem do Alarme */}
            <div>
              <label className="text-[11px] font-bold text-theme-text-muted uppercase tracking-wider mb-1 block">
                Observação do Alarme *
              </label>
              <input
                type="text"
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Ex: Aplicar vermífugo, suplemento vitamínico, pesar ave..."
                className="w-full bg-theme-surface border border-theme-border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-theme-text-muted/60 focus:border-theme-primary outline-none transition-colors"
              />
              <p className="text-[10px] text-theme-text-muted mt-1">
                Esta observação aparecerá em destaque quando o alarme soar no dia e horário programados.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Programar Alarme
            </button>
          </form>

          {/* Lista de Alarmes Ativos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <Bell size={13} className="text-theme-primary" />
                Alarmes da Ave ({currentAlarms.length})
              </p>
              <span className="text-[10px] text-theme-text-muted">
                {currentAlarms.filter(a => a.ativo).length} ativo(s)
              </span>
            </div>

            {currentAlarms.length === 0 ? (
              <div className="text-center py-6 px-4 bg-theme-base/40 border border-theme-border/50 rounded-2xl border-dashed">
                <Bell size={24} className="mx-auto text-theme-text-muted/50 mb-2" />
                <p className="text-xs text-theme-text-muted font-bold">
                  Nenhum alarme programado para esta ave.
                </p>
                <p className="text-[10px] text-theme-text-muted/70 mt-0.5">
                  Programe alertas para lembrar de medicações, pesagens ou manejos.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {currentAlarms.map(alarm => {
                  const isScheduledToday = alarm.ativo && alarm.diasSemana.includes(todayDayOfWeek);
                  const allWeek = alarm.diasSemana.length === 7;

                  return (
                    <div
                      key={alarm.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                        !alarm.ativo
                          ? 'bg-theme-base/40 border-theme-border/40 opacity-60'
                          : isScheduledToday
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/5'
                          : 'bg-theme-base border-theme-border/70'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleToggleAlarmActive(alarm.id)}
                          title={alarm.ativo ? 'Desativar alarme' : 'Ativar alarme'}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 mt-0.5 ${
                            alarm.ativo
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-theme-surface text-theme-text-muted border-theme-border'
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
                          
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {alarm.hora && (
                              <span className="text-[10px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-md flex items-center gap-1">
                                <Clock size={10} /> {alarm.hora}
                              </span>
                            )}
                            <span className="text-[10px] text-theme-text-muted flex items-center gap-1">
                              <Calendar size={10} />
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
