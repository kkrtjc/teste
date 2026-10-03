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
 * Obtém o status atual de permissão do navegador
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Emite um som harmônico suave de alerta usando a Web Audio API nativa
 */
export function playAlertChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    
    // Duplo tom harmônico estilo notificação moderna (Mi5 -> Lá5)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.00, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.35); // E6
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.18);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.debug('[NotificationEngine] AudioContext chime skipped:', err);
  }
}

/**
 * Solicita permissão para Notificações Push nativas do navegador
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    // Chamada direta para preservar ativação por toque no iOS Safari 16.4+ standalone
    const req = Notification.requestPermission();
    if (req && typeof req.then === 'function') {
      const res = await req;
      return res === 'granted';
    }
    return new Promise<boolean>((resolve) => {
      Notification.requestPermission((res) => resolve(res === 'granted'));
    });
  } catch (err) {
    console.warn('[NotificationEngine] Erro ao pedir permissão:', err);
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
    playChime?: boolean;
  }
): Promise<boolean> {
  if (options.playChime !== false) {
    playAlertChime();
  }

  // Tenta vibração direta no dispositivo se disponível
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {}

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
    // 1. Tenta obter o Service Worker pronto (melhor suporte no Android PWA e iOS Standalone)
    if ('serviceWorker' in navigator) {
      try {
        const swReadyPromise = navigator.serviceWorker.ready;
        const timeoutPromise = new Promise<null>(res => setTimeout(() => res(null), 1500));
        let reg = await Promise.race([swReadyPromise, timeoutPromise]);
        if (!reg) {
          reg = (await navigator.serviceWorker.getRegistration()) || null;
        }
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, notifOptions);
          return true;
        }
      } catch (swErr) {
        console.warn('[NotificationEngine] Falha ao exibir via ServiceWorker:', swErr);
      }
    }

    // 2. Fallback nativo do navegador
    try {
      new Notification(title, notifOptions);
      return true;
    } catch (notifErr) {
      console.warn('[NotificationEngine] Falha ao exibir via new Notification:', notifErr);
    }
  } catch (err) {
    console.warn('[NotificationEngine] Erro geral ao disparar notificação:', err);
  }

  return false;
}

/**
 * Dispara um teste rápido do lembrete de ração
 */
export async function triggerTestFeedNotification(slot: 'manha' | 'tarde' = 'manha'): Promise<boolean> {
  const isManha = slot === 'manha';
  const title = isManha ? '🌾 1º Trato (Manhã) — Lembrete de Ração' : '🌾 2º Trato (Tarde) — Lembrete de Ração';
  const body = isManha 
    ? 'Horário habitual de trato da manhã! As aves dos lotes aguardam alimentação.'
    : 'Horário do 2º trato da tarde! Não se esqueça de registrar o fornecimento de ração.';
  
  return triggerDeviceNotification(title, {
    body,
    tag: `test-feed-${Date.now()}`,
    data: { url: '/lots' },
    playChime: true,
  });
}

/**
 * Varre todos os dados do criatório e gera a lista em tempo real de alertas ativos
 */
