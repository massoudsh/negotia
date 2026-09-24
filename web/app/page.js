'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from './components/app-shell';

const STATUS_LABEL = { open: 'باز', awaiting_reply: 'در انتظار پاسخ', serious: 'جدی', closed: 'بسته' };
const DIRECTION_LABEL = { export: 'صادرات', import: 'واردات' };

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
    <main className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">مرکز اجرای تجارت</p>
          <h1>مکالمات</h1>
          <p className="lead">نمایی یکپارچه از مذاکره‌های جاری با خریداران و تأمین‌کنندگان خارجی؛ از اولین پیام تا آماده‌سازی سفارش.</p>
        </div>
        <Link href="/approvals" className="btn btn-outline">مشاهده‌ی تأییدهای در انتظار <Icon name="arrow" size={15} /></Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><span className="stat-label">کل مکالمات</span><strong className="stat-value">{stats.total}</strong><span className="stat-note">در فضای کاری</span></div>
        <div className="stat-card"><span className="stat-label">مذاکره‌های جدی</span><strong className="stat-value">{stats.serious}</strong><span className="stat-note">آماده‌ی اقدام بعدی</span></div>
        <div className="stat-card"><span className="stat-label">در انتظار پاسخ</span><strong className="stat-value">{stats.waiting}</strong><span className="stat-note">نیازمند پیگیری</span></div>
        <div className="stat-card"><span className="stat-label">پرونده‌های صادراتی</span><strong className="stat-value">{stats.export}</strong><span className="stat-note">از کل مکالمات</span></div>
      </div>

      <div className="section-toolbar">
        <div><h2 className="section-title">آخرین مکالمات</h2><span className="toolbar-meta">به‌روزرسانی زنده از فضای کاری</span></div>
        <div className="search-box"><input aria-label="جست‌وجوی مکالمات" placeholder="جست‌وجوی شرکت یا محصول" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>

      {conversations === null && <LoadingState />}
      {conversations?.length === 0 && <div className="empty">هنوز مکالمه‌ای ثبت نشده است.</div>}
      {conversations?.length > 0 && filtered.length === 0 && <div className="empty">موردی با این جست‌وجو پیدا نشد.</div>}
      <ul className="card-list">
        {filtered.map((c) => {
          const last = c.messages[c.messages.length - 1];
          const company = c.contact?.company ?? c.contact?.name ?? 'بدون نام';
          return (
            <li key={c.id}>
              <Link href={`/conversations/${c.id}`} className="card">
                <div className="card-row">
                  <div className="card-title"><span className="company-mark">{company.slice(0, 1)}</span><div><strong className="company-name">{company}</strong><span className="company-person">{c.contact?.name}</span></div></div>
                  <span className={`badge badge-${c.status}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
                </div>
                <div className="card-details">
                  <span className="card-detail">طرف مقابل <strong>{c.contact?.country}</strong></span>
                  <span className="card-detail">محصول <strong>{c.productCode}</strong></span>
                  <span className="card-detail"><strong>{DIRECTION_LABEL[c.direction] ?? c.direction}</strong></span>
                </div>
                {last && <p className="preview" dir="ltr">{last.text}</p>}
                <div className="card-footer"><span>{c.messages.length} پیام در thread</span><span className="arrow-link">باز کردن <Icon name="arrow" size={14} /></span></div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
