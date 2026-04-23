const STORAGE_KEY = 'kairo-scholar-sessions-v1';

export function loadSessions(username = 'guest') {
  try {
    const allSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return allSessions[username] || [];
  } catch {
    return [];
  }
}

export function saveSession(session, username = 'guest') {
  const allSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const sessions = allSessions[username] || [];
  const next = [session, ...sessions.filter((item) => item.id !== session.id)].slice(0, 12);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...allSessions, [username]: next }));
  return next;
}

export function clearSessions(username = 'guest') {
  const allSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  delete allSessions[username];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allSessions));
}
