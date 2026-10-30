import { NextResponse } from 'next/server.js';
import { decideApproval } from '../../../../lib/store.js';
import { withSession } from '../../../../lib/auth.js';

export const POST = withSession(async (req, { params }, user) => {
  const { id } = await params;
  try {
    const body = await req.json();
    if (!['approved', 'rejected'].includes(body.decision) || (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 2000))) {
      return NextResponse.json({ error: 'تصمیم یا توضیح معتبر نیست.' }, { status: 400 });
    }
    return NextResponse.json(decideApproval(id, body.decision, user.id, body.reason));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
});
