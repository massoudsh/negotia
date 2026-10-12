import { NextResponse } from 'next/server';
import { getNegotiationPlan } from '../../../../../lib/store.js';

export async function POST(_req, { params }) {
  const { id } = await params;
  try {
    return NextResponse.json(getNegotiationPlan(id));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
