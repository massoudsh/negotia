'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const STATUS_LABEL = {
  open: 'باز',
  awaiting_reply: 'در انتظار پاسخ',
  serious: 'جدی',
  closed: 'بسته',
};

const VIOLATION_LABEL = {
  below_min_price: 'زیر کف قیمت مجاز',
  non_standard_payment_terms: 'شرایط پرداخت غیرمتعارف',
  sensitive_party: 'طرف/کشور حساس — نیاز به بررسی',
  delivery_beyond_capacity: 'زمان تحویل بیش از ظرفیت تولید (اصلاح خودکار شد)',
};

export default function ConversationPage() {
  const { id } = useParams();

  const [conversation, setConversation] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const [summaryResult, setSummaryResult] = useState(null);
  const [draftResult, setDraftResult] = useState(null);
  const [followUpResult, setFollowUpResult] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  const [newMessage, setNewMessage] = useState('');

  const [offer, setOffer] = useState({
    quantity: '',
    unitPrice: '',
    paymentTerms: 'advance_payment',
    deliveryDays: '',
    destination: '',
    country: '',
    customerId: '',
  });
  const [proformaResult, setProformaResult] = useState(null);

  const load = useCallback(() => {
    fetch(`/api/conversations/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('not-found');
        return r.json();
      })
      .then(setConversation)
      .catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendMessage(sender) {
    if (!newMessage.trim()) return;
    await fetch(`/api/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender, text: newMessage }),
    });
    setNewMessage('');
    load();
  }

  async function runSummarize() {
    setLoadingAction('summarize');
    const res = await fetch(`/api/conversations/${id}/summarize`, { method: 'POST' });
    setSummaryResult(await res.json());
    setLoadingAction(null);
  }

  async function runDraft() {
    setLoadingAction('draft');
    const res = await fetch(`/api/conversations/${id}/draft-reply`, { method: 'POST' });
    setDraftResult(await res.json());
    setLoadingAction(null);
  }

  async function useDraftAsMessage() {
    if (!draftResult?.draft?.text) return;
    await fetch(`/api/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sender: 'company', text: draftResult.draft.text }),
    });
    setDraftResult(null);
    load();
  }

  async function runFollowUp() {
    setLoadingAction('followup');
    const res = await fetch(`/api/conversations/${id}/follow-up`, { method: 'POST' });
    setFollowUpResult(await res.json());
    setLoadingAction(null);
  }

  async function submitProforma(e) {
    e.preventDefault();
    setLoadingAction('proforma');
    const res = await fetch(`/api/conversations/${id}/proforma`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...offer, productCode: conversation.productCode }),
    });
    setProformaResult(await res.json());
    setLoadingAction(null);
  }

  if (notFound) {
    return (
      <main className="page">
        <p className="empty">مکالمه پیدا نشد.</p>
        <Link href="/" className="back-link">
          ← بازگشت به مکالمات
        </Link>
      </main>
    );
  }

  if (!conversation) {
    return (
      <main className="page">
        <p className="muted">در حال بارگذاری...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <Link href="/" className="back-link">
        ← بازگشت به مکالمات
      </Link>

      <div className="detail-header">
        <div className="card-row">
          <h1>{conversation.contact?.company ?? conversation.contact?.name}</h1>
          <span className={`badge badge-${conversation.status}`}>
            {STATUS_LABEL[conversation.status] ?? conversation.status}
          </span>
        </div>
        <div className="muted small">
          {conversation.contact?.name} ({conversation.contact?.email}) · {conversation.contact?.country} ·{' '}
          {conversation.productCode} · {conversation.direction === 'export' ? 'صادرات' : 'واردات'}
        </div>
      </div>

      <section className="section">
        <h2>مکالمه</h2>
        <div className="thread">
          {conversation.messages.map((m) => (
            <div key={m.id} className={`bubble bubble-${m.sender}`}>
              {m.text}
              <div className="bubble-meta">
                {m.sender === 'contact' ? 'طرف خارجی' : 'شرکت'} · {new Date(m.at).toLocaleString('fa-IR')}
              </div>
            </div>
          ))}
        </div>
        <div className="form-row">
          <textarea
            rows={3}
            placeholder="متن پیام جدید..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
        </div>
        <div className="btn-row">
          <button className="btn btn-outline" onClick={() => sendMessage('contact')}>
            ثبت به‌عنوان پیام طرف خارجی
          </button>
          <button className="btn" onClick={() => sendMessage('company')}>
            ثبت به‌عنوان پیام شرکت
          </button>
        </div>
      </section>

      <section className="section">
        <h2>ابزارهای هوشمند</h2>
        <div className="btn-row">
          <button className="btn btn-outline" onClick={runSummarize} disabled={loadingAction === 'summarize'}>
            {loadingAction === 'summarize' ? 'در حال خلاصه‌سازی...' : 'خلاصه‌سازی + سطح جدیت'}
          </button>
          <button className="btn btn-outline" onClick={runDraft} disabled={loadingAction === 'draft'}>
            {loadingAction === 'draft' ? 'در حال آماده‌سازی...' : 'پیشنهاد پاسخ (انگلیسی)'}
          </button>
          <button className="btn btn-outline" onClick={runFollowUp} disabled={loadingAction === 'followup'}>
            {loadingAction === 'followup' ? 'در حال بررسی...' : 'بررسی نیاز به پیگیری'}
          </button>
        </div>

        {summaryResult && (
          <div className="result-box">
            <strong>خلاصه:</strong> {summaryResult.summary}
            <br />
            <strong>نیت:</strong> {summaryResult.intent} — <strong>سطح جدیت:</strong> {summaryResult.seriousness}
          </div>
        )}

        {draftResult && (
          <div className="result-box">
            <div style={{ whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left' }}>{draftResult.draft.text}</div>
            {draftResult.draft.suggestedQuestions?.length > 0 && (
              <div className="tag-list">
                {draftResult.draft.suggestedQuestions.map((q, i) => (
                  <span key={i} className="tag" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                    {q}
                  </span>
                ))}
              </div>
            )}
            <div className="btn-row" style={{ marginTop: 10 }}>
              <button className="btn" onClick={useDraftAsMessage}>
                افزودن به مکالمه به‌عنوان پیام شرکت
              </button>
            </div>
          </div>
        )}

        {followUpResult && (
          <div className="result-box">
            {followUpResult.needsFollowUp
              ? `نیاز به پیگیری دارد — موعد: ${new Date(followUpResult.dueAt).toLocaleString('fa-IR')}`
              : followUpResult.dueAt
                ? `هنوز مهلت پیگیری نرسیده — موعد: ${new Date(followUpResult.dueAt).toLocaleString('fa-IR')}`
                : 'فعلاً نیازی به پیگیری نیست (آخرین پیام از طرف خریدار/تأمین‌کننده بوده).'}
          </div>
        )}
      </section>

      <section className="section">
        <h2>آماده‌سازی پیش‌فاکتور</h2>
        <p className="muted small">
          پیشنهاد از فیلتر سیاست‌های شرکت (کف قیمت، شرایط پرداخت، ظرفیت تولید، طرف‌های حساس) عبور می‌کند و همیشه به تأیید انسانی می‌رود.
        </p>
        <form onSubmit={submitProforma}>
          <div className="grid-2">
            <div className="form-row">
              <label>تعداد (quantity)</label>
              <input
                type="number"
                required
                value={offer.quantity}
                onChange={(e) => setOffer({ ...offer, quantity: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>قیمت واحد (unit price)</label>
              <input
                type="number"
                step="0.01"
                required
                value={offer.unitPrice}
                onChange={(e) => setOffer({ ...offer, unitPrice: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>شرایط پرداخت</label>
              <select
                value={offer.paymentTerms}
                onChange={(e) => setOffer({ ...offer, paymentTerms: e.target.value })}
              >
                <option value="advance_payment">Advance payment</option>
                <option value="lc">LC</option>
                <option value="credit_30">Credit 30</option>
                <option value="credit_90">Credit 90 (غیرمتعارف)</option>
              </select>
            </div>
            <div className="form-row">
              <label>مهلت تحویل (روز)</label>
              <input
                type="number"
                required
                value={offer.deliveryDays}
                onChange={(e) => setOffer({ ...offer, deliveryDays: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label>مقصد</label>
              <input value={offer.destination} onChange={(e) => setOffer({ ...offer, destination: e.target.value })} />
            </div>
            <div className="form-row">
              <label>کد کشور (اختیاری، برای بررسی طرف حساس)</label>
              <input value={offer.country} onChange={(e) => setOffer({ ...offer, country: e.target.value })} />
            </div>
          </div>
          <button className="btn" type="submit" disabled={loadingAction === 'proforma'}>
            {loadingAction === 'proforma' ? 'در حال ثبت...' : 'ثبت پیش‌فاکتور و ارسال برای تأیید'}
          </button>
        </form>

        {proformaResult && (
          <div className={`result-box ${proformaResult.proforma?.violations?.length ? 'warn' : 'ok'}`}>
            <strong>وضعیت پیش‌فاکتور:</strong> {proformaResult.proforma.status} · مبلغ کل:{' '}
            {proformaResult.proforma.totalPrice}
            {proformaResult.proforma.violations?.length > 0 && (
              <div className="tag-list">
                {proformaResult.proforma.violations.map((v) => (
                  <span key={v} className="tag">
                    {VIOLATION_LABEL[v] ?? v}
                  </span>
                ))}
              </div>
            )}
            <div className="muted small" style={{ marginTop: 8 }}>
              درخواست تأیید انسانی ثبت شد (وضعیت: {proformaResult.approvalRequest.status}) — از صفحه{' '}
              <Link href="/approvals" style={{ color: 'var(--primary)' }}>
                تأییدها
              </Link>{' '}
              قابل بررسی است.
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
