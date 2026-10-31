import { NextResponse } from 'next/server.js';
import { withSession } from '../../../../../lib/auth.js';
import { addNote } from '../../../../../lib/store.js';

export const POST = withSession(async (req, { params }, user) => {
  try {
    const { id } = await params;
    const body = await req.json();
    return NextResponse.json(addNote(id, body?.text, user.id), { status: 201 });
  } catch { return NextResponse.json({ error: 'یادداشت یا پرونده معتبر نیست؛ اطلاعات را بررسی کنید.' }, { status: 400 }); }
});
