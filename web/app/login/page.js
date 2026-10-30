'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'ورود ناموفق بود.');
      window.location.assign('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return <main className="page login-page"><section className="section login-card"><div className="brand-lockup"><div className="brand-mark">N</div><strong>Negotia</strong></div><h1>ورود به فضای کاری</h1><p className="muted">با حسابی که مدیر فضای کاری ایجاد کرده وارد شوید.</p><form onSubmit={submit}><fieldset className="calculator-fields" disabled={busy}><div className="form-row"><label htmlFor="email">ایمیل</label><input id="email" name="email" type="email" dir="ltr" autoComplete="username" maxLength={254} required /></div><div className="form-row"><label htmlFor="password">گذرواژه</label><input id="password" name="password" type="password" dir="ltr" autoComplete="current-password" maxLength={256} required /></div><button className="btn" type="submit">{busy ? 'در حال ورود…' : 'ورود'}</button></fieldset></form>{error && <p className="result-box warn" role="alert">{error}</p>}<p className="muted small">ثبت‌نام عمومی فعال نیست؛ برای دریافت حساب با مدیر خود تماس بگیرید.</p></section></main>;
}
