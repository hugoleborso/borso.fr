const NOTIFICATION_ICON = '/icons/icon-192.png';
const DEFAULT_NOTIFICATION_URL = '/';
const FRENCH_LANGUAGE_PREFIX = 'fr';
const DEFAULT_DEVICE_LANGUAGE = 'en';
const BAND_TIME_ZONE = 'Europe/Paris';
const SESSION_DATE_FORMAT = {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: BAND_TIME_ZONE,
};
const PARAMETER_PATTERN = /\{(\w+)\}/g;

const NOTIFICATION_TEXT = {
  en: {
    someone: 'Someone',
    fallback: 'Something changed in the band.',
    titles: {
      fallback: 'Band update',
      'take-created': 'New take',
      'take-comment-created': 'New comment',
      'session-created': 'New session',
      'session-changed': 'Session changed',
      'setlist-changed': 'Setlist changed',
      'song-lineup-changed': 'Lineup changed',
      'transition-changed': 'Transition changed',
      'streak-at-risk': 'Flame at risk',
      'streak-band-count': 'Practice time',
      'streak-band-count-one': 'Practice time',
    },
    templates: {
      'take-created': '{actorName} posted a take of {songTitle}',
      'take-comment-created': '{actorName} commented on a take of {songTitle}',
      'session-created': '{actorName} planned a session on {sessionDate}',
      'session-changed': '{actorName} changed the session on {sessionDate}',
      'setlist-changed': '{actorName} changed the setlist {setlistName}',
      'song-lineup-changed': '{actorName} changed the lineup of {songTitle}',
      'transition-changed': '{actorName} changed the transition {songATitle} → {songBTitle}',
      'streak-at-risk': 'Keep your {days}-day flame alive. Log a study before midnight.',
      'streak-band-count': '{count} members already practised today. Your turn?',
      'streak-band-count-one': '1 member already practised today. Your turn?',
    },
  },
  fr: {
    someone: 'Quelqu’un',
    fallback: 'Du nouveau dans le groupe.',
    titles: {
      fallback: 'Nouvelles du groupe',
      'take-created': 'Nouvelle prise',
      'take-comment-created': 'Nouveau commentaire',
      'session-created': 'Nouvelle session',
      'session-changed': 'Session modifiée',
      'setlist-changed': 'Setlist modifiée',
      'song-lineup-changed': 'Composition modifiée',
      'transition-changed': 'Transition modifiée',
      'streak-at-risk': 'Flamme en danger',
      'streak-band-count': 'À toi de jouer',
      'streak-band-count-one': 'À toi de jouer',
    },
    templates: {
      'take-created': '{actorName} a publié une prise de {songTitle}',
      'take-comment-created': '{actorName} a commenté une prise de {songTitle}',
      'session-created': '{actorName} a prévu une session le {sessionDate}',
      'session-changed': '{actorName} a modifié la session du {sessionDate}',
      'setlist-changed': '{actorName} a modifié la setlist {setlistName}',
      'song-lineup-changed': '{actorName} a modifié la composition de {songTitle}',
      'transition-changed': '{actorName} a modifié la transition {songATitle} → {songBTitle}',
      'streak-at-risk': 'Garde ta flamme de {days} jours. Note une étude avant minuit.',
      'streak-band-count': '{count} membres ont déjà pratiqué aujourd’hui. À toi ?',
      'streak-band-count-one': '1 membre a déjà pratiqué aujourd’hui. À toi ?',
    },
  },
};

function readText(value, fallback) {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readPushPayload(data) {
  if (data === null || data === undefined) return {};
  try {
    const payload = data.json();
    return payload !== null && typeof payload === 'object' ? payload : {};
  } catch {
    return {};
  }
}

function selectLanguage(deviceLanguage) {
  return deviceLanguage.toLowerCase().startsWith(FRENCH_LANGUAGE_PREFIX) ? 'fr' : 'en';
}

function formatSessionDate(value, deviceLanguage) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(deviceLanguage, SESSION_DATE_FORMAT);
}

function readParameters(payload, deviceLanguage, text) {
  const raw =
    payload.parameters !== null && typeof payload.parameters === 'object' ? payload.parameters : {};
  const parameters = {};
  for (const [name, value] of Object.entries(raw)) {
    if (typeof value === 'string') parameters[name] = value;
  }
  parameters.actorName = readText(parameters.actorName, text.someone);
  if (parameters.sessionDate !== undefined) {
    parameters.sessionDate = formatSessionDate(parameters.sessionDate, deviceLanguage);
  }
  return parameters;
}

function renderNotification(payload, deviceLanguage) {
  const text = NOTIFICATION_TEXT[selectLanguage(deviceLanguage)];
  const messageKey = readText(payload.messageKey, '');
  if (!Object.hasOwn(text.templates, messageKey)) {
    return { title: text.titles.fallback, body: text.fallback };
  }
  const parameters = readParameters(payload, deviceLanguage, text);
  const body = text.templates[messageKey].replace(PARAMETER_PATTERN, (placeholder, name) =>
    readText(parameters[name], placeholder),
  );
  return { title: text.titles[messageKey], body };
}

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event.data);
  const deviceLanguage = readText(self.navigator?.language, DEFAULT_DEVICE_LANGUAGE);
  const tag = readText(payload.tag, '');
  const { title, body } = renderNotification(payload, deviceLanguage);
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      ...(tag.length > 0 ? { tag, renotify: true } : {}),
      data: { url: readText(payload.url, DEFAULT_NOTIFICATION_URL) },
    }),
  );
});

async function focusOrOpen(targetUrl) {
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const existing = windows.find((client) => 'focus' in client);
  if (existing === undefined) return self.clients.openWindow(targetUrl);
  const focused = await existing.focus();
  if ('navigate' in focused) await focused.navigate(targetUrl).catch(() => undefined);
  return focused;
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data ?? {};
  event.waitUntil(focusOrOpen(readText(data.url, DEFAULT_NOTIFICATION_URL)));
});
