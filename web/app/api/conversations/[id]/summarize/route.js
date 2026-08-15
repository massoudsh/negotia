import { NextResponse } from 'next/server';
import { summarize } from '../../../../../lib/store.js';

export async function POST(_req, { params }) {
  const { id } = await params;
  try {
    return NextResponse.json(summarize(id));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
}
