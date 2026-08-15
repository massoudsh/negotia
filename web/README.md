# Negotia Web UI

رابط کاربری Next.js (App Router) روی منطق دامنه‌ی `../src`. بدون DB واقعی — یک store در-حافظه با seed نمونه (`lib/store.js`).

## اجرا

```bash
cd web
npm install
npm run dev
```

سپس `http://localhost:3000`.

> اجرای `next build` (بیلد production) را روی سرور واقعی/SSH انجام بده، نه داخل کانتینر توسعه.

## صفحات
- `/` — لیست مکالمات
- `/conversations/[id]` — جزئیات، خلاصه‌سازی، پیشنهاد پاسخ، بررسی پیگیری، ثبت پیش‌فاکتور
- `/approvals` — تأیید/رد درخواست‌های checkpoint انسانی

جزئیات کامل در ویکی پروژه: `entities/web-ui`.
