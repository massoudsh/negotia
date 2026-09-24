# مدل داده اصلی — Negotia

> مرتبط با: GitHub issue #2. پیاده‌سازی factory functions در `src/models/index.js`.

## موجودیت‌ها

### Contact
خریدار یا تأمین‌کننده خارجی طرف مکالمه.
- `id`, `name`, `email`, `company`, `country`, `role` (`buyer` | `supplier`), `createdAt`

### Product
محصول یا دسته محصولی که مذاکره حول آن است.
- `id`, `code`, `name`, `unit`, `createdAt`

### Conversation
یک مکالمه با یک Contact حول یک یا چند Product.
- `id`, `contactId`, `productCode`, `direction` (`export` | `import`), `status` (`open` | `awaiting_reply` | `serious` | `closed`), `lastMessageAt`, `createdAt`
- رابطه: یک Conversation چند `Message` دارد.

### Message
یک پیام درون یک Conversation.
- `id`, `conversationId`, `channel` (`email` | `whatsapp` | ...), `sender` (`contact` | `company`), `text`, `receivedAt`/`sentAt`

### Policy
پیکربندی سیاست شرکت که هر پیشنهاد باید در برابرش بررسی شود (جزئیات کامل: `config/policy.schema.json`، issue #3).
- `id`, `minPrice` (per product code)، `acceptedPaymentTerms`، `productionCapacity`، `sensitiveCountries`، `sensitiveCustomers`، `requiredApprovals`

### Proforma
خروجی ساخت‌یافته آماده تأیید نهایی (issue #11).
- `id`, `conversationId`, `productCode`, `quantity`, `unitPrice`, `totalPrice`, `paymentTerms`, `deliveryDays`, `destination`, `status` (`draft` | `pending_approval` | `approved` | `rejected`), `violations`

## روابط
```
Contact 1---N Conversation 1---N Message
Conversation 1---N Proforma
Policy (global/per-product) ---> اعمال روی Proforma و پیشنهادهای Message
```

## منابع کد
- `src/models/index.js` — factory function هر entity
- `config/policy.schema.json` — schema رسمی Policy
