'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCurrentUser } from '../../components/app-shell';
import { snapshotLandedCost, CURRENCIES } from '../../../../src/proforma/landed-cost';

const CURRENCY_LABEL = { IRT: 'تومان', IRR: 'ریال', USD: 'دلار آمریکا', EUR: 'یورو', AED: 'درهم امارات', CNY: 'یوان چین' };
const BREAKDOWN_LABEL = { goods: 'بهای خرید کالا', shipping: 'حمل', insurance: 'بیمه', customs: 'گمرک و مالیات', other: 'سایر هزینه‌ها' };
const format = (value) => value.toLocaleString('fa-IR', { maximumFractionDigits: 2 });

export default function LandedCostPage() {
  const user = useCurrentUser();
  const [form, setForm] = useState({ quantity: '', unitPrice: '', currency: 'USD', freightAmount: '0', freightCurrency: 'USD', insuranceAmount: '0', insuranceCurrency: 'USD', customsCost: '0', otherCost: '0' });
  const [rates, setRates] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetch('/api/conversations').then((response) => {
      if (!response.ok) throw new Error('load-failed');
      return response.json();
    }).then((records) => setConversations(records.filter((conversation) => conversation.direction === 'import')))
      .catch(() => setSaveError('دریافت پرونده‌ها ناموفق بود؛ برای اتصال برآورد صفحه را تازه‌سازی کنید.'));
  }, []);

  async function saveEstimate() {
    setSaving(true);
    setSaveError('');
    setSaved(null);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/cost-estimate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(result.inputs) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'ذخیره برآورد ناموفق بود.');
      setSaved(data);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }
  const usedCurrencies = [...new Set([form.currency, form.freightCurrency, form.insuranceCurrency])].filter((code) => !['IRT', 'IRR'].includes(code));

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setResult(null);
    setSaved(null);
    setSaveError('');
    setError('');
  }

  function submit(event) {
    event.preventDefault();
    setResult(null);
    setSaved(null);
    setSaveError('');
    setError('');
    try {
      setResult(snapshotLandedCost({
        quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice),
        currency: form.currency,
        freight: { amount: Number(form.freightAmount), currency: form.freightCurrency },
        insurance: { amount: Number(form.insuranceAmount), currency: form.insuranceCurrency },
        customsCost: Number(form.customsCost),
        otherCost: Number(form.otherCost),
        rates: Object.fromEntries(usedCurrencies.map((code) => [code, Number(rates[code])])),
      }));
    } catch (err) {
      setError(err.message);
    }
  }

  function numericField(key, label, positive = false) {
    return <div className="form-row"><label htmlFor={key}>{label}</label><input id={key} type="number" min={positive ? '0.000001' : '0'} step="any" required value={form[key]} onChange={(event) => update(key, event.target.value)} /></div>;
  }

  function currencyField(key, label) {
    return <div className="form-row"><label htmlFor={key}>{label}</label><select id={key} value={form[key]} onChange={(event) => update(key, event.target.value)}>{CURRENCIES.map((code) => <option key={code} value={code}>{CURRENCY_LABEL[code]}</option>)}</select></div>;
  }

  return (
    <main className="page">
      <Link href="/" className="back-link">بازگشت به مرکز فرمان</Link>
      <div className="page-heading"><div><p className="eyebrow">ابزار مالی · محاسبه مستقل</p><h1>محاسبه بهای تمام‌شده واردات</h1><p className="lead">قیمت خرید و هزینه‌های جانبی را با نرخ‌های واردشده به تومان تبدیل کنید.</p></div></div>
      <div className="info-panel"><h3>برآورد دستی، نه نرخ زنده یا محاسبه رسمی گمرک</h3><p>نرخ هر ارز، تومان به‌ازای یک واحد ارز است. هر تومان برابر ۱۰ ریال است. هزینه گمرک و مالیات را از برآورد معتبر خود وارد کنید؛ تعرفه، معافیت یا نرخ رسمی گمرکی خودکار اعمال نمی‌شود. می‌توانید برآورد را در پرونده وارداتی نگه دارید و هنگام ایجاد پیش‌فاکتور به درخواست تأیید پیوست کنید. برآورد ثبت‌شده در پایگاه داده محلی نگهداری می‌شود.</p></div>
      <form onSubmit={submit}><fieldset className="calculator-fields" disabled={saving}>
        <section className="section"><h2>۱. خرید کالا</h2><div className="grid-2">{numericField('quantity', 'مقدار سفارش (تعداد یا وزن)', true)}{numericField('unitPrice', 'قیمت خرید هر واحد')}{currencyField('currency', 'ارز خرید')}</div></section>
        <section className="section"><h2>۲. هزینه‌های محموله</h2><p className="muted small">مبالغ این بخش برای کل محموله هستند، نه هر واحد. هزینه‌های درج‌شده در قیمت فروشنده را دوباره اضافه نکنید.</p><div className="grid-2">{numericField('freightAmount', 'هزینه کل حمل')}{currencyField('freightCurrency', 'ارز هزینه حمل')}{numericField('insuranceAmount', 'هزینه کل بیمه')}{currencyField('insuranceCurrency', 'ارز هزینه بیمه')}{numericField('customsCost', 'گمرک و مالیات کل (تومان)')}{numericField('otherCost', 'سایر هزینه‌های کل (تومان)')}</div></section>
        <section className="section"><h2>۳. نرخ تبدیل دستی</h2><p className="muted small">تمام هزینه‌های یک ارز با نرخ یکسان تبدیل می‌شوند. هیچ نرخ بازار از پیش درج نشده است.</p><div className="grid-2">{usedCurrencies.map((code) => <div className="form-row" key={code}><label htmlFor={`rate-${code}`}>تومان برای یک {CURRENCY_LABEL[code]}</label><input id={`rate-${code}`} type="number" min="0.000001" step="any" required value={rates[code] ?? ''} onChange={(event) => { setRates((current) => ({ ...current, [code]: event.target.value })); setResult(null); setSaved(null); setSaveError(''); setError(''); }} /></div>)}</div>{usedCurrencies.length === 0 && <p className="muted small">تبدیل ریال به تومان به‌صورت ثابت انجام می‌شود.</p>}<button type="submit" className="btn">محاسبه بهای تمام‌شده</button></section>
      </fieldset></form>
      {error && <div className="result-box warn" role="alert">{error}</div>}
      {result && <section className="section" aria-live="polite" aria-label="نتیجه محاسبه"><h2>برآورد هزینه به تومان</h2><dl>{Object.entries(result.breakdown).map(([key, value]) => <div className="card-row" key={key}><dt>{BREAKDOWN_LABEL[key]}</dt><dd>{format(value)} تومان</dd></div>)}</dl><div className="stat-grid"><div className="stat-card"><span className="stat-label">جمع بهای تمام‌شده</span><strong className="stat-value">{format(result.total)}</strong><span className="stat-note">تومان برای کل محموله</span></div><div className="stat-card"><span className="stat-label">بهای هر واحد</span><strong className="stat-value">{format(result.perUnit)}</strong><span className="stat-note">تومان برای هر واحد تعداد یا وزن</span></div></div><p className="muted small">نمایش با حداکثر دو رقم اعشار؛ قیمت فروش و سود در این محاسبه لحاظ نشده‌اند.</p></section>}
      {saveError && <div className="result-box warn" role="alert">{saveError}</div>}
      {result && <section className="section"><h2>اتصال برآورد به پرونده وارداتی</h2><p className="muted small">آخرین برآورد پرونده جایگزین می‌شود؛ نسخه‌های قبلی پیوست‌شده به تأییدها تغییر نمی‌کنند. قیمت خرید این برآورد مستقل از مبلغ پیشنهادی پیش‌فاکتور است.</p><div className="form-row"><label htmlFor="cost-conversation">پرونده وارداتی</label><select id="cost-conversation" value={conversationId} disabled={saving} onChange={(event) => { setConversationId(event.target.value); setSaved(null); }}><option value="">انتخاب پرونده</option>{conversations.map((conversation) => <option key={conversation.id} value={conversation.id}>{conversation.contact?.company ?? conversation.contact?.name} · {conversation.productCode}</option>)}</select></div>{conversations.length === 0 && <p className="muted small">برای اتصال، یک پرونده وارداتی باید موجود باشد.</p>}<button type="button" className="btn" disabled={user.role === 'viewer' || !conversationId || saving || Boolean(saved)} onClick={saveEstimate}>{saving ? 'در حال ذخیره…' : 'ذخیره برآورد در پرونده'}</button>{saved && <p role="status">برآورد ذخیره شد. <Link className="arrow-link" href={`/conversations/${saved.conversationId}`}>آماده‌سازی پیش‌فاکتور در پرونده</Link></p>}</section>}
    </main>
  );
}
