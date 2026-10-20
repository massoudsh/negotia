'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from './components/app-shell';

const STATUS_LABEL = { open: 'باز', awaiting_reply: 'در انتظار پاسخ', serious: 'جدی', closed: 'بسته' };
const DIRECTION_LABEL = { export: 'صادرات', import: 'واردات' };
const FEATURE_CARDS = [
  { id: 'pipeline', icon: 'target', eyebrow: '۰۱ · CRM تجاری', title: 'هر فرصت، یک مسیر روشن', text: 'مکالمه، پیشنهاد، پیگیری و سفارش را در یک پروندهٔ قابل‌اقدام نگه دارید.', tone: 'gold', action: 'ورود به pipeline' },
  { id: 'finance', icon: 'chart', eyebrow: '۰۲ · بهای تمام‌شده', title: 'قبل از تعهد، سود را ببینید', text: 'هزینهٔ حمل، بیمه، گمرک و تبدیل ارز را کنار قیمت خرید بررسی کنید.', tone: 'blue', action: 'محاسبه سریع' },
  { id: 'documents', icon: 'file', eyebrow: '۰۳ · اتاق اسناد', title: 'اسناد پراکنده را جمع کنید', text: 'پروفرما، بارنامه، پکینگ‌لیست و مجوزها را به هر پرونده متصل کنید.', tone: 'purple', action: 'مدیریت اسناد' },
  { id: 'logistics', icon: 'route', eyebrow: '۰۴ · لجستیک و گمرک', title: 'محموله را از مبدأ تا مقصد ببینید', text: 'وضعیت ترخیص، باربری و کالاهای در راه را در یک نمای زمانی دنبال کنید.', tone: 'green', action: 'نمایش محموله‌ها' },
  { id: 'insights', icon: 'spark', eyebrow: '۰۵ · تصمیم‌یار ایجنت', title: 'گام بعدی همیشه مشخص است', text: 'ایجنت ریسک، آمادگی معامله و اقدام بعدی را قبل از تصمیم شما آماده می‌کند.', tone: 'orange', action: 'باز کردن تصمیم‌یار' },
];

function LoadingState() {
  return <div className="card-list"><div className="skeleton" /><div className="skeleton" /></div>;
}

