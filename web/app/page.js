'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const STATUS_LABEL = {
  open: 'باز',
  awaiting_reply: 'در انتظار پاسخ',
  serious: 'جدی',
  closed: 'بسته',
};

export default function HomePage() {
  const [conversations, setConversations] = useState(null);

  useEffect(() => {
    fetch('/api/conversations')
      .then((r) => r.json())
      .then(setConversations);
  }, []);

  return (
    <main className="page">
      <h1>مکالمات</h1>
      <p className="muted small">
        مکالمات جاری با خریداران/تأمین‌کنندگان خارجی — روی هرکدام بزن تا خلاصه‌سازی، پیش‌نویس پاسخ و آماده‌سازی پیش‌فاکتور را ببینی.
      </p>

      {conversations === null && <p className="muted">در حال بارگذاری...</p>}
      {conversations?.length === 0 && <div className="empty">هنوز مکالمه‌ای ثبت نشده است.</div>}

      <ul className="card-list">
        {conversations?.map((c) => {
          const last = c.messages[c.messages.length - 1];
          return (
            <li key={c.id}>
              <Link href={`/conversations/${c.id}`} className="card">
                <div className="card-row">
                  <strong>{c.contact?.company ?? c.contact?.name}</strong>
                  <span className={`badge badge-${c.status}`}>{STATUS_LABEL[c.status] ?? c.status}</span>
                </div>
                <div className="muted small" style={{ marginTop: 4 }}>
                  {c.contact?.name} · {c.contact?.country} · {c.productCode} ·{' '}
                  {c.direction === 'export' ? 'صادرات' : 'واردات'}
                </div>
                {last && <p className="preview">{last.text}</p>}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
