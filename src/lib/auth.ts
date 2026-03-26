import { getDb } from '@/lib/db';
import { generateId } from '@/lib/utils/id';
import { getNow } from '@/lib/utils/dates';
import crypto from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'proflow_session';

// Simple password hashing using PBKDF2 (no extra deps)
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, s, 100000, 64, 'sha512').toString('hex');
  return { hash: `${s}:${hash}`, salt: s };
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const result = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === result;
}

export function registerUser(email: string, password: string, name: string): { id: string; email: string; name: string } {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw new Error('An account with this email already exists');
  }

  const { hash } = hashPassword(password);
  const id = generateId();
  const now = getNow();

  db.prepare(`
    INSERT INTO users (id, email, name, password_hash, timezone, preferences, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    email.toLowerCase().trim(),
    name.trim(),
    hash,
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    JSON.stringify({ theme: 'system', defaultView: 'dashboard' }),
    now,
    now
  );

  return { id, email: email.toLowerCase().trim(), name: name.trim() };
}

export function loginUser(email: string, password: string): { id: string; email: string; name: string } {
  const db = getDb();

  const user = db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').get(
    email.toLowerCase().trim()
  ) as { id: string; email: string; name: string; password_hash: string | null } | undefined;

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // For the default seeded user without a password, allow setting one on first login
  if (!user.password_hash) {
    const { hash } = hashPassword(password);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, user.id);
    return { id: user.id, email: user.email, name: user.name };
  }

  if (!verifyPassword(password, user.password_hash)) {
    throw new Error('Invalid email or password');
  }

  return { id: user.id, email: user.email, name: user.name };
}

// Simple session token: base64(userId:timestamp:random)
export function createSessionToken(userId: string): string {
  const random = crypto.randomBytes(16).toString('hex');
  const payload = `${userId}:${Date.now()}:${random}`;
  return Buffer.from(payload).toString('base64');
}

export function parseSessionToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId] = decoded.split(':');
    if (!userId) return null;

    // Verify user still exists
    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    return user ? userId : null;
  } catch {
    return null;
  }
}

export async function getCurrentUserId(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE);
    if (session?.value) {
      const userId = parseSessionToken(session.value);
      if (userId) return userId;
    }
  } catch {
    // cookies() throws outside of request context
  }
  // Fallback to default user for backwards compatibility
  return 'default-user';
}

export { SESSION_COOKIE };
