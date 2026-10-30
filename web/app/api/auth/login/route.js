import { NextResponse } from 'next/server.js';
import { login, SESSION_SECONDS } from '../../../../../src/auth/accounts.js';
import { sameOrigin, SESSION_COOKIE } from '../../../../lib/auth.js';

export const runtime = 'nodejs';

export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مبدأ درخواست معتبر نیست.' }, { status: 403 });
  try {
    const body = await request.json();
    const { token, user } = await login(body?.email, body?.password);
    const response = NextResponse.json({ user });
    response.headers.set('Cache-Control', 'no-store');
    response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: SESSION_SECONDS });
    return response;
  } catch (err) {
    return NextResponse.json({ error: err instanceof SyntaxError || err instanceof TypeError ? 'ورودی معتبر نیست.' : err.message }, { status: 401 });
  }
}
