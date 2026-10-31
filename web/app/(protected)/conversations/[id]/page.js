'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useCurrentUser } from '../../../components/app-shell';
import { AISuggestionBadge, DealStatusBadge, ErrorNotice, Field, GlassButton, GlassModal, GlassSurface } from '../../../components/glass';
import { api, post } from '../../../../lib/api';
import { validateOffer } from '../../../../lib/validation';

const tools = [['summarize', 'خلاصه‌سازی'], ['draft-reply', 'پیش‌نویس پاسخ'], ['agent-brief', 'نمای کلی پرونده'], ['deal-readiness', 'آمادگی اطلاعات'], ['negotiation-plan', 'نقشه مذاکره'], ['follow-up', 'بررسی پیگیری']];
const date = value => new Date(value).toLocaleString('fa-IR');

export default function ConversationPage() {
  const { id } = useParams();
  const user = useCurrentUser();
  const readOnly = user.role === 'viewer';
  const [conversation, setConversation] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [results, setResults] = useState({});
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [offer, setOffer] = useState({ quantity: '', unitPrice: '', paymentTerms: 'advance_payment', deliveryDays: '', destination: '', country: '' });
  const [offerErrors, setOfferErrors] = useState({});
  const [estimateId, setEstimateId] = useState('');
  const [proforma, setProforma] = useState(null);
  const [messageLimit, setMessageLimit] = useState(30);
  const [historyType, setHistoryType] = useState('all');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyDate, setHistoryDate] = useState('');
  const [historyLimit, setHistoryLimit] = useState(30);
  const load = useCallback(async () => {
    try { setConversation(await api(`/api/conversations/${id}`)); return true; }
    catch (err) { setError(err.message); return false; }
  }, [id]);
  useEffect(() => { setConversation(null); setResults({}); setError(''); load(); }, [load]);

  async function run(tool) {
    setBusy(tool); setError(''); setNotice('');
    try {
      const data = await post(`/api/conversations/${id}/${tool}`);
      setResults(current => ({ ...current, [tool]: { data, at: new Date().toISOString(), sources: conversation.messages.map(item => item.id) } }));
      if (tool === 'draft-reply') setDraft(data.draft.text);
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  }
  async function confirmAction() {
    setBusy('save'); setError(''); setNotice('');
    try {
      if (confirm === 'regenerate') { setConfirm(null); await run('draft-reply'); return; }
      if (confirm === 'draft') {
        await post(`/api/conversations/${id}/draft-approval`, { text: draft, originalText: results['draft-reply'].data.draft.text });
        setDraft(''); setResults(current => ({ ...current, 'draft-reply': null }));
        setNotice('نسخه مستقل پیش‌نویس برای بررسی ثبت شد. هیچ پیام خارجی ارسال نشده است.');
      } else {
        await post(`/api/conversations/${id}/messages`, { text: message, sender: confirm });
        setMessage(''); setNotice('پیام فقط در سابقه محلی ثبت شد؛ ارسال خارجی انجام نشده است.');
      }
      setConfirm(null); await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  }
  async function saveNote(event) {
    event.preventDefault(); setBusy('note'); setError('');
    try { await post(`/api/conversations/${id}/notes`, { text: note }); setNote(''); setNotice('یادداشت داخلی ذخیره شد.'); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(''); }
  }
  async function submitOffer(event) {
    event.preventDefault();
    const fields = validateOffer(offer); setOfferErrors(fields);
    if (Object.keys(fields).length) return;
    setBusy('proforma'); setError(''); setProforma(null);
    try {
      setProforma(await post(`/api/conversations/${id}/proforma`, { ...offer, productCode: conversation.productCode, costEstimateId: estimateId || undefined }));
      setNotice('پیش‌فاکتور برای تأیید ثبت شد.'); await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(''); }
  }
  const timeline = useMemo(() => {
    if (!conversation) return [];
    return [...conversation.messages.map(item => ({ id: item.id, at: item.at, type: 'message', actor: item.recordedByName ?? (item.sender === 'contact' ? 'طرف خارجی' : 'شرکت'), text: item.text })), ...(conversation.activity ?? [])]
      .filter(item => (historyType === 'all' || item.type === historyType) && (!historyQuery || item.actor?.toLowerCase().includes(historyQuery.toLowerCase())) && (!historyDate || item.at.slice(0, 10) >= historyDate))
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [conversation, historyType, historyQuery, historyDate]);
  const disabled = readOnly || Boolean(busy);
  const summary = results.summarize;
  const readiness = results['deal-readiness']?.data ?? results['agent-brief']?.data.readiness;
  const plan = results['negotiation-plan']?.data;

  if (!conversation) return <main className="page"><Link href="/">بازگشت به پرونده‌ها</Link><ErrorNotice error={error} retry={() => { setError(''); load(); }} />{!error && <div className="skeleton" role="status" aria-label="بارگذاری پرونده" />}</main>;
  return <main className="page">
    <Link className="back-link" href="/">بازگشت به پرونده‌ها</Link>
    <header className="detail-header"><div><p className="eyebrow">فضای مذاکره · {conversation.direction === 'import' ? 'واردات' : 'صادرات'}</p><h1><bdi>{conversation.contact?.company ?? conversation.contact?.name ?? 'بدون نام'}</bdi></h1><p><bdi>{conversation.contact?.name}</bdi> · <bdi>{conversation.contact?.email}</bdi></p><div className="detail-meta"><span>محصول <bdi>{conversation.productCode}</bdi></span><span>بازار <bdi>{conversation.contact?.country}</bdi></span><span>{conversation.messages.length.toLocaleString('fa-IR')} پیام</span></div></div><DealStatusBadge status={conversation.status} /></header>
    <nav className="section-links" aria-label="بخش‌های پرونده">{[['messages', 'پیام‌ها'], ['assistant', 'دستیار'], ['terms', 'شرایط و هزینه'], ['notes', 'یادداشت داخلی'], ['history', 'تاریخچه']].map(([anchor, label]) => <a key={anchor} href={`#${anchor}`}>{label}</a>)}<Link href="/documents">اسناد ثبت‌شده</Link></nav>
    <ErrorNotice error={error} />{notice && <p role="status" className="result-box ok">{notice} <Link href="/approvals">صف تأییدها</Link></p>}
    {readOnly && <p className="info-panel">حساب شما فقط دسترسی مشاهده دارد.</p>}
    <div className="detail-layout"><div>
      <GlassSurface id="messages" className="section"><h2>پیام‌های ثبت‌شده</h2><p className="muted">این صفحه سابقه محلی است؛ اتصال ارسال ایمیل فعال نیست. یادداشت‌های داخلی جدا نگهداری می‌شوند.</p>
        {conversation.messages.length > messageLimit && <GlassButton onClick={() => setMessageLimit(value => value + 30)}>نمایش ۳۰ پیام قدیمی‌تر</GlassButton>}
        <div className="thread">{conversation.messages.slice(-messageLimit).map(item => <article id={`message-${item.id}`} key={item.id} className={`bubble bubble-${item.sender}`}><div dir="auto">{item.text}</div><div className="bubble-meta">{item.sender === 'contact' ? 'طرف خارجی' : 'شرکت'} · <time dateTime={item.at}>{date(item.at)}</time></div></article>)}</div>
        <Field label="ثبت دستی پیام در سابقه (بدون ارسال)" as="textarea" dir="auto" maxLength={20000} value={message} onChange={event => setMessage(event.target.value)} disabled={disabled} />
        <div className="btn-row"><GlassButton disabled={disabled || !message.trim()} onClick={() => setConfirm('contact')}>ثبت پیام طرف خارجی</GlassButton><GlassButton disabled={disabled || !message.trim()} onClick={() => setConfirm('company')}>ثبت سابقه پیام شرکت</GlassButton></div>
      </GlassSurface>
      <GlassSurface id="terms" className="section"><h2>شرایط پیشنهادی و پیش‌فاکتور</h2><p className="muted">ثبت این فرم فقط درخواست تأیید می‌سازد؛ سفارش یا ارسال خارجی ایجاد نمی‌شود.</p>
        {conversation.direction === 'import' && <div className="result-box"><h3>بهای تمام‌شده با نرخ دستی</h3>{conversation.costEstimate ? <><p>جمع {conversation.costEstimate.total.toLocaleString('fa-IR')} تومان · هر واحد {conversation.costEstimate.perUnit.toLocaleString('fa-IR')} تومان</p><label><input type="checkbox" checked={Boolean(estimateId)} disabled={disabled} onChange={event => setEstimateId(event.target.checked ? conversation.costEstimate.id : '')} /> پیوست نسخه فعلی برآورد ({conversation.costEstimate.inputs.quantity.toLocaleString('fa-IR')} واحد)</label></> : <p>برآوردی ثبت نشده است.</p>}<p><Link href="/landed-cost">محاسبه بهای تمام‌شده</Link></p><GlassButton disabled={Boolean(busy)} onClick={() => { setEstimateId(''); load(); }}>تازه‌سازی برآورد</GlassButton></div>}
        <form onSubmit={submitOffer} noValidate>{Object.keys(offerErrors).length > 0 && <div className="result-box warn" role="alert"><p>فیلدهای زیر را اصلاح کنید؛ ورودی شما حفظ شده است.</p><ul>{Object.entries(offerErrors).map(([key, text]) => <li key={key}><a href={`#offer-${key}`}>{text}</a></li>)}</ul></div>}<fieldset className="calculator-fields" disabled={disabled}><div className="grid-2">{[['quantity', 'مقدار سفارش', 'number'], ['unitPrice', 'قیمت هر واحد', 'number'], ['deliveryDays', 'مهلت تحویل (روز)', 'number'], ['destination', 'مقصد', 'text'], ['country', 'کد کشور', 'text']].map(([key, label, type]) => <Field key={key} id={`offer-${key}`} error={offerErrors[key]} label={label} type={type} required={key !== 'country'} min={type === 'number' ? key === 'quantity' ? '0.000001' : '0' : undefined} step={type === 'number' ? 'any' : undefined} value={offer[key]} onChange={event => setOffer(current => ({ ...current, [key]: event.target.value }))} />)}<Field as="select" id="offer-paymentTerms" error={offerErrors.paymentTerms} label="شرایط پرداخت" value={offer.paymentTerms} onChange={event => setOffer(current => ({ ...current, paymentTerms: event.target.value }))}><option value="advance_payment">پیش‌پرداخت</option><option value="lc">اعتبار اسنادی (LC)</option><option value="credit_30">اعتبار ۳۰ روز</option><option value="credit_90">اعتبار ۹۰ روز (غیرمتعارف)</option></Field></div><GlassButton type="submit" busy={busy === 'proforma'}>ثبت برای تأیید انسانی</GlassButton></fieldset></form>
        {proforma && <div className="result-box"><DealStatusBadge status={proforma.approvalRequest.status} /><p>مبلغ پیشنهادی: {proforma.proforma.totalPrice.toLocaleString('fa-IR')} (واحد مبلغ طبق سیاست پرونده)</p>{proforma.proforma.violations?.length > 0 && <p>موارد نیازمند بررسی: {proforma.proforma.violations.join('، ')}</p>}{proforma.proforma.paymentRecommendation && <p>{proforma.proforma.paymentRecommendation.reason}</p>}<Link href="/approvals">بررسی نسخه ثبت‌شده</Link></div>}
      </GlassSurface>
      <GlassSurface id="notes" className="section"><h2>یادداشت داخلی</h2><p className="muted">برای اعضای همین فضای کاری قابل مشاهده است؛ به طرف خارجی ارسال نمی‌شود.</p><form onSubmit={saveNote}><Field label="متن یادداشت" as="textarea" dir="auto" required maxLength={10000} value={note} disabled={disabled} onChange={event => setNote(event.target.value)} /><GlassButton type="submit" disabled={disabled || !note.trim()} busy={busy === 'note'}>ذخیره یادداشت</GlassButton></form></GlassSurface>
    </div><aside><GlassSurface id="assistant" className="section"><h2>دستیار مذاکره</h2><AISuggestionBadge /><p className="muted">تحلیل فعلی قاعده‌محور است، نه مدل زبانی تجاری. امتیاز آمادگی، کامل‌بودن اطلاعات است نه احتمال موفقیت یا اطمینان مدل.</p><div className="tool-grid">{tools.map(([tool, label]) => <GlassButton key={tool} disabled={disabled} busy={busy === tool} onClick={() => { if (tool === 'draft-reply' && draft) setConfirm('regenerate'); else run(tool); }}>{label}</GlassButton>)}</div>
      {summary && <div className="ai-output"><h3>خلاصه خودکار</h3><p>{summary.data.summary}</p><p>نیت: {summary.data.intent} · جدیت: {summary.data.seriousness}</p><p className="muted">تولید: {date(summary.at)} · مبتنی بر {summary.sources.length.toLocaleString('fa-IR')} پیام در زمینه بارگذاری‌شده صفحه</p><a href="#messages" onClick={() => setMessageLimit(conversation.messages.length)}>مشاهده متن‌های منبع (بدون ارجاع ادعای جزئی)</a><p><GlassButton onClick={() => setResults(current => ({ ...current, summarize: null }))}>بستن خلاصه</GlassButton></p></div>}
      {results['draft-reply'] && <div className="ai-output"><h3>پیش‌نویس قابل ویرایش · انگلیسی</h3><p>گیرنده: <bdi>{conversation.contact?.email ?? 'ثبت نشده'}</bdi></p><details><summary>متن اولیه تولیدشده</summary><p className="preformatted" dir="auto">{results['draft-reply'].data.draft.text}</p></details><Field label="نسخه نهایی برای بررسی انسانی" as="textarea" dir="auto" rows={10} maxLength={20000} value={draft} disabled={disabled} onChange={event => setDraft(event.target.value)} /><p>{draft !== results['draft-reply'].data.draft.text ? 'ویرایش انسانی · تغییرات هنوز ثبت نشده‌اند' : 'متن اولیه · هنوز ثبت نشده است'}</p><div className="btn-row"><GlassButton disabled={disabled || !draft.trim()} onClick={() => setConfirm('draft')}>بازبینی و درخواست تأیید</GlassButton><GlassButton disabled={Boolean(busy)} onClick={() => { setDraft(''); setResults(current => ({ ...current, 'draft-reply': null })); }}>کنار گذاشتن</GlassButton></div></div>}
      {readiness && <div className="ai-output"><h3>کامل‌بودن اطلاعات: {readiness.score.toLocaleString('fa-IR')}٪</h3><p>اطلاعات موجود: {readiness.confirmed.join('، ') || 'هیچ‌کدام'}</p><p>اطلاعات لازم: {readiness.missing.join('، ') || 'موردی نیست'}</p><p>{readiness.risk.note}</p></div>}
      {results['agent-brief'] && <p className="ai-output">گام پیشنهادی: {results['agent-brief'].data.nextMove}</p>}
      {plan && <div className="ai-output"><h3>نقشه مذاکره</h3><p>{plan.objective}</p><p>کف قیمت: {plan.commercialBoundaries.minimumUnitPrice} · پرداخت مجاز: {plan.commercialBoundaries.acceptedPaymentTerms.join(' / ')}</p><ol>{plan.actions.map(action => <li key={action}>{action}</li>)}</ol></div>}
      {results['follow-up'] && <p className="ai-output">{results['follow-up'].data.needsFollowUp ? 'موعد پیگیری رسیده است.' : 'فعلاً پیگیری لازم نیست.'} {results['follow-up'].data.dueAt && date(results['follow-up'].data.dueAt)}</p>}
    </GlassSurface></aside></div>
    <GlassSurface id="history"><h2>تاریخچه ثبت‌شده</h2><p className="muted">رکوردهای قدیمی ممکن است هویت ثبت‌کننده نداشته باشند. خروجی‌های دستیار تا ثبت صریح، فقط در همین صفحه موقت‌اند.</p><div className="filters"><Field as="select" label="نوع رویداد" value={historyType} onChange={event => setHistoryType(event.target.value)}><option value="all">همه</option><option value="message">پیام</option><option value="note">یادداشت</option><option value="draft-review">درخواست بررسی پیش‌نویس</option><option value="approval">تصمیم تأیید</option><option value="cost-estimate">ذخیره برآورد</option><option value="proforma">ثبت پیش‌فاکتور</option></Field><Field label="نام ثبت‌کننده" value={historyQuery} onChange={event => setHistoryQuery(event.target.value)} /><Field label="از تاریخ (میلادی)" type="date" value={historyDate} onChange={event => setHistoryDate(event.target.value)} /></div><ol className="timeline">{timeline.slice(0, historyLimit).map(item => <li key={item.id}><strong>{item.type === 'note' ? 'یادداشت داخلی' : item.type === 'message' ? 'پیام ثبت‌شده' : 'اقدام انسانی'} · <bdi>{item.actor}</bdi></strong><time dateTime={item.at}>{date(item.at)}</time><p dir="auto" className="preformatted">{item.text}</p>{item.referenceId && (item.type === 'cost-estimate' ? <a href="#terms">مشاهده برآورد جاری (ممکن است تغییر کرده باشد)</a> : <Link href="/approvals">مشاهده درخواست تأیید</Link>)}</li>)}</ol>{!timeline.length && <p className="empty">رویدادی برای این فیلتر وجود ندارد.</p>}{timeline.length > historyLimit && <GlassButton onClick={() => setHistoryLimit(value => value + 30)}>نمایش ۳۰ رویداد بیشتر</GlassButton>}</GlassSurface>
    <GlassModal open={Boolean(confirm)} title={confirm === 'regenerate' ? 'جایگزینی پیش‌نویس و ویرایش‌ها' : confirm === 'draft' ? 'ثبت نسخه نهایی برای تأیید' : 'تأیید ثبت سابقه محلی'} onClose={() => { if (!busy) setConfirm(null); }}><p>هیچ ایمیل یا سفارشی ارسال نمی‌شود. {confirm === 'draft' && 'موضوع و پیوست در این نسخه پشتیبانی نمی‌شوند.'}</p><p>طرف پرونده: <bdi>{conversation.contact?.email}</bdi></p>{confirm === 'regenerate' && <p>پس از تولید موفق، متن و ویرایش‌های فعلی با پیش‌نویس جدید جایگزین می‌شوند.</p>}<div className="preformatted" dir="auto">{confirm === 'draft' || confirm === 'regenerate' ? draft : message}</div><ErrorNotice error={error} /><GlassButton busy={busy === 'save'} onClick={confirmAction}>{confirm === 'regenerate' ? 'تأیید و تولید مجدد' : 'تأیید و ثبت'}</GlassButton></GlassModal>
  </main>;
}
