import { randomBytes, randomUUID, scrypt, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { database } from '../storage/database.js';

const deriveKey = promisify(scrypt);
export const SESSION_SECONDS = 8 * 60 * 60;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const publicUser = (user) => user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null;

export async function createUser({ email, name, role, password }) {
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('ایمیل معتبر وارد کنید.');
  if (typeof name !== 'string' || !name.trim() || name.length > 100) throw new Error('نام معتبر وارد کنید.');
  if (!['admin', 'reviewer', 'viewer'].includes(role)) throw new Error('نقش معتبر نیست.');
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('گذرواژه باید بین ۱۲ تا ۲۵۶ نویسه باشد.');
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt, 64);
  const user = { id: randomUUID(), email: email.trim().toLowerCase(), name: name.trim(), role };
  database.prepare('INSERT INTO users (id, email, name, role, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(user.id, user.email, user.name, user.role, key.toString('hex'), salt, new Date().toISOString());
  return user;
}

export async function login(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 256) throw new Error('ایمیل یا گذرواژه نادرست است.');
  const normalized = email.trim().toLowerCase();
  const now = Date.now();
  database.transaction(() => {
    const attempt = database.prepare('SELECT * FROM login_attempts WHERE email = ?').get(normalized);
    if (attempt?.failures >= 5 && attempt.retry_at > now) throw new Error('تلاش‌های ورود بیش از حد است؛ ۱۵ دقیقه دیگر تلاش کنید.');
    database.prepare(`INSERT INTO login_attempts(email, failures, retry_at) VALUES (?, 1, ?)
      ON CONFLICT(email) DO UPDATE SET failures = CASE WHEN retry_at <= ? THEN 1 ELSE failures + 1 END, retry_at = excluded.retry_at`)
      .run(normalized, now + 15 * 60 * 1000, now);
  }).immediate();
  const user = database.prepare('SELECT * FROM users WHERE email = ?').get(normalized);
  const key = await deriveKey(password, user?.salt ?? 'unregistered-account', 64);
  const expected = user ? Buffer.from(user.password_hash, 'hex') : Buffer.alloc(64);
  if (!timingSafeEqual(key, expected) || !user) {
    throw new Error('ایمیل یا گذرواژه نادرست است.');
  }
  const token = randomBytes(32).toString('hex');
  database.transaction(() => {
    database.prepare('DELETE FROM login_attempts WHERE email = ?').run(normalized);
    database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
    database.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hashToken(token), user.id, now + SESSION_SECONDS * 1000);
  }).immediate();
  return { token, user: publicUser(user) };
}

export function sessionUser(token, now = Date.now()) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  return publicUser(database.prepare(`SELECT users.id, users.email, users.name, users.role FROM sessions
    JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?`).get(hashToken(token), now));
}

export function logout(token) {
  if (typeof token === 'string') database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
}

export function reviewer(id) {
  const user = database.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(id);
  if (!user || !['admin', 'reviewer'].includes(user.role)) throw new Error('این کار نیازمند دسترسی بازبین یا مدیر است.');
  return publicUser(user);
}
