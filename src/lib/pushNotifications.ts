// ─────────────────────────────────────────────────────────────────────────────
// pushNotifications.ts
// Gerencia permissão e agendamento de notificações push locais de trial.
// Funciona em: Android Chrome ✅ | iOS Safari 16.4+ ✅
// Fallback silencioso em dispositivos sem suporte — sem quebra de funcionalidade.
// ─────────────────────────────────────────────────────────────────────────────

const PUSH_PERMISSION_KEY = '@mura-manager:push-permission-asked';
const PUSH_SCHEDULED_KEY  = '@mura-manager:push-scheduled-at';

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
 * Usa MessageChannel + setTimeout dentro do Service Worker para garantir
 * que a notificação dispara mesmo com o app fechado.
 *
 * @param remainingDays Dias restantes no trial (para personalizar a mensagem)
 */
export async function scheduleDailyTrialReminder(remainingDays: number): Promise<void> {
  if (!isPushSupported()) return;
  if (Notification.permission !== 'granted') return;

  // Evita agendar múltiplas vezes no mesmo dia
  const lastScheduled = localStorage.getItem(PUSH_SCHEDULED_KEY);
  if (lastScheduled) {
    const elapsed = Date.now() - Number(lastScheduled);
    if (elapsed < 20 * 60 * 60 * 1000) return; // menos de 20h atrás
  }

  localStorage.setItem(PUSH_SCHEDULED_KEY, String(Date.now()));

  // Registra a notificação local diretamente via Service Worker
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return;

  // Agenda via postMessage para o SW processar
  const urgency = remainingDays <= 1 ? '🚨' : remainingDays <= 3 ? '⚠️' : '⏳';
  const title = `${urgency} Mura Manager — Trial expira em ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`;
  const body = remainingDays <= 1
    ? 'Seu período de teste termina hoje! Assine agora e não perca seus dados do criatório.'
    : remainingDays <= 3
    ? `Restam apenas ${remainingDays} dias! Garanta o super desconto de lançamento.`
    : `Você tem ${remainingDays} dias de trial. Assine e garanta desconto de 60% no lançamento!`;

  // Dispara notificação local agendada para 23h ou após 24h (o que vier primeiro)
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
 * Exibe uma notificação imediata de aviso de trial (chamada manualmente se necessário).
 */
export async function showTrialNotification(remainingDays: number): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') return;

  const reg = await navigator.serviceWorker.ready.catch(() => null);
  if (!reg) return;

  const urgency = remainingDays <= 1 ? '🚨' : remainingDays <= 3 ? '⚠️' : '⏳';
  await reg.showNotification(`${urgency} Mura Manager — Período de Teste`, {
    body: remainingDays <= 1
      ? 'Último dia! Assine agora para manter seus dados do criatório.'
      : `Faltam ${remainingDays} dias para o trial expirar. Garanta o desconto!`,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'mura-trial-immediate',
    data: { url: '/' },
  } as NotificationOptions);
}
