import { NextResponse } from 'next/server';
import { getNegotiationPlan } from '../../../../../lib/store.js';

import { withSession } from '../../../../../lib/auth.js';

export const POST = withSession(async (_req, { params }) => {
  const { id } = await params;
  try {
    return NextResponse.json(getNegotiationPlan(id));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
});
