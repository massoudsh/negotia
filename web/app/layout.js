import './globals.css';
import AppShell from './components/app-shell';

export const metadata = {
  title: 'Negotia — اجرای هوشمند تجارت خارجی',
  description: 'داشبورد مذاکره، تأیید انسانی و آماده‌سازی پیش‌فاکتور',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
