'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

const TYPE_LABEL = { message: 'پیام تجاری', proforma: 'پیش‌فاکتور' };
const STATUS_LABEL = { pending: 'در انتظار بررسی', approved: 'تأییدشده', rejected: 'ردشده' };

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => fetch('/api/approvals').then((r) => r.json()).then(setApprovals), []);
  useEffect(() => { load(); }, [load]);

  async function decide(id, decision) {
    setBusyId(id);
    await fetch(`/api/approvals/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, approverId: 'demo-reviewer' }) });
    setBusyId(null);
    load();
  }

  const visible = useMemo(() => approvals?.filter((a) => filter === 'all' || a.status === filter) ?? [], [approvals, filter]);
  const pending = approvals?.filter((a) => a.status === 'pending').length ?? 0;
  const approved = approvals?.filter((a) => a.status === 'approved').length ?? 0;
  const rejected = approvals?.filter((a) => a.status === 'rejected').length ?? 0;

  return (
    <main className="page">
      <div className="page-heading">
        <div><p className="eyebrow">کنترل انسانی</p><h1>تأییدهای انسانی</h1><p className="lead">هر پیام و پیش‌فاکتور قبل از ارسال از این checkpoint عبور می‌کند؛ تصمیم نهایی همیشه با تیم شماست.</p></div>
        <Link href="/" className="back-link">بازگشت به مکالمات</Link>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><span className="stat-label">در انتظار بررسی</span><strong className="stat-value">{pending}</strong><span className="stat-note">نیازمند تصمیم شما</span></div>
        <div className="stat-card"><span className="stat-label">تأییدشده</span><strong className="stat-value">{approved}</strong><span className="stat-note">در این فضای کاری</span></div>
        <div className="stat-card"><span className="stat-label">ردشده</span><strong className="stat-value">{rejected}</strong><span className="stat-note">با سیاست‌ها هم‌راستا نبود</span></div>
        <div className="stat-card"><span className="stat-label">قانون تصمیم</span><strong className="stat-value">۱۰۰٪</strong><span className="stat-note">نیازمند تأیید انسان</span></div>
      </div>

      <div className="section-toolbar"><div><h2 className="section-title">صف بررسی</h2><span className="toolbar-meta">{visible.length} درخواست نمایش داده می‌شود</span></div><div className="btn-row"><button className={`btn ${filter === 'all' ? '' : 'btn-outline'}`} onClick={() => setFilter('all')}>همه</button><button className={`btn ${filter === 'pending' ? '' : 'btn-outline'}`} onClick={() => setFilter('pending')}>در انتظار</button><button className={`btn ${filter === 'approved' ? '' : 'btn-outline'}`} onClick={() => setFilter('approved')}>تأییدشده</button></div></div>

      {approvals === null && <div className="card-list"><div className="skeleton" /><div className="skeleton" /></div>}
      {approvals?.length === 0 && <div className="empty">درخواست تأییدی وجود ندارد. وقتی یک پیش‌فاکتور آماده شود، اینجا نمایش داده می‌شود.</div>}
      {approvals?.length > 0 && visible.length === 0 && <div className="empty">درخواستی در این فیلتر وجود ندارد.</div>}
      <div className="approval-list">
        {visible.map((a) => (
          <article key={a.id} className={`approval-card ${a.status === 'pending' ? 'pending' : ''}`}>
            <div className="approval-card-header"><div className="approval-kind"><span className="approval-icon">{a.type === 'proforma' ? '₿' : '✦'}</span><div><strong>{TYPE_LABEL[a.type] ?? a.type}</strong><div className="toolbar-meta">درخواست شماره {a.id.slice(0, 8)}</div></div></div><span className={`badge badge-${a.status}`}>{STATUS_LABEL[a.status] ?? a.status}</span></div>
            <div className="approval-content"><pre>{JSON.stringify(a.payload, null, 2)}</pre></div>
            <div className="approval-footer">
              {a.status === 'pending' ? <div className="btn-row"><button className="btn btn-success" disabled={busyId === a.id} onClick={() => decide(a.id, 'approved')}>تأیید و ادامه</button><button className="btn btn-danger" disabled={busyId === a.id} onClick={() => decide(a.id, 'rejected')}>رد درخواست</button></div> : <div className="approval-meta">تصمیم توسط {a.approvedBy} در {new Date(a.decidedAt).toLocaleString('fa-IR')}{a.reason && ` — ${a.reason}`}</div>}
              <span className="approval-meta">ایجاد شده در {new Date(a.createdAt).toLocaleDateString('fa-IR')}</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
