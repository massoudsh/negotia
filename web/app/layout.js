import './globals.css';
import './theme.css';

export const metadata = {
  title: 'Negotia — اجرای هوشمند تجارت خارجی',
  description: 'داشبورد مذاکره، تأیید انسانی و آماده‌سازی پیش‌فاکتور',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
