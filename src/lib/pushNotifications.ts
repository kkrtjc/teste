// ─────────────────────────────────────────────────────────────────────────────
// pushNotifications.ts
// Gerencia permissão e agendamento de notificações push locais de trial e coleta.
// Funciona em: Android Chrome ✅ | iOS Safari 16.4+ ✅
// Fallback silencioso em dispositivos sem suporte — sem quebra de funcionalidade.
// ─────────────────────────────────────────────────────────────────────────────

const PUSH_PERMISSION_KEY = '@mura-manager:push-permission-asked';
const PUSH_SCHEDULED_KEY  = '@mura-manager:push-scheduled-at';
const EGG_REMINDER_KEY    = '@mura-manager:egg-reminder-scheduled';

/** Verifica se o navegador suporta notificações push */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  );
}

/** Retorna o estado atual da permissão */
export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Solicita permissão de notificação push ao usuário.
 * Só chama se ainda não tiver sido pedido ou se estava 'default'.
 * Retorna `true` se permissão concedida.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!isPushSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  // Evita pedir permissão mais de 1x por sessão
  if (sessionStorage.getItem(PUSH_PERMISSION_KEY)) return false;
  sessionStorage.setItem(PUSH_PERMISSION_KEY, '1');

  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

/**
 * Agenda uma notificação local de aviso de trial para o dia seguinte.
 */
export async function scheduleDailyTrialReminder(remainingDays: number): Promise<void> {
  if (!isPushSupported()) return;
  if (Notification.permission !== 'granted') return;

  const lastScheduled = localStorage.getItem(PUSH_SCHEDULED_KEY);
  if (lastScheduled) {
    const elapsed = Date.now() - Number(lastScheduled);
    if (elapsed < 20 * 60 * 60 * 1000) return; // menos de 20h atrás
  }

  localStorage.setItem(PUSH_SCHEDULED_KEY, String(Date.now()));

  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return;

  const urgency = remainingDays <= 1 ? '🚨' : remainingDays <= 3 ? '⚠️' : '⏳';
  const title = `${urgency} Mura Manager — Trial expira em ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`;
  const body = remainingDays <= 1
    ? 'Seu período de teste termina hoje! Assine agora e não perca seus dados do criatório.'
    : remainingDays <= 3
    ? `Restam apenas ${remainingDays} dias! Garanta o super desconto de lançamento.`
    : `Você tem ${remainingDays} dias de trial. Assine e garanta desconto de 60% no lançamento!`;

  const msUntilReminder = 24 * 60 * 60 * 1000; // 24h
  reg.active?.postMessage({
    type: 'SCHEDULE_TRIAL_REMINDER',
    delayMs: msUntilReminder,
    title,
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'mura-trial-reminder',
    data: { url: '/' }
  });
}

/**
 * Cancela a notificação de trial agendada (chamar quando usuário paga).
 */
export async function cancelTrialReminder(): Promise<void> {
  if (!isPushSupported()) return;
  localStorage.removeItem(PUSH_SCHEDULED_KEY);

  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return;

  reg.active?.postMessage({ type: 'CANCEL_TRIAL_REMINDER' });
}

/**
 * Agenda o lembrete diário de coleta de ovos se o usuário ainda não tiver registrado hoje.
 */
export async function syncDailyEggReminder(hasRegisteredToday: boolean): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return;

  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const lastEggScheduled = localStorage.getItem(EGG_REMINDER_KEY);

  if (hasRegisteredToday) {
    // Usuário já registrou a coleta hoje! Cancela lembrete de hoje
    reg.active?.postMessage({ type: 'CANCEL_EGG_REMINDER' });
    return;
  }

  // Se já agendou hoje, não duplica
  if (lastEggScheduled === todayStr) return;
  localStorage.setItem(EGG_REMINDER_KEY, todayStr);

  // Calcula quanto tempo até as 17:30 de hoje (ou em 4 horas se já passou das 17h)
  const now = new Date();
  const targetTime = new Date();
  targetTime.setHours(17, 30, 0, 0);

  let delayMs = targetTime.getTime() - now.getTime();
  if (delayMs <= 0) {
    // Se já passou das 17h30 e não registrou, agenda para daqui a 2 horas ou manhã seguinte
    delayMs = 2 * 60 * 60 * 1000;
  }

  reg.active?.postMessage({
    type: 'SCHEDULE_EGG_REMINDER',
    delayMs,
    title: '🥚 Lembrete de Coleta Mura Manager',
    body: 'Ei, não se esqueça de registrar as coletas de hoje para manter seu criatório atualizado!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'mura-egg-reminder',
    data: { url: '/lots' }
  });
}
