'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from './components/app-shell';
import { summarizeDashboard } from '../lib/dashboard';

const STATUS_LABEL = { open: 'باز', awaiting_reply: 'در انتظار پاسخ', serious: 'جدی', closed: 'بسته' };
const FEATURES = [
  { icon: 'target', title: 'پرونده‌های تجاری', text: 'مکالمه، پاسخ پیشنهادی و پیگیری هر فرصت.', href: '#pipeline' },
  { icon: 'chart', title: 'بهای تمام‌شده', text: 'برآورد مستقل چندارزی خرید، حمل، بیمه و هزینه‌های دستی گمرک.', href: '/landed-cost', action: 'محاسبه هزینه' },
  { icon: 'file', title: 'اتاق اسناد', text: 'بایگانی و مدیریت اسناد هنوز پیاده‌سازی نشده است.' },
  { icon: 'route', title: 'لجستیک و گمرک', text: 'رهگیری حمل و ترخیص در نقشه راه است.' },
  { icon: 'spark', title: 'تصمیم‌یار پرونده', text: 'تحلیل قاعده‌محور آمادگی و نقشه مذاکره در هر پرونده.', href: '#pipeline' },
];
const number = (value) => value.toLocaleString('fa-IR');

export default function HomePage() {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function load() {
    setError('');
    try {
      const responses = await Promise.all([fetch('/api/conversations'), fetch('/api/approvals')]);
      if (responses.some((response) => !response.ok)) throw new Error('load-failed');
      const [conversations, approvals] = await Promise.all(responses.map((response) => response.json()));
      setRecords({ conversations, approvals });
    } catch {
      setError('دریافت اطلاعات ناموفق بود. دوباره تلاش کنید.');
    }
  }
  useEffect(() => { load(); }, []);

  const stats = useMemo(() => records ? summarizeDashboard(records.conversations, records.approvals) : null, [records]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records?.conversations.filter((conversation) => [conversation.contact?.company, conversation.contact?.name, conversation.productCode, conversation.contact?.country].filter(Boolean).join(' ').toLowerCase().includes(normalized)) ?? [];
  }, [records, query]);

  return (
    <main className="page command-center">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="hero-status">مرکز فرمان تجارت خارجی</div>
          <h1>از گفت‌وگو تا معامله،<br /><em>با تصمیم‌های دقیق‌تر.</em></h1>
          <p>پرونده‌های تجاری، پیگیری‌ها و درخواست‌های تأیید را در یک نگاه بررسی کنید.</p>
          <div className="hero-actions"><Link href="#pipeline" className="btn">مشاهده پرونده‌ها <Icon name="arrow" size={15} /></Link><Link href="/approvals" className="btn btn-quiet">صف تأییدها {stats && <span className="action-count">{number(stats.pending)}</span>}</Link></div>
        </div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core">N<span>AI</span></div><div className="orbit-node node-one">مذاکره</div><div className="orbit-node node-two">پیگیری</div><div className="orbit-node node-three">ریسک</div></div>
      </section>
      <p className="muted small">محیط نمایشی با داده‌های نمونه؛ اطلاعات فعلاً در حافظه نگهداری می‌شوند. آمار از رکوردهای همین محیط محاسبه می‌شود.</p>
      {error && <div className="result-box warn" role="alert">{error} <button className="btn btn-outline" onClick={load}>تلاش مجدد</button></div>}
      <section className="metric-strip" aria-label="آمار پرونده‌ها" aria-busy={!records && !error}>
        {[
          ['پرونده‌های فعال', stats?.active, 'به‌جز پرونده‌های بسته'],
          ['مذاکره‌های جدی', stats?.serious, 'وضعیت ثبت‌شده در پرونده'],
          ['نیازمند پاسخ یا پیگیری', stats?.needsAttention, 'تعداد پرونده‌های فعال'],
          ['در انتظار تأیید', stats?.pending, 'درخواست‌های تصمیم‌گیری'],
        ].map(([label, value, note]) => <div key={label}><span>{label}</span><strong>{value === undefined ? '—' : number(value)}</strong><i>{note}</i></div>)}
      </section>
      <section className="section-block" id="insights">
        <div className="section-panel">
          <div className="panel-heading"><div><p className="eyebrow">براساس رکوردهای فعلی</p><h2>اقدام‌های بعدی</h2></div><button className="btn btn-outline" onClick={load}>به‌روزرسانی</button></div>
          {!records && !error && <p role="status">در حال دریافت اطلاعات…</p>}
          {stats && <div className="signal-list">
            {stats.awaitingResponse.map((conversation) => <Link href={`/conversations/${conversation.id}`} className="signal-item signal-info" key={conversation.id}><Icon name="inbox" /><div><strong>{conversation.contact?.company ?? conversation.contact?.name ?? 'پرونده بدون نام'}</strong><p>آخرین پیام از طرف مقابل است؛ پاسخ را بررسی کنید.</p></div><Icon name="arrow" size={14} /></Link>)}
            {stats.overdue.map((conversation) => <Link href={`/conversations/${conversation.id}`} className="signal-item signal-warning" key={conversation.id}><Icon name="clock" /><div><strong>{conversation.contact?.company ?? conversation.contact?.name ?? 'پرونده بدون نام'}</strong><p>سه روز از پیام شرکت گذشته است؛ موعد پیگیری رسیده.</p></div><Icon name="arrow" size={14} /></Link>)}
            {stats.pending > 0 && <Link href="/approvals" className="signal-item"><Icon name="check" /><div><strong>{number(stats.pending)} درخواست تأیید منتظر تصمیم است.</strong></div><Icon name="arrow" size={14} /></Link>}
            {stats.needsAttention === 0 && stats.pending === 0 && <p className="muted">فعلاً پاسخ، پیگیری یا تأیید معوقی وجود ندارد.</p>}
          </div>}
        </div>
      </section>
      <section className="section-block">
        <div className="section-intro"><div><p className="eyebrow">قابلیت‌ها و مسیر توسعه</p><h2>ابزارهای تجارت خارجی</h2></div></div>
        <div className="feature-grid">{FEATURES.map((feature) => <article className="feature-card" key={feature.title}><div className="feature-top"><span className="feature-icon"><Icon name={feature.icon} /></span><span className="badge">{feature.href ? 'موجود' : 'برنامه‌ریزی‌شده'}</span></div><h3>{feature.title}</h3><p>{feature.text}</p>{feature.href && <Link href={feature.href} className="feature-action">{feature.action ?? 'مشاهده پرونده‌ها'} <Icon name="arrow" size={13} /></Link>}</article>)}</div>
      </section>
      <section className="section-block conversation-section" id="pipeline">
        <div className="section-toolbar"><div><p className="eyebrow">فضای کاری</p><h2 className="section-title">پرونده‌های تجاری</h2></div><div className="search-box"><input aria-label="جست‌وجوی مکالمات" placeholder="جست‌وجوی شرکت یا محصول" value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
        {!records && !error && <div className="skeleton" role="status" aria-label="در حال بارگذاری پرونده‌ها" />}
        {records && filtered.length === 0 && <div className="empty">{records.conversations.length ? 'موردی با این جست‌وجو پیدا نشد.' : 'هنوز مکالمه‌ای ثبت نشده است.'}</div>}
        <ul className="card-list">{filtered.map((conversation) => {
          const company = conversation.contact?.company ?? conversation.contact?.name ?? 'بدون نام';
          const last = conversation.messages.at(-1);
          return <li key={conversation.id}><Link href={`/conversations/${conversation.id}`} className="card"><div className="card-row"><div className="card-title"><span className="company-mark">{company.slice(0, 1)}</span><div><strong className="company-name">{company}</strong><span className="company-person">{conversation.contact?.name}</span></div></div><span className={`badge badge-${conversation.status}`}>{STATUS_LABEL[conversation.status] ?? conversation.status}</span></div><div className="card-details"><span>کشور <strong>{conversation.contact?.country}</strong></span><span>محصول <strong>{conversation.productCode}</strong></span><span>{conversation.direction === 'export' ? 'صادرات' : 'واردات'}</span></div>{last && <p className="preview" dir="ltr">{last.text}</p>}<div className="card-footer"><span>{number(conversation.messages.length)} پیام</span><span className="arrow-link">باز کردن <Icon name="arrow" size={14} /></span></div></Link></li>;
        })}</ul>
      </section>
    </main>
  );
}
