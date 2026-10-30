import { NextResponse } from 'next/server';
import { listApprovals } from '../../../lib/store.js';
import { withSession } from '../../../lib/auth.js';

export const GET = withSession(async () => NextResponse.json(listApprovals()));
