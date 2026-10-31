import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionUser } from '../../../src/auth/accounts.js';
import { SESSION_COOKIE } from '../../lib/auth.js';
import AppShell from '../components/app-shell';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({ children }) {
  const cookieStore = await cookies();
  const user = sessionUser(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) redirect('/login');
  const environment = { production: 'محیط عملیاتی', staging: 'محیط آزمایشی', sandbox: 'محیط تمرین' }[process.env.NEGOTIA_ENVIRONMENT] ?? 'محیط تعیین نشده';
  return <AppShell user={user} environment={environment}>{children}</AppShell>;
}
