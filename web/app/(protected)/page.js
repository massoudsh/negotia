'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '../components/app-shell';
import { summarizeDashboard } from '../../lib/dashboard';
import { api } from '../../lib/api';
import { DataTable, DealStatusBadge, Field } from '../components/glass';

const STATUS_LABEL = { open: 'باز', awaiting_reply: 'در انتظار پاسخ', serious: 'جدی', closed: 'بسته' };
const FEATURES = [
  { icon: 'target', title: 'پرونده‌های تجاری', text: 'مکالمه، پاسخ پیشنهادی و پیگیری هر فرصت.', href: '#pipeline' },
  { icon: 'chart', title: 'بهای تمام‌شده', text: 'برآورد مستقل چندارزی خرید، حمل، بیمه و هزینه‌های دستی گمرک.', href: '/landed-cost', action: 'محاسبه هزینه' },
  { icon: 'file', title: 'اسناد ثبت‌شده', text: 'نسخه‌های پیش‌فاکتور و برآورد پیوست؛ بدون آپلود فایل.', href: '/documents', action: 'مشاهده نسخه‌ها' },
  { icon: 'route', title: 'لجستیک و گمرک', text: 'رهگیری حمل و ترخیص در نقشه راه است.' },
  { icon: 'spark', title: 'تصمیم‌یار پرونده', text: 'تحلیل قاعده‌محور آمادگی و نقشه مذاکره در هر پرونده.', href: '#pipeline' },
];
const number = (value) => value.toLocaleString('fa-IR');

