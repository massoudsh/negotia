import { NextResponse } from 'next/server';
import { summarize } from '../../../../../lib/store.js';
import { withSession } from '../../../../../lib/auth.js';

export const POST = withSession(async (_req, { params }) => {
  const { id } = await params;
  try {
    return NextResponse.json(summarize(id));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
});
