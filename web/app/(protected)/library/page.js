'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { DataTable, ErrorNotice, Field, GlassSurface } from '../../components/glass';

export default function LibraryPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  async function load() {
    setError('');
    try { const [library, conversations] = await Promise.all([api('/api/library'), api('/api/conversations')]); setData({ ...library, conversations }); }
    catch (err) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);
  const matches = row => Object.values(row).filter(value => typeof value === 'string').join(' ').toLowerCase().includes(query.toLowerCase());
  const contacts = useMemo(() => data?.contacts.filter(matches) ?? [], [data, query]);
  const products = useMemo(() => data?.products.filter(matches) ?? [], [data, query]);
  const links = predicate => data.conversations.filter(predicate).map(row => <p key={row.id}><Link href={`/conversations/${row.id}`}><bdi>{row.productCode}</bdi> · مشاهده پرونده</Link></p>);
  return <main className="page"><div className="page-heading"><div><p className="eyebrow">زمینه تجارت</p><h1>طرف‌ها، محصولات و شرایط</h1><p className="lead">اطلاعات ثبت‌شده فضای کاری؛ این فهرست فقط خواندنی است. ویرایش سیاست تجاری از این صفحه انجام نمی‌شود.</p></div></div><ErrorNotice error={error} retry={load} /><Field label="جست‌وجوی نام، شرکت، محصول یا شرایط" value={query} onChange={event => setQuery(event.target.value)} />{!data && !error && <div className="skeleton" aria-label="بارگذاری کتابخانه" role="status" />}{data && <><GlassSurface className="section"><h2>طرف‌های تجاری</h2><DataTable rows={contacts} caption="طرف‌های ثبت‌شده" columns={[{ key: 'name', label: 'نام', value: row => row.name }, { key: 'company', label: 'شرکت', value: row => row.company }, { key: 'email', label: 'ایمیل', value: row => row.email }, { key: 'country', label: 'بازار', value: row => row.country }, { key: 'deals', label: 'پرونده‌های مرتبط', render: row => links(deal => deal.contactId === row.id) }]} /></GlassSurface><GlassSurface className="section"><h2>محصولات</h2><DataTable rows={products} caption="کاتالوگ ثبت‌شده" columns={[{ key: 'code', label: 'کد محصول', value: row => row.code }, { key: 'name', label: 'نام', value: row => row.name }, { key: 'unit', label: 'واحد', value: row => row.unit }, { key: 'deals', label: 'پرونده‌ها', render: row => links(deal => deal.productCode === row.code) }]} /></GlassSurface><GlassSurface><h2>شرایط پرداخت پذیرفته‌شده</h2><p className="muted">منبع: <bdi>{data.source}</bdi> · سیاست جاری، بدون تاریخچه نسخه یا زمان تغییر ثبت‌شده.</p><ul>{data.terms.filter(term => term.toLowerCase().includes(query.toLowerCase())).map(term => <li key={term}><bdi>{term}</bdi></li>)}</ul><p className="muted">زبان ترجیحی، مشخصات تفصیلی کالا، تاریخچه قیمت و قالب قرارداد هنوز در مدل داده موجود نیستند.</p></GlassSurface></>}</main>;
}
