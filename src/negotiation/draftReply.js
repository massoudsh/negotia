const REQUIRED_INFO = [
  { key: 'quantity', pattern: /\b(\d+[\s]?(pcs|units|kg|ton|carton|cartons))\b/i, question: 'What quantity are you looking for?' },
  { key: 'specs', pattern: /\b(spec|specification|grade|size)\b/i, question: 'Could you share the specification/grade you need?' },
  { key: 'destination', pattern: /\b(destination|port of|shipping to|deliver to)\b/i, question: 'What is the destination port/country for shipping?' },
];

/**
 * پیش‌نویس پاسخ حرفه‌ای (ابتدا انگلیسی) + سؤال‌های لازم برای اطلاعات ناقص.
 * مرتبط با GitHub issue #7.
 *
 * @param {object} conversation
 * @param {{summary: string, intent: string, seriousness: string}} summary
 * @param {{locale?: string}} [options]
 */
export function draftReply(conversation, summary, options = {}) {
  const locale = options.locale ?? 'en';
  if (locale !== 'en') {
    throw new Error(`زبان "${locale}" هنوز پشتیبانی نمی‌شود — طبق issue #7 اول انگلیسی پیاده می‌شود.`);
  }

  const fullText = conversation.messages.map((m) => m.text).join('\n');
  const missing = REQUIRED_INFO.filter((info) => !info.pattern.test(fullText));
  const suggestedQuestions = missing.map((info) => info.question);

  const opening = 'Thank you for reaching out, we appreciate your interest.';
  const body =
    suggestedQuestions.length > 0
      ? `To prepare an accurate quotation, could you please confirm:\n- ${suggestedQuestions.join('\n- ')}`
      : 'We have all the information needed and will follow up with our offer shortly.';

  return {
    text: `${opening}\n\n${body}`,
    suggestedQuestions,
  };
}
