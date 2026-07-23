const CACHE_NAME = 'mura-manager-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// ── Instalação e cache ──────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Ativação e limpeza de caches antigos ───────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ── Estratégia Cache First com Fallback para Rede ─────────────────────────
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('supabase.co') || e.request.url.includes('chrome-extension')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});

// ── Push Notification Handler ──────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;

  let payload = { title: 'Mura Manager', body: 'Verifique seus dados do criatório.', icon: '/favicon.svg', badge: '/favicon.svg', tag: 'mura-push', data: { url: '/' } };
  try { payload = { ...payload, ...e.data.json() }; } catch {}

  e.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: payload.data,
      requireInteraction: false,
      silent: false,
    })
  );
});

// ── Notificação clicada: abre o app ────────────────────────────────────────
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const targetUrl = e.notification.data?.url || '/';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// ── Agendadores locais de lembretes (Trial e Coleta de Ovos) ──────────────
let trialReminderTimer = null;
let eggReminderTimer = null;

self.addEventListener('message', (e) => {
  const { type, delayMs, title, body, icon, badge, tag, data } = e.data || {};

  // Lembrete de Trial
  if (type === 'SCHEDULE_TRIAL_REMINDER') {
    if (trialReminderTimer) clearTimeout(trialReminderTimer);
    trialReminderTimer = setTimeout(() => {
      self.registration.showNotification(title || 'Mura Manager — Aviso de Trial', {
        body: body || 'Seu período de teste está acabando. Assine agora!',
        icon: icon || '/favicon.svg',
        badge: badge || '/favicon.svg',
        tag: tag || 'mura-trial-reminder',
        data: data || { url: '/' },
        requireInteraction: true,
        silent: false,
      });
      trialReminderTimer = null;
    }, delayMs || 24 * 60 * 60 * 1000);
  }

  if (type === 'CANCEL_TRIAL_REMINDER') {
    if (trialReminderTimer) {
      clearTimeout(trialReminderTimer);
      trialReminderTimer = null;
    }
  }

  // Lembrete Amigável de Coleta de Ovos
  if (type === 'SCHEDULE_EGG_REMINDER') {
    if (eggReminderTimer) clearTimeout(eggReminderTimer);
    eggReminderTimer = setTimeout(() => {
      self.registration.showNotification(title || '🥚 Lembrete de Coleta Mura Manager', {
        body: body || 'Ei, não se esqueça de registrar as coletas de hoje para manter tudo atualizado!',
        icon: icon || '/favicon.svg',
        badge: badge || '/favicon.svg',
        tag: tag || 'mura-egg-reminder',
        data: data || { url: '/eggs' },
        requireInteraction: false,
        silent: false,
      });
      eggReminderTimer = null;
    }, delayMs || 5 * 60 * 60 * 1000);
  }

  if (type === 'CANCEL_EGG_REMINDER') {
    if (eggReminderTimer) {
      clearTimeout(eggReminderTimer);
      eggReminderTimer = null;
    }
  }
});
