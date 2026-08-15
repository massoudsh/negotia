import { NextResponse } from 'next/server';
import { addMessage } from '../../../../../lib/store.js';

export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  if (!body.text) {
    return NextResponse.json({ error: 'متن پیام الزامی است' }, { status: 400 });
  }
  try {
    const message = addMessage(id, { sender: body.sender ?? 'company', text: body.text });
    return NextResponse.json(message);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
