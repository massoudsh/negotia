#!/usr/bin/env bash
# ساخت issueهای اولیه Negotia روی گیت‌هاب.
#
# پیش‌نیاز: نصب و لاگین GitHub CLI روی سیستمی که این را اجرا می‌کنی:
#   gh auth login
#
# اجرا از ریشه ریپو:
#   bash scripts/create-github-issues.sh

set -euo pipefail

REPO="massoudsh/negotia"

echo "==> ساخت لیبل‌های فاز..."
gh label create "phase:0-foundation" --repo "$REPO" --color "5319E7" --description "پایه و تصمیم‌های اولیه" --force
gh label create "phase:1-mvp"        --repo "$REPO" --color "0E8A16" --description "MVP مسیر صادرات" --force
gh label create "phase:2-import"     --repo "$REPO" --color "1D76DB" --description "مسیر واردات / مقایسه تأمین‌کننده" --force
gh label create "phase:3-scale"      --repo "$REPO" --color "FBCA04" --description "مقیاس و یکپارچه‌سازی" --force

create_issue () {
  local title="$1"
  local label="$2"
  local body="$3"
  echo "==> ساخت issue: $title"
  gh issue create --repo "$REPO" --title "$title" --label "$label" --body "$body"
}

# ---------- Phase 0 — پایه و تصمیم‌های اولیه ----------

create_issue \
  "Decide tech stack (backend, frontend, DB, LLM provider)" \
  "phase:0-foundation" \
  "انتخاب نهایی stack فنی پروژه.

**باید مشخص شود:**
- backend (زبان/فریمورک)
- frontend
- دیتابیس
- provider مدل زبانی (LLM) برای خلاصه‌سازی مکالمه و پیش‌نویس پیام

