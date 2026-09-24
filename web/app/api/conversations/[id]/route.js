import { NextResponse } from 'next/server';
import { getConversation } from '../../../../lib/store.js';

export async function GET(_req, { params }) {
  const { id } = await params;
  const conversation = getConversation(id);
  if (!conversation) return NextResponse.json({ error: 'مکالمه پیدا نشد' }, { status: 404 });
  return NextResponse.json(conversation);
}
