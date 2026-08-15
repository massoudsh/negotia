/**
 * انتزاع LLM provider — نگاه کن به docs/adr/0001-tech-stack.md.
 * پیش‌فرض یک provider rule-based/mock است تا توسعه و تست بدون کلید API واقعی ممکن باشد.
 * برای اتصال به provider واقعی، `LLM_PROVIDER=openai` و `OPENAI_API_KEY` را ست کن و
 * پیاده‌سازی `createOpenAiProvider` را تکمیل کن.
 */

const HIGH_SERIOUSNESS_KEYWORDS = [
  'purchase order',
  'po number',
  'lc',
  'letter of credit',
  'deposit',
  'ready to pay',
  'final price',
  'moq',
];

const LOW_SERIOUSNESS_KEYWORDS = ['just checking', 'just curious', 'for information', 'catalog only'];

export function createMockLlmProvider() {
  return {
    name: 'mock',
    /** @param {string} text */
    summarize(text) {
      const lower = text.toLowerCase();
      const summary = text.length > 200 ? `${text.slice(0, 197)}...` : text;

      let seriousness = 'medium';
      if (HIGH_SERIOUSNESS_KEYWORDS.some((k) => lower.includes(k))) seriousness = 'high';
      else if (LOW_SERIOUSNESS_KEYWORDS.some((k) => lower.includes(k))) seriousness = 'low';

      const intent = lower.includes('price') || lower.includes('quote')
        ? 'price_inquiry'
        : lower.includes('sample')
          ? 'sample_request'
          : 'general_inquiry';

      return { summary, intent, seriousness };
    },
  };
}

export function getLlmProvider() {
  const providerName = process.env.LLM_PROVIDER || 'mock';
  if (providerName === 'mock') return createMockLlmProvider();
  throw new Error(`LLM provider "${providerName}" هنوز پیاده‌سازی نشده — از mock استفاده کن یا پیاده‌سازی اضافه کن.`);
}