**خروجی:** یک سند کوتاه تصمیم (ADR) در \`docs/\`."

create_issue \
  "Design core data model (Conversation, Message, Contact, Product, Policy, Proforma)" \
  "phase:0-foundation" \
  "طراحی مدل داده اصلی پروژه بر اساس \`.noqte/wiki/concepts/negotiation-flow.md\`.

**موجودیت‌های اصلی:**
- Conversation
- Message
- Contact (خریدار / تأمین‌کننده)
- Product
- Policy
- Proforma

**خروجی:** schema اولیه (ER diagram یا فایل schema) + صفحات entity متناظر در ویکی پروژه."

create_issue \
  "Design company-policy configuration schema" \
  "phase:0-foundation" \
  "طراحی فرمت پیکربندی سیاست‌های شرکت که ایجنت باید همیشه رعایت کند.

**بر اساس:** \`.noqte/wiki/concepts/company-policy-guardrails.md\`

**باید پوشش دهد:**
- کف قیمت
- شرایط پرداخت قابل قبول
- ظرفیت واقعی تولید/تأمین
- کشورها/مشتری‌های حساس
- نقاط تأیید انسانی اجباری"

create_issue \
  "Choose first input channel for MVP (email vs WhatsApp Business API)" \
  "phase:0-foundation" \
  "بررسی و انتخاب اولین کانال ورودی مکالمه برای MVP.

**باید بررسی شود:**
- محدودیت‌ها و هزینه WhatsApp Business API
- ingest ایمیل (IMAP/Gmail API)
- کدام کانال برای اولین pilot با یک مشتری واقعی سریع‌تر قابل اجراست"

# ---------- Phase 1 — MVP (مسیر صادرات) ----------

create_issue \
  "Ingest conversation from selected channel" \
  "phase:1-mvp" \
  "پیاده‌سازی ingest مکالمه از کانال انتخاب‌شده در Phase 0 به مدل داده Conversation/Message."

create_issue \
  "Conversation summarization + buyer intent & seriousness detection" \
  "phase:1-mvp" \
  "خلاصه‌سازی مکالمه با LLM و تشخیص نیاز و سطح جدیت خریدار، طبق مرحله ۲ در \`.noqte/wiki/concepts/negotiation-flow.md\`."

create_issue \
  "Multilingual reply drafting (English first)" \
  "phase:1-mvp" \
  "پیش‌نویس پاسخ حرفه‌ای به زبان و لحن متناسب بازار هدف (ابتدا انگلیسی)، شامل پیشنهاد سؤال‌های لازم (کمیت، مشخصات، مقصد)."

create_issue \
  "Policy guardrails engine for price/terms suggestions" \
  "phase:1-mvp" \
  "پیاده‌سازی موتوری که هر پیشنهاد قیمت/شرایط پرداخت/تحویل تولیدشده توسط ایجنت را در برابر schema سیاست شرکت (Phase 0) بررسی می‌کند و موارد خارج از چارچوب را به تأیید انسانی ارجاع می‌دهد."

create_issue \
  "Follow-up scheduling and reminders" \
  "phase:1-mvp" \
  "زمان‌بندی خودکار follow-up بعدی وقتی خریدار پاسخ نمی‌دهد، و یادآوری به تیم بازرگانی."

create_issue \
  "Human approval checkpoint before sending message/proforma" \
  "phase:1-mvp" \
  "رابط تأیید انسانی: هیچ پیام یا پیش‌فاکتوری بدون تأیید صریح یک انسان از سمت شرکت ارسال نمی‌شود."

create_issue \
  "Prepare structured data for proforma invoice" \
  "phase:1-mvp" \
  "وقتی مذاکره جدی شد، آماده‌سازی خروجی ساخت‌یافته (محصول، قیمت، شرایط پرداخت، حمل، مقصد) برای تأیید نهایی و صدور پیش‌فاکتور."

# ---------- Phase 2 — مسیر واردات (مقایسه تأمین‌کننده) ----------

create_issue \
  "Collect multiple supplier quotes for import comparison" \
  "phase:2-import" \
  "امکان ثبت و نگهداری چند پیشنهاد قیمت از تأمین‌کننده‌های مختلف برای یک نیاز واردات، به‌جای پیگیری تک‌به‌تک هر مکالمه به‌صورت مجزا."

create_issue \
  "Supplier comparison table (price, MOQ, lead time, payment terms, risk)" \
  "phase:2-import" \
  "جدول مقایسه‌ خودکار پیشنهادهای دریافتی از تأمین‌کنندگان مختلف بر اساس قیمت، حداقل سفارش (MOQ)، زمان تحویل، شرایط پرداخت و ریسک اولیه، برای تصمیم‌گیری سریع‌تر تیم خرید."

create_issue \
  "Structured negotiation assistance with selected supplier" \
  "phase:2-import" \
  "پس از انتخاب تأمین‌کننده از جدول مقایسه، کمک ایجنت به پیش‌بردن مذاکره نهایی (قیمت/شرایط) طبق همان guardrails سیاست شرکت که در مسیر صادرات پیاده شده."

# ---------- Phase 3 — مقیاس و یکپارچه‌سازی ----------

create_issue \
  "Additional language support (Arabic, Turkish)" \
  "phase:3-scale" \
  "افزودن پشتیبانی خلاصه‌سازی و پیش‌نویس پاسخ به زبان‌های عربی و ترکی، برای بازارهای هدف رایج صادرات ایران (عراق، امارات، ترکیه)."

create_issue \
  "CRM integration" \
  "phase:3-scale" \
  "یکپارچه‌سازی با CRMهای رایج (یا CRM داخلی ساده) برای نگهداری تاریخچه تماس/مکالمه هر طرف مقابل (خریدار/تأمین‌کننده) در طول زمان، فراتر از یک مکالمه واحد."

create_issue \
  "Native WhatsApp/email channel integration" \
  "phase:3-scale" \
  "جایگزینی ingest دستی فعلی با اتصال بومی به ایمیل (IMAP/Gmail API) و واتساپ بیزینس API برای دریافت خودکار پیام‌های ورودی."

create_issue \
  "Multi-user team roles and permissions" \
  "phase:3-scale" \
  "چند کاربره‌سازی تیم بازرگانی: نقش‌هایی مثل کارشناس فروش/خرید، مدیر تأیید (approver)، و مدیر ارشد، هرکدام با دسترسی متناسب به مکالمات و نقاط تأیید سیاست."

create_issue \
  "Analytics dashboard (response time, conversion funnel, lost opportunities)" \
  "phase:3-scale" \
  "داشبورد تحلیلی برای تیم بازرگانی: میانگین زمان پاسخ، funnel تبدیل مکالمه به پیش‌فاکتور/سفارش، و فهرست فرصت‌های سوخته (بدون follow-up یا بدون پاسخ)."

# ---------- ویژگی‌های الهام‌گرفته از رقبای ایرانی (پارمیس، ebpm.ir، دستیار صادرات) ----------

create_issue \
  "Multi-currency cost calculation for proforma (بهای تمام‌شده)" \
  "phase:2-import" \
  "پشتیبانی از چند ارز در پیش‌فاکتور و محاسبه خودکار بهای تمام‌شده (قیمت کالا + حمل + بیمه + هزینه‌های جانبی) بر اساس نرخ ارز روز، مشابه قابلیت ERP بازرگانی خارجی پارمیس (parmisit.com)."

create_issue \
  "HSCODE-based product classification" \
  "phase:2-import" \
  "افزودن فیلد HSCODE به مدل Product و تجمیع خودکار اقلام با HSCODE مشابه در یک پیش‌فاکتور، پیش‌نیاز اتصال به سامانه جامع تجارت (الهام از ebpm.ir)."

create_issue \
  "Auto-generate packing list from proforma line items" \
  "phase:2-import" \
  "تولید خودکار پکینگ لیست از اقلام پیش‌فاکتور تأییدشده (وزن، تعداد بسته، ابعاد) بدون نیاز به ورود دستی مجدد در اکسل."

create_issue \
  "Import order registration (ثبت سفارش) tracking with expiry alerts" \
  "phase:3-scale" \
  "پیگیری وضعیت و تاریخ انقضای ثبت سفارش واردات و مجوزهای مرتبط، همراه با یادآوری خودکار قبل از انقضا — مشابه گزارش‌گیری انقضای ثبت سفارش در ebpm.ir."

create_issue \
  "Shipment and customs clearance status tracking" \
  "phase:3-scale" \
  "ثبت و نمایش وضعیت مراحل حمل و ترخیص یک سفارش (حرکت محموله، دریافت اسناد حمل، ترانزیت، اظهار گمرکی) پیوست‌شده به همان Conversation/Proforma."

create_issue \
  "Trade document management (LC, bill of lading, certificate of origin)" \
  "phase:3-scale" \
  "امکان پیوست و نگهداری اسناد تجاری (اعتبار اسنادی/LC، بارنامه، گواهی مبدا، بیمه‌نامه) به هر مکالمه یا پیش‌فاکتور، با دسترسی سریع تیم بازرگانی."

create_issue \
  "Export payment method advisor in negotiation guardrails" \
  "phase:1-mvp" \
  "افزودن راهنمای انتخاب روش دریافت وجه صادراتی (پیش‌پرداخت، LC، حواله، عندالمطالبه) به موتور guardrails، متناسب با ریسک کشور/مشتری در سیاست شرکت — مشابه محتوای آموزشی «دستیار صادرات» (ftcenter.ir) که به همین موضوع می‌پردازد."

echo "==> همه issueهای اضافه شدند."
