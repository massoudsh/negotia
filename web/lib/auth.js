import { NextResponse } from 'next/server.js';
import { sessionUser } from '../../src/auth/accounts.js';

export const SESSION_COOKIE = 'negotia_session';

export function sameOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}

export function withSession(handler) {
  return async (request, context) => {
    const user = sessionUser(request.cookies.get(SESSION_COOKIE)?.value);
    if (!user) return NextResponse.json({ error: 'ابتدا وارد حساب خود شوید.' }, { status: 401 });
    if (!['GET', 'HEAD'].includes(request.method)) {
      if (!sameOrigin(request)) return NextResponse.json({ error: 'مبدأ درخواست معتبر نیست.' }, { status: 403 });
      if (!['admin', 'reviewer'].includes(user.role)) return NextResponse.json({ error: 'دسترسی کافی ندارید.' }, { status: 403 });
    }
    const response = await handler(request, context, user);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  };
}
