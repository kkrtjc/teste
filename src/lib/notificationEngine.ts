import localforage from 'localforage';
import type { EggLot, MeatLot, Bird } from './AppContext';
import { getVaccineSuggestions } from './vaccinationProtocols';

export type AlertType = 
  | 'postura_sem_registro'
  | 'vacina_atrasada'
  | 'vacina_hoje'
  | 'horario_racao'
  | 'quarentena'
  | 'pesagem_15_dias';

export interface MuraAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  urgency: 'high' | 'medium' | 'info';
  date: string;
  actionRoute?: string;
  actionState?: any;
  actionLabel?: string;
  lotId?: string;
  baia?: string;
  lotType?: 'postura' | 'engorda' | 'pintinhos';
}

export interface NotificationSettings {
  enabled: boolean;
  alertPosturaSemRegistro: boolean;
  alertVacinas: boolean;
  alertRacao: boolean;
  alertQuarentena: boolean;
  alertPesagens: boolean;
  feedReminderTime1?: string; // ex: "07:30"
  feedReminderTime2?: string; // ex: "16:30"
}

export const DEFAULT_NOTIF_SETTINGS: NotificationSettings = {
  enabled: true,
  alertPosturaSemRegistro: true,
  alertVacinas: true,
  alertRacao: true,
  alertQuarentena: true,
  alertPesagens: true,
  feedReminderTime1: '07:30',
  feedReminderTime2: '16:30',
};

const SETTINGS_STORAGE_KEY = '@mura-manager:notification-settings';
const NOTIF_LOG_KEY = '@mura-manager:notifications-fired';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function calcDays(start: string) {
  if (!start) return 0;
  const s = new Date(start);
  const n = new Date();
  s.setHours(0, 0, 0, 0);
  n.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((n.getTime() - s.getTime()) / 86400000));
}

/**
 * Carrega as preferências de notificação do usuário
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const saved = await localforage.getItem<NotificationSettings>(SETTINGS_STORAGE_KEY);
    return { ...DEFAULT_NOTIF_SETTINGS, ...(saved || {}) };
  } catch {
    return DEFAULT_NOTIF_SETTINGS;
  }
}

/**
 * Salva as preferências de notificação do usuário
 */
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await localforage.setItem(SETTINGS_STORAGE_KEY, settings);
  } catch (err) {
    console.error('[NotificationEngine] Erro ao salvar configurações:', err);
  }
}

/**
 * Obtém o status atual de permissão do navegador
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Solicita permissão para Notificações Push nativas do navegador
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (err) {
    console.error('[NotificationEngine] Erro ao pedir permissão:', err);
    return false;
  }
}

/**
 * Dispara uma notificação nativa no dispositivo (celular ou desktop)
 */
export async function triggerDeviceNotification(
  title: string,
  options: {
    body: string;
    tag?: string;
    icon?: string;
    data?: any;
  }
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const notifOptions: NotificationOptions = {
    body: options.body,
    icon: options.icon || '/logo.jpg',
    badge: '/logo.jpg',
    tag: options.tag || 'mura-alert',
    data: options.data,
    requireInteraction: false,
    ...({
      vibrate: [200, 100, 200],
    } as any),
  };

  try {
    // Tenta usar Service Worker se disponível (melhor suporte no Android PWA)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, notifOptions);
        return true;
      }
    }
    // Fallback nativo
    new Notification(title, notifOptions);
    return true;
  } catch (err) {
    console.warn('[NotificationEngine] Falha ao exibir notificação:', err);
    return false;
  }
}

/**
 * Varre todos os dados do criatório e gera a lista em tempo real de alertas ativos
 */
