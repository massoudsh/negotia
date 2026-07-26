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

echo "==> همه issueها ساخته شدند."
