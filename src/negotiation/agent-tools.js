const FIELD_DETECTORS = [
  { key: 'quantity', label: 'تعداد سفارش', pattern: /\b\d+[\d,.\s]*(?:pcs|pieces|units|kg|tons?|cartons?)\b/i },
  { key: 'specification', label: 'مشخصات یا گرید کالا', pattern: /\b(?:spec(?:ification)?|grade|size|standard)\b/i },
  { key: 'destination', label: 'مقصد یا بندر تحویل', pattern: /\b(?:destination|port|shipping to|deliver to)\b/i },
  { key: 'payment', label: 'روش پرداخت', pattern: /\b(?:lc|letter of credit|advance payment|credit \d+)\b/i },
  { key: 'delivery', label: 'زمان تحویل', pattern: /\b(?:within \d+ days?|delivery timeline|delivery within)\b/i },
];

function conversationText(conversation) {
  return conversation.messages.map((message) => message.text).join('\n');
}

function detectedFields(text) {
  return FIELD_DETECTORS.filter((field) => field.pattern.test(text));
}

function counterpartyRisk(conversation, policy) {
  const country = conversation.contact?.country;
  const isSensitiveCountry = country && policy.sensitiveCountries.includes(country);
  const isSensitiveCustomer = conversation.contact?.id && policy.sensitiveCustomers.includes(conversation.contact.id);

  if (isSensitiveCountry || isSensitiveCustomer) {
    return { level: 'high', note: 'طرف معامله در فهرست حساس است و بررسی انسانی پیش از هر تعهد تجاری لازم است.' };
  }

  return { level: 'standard', note: 'برای طرف معامله، هشدار سیاستی فعالی ثبت نشده است.' };
}

export function getDealReadiness(conversation, policy) {
  const text = conversationText(conversation);
  const found = detectedFields(text);
  const missing = FIELD_DETECTORS.filter((field) => !found.includes(field)).map((field) => field.label);
  const risk = counterpartyRisk(conversation, policy);
  const score = Math.round((found.length / FIELD_DETECTORS.length) * 100);

  return {
    score,
    confirmed: found.map((field) => field.label),
    missing,
    risk,
    readyForQuote: missing.length === 0 && risk.level !== 'high',
  };
}

export function createNegotiationPlan(conversation, policy) {
  const readiness = getDealReadiness(conversation, policy);
  const productMinimum = policy.minPrice[conversation.productCode] ?? policy.minPrice.default;
  const lastMessage = conversation.messages.at(-1);
  const actions = [];

  if (readiness.risk.level === 'high') actions.push('بررسی طرف معامله را برای تأیید انسانی ارسال کنید.');
  if (readiness.missing.length > 0) actions.push(`در پاسخ بعدی این موارد را قطعی کنید: ${readiness.missing.join('، ')}.`);
  if (lastMessage?.sender === 'contact') actions.push('پیش‌نویس پاسخ را آماده و قبل از ارسال بازبینی کنید.');
  if (readiness.missing.length === 0) actions.push('پیشنهاد قیمت را با رعایت کف قیمت و شرایط پرداخت مجاز آماده کنید.');
  if (actions.length === 0) actions.push('منتظر پاسخ طرف معامله بمانید و موعد پیگیری را کنترل کنید.');

  return {
    objective: conversation.direction === 'export' ? 'تبدیل درخواست خریدار به پیشنهاد صادراتی قابل تأیید' : 'تکمیل شرایط خرید از تأمین‌کننده',
    commercialBoundaries: {
      minimumUnitPrice: productMinimum,
      acceptedPaymentTerms: policy.acceptedPaymentTerms,
    },
    actions,
  };
}

export function buildAgentBrief(conversation, policy) {
  const readiness = getDealReadiness(conversation, policy);
  const plan = createNegotiationPlan(conversation, policy);
  const lastMessage = conversation.messages.at(-1);

  return {
    readiness,
    plan,
    nextMove: plan.actions[0],
    lastMessageFrom: lastMessage?.sender ?? null,
  };
}
