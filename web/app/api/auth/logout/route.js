import { NextResponse } from 'next/server.js';
import { logout } from '../../../../../src/auth/accounts.js';
import { sameOrigin, SESSION_COOKIE } from '../../../../lib/auth.js';

export const runtime = 'nodejs';

export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مبدأ درخواست معتبر نیست.' }, { status: 403 });
  logout(request.cookies.get(SESSION_COOKIE)?.value);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
