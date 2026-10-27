import { todayLocalISO } from './dates';
import localforage from 'localforage';
import type { Bird } from './AppContext';

export type AlertType = 
  | 'vacina_atrasada'
  | 'vacina_hoje'
  | 'horario_racao'
  | 'quarentena';

export interface MuraAlert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  urgency: 'high' | 'medium' | 'info';
  date: string;
  actionRoute?: string;
  actionState?: Record<string, unknown>;
  actionLabel?: string;
  baia?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  alertRacao: boolean;
  alertQuarentena: boolean;
  alertVacinas: boolean;
  feedReminderTime1?: string; // ex: "07:30"
  feedReminderTime2?: string; // ex: "16:30"
}

export const DEFAULT_NOTIF_SETTINGS: NotificationSettings = {
  enabled: true,
  alertRacao: true,
  alertQuarentena: true,
  alertVacinas: true,
  feedReminderTime1: '07:30',
  feedReminderTime2: '16:30',
};

const SETTINGS_STORAGE_KEY = '@mura-manager:notification-settings';
const NOTIF_LOG_KEY = '@mura-manager:notifications-fired';

function todayISO() {
  return todayLocalISO();
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

export interface DailyFeedStatus {
  manha?: boolean;
  manhaTime?: string;
  tarde?: boolean;
  tardeTime?: string;
}

export const DAILY_FEED_KEY = '@mura-manager:daily-feed-log';

export async function getDailyFeedStatus(): Promise<DailyFeedStatus> {
  const today = todayISO();
  try {
    const data = await localforage.getItem<Record<string, DailyFeedStatus>>(DAILY_FEED_KEY);
    return data?.[today] || {};
  } catch {
    return {};
  }
}

export async function saveDailyFeedStatus(status: DailyFeedStatus): Promise<void> {
  const today = todayISO();
  try {
    const data = (await localforage.getItem<Record<string, DailyFeedStatus>>(DAILY_FEED_KEY)) || {};
    data[today] = status;
    await localforage.setItem(DAILY_FEED_KEY, data);
  } catch (err) {
    console.error('[NotificationEngine] Erro ao salvar status de alimentação:', err);
  }
}

/**
 * Toca sinal sonoro amigável (chime estilo Apple/Slack) via Web Audio API
 */
export function playAlertChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tom 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Tom 2: G5 (783.99 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.25, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1000);
  } catch (err) {
    console.warn('[NotificationEngine] AudioContext bloqueado:', err);
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.error('[NotificationEngine] Erro ao solicitar permissão:', err);
    return 'denied';
  }
}

export async function triggerDeviceNotification(
  title: string,
  options?: NotificationOptions & { playChime?: boolean }
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  if (options?.playChime !== false) {
    playAlertChime();
  }

  const notificationOpts: NotificationOptions = {
    icon: '/preview_bird_profile.png',
    badge: '/preview_bird_profile.png',
    ...options,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, notificationOpts);
        return true;
      }
    }
    new Notification(title, notificationOpts);
    return true;
  } catch (err) {
    console.warn('[NotificationEngine] Falha ao disparar notificação nativa:', err);
    return false;
  }
}

export async function triggerTestFeedNotification(slot: 'manha' | 'tarde' = 'manha'): Promise<boolean> {
  const isManha = slot === 'manha';
  const title = isManha ? '🌾 1º Trato (Manhã) — Lembrete de Ração' : '🌾 2º Trato (Tarde) — Lembrete de Ração';
  const body = isManha 
    ? 'Horário habitual de trato da manhã! As aves aguardam alimentação.'
    : 'Horário do 2º trato da tarde! Não se esqueça de verificar os bebedouros e comedouros.';
  
  return triggerDeviceNotification(title, {
    body,
    tag: `test-feed-${Date.now()}`,
    data: { url: '/' },
    playChime: true,
  });
}

/**
 * Varre todos os dados do criatório e gera a lista em tempo real de alertas ativos.
 */
export function scanActiveAlerts(
  birds: Bird[] = [],
  settings: NotificationSettings = DEFAULT_NOTIF_SETTINGS,
  dailyFeedStatus: DailyFeedStatus = {}
): MuraAlert[] {
  if (settings.enabled === false) {
    return [];
  }

  const alerts: MuraAlert[] = [];
  const today = todayISO();
  const now = new Date();
  const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const time1 = settings.feedReminderTime1 || '07:30';
  const time2 = settings.feedReminderTime2 || '16:30';

  // 1. LEMBRETE GERAL DE RAÇÃO DO CRIATÓRIO
  if (settings.alertRacao) {
    if (currentHM >= time1 && currentHM < time2) {
      if (!dailyFeedStatus.manha) {
        alerts.push({
          id: `racao-geral-t1-${today}`,
          type: 'horario_racao',
          title: `🌾 1º Trato da Manhã (${time1})`,
          message: `Horário de alimentar as aves! Coloque ração e água fresca nos bebedouros do criatório.`,
          urgency: 'high',
          date: today,
          actionLabel: '✓ Confirmar Trato Feito',
          actionRoute: '__CONFIRM_FEED_MANHA__',
        });
      }
    } else if (currentHM >= time2) {
      if (!dailyFeedStatus.tarde) {
        const isManhaDone = Boolean(dailyFeedStatus.manha);
        alerts.push({
          id: `racao-geral-t2-${today}`,
          type: 'horario_racao',
          title: isManhaDone ? `🌾 2º Trato da Tarde (${time2})` : `🌾 Trato Pendente das Aves (${time2})`,
          message: isManhaDone
            ? `Horário do 2º trato! Verifique os comedouros e sirva a alimentação da tarde.`
            : `Atenção: Já passou das ${time2} e o trato das aves ainda não foi confirmado hoje.`,
          urgency: 'high',
          date: today,
          actionLabel: '✓ Confirmar Trato Feito',
          actionRoute: '__CONFIRM_FEED_TARDE__',
        });
      }
    }
  }

  // 2. AVES INDIVIDUAIS (Quarentena / Isolamento se houver)
  if (settings.alertQuarentena && Array.isArray(birds) && birds.length > 0) {
    birds.forEach(bird => {
      const st = (bird.status || '').toLowerCase();
      if (st === 'quarentena' || st === 'isolamento' || st === 'tratamento') {
        alerts.push({
          id: `quarentena-bird-${bird.id}`,
          type: 'quarentena',
          title: `🔴 Ave em Quarentena: ${bird.nome || bird.anilha || 'Sem anilha'}`,
          message: `A ave da Baia ${bird.baia || 'Geral'} está sob isolamento/tratamento médico (${bird.status}).`,
          urgency: 'high',
          date: today,
          actionRoute: '/birds',
          actionState: { selectedBirdId: bird.id },
          actionLabel: 'Ver Ave',
        });
      }
    });
  }

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
    const urgentAlerts = alerts.filter(a => a.urgency === 'high');

    for (const alert of urgentAlerts) {
      const logKey = `${today}:${alert.id}`;
      if (!firedLog[logKey]) {
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
