const USERS_KEY = 'kairo-scholar-users-v1';
const SESSION_KEY = 'kairo-scholar-current-user-v1';

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
}

export async function registerUser(username, password) {
  const cleanUsername = normalizeUsername(username);
  validateCredentials(cleanUsername, password);
  const users = loadUsers();

  if (users.some((user) => user.username === cleanUsername)) {
    throw new Error('That username is already taken on this device.');
  }

  const salt = crypto.randomUUID();
  const passwordHash = await hashPassword(password, salt);
  const user = {
    id: crypto.randomUUID(),
    username: cleanUsername,
    createdAt: new Date().toISOString()
  };

  users.push({ ...user, salt, passwordHash });
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export async function loginUser(username, password) {
  const cleanUsername = normalizeUsername(username);
  const users = loadUsers();
  const record = users.find((user) => user.username === cleanUsername);

  if (!record) {
    throw new Error('No account found with that username on this device.');
  }

  const passwordHash = await hashPassword(password, record.salt);
  if (passwordHash !== record.passwordHash) {
    throw new Error('Incorrect password.');
  }

  const user = { id: record.id, username: record.username, createdAt: record.createdAt };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase().replace(/\s+/g, '-');
}

function validateCredentials(username, password) {
  if (!/^[a-z0-9_-]{3,24}$/.test(username)) {
    throw new Error('Username must be 3-24 characters using letters, numbers, dashes, or underscores.');
  }
  if (String(password || '').length < 8) {
    throw new Error('Password must be at least 8 characters.');
  }
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
