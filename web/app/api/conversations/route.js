import { NextResponse } from 'next/server';
import { listConversations } from '../../../lib/store.js';

export async function GET() {
  return NextResponse.json(listConversations());
}
