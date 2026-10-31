import { NextResponse } from 'next/server';
import { addMessage } from '../../../../../lib/store.js';
import { withSession } from '../../../../../lib/auth.js';

export const POST = withSession(async (req, { params }, user) => {
  const { id } = await params;
  try {
    const body = await req.json();
    if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 20000 || !['company', 'contact'].includes(body.sender ?? 'company')) {
      return NextResponse.json({ error: 'متن یا فرستنده پیام معتبر نیست.' }, { status: 400 });
    }
    return NextResponse.json(addMessage(id, { sender: body.sender ?? 'company', text: body.text }, user.id));
  } catch (err) {
    return NextResponse.json({ error: err instanceof SyntaxError ? 'ورودی معتبر نیست.' : err.message }, { status: 400 });
  }
});
