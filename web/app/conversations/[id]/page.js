'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '../../components/app-shell';

const STATUS_LABEL = { open: 'باز', awaiting_reply: 'در انتظار پاسخ', serious: 'جدی', closed: 'بسته' };
const VIOLATION_LABEL = { below_min_price: 'زیر کف قیمت مجاز', non_standard_payment_terms: 'شرایط پرداخت غیرمتعارف', sensitive_party: 'طرف/کشور حساس — نیاز به بررسی', delivery_beyond_capacity: 'زمان تحویل بیش از ظرفیت تولید (اصلاح خودکار شد)' };

export default function ConversationPage() {
  const { id } = useParams();
  const [conversation, setConversation] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [summaryResult, setSummaryResult] = useState(null);
  const [draftResult, setDraftResult] = useState(null);
  const [followUpResult, setFollowUpResult] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [offer, setOffer] = useState({ quantity: '', unitPrice: '', paymentTerms: 'advance_payment', deliveryDays: '', destination: '', country: '', customerId: '' });
  const [proformaResult, setProformaResult] = useState(null);

  const load = useCallback(() => fetch(`/api/conversations/${id}`).then((r) => { if (!r.ok) throw new Error('not-found'); return r.json(); }).then(setConversation).catch(() => setNotFound(true)), [id]);
  useEffect(() => { load(); }, [load]);

  async function sendMessage(sender) {
    if (!newMessage.trim()) return;
    await fetch(`/api/conversations/${id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender, text: newMessage }) });
    setNewMessage('');
    load();
  }
  async function runSummarize() { setLoadingAction('summarize'); setSummaryResult(await (await fetch(`/api/conversations/${id}/summarize`, { method: 'POST' })).json()); setLoadingAction(null); }
  async function runDraft() { setLoadingAction('draft'); setDraftResult(await (await fetch(`/api/conversations/${id}/draft-reply`, { method: 'POST' })).json()); setLoadingAction(null); }
  async function runFollowUp() { setLoadingAction('followup'); setFollowUpResult(await (await fetch(`/api/conversations/${id}/follow-up`, { method: 'POST' })).json()); setLoadingAction(null); }
  async function useDraftAsMessage() {
    if (!draftResult?.draft?.text) return;
    await fetch(`/api/conversations/${id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sender: 'company', text: draftResult.draft.text }) });
    setDraftResult(null); load();
  }
  async function submitProforma(e) {
    e.preventDefault(); setLoadingAction('proforma');
    const res = await fetch(`/api/conversations/${id}/proforma`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...offer, productCode: conversation.productCode }) });
    setProformaResult(await res.json()); setLoadingAction(null);
  }
  function updateOffer(key, value) { setOffer((current) => ({ ...current, [key]: value })); }

  if (notFound) return <main className="page"><div className="empty">مکالمه پیدا نشد.</div><Link href="/" className="back-link">بازگشت به مکالمات</Link></main>;
  if (!conversation) return <main className="page"><div className="skeleton" /></main>;

  const company = conversation.contact?.company ?? conversation.contact?.name;
  return (
    <main className="page">
      <Link href="/" className="back-link">← بازگشت به مکالمات</Link>
      <div className="detail-header">
        <div><p className="eyebrow">پرونده‌ی مذاکره</p><h1>{company}</h1><div className="detail-subtitle">{conversation.contact?.name} · {conversation.contact?.email}</div><div className="detail-meta"><span>کشور <strong>{conversation.contact?.country}</strong></span><span>محصول <strong>{conversation.productCode}</strong></span><span>نوع <strong>{conversation.direction === 'export' ? 'صادرات' : 'واردات'}</strong></span><span>{conversation.messages.length} پیام</span></div></div>
        <span className={`badge badge-${conversation.status}`}>{STATUS_LABEL[conversation.status] ?? conversation.status}</span>
      </div>

      <div className="detail-layout">
        <div>
          <section className="section"><div className="section-header"><h2>مکالمه</h2><span className="section-kicker">کانال: ایمیل</span></div><div className="thread">{conversation.messages.map((m) => <div key={m.id} className={`bubble bubble-${m.sender}`} dir="ltr">{m.text}<div className="bubble-meta">{m.sender === 'contact' ? 'طرف خارجی' : 'شرکت'} · {new Date(m.at).toLocaleString('fa-IR')}</div></div>)}</div><div className="form-row"><textarea rows={3} placeholder="متن پیام جدید را وارد کنید..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} /></div><div className="btn-row"><button className="btn btn-outline" onClick={() => sendMessage('contact')}>ثبت به‌عنوان پیام طرف خارجی</button><button className="btn" onClick={() => sendMessage('company')}>ثبت پیام شرکت</button></div></section>

          <section className="section"><div className="section-header"><div><h2>آماده‌سازی پیش‌فاکتور</h2><span className="section-kicker">عبور از فیلتر سیاست شرکت و ارسال برای تأیید</span></div></div><p className="muted small">کف قیمت، شرایط پرداخت، ظرفیت تولید و طرف‌های حساس قبل از ایجاد پیش‌فاکتور بررسی می‌شوند.</p><form onSubmit={submitProforma}><div className="grid-2"><div className="form-row"><label>تعداد</label><input type="number" required value={offer.quantity} onChange={(e) => updateOffer('quantity', e.target.value)} /></div><div className="form-row"><label>قیمت واحد</label><input type="number" step="0.01" required value={offer.unitPrice} onChange={(e) => updateOffer('unitPrice', e.target.value)} /></div><div className="form-row"><label>شرایط پرداخت</label><select value={offer.paymentTerms} onChange={(e) => updateOffer('paymentTerms', e.target.value)}><option value="advance_payment">Advance payment</option><option value="lc">LC</option><option value="credit_30">Credit 30</option><option value="credit_90">Credit 90 (غیرمتعارف)</option></select></div><div className="form-row"><label>مهلت تحویل (روز)</label><input type="number" required value={offer.deliveryDays} onChange={(e) => updateOffer('deliveryDays', e.target.value)} /></div><div className="form-row"><label>مقصد</label><input value={offer.destination} onChange={(e) => updateOffer('destination', e.target.value)} /></div><div className="form-row"><label>کد کشور (اختیاری)</label><input value={offer.country} onChange={(e) => updateOffer('country', e.target.value)} /></div></div><button className="btn" type="submit" disabled={loadingAction === 'proforma'}>{loadingAction === 'proforma' ? 'در حال بررسی...' : 'ثبت پیش‌فاکتور برای تأیید'}</button></form>{proformaResult && <div className={`result-box ${proformaResult.proforma?.violations?.length ? 'warn' : 'ok'}`}><strong>وضعیت:</strong> {proformaResult.proforma.status} · <strong>مبلغ کل:</strong> {proformaResult.proforma.totalPrice}{proformaResult.proforma.violations?.length > 0 && <div className="tag-list">{proformaResult.proforma.violations.map((v) => <span key={v} className="tag">{VIOLATION_LABEL[v] ?? v}</span>)}</div>}<div className="muted small" style={{ marginTop: 8 }}>درخواست تأیید انسانی ثبت شد — <Link href="/approvals" className="arrow-link">مشاهده در صف تأییدها</Link></div></div>}</section>
        </div>

        <aside>
          <section className="section"><div className="section-header"><div><h2>ابزارهای هوشمند</h2><span className="section-kicker">کمک به تصمیم‌گیری سریع‌تر</span></div><Icon name="spark" size={17} /></div><div className="tool-grid"><button className="btn btn-outline" onClick={runSummarize} disabled={loadingAction === 'summarize'}>{loadingAction === 'summarize' ? 'در حال اجرا...' : 'خلاصه‌سازی'}</button><button className="btn btn-outline" onClick={runDraft} disabled={loadingAction === 'draft'}>{loadingAction === 'draft' ? 'در حال آماده‌سازی...' : 'پیشنهاد پاسخ'}</button><button className="btn btn-outline" onClick={runFollowUp} disabled={loadingAction === 'followup'}>{loadingAction === 'followup' ? 'در حال بررسی...' : 'بررسی پیگیری'}</button></div>{summaryResult && <div className="result-box"><strong>خلاصه:</strong> {summaryResult.summary}<br /><strong>نیت:</strong> {summaryResult.intent} · <strong>جدیت:</strong> {summaryResult.seriousness}</div>}{draftResult && <div className="result-box"><div dir="ltr" style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{draftResult.draft.text}</div>{draftResult.draft.suggestedQuestions?.length > 0 && <div className="tag-list">{draftResult.draft.suggestedQuestions.map((q, i) => <span key={i} className="tag" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>{q}</span>)}</div>}<button className="btn" style={{ marginTop: 12 }} onClick={useDraftAsMessage}>افزودن پاسخ به مکالمه</button></div>}{followUpResult && <div className="result-box">{followUpResult.needsFollowUp ? `نیاز به پیگیری دارد — موعد: ${new Date(followUpResult.dueAt).toLocaleString('fa-IR')}` : followUpResult.dueAt ? `هنوز مهلت پیگیری نرسیده — موعد: ${new Date(followUpResult.dueAt).toLocaleString('fa-IR')}` : 'فعلاً نیازی به پیگیری نیست.'}</div>}</section>
          <div className="info-panel"><h3>نقطه‌ی کنترل انسانی</h3><p>ایجنت پیشنهاد می‌دهد، اما ارسال پیام و تصمیم تجاری بدون تأیید صریح شما انجام نمی‌شود.</p><Link href="/approvals" className="arrow-link" style={{ marginTop: 12 }}>رفتن به تأییدها <Icon name="arrow" size={14} /></Link></div>
        </aside>
      </div>
    </main>
  );
}
