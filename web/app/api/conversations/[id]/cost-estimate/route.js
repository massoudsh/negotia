import { NextResponse } from 'next/server';
import { getConversation, saveCostEstimate } from '../../../../../lib/store.js';

export async function POST(req, { params }) {
  const { id } = await params;
  if (!getConversation(id)) return NextResponse.json({ error: 'مکالمه پیدا نشد' }, { status: 404 });
  try {
    const input = await req.json();
    return NextResponse.json(saveCostEstimate(id, input), { status: 201 });
  } catch (err) {
    const error = err instanceof TypeError || err instanceof SyntaxError ? 'ساختار ورودی برآورد معتبر نیست.' : err.message;
    return NextResponse.json({ error }, { status: 400 });
  }
}
