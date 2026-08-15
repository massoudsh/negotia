import { getLlmProvider } from '../llm/provider.js';

/**
 * خلاصه‌سازی مکالمه + تشخیص نیاز و سطح جدیت خریدار.
 * مرتبط با GitHub issue #6 و `.noqte/wiki/concepts/negotiation-flow.md` مرحله ۲.
 *
 * @param {object} conversation
 * @param {{provider?: object}} [options]
 * @returns {{summary: string, intent: string, seriousness: 'low'|'medium'|'high'}}
 */
export function summarizeConversation(conversation, options = {}) {
  const provider = options.provider ?? getLlmProvider();
  const fullText = conversation.messages.map((m) => m.text).join('\n');
  return provider.summarize(fullText || '');
}
