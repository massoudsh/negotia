'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

export const STATUS_LABEL = { open: 'باز', awaiting_reply: 'در انتظار پاسخ', serious: 'جدی', closed: 'بسته', pending: 'در انتظار بررسی', approved: 'تأییدشده', rejected: 'ردشده' };
export function GlassSurface({ as: Tag = 'section', variant = 'medium', className = '', children, ...props }) { return <Tag className={`glass glass-${variant} ${className}`} {...props}>{children}</Tag>; }
export function GlassButton({ busy, children, disabled, ...props }) { return <button type="button" className="btn" disabled={disabled || busy} aria-busy={busy || undefined} {...props}>{busy ? 'در حال انجام…' : children}</button>; }
export function DealStatusBadge({ status }) { return <span className={`badge badge-${status}`}>{STATUS_LABEL[status] ?? status}</span>; }
export function AISuggestionBadge() { return <span className="badge badge-open">پیشنهاد خودکار · نیازمند بررسی انسان</span>; }
export function Field({ label, error, id: suppliedId, as: Tag = 'input', ...props }) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <div className="form-row"><label htmlFor={id}>{label}</label><Tag id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />{error && <p id={`${id}-error`} className="field-error">{error}</p>}</div>;
}
export function ErrorNotice({ error, retry }) { return error ? <div className="result-box warn" role="alert">{error} <a href="/login">ورود مجدد</a>{retry && <button type="button" className="btn btn-outline" onClick={retry}>تلاش مجدد</button>}</div> : null; }
export function GlassModal({ open, title, children, onClose }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const prior = document.activeElement;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); if (open) prior?.focus(); };
  }, [open]);
  return <dialog ref={ref} className="glass glass-elevated glass-modal" aria-labelledby={id} onCancel={event => { event.preventDefault(); onClose(); }}><h2 id={id}>{title}</h2>{children}<button type="button" className="btn btn-outline" onClick={onClose}>انصراف و بازگشت</button></dialog>;
}
export function DataTable({ rows, columns, caption, pageSize = 20 }) {
  const [sort, setSort] = useState({ key: '', direction: 1 });
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [rows]);
  const ordered = useMemo(() => {
    const column = columns.find(item => item.key === sort.key);
    if (!column?.value) return rows;
    return [...rows].sort((a, b) => String(column.value(a) ?? '').localeCompare(String(column.value(b) ?? ''), 'fa', { numeric: true }) * sort.direction);
  }, [rows, columns, sort]);
  const max = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
  const current = Math.min(page, max);
  return <><div className="table-scroll" tabIndex={0} role="region" aria-label={caption}><table className="data-table"><caption>{caption} · {rows.length.toLocaleString('fa-IR')} رکورد</caption><thead><tr>{columns.map(column => <th key={column.key} scope="col" aria-sort={sort.key === column.key ? sort.direction === 1 ? 'ascending' : 'descending' : 'none'}>{column.value ? <button type="button" onClick={() => { setSort({ key: column.key, direction: sort.key === column.key ? -sort.direction : 1 }); setPage(0); }}>{column.label} {sort.key === column.key ? sort.direction === 1 ? '↑' : '↓' : '↕'}</button> : column.label}</th>)}</tr></thead><tbody>{ordered.slice(current * pageSize, (current + 1) * pageSize).map(row => <tr key={row.id}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row) : <bdi>{column.value(row)}</bdi>}</td>)}</tr>)}</tbody></table></div>{!rows.length && <p className="empty">موردی یافت نشد؛ فیلترها را تغییر دهید.</p>}<div className="pagination"><button type="button" className="btn btn-outline" disabled={current === 0} onClick={() => setPage(current - 1)}>قبلی</button><span role="status">صفحه {(current + 1).toLocaleString('fa-IR')} از {(max + 1).toLocaleString('fa-IR')}</span><button type="button" className="btn btn-outline" disabled={current === max} onClick={() => setPage(current + 1)}>بعدی</button></div></>;
}
