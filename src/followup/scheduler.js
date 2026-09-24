const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * زمان‌بندی follow-up بعدی وقتی خریدار پاسخ نمی‌دهد.
 * مرتبط با GitHub issue #9.
 *
 * @param {object} conversation - آخرین پیام باید مشخص کند چه کسی آخرین‌بار پیام داده (sender: 'contact' | 'company').
 * @param {{waitDays?: number, now?: Date}} [options]
 * @returns {{dueAt: string|null, needsFollowUp: boolean}} - dueAt=null یعنی فعلاً نیازی به follow-up نیست
 *   (چون آخرین پیام از طرف خریدار بوده یا هنوز مهلت انتظار سپری نشده).
 */
export function scheduleFollowUp(conversation, options = {}) {
  const waitDays = options.waitDays ?? 3;
  const now = options.now ?? new Date();

  const lastMessage = conversation.messages[conversation.messages.length - 1];
  if (!lastMessage || lastMessage.sender !== 'company') {
    // آخرین پیام از خریدار بوده (یا مکالمه خالی است) — منتظر پاسخ نیستیم، follow-up لازم نیست.
    return { dueAt: null, needsFollowUp: false };
  }

  const dueAt = new Date(new Date(lastMessage.at).getTime() + waitDays * DAY_MS);
  return { dueAt: dueAt.toISOString(), needsFollowUp: now.getTime() >= dueAt.getTime() };
}