export default function HomePage() {
  const [conversations, setConversations] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/conversations').then((r) => r.json()).then(setConversations);
  }, []);

  const filtered = useMemo(() => {
    if (!conversations) return [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversations;
    return conversations.filter((c) => [c.contact?.company, c.contact?.name, c.productCode, c.contact?.country].filter(Boolean).join(' ').toLowerCase().includes(normalized));
  }, [conversations, query]);

  const stats = useMemo(() => ({
    total: conversations?.length ?? 0,
    serious: conversations?.filter((c) => c.status === 'serious').length ?? 0,
    waiting: conversations?.filter((c) => c.status === 'awaiting_reply').length ?? 0,
    export: conversations?.filter((c) => c.direction === 'export').length ?? 0,
  }), [conversations]);

  return (
    <main className="page command-center">
      <section className="hero-panel">
        <div className="hero-copy"><div className="hero-status"><span className="status-dot" /> مرکز فرمان تجارت خارجی</div><h1>از گفت‌وگو تا معامله،<br /><em>با تصمیم‌های دقیق‌تر.</em></h1><p>Negotia ریسک و کارهای پراکندهٔ تجارت خارجی را به مسیرهای روشن و قابل‌تأیید تبدیل می‌کند.</p><div className="hero-actions"><Link href="#pipeline" className="btn">شروع از فرصت‌ها <Icon name="arrow" size={15} /></Link><Link href="/approvals" className="btn btn-quiet">صف تأییدها <span className="action-count">۳</span></Link></div></div>
        <div className="hero-orbit" aria-hidden="true"><div className="orbit-ring ring-one" /><div className="orbit-ring ring-two" /><div className="orbit-core">N<span>AI</span></div><div className="orbit-node node-one">CRM</div><div className="orbit-node node-two">اسناد</div><div className="orbit-node node-three">ریسک</div></div>
      </section>

      <section className="metric-strip"><div><span>ارزش pipeline</span><strong>۲.۴ <small>M USD</small></strong><i className="positive">+۱۸٪ این ماه</i></div><div><span>فرصت‌های فعال</span><strong>{stats.total}</strong><i>در فضای کاری</i></div><div><span>آمادهٔ اقدام</span><strong>{stats.serious}</strong><i>پروندهٔ جدی</i></div><div><span>نیازمند توجه</span><strong>{stats.waiting + 1}</strong><i className="warning-text">پیگیری یا تأیید</i></div></section>

      <section className="section-block" id="pipeline"><div className="section-intro"><div><p className="eyebrow">یک نگاه، پنج اهرم</p><h2>ابزارهای ساخته‌شده برای بازار ایران</h2><p>قابلیت‌های کلیدی نرم‌افزارهای بازرگانی را با هوش تصمیم‌یار و کنترل انسانی ترکیب کرده‌ایم.</p></div><span className="section-index">۰۵ قابلیت کلیدی</span></div><div className="feature-grid">{FEATURE_CARDS.map((feature) => <a className={`feature-card feature-${feature.tone}`} href={`#${feature.id}`} key={feature.id}><div className="feature-top"><span className="feature-icon"><Icon name={feature.icon} size={18} /></span><span className="feature-number">{feature.eyebrow.slice(0, 2)}</span></div><p className="feature-eyebrow">{feature.eyebrow.slice(5)}</p><h3>{feature.title}</h3><p>{feature.text}</p><span className="feature-action">{feature.action} <Icon name="arrow" size={13} /></span></a>)}</div></section>

      <section className="workspace-grid" id="insights"><div className="section-panel"><div className="panel-heading"><div><p className="eyebrow">سیگنال‌های امروز</p><h2>چه چیزی نیاز به اقدام دارد؟</h2></div><span className="live-pill"><span className="status-dot" /> زنده</span></div><div className="signal-list"><div className="signal-item signal-warning"><span className="signal-symbol">!</span><div><strong>یک پرونده برای پیگیری نزدیک است</strong><p>آخرین پاسخ خریدار ۲ روز قبل ثبت شده است.</p></div><Icon name="arrow" size={14} /></div><div className="signal-item signal-info"><span className="signal-symbol">↗</span><div><strong>پیشنهاد پرداخت محافظت‌شده آماده است</strong><p>برای معاملهٔ بزرگ، LC یا پیش‌پرداخت پیشنهاد می‌شود.</p></div><Icon name="arrow" size={14} /></div><div className="signal-item signal-success"><span className="signal-symbol">✓</span><div><strong>اطلاعات یک معامله کامل شد</strong><p>این پرونده می‌تواند وارد مرحلهٔ قیمت‌دهی شود.</p></div><Icon name="arrow" size={14} /></div></div></div><div className="section-panel health-panel" id="finance"><div className="panel-heading"><div><p className="eyebrow">سلامت عملیات</p><h2>کنترل‌های کلیدی</h2></div><Icon name="chart" size={18} /></div><div className="health-ring"><div><strong>۸۶٪</strong><span>آماده برای اقدام</span></div></div><div className="health-legend"><span><i className="legend-dot dot-green" /> ۴ پرونده سالم</span><span><i className="legend-dot dot-yellow" /> ۱ نیازمند بررسی</span><span><i className="legend-dot dot-gray" /> سیاست شرکت فعال</span></div></div></section>

      <section className="section-block conversation-section" id="documents"><div className="section-toolbar"><div><p className="eyebrow">آخرین فعالیت</p><h2 className="section-title">پرونده‌های تجاری</h2><span className="toolbar-meta">مکالمه، سند و اقدام بعدی در یکجا</span></div><div className="toolbar-actions"><div className="search-box"><input aria-label="جست‌وجوی مکالمات" placeholder="جست‌وجوی شرکت یا محصول" value={query} onChange={(e) => setQuery(e.target.value)} /></div><Link href="/approvals" className="btn btn-outline">تأییدها <Icon name="arrow" size={14} /></Link></div></div>{conversations === null && <LoadingState />}{conversations?.length === 0 && <div className="empty">هنوز مکالمه‌ای ثبت نشده است.</div>}{conversations?.length > 0 && filtered.length === 0 && <div className="empty">موردی با این جست‌وجو پیدا نشد.</div>}<ul className="card-list">{filtered.map((c) => { const last = c.messages[c.messages.length - 1]; const company = c.contact?.company ?? c.contact?.name ?? 'بدون نام'; return <li key={c.id}><Link href={`/conversations/${c.id}`} className="card"><div className="card-row"><div className="card-title"><span className="company-mark">{company.slice(0, 1)}</span><div><strong className="company-name">{company}</strong><span className="company-person">{c.contact?.name}</span></div></div><span className={`badge badge-${c.status}`}>{STATUS_LABEL[c.status] ?? c.status}</span></div><div className="card-details"><span className="card-detail">طرف مقابل <strong>{c.contact?.country}</strong></span><span className="card-detail">محصول <strong>{c.productCode}</strong></span><span className="card-detail"><strong>{DIRECTION_LABEL[c.direction] ?? c.direction}</strong></span></div>{last && <p className="preview" dir="ltr">{last.text}</p>}<div className="card-footer"><span>{c.messages.length} پیام در thread</span><span className="arrow-link">باز کردن <Icon name="arrow" size={14} /></span></div></Link></li>; })}</ul></section>
    </main>
  );
}
