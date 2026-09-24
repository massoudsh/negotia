import { NextResponse } from 'next/server';
import { decideApproval } from '../../../../lib/store.js';

export async function POST(req, { params }) {
  const { id } = await params;
  const body = await req.json();
  if (!['approved', 'rejected'].includes(body.decision)) {
    return NextResponse.json({ error: 'decision باید approved یا rejected باشد' }, { status: 400 });
  }
  try {
    return NextResponse.json(decideApproval(id, body.decision, body.approverId, body.reason));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
