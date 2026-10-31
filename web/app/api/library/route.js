import { NextResponse } from 'next/server.js';
import { withSession } from '../../../lib/auth.js';
import { getLibrary } from '../../../lib/store.js';

export const GET = withSession(async () => NextResponse.json(getLibrary()));
