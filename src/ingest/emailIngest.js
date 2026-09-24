import { createConversation, createMessage } from '../models/index.js';

/**
 * Ingest یک ایمیل خام و آن را به Conversation/Message تبدیل می‌کند.
 * مرتبط با GitHub issue #5.
 *
 * @param {{from: string, subject: string, text: string, receivedAt?: string}} email
 * @param {{contactId: string, productCode: string, conversation?: object}} context
 *   اگر `conversation` داده شود، پیام به همان مکالمه اضافه می‌شود (پیگیری یک thread موجود).
 * @returns {{conversation: object, message: object}}
 */
export function ingestEmail(email, context) {
  if (!email || !email.text || !email.from) {
    throw new Error('ایمیل نامعتبر: فیلدهای from و text الزامی هستند');
  }

  const conversation =
    context.conversation ?? createConversation({ contactId: context.contactId, productCode: context.productCode });

  const message = createMessage({
    conversationId: conversation.id,
    channel: 'email',
    sender: 'contact',
    text: cleanEmailBody(email.text),
    at: email.receivedAt,
  });

  conversation.messages.push(message);
  conversation.lastMessageAt = message.at;
  if (conversation.status === 'closed') conversation.status = 'open';

  return { conversation, message };
}

/** حذف نویز رایج ایمیل (quoted reply، امضا) — نسخه ساده MVP. */
function cleanEmailBody(text) {
  return text
    .split(/\n\s*On .+ wrote:\s*$/m)[0] // برش پیش از quoted reply انگلیسی رایج
    .split(/\n--\s*\n/)[0] // برش پیش از امضا (delimiter `-- `)
    .trim();
}
