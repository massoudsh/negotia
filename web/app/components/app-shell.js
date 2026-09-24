'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'مکالمات', icon: 'inbox' },
  { href: '/approvals', label: 'تأییدهای انسانی', icon: 'check' },
];

function Icon({ name, size = 18 }) {
  const paths = {
    inbox: <><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5z" /><path d="M3 13h4l1.5 2h6L16 13h5" /></>,
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
          <span>برنامه‌نویسی</span>
          <span className="chevron">⌄</span>
        </div>

        <nav className="main-nav" aria-label="ناوبری اصلی">
          <div className="nav-label">فضای کاری</div>
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.href === '/approvals' && <span className="nav-count">۳</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="policy-status"><span className="status-dot" /> سیاست شرکت فعال است</div>
          <div className="user-card">
            <div className="avatar">م</div>
            <div><strong>مدیر تجارت</strong><span>حساب سازمانی</span></div>
            <span className="more">•••</span>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="mobile-topbar">
          <div className="brand-lockup"><div className="brand-mark">N</div><div className="brand-name">Negotia</div></div>
          <button className="icon-button" aria-label="باز کردن منو"><Icon name="menu" /></button>
        </header>
        <header className="topbar">
          <div className="breadcrumb"><span>فضای کاری</span><span className="breadcrumb-separator">/</span><strong>{pathname.startsWith('/approvals') ? 'تأییدهای انسانی' : pathname.startsWith('/conversations/') ? 'جزئیات مکالمه' : 'مکالمات'}</strong></div>
          <div className="topbar-actions"><span className="live-indicator"><span className="status-dot" /> سیستم آنلاین</span><div className="top-avatar">م</div></div>
        </header>
        {children}
      </div>
    </div>
  );
}
