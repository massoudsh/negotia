import { NextResponse } from 'next/server.js';
import { withSession } from '../../../../../lib/auth.js';
import { requestMessageApproval } from '../../../../../lib/store.js';

export const POST = withSession(async (req, { params }, user) => {
  try {
    const { id } = await params;
    return NextResponse.json(requestMessageApproval(id, await req.json(), user.id), { status: 201 });
  } catch { return NextResponse.json({ error: 'پیش‌نویس یا پرونده معتبر نیست؛ اطلاعات را بررسی کنید.' }, { status: 400 }); }
});
