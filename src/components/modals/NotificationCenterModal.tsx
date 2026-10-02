import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  X, Bell, AlertTriangle, Egg, Syringe, Wheat, Scale, 
  ShieldAlert, CheckCircle2, ChevronRight, Volume2, RefreshCw,
  Lock, Smartphone
} from 'lucide-react';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import { 
  scanActiveAlerts, 
  requestNotificationPermission, 
  getNotificationPermission, 
  triggerDeviceNotification,
  triggerTestFeedNotification,
  type MuraAlert 
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
  const { eggLots, meatLots, birds, showToast, notificationSettings } = useAppContext();

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [testing, setTesting] = useState(false);
  const [testingFeed, setTestingFeed] = useState(false);
  const [isUnblockOpen, setIsUnblockOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const alerts: MuraAlert[] = scanActiveAlerts(eggLots, meatLots, birds, notificationSettings);

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    const current = getNotificationPermission();
    setPermission(current);
    if (granted) {
      showToast('Notificações no celular ativadas com sucesso!', 'success');
      await triggerDeviceNotification('🔔 Mura Manager Conectado!', {
        body: 'Você agora receberá alertas diários de ovos, vacinas e ração direto no seu celular.',
      });
    } else {
      if (current === 'denied' || current === 'unsupported') {
        setIsUnblockOpen(true);
      } else {
        showToast('Permissão não concedida. Verifique as configurações do navegador.', 'warning');
      }
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      const ok = await triggerDeviceNotification('🐓 Alerta de Teste Mura Manager', {
        body: 'Notificação funcionando com sucesso! Seus alertas diários chegarão aqui.',
      });
      if (ok) {
        showToast('Notificação de teste enviada!', 'success');
      } else {
        showToast('Não foi possível exibir. Ative as notificações primeiro.', 'warning');
      }
    } finally {
      setTesting(false);
    }
  };

  const handleTestFeedReminder = async () => {
    setTestingFeed(true);
    try {
      const ok = await triggerTestFeedNotification('manha');
      if (ok) {
        showToast('Alerta de ração testado com sucesso (som + push)!', 'success');
      } else {
        showToast('Aviso sonoro disparado!', 'info');
      }
    } finally {
      setTimeout(() => setTestingFeed(false), 2000);
    }
  };

  const handleAlertAction = (alert: MuraAlert) => {
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

  return createPortal(
    <div
      className="fixed inset-0 z-[9995] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface border border-theme-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-theme-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center relative">
              <Bell size={20} className="text-amber-400" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                  {alerts.length}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-black text-white">Central de Alertas & Lembretes</h2>
              <p className="text-[11px] text-theme-text-muted">
                {alerts.length === 0
                  ? 'Tudo em dia no criatório!'
                  : `${alerts.length} ${alerts.length === 1 ? 'aviso requer' : 'avisos requerem'} sua atenção hoje`}
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

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Banner de Permissão Push - Cenário: Bloqueado no Navegador */}
          {permission === 'denied' && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-rose-500 text-white font-black shrink-0">
                  <Lock size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-rose-300">Notificações Bloqueadas no Navegador</p>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    O navegador está bloqueando alertas deste site. Siga o passo a passo para desbloquear e receber os avisos de alimentação e vacinas.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsUnblockOpen(true)}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🔓 Como Desbloquear no Celular</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = getNotificationPermission();
                    setPermission(current);
                    if (current === 'granted') showToast('Notificações ativadas!', 'success');
                    else showToast('Ainda bloqueado no navegador.', 'warning');
                  }}
                  className="p-2.5 bg-theme-base hover:bg-white/10 border border-theme-border rounded-xl text-theme-text-muted hover:text-white transition-all cursor-pointer"
                  title="Verificar novamente"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Banner de Permissão Push - Cenário: Não Suportado diretamente (iOS Safari fora da tela de início) */}
          {permission === 'unsupported' && (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-500 text-black font-black shrink-0">
                  <Smartphone size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-blue-300">Ativação no iPhone / Celular</p>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    No iPhone (iOS), é necessário adicionar o aplicativo à Tela de Início para habilitar avisos automáticos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsUnblockOpen(true)}
                className="w-full py-2.5 bg-blue-500 hover:bg-blue-400 text-black font-black text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📱 Ver Como Adicionar à Tela de Início</span>
              </button>
            </div>
          )}

          {/* Banner de Permissão Push - Cenário: Padrão / Ainda não solicitado */}
          {permission === 'default' && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-theme-base/60 to-orange-500/15 border border-amber-500/40 space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500 text-black font-black shrink-0">
                  <Bell size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-white">Receba Avisos Automáticos no Celular</p>
                  <p className="text-[11px] text-theme-text-muted leading-relaxed">
                    Ative as notificações push para ser avisado sobre lotes sem postura, vacinas atrasadas e horários de ração.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestPermission}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={14} />
                Ativar Notificações no Celular
              </button>
            </div>
          )}

          {/* Banner quando Concedido */}
          {permission === 'granted' && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 size={15} />
                <span>Notificações ativadas no seu aparelho</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestFeedReminder}
                  disabled={testingFeed}
                  className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Wheat size={12} />
                  <span>{testingFeed ? 'Tocando...' : 'Testar Ração'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testing}
                  className="text-[11px] font-bold text-zinc-300 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Volume2 size={12} />
                  <span>{testing ? 'Enviando...' : 'Testar Push'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Lista de Alertas Ativos */}
          {alerts.length > 0 ? (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-theme-text-muted uppercase tracking-wider">
                Avisos Pendentes de Hoje
              </p>
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  onClick={() => handleAlertAction(alert)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 group ${
                    alert.urgency === 'high'
                      ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-400/60'
                      : 'bg-theme-base border-theme-border hover:border-theme-primary/60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      alert.urgency === 'high' ? 'bg-rose-500/20' : 'bg-theme-surface'
                    }`}
                  >
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white group-hover:text-amber-400 transition-colors">
                      {alert.title}
                    </p>
                    <p className="text-[11px] text-theme-text-muted mt-0.5 leading-relaxed">
                      {alert.message}
                    </p>
                    {alert.actionLabel && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-400 mt-2 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        <span>{alert.actionLabel}</span>
                        <ChevronRight size={10} />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-sm font-black text-white">Nenhum aviso pendente!</p>
              <p className="text-xs text-theme-text-muted max-w-xs mx-auto">
                Todos os lotes de postura tiveram coleta registrada, não há vacinas atrasadas e a ração está em ordem.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme-border shrink-0 flex items-center justify-between bg-theme-surface/50">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/settings');
            }}
            className="text-xs font-bold text-theme-text-muted hover:text-white transition-colors cursor-pointer"
          >
            ⚙️ Ajustar Horários & Alertas
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-theme-base border border-theme-border rounded-xl text-xs font-bold text-white hover:border-white/20 transition-all cursor-pointer"
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
