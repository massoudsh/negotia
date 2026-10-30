'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', label: 'مرکز فرمان', icon: 'grid' },
  { href: '/#pipeline', label: 'فرصت‌های تجاری', icon: 'target' },
  { href: '/#insights', label: 'اقدام‌های بعدی', icon: 'spark' },
  { href: '/landed-cost', label: 'بهای تمام‌شده', icon: 'chart' },
  { href: '/approvals', label: 'تأییدهای انسانی', icon: 'check' },
];

function Icon({ name, size = 18 }) {
  const paths = {
    inbox: <><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z" /><path d="M3 13h4l1.5 2h6L16 13h5" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /><path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 5-7" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
    route: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8 18h3a4 4 0 0 0 4-4v-4a4 4 0 0 1 4-4" /></>,
    check: <><path d="m5 12 4 4L19 6" /><path d="M21 12a9 9 0 1 1-3-6.7" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    spark: <><path d="m12 3-1.7 5.3L5 10l5.3 1.7L12 17l1.7-5.3L19 10l-5.3-1.7z" /><path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  };

  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export { Icon };

export default function AppShell({ children }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hash, setHash] = useState('');

  useEffect(() => {
    function syncLocation() { setHash(window.location.hash); setMobileOpen(false); }
    syncLocation();
    window.addEventListener('hashchange', syncLocation);
    return () => window.removeEventListener('hashchange', syncLocation);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function closeOnEscape(event) { if (event.key === 'Escape') setMobileOpen(false); }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);

  function navigation(label) {
    return <nav className="main-nav" aria-label={label}>{navItems.map((item) => {
      const isActive = item.href.includes('#') ? pathname === '/' && item.href === `/${hash}` : item.href === '/' ? pathname === '/' && !hash : pathname.startsWith(item.href);
      return <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`} aria-current={isActive ? 'location' : undefined} onClick={() => { setMobileOpen(false); setHash(item.href.includes('#') ? `#${item.href.split('#')[1]}` : ''); }}><Icon name={item.icon} /><span>{item.label}</span></Link>;
    })}</nav>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">N</div>
          <div>
            <div className="brand-name">Negotia</div>
            <div className="brand-caption">Trade execution OS</div>
          </div>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-dot" />
          <span>تجارت خارجی · نسخه نمایشی</span>
          <span className="chevron">⌄</span>
        </div>

        {navigation('ناوبری اصلی')}

        <div className="sidebar-footer">
          <div className="policy-status"><span className="status-dot" /> سیاست شرکت فعال است</div>
          <div className="user-card">
            <div className="avatar">م</div>
            <div><strong>مدیر تجارت</strong><span>محیط نمایشی</span></div>
            <span className="more">•••</span>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="mobile-topbar">
          <div className="brand-lockup"><div className="brand-mark">N</div><div className="brand-name">Negotia</div></div>
          <button className="icon-button" aria-label={mobileOpen ? 'بستن منو' : 'باز کردن منو'} aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen((open) => !open)}><Icon name="menu" /></button>
        </header>
        <div id="mobile-navigation" className="mobile-navigation" hidden={!mobileOpen}>{navigation('ناوبری موبایل')}</div>
        <header className="topbar">
          <div className="breadcrumb"><span>فضای کاری</span><span className="breadcrumb-separator">/</span><strong>{pathname.startsWith('/landed-cost') ? 'بهای تمام‌شده' : pathname.startsWith('/approvals') ? 'تأییدهای انسانی' : pathname.startsWith('/conversations/') ? 'جزئیات مکالمه' : 'مرکز فرمان'}</strong></div>
          <div className="topbar-actions"><span className="live-indicator">نسخه نمایشی · داده‌های در حافظه</span><div className="top-avatar">م</div></div>
        </header>
        {children}
      </div>
    </div>
  );
}
