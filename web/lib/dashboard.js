import { scheduleFollowUp } from '../../src/followup/scheduler.js';

export function summarizeDashboard(conversations, approvals, now = new Date()) {
  const active = conversations.filter((conversation) => conversation.status !== 'closed');
  const awaitingResponse = active.filter((conversation) => conversation.messages.at(-1)?.sender === 'contact');
  const overdue = active.filter((conversation) => scheduleFollowUp(conversation, { now }).needsFollowUp);
  const pending = approvals.filter((approval) => approval.status === 'pending').length;
  return {
    active: active.length,
    serious: active.filter((conversation) => conversation.status === 'serious').length,
    awaitingResponse,
    overdue,
    pending,
    needsAttention: new Set([...awaitingResponse, ...overdue].map((conversation) => conversation.id)).size,
  };
}
