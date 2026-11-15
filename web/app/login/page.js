import LoginForm from './login-form.js';
import { isDemoMode, DEMO_ACCOUNT } from '../../lib/store.js';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return <LoginForm demo={isDemoMode() ? { email: DEMO_ACCOUNT.email, password: DEMO_ACCOUNT.password } : null} />;
}