export function scanActiveAlerts(
  eggLots: EggLot[],
  meatLots: MeatLot[],
  birds: Bird[] = [],
  settings: NotificationSettings = DEFAULT_NOTIF_SETTINGS,
  dailyFeedStatus: DailyFeedStatus = {}
): MuraAlert[] {
  // Se o criador desativou os alertas, retorna lista vazia imediatamente
  if (settings.enabled === false) {
    return [];
  }

  const alerts: MuraAlert[] = [];
  const today = todayISO();
  const now = new Date();
  const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const time1 = settings.feedReminderTime1 || '07:30';
  const time2 = settings.feedReminderTime2 || '16:30';

  // 0. LEMBRETE GERAL DE RAÇÃO DO CRIATÓRIO
  // Garante que todo criador receba o lembrete de alimentar as aves, mesmo sem lotes cadastrados
  if (settings.alertRacao) {
    // 1º Trato (Manhã): a partir de time1 até time2 se ainda não confirmado
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
    } 
    // 2º Trato (Tarde/Noite): a partir de time2 se ainda não confirmado
    else if (currentHM >= time2) {
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
        actionState: { tab: 'postura', scrollToLotId: lote.id, openHealthLotId: lote.id },
        actionLabel: 'Ver Lote',
        lotId: lote.id,
        baia: baiaStr,
        lotType: 'postura',
      });
    }

    // C. Horários de Ração e Trato
    if (settings.alertRacao) {
      const now = new Date();
      const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const time1 = settings.feedReminderTime1 || '07:30';
      const time2 = settings.feedReminderTime2 || '16:30';

      const feedEntriesHoje = (lote.feedEntries || []).filter(f => f.data === today);
      const tratosHoje = feedEntriesHoje.length;

      // 1º Trato (Manhã)
      if (currentHM >= time1 && currentHM < time2) {
        if (tratosHoje === 0) {
          alerts.push({
            id: `racao-t1-${lote.id}-${today}`,
            type: 'horario_racao',
            title: `🌾 1º Trato (${time1}): Baia ${baiaStr}`,
            message: `Horário de alimentar as aves! Lote na Baia ${baiaStr} aguarda o trato da manhã.`,
            urgency: 'high',
            date: today,
            actionRoute: '/lots',
            actionState: { tab: 'postura', scrollToLotId: lote.id, openFeedLotId: lote.id },
            actionLabel: 'Registrar Ração',
            lotId: lote.id,
            baia: baiaStr,
            lotType: 'postura',
          });
        }
      } 
      // 2º Trato (Tarde/Noite)
      else if (currentHM >= time2) {
        if (tratosHoje === 0) {
          alerts.push({
            id: `racao-urgente-${lote.id}-${today}`,
            type: 'horario_racao',
            title: `🌾 Alimentação Pendente: Baia ${baiaStr}`,
            message: `Atenção: Já passou das ${time2} e nenhum trato de ração foi registrado hoje para o lote da Baia ${baiaStr}.`,
            urgency: 'high',
            date: today,
            actionRoute: '/lots',
            actionState: { tab: 'postura', scrollToLotId: lote.id, openFeedLotId: lote.id },
            actionLabel: 'Registrar Ração Agora',
            lotId: lote.id,
            baia: baiaStr,
            lotType: 'postura',
          });
        } else if (tratosHoje === 1) {
          alerts.push({
            id: `racao-t2-${lote.id}-${today}`,
            type: 'horario_racao',
            title: `🌾 2º Trato (${time2}): Baia ${baiaStr}`,
            message: `Horário do 2º trato! Registre a alimentação da tarde para o lote da Baia ${baiaStr}.`,
            urgency: 'high',
            date: today,
            actionRoute: '/lots',
            actionState: { tab: 'postura', scrollToLotId: lote.id, openFeedLotId: lote.id },
            actionLabel: 'Registrar 2º Trato',
            lotId: lote.id,
            baia: baiaStr,
            lotType: 'postura',
          });
        }
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
          actionState: { tab: 'postura', scrollToLotId: lote.id, openHealthLotId: lote.id },
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
            actionState: { tab: 'postura', scrollToLotId: lote.id, openHealthLotId: lote.id },
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
        actionState: { tab: lotType, scrollToLotId: lote.id, openHealthLotId: lote.id },
        actionLabel: 'Ver Lote',
        lotId: lote.id,
        baia: baiaStr,
        lotType,
      });
    }

    // B. Ração hoje
    if (settings.alertRacao) {
      const now = new Date();
      const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const time1 = settings.feedReminderTime1 || '07:30';
      const time2 = settings.feedReminderTime2 || '16:30';

      const feedEntriesHoje = (lote.feedEntries || []).filter(f => f.data === today);
      const tratosHoje = feedEntriesHoje.length;

      // 1º Trato (Manhã)
      if (currentHM >= time1 && currentHM < time2) {
        if (tratosHoje === 0) {
          alerts.push({
            id: `racao-meat-t1-${lote.id}-${today}`,
            type: 'horario_racao',
            title: `🌾 1º Trato (${time1}): Baia ${baiaStr} (${isPintinho ? 'Pintinhos' : 'Engorda'})`,
            message: `Horário de alimentar as aves! Lote de ${isPintinho ? 'pintinhos' : 'engorda'} na Baia ${baiaStr} aguarda o trato da manhã.`,
            urgency: 'high',
            date: today,
            actionRoute: '/lots',
            actionState: { tab: lotType, scrollToLotId: lote.id, openFeedLotId: lote.id },
            actionLabel: 'Registrar Ração',
            lotId: lote.id,
            baia: baiaStr,
            lotType,
          });
        }
      } 
      // 2º Trato (Tarde/Noite)
      else if (currentHM >= time2) {
        if (tratosHoje === 0) {
          alerts.push({
            id: `racao-meat-urgente-${lote.id}-${today}`,
            type: 'horario_racao',
            title: `🌾 Alimentação Pendente: Baia ${baiaStr} (${isPintinho ? 'Pintinhos' : 'Engorda'})`,
            message: `Atenção: Já passou das ${time2} e nenhum trato de ração foi registrado hoje para o lote da Baia ${baiaStr}.`,
            urgency: 'high',
            date: today,
            actionRoute: '/lots',
            actionState: { tab: lotType, scrollToLotId: lote.id, openFeedLotId: lote.id },
            actionLabel: 'Registrar Ração Agora',
            lotId: lote.id,
            baia: baiaStr,
            lotType,
          });
        } else if (tratosHoje === 1) {
          alerts.push({
            id: `racao-meat-t2-${lote.id}-${today}`,
            type: 'horario_racao',
            title: `🌾 2º Trato (${time2}): Baia ${baiaStr} (${isPintinho ? 'Pintinhos' : 'Engorda'})`,
            message: `Horário do 2º trato! Registre a alimentação da tarde para o lote de ${isPintinho ? 'pintinhos' : 'engorda'} da Baia ${baiaStr}.`,
            urgency: 'high',
            date: today,
            actionRoute: '/lots',
            actionState: { tab: lotType, scrollToLotId: lote.id, openFeedLotId: lote.id },
            actionLabel: 'Registrar 2º Trato',
            lotId: lote.id,
            baia: baiaStr,
            lotType,
          });
        }
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
          actionState: { tab: 'engorda', scrollToLotId: lote.id, openWeighLotId: lote.id },
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
          actionState: { tab: lotType, scrollToLotId: lote.id, openHealthLotId: lote.id },
          actionLabel: 'Aplicar Vacina',
          lotId: lote.id,
          baia: baiaStr,
          lotType,
        });
      });
    }
  });

  // 3. AVES INDIVIDUAIS (Quarentena se houver)
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
