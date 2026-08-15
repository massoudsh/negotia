'use client';

import { useEffect, useState, useCallback } from 'react';

const TYPE_LABEL = { message: 'پیام', proforma: 'پیش‌فاکتور' };
const STATUS_LABEL = { pending: 'در انتظار', approved: 'تأییدشده', rejected: 'ردشده' };

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    fetch('/api/approvals')
      .then((r) => r.json())
      .then(setApprovals);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id, decision) {
    setBusyId(id);
    await fetch(`/api/approvals/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, approverId: 'demo-reviewer' }),
    });
    setBusyId(null);
    load();
  }

  return (
    <main className="page">
      <h1>تأییدهای انسانی</h1>
      <p className="muted small">
        طبق سیاست شرکت، هیچ پیام یا پیش‌فاکتوری بدون تأیید صریح یک انسان ارسال نمی‌شود — این صفحه همان checkpoint است.
      </p>

      {approvals === null && <p className="muted">در حال بارگذاری...</p>}
      {approvals?.length === 0 && <div className="empty">درخواست تأییدی وجود ندارد.</div>}

      <ul className="card-list">
        {approvals?.map((a) => (
          <li key={a.id} className="card">
            <div className="card-row">
              <strong>{TYPE_LABEL[a.type] ?? a.type}</strong>
              <span className={`badge badge-${a.status}`}>{STATUS_LABEL[a.status] ?? a.status}</span>
            </div>
            <pre
              style={{
                marginTop: 8,
                background: '#f8fafc',
                padding: 10,
                borderRadius: 8,
                fontSize: 12,
                direction: 'ltr',
                textAlign: 'left',
                overflowX: 'auto',
              }}
            >
              {JSON.stringify(a.payload, null, 2)}
            </pre>
            {a.status === 'pending' ? (
              <div className="btn-row">
                <button className="btn btn-success" disabled={busyId === a.id} onClick={() => decide(a.id, 'approved')}>
                  تأیید
                </button>
                <button className="btn btn-danger" disabled={busyId === a.id} onClick={() => decide(a.id, 'rejected')}>
                  رد
                </button>
              </div>
            ) : (
              <div className="muted small">
                تصمیم توسط {a.approvedBy} در {new Date(a.decidedAt).toLocaleString('fa-IR')}
                {a.reason && ` — ${a.reason}`}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
