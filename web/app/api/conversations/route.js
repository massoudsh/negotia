import { NextResponse } from 'next/server';
import { listConversations } from '../../../lib/store.js';
import { withSession } from '../../../lib/auth.js';

export const GET = withSession(async () => NextResponse.json(listConversations()));
