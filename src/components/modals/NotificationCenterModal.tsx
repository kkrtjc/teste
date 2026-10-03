import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  X, Bell, AlertTriangle, Egg, Syringe, Wheat, Scale, 
  ShieldAlert, CheckCircle2, ChevronRight,
  Lock, Smartphone, Zap, Sliders, BellOff
} from 'lucide-react';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import { 
  scanActiveAlerts, 
  requestNotificationPermission, 
  getNotificationPermission, 
  triggerDeviceNotification,
  triggerTestFeedNotification,
  type MuraAlert,
  type NotificationSettings
} from '../../lib/notificationEngine';
import { useAppContext } from '../../lib/AppContext';
import { UnblockNotificationModal } from './UnblockNotificationModal';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenterModal({ isOpen, onClose }: NotificationCenterModalProps) {
  useModalScrollLock(isOpen);
  const navigate = useNavigate();
  const { 
    eggLots, meatLots, birds, showToast, 
    notificationSettings, updateNotificationSettings,
    toggleMasterNotifications, dailyFeedStatus, confirmDailyFeed, unconfirmDailyFeed
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'avisos' | 'config'>('avisos');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [testingPush, setTestingPush] = useState(false);
  const [testingFeed, setTestingFeed] = useState(false);
  const [isUnblockOpen, setIsUnblockOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const alerts: MuraAlert[] = scanActiveAlerts(eggLots, meatLots, birds, notificationSettings, dailyFeedStatus);

  const handleToggleMaster = async () => {
    await toggleMasterNotifications();
  };

  const handleUpdateSetting = async (key: keyof NotificationSettings, val: any) => {
    await updateNotificationSettings({ [key]: val });
    showToast('Preferência salva com sucesso!', 'success');
  };

  const handleEnablePush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setIsUnblockOpen(true);
      return;
    }
    try {
      const granted = await requestNotificationPermission();
      const current = getNotificationPermission();
      setPermission(current);
      if (granted) {
        showToast('Notificações no celular ativadas com sucesso!', 'success');
        await triggerDeviceNotification('🐓 Mura Manager Conectado!', {
          body: 'Você agora receberá alertas diários de trato e vacinas no seu celular.',
        });
      } else {
        if (current === 'denied' || current === 'unsupported') {
          setIsUnblockOpen(true);
        } else {
          showToast('Permissão não autorizada.', 'warning');
        }
      }
    } catch {
      setIsUnblockOpen(true);
    }
  };

  const handleTestNotification = async () => {
    setTestingPush(true);
    try {
      const ok = await triggerDeviceNotification('🐓 Alerta de Teste Mura Manager', {
        body: 'Notificação funcionando com sucesso! Seus alertas diários chegarão aqui.',
      });
      if (ok) {
        showToast('Notificação de teste enviada!', 'success');
      } else {
        showToast('Ative as notificações no botão acima para receber o aviso.', 'warning');
      }
    } finally {
      setTestingPush(false);
    }
  };

  const handleTestFeedReminder = async () => {
    setTestingFeed(true);
    try {
      const ok = await triggerTestFeedNotification('manha');
      if (ok) {
        showToast('Lembrete de ração testado! Sino tocado e notificação enviada.', 'success');
      } else {
        showToast('Sino tocado no aplicativo!', 'info');
      }
    } finally {
      setTimeout(() => setTestingFeed(false), 2000);
    }
  };

  const handleAlertAction = async (alert: MuraAlert) => {
    // Ação direta de confirmação de ração em 1 toque
    if (alert.actionRoute === '__CONFIRM_FEED_MANHA__') {
      await confirmDailyFeed('manha');
      return;
    }
    if (alert.actionRoute === '__CONFIRM_FEED_TARDE__') {
      await confirmDailyFeed('tarde');
      return;
    }

    onClose();
    if (alert.actionRoute) {
      navigate(alert.actionRoute, { state: alert.actionState });
    }
  };

  const getAlertIcon = (type: MuraAlert['type']) => {
    switch (type) {
      case 'postura_sem_registro':
        return <Egg size={18} className="text-amber-400" />;
      case 'vacina_atrasada':
      case 'vacina_hoje':
        return <Syringe size={18} className="text-rose-400" />;
      case 'horario_racao':
        return <Wheat size={18} className="text-amber-400" />;
      case 'quarentena':
        return <ShieldAlert size={18} className="text-red-400" />;
      case 'pesagem_15_dias':
        return <Scale size={18} className="text-blue-400" />;
      default:
        return <AlertTriangle size={18} className="text-amber-400" />;
    }
  };

  const isEnabled = notificationSettings.enabled !== false;

  return createPortal(
    <div
      className="fixed inset-0 z-[9995] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface border border-theme-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92vh] flex flex-col animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-theme-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center relative ${
              isEnabled 
                ? 'bg-amber-500/15 border-amber-500/30' 
                : 'bg-zinc-800/60 border-zinc-700/50'
            }`}>
              {isEnabled ? (
                <Bell size={20} className="text-amber-400" />
              ) : (
                <BellOff size={20} className="text-zinc-500" />
              )}
              {isEnabled && alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                  {alerts.length}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Central de Alertas</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  !isEnabled
                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    : permission === 'granted'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  {!isEnabled ? 'Pausado' : permission === 'granted' ? 'Celular Conectado' : 'Ativo no App'}
                </span>
              </div>
              <p className="text-[11px] text-theme-text-muted mt-0.5">
                {!isEnabled 
                  ? 'Alertas desativados pelo criador' 
                  : alerts.length === 0 
                    ? 'Tudo em dia no criatório!' 
                    : `${alerts.length} ${alerts.length === 1 ? 'aviso pendente' : 'avisos pendentes'} hoje`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/5 text-theme-text-muted hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── BOTÃO MESTRE LIGAR / DESLIGAR ALERTAS (Super Intuitivo) ── */}
        <div className="p-3 sm:p-4 bg-theme-base/60 border-b border-theme-border/60 shrink-0">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-theme-surface border border-theme-border shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${
                isEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {isEnabled ? <Bell size={18} /> : <BellOff size={18} />}
              </div>
              <div>
                <p className="text-xs font-black text-white">
                  {isEnabled ? 'Alertas & Lembretes Ativados' : 'Alertas & Lembretes Desativados'}
                </p>
                <p className="text-[11px] text-theme-text-muted">
                  {isEnabled ? 'Disparando som, vibração e notificações' : 'Toque no interruptor para reativar'}
                </p>
              </div>
            </div>

            {/* Chave Liga/Desliga Gigante */}
            <button
              type="button"
              onClick={handleToggleMaster}
              className={`w-14 h-7 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                isEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
              title={isEnabled ? 'Clique para desativar alertas' : 'Clique para ativar alertas'}
            >
              <span className={`block w-6 h-6 rounded-full bg-white transition-transform absolute top-0.5 shadow-md flex items-center justify-center text-[9px] font-black ${
                isEnabled ? 'left-7 text-emerald-600' : 'left-0.5 text-zinc-600'
              }`}>
                {isEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Se desativado, exibe estado limpo */}
        {!isEnabled ? (
          <div className="flex-1 p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-500">
              <BellOff size={28} />
            </div>
            <p className="text-sm font-black text-white">Sistema de Alertas Desativado</p>
            <p className="text-xs text-theme-text-muted max-w-xs leading-relaxed">
              Você pausou todos os lembretes de ração, vacinas e postura. Nenhum aviso sonoro ou notificação será disparado.
            </p>
            <button
              type="button"
              onClick={handleToggleMaster}
              className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Bell size={14} />
              <span>Reativar Alertas Agora</span>
            </button>
          </div>
        ) : (
          <>
            {/* Abas: Avisos de Hoje vs Configurações de Horário */}
            <div className="flex border-b border-theme-border/60 bg-theme-base/40 p-1.5 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('avisos')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'avisos'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Bell size={14} />
                <span>Avisos de Hoje ({alerts.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('config')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'config'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sliders size={14} />
                <span>Horários & Tipos</span>
              </button>
            </div>

            {/* Conteúdo da Aba Selecionada */}
            <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
              {activeTab === 'avisos' ? (
                <>
                  {/* Status Rápido do Trato de Hoje */}
                  {(dailyFeedStatus.manha || dailyFeedStatus.tarde) && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1">
                      <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Alimentação de Hoje Registrada:
                      </p>
                      <div className="flex flex-wrap gap-2 text-[11px] text-zinc-300 pt-1">
                        {dailyFeedStatus.manha && (
                          <span className="inline-flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            <span>🌾 1º Trato Feito {dailyFeedStatus.manhaTime ? `(${dailyFeedStatus.manhaTime})` : ''}</span>
                            <button
                              type="button"
                              onClick={() => unconfirmDailyFeed('manha')}
                              className="text-[10px] text-zinc-500 hover:text-rose-400 underline cursor-pointer ml-1"
                            >
                              desfazer
                            </button>
                          </span>
                        )}
                        {dailyFeedStatus.tarde && (
                          <span className="inline-flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            <span>🌾 2º Trato Feito {dailyFeedStatus.tardeTime ? `(${dailyFeedStatus.tardeTime})` : ''}</span>
                            <button
                              type="button"
                              onClick={() => unconfirmDailyFeed('tarde')}
                              className="text-[10px] text-zinc-500 hover:text-rose-400 underline cursor-pointer ml-1"
                            >
                              desfazer
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Banner de Permissão Push (caso não esteja autorizado no aparelho) */}
                  {permission === 'denied' && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-rose-300 flex items-center gap-1.5">
                          <Lock size={14} /> Bloqueado no Navegador
                        </p>
                        <p className="text-[11px] text-zinc-400">Libere as notificações para receber com a tela desligada</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsUnblockOpen(true)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow cursor-pointer shrink-0"
                      >
                        Desbloquear
                      </button>
                    </div>
                  )}

                  {permission === 'default' && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Smartphone size={14} /> Ativar Avisos no Celular
                        </p>
                        <p className="text-[11px] text-zinc-400">Receba notificações push mesmo fora do app</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleEnablePush}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow cursor-pointer shrink-0"
                      >
                        Ativar
                      </button>
                    </div>
                  )}

                  {/* Lista de Alertas Ativos */}
                  {alerts.length > 0 ? (
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                        Pendências Que Requerem Sua Atenção
                      </p>
                      {alerts.map(alert => (
                        <div
                          key={alert.id}
                          className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2.5 ${
                            alert.urgency === 'high'
                              ? 'bg-rose-500/10 border-rose-500/40 shadow-sm'
                              : 'bg-theme-base border-theme-border'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              alert.urgency === 'high' ? 'bg-rose-500/20' : 'bg-theme-surface'
                            }`}>
                              {getAlertIcon(alert.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-white">
                                {alert.title}
                              </p>
                              <p className="text-[11px] text-theme-text-muted mt-0.5 leading-relaxed">
                                {alert.message}
                              </p>
                            </div>
                          </div>

                          {/* Botão de Ação Direta no Alerta */}
                          {alert.actionLabel && (
                            <button
                              type="button"
                              onClick={() => handleAlertAction(alert)}
                              className={`w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm ${
                                alert.actionRoute?.startsWith('__CONFIRM_FEED')
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                                  : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300'
                              }`}
                            >
                              <span>{alert.actionLabel}</span>
                              <ChevronRight size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="text-sm font-black text-white">Tudo em dia no criatório!</p>
                      <p className="text-xs text-theme-text-muted max-w-xs mx-auto">
                        Tratos de hoje realizados, postura registrada e vacinas em dia.
                      </p>
                    </div>
                  )}

                  {/* Botão de Teste Imediato */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleTestFeedReminder}
                      disabled={testingFeed}
                      className="w-full py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                    >
                      <Bell size={14} />
                      <span>{testingFeed ? 'Tocando Sino...' : '🌾 Testar Alerta de Ração Agora (Sino + Vibração + Push)'}</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Aba de Configuração de Horários e Tipos de Avisos */
                <div className="space-y-4">
                  {/* Horários Programados do Trato */}
                  <div className="p-4 bg-theme-base/60 border border-theme-border/60 rounded-2xl space-y-3">
                    <div>
                      <p className="text-xs font-black text-white flex items-center gap-1.5">
                        <Wheat size={15} className="text-amber-400" /> Horários da Ração (Lembretes Automáticos)
                      </p>
                      <p className="text-[11px] text-theme-text-muted mt-0.5">
                        Escolha o horário do trato da manhã e da tarde. O aplicativo avisará no minuto exato.
                      </p>
                    </div>

                    {/* 1º Trato Manhã */}
                    <div className="space-y-2 pt-1 border-t border-theme-border/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-300">1º Trato (Manhã):</span>
                        <input
                          type="time"
                          value={notificationSettings.feedReminderTime1 || '07:30'}
                          onChange={e => handleUpdateSetting('feedReminderTime1', e.target.value)}
                          className="bg-theme-surface border border-theme-border rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold outline-none focus:border-theme-primary"
                        />
                      </div>
                      {/* Presets Rápidos */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['06:30', '07:00', '07:30', '08:00'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleUpdateSetting('feedReminderTime1', t)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black border transition-all cursor-pointer ${
                              notificationSettings.feedReminderTime1 === t
                                ? 'bg-amber-500 text-black border-amber-500'
                                : 'bg-theme-surface text-zinc-400 border-theme-border hover:text-white'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2º Trato Tarde */}
                    <div className="space-y-2 pt-2 border-t border-theme-border/40">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-300">2º Trato (Tarde):</span>
                        <input
                          type="time"
                          value={notificationSettings.feedReminderTime2 || '16:30'}
                          onChange={e => handleUpdateSetting('feedReminderTime2', e.target.value)}
                          className="bg-theme-surface border border-theme-border rounded-lg px-2.5 py-1 text-xs text-white font-mono font-bold outline-none focus:border-theme-primary"
                        />
                      </div>
                      {/* Presets Rápidos */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['16:00', '16:30', '17:00', '17:30'].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleUpdateSetting('feedReminderTime2', t)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black border transition-all cursor-pointer ${
                              notificationSettings.feedReminderTime2 === t
                                ? 'bg-amber-500 text-black border-amber-500'
                                : 'bg-theme-surface text-zinc-400 border-theme-border hover:text-white'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Switches de Tipos de Alerta */}
                  <div className="p-4 bg-theme-base/60 border border-theme-border/60 rounded-2xl space-y-3">
                    <p className="text-xs font-black text-white">Quais alertas deseja manter ativos?</p>
                    
                    <div className="divide-y divide-theme-border/40 text-xs">
                      {/* Ração */}
                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                          <span>🌾</span> Lembrete de Ração & Água
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateSetting('alertRacao', !notificationSettings.alertRacao)}
                          className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                            notificationSettings.alertRacao ? 'bg-amber-500' : 'bg-zinc-700'
                          }`}
                        >
                          <span className={`block w-4 h-4 rounded-full bg-black transition-transform absolute top-0.5 ${
                            notificationSettings.alertRacao ? 'left-5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* Vacinas */}
                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                          <span>💉</span> Vacinas e Reforços de Lotes
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateSetting('alertVacinas', !notificationSettings.alertVacinas)}
                          className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                            notificationSettings.alertVacinas ? 'bg-amber-500' : 'bg-zinc-700'
                          }`}
                        >
                          <span className={`block w-4 h-4 rounded-full bg-black transition-transform absolute top-0.5 ${
                            notificationSettings.alertVacinas ? 'left-5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* Postura sem ovos */}
                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                          <span>🥚</span> Postura Sem Registro Hoje
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateSetting('alertPosturaSemRegistro', !notificationSettings.alertPosturaSemRegistro)}
                          className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                            notificationSettings.alertPosturaSemRegistro ? 'bg-amber-500' : 'bg-zinc-700'
                          }`}
                        >
                          <span className={`block w-4 h-4 rounded-full bg-black transition-transform absolute top-0.5 ${
                            notificationSettings.alertPosturaSemRegistro ? 'left-5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* Pesagem */}
                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                          <span>⚖️</span> Calibragem de Pesagem (15 dias)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateSetting('alertPesagens', !notificationSettings.alertPesagens)}
                          className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                            notificationSettings.alertPesagens ? 'bg-amber-500' : 'bg-zinc-700'
                          }`}
                        >
                          <span className={`block w-4 h-4 rounded-full bg-black transition-transform absolute top-0.5 ${
                            notificationSettings.alertPesagens ? 'left-5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>

                      {/* Quarentena */}
                      <div className="py-2.5 flex items-center justify-between gap-3">
                        <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                          <span>🛡️</span> Lotes e Aves em Quarentena
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateSetting('alertQuarentena', !notificationSettings.alertQuarentena)}
                          className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                            notificationSettings.alertQuarentena ? 'bg-amber-500' : 'bg-zinc-700'
                          }`}
                        >
                          <span className={`block w-4 h-4 rounded-full bg-black transition-transform absolute top-0.5 ${
                            notificationSettings.alertQuarentena ? 'left-5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Configuração Push do Dispositivo */}
                  <div className="p-4 bg-theme-base/60 border border-theme-border/60 rounded-2xl space-y-2">
                    <p className="text-xs font-black text-white">Status no Aparelho</p>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-zinc-400">Permissão do Navegador:</span>
                      {permission === 'granted' ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={13} /> Concedida
                        </span>
                      ) : permission === 'denied' ? (
                        <button
                          type="button"
                          onClick={() => setIsUnblockOpen(true)}
                          className="text-rose-400 font-bold underline cursor-pointer"
                        >
                          Bloqueada (Como Desbloquear)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleEnablePush}
                          className="text-amber-400 font-bold underline cursor-pointer"
                        >
                          Toque para Ativar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-theme-border shrink-0 flex items-center justify-between bg-theme-surface/50">
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={testingPush || !isEnabled}
            className="text-xs font-bold text-theme-text-muted hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Zap size={13} className="text-amber-400" />
            <span>{testingPush ? 'Enviando...' : 'Testar Push Geral'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-theme-base border border-theme-border rounded-xl text-xs font-bold text-white hover:border-white/20 transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal para Desbloqueio se necessário */}
      <UnblockNotificationModal
        isOpen={isUnblockOpen}
        onClose={() => setIsUnblockOpen(false)}
        onStatusUpdated={setPermission}
      />
    </div>,
    document.body
  );
}
