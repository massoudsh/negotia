'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useCurrentUser } from '../../components/app-shell';
import { GlassModal, Field, ErrorNotice } from '../../components/glass';
import { api, post } from '../../../lib/api';

const TYPE_LABEL = { message: 'پیام تجاری', proforma: 'پیش‌فاکتور' };
const STATUS_LABEL = { pending: 'در انتظار بررسی', approved: 'تأییدشده', rejected: 'ردشده' };

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirmation, setConfirmation] = useState(null);
  const [reason, setReason] = useState('');
  const [limit, setLimit] = useState(20);
  useEffect(() => { if (new URLSearchParams(window.location.search).get('status') === 'pending') setFilter('pending'); }, []);

  const user = useCurrentUser();
  const canReview = ['admin', 'reviewer'].includes(user.role);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setError('');
      setApprovals(await api('/api/approvals'));
    } catch (err) { setError(err.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(id, decision) {
    setBusyId(id);
    setError('');
    try {
      await post(`/api/approvals/${id}`, { decision, reason });
      setConfirmation(null); setReason('');
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusyId(null); }
  }

  const visible = useMemo(() => approvals?.filter((a) => filter === 'all' || a.status === filter) ?? [], [approvals, filter]);
  const pending = approvals?.filter((a) => a.status === 'pending').length ?? 0;
  const approved = approvals?.filter((a) => a.status === 'approved').length ?? 0;
  const rejected = approvals?.filter((a) => a.status === 'rejected').length ?? 0;

  return (
    <main className="page">
      {error && <p className="result-box warn" role="alert">{error} <button className="btn btn-outline" onClick={load}>تلاش مجدد</button></p>}
      {!canReview && <p className="muted">حساب شما فقط دسترسی مشاهده دارد؛ تصمیم‌گیری با بازبین یا مدیر است.</p>}
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
        {visible.slice(0, limit).map((a) => (
          <article key={a.id} className={`approval-card ${a.status === 'pending' ? 'pending' : ''}`}>
            <div className="approval-card-header"><div className="approval-kind"><span className="approval-icon">{a.type === 'proforma' ? '₿' : '✦'}</span><div><strong>{TYPE_LABEL[a.type] ?? a.type}</strong><div className="toolbar-meta">درخواست شماره {a.id.slice(0, 8)}</div></div></div><span className={`badge badge-${a.status}`}>{STATUS_LABEL[a.status] ?? a.status}</span></div>
            {a.payload.costEstimate && <div className="result-box"><strong>برآورد بهای تمام‌شده (نرخ دستی)</strong><p>جمع: {a.payload.costEstimate.total.toLocaleString('fa-IR')} تومان · هر واحد: {a.payload.costEstimate.perUnit.toLocaleString('fa-IR')} تومان</p><p className="muted small">مقدار: {a.payload.costEstimate.inputs.quantity.toLocaleString('fa-IR')} · خرید هر واحد: {a.payload.costEstimate.inputs.unitPrice} {a.payload.costEstimate.inputs.currency} · ثبت برآورد: {new Date(a.payload.costEstimate.createdAt).toLocaleString('fa-IR')}</p><p className="muted small">این نسخه پیوست مستقل از تغییرات بعدی برآورد پرونده است؛ مبلغ پیش‌فاکتور را جایگزین نمی‌کند.</p></div>}
            {a.type === 'message' && <div className="ai-output"><strong>نسخه بازبینی‌شده پیش‌نویس · ارسال نشده</strong><p>گیرنده: <bdi>{a.payload.recipient}</bdi></p><p dir="auto" className="preformatted">{a.payload.text}</p><details><summary>نسخه اولیه قبل از ویرایش</summary><p dir="auto" className="preformatted">{a.payload.originalText}</p></details></div>}
            <details className="approval-content"><summary>تمام داده‌های نسخه ثبت‌شده</summary><pre>{JSON.stringify(a.payload, null, 2)}</pre></details>
            <div className="approval-footer">
              {a.status === 'pending' ? <div className="btn-row"><button className="btn btn-success" disabled={!canReview || busyId !== null} onClick={() => { setError(''); setReason(''); setConfirmation({ record: a, decision: 'approved' }); }}>تأیید و ادامه</button><button className="btn btn-danger" disabled={!canReview || busyId !== null} onClick={() => { setError(''); setReason(''); setConfirmation({ record: a, decision: 'rejected' }); }}>رد درخواست</button></div> : <div className="approval-meta">تصمیم توسط {a.approvedBy} در {new Date(a.decidedAt).toLocaleString('fa-IR')}{a.reason && ` — ${a.reason}`}</div>}
              <span className="approval-meta">ایجاد شده در {new Date(a.createdAt).toLocaleDateString('fa-IR')}</span>
            </div>
          </article>
        ))}
      </div>
      {visible.length > limit && <button className="btn btn-outline" onClick={() => setLimit(value => value + 20)}>نمایش ۲۰ درخواست بیشتر</button>}
      <GlassModal open={Boolean(confirmation)} title="بازبینی تصمیم نهایی" onClose={() => { if (!busyId) setConfirmation(null); }}>{confirmation && <><p>{confirmation.decision === 'approved' ? 'تأیید' : 'رد'} درخواست <bdi>{confirmation.record.id}</bdi></p><p>این تصمیم نهایی و با نام حساب شما ثبت می‌شود؛ ارسال پیام، ایجاد سفارش یا انتقال وجه انجام نمی‌شود.</p><Field label="توضیح تصمیم یا تغییرات موردنیاز" as="textarea" maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} disabled={Boolean(busyId)} /><ErrorNotice error={error} /><button className="btn" disabled={Boolean(busyId)} onClick={() => decide(confirmation.record.id, confirmation.decision)}>{busyId ? 'در حال ثبت…' : 'تأیید و ثبت تصمیم'}</button></>}</GlassModal>
    </main>
  );
}
