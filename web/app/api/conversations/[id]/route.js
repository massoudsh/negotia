import { NextResponse } from 'next/server';
import { getConversation } from '../../../../lib/store.js';
import { withSession } from '../../../../lib/auth.js';

export const GET = withSession(async (_req, { params }) => {
  const { id } = await params;
  const conversation = getConversation(id);
  if (!conversation) return NextResponse.json({ error: 'مکالمه پیدا نشد' }, { status: 404 });
  return NextResponse.json(conversation);
});
