import { NextResponse } from 'next/server.js';
import { withSession } from '../../../../lib/auth.js';

export const GET = withSession(async (_request, _context, user) => NextResponse.json({ user }));