export default function HomePage() {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('all');
  const [market, setMarket] = useState('');
  const [after, setAfter] = useState('');
  const [before, setBefore] = useState('');
  const [queue, setQueue] = useState('all');

  async function load() {
    setError('');
    try {
      const [conversations, approvals] = await Promise.all([api('/api/conversations'), api('/api/approvals')]);
      setRecords({ conversations, approvals });
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  const scoped = useMemo(() => records?.conversations.filter(conversation => {
    const text = [conversation.contact?.company, conversation.contact?.name, conversation.productCode, ...conversation.messages.map(message => message.text)].join(' ').toLowerCase();
    const day = (conversation.lastMessageAt ?? '').slice(0, 10);
    return text.includes(query.trim().toLowerCase()) && (stage === 'all' || conversation.status === stage) && (!market || conversation.contact?.country === market) && (!after || day >= after) && (!before || day <= before);
  }) ?? [], [records, query, stage, market, after, before]);
  const stats = useMemo(() => records ? summarizeDashboard(scoped, records.approvals.filter(approval => scoped.some(conversation => conversation.id === approval.payload.conversationId))) : null, [scoped, records]);
  const filtered = useMemo(() => scoped.filter(conversation => queue === 'all' || queue === 'active' && conversation.status !== 'closed' || queue === 'serious' && conversation.status === 'serious' || queue === 'action' && [...(stats?.awaitingResponse ?? []), ...(stats?.overdue ?? [])].some(item => item.id === conversation.id)), [scoped, queue, stats]);
  const columns = useMemo(() => [
    { key: 'company', label: 'طرف تجاری', value: row => row.contact?.company ?? row.contact?.name ?? '', render: row => <Link href={`/conversations/${row.id}`}><bdi>{row.contact?.company ?? row.contact?.name ?? 'بدون نام'}</bdi></Link> },
    { key: 'stage', label: 'مرحله', value: row => row.status, render: row => <DealStatusBadge status={row.status} /> },
    { key: 'product', label: 'محصول', value: row => row.productCode },
    { key: 'market', label: 'بازار', value: row => row.contact?.country },
    { key: 'count', label: 'پیام‌ها', value: row => row.messages.length, render: row => number(row.messages.length) },
    { key: 'date', label: 'آخرین پیام', value: row => row.lastMessageAt ?? '', render: row => row.lastMessageAt ? new Date(row.lastMessageAt).toLocaleDateString('fa-IR') : '—' },
  ], []);

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
      <p className="muted small">اطلاعات در پایگاه داده محلی ذخیره می‌شوند. آمار از رکوردهای همین فضای کاری محاسبه می‌شود.</p>
      {error && <div className="result-box warn" role="alert">{error} <button className="btn btn-outline" onClick={load}>تلاش مجدد</button></div>}
      <section className="metric-strip" aria-label="آمار پرونده‌ها" aria-busy={!records && !error}>
        {[
          ['پرونده‌های فعال', stats?.active, 'به‌جز پرونده‌های بسته', 'active'],
          ['مذاکره‌های جدی', stats?.serious, 'وضعیت ثبت‌شده در پرونده', 'serious'],
          ['نیازمند پاسخ یا پیگیری', stats?.needsAttention, 'تعداد پرونده‌های فعال', 'action'],
          ['در انتظار تأیید', stats?.pending, 'درخواست‌های تصمیم‌گیری', 'approvals'],
        ].map(([label, value, note, key]) => <div key={label}><Link className="metric-link" href={key === 'approvals' ? '/approvals?status=pending' : '#pipeline'} onClick={() => { if (key !== 'approvals') setQueue(key); }}><span>{label}</span><strong>{value === undefined ? '—' : number(value)}</strong><i>{note}</i></Link></div>)}
      </section>
      <section className="section-block" id="insights">
        <div className="section-panel">
          <div className="panel-heading"><div><p className="eyebrow">براساس رکوردهای فعلی</p><h2>اقدام‌های بعدی</h2></div><button className="btn btn-outline" onClick={load}>به‌روزرسانی</button></div>
          {!records && !error && <p role="status">در حال دریافت اطلاعات…</p>}
          {stats && <div className="signal-list">
            {stats.awaitingResponse.slice(0, 10).map((conversation) => <Link href={`/conversations/${conversation.id}`} className="signal-item signal-info" key={conversation.id}><Icon name="inbox" /><div><strong>{conversation.contact?.company ?? conversation.contact?.name ?? 'پرونده بدون نام'}</strong><p>آخرین پیام از طرف مقابل است؛ پاسخ را بررسی کنید.</p></div><Icon name="arrow" size={14} /></Link>)}
            {stats.overdue.slice(0, 10).map((conversation) => <Link href={`/conversations/${conversation.id}`} className="signal-item signal-warning" key={conversation.id}><Icon name="clock" /><div><strong>{conversation.contact?.company ?? conversation.contact?.name ?? 'پرونده بدون نام'}</strong><p>سه روز از پیام شرکت گذشته است؛ موعد پیگیری رسیده.</p></div><Icon name="arrow" size={14} /></Link>)}
            {stats.pending > 0 && <Link href="/approvals" className="signal-item"><Icon name="check" /><div><strong>{number(stats.pending)} درخواست تأیید منتظر تصمیم است.</strong></div><Icon name="arrow" size={14} /></Link>}
            {stats.needsAttention > 10 && <a href="#pipeline" onClick={() => setQueue('action')}>مشاهده تمام موارد در صف اقدام</a>}
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
        <div className="filters"><Field as="select" label="مرحله" value={stage} onChange={event => setStage(event.target.value)}><option value="all">همه</option>{Object.entries(STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Field><Field as="select" label="بازار" value={market} onChange={event => setMarket(event.target.value)}><option value="">همه</option>{[...new Set(records?.conversations.map(item => item.contact?.country).filter(Boolean))].map(value => <option key={value}>{value}</option>)}</Field><Field label="آخرین پیام از (میلادی)" type="date" value={after} onChange={event => setAfter(event.target.value)} /><Field label="تا (میلادی)" type="date" value={before} onChange={event => setBefore(event.target.value)} /><Field as="select" label="صف کاری" value={queue} onChange={event => setQueue(event.target.value)}><option value="all">همه</option><option value="active">فعال</option><option value="serious">جدی</option><option value="action">نیازمند اقدام</option></Field><button className="btn btn-outline" onClick={() => { setQuery(''); setStage('all'); setMarket(''); setAfter(''); setBefore(''); setQueue('all'); }}>پاک کردن فیلترها</button></div>
        {records && <DataTable rows={filtered} columns={columns} caption="پرونده‌های تجاری · مرتب‌سازی با عنوان ستون" />}
        {records && <details className="section"><summary>توزیع مراحل در نتایج فیلترشده</summary><div className="pipeline-bars">{Object.entries(STATUS_LABEL).map(([key, label]) => { const count = scoped.filter(row => row.status === key).length; return <label key={key}>{label}: {number(count)}<meter min={0} max={Math.max(scoped.length, 1)} value={count} aria-label={`${label}: ${count}`} /></label>; })}</div><p className="muted">مالک، اولویت، ارزش معامله و موعدهای قراردادی در مدل فعلی ثبت نمی‌شوند؛ برای آن‌ها آمار حدسی نمایش داده نمی‌شود.</p></details>}
      </section>
    </main>
  );
}
