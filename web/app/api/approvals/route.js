import { NextResponse } from 'next/server';
import { listApprovals } from '../../../lib/store.js';

export async function GET() {
  return NextResponse.json(listApprovals());
}
