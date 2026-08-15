import './globals.css';

export const metadata = {
  title: 'Negotia — ایجنت هوشمند اجرای تجارت خارجی',
  description: 'داشبورد مذاکره، تأیید انسانی و آماده‌سازی پیش‌فاکتور',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <header className="topbar">
          <div className="brand">
            Negotia <span>ایجنت هوشمند اجرای تجارت خارجی</span>
          </div>
          <nav className="nav-links">
            <a href="/">مکالمات</a>
            <a href="/approvals">تأییدها</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