export function scanActiveAlerts(
  eggLots: EggLot[],
  meatLots: MeatLot[],
  _birds: Bird[],
  settings: NotificationSettings = DEFAULT_NOTIF_SETTINGS
): MuraAlert[] {
  const alerts: MuraAlert[] = [];
  const today = todayISO();

  // 1. LOTES DE POSTURA
  eggLots.forEach(lote => {
    if (lote.status === 'Encerrado') return;
    const baiaStr = lote.baia || 'Sem identificação';

    // A. Postura sem registro hoje
    if (settings.alertPosturaSemRegistro) {
      const temRegistroHoje = (lote.registros || []).some(r => r.data === today);
      if (!temRegistroHoje) {
        alerts.push({
          id: `postura-sem-registro-${lote.id}-${today}`,
          type: 'postura_sem_registro',
          title: `Postura: Baia ${baiaStr} sem ovos hoje`,
          message: `O lote de postura na Baia ${baiaStr} ainda não possui coleta de ovos lançada hoje.`,
          urgency: 'high',
          date: today,
          actionRoute: '/eggs',
          actionState: { scrollToLotId: lote.id },
          actionLabel: 'Lançar Ovos Agora',
          lotId: lote.id,
          baia: baiaStr,
          lotType: 'postura',
        });
      }
    }

    // B. Quarentena ativa
    if (settings.alertQuarentena && lote.quarentena?.ativa) {
      alerts.push({
        id: `quarentena-postura-${lote.id}`,
        type: 'quarentena',
        title: `🔴 Quarentena: Baia ${baiaStr}`,
        message: `Lote em quarentena ativa: ${lote.quarentena.motivoQuarentena || 'Acompanhamento médico em andamento'}.`,
        urgency: 'high',
        date: today,
        actionRoute: '/lots',
        actionLabel: 'Ver Lote',
        lotId: lote.id,
        baia: baiaStr,
        lotType: 'postura',
      });
    }

    // C. Ração hoje
    if (settings.alertRacao) {
      const temRacaoHoje = (lote.feedEntries || []).some(f => f.data === today);
      if (!temRacaoHoje) {
        alerts.push({
          id: `racao-postura-${lote.id}-${today}`,
          type: 'horario_racao',
          title: `Ração: Baia ${baiaStr} aguarda registro`,
          message: `Ainda não foi registrado o consumo de ração de hoje para o lote da Baia ${baiaStr}.`,
          urgency: 'medium',
          date: today,
          actionRoute: '/lots',
          actionLabel: 'Registrar Ração',
          lotId: lote.id,
          baia: baiaStr,
          lotType: 'postura',
        });
      }
    }

    // D. Vacinas do lote
    if (settings.alertVacinas) {
      const vr = lote.vaccinationRecords || [];
      const appliedIds = vr
        .filter(v => v.status === 'Aplicada' && v.protocoloId)
        .map(v => v.protocoloId!);
      const dias = calcDays(lote.dataInicio);
      const { overdue } = getVaccineSuggestions(dias, appliedIds);

      overdue.forEach(vac => {
        alerts.push({
          id: `vacina-overdue-${lote.id}-${vac.id}`,
          type: 'vacina_atrasada',
          title: `💉 Vacina Atrasada: ${vac.nome} (Baia ${baiaStr})`,
          message: `A vacina ${vac.nome} deveria ter sido aplicada aos ${vac.idadeAplicacaoDias} dias. O lote está com ${dias} dias.`,
          urgency: 'high',
          date: today,
          actionRoute: '/lots',
          actionLabel: 'Aplicar Vacina',
          lotId: lote.id,
          baia: baiaStr,
          lotType: 'postura',
        });
      });

      // Reforço programado
      vr.forEach(v => {
        if (v.dataProximaDose && v.dataProximaDose <= today) {
          alerts.push({
            id: `vacina-reforco-${lote.id}-${v.id}`,
            type: 'vacina_hoje',
            title: `💉 Dia de Reforço: ${v.vacina} (Baia ${baiaStr})`,
            message: `O lote da Baia ${baiaStr} atingiu a data prevista para o reforço da vacina ${v.vacina}.`,
            urgency: 'high',
            date: today,
            actionRoute: '/lots',
            actionLabel: 'Ver Lote',
            lotId: lote.id,
            baia: baiaStr,
            lotType: 'postura',
          });
        }
      });
    }
  });

  // 2. LOTES DE ENGORDA E PINTINHOS
  meatLots.forEach(lote => {
    if (lote.status === 'Abatido') return;
    const isPintinho = lote.id.startsWith('chick-');
    const lotType = isPintinho ? 'pintinhos' : 'engorda';
    const baiaStr = lote.baia || 'Sem identificação';
    const baseDate = lote.dataNascimento || lote.dataInicio;
    const dias = calcDays(baseDate) + (lote.idadeInicialDias || 0);

    // A. Quarentena
    if (settings.alertQuarentena && lote.quarentena?.ativa) {
      alerts.push({
        id: `quarentena-meat-${lote.id}`,
        type: 'quarentena',
        title: `🔴 Quarentena: Baia ${baiaStr} (${isPintinho ? 'Pintinhos' : 'Engorda'})`,
        message: `Lote em quarentena ativa: ${lote.quarentena.motivoQuarentena || 'Acompanhamento médico em andamento'}.`,
        urgency: 'high',
        date: today,
        actionRoute: '/lots',
        actionLabel: 'Ver Lote',
        lotId: lote.id,
        baia: baiaStr,
        lotType,
      });
    }

    // B. Ração hoje
    if (settings.alertRacao) {
      const temRacaoHoje = (lote.feedEntries || []).some(f => f.data === today);
      if (!temRacaoHoje) {
        alerts.push({
          id: `racao-meat-${lote.id}-${today}`,
          type: 'horario_racao',
          title: `Ração: Baia ${baiaStr} (${isPintinho ? 'Pintinhos' : 'Engorda'})`,
          message: `Ainda não foi registrado o consumo de ração de hoje para o lote da Baia ${baiaStr}.`,
          urgency: 'medium',
          date: today,
          actionRoute: '/lots',
          actionLabel: 'Registrar Ração',
          lotId: lote.id,
          baia: baiaStr,
          lotType,
        });
      }
    }

    // C. Pesagem de 15 dias (apenas engorda)
    if (settings.alertPesagens && !isPintinho) {
      const pesagens = [...(lote.pesagens || [])].sort((a, b) => a.data.localeCompare(b.data));
      const lastPesagem = pesagens.length > 0 ? pesagens[pesagens.length - 1] : null;
      const daysSince = lastPesagem ? calcDays(lastPesagem.data) : calcDays(lote.dataInicio || '');
      if (daysSince >= 15) {
        alerts.push({
          id: `pesagem-15d-${lote.id}`,
          type: 'pesagem_15_dias',
          title: `⚖️ Dia de Pesar: Baia ${baiaStr}`,
          message: `Lote completou ${daysSince} dias sem nova pesagem! Pese uma amostra para manter a previsão de abate precisa.`,
          urgency: 'medium',
          date: today,
          actionRoute: '/lots',
          actionLabel: 'Pesar Agora',
          lotId: lote.id,
          baia: baiaStr,
          lotType: 'engorda',
        });
      }
    }

    // D. Vacinas
    if (settings.alertVacinas) {
      const vr = lote.vaccinationRecords || [];
      const appliedIds = vr
        .filter(v => v.status === 'Aplicada' && v.protocoloId)
        .map(v => v.protocoloId!);
      const { overdue } = getVaccineSuggestions(dias, appliedIds);

      overdue.forEach(vac => {
        alerts.push({
          id: `vacina-meat-overdue-${lote.id}-${vac.id}`,
          type: 'vacina_atrasada',
          title: `💉 Vacina Atrasada: ${vac.nome} (Baia ${baiaStr})`,
          message: `A vacina ${vac.nome} deveria ter sido aplicada aos ${vac.idadeAplicacaoDias} dias. O lote está com ${dias} dias.`,
          urgency: 'high',
          date: today,
          actionRoute: '/lots',
          actionLabel: 'Aplicar Vacina',
          lotId: lote.id,
          baia: baiaStr,
          lotType,
        });
      });
    }
  });

  return alerts;
}

/**
 * Varre e envia notificações automáticas para o aparelho (com rate-limit diário)
 */
export async function checkAndDispatchDailyNotifications(alerts: MuraAlert[]): Promise<number> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 0;
  if (Notification.permission !== 'granted') return 0;

  const today = todayISO();
  let firedCount = 0;

  try {
    const firedLog = (await localforage.getItem<Record<string, string>>(NOTIF_LOG_KEY)) || {};

    // Pega apenas alertas de alta urgência para envio push para não poluir
    const urgentAlerts = alerts.filter(a => a.urgency === 'high');

    for (const alert of urgentAlerts) {
      const logKey = `${today}:${alert.id}`;
      if (!firedLog[logKey]) {
        // Envia
        const success = await triggerDeviceNotification(alert.title, {
          body: alert.message,
          tag: alert.id,
        });

        if (success) {
          firedLog[logKey] = new Date().toISOString();
          firedCount++;
        }
      }
    }

    await localforage.setItem(NOTIF_LOG_KEY, firedLog);
  } catch (err) {
    console.error('[NotificationEngine] Erro ao disparar notificações diárias:', err);
  }

  return firedCount;
}
