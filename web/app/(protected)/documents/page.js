'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { DataTable, DealStatusBadge, ErrorNotice, Field, GlassModal, GlassSurface } from '../../components/glass';

export default function DocumentsPage() {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  async function load() {
    setError('');
    try { setRecords((await api('/api/approvals')).filter(item => item.type === 'proforma')); }
    catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);
  const rows = useMemo(() => records?.filter(item => `${item.id} ${item.payload.productCode} ${item.status}`.toLowerCase().includes(query.toLowerCase())) ?? [], [records, query]);
  return <main className="page"><div className="page-heading"><div><p className="eyebrow">شواهد تجاری</p><h1>اسناد ثبت‌شده و نسخه‌های تأیید</h1><p className="lead">نسخه‌های مستقل پیش‌فاکتور و برآورد هزینه پیوست‌شده؛ تغییر برآورد جاری این سوابق را تغییر نمی‌دهد.</p></div></div><GlassSurface variant="subtle"><p>آپلود، فایل قرارداد، پیش‌نمایش PDF و دانلود فایل در سامانه فعلی پشتیبانی نمی‌شوند. فهرست زیر فقط داده‌های واقعی پیش‌فاکتور است؛ حذف یا جایگزینی اسناد تأییدشده ارائه نمی‌شود.</p></GlassSurface><ErrorNotice error={error} retry={load} /><Field label="جست‌وجوی شناسه، محصول یا وضعیت" value={query} onChange={event => setQuery(event.target.value)} />{!records && !error && <div className="skeleton" role="status" aria-label="بارگذاری اسناد" />}{records && <DataTable rows={rows} caption="نسخه‌های ثبت‌شده پیش‌فاکتور" columns={[{ key: 'id', label: 'شناسه نسخه', value: row => row.id }, { key: 'product', label: 'محصول', value: row => row.payload.productCode }, { key: 'date', label: 'ثبت', value: row => row.createdAt, render: row => new Date(row.createdAt).toLocaleString('fa-IR') }, { key: 'status', label: 'وضعیت', value: row => row.status, render: row => <DealStatusBadge status={row.status} /> }, { key: 'preview', label: 'مشاهده', render: row => <button className="btn btn-outline" onClick={() => setSelected(row)}>جزئیات نسخه</button> }]} />}<GlassModal open={Boolean(selected)} title="نسخه ثبت‌شده پیش‌فاکتور" onClose={() => setSelected(null)}>{selected && <><p><bdi>{selected.id}</bdi></p><DealStatusBadge status={selected.status} /><p>مقدار: {selected.payload.quantity} · مبلغ: {selected.payload.totalPrice}</p>{selected.payload.costEstimate && <p>بهای تمام‌شده پیوست: {selected.payload.costEstimate.total.toLocaleString('fa-IR')} تومان</p>}<details><summary>تمام داده‌های نسخه</summary><pre className="preformatted" dir="ltr">{JSON.stringify(selected.payload, null, 2)}</pre></details><p><Link href={`/conversations/${selected.payload.conversationId}`}>پرونده مرتبط</Link></p></>}</GlassModal></main>;
}
