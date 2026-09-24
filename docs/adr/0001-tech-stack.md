# ADR 0001 — انتخاب Stack فنی

- وضعیت: پذیرفته‌شده
- مرتبط با: GitHub issue #1

## زمینه
پروژه در فاز طراحی است و باید سریع به یک MVP قابل نمایش (issue‌های #5 تا #11) برسد. تیم کوچک است و اولویت با سرعت توسعه و ساده نگه‌داشتن زنجیره ابزار است، نه معماری بزرگ‌مقیاس.

## تصمیم
- **Backend / زبان:** Node.js (JavaScript، ES Modules). فعلاً بدون TypeScript تا زنجیره build اضافه نشود؛ در صورت رشد تیم/کد در فاز بعد به TypeScript مهاجرت می‌شود.
- **معماری داده:** ماژول‌های منطق (`src/*`) پشت یک لایه repository ساده قرار می‌گیرند تا از دیتابیس مستقل باشند. برای MVP از حافظه/فایل JSON استفاده می‌شود؛ رابط repository طوری طراحی شده که جایگزینی با Postgres بدون تغییر منطق دامنه ممکن باشد.
- **دیتابیس (فاز بعد از MVP کدنویسی‌شده):** PostgreSQL — چون داده رابطه‌ای (Conversation → Message، Contact، Product، Policy، Proforma) و نیاز به query گزارشی (Phase 3 dashboard) دارد.
- **LLM provider:** انتزاع `src/llm/provider.js` با یک provider پیش‌فرض mock/rule-based برای تست و توسعه آفلاین، و امکان اتصال به هر provider سازگار با OpenAI API از طریق متغیر محیطی (`LLM_PROVIDER`, `OPENAI_API_KEY`). انتخاب provider نهایی تجاری به بعد از اعتبارسنجی MVP موکول می‌شود تا هزینه API روی تصمیم قفل نشود.
- **Frontend:** برای MVP فرانت‌اند مستقل ساخته نمی‌شود؛ تعامل انسانی (checkpoint تأیید، مشاهده مکالمه) از طریق API/CLI انجام می‌شود. داشبورد (Phase 3) در فاز بعد با یک فریمورک SPA (تصمیم جدا) طراحی می‌شود.

## دلایل
- Node.js سرعت توسعه بالا و اکوسیستم غنی برای ingest ایمیل/واتساپ و فراخوانی LLM دارد.
- جدا کردن provider و repository پشت interface یعنی تصمیم‌های پرهزینه (DB، LLM تجاری) دیرتر و با شواهد واقعی MVP گرفته می‌شوند، نه حدسی.
- عدم نیاز به build سنگین (tsc/bundler) یعنی تست و اجرا در هر محیطی ساده و سریع است.

## پیامدها
- Migration به TypeScript یا Postgres در آینده نیاز به تغییر implementation دارد، اما به‌خاطر لایه‌بندی interface، منطق دامنه (guardrails، negotiation flow) دست‌نخورده می‌ماند.
